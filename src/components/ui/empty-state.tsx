import type { LucideIcon } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
        <Icon className="h-6 w-6 text-indigo-600" />
      </div>
      <p className="font-semibold text-neutral-900">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">{message}</p>
      {actionLabel && onAction && (
        <Button type="button" onClick={onAction} className="mt-4 bg-indigo-600 text-white hover:bg-indigo-700">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
