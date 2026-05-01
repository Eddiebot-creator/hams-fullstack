import { motion } from "motion/react";
import { Download, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export default function LaundryReports() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Reports</h1>
        <Button variant="outline" className="flex items-center">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Weekly Summary</h2>
            <CalendarIcon className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
              <span className="text-sm font-medium text-neutral-600">Total Baskets Processed</span>
              <span className="font-bold text-neutral-900">342</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
              <span className="text-sm font-medium text-neutral-600">Average Turnaround Time</span>
              <span className="font-bold text-neutral-900">24h 15m</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
              <span className="text-sm font-medium text-neutral-600">Reported Issues</span>
              <span className="font-bold text-red-600">5</span>
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
            <h2 className="text-lg font-semibold text-neutral-900">Machine Usage</h2>
          </div>
          <div className="space-y-4">
            {[
              { name: 'Washer 1', usage: 85, status: 'Active' },
              { name: 'Washer 2', usage: 90, status: 'Active' },
              { name: 'Dryer 1', usage: 75, status: 'Active' },
              { name: 'Dryer 2', usage: 0, status: 'Maintenance' },
            ].map((machine, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-neutral-700">{machine.name}</span>
                    <span className="text-sm text-neutral-500">{machine.status}</span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${machine.status === 'Maintenance' ? 'bg-red-500' : 'bg-indigo-600'}`} 
                      style={{ width: `${machine.usage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
