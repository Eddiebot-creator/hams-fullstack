import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { BarChart3, PieChart, TrendingUp, Download } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { api, type AdminAnalytics as AdminAnalyticsData } from "@/src/lib/api";

export default function AdminAnalytics() {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);

  useEffect(() => {
    api.adminAnalytics().then(setData).catch(console.error);
  }, []);

  const maxAttendance = Math.max(...(data?.mealTrends.map((item) => item.attendanceCount) ?? [1]));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">System Analytics</h1>
        <a href={api.exportUrl("audits")} download>
          <Button variant="outline" className="flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export Audit CSV
          </Button>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Meal Attendance Trends</h2>
            <BarChart3 className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="h-64 flex items-end justify-between space-x-2">
            {(data?.mealTrends ?? []).map((item) => {
              const height = Math.max(8, Math.round((item.attendanceCount / maxAttendance) * 100));
              return (
                <div key={item.id} className="w-full flex flex-col items-center">
                  <div className="w-full bg-indigo-200 rounded-t-md hover:bg-indigo-300 transition-colors relative group" style={{ height: `${height}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.attendanceCount}
                    </div>
                  </div>
                  <span className="text-xs text-neutral-500 mt-2">{item.dayLabel}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Laundry Machine Utilization</h2>
            <PieChart className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="relative w-48 h-48 rounded-full border-[16px] border-indigo-100 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[16px] border-indigo-600" style={{ clipPath: `polygon(50% 50%, 50% 0, 100% 0, 100% ${data?.machineUtilizationAverage ?? 0}%, 50% 50%)` }}></div>
              <div className="text-center">
                <p className="text-3xl font-bold text-neutral-900">{data?.machineUtilizationAverage ?? "..."}%</p>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Average</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">Key Performance Indicators</h2>
            <TrendingUp className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(data?.kpis ?? []).map((kpi) => (
              <div key={kpi.id} className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                <p className="text-sm font-medium text-neutral-500 mb-1">{kpi.name}</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-neutral-900">{kpi.value}</p>
                  <p className="ml-2 text-sm font-medium text-green-600">{kpi.delta}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
