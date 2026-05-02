import { useEffect, useMemo, useState } from "react";
import { Download, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { api, type AuditLog } from "@/src/lib/api";

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.auditLogs().then(setLogs).catch(console.error);
  }, []);

  const filteredLogs = useMemo(() => {
    const query = search.toLowerCase();
    return logs.filter((log) =>
      [log.actor, log.action, log.entityType, log.entityRef || "", log.createdAt]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [logs, search]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Audit Logs</h1>
          <p className="text-sm text-neutral-500 mt-1">Track important student, staff, meal, and laundry actions.</p>
        </div>
        <a href={api.exportUrl("audits")} download>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </a>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="p-6 border-b border-neutral-100">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <Input placeholder="Search actor, action, record, or date..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10 bg-neutral-50 border-neutral-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 rounded-lg w-full" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Record</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 capitalize">{log.actor}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{log.action}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-500" />
                      {log.entityType}{log.entityRef ? `: ${log.entityRef}` : ""}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{log.createdAt}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-neutral-500">No audit records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
