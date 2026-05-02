import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Activity, Users, UtensilsCrossed, Shirt, TrendingUp } from "lucide-react";
import { api, type AdminDashboard as AdminDashboardData, type AuditLog, type LaundryBasket } from "@/src/lib/api";

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [baskets, setBaskets] = useState<LaundryBasket[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);

  useEffect(() => {
    api.adminControlCenter().then((data) => {
      setDashboard(data.dashboard);
      setBaskets(data.pendingBaskets);
      setAudits(data.audits);
    }).catch(console.error);
  }, []);

  const stats = [
    { title: 'Total Students', value: dashboard?.stats.totalStudents.toLocaleString() ?? '...', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Meals Served Today', value: dashboard?.stats.mealsServedToday.toLocaleString() ?? '...', icon: UtensilsCrossed, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Laundry Baskets', value: dashboard?.stats.laundryBaskets.toLocaleString() ?? '...', icon: Shirt, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { title: 'System Uptime', value: dashboard?.stats.systemUptime ?? '...', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];
  const pendingApprovals = baskets;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-neutral-500">{stat.title}</h2>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-neutral-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100 lg:col-span-1"
        >
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Recent System Alerts</h2>
          <div className="space-y-4">
            {(dashboard?.alerts ?? []).map((alert, i) => (
              <div key={i} className={`p-4 rounded-xl border ${
                alert.alertType === 'warning' ? 'bg-yellow-50 border-yellow-100 text-yellow-800' :
                alert.alertType === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
                'bg-blue-50 border-blue-100 text-blue-800'
              }`}>
                <div className="flex justify-between">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs opacity-70">{alert.alertTime}</p>
                </div>
              </div>
            ))}
            {dashboard?.alerts.length === 0 && <p className="text-sm text-neutral-500">No alerts right now.</p>}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
        >
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Pending Laundry Approvals</h2>
          <div className="space-y-3">
            {pendingApprovals.length === 0 ? (
              <p className="text-sm text-neutral-500">No pending laundry approvals.</p>
            ) : (
              pendingApprovals.slice(0, 4).map((basket) => (
                <Link key={basket.id} to="/laundry-staff/board" className="block rounded-xl border border-yellow-100 bg-yellow-50 p-3 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-yellow-900">#{basket.basketCode}</p>
                    <p className="text-xs font-mono text-yellow-700">{basket.studentId}</p>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">{basket.receivedAt}</p>
                </Link>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
        >
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/admin/students" className="group p-4 rounded-2xl bg-neutral-50 border border-neutral-200 hover:bg-indigo-50 hover:border-indigo-200 hover:shadow-md transition-all text-left active:translate-y-px">
              <Users className="w-6 h-6 text-indigo-600 mb-2" />
              <p className="font-medium text-neutral-900">Add Student</p>
              <p className="text-xs text-neutral-500 mt-1">Register a new student</p>
            </Link>
            <Link to="/admin/meals" className="group p-4 rounded-2xl bg-neutral-50 border border-neutral-200 hover:bg-green-50 hover:border-green-200 hover:shadow-md transition-all text-left active:translate-y-px">
              <UtensilsCrossed className="w-6 h-6 text-indigo-600 mb-2" />
              <p className="font-medium text-neutral-900">Update Menu</p>
              <p className="text-xs text-neutral-500 mt-1">Change today's meals</p>
            </Link>
            <Link to="/admin/analytics" className="group p-4 rounded-2xl bg-neutral-50 border border-neutral-200 hover:bg-blue-50 hover:border-blue-200 hover:shadow-md transition-all text-left active:translate-y-px">
              <Shirt className="w-6 h-6 text-indigo-600 mb-2" />
              <p className="font-medium text-neutral-900">Laundry Schedule</p>
              <p className="text-xs text-neutral-500 mt-1">Manage drop-off times</p>
            </Link>
            <Link to="/admin/audit" className="group p-4 rounded-2xl bg-neutral-50 border border-neutral-200 hover:bg-purple-50 hover:border-purple-200 hover:shadow-md transition-all text-left active:translate-y-px">
              <TrendingUp className="w-6 h-6 text-indigo-600 mb-2" />
              <p className="font-medium text-neutral-900">Generate Report</p>
              <p className="text-xs text-neutral-500 mt-1">Export system data</p>
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          Recent Activity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {audits.slice(0, 6).map((audit) => (
            <div key={audit.id} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
              <p className="text-sm font-semibold text-neutral-900 capitalize">{audit.actor} {audit.action}</p>
              <p className="text-xs text-neutral-500 mt-1">{audit.entityType}{audit.entityRef ? `: ${audit.entityRef}` : ""}</p>
              <p className="text-xs text-neutral-400 mt-2">{audit.createdAt}</p>
            </div>
          ))}
          {audits.length === 0 && <p className="text-sm text-neutral-500">No activity recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
