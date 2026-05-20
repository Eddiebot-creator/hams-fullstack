import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Package, Shirt, CheckCircle2, AlertCircle, UserRound, Clock3 } from "lucide-react";
import { api, type LaundryDashboard as LaundryDashboardData } from "@/src/lib/api";

function LaundryStatusChip({ value }: { value: string }) {
  const tone = value.toLowerCase().includes("pending")
    ? "bg-amber-100 text-amber-800 border-amber-200"
    : value.toLowerCase().includes("washing")
      ? "bg-indigo-100 text-indigo-800 border-indigo-200"
      : value.toLowerCase().includes("ready")
        ? "bg-green-100 text-green-800 border-green-200"
        : value.toLowerCase().includes("picked")
          ? "bg-neutral-100 text-neutral-800 border-neutral-200"
          : value.toLowerCase().includes("issue") || value.toLowerCase().includes("error")
            ? "bg-red-100 text-red-800 border-red-200"
            : "bg-sky-100 text-sky-800 border-sky-200";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${tone}`}>{value}</span>;
}

const timelineSteps = ["Pending", "Washing", "Ready", "Picked Up"];

export default function LaundryDashboard() {
  const [dashboard, setDashboard] = useState<LaundryDashboardData | null>(null);
  const [staffName, setStaffName] = useState("Laundry Staff");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("hamsUser") || "{}");
    setStaffName(storedUser.name || "Laundry Staff");
    api.laundryDashboard().then(setDashboard).catch(console.error);
  }, []);

  const counts = dashboard?.statusCounts ?? { pending: 0, washing: 0, ready: 0, issues: 0 };

  const formatActivityTime = (value: string) => {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return value || "Time not recorded";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Laundry Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">Signed in as {staffName}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
          <UserRound className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider">My workspace</p>
          <p className="font-semibold text-neutral-900">{staffName}</p>
          <p className="text-sm text-neutral-500">Your basket updates are saved to the database activity history.</p>
        </div>
      </div>



      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Pending</h2>
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-neutral-900">{counts.pending}</p>
          <p className="text-sm text-neutral-500 mt-1">Baskets waiting to be washed</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Washing</h2>
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <Shirt className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-neutral-900">{counts.washing}</p>
          <p className="text-sm text-neutral-500 mt-1">Baskets currently in machines</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Ready</h2>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-neutral-900">{counts.ready}</p>
          <p className="text-sm text-neutral-500 mt-1">Baskets ready for pickup</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Issues</h2>
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-neutral-900">{counts.issues}</p>
          <p className="text-sm text-neutral-500 mt-1">Reported issues</p>
        </motion.div>
      </div>

      <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Basket Timeline</h2>
            <p className="text-sm text-neutral-500">Cleaner visual flow from drop-off to pickup.</p>
          </div>
          <Clock3 className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {timelineSteps.map((step, index) => (
            <div key={step} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <LaundryStatusChip value={step} />
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-neutral-500 shadow-sm">{index + 1}</span>
              </div>
              <p className="mt-3 text-xs font-medium text-neutral-500">
                {step === "Pending" && "Basket received and waiting for laundry staff."}
                {step === "Washing" && "Basket is currently being processed."}
                {step === "Ready" && "Clean laundry is ready for collection."}
                {step === "Picked Up" && "Student has collected the basket."}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden mt-8">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-lg font-semibold text-neutral-900">Recent Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Basket ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Staff</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {(dashboard?.activity ?? []).map((activity) => (
                <tr key={activity.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-neutral-800">{formatActivityTime(activity.activityTime)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 font-mono">#{activity.basketCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><LaundryStatusChip value={activity.action} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-700">{activity.staffName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
