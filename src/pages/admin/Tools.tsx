import { useState, type FormEvent } from "react";
import { Database, Settings, Upload } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { api } from "@/src/lib/api";
import { showToast } from "@/src/components/ui/toast";

export default function AdminTools() {
  const [csv, setCsv] = useState("");
  const [settings, setSettings] = useState(() => {
    const saved = JSON.parse(localStorage.getItem("hamsAdminSettings") || "{}");
    return {
      schoolName: saved.schoolName || "Nile University",
      systemName: saved.systemName || "HAMS",
      mealWindowNote: saved.mealWindowNote || "Meals require active status or override reason.",
      laundryRule: saved.laundryRule || "Laundry requests need approval before processing.",
      supportContact: saved.supportContact || "admin@nileuniversity.edu.ng",
    };
  });

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

  const saveSettings = (event: FormEvent) => {
    event.preventDefault();
    localStorage.setItem("hamsAdminSettings", JSON.stringify(settings));
    showToast("Admin settings saved on this device.");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Admin Tools</h1>
        <p className="text-sm text-neutral-500 mt-1">Import students, download backup, and tune system display settings.</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 space-y-4">
        <Button onClick={downloadBackup} variant="outline"><Database className="w-4 h-4" /> Download Database Backup</Button>
      </div>

      <form onSubmit={saveSettings} className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-neutral-900 flex items-center gap-2"><Settings className="w-4 h-4 text-indigo-600" /> App Settings</h2>
          <p className="text-sm text-neutral-500 mt-1">Quick settings for labels, support contact, and operating rules.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input value={settings.schoolName} onChange={(event) => setSettings({ ...settings, schoolName: event.target.value })} placeholder="School name" />
          <Input value={settings.systemName} onChange={(event) => setSettings({ ...settings, systemName: event.target.value })} placeholder="System name" />
          <Input value={settings.supportContact} onChange={(event) => setSettings({ ...settings, supportContact: event.target.value })} placeholder="Support contact" />
          <Input value={settings.mealWindowNote} onChange={(event) => setSettings({ ...settings, mealWindowNote: event.target.value })} placeholder="Meal rule" />
          <Input value={settings.laundryRule} onChange={(event) => setSettings({ ...settings, laundryRule: event.target.value })} placeholder="Laundry rule" className="sm:col-span-2" />
        </div>
        <Button><Settings className="w-4 h-4" /> Save Settings</Button>
      </form>

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
