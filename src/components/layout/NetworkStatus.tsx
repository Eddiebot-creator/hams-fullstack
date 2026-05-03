import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed left-4 right-4 top-4 z-[95] mx-auto max-w-md rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 shadow-lg text-yellow-900 flex items-center gap-3">
      <WifiOff className="w-5 h-5" />
      <p className="text-sm font-semibold">Connection lost. Showing saved data where possible.</p>
    </div>
  );
}
