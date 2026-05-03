import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type ToastType = "success" | "error";
type Toast = { id: number; message: string; type: ToastType };

export function showToast(message: string, type: ToastType = "success") {
  window.dispatchEvent(new CustomEvent("hams-toast", { detail: { message, type } }));
}

export function ToastViewport() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; type: ToastType }>).detail;
      const toast = { id: Date.now(), message: detail.message, type: detail.type };
      setToasts((current) => [...current, toast]);
      window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 3500);
    };
    window.addEventListener("hams-toast", handler);
    return () => window.removeEventListener("hams-toast", handler);
  }, []);

  return (
    <div className="fixed right-4 top-4 z-[100] space-y-3">
      {toasts.map((toast) => {
        const Icon = toast.type === "success" ? CheckCircle2 : XCircle;
        return (
          <div key={toast.id} className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-lg ${toast.type === "success" ? "border-green-100 text-green-800" : "border-red-100 text-red-800"}`}>
            <Icon className="w-5 h-5" />
            <p className="text-sm font-semibold">{toast.message}</p>
          </div>
        );
      })}
    </div>
  );
}
