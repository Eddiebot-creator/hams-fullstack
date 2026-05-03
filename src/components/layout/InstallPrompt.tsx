import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const dismissKey = "hamsInstallPromptDismissed";

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (localStorage.getItem(dismissKey) === "1") return;
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
      localStorage.setItem(dismissKey, "1");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || !installEvent) return null;

  const install = async () => {
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(dismissKey, "1");
      setVisible(false);
      setInstallEvent(null);
    }
  };

  const dismiss = () => {
    localStorage.setItem(dismissKey, "1");
    setVisible(false);
  };

  return (
    <div className="fixed left-3 right-3 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] z-[80] mx-auto max-w-md rounded-2xl border border-indigo-100 bg-white/95 p-3 shadow-xl backdrop-blur md:bottom-5 md:left-auto md:right-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-neutral-950">Install HAMS</p>
          <p className="text-xs font-medium text-neutral-500">Open faster from your phone or laptop home screen.</p>
        </div>
        <Button type="button" size="sm" onClick={install}>Install</Button>
        <button type="button" onClick={dismiss} className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100" aria-label="Dismiss install prompt">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
