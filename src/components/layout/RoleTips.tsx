import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import type { Role } from "@/src/lib/api";

const tips: Record<Role, string[]> = {
  student: ["Check today’s meals", "Request laundry drop-off", "Keep your profile and photo updated"],
  kitchen: ["Use scanner mode for meal approval", "Add override reasons for late scans", "Review recent scan results"],
  laundry: ["Move baskets through the workflow", "Report damaged or missing items", "Use scanner receive/return mode"],
  admin: ["Review approvals", "Watch analytics and audit logs", "Back up data before large imports"],
};

export default function RoleTips({ role }: { role: Role }) {
  const storageKey = `hamsTipsDismissed:${role}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem(storageKey) !== "1");
  }, [storageKey]);

  if (!visible) return null;

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm sm:mx-6 lg:mx-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
            <Sparkles className="h-5 w-5 text-indigo-700" />
          </div>
          <div>
            <p className="font-semibold text-indigo-950">Quick start for this workspace</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tips[role].map((tip) => (
                <span key={tip} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-800 shadow-sm">{tip}</span>
              ))}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            localStorage.setItem(storageKey, "1");
            setVisible(false);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
