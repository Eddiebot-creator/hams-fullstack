import { cn } from "@/src/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-neutral-200/70", className)} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm space-y-4">
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
