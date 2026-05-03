import { useState, type FormEvent } from "react";
import { Database, Upload } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { api } from "@/src/lib/api";
import { showToast } from "@/src/components/ui/toast";

export default function AdminTools() {
  const [csv, setCsv] = useState("");

  const importStudents = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const result = await api.importStudents({ csv });
      showToast(result.message);
      setCsv("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to import students.", "error");
    }
  };

  const downloadBackup = async () => {
    const token = localStorage.getItem("hamsToken");
    const response = await fetch(api.backupUrl(), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "hams-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Admin Tools</h1>
        <p className="text-sm text-neutral-500 mt-1">Import students and download a full database backup.</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 space-y-4">
        <Button onClick={downloadBackup} variant="outline"><Database className="w-4 h-4" /> Download Database Backup</Button>
      </div>

      <form onSubmit={importStudents} className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-neutral-900">Bulk Import Students</h2>
          <p className="text-sm text-neutral-500 mt-1">CSV headers: name,email,studentId,hostel,room,course,level,phone,status</p>
        </div>
        <textarea value={csv} onChange={(event) => setCsv(event.target.value)} className="w-full min-h-48 rounded-xl border border-neutral-200 p-3 text-sm font-mono" placeholder="Paste CSV here..." />
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white"><Upload className="w-4 h-4" /> Import Students</Button>
      </form>
    </div>
  );
}
