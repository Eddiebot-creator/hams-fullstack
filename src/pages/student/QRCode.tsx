import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Clock3, QrCode as QrIcon, RefreshCw, TicketCheck, UtensilsCrossed } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { api, type Meal, type StudentOverview } from "@/src/lib/api";
import { showToast } from "@/src/components/ui/toast";

const mealWindows = [
  { type: "Breakfast", start: "06:30", end: "08:45", label: "6:30 AM - 8:45 AM" },
  { type: "Dinner", start: "17:00", end: "19:45", label: "5:00 PM - 7:45 PM" },
];

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function activeMealByTime(meals: Meal[]) {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const window = mealWindows.find((item) => current >= minutes(item.start) && current <= minutes(item.end));
  if (!window) return null;
  return meals.find((meal) => meal.type === window.type) ?? null;
}

function nextWindowLabel() {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const next = mealWindows.find((item) => current < minutes(item.start)) ?? mealWindows[0];
  return `${next.type} opens at ${next.label}`;
}

export default function QRCode() {
  const storedUser = useMemo(() => JSON.parse(localStorage.getItem("hamsUser") || "{}"), []);
  const [overview, setOverview] = useState<StudentOverview | null>(null);
  const [nonce, setNonce] = useState(Date.now());
  const studentId = overview?.student.studentId || storedUser.studentId || "240011223";
  const activeMeal = activeMealByTime(overview?.meals ?? []);
  const isSubscribed = overview?.student.mealSubscribed !== false;
  const today = new Date().toISOString().slice(0, 10);
  const qrPayload = activeMeal ? `HAMS-MEAL:${activeMeal.type}:${studentId}:${today}:${nonce}` : "";
  const qrData = encodeURIComponent(qrPayload);

  useEffect(() => {
    api.studentOverview(studentId).then(setOverview).catch(console.error);
  }, [studentId]);

  const toggleMealSubscription = async () => {
    if (!overview?.student) return;
    try {
      const updated = await api.updateSubscription(overview.student.id, { service: "meals", subscribed: !isSubscribed });
      setOverview((current) => current ? { ...current, student: { ...current.student, ...updated } } : current);
      localStorage.setItem("hamsUser", JSON.stringify(updated));
      showToast(updated.mealSubscribed ? "Meal subscription activated." : "Meal subscription paused.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to update meal subscription.", "error");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-neutral-100 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />

        <div className="mx-auto mb-4 flex items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
            <QrIcon className="h-7 w-7" />
          </div>
          {(overview?.student?.profilePhoto || storedUser?.profilePhoto) ? (
            <img
              src={overview?.student?.profilePhoto || storedUser?.profilePhoto}
              alt="Profile"
              className="h-14 w-14 rounded-2xl object-cover border-2 border-indigo-100 shadow-sm"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white text-xl font-black shadow-sm">
              {(overview?.student?.name || storedUser?.name || "S").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">Meal QR Ticket</h1>
        <p className="mt-2 text-sm text-neutral-500">QR codes are generated only during breakfast and dinner service windows.</p>

        <div className="mt-6 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Meal subscription</p>
              <p className="mt-1 text-lg font-black text-neutral-950">{isSubscribed ? "Subscribed" : "Unsubscribed"}</p>
            </div>
            <Button type="button" variant={isSubscribed ? "outline" : "default"} onClick={toggleMealSubscription}>
              {isSubscribed ? "Unsubscribe Meals" : "Subscribe Meals"}
            </Button>
          </div>
        </div>

        {isSubscribed && activeMeal ? (
          <>
            <div className="mx-auto mt-8 inline-block rounded-3xl border-2 border-indigo-100 bg-white p-4 shadow-sm relative">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrData}`}
                alt={`${activeMeal.type} QR Code`}
                className="h-64 w-64 rounded-2xl"
              />
              <motion.div
                animate={{ y: [0, 250, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute left-4 right-4 top-4 z-10 h-1 bg-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.8)]"
              />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-left">
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Student ID</p>
                <p className="mt-1 font-mono text-xl font-black tracking-widest text-neutral-900">{studentId}</p>
              </div>
              <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-left">
                <p className="text-xs font-bold uppercase tracking-wide text-green-700">Active ticket</p>
                <p className="mt-1 text-xl font-black text-green-900">{activeMeal.type}</p>
                <p className="text-sm font-semibold text-green-700">{activeMeal.windowLabel || mealWindows.find((item) => item.type === activeMeal.type)?.label}</p>
              </div>
            </div>

            <Button variant="outline" className="mt-6 w-full sm:w-auto" onClick={() => setNonce(Date.now())}>
              <RefreshCw className="h-4 w-4" />
              Refresh Code
            </Button>
          </>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-neutral-200 bg-neutral-50 p-8">
            <TicketCheck className="mx-auto h-12 w-12 text-neutral-400" />
            <p className="mt-4 text-lg font-black text-neutral-950">
              {!isSubscribed ? "Meal QR is paused" : "No meal QR available now"}
            </p>
            <p className="mt-2 text-sm font-medium text-neutral-500">
              {!isSubscribed ? "Subscribe to meals to generate breakfast and dinner QR tickets." : nextWindowLabel()}
            </p>
          </div>
        )}
      </motion.section>

      <section className="grid gap-3 sm:grid-cols-2">
        {mealWindows.map((meal) => {
          const isActive = activeMeal?.type === meal.type;
          return (
            <div key={meal.type} className={`rounded-2xl border p-4 ${isActive ? "border-green-200 bg-green-50" : "border-neutral-100 bg-white"}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isActive ? "bg-green-600 text-white" : "bg-indigo-50 text-indigo-700"}`}>
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-black text-neutral-950">{meal.type}</p>
                  <p className="text-sm font-medium text-neutral-500">{meal.label}</p>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
                <Clock3 className="h-4 w-4" />
                {isActive ? "QR generation open" : "QR generation closed"}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
