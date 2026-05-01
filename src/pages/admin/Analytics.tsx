import { motion } from "motion/react";
import { BarChart3, PieChart, TrendingUp, Download } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export default function AdminAnalytics() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">System Analytics</h1>
        <Button variant="outline" className="flex items-center">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Meal Attendance Trends</h2>
            <BarChart3 className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="h-64 flex items-end justify-between space-x-2">
            {[65, 78, 82, 70, 85, 90, 75].map((height, i) => (
              <div key={i} className="w-full flex flex-col items-center">
                <div 
                  className="w-full bg-indigo-200 rounded-t-md hover:bg-indigo-300 transition-colors relative group"
                  style={{ height: `${height}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {height * 10}
                  </div>
                </div>
                <span className="text-xs text-neutral-500 mt-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Laundry Machine Utilization</h2>
            <PieChart className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="relative w-48 h-48 rounded-full border-[16px] border-indigo-100 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[16px] border-indigo-600" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0)', transform: 'rotate(45deg)' }}></div>
              <div className="text-center">
                <p className="text-3xl font-bold text-neutral-900">78%</p>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Average</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Key Performance Indicators</h2>
            <TrendingUp className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
              <p className="text-sm font-medium text-neutral-500 mb-1">Average Meal Scan Time</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold text-neutral-900">1.2s</p>
                <p className="ml-2 text-sm font-medium text-green-600">-0.3s</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
              <p className="text-sm font-medium text-neutral-500 mb-1">Laundry Turnaround Time</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold text-neutral-900">22.5h</p>
                <p className="ml-2 text-sm font-medium text-green-600">-1.5h</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
              <p className="text-sm font-medium text-neutral-500 mb-1">Active Students</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold text-neutral-900">98.5%</p>
                <p className="ml-2 text-sm font-medium text-green-600">+0.5%</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
