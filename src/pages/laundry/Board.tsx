import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Package, Shirt, Sparkles } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { api, type LaundryBasket } from "@/src/lib/api";

const columns = [
  { status: "Pending Approval", title: "Approval", icon: Clock, tone: "bg-yellow-50 border-yellow-100 text-yellow-800" },
  { status: "Pending", title: "Pending", icon: Package, tone: "bg-amber-50 border-amber-100 text-amber-800" },
  { status: "Washing", title: "Washing", icon: Shirt, tone: "bg-indigo-50 border-indigo-100 text-indigo-800" },
  { status: "Ready", title: "Ready", icon: CheckCircle2, tone: "bg-green-50 border-green-100 text-green-800" },
  { status: "Picked Up", title: "Picked Up", icon: Sparkles, tone: "bg-neutral-50 border-neutral-100 text-neutral-700" },
];

function MiniTimeline({ status }: { status: string }) {
  const steps = ["Pending", "Washing", "Ready", "Picked Up"];
  const activeIndex = Math.max(steps.indexOf(status), status === "Pending Approval" ? 0 : 0);
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {steps.map((step, index) => (
        <div key={step} className={`h-1.5 flex-1 rounded-full ${index <= activeIndex ? "bg-indigo-500" : "bg-neutral-200"}`} title={step} />
      ))}
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const tone = value === "Pending Approval" || value === "Pending"
    ? "bg-amber-100 text-amber-800 border-amber-200"
    : value === "Washing"
      ? "bg-indigo-100 text-indigo-800 border-indigo-200"
      : value === "Ready"
        ? "bg-green-100 text-green-800 border-green-200"
        : "bg-neutral-100 text-neutral-700 border-neutral-200";
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${tone}`}>{value}</span>;
}

export default function LaundryBoard() {
  const [baskets, setBaskets] = useState<LaundryBasket[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.laundryBaskets().then(setBaskets).catch(console.error);
  }, []);

  const grouped = useMemo(() => {
    return columns.reduce<Record<string, LaundryBasket[]>>((group, column) => {
      group[column.status] = baskets.filter((basket) => basket.status === column.status);
      return group;
    }, {});
  }, [baskets]);

  const moveBasket = async (basket: LaundryBasket, status: string) => {
    setMessage("");
    try {
      const updated = await api.updateLaundryBasketStatus(basket.id, { status, staffName: "Laundry Staff" });
      setBaskets((current) => current.map((item) => item.id === basket.id ? updated : item));
      setMessage(`Basket #${basket.basketCode} moved to ${status}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to update basket.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Laundry Workflow</h1>
        <p className="text-sm text-neutral-500 mt-1">Move baskets through each stage from request to pickup.</p>
      </div>

      {message && <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-800">{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {columns.map((column, index) => {
          const Icon = column.icon;
          const nextStatus = columns[index + 1]?.status;

          return (
            <section key={column.status} className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
              <div className={`p-4 border-b ${column.tone}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <h2 className="font-semibold">{column.title}</h2>
                  </div>
                  <span className="text-xs font-bold rounded-full bg-white/70 px-2 py-1">{grouped[column.status]?.length ?? 0}</span>
                </div>
              </div>
              <div className="p-3 space-y-3 min-h-40">
                {(grouped[column.status] ?? []).length === 0 ? (
                  <p className="text-sm text-neutral-400 p-3">No baskets here.</p>
                ) : (
                  grouped[column.status].map((basket) => (
                    <div key={basket.id} className="rounded-xl border border-neutral-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-neutral-900">#{basket.basketCode}</p>
                        <p className="text-xs text-neutral-500 font-mono">{basket.studentId}</p>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <StatusPill value={basket.status} />
                        <p className="text-xs text-neutral-500">{basket.receivedAt}</p>
                      </div>
                      <MiniTimeline status={basket.status} />
                      {basket.notes && <p className="text-sm text-neutral-600 mt-2">{basket.notes}</p>}
                      {nextStatus && (
                        <Button size="sm" className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => moveBasket(basket, nextStatus)}>
                          Move to {nextStatus}
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
