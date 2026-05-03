import { useEffect, useState, type FormEvent } from "react";
import { Activity, Database, RefreshCw, Settings, Upload } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { api, type DatabaseHealth, type DatabaseSummary } from "@/src/lib/api";
import { showToast } from "@/src/components/ui/toast";

export default function AdminTools() {
  const [csv, setCsv] = useState("");
  const [health, setHealth] = useState<DatabaseHealth | null>(null);
  const [summary, setSummary] = useState<DatabaseSummary>({});
  const [responseMs, setResponseMs] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
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

  const loadHealth = async () => {
    setIsChecking(true);
    const started = performance.now();
    try {
      const [healthResult, summaryResult] = await Promise.all([
        api.databaseHealth(),
        api.databaseSummary(),
      ]);
      setHealth(healthResult);
      setSummary(summaryResult);
      setResponseMs(Math.round(performance.now() - started));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to check system health.", "error");
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

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
        <p className="text-sm text-neutral-500 mt-1">System health, backups, imports, and app settings.</p>
      </div>

      <section className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              System Health
            </h2>
            <p className="text-sm text-neutral-500 mt-1">Quick view of backend, MySQL, and record volume.</p>
          </div>
          <Button type="button" variant="outline" onClick={loadHealth} disabled={isChecking}>
            <RefreshCw className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <HealthCard label="Backend" value={health?.ok ? "Online" : "Check"} tone={health?.ok ? "text-green-700 bg-green-50 border-green-100" : "text-yellow-700 bg-yellow-50 border-yellow-100"} />
          <HealthCard label="Database" value={(health?.database || "mysql").toUpperCase()} tone="text-indigo-700 bg-indigo-50 border-indigo-100" />
          <HealthCard label="Response" value={responseMs === null ? "..." : `${responseMs}ms`} tone="text-sky-700 bg-sky-50 border-sky-100" />
          <HealthCard label="Users" value={String(health?.users ?? summary.users ?? "...")} tone="text-emerald-700 bg-emerald-50 border-emerald-100" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(summary).slice(0, 8).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
              <p className="truncate text-xs font-bold uppercase tracking-wide text-neutral-500">{key.replace(/_/g, " ")}</p>
              <p className="mt-1 text-lg font-black text-neutral-950">{value}</p>
            </div>
          ))}
        </div>
        <Button onClick={downloadBackup} variant="outline"><Database className="w-4 h-4" /> Download Database Backup</Button>
      </section>

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

function HealthCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 truncate text-xl font-black">{value}</p>
    </div>
  );
}
