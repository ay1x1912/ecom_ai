import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, seedActors, auth, loginAs } from './helpers/api.js';
import { truncateAll, closeDb } from './helpers/db.js';

beforeEach(truncateAll);
afterAll(closeDb);

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await api().post('/api/auth/register').send({
      name: 'New Person',
      email: 'new@test.local',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('new@test.local');
    expect(res.body.data.token).toBeTruthy();
  });

  /** backend-spec.md defect #1 — the source project let anyone register as admin. */
  it('IGNORES a submitted role, so nobody can self-promote', async () => {
    const res = await api().post('/api/auth/register').send({
      name: 'Sneaky',
      email: 'sneaky@test.local',
      password: 'password123',
      role: 'admin',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('user');
  });

  it('normalises email case so one address cannot register twice', async () => {
    await api().post('/api/auth/register').send({
      name: 'Alice', email: 'Mixed@Test.Local', password: 'password123',
    });
    const dup = await api().post('/api/auth/register').send({
      name: 'Bob', email: 'mixed@test.local', password: 'password123',
    });

    expect(dup.status).toBe(409);
  });

  it('rejects a short password and a malformed email', async () => {
    const res = await api().post('/api/auth/register').send({
      name: 'Xavier', email: 'not-an-email', password: '123',
    });

    expect(res.status).toBe(400);
    const paths = res.body.error.fields.map((f) => f.path);
    expect(paths).toContain('email');
    expect(paths).toContain('password');
  });

  it('never returns the password', async () => {
    const res = await api().post('/api/auth/register').send({
      name: 'Pat', email: 'p@test.local', password: 'password123',
    });
    expect(JSON.stringify(res.body)).not.toContain('password123');
    expect(res.body.data.user.password).toBeUndefined();
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(seedActors);

  it('returns a token whose payload carries only the subject', async () => {
    const token = await loginAs('admin@test.local', 'admin12345');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

    expect(payload.sub).toBeTruthy();
    // A JWT payload is readable by anyone holding the token.
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
  });

  /** defect #11 — differing messages tell an attacker which emails exist. */
  it('gives the same error for a wrong password and an unknown email', async () => {
    const wrongPassword = await api().post('/api/auth/login')
      .send({ email: 'admin@test.local', password: 'nope' });
    const unknownEmail = await api().post('/api/auth/login')
      .send({ email: 'ghost@test.local', password: 'nope' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });
});

describe('GET /api/auth/profile', () => {
  it('rejects a missing and an invalid token differently from a valid one', async () => {
    const { customerToken } = await seedActors();

    expect((await api().get('/api/auth/profile')).status).toBe(401);
    expect((await api().get('/api/auth/profile').set(auth('rubbish'))).status).toBe(401);
    expect((await api().get('/api/auth/profile').set(auth(customerToken))).status).toBe(200);
  });
});
