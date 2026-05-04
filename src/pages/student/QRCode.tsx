import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Clock3, QrCode as QrIcon, RefreshCw, TicketCheck, UtensilsCrossed } from "lucide-react";
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
  const [isHoldingClaim, setIsHoldingClaim] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const holdTimeoutRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const studentId = overview?.student.studentId || storedUser.studentId || "240011223";
  const activeMeal = activeMealByTime(overview?.meals ?? []);
  const activeUnclaimedMeal = activeMeal && !activeMeal.consumed ? activeMeal : null;
  const isSubscribed = overview?.student.mealSubscribed !== false;
  const today = new Date().toISOString().slice(0, 10);
  const mealStatus = activeMeal ? "Active" : "Inactive";
  const qrMealType = activeMeal?.type ?? "Inactive";
  const qrPayload = isSubscribed ? `HAMS-MEAL:${qrMealType}:${studentId}:${today}:${nonce}` : "";
  const qrData = encodeURIComponent(qrPayload);
  const profilePhoto = overview?.student?.photoUrl || storedUser?.photoUrl;
  const studentName = overview?.student?.name || storedUser?.name || "Student";

  useEffect(() => {
    api.studentOverview(studentId).then(setOverview).catch(console.error);
  }, [studentId]);

  useEffect(() => () => {
    if (holdTimeoutRef.current) window.clearTimeout(holdTimeoutRef.current);
    if (holdIntervalRef.current) window.clearInterval(holdIntervalRef.current);
  }, []);

  const subscribeMeals = async () => {
    if (!overview?.student) return;
    try {
      const updated = await api.updateSubscription(overview.student.id, { service: "meals", subscribed: true });
      setOverview((current) => current ? { ...current, student: { ...current.student, ...updated } } : current);
      localStorage.setItem("hamsUser", JSON.stringify(updated));
      showToast("Meal subscription activated.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to update meal subscription.", "error");
    }
  };

  const resetHold = () => {
    if (holdTimeoutRef.current) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setIsHoldingClaim(false);
    setHoldProgress(0);
  };

  const claimMeal = async () => {
    if (!activeUnclaimedMeal || isClaiming) return;
    setIsClaiming(true);
    try {
      const result = await api.claimMeal(studentId, activeUnclaimedMeal.id);
      setOverview((current) => {
        if (!current) return current;
        return {
          ...current,
          meals: current.meals.map((meal) => (
            meal.id === activeUnclaimedMeal.id
              ? { ...meal, consumed: 1, scannedAt: result.ticket.scannedAt, status: "Claimed" }
              : meal
          )),
        };
      });
      showToast("MEAL CLAIMED");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to claim meal ticket.", "error");
    } finally {
      setIsClaiming(false);
      resetHold();
    }
  };

  const startHoldToClaim = () => {
    if (!activeUnclaimedMeal || isClaiming || isHoldingClaim) return;
    setIsHoldingClaim(true);
    setHoldProgress(0);
    const startedAt = Date.now();
    holdIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setHoldProgress(Math.min(100, (elapsed / 1200) * 100));
    }, 30);
    holdTimeoutRef.current = window.setTimeout(() => {
      void claimMeal();
    }, 1200);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-neutral-100 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
          <QrIcon className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">Meal QR Ticket</h1>
        <p className="mt-2 text-sm text-neutral-500">QR codes are generated only during breakfast and dinner service windows.</p>

        <div className="mt-6 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Meal subscription</p>
              <p className="mt-1 text-lg font-black text-neutral-950">{isSubscribed ? "Subscribed" : "Unsubscribed"}</p>
            </div>
            {!isSubscribed ? (
              <Button type="button" variant="default" onClick={subscribeMeals}>
                Subscribe Meals
              </Button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                Subscribed
              </span>
            )}
          </div>
        </div>

        {isSubscribed ? (
          <>
            {activeMeal?.consumed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-auto mt-8 max-w-md rounded-3xl border-2 border-green-200 bg-green-50 p-8 text-center"
              >
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-700">Ticket complete</p>
                <p className="mt-2 text-4xl font-black text-green-900">MEAL CLAIMED</p>
                <p className="mt-3 text-sm font-semibold text-green-800">This meal ticket has been consumed and cannot be reused.</p>
              </motion.div>
            ) : (
              <div className="mx-auto mt-8 grid max-w-2xl items-center gap-4 sm:grid-cols-[auto_1fr]">
                <div className="inline-block rounded-3xl border-2 border-indigo-100 bg-white p-4 shadow-sm relative">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrData}`}
                    alt={`${qrMealType} QR Code`}
                    className="h-64 w-64 rounded-2xl"
                  />
                  {activeUnclaimedMeal ? (
                    <motion.div
                      animate={{ y: [0, 250, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute left-4 right-4 top-4 z-10 h-1 bg-green-500/70 shadow-[0_0_10px_rgba(34,197,94,0.9)]"
                    />
                  ) : null}
                </div>

                <div className="rounded-3xl border border-neutral-100 bg-neutral-50 p-5 text-left">
                  <div className="flex items-center gap-4">
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="Profile"
                        className="h-20 w-20 rounded-2xl border-2 border-white object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-black text-white shadow-sm">
                        {studentName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Student identity</p>
                      <p className="mt-1 text-lg font-black text-neutral-950">{studentName}</p>
                      <p className="font-mono text-sm font-bold text-indigo-700">{studentId}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Ticket meal</p>
                    <p className="mt-1 text-base font-black text-neutral-950">{qrMealType}</p>
                    <p className="text-sm font-semibold text-neutral-500">
                      {activeMeal
                        ? (activeMeal.windowLabel || mealWindows.find((item) => item.type === activeMeal.type)?.label)
                        : nextWindowLabel()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-center">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                  mealStatus === "Active" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                QR Status: {mealStatus}
              </span>
            </div>

            {activeUnclaimedMeal ? (
              <div className="mx-auto mt-5 max-w-md">
                <Button
                  type="button"
                  onMouseDown={startHoldToClaim}
                  onMouseUp={resetHold}
                  onMouseLeave={resetHold}
                  onTouchStart={startHoldToClaim}
                  onTouchEnd={resetHold}
                  onTouchCancel={resetHold}
                  disabled={isClaiming}
                  className="h-14 w-full bg-green-600 text-base font-black text-white hover:bg-green-700"
                >
                  {isClaiming ? "Claiming..." : "Hold when receiving food"}
                </Button>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-green-600 transition-all duration-75" style={{ width: `${holdProgress}%` }} />
                </div>
              </div>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-left">
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Student ID</p>
                <p className="mt-1 font-mono text-xl font-black tracking-widest text-neutral-900">{studentId}</p>
              </div>
              <div className={`rounded-2xl border p-4 text-left ${mealStatus === "Active" ? "border-green-100 bg-green-50" : "border-amber-100 bg-amber-50"}`}>
                <p className={`text-xs font-bold uppercase tracking-wide ${mealStatus === "Active" ? "text-green-700" : "text-amber-700"}`}>Ticket status</p>
                <p className={`mt-1 text-xl font-black ${mealStatus === "Active" ? "text-green-900" : "text-amber-900"}`}>{mealStatus}</p>
                <p className={`text-sm font-semibold ${mealStatus === "Active" ? "text-green-700" : "text-amber-700"}`}>
                  {activeMeal
                    ? (activeMeal.windowLabel || mealWindows.find((item) => item.type === activeMeal.type)?.label)
                    : nextWindowLabel()}
                </p>
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
            <p className="mt-4 text-lg font-black text-neutral-950">Meal QR is paused</p>
            <p className="mt-2 text-sm font-medium text-neutral-500">
              Subscribe to meals to generate your breakfast and dinner QR ticket.
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
