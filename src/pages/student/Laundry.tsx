import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Shirt, CheckCircle2, AlertCircle, QrCode, ScanLine } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { api, type LaundryBasket, type StudentOverview } from "@/src/lib/api";
import { showToast } from "@/src/components/ui/toast";

const timelineSteps = ["Pending Approval", "Pending", "Washing", "Ready", "Picked Up"];

export default function Laundry() {
  const [records, setRecords] = useState<LaundryBasket[]>([]);
  const [overview, setOverview] = useState<StudentOverview | null>(null);
  const [dropCount, setDropCount] = useState("1");
  const [isRequestingDrop, setIsRequestingDrop] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("hamsUser") || "{}");
    const studentId = storedUser.studentId || "240011223";
    api.studentOverview(studentId).then((data) => {
      setOverview(data);
      setRecords(data.laundry);
    }).catch(console.error);
  }, []);

  const current = records[0];
  const activeDropTicket = records.find((item) => item.status !== "Picked Up") ?? null;
  const pastRecords = records.slice(1);
  const currentStepIndex = current ? Math.max(0, timelineSteps.indexOf(current.status)) : -1;
  const isSubscribed = overview?.student.laundrySubscribed !== false;
  const studentId = overview?.student.studentId;
  const dropQrPayload = activeDropTicket && studentId
    ? `HAMS-LAUNDRY:${activeDropTicket.basketCode}:${studentId}:${activeDropTicket.clothesCount || 1}:${Date.now()}`
    : "";

  const subscribeLaundry = async () => {
    if (!overview?.student) return;
    try {
      const updated = await api.updateSubscription(overview.student.id, { service: "laundry", subscribed: true });
      setOverview((currentOverview) => currentOverview ? { ...currentOverview, student: { ...currentOverview.student, ...updated } } : currentOverview);
      localStorage.setItem("hamsUser", JSON.stringify(updated));
      showToast("Laundry subscription activated.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to update laundry subscription.", "error");
    }
  };

  const requestDropQr = async () => {
    if (!studentId) return;
    const clothesCount = Math.min(30, Math.max(1, Number(dropCount) || 1));
    setIsRequestingDrop(true);
    try {
      const basketCode = `LAU${Date.now().toString().slice(-6)}`;
      const basket = await api.requestLaundry(studentId, {
        basketCode,
        clothesCount,
        receivedAt: "Requested now",
        notes: `Student submitted drop-off QR for ${clothesCount} clothes.`,
      });
      setRecords((currentRecords) => [basket, ...currentRecords]);
      showToast("Drop-off QR created. Show it to laundry staff for scanning.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to create drop-off QR.", "error");
    } finally {
      setIsRequestingDrop(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Laundry History</h1>
      </div>

      <section className={`rounded-3xl border p-5 shadow-sm ${isSubscribed ? "border-green-100 bg-green-50" : "border-amber-100 bg-amber-50"}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Laundry service</p>
            <p className="mt-1 text-sm font-medium text-neutral-600">Subscription controls whether you can request and process laundry drop-offs.</p>
          </div>
          {isSubscribed ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-800">
              Subscribed
            </span>
          ) : (
            <Button type="button" variant="default" onClick={subscribeLaundry}>
              Subscribe Laundry
            </Button>
          )}
        </div>
      </section>

      {isSubscribed && (
        <section className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Student drop-off QR</p>
              <h2 className="mt-1 text-xl font-black text-neutral-950">Generate laundry drop ticket</h2>
              <p className="mt-1 text-sm font-medium text-neutral-600">Enter number of clothes, generate QR, and let laundry staff scan it to confirm your identity.</p>
            </div>
            <div className="w-full sm:w-64">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-indigo-700">Clothes count</label>
              <Input type="number" min={1} max={30} value={dropCount} onChange={(event) => setDropCount(String(Math.min(30, Math.max(1, Number(event.target.value) || 1))))} />
            </div>
          </div>
          <Button className="mt-4 bg-indigo-600 text-white hover:bg-indigo-700" onClick={requestDropQr} disabled={isRequestingDrop}>
            <ScanLine className="h-4 w-4" />
            {isRequestingDrop ? "Creating ticket..." : "Create Drop-off QR"}
          </Button>

          {activeDropTicket && dropQrPayload && (
            <div className="mt-5 rounded-2xl border border-indigo-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-indigo-700" />
                <p className="text-sm font-black text-indigo-800">Drop ticket #{activeDropTicket.basketCode}</p>
              </div>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=230x230&data=${encodeURIComponent(dropQrPayload)}`}
                alt="Laundry drop-off QR"
                className="mx-auto mt-3 h-56 w-56 rounded-2xl border border-indigo-100"
              />
              <p className="mt-3 text-center text-sm font-semibold text-neutral-700">
                Clothes: {activeDropTicket.clothesCount || 1} • Status: {activeDropTicket.status}
              </p>
            </div>
          )}
        </section>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-lg font-semibold text-neutral-900">Current Status</h2>
          <div className="mt-4 flex items-center p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mr-4">
              <Shirt className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">{current ? `Basket #${current.basketCode}` : "No active basket"}</h3>
              <p className="text-sm text-indigo-700 font-medium">{current?.notes || current?.status || "Ready when you are"}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-neutral-500">Dropped off</p>
              <p className="font-medium text-neutral-900">{current?.receivedAt || "-"}</p>
            </div>
          </div>
          {current && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-5 gap-3">
              {timelineSteps.map((step, index) => {
                const isDone = index <= currentStepIndex;
                return (
                  <div key={step} className={`rounded-xl border p-3 ${isDone ? "bg-indigo-50 border-indigo-100 text-indigo-800" : "bg-neutral-50 border-neutral-100 text-neutral-500"}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-2 ${isDone ? "bg-indigo-600 text-white" : "bg-white text-neutral-400 border border-neutral-200"}`}>
                      {index + 1}
                    </div>
                    <p className="text-xs font-semibold">{step}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6">
          <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4">Past Records</h3>
          <div className="space-y-4">
            {pastRecords.map((record, i) => {
              const Icon = record.status === "Issue Reported" ? AlertCircle : CheckCircle2;
              const color = record.status === "Issue Reported" ? "text-red-500" : "text-green-500";
              const bg = record.status === "Issue Reported" ? "bg-red-50" : "bg-green-50";

              return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${bg}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">Basket #{record.basketCode}</p>
                    <p className="text-sm text-neutral-500">{record.receivedAt} • {record.clothesCount || 1} clothes</p>
                  </div>
                </div>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${bg} ${color}`}>
                  {record.status}
                </span>
              </motion.div>
            )})}
          </div>
        </div>
      </div>
    </div>
  );
}
