import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, CheckCircle2, Clock3, QrCode, ScanLine, Shirt } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { api, type LaundryBasket, type StudentOverview } from "@/src/lib/api";
import { showToast } from "@/src/components/ui/toast";

const timelineSteps = ["Pending Approval", "Pending", "Washing", "Ready", "Picked Up"];
const maxClothesCount = 30;
const dropWindow = { start: "08:00", end: "13:00", label: "8:00 AM - 1:00 PM" };

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function isDropWindowOpen() {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= minutes(dropWindow.start) && current <= minutes(dropWindow.end);
}

function parseRecordDate(value?: string | null) {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const prefixes: Array<[string, Date]> = [["Today, ", today], ["Yesterday, ", yesterday]];

  for (const [prefix, base] of prefixes) {
    if (!value.startsWith(prefix)) continue;
    const time = value.replace(prefix, "").trim();
    const match = time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (!match) return null;
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const meridiem = match[3].toUpperCase();
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    const parsed = new Date(base);
    parsed.setHours(hour, minute, 0, 0);
    return parsed;
  }

  return null;
}

function weekStart(date: Date) {
  const start = new Date(date);
  const dayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayOffset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isThisWeek(record: LaundryBasket) {
  const received = parseRecordDate(record.receivedAt);
  if (!received) return false;
  return weekStart(received).getTime() === weekStart(new Date()).getTime();
}

function clampClothes(value: string) {
  if (value.trim() === "") return "";
  return String(Math.min(maxClothesCount, Math.max(1, Number(value) || 1)));
}

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

  const weeklyDrop = useMemo(
    () => records.find((item) => item.status !== "Cancelled" && isThisWeek(item)) ?? null,
    [records]
  );
  const current = records.find((item) => item.status !== "Picked Up") ?? records[0];
  const pastRecords = records.filter((record) => record.id !== current?.id);
  const currentStepIndex = current ? Math.max(0, timelineSteps.indexOf(current.status)) : -1;
  const isSubscribed = overview?.student.laundrySubscribed !== false;
  const studentId = overview?.student.studentId;
  const studentName = overview?.student.name || "Student";
  const profilePhoto = overview?.student.photoUrl;
  const dropOpen = isDropWindowOpen();
  const activeDropTicket = weeklyDrop?.status === "Pending Approval" ? weeklyDrop : null;
  const droppedAlready = Boolean(weeklyDrop && weeklyDrop.status !== "Pending Approval");
  const dropQrPayload = activeDropTicket && studentId
    ? `HAMS-LAUNDRY:${activeDropTicket.basketCode}:${studentId}:${activeDropTicket.clothesCount || 1}:${activeDropTicket.id}`
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
    if (!dropOpen) {
      showToast(`Laundry drop-off QR opens from ${dropWindow.label}.`, "error");
      return;
    }
    if (weeklyDrop) {
      showToast("Dropped already for the week. You can generate another laundry QR next week.", "error");
      return;
    }

    const clothesCount = Math.min(maxClothesCount, Math.max(1, Number(dropCount) || 1));
    setIsRequestingDrop(true);
    try {
      const basketCode = `LAU${studentId}-${Date.now().toString().slice(-3)}`;
      const basket = await api.requestLaundry(studentId, {
        basketCode,
        clothesCount,
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
            <p className="mt-1 text-sm font-medium text-neutral-600">Drop-off QR generation is open weekly from {dropWindow.label}.</p>
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
              <p className="mt-1 text-sm font-medium text-neutral-600">
                Maximum {maxClothesCount} clothes. One laundry drop is allowed per week.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-indigo-700">Clothes count</label>
              <Input
                type="number"
                min={1}
                max={maxClothesCount}
                inputMode="numeric"
                value={dropCount}
                onChange={(event) => setDropCount(clampClothes(event.target.value))}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={requestDropQr}
              disabled={isRequestingDrop || !dropOpen || Boolean(weeklyDrop)}
            >
              <ScanLine className="h-4 w-4" />
              {isRequestingDrop ? "Creating ticket..." : "Create Drop-off QR"}
            </Button>
            <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${dropOpen ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
              <Clock3 className="h-4 w-4" />
              {dropOpen ? "Drop-off open now" : `Drop-off opens ${dropWindow.label}`}
            </span>
          </div>

          {droppedAlready && weeklyDrop && (
            <div className="mt-5 rounded-2xl border border-green-200 bg-white p-4">
              <p className="text-lg font-black text-green-800">Dropped already for the week</p>
              <p className="mt-1 text-sm font-semibold text-neutral-600">
                Basket #{weeklyDrop.basketCode} is currently {weeklyDrop.status}. Your next laundry QR opens next week.
              </p>
            </div>
          )}

          {activeDropTicket && dropQrPayload && (
            <div className="mt-5 grid gap-4 rounded-3xl border border-indigo-200 bg-white p-4 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="mx-auto rounded-3xl border-2 border-indigo-100 bg-white p-3 shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=230x230&data=${encodeURIComponent(dropQrPayload)}`}
                  alt="Laundry drop-off QR"
                  className="h-56 w-56 rounded-2xl"
                />
              </div>
              <div className="rounded-3xl border border-neutral-100 bg-neutral-50 p-5">
                <div className="flex items-center gap-4">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="h-20 w-20 rounded-2xl border-2 border-white object-cover shadow-sm" />
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
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Drop ticket</p>
                  <p className="mt-1 text-base font-black text-neutral-950">#{activeDropTicket.basketCode}</p>
                  <p className="text-sm font-semibold text-neutral-500">
                    {activeDropTicket.clothesCount || 1} clothes - pickup/return after 24 hours or more
                  </p>
                </div>
              </div>
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
              <p className="font-medium text-neutral-900">{current?.receivedAt ? (() => { const d = new Date(current.receivedAt); return isNaN(d.getTime()) ? current.receivedAt : d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); })() : "-"}</p>
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
                  key={record.id}
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
                      <p className="text-sm text-neutral-500">{(() => { const d = new Date(record.receivedAt || ""); return isNaN(d.getTime()) ? record.receivedAt : d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); })()} - {record.clothesCount || 1} clothes</p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${bg} ${color}`}>
                    {record.status}
                  </span>
                </motion.div>
              );
            })}
            {pastRecords.length === 0 && <p className="text-sm text-neutral-500">No past laundry records yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
