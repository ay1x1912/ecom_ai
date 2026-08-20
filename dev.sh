#!/usr/bin/env bash
#
# Start the whole BabyMart stack: MySQL + Redis, the API, the storefront and the
# admin panel — with interleaved, prefixed logs. Ctrl-C stops everything it
# started (containers are left running; see --down).
#
#   ./dev.sh                start everything
#   ./dev.sh --no-docker    assume MySQL and Redis are already up
#   ./dev.sh --only api     start one app (api | client | admin), repeatable
#   ./dev.sh --down         stop the containers and exit
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

API_PORT=8000
CLIENT_PORT=3000
ADMIN_PORT=3001

# --- output ------------------------------------------------------------------

if [[ -t 1 ]]; then
  DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'
  BLUE=$'\033[34m'; MAGENTA=$'\033[35m'; CYAN=$'\033[36m'; RESET=$'\033[0m'
else
  DIM=""; RED=""; GREEN=""; YELLOW=""; BLUE=""; MAGENTA=""; CYAN=""; RESET=""
fi

say()  { printf '%s»%s %s\n' "$CYAN" "$RESET" "$*"; }
warn() { printf '%s!%s %s\n' "$YELLOW" "$RESET" "$*"; }
die()  { printf '%s✗%s %s\n' "$RED" "$RESET" "$*" >&2; exit 1; }
ok()   { printf '%s✓%s %s\n' "$GREEN" "$RESET" "$*"; }

# --- arguments ---------------------------------------------------------------

USE_DOCKER=1
ONLY=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-docker) USE_DOCKER=0; shift ;;
    --only) [[ $# -ge 2 ]] || die "--only needs a value: api, client or admin"
            ONLY+=("$2"); shift 2 ;;
    --down) say "Stopping containers…"
            docker compose -f server/docker-compose.yml down
            exit 0 ;;
    -h|--help) sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Unknown option: $1  (try --help)" ;;
  esac
done

wants() {
  [[ ${#ONLY[@]} -eq 0 ]] && return 0
  local want
  for want in "${ONLY[@]}"; do [[ "$want" == "$1" ]] && return 0; done
  return 1
}

# --- preflight ---------------------------------------------------------------

command -v node >/dev/null || die "node is not installed."
command -v npm  >/dev/null || die "npm is not installed."

[[ -f .env ]] || die ".env is missing at the repo root. Copy .env.example and fill it in."

# The API reads .env from its working directory, and it runs inside server/.
for f in .env .env.example .sequelizerc .nvmrc; do
  if [[ ! -e "server/$f" ]]; then
    ln -s "../$f" "server/$f"
    warn "linked server/$f -> ../$f"
  fi
done

# Check the version the API will actually get, not the one this shell has.
#
# Version managers resolve .nvmrc per directory, so `node -v` at the repo root
# can differ from what `npm run dev` inside server/ ends up using — comparing the
# wrong one produces a warning that is simply untrue.
if [[ -f .nvmrc ]] && wants api; then
  want_major="$(cut -d. -f1 < .nvmrc)"
  have="$(cd server && node -p 'process.versions.node' 2>/dev/null || echo unknown)"
  if [[ "$have" != "unknown" && "${have%%.*}" != "$want_major" ]]; then
    warn "server/ resolves node v$have but .nvmrc asks for v$(cat .nvmrc) — try 'nvm use'."
  fi
fi

# Install anywhere node_modules is missing, so a fresh clone just works.
for app in server client admin; do
  wants "${app/server/api}" || continue
  if [[ ! -d "$app/node_modules" ]]; then
    say "Installing dependencies in $app/ (first run)…"
    (cd "$app" && npm install --no-audit --no-fund)
  fi
done

# Refuse to start on a port something else already owns, rather than letting one
# of the three fail silently ten lines into the combined log.
port_owner() { lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -1; }

check_port() {
  local port=$1 label=$2 pid
  pid="$(port_owner "$port")" || true
  if [[ -n "$pid" ]]; then
    die "Port $port ($label) is already in use by PID $pid — $(ps -p "$pid" -o comm= 2>/dev/null). Stop it, or use --only."
  fi
}

# `wants x && cmd` as a bare statement would abort the script under `set -e`
# whenever --only excludes something, so these stay explicit.
if wants api;    then check_port "$API_PORT" "API"; fi
if wants client; then check_port "$CLIENT_PORT" "storefront"; fi
if wants admin;  then check_port "$ADMIN_PORT" "admin"; fi

# --- containers --------------------------------------------------------------

if [[ $USE_DOCKER -eq 1 ]] && wants api; then
  command -v docker >/dev/null || die "docker is not installed. Use --no-docker if MySQL and Redis run elsewhere."
  docker info >/dev/null 2>&1 || die "The Docker daemon is not running. Start Docker Desktop, or use --no-docker."

  say "Starting MySQL and Redis…"
  # The compose file pins `name: ecom_ai`. Without that the project name would be
  # derived from the directory ("server"), which collides with another project.
  docker compose -f server/docker-compose.yml up -d

  printf '%s»%s Waiting for MySQL' "$CYAN" "$RESET"
  for _ in $(seq 1 60); do
    if [[ "$(docker inspect -f '{{.State.Health.Status}}' babymart-mysql 2>/dev/null)" == "healthy" ]]; then
      printf '\n'; ok "MySQL is healthy"; break
    fi
    printf '.'; sleep 1
  done
fi

# --- run ---------------------------------------------------------------------

PIDS=()

kill_tree() {
  local pid=$1 child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do kill_tree "$child"; done
  kill "$pid" 2>/dev/null || true
}

cleanup() {
  trap - INT TERM EXIT
  printf '\n'
  say "Shutting down…"
  local pid
  for pid in "${PIDS[@]:-}"; do [[ -n "$pid" ]] && kill_tree "$pid"; done
  wait 2>/dev/null || true
  ok "Stopped. Containers are still up — './dev.sh --down' stops those too."
}
trap cleanup INT TERM EXIT

# Each app runs in its own directory and has its output prefixed, so one scroll
# of log is readable. stdbuf keeps npm from buffering when piped.
start() {
  local label=$1 color=$2 dir=$3
  (
    cd "$dir"
    npm run dev 2>&1 | while IFS= read -r line; do
      printf '%s%-6s%s %s%s%s %s\n' "$color" "$label" "$RESET" "$DIM" "│" "$RESET" "$line"
    done
  ) &
  PIDS+=("$!")
}

if wants api;    then start "api"    "$GREEN"   "server"; fi
if wants client; then start "client" "$BLUE"    "client"; fi
if wants admin;  then start "admin"  "$MAGENTA" "admin"; fi

# Report the URLs once the API actually answers, rather than optimistically.
(
  for _ in $(seq 1 60); do
    if curl -fsS -o /dev/null "http://localhost:$API_PORT/health" 2>/dev/null; then
      printf '\n'
      ok "API        http://localhost:$API_PORT/health"
      if wants client; then ok "Storefront http://localhost:$CLIENT_PORT"; fi
      if wants admin;  then ok "Admin      http://localhost:$ADMIN_PORT"; fi
      printf '%s  admin@babymart.local / Admin123!change-me%s\n\n' "$DIM" "$RESET"
      exit 0
    fi
    sleep 1
  done
  warn "The API did not answer on :$API_PORT within 60s — check the 'api' lines above."
) &
PIDS+=("$!")

wait
