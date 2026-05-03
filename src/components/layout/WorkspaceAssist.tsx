import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bell,
  CheckSquare,
  Clock3,
  FileText,
  Home,
  Package,
  Pin,
  PinOff,
  Plus,
  QrCode,
  ScanLine,
  Search,
  ShieldCheck,
  Shirt,
  Sparkles,
  User,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import type { Role } from "@/src/lib/api";

type AssistAction = {
  label: string;
  path: string;
  icon: typeof Home;
  tone: string;
};

const actions: Record<Role, AssistAction[]> = {
  student: [
    { label: "Show QR", path: "/student/qr", icon: QrCode, tone: "text-indigo-700 bg-indigo-50 border-indigo-100" },
    { label: "Request Laundry", path: "/student/laundry", icon: Shirt, tone: "text-sky-700 bg-sky-50 border-sky-100" },
    { label: "Profile", path: "/student/profile", icon: User, tone: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  ],
  kitchen: [
    { label: "Open Scanner", path: "/kitchen/scanner", icon: ScanLine, tone: "text-indigo-700 bg-indigo-50 border-indigo-100" },
    { label: "Meal Desk", path: "/kitchen", icon: UtensilsCrossed, tone: "text-emerald-700 bg-emerald-50 border-emerald-100" },
    { label: "Updates", path: "/kitchen/notifications", icon: Bell, tone: "text-amber-700 bg-amber-50 border-amber-100" },
  ],
  laundry: [
    { label: "Add Basket", path: "/laundry-staff/baskets", icon: Package, tone: "text-indigo-700 bg-indigo-50 border-indigo-100" },
    { label: "Laundry Board", path: "/laundry-staff/board", icon: CheckSquare, tone: "text-emerald-700 bg-emerald-50 border-emerald-100" },
    { label: "Report Issue", path: "/laundry-staff/issues", icon: FileText, tone: "text-rose-700 bg-rose-50 border-rose-100" },
  ],
  admin: [
    { label: "Add Student", path: "/admin/students", icon: Users, tone: "text-indigo-700 bg-indigo-50 border-indigo-100" },
    { label: "Approvals", path: "/admin/approvals", icon: CheckSquare, tone: "text-emerald-700 bg-emerald-50 border-emerald-100" },
    { label: "Analytics", path: "/admin/analytics", icon: BarChart3, tone: "text-sky-700 bg-sky-50 border-sky-100" },
    { label: "Audit", path: "/admin/audit", icon: ShieldCheck, tone: "text-amber-700 bg-amber-50 border-amber-100" },
  ],
};

const labels: Record<string, string> = {
  "/student": "Student Dashboard",
  "/student/qr": "My QR",
  "/student/laundry": "Laundry Requests",
  "/student/profile": "Profile",
  "/student/notifications": "Updates",
  "/kitchen": "Kitchen Dashboard",
  "/kitchen/scanner": "Meal Scanner",
  "/kitchen/account": "Account",
  "/kitchen/notifications": "Updates",
  "/laundry-staff": "Laundry Dashboard",
  "/laundry-staff/baskets": "Baskets",
  "/laundry-staff/board": "Board",
  "/laundry-staff/reports": "Reports",
  "/laundry-staff/issues": "Issues",
  "/laundry-staff/scanner": "Scanner",
  "/laundry-staff/account": "Account",
  "/laundry-staff/notifications": "Updates",
  "/admin": "Admin Dashboard",
  "/admin/meals": "Meals",
  "/admin/students": "Students",
  "/admin/staff": "Staff",
  "/admin/analytics": "Analytics",
  "/admin/approvals": "Approvals",
  "/admin/audit": "Audit",
  "/admin/tools": "Tools",
  "/admin/account": "Account",
  "/admin/notifications": "Updates",
};

type SavedPage = {
  path: string;
  label: string;
};

function readPages(key: string): SavedPage[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((item) => item?.path && item?.label).slice(0, 5) : [];
  } catch {
    return [];
  }
}

export default function WorkspaceAssist({ role }: { role: Role }) {
  const location = useLocation();
  const storagePrefix = `hamsWorkspace:${role}`;
  const pinnedKey = `${storagePrefix}:pinned`;
  const recentKey = `${storagePrefix}:recent`;
  const [pinned, setPinned] = useState<SavedPage[]>(() => readPages(pinnedKey));
  const [recent, setRecent] = useState<SavedPage[]>(() => readPages(recentKey));
  const currentLabel = labels[location.pathname] ?? "Workspace";

  useEffect(() => {
    const page = { path: location.pathname, label: currentLabel };
    const nextRecent = [page, ...readPages(recentKey).filter((item) => item.path !== page.path)].slice(0, 5);
    localStorage.setItem(recentKey, JSON.stringify(nextRecent));
    setRecent(nextRecent);
  }, [currentLabel, location.pathname, recentKey]);

  const isPinned = pinned.some((item) => item.path === location.pathname);

  const togglePinned = () => {
    const page = { path: location.pathname, label: currentLabel };
    const nextPinned = isPinned
      ? pinned.filter((item) => item.path !== page.path)
      : [page, ...pinned].slice(0, 5);
    localStorage.setItem(pinnedKey, JSON.stringify(nextPinned));
    setPinned(nextPinned);
  };

  const visibleLinks = useMemo(() => {
    const merged = [...pinned, ...recent].filter((item, index, list) => list.findIndex((candidate) => candidate.path === item.path) === index);
    return merged.filter((item) => item.path !== location.pathname).slice(0, 4);
  }, [location.pathname, pinned, recent]);

  return (
    <section className="mx-4 mt-4 rounded-3xl border border-neutral-200 bg-white/90 p-4 shadow-sm backdrop-blur sm:mx-6 lg:mx-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Workspace assistant</p>
              <h2 className="text-base font-bold text-neutral-950 sm:text-lg">{currentLabel}</h2>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}>
            <Search className="h-4 w-4" />
            Search
          </Button>
          <Button type="button" variant={isPinned ? "secondary" : "outline"} size="sm" onClick={togglePinned}>
            {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            {isPinned ? "Unpin" : "Pin page"}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {actions[role].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.path}
                to={action.path}
                className={cn("inline-flex min-w-max items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md", action.tone)}
              >
                <Icon className="h-4 w-4" />
                {action.label}
              </Link>
            );
          })}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 lg:justify-end">
          {visibleLinks.length === 0 ? (
            <span className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-sm font-semibold text-neutral-500">
              <Clock3 className="h-4 w-4" />
              Recent pages appear here
            </span>
          ) : (
            visibleLinks.map((page) => (
              <Link
                key={page.path}
                to={page.path}
                className="inline-flex min-w-max items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-sm font-semibold text-neutral-700 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <Clock3 className="h-4 w-4" />
                {page.label}
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
