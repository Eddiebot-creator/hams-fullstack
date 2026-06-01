import { useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { countOfflineActions } from "@/src/lib/offlineQueue";
import { syncOfflineQueue } from "@/src/lib/offlineSync";
import { showToast } from "@/src/components/ui/toast";

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const refreshPending = () => {
      countOfflineActions().then(setPendingCount).catch(() => setPendingCount(0));
    };
    const syncPending = async () => {
      refreshPending();
      if (!navigator.onLine) return;
      setIsSyncing(true);
      const result = await syncOfflineQueue().catch(() => ({ synced: 0, failed: 0 }));
      setIsSyncing(false);
      refreshPending();
      if (result.synced > 0) showToast(`${result.synced} offline action${result.synced === 1 ? "" : "s"} synced.`);
      if (result.failed > 0) showToast(`${result.failed} offline action${result.failed === 1 ? "" : "s"} still waiting to sync.`, "error");
    };
    const online = () => {
      setIsOnline(true);
      void syncPending();
    };
    const offline = () => setIsOnline(false);
    refreshPending();
    void syncPending();
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("hams-offline-queue-changed", refreshPending);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("hams-offline-queue-changed", refreshPending);
    };
  }, []);

  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  return (
    <div className={`fixed left-4 right-4 top-4 z-[95] mx-auto max-w-md rounded-2xl border px-4 py-3 shadow-lg flex items-center gap-3 ${isOnline ? "border-indigo-200 bg-indigo-50 text-indigo-900" : "border-yellow-200 bg-yellow-50 text-yellow-900"}`}>
      {isOnline ? <RefreshCw className={`w-5 h-5 ${isSyncing ? "animate-spin" : ""}`} /> : <WifiOff className="w-5 h-5" />}
      <p className="text-sm font-semibold">
        {isOnline
          ? `${pendingCount} saved action${pendingCount === 1 ? "" : "s"} waiting to sync.`
          : `Connection lost. ${pendingCount > 0 ? `${pendingCount} action${pendingCount === 1 ? "" : "s"} saved for later.` : "Showing saved data where possible."}`}
      </p>
    </div>
  );
}
