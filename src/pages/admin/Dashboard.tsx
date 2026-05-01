import { motion } from "motion/react";
import { Users, UtensilsCrossed, Shirt, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Students', value: '1,240', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
          { title: 'Meals Served Today', value: '842', icon: UtensilsCrossed, color: 'text-green-600', bg: 'bg-green-100' },
          { title: 'Laundry Baskets', value: '47', icon: Shirt, color: 'text-indigo-600', bg: 'bg-indigo-100' },
          { title: 'System Uptime', value: '99.9%', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
        ].map((stat, i) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
        >
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Recent System Alerts</h2>
          <div className="space-y-4">
            {[
              { type: 'warning', message: 'High load on Kitchen Scanner 2', time: '10 mins ago' },
              { type: 'info', message: 'Database backup completed successfully', time: '1 hour ago' },
              { type: 'error', message: 'Laundry Machine 4 reported error code E-02', time: '2 hours ago' },
            ].map((alert, i) => (
              <div key={i} className={`p-4 rounded-xl border ${
                alert.type === 'warning' ? 'bg-yellow-50 border-yellow-100 text-yellow-800' :
                alert.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
                'bg-blue-50 border-blue-100 text-blue-800'
              }`}>
                <div className="flex justify-between">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs opacity-70">{alert.time}</p>
                </div>
              </div>
            ))}
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
            <button className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-left">
              <Users className="w-6 h-6 text-indigo-600 mb-2" />
              <p className="font-medium text-neutral-900">Add Student</p>
              <p className="text-xs text-neutral-500 mt-1">Register a new student</p>
            </button>
            <button className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-left">
              <UtensilsCrossed className="w-6 h-6 text-indigo-600 mb-2" />
              <p className="font-medium text-neutral-900">Update Menu</p>
              <p className="text-xs text-neutral-500 mt-1">Change today's meals</p>
            </button>
            <button className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-left">
              <Shirt className="w-6 h-6 text-indigo-600 mb-2" />
              <p className="font-medium text-neutral-900">Laundry Schedule</p>
              <p className="text-xs text-neutral-500 mt-1">Manage drop-off times</p>
            </button>
            <button className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-left">
              <TrendingUp className="w-6 h-6 text-indigo-600 mb-2" />
              <p className="font-medium text-neutral-900">Generate Report</p>
              <p className="text-xs text-neutral-500 mt-1">Export system data</p>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
