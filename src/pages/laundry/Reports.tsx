import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Download, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { api, type LaundryReports as LaundryReportsData } from "@/src/lib/api";
import { CardSkeleton } from "@/src/components/ui/skeleton";
import { SelectMenu, type SelectMenuOption } from "@/src/components/ui/select-menu";

export default function LaundryReports() {
  const [data, setData] = useState<LaundryReportsData | null>(null);
  const [periodFilter, setPeriodFilter] = useState("All");

  useEffect(() => {
    api.laundryReports().then(setData).catch(console.error);
  }, []);

  const filteredReports = (data?.reports ?? []).filter((report) => periodFilter === "All" || report.reportPeriod === periodFilter);
  const weeklyReport = filteredReports[0] ?? data?.reports[0];
  const periodOptions: SelectMenuOption[] = [
    { value: "All", label: "All periods", description: "View every report" },
    ...(data?.reports ?? []).map((report) => ({
      value: report.reportPeriod,
      label: report.reportPeriod,
      description: `${report.totalBasketsProcessed} baskets, ${report.reportedIssues} issues`,
    })),
  ];

  const exportCsv = () => {
    if (!data) return;

    const rows = [
      ["Report Period", "Total Baskets Processed", "Average Turnaround", "Reported Issues"],
      ...data.reports.map((report) => [
        report.reportPeriod,
        report.totalBasketsProcessed,
        report.averageTurnaround,
        report.reportedIssues,
      ]),
      [],
      ["Machine", "Type", "Usage Percent", "Status"],
      ...data.machines.map((machine) => [
        machine.name,
        machine.machineType,
        machine.usagePercent,
        machine.status,
      ]),
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "laundry-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Reports</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <SelectMenu value={periodFilter} onChange={setPeriodFilter} options={periodOptions} label="Report period" />
          <Button variant="outline" onClick={() => window.print()} disabled={!data}>Print</Button>
          <Button variant="outline" className="flex items-center" onClick={exportCsv} disabled={!data}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {!data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
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
              <span className="font-bold text-neutral-900">{weeklyReport?.totalBasketsProcessed ?? "..."}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
              <span className="text-sm font-medium text-neutral-600">Average Turnaround Time</span>
              <span className="font-bold text-neutral-900">{weeklyReport?.averageTurnaround ?? "..."}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
              <span className="text-sm font-medium text-neutral-600">Reported Issues</span>
              <span className="font-bold text-red-600">{weeklyReport?.reportedIssues ?? "..."}</span>
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
            {(data?.machines ?? []).map((machine) => (
              <div key={machine.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-neutral-700">{machine.name}</span>
                    <span className="text-sm text-neutral-500">{machine.status}</span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${machine.status === 'Maintenance' ? 'bg-red-500' : 'bg-indigo-600'}`} 
                      style={{ width: `${machine.usagePercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            {data?.machines.length === 0 && <p className="text-sm text-neutral-500">No machine data available.</p>}
          </div>
        </motion.div>
      </div>
      )}
    </div>
  );
}
