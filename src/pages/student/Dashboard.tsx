import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Bell, CheckCircle2, Clock, Moon, PackagePlus, QrCode, Shirt, UtensilsCrossed } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { CardSkeleton } from "@/src/components/ui/skeleton";
import { api, type Notification, type StudentOverview } from "@/src/lib/api";

const laundryStages = ["Pending Approval", "Pending", "Washing", "Ready", "Picked Up"];

export default function Dashboard() {
  const [overview, setOverview] = useState<StudentOverview | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestNote, setRequestNote] = useState("");
  const [requestClothesCount, setRequestClothesCount] = useState("1");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("hamsUser") || "{}");
    const studentId = storedUser.studentId || "240011223";
    Promise.all([
      api.studentOverview(studentId).then(setOverview),
      api.notifications("student", studentId).then(setNotifications),
    ]).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  const meals = overview?.meals ?? [];
  const currentLaundry = overview?.laundry[0];
  const studentId = overview?.student.studentId ?? "240011223";
  const remainingMeals = meals.filter((meal) => !meal.consumed).length;
  const consumedMeals = meals.length - remainingMeals;
  const unreadCount = notifications.filter((item) => item.isRead === 0).length;
  const activeStageIndex = Math.max(laundryStages.indexOf(currentLaundry?.status || ""), 0);
  const mealSubscribed = overview?.student.mealSubscribed !== false;
  const laundrySubscribed = overview?.student.laundrySubscribed !== false;
  const profileCompletion = useMemo(() => {
    const student = overview?.student;
    if (!student) return 0;
    const items = [student.name, student.email, student.studentId, student.hostel, student.room, student.gender, student.phone, student.photoUrl];
    return Math.round((items.filter(Boolean).length / items.length) * 100);
  }, [overview?.student]);

  const requestLaundry = async () => {
    setMessage("");
    if (!laundrySubscribed) {
      setMessage("Subscribe to laundry service before requesting a drop-off.");
      return;
    }
    try {
      const basket = await api.requestLaundry(studentId, {
        basketCode: `REQ${Date.now().toString().slice(-5)}`,
        clothesCount: Math.max(1, Number(requestClothesCount) || 1),
        receivedAt: "Requested now",
        notes: requestNote || "Student laundry request",
      });
      setOverview((current) => current ? { ...current, laundry: [basket, ...current.laundry] } : current);
      setRequestNote("");
      setMessage("Laundry request sent.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to send laundry request.");
    }
  };

  const toggleSubscription = async (service: "meals" | "laundry") => {
    const student = overview?.student;
    if (!student) return;
    const nextSubscribed = service === "meals" ? !mealSubscribed : !laundrySubscribed;
    try {
      const updated = await api.updateSubscription(student.id, { service, subscribed: nextSubscribed });
      setOverview((current) => current ? { ...current, student: { ...current.student, ...updated } } : current);
      localStorage.setItem("hamsUser", JSON.stringify(updated));
      setMessage(`${service === "meals" ? "Meal" : "Laundry"} service ${nextSubscribed ? "subscribed" : "unsubscribed"}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to update subscription.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
        <CardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6">
      <section className="rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-2xl border border-neutral-100 bg-indigo-50 flex items-center justify-center">
              {overview?.student.photoUrl ? (
                <img src={overview.student.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-black text-indigo-700">{overview?.student.name?.slice(0, 1) || "S"}</span>
              )}
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Student Home</p>
              <h1 className="text-2xl font-black text-neutral-950">{overview?.student.name || "Student"}</h1>
              <p className="text-sm font-medium text-neutral-500">{overview?.student.hostel}{overview?.student.room ? `, ${overview.student.room}` : ""}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-72">
            <Metric label="Meals" value={`${consumedMeals}/${meals.length || 0}`} />
            <Metric label="Laundry" value={currentLaundry?.status || "None"} />
            <Metric label="Profile" value={`${profileCompletion}%`} />
          </div>
        </div>
      </section>



      <section className="grid gap-3 md:grid-cols-2">
        <ServiceCard
          title="Meals"
          description="Breakfast and dinner QR ticket access"
          subscribed={mealSubscribed}
          onToggle={() => toggleSubscription("meals")}
          lockWhenSubscribed
        />
        <ServiceCard
          title="Laundry"
          description="Drop-off requests and basket tracking"
          subscribed={laundrySubscribed}
          onToggle={() => toggleSubscription("laundry")}
          lockWhenSubscribed
        />
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_0.9fr]">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-950">
              <UtensilsCrossed className="h-5 w-5 text-indigo-600" />
              Today's Meals
            </h2>
            <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{remainingMeals} remaining</span>
          </div>

          <div className="mt-5 grid gap-3">
            {meals.length === 0 ? (
              <EmptyPanel title="No meals scheduled" message="Meal records will appear here after admin creates them." />
            ) : meals.map((meal) => (
              <div key={meal.id} className={`rounded-2xl border p-4 ${meal.consumed ? "border-green-100 bg-green-50" : "border-neutral-100 bg-neutral-50"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-neutral-950">{meal.type}</p>
                    <p className="text-sm font-medium text-neutral-500">{meal.startTime} - {meal.endTime}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${meal.consumed ? "bg-green-100 text-green-800" : "bg-white text-neutral-600"}`}>
                    {meal.consumed ? "Collected" : meal.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-neutral-600">{meal.menu}</p>
                {meal.scannedAt && <p className="mt-2 text-xs font-semibold text-green-700">Scanned {meal.scannedAt}</p>}
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-950">
              <Shirt className="h-5 w-5 text-indigo-600" />
              Laundry Tracking
            </h2>
            {currentLaundry && <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-700">#{currentLaundry.basketCode}</span>}
          </div>

          <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="font-bold text-neutral-950">{currentLaundry?.status || "No active laundry"}</p>
            <p className="mt-1 text-sm text-neutral-600">
              {currentLaundry ? `Estimated finish: ${currentLaundry.estimatedFinish || "Not scheduled"}` : "Request a drop-off when you have laundry ready."}
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {laundryStages.map((stage, index) => {
              const reached = !!currentLaundry && index <= activeStageIndex;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${reached ? "bg-indigo-600 text-white" : "bg-neutral-100 text-neutral-400"}`}>
                    {reached ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${reached ? "text-neutral-950" : "text-neutral-400"}`}>{stage}</p>
                    {stage === currentLaundry?.status && <p className="text-xs font-medium text-indigo-700">Current stage</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-950">
              <PackagePlus className="h-4 w-4 text-indigo-600" />
              Request laundry drop-off
            </h3>
            <Input type="number" min={1} placeholder="How many clothes?" value={requestClothesCount} onChange={(event) => setRequestClothesCount(event.target.value)} />
            <Input placeholder="Optional note for laundry staff" value={requestNote} onChange={(event) => setRequestNote(event.target.value)} />
            <Button onClick={requestLaundry} disabled={!laundrySubscribed} className="w-full">
              {laundrySubscribed ? "Send Request" : "Subscribe to Laundry First"}
            </Button>
            {message && <p className="text-sm font-bold text-indigo-700">{message}</p>}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function ServiceCard({
  title,
  description,
  subscribed,
  onToggle,
  lockWhenSubscribed = false,
}: {
  title: string;
  description: string;
  subscribed: boolean;
  onToggle: () => void;
  lockWhenSubscribed?: boolean;
}) {
  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${subscribed ? "border-green-100 bg-green-50" : "border-amber-100 bg-amber-50"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{title} service</p>
          <p className="mt-1 text-sm font-medium text-neutral-600">{description}</p>
        </div>
        {subscribed && lockWhenSubscribed ? (
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-800">
            Subscribed
          </span>
        ) : (
          <Button type="button" variant={subscribed ? "outline" : "default"} onClick={onToggle}>
            {subscribed ? `Unsubscribe ${title}` : `Subscribe ${title}`}
          </Button>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 text-center">
      <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-neutral-950">{value}</p>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, tone }: { to: string; icon: typeof QrCode; label: string; tone: string }) {
  return (
    <Link to={to} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center text-sm font-black shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${tone}`}>
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

function EmptyPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
      <p className="font-bold text-neutral-950">{title}</p>
      <p className="mt-1 text-sm text-neutral-500">{message}</p>
    </div>
  );
}
