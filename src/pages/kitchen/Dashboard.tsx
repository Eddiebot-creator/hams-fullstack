import { motion } from "motion/react";
import { UtensilsCrossed, Users, CheckCircle2, Clock } from "lucide-react";

export default function KitchenDashboard() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Kitchen Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Current Meal</h2>
            <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">Active</span>
          </div>
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
              <UtensilsCrossed className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="font-bold text-xl text-neutral-900">Breakfast</p>
              <p className="text-sm text-neutral-500">07:00 AM - 09:00 AM</p>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-neutral-700">Served</span>
              <span className="font-bold text-indigo-600">342 / 500</span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-2.5">
              <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: '68%' }}></div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Today's Stats</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <Users className="w-5 h-5 text-indigo-500 mr-3" />
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Total Expected</p>
                <p className="font-bold text-lg text-neutral-900">1,500</p>
              </div>
            </div>
            <div className="flex items-center p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Total Served</p>
                <p className="font-bold text-lg text-neutral-900">842</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Upcoming</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center p-3 rounded-xl bg-neutral-50 border border-neutral-100 opacity-75">
              <Clock className="w-5 h-5 text-neutral-400 mr-3" />
              <div>
                <p className="font-medium text-neutral-900">Dinner</p>
                <p className="text-xs text-neutral-500">05:30 PM - 07:30 PM</p>
              </div>
            </div>
            <div className="flex items-center p-3 rounded-xl bg-neutral-50 border border-neutral-100 opacity-50">
              <Clock className="w-5 h-5 text-neutral-400 mr-3" />
              <div>
                <p className="font-medium text-neutral-900">Breakfast (Tomorrow)</p>
                <p className="text-xs text-neutral-500">07:00 AM - 09:00 AM</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden mt-8">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-lg font-semibold text-neutral-900">Recent Scans</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Meal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {[
                { time: '07:20 AM', id: '241156894', meal: 'Breakfast', status: 'Success' },
                { time: '07:45 AM', id: '20221453', meal: 'Breakfast', status: 'Success' },
                { time: '08:42 AM', id: '20231452', meal: 'Breakfast', status: 'Denied (Already Scanned)' },
                { time: '08:45 AM', id: '20237775', meal: 'Breakfast', status: 'Success' },
              ].map((scan, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{scan.time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 font-mono">{scan.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{scan.meal}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      scan.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {scan.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
