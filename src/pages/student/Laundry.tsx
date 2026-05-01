import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Shirt, CheckCircle2, AlertCircle } from "lucide-react";
import { api, type LaundryBasket } from "@/src/lib/api";

export default function Laundry() {
  const [records, setRecords] = useState<LaundryBasket[]>([]);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("hamsUser") || "{}");
    const studentId = storedUser.studentId || "240011223";
    api.studentOverview(studentId).then((overview) => setRecords(overview.laundry)).catch(console.error);
  }, []);

  const current = records[0];
  const pastRecords = records.slice(1);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Laundry History</h1>
      </div>

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
              <p className="font-medium text-neutral-900">{current?.receivedAt || "-"}</p>
            </div>
          </div>
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
                key={i}
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
                    <p className="text-sm text-neutral-500">{record.receivedAt}</p>
                  </div>
                </div>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${bg} ${color}`}>
                  {record.status}
                </span>
              </motion.div>
            )})}
          </div>
        </div>
      </div>
    </div>
  );
}
