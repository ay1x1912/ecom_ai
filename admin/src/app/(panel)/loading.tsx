import { Skeleton } from "@/components/ui/skeleton";

export default function PanelLoading() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}
