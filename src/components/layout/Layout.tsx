import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { 
  Home, QrCode, Shirt, User, 
  ScanLine, UtensilsCrossed, 
  Package, FileText, 
  Users, BarChart3, LogOut, Bell, ShieldCheck, Columns3, Search, AlertTriangle, Database, CheckSquare, Plus, Settings
} from "lucide-react";
import { useEffect, useState } from "react";
import { api, type Notification } from "@/src/lib/api";
import GlobalSearch from "./GlobalSearch";
import RoleTips from "./RoleTips";
import InstallPrompt from "./InstallPrompt";

const navConfig = {
  student: [
    { name: "Dashboard", path: "/student", icon: Home },
    { name: "My QR", path: "/student/qr", icon: QrCode },
    { name: "Laundry", path: "/student/laundry", icon: Shirt },
    { name: "Updates", path: "/student/notifications", icon: Bell },
    { name: "Profile", path: "/student/profile", icon: User },
    { name: "Settings", path: "/student/account", icon: Settings },
  ],
  kitchen: [
    { name: "Dashboard", path: "/kitchen", icon: Home },
    { name: "Scanner", path: "/kitchen/scanner", icon: ScanLine },
    { name: "Updates", path: "/kitchen/notifications", icon: Bell },
    { name: "Settings", path: "/kitchen/account", icon: Settings },
  ],
  laundry: [
    { name: "Dashboard", path: "/laundry-staff", icon: Home },
    { name: "Baskets", path: "/laundry-staff/baskets", icon: Package },
    { name: "Board", path: "/laundry-staff/board", icon: Columns3 },
    { name: "Reports", path: "/laundry-staff/reports", icon: FileText },
    { name: "Issues", path: "/laundry-staff/issues", icon: AlertTriangle },
    { name: "Scanner", path: "/laundry-staff/scanner", icon: ScanLine },
    { name: "Updates", path: "/laundry-staff/notifications", icon: Bell },
    { name: "Settings", path: "/laundry-staff/account", icon: Settings },
  ],
  admin: [
    { name: "Dashboard", path: "/admin", icon: Home },
    { name: "Meals", path: "/admin/meals", icon: UtensilsCrossed },
    { name: "Students", path: "/admin/students", icon: Users },
    { name: "Staff", path: "/admin/staff", icon: User },
    { name: "Analytics", path: "/admin/analytics", icon: BarChart3 },
    { name: "Approvals", path: "/admin/approvals", icon: CheckSquare },
    { name: "Audit", path: "/admin/audit", icon: ShieldCheck },
    { name: "Tools", path: "/admin/tools", icon: Database },
    { name: "Updates", path: "/admin/notifications", icon: Bell },
    { name: "Settings", path: "/admin/account", icon: Settings },
  ]
};

export default function Layout({ role }: { role: keyof typeof navConfig }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = navConfig[role];
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((item) => item.isRead === 0).length;

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("hamsUser") || "{}");
    const loadNotifications = () => api.notifications(role, user.studentId).then(setNotifications).catch(() => setNotifications([]));
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(timer);
  }, [role]);

  const signOut = () => {
    localStorage.removeItem("hamsUser");
    localStorage.removeItem("hamsToken");
    navigate("/login");
  };

  const quickAction = {
    student: { label: "QR", path: "/student/qr", icon: QrCode },
    kitchen: { label: "Scan", path: "/kitchen/scanner", icon: ScanLine },
    laundry: { label: "Basket", path: "/laundry-staff/baskets", icon: Package },
    admin: { label: "Student", path: "/admin/students", icon: Plus },
  }[role];
  const QuickIcon = quickAction.icon;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-neutral-200 flex-col">
        <div className="h-16 flex items-center px-6 border-b border-neutral-200">

          <div className="flex-shrink-0 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-neutral-100 overflow-hidden">
        <img 
          src="/logo.jpg" 
          alt="Nile University Logo" 
          className="w-full h-full object-contain p-1"
          />
          </div>
          <span className="ml-3 font-bold text-xl text-neutral-900 tracking-tight">HAMS</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          <div className="mb-4">
            <GlobalSearch />
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === `/${role}` || item.path === '/laundry-staff'}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 hover:translate-x-0.5"
                }`
              }
            >
              <item.icon className={`mr-3 h-5 w-5 ${
                location.pathname === item.path || (item.path === `/${role}` && location.pathname === `/${role}`) ? 'text-indigo-600' : 'text-neutral-400'
              }`} />
              {item.name}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-neutral-200">
          <button 
            onClick={signOut}
            className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <LogOut className="mr-3 h-5 w-5 text-red-500" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden pb-[5.25rem] md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 h-14 bg-white/95 backdrop-blur border-b border-neutral-200 flex items-center justify-between px-4">
          <div className="flex items-center">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm border border-neutral-100 overflow-hidden">
              <img
                src="/logo.jpg"
                alt="Nile University Logo"
                className="w-full h-full object-contain p-1"
              />
            </div>
            <span className="ml-2 font-bold text-lg text-neutral-900">HAMS</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))} className="text-neutral-500 rounded-lg p-1 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <Search className="h-5 w-5" />
            </button>
            <button onClick={() => navigate(role === "laundry" ? "/laundry-staff/notifications" : `/${role}/notifications`)} className="relative text-neutral-500 rounded-lg p-1 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-600" />}
            </button>
          <button onClick={signOut} className="text-neutral-500 hover:text-red-600 rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
            <LogOut className="h-5 w-5" />
          </button>
          </div>
        </header>

        <InstallPrompt />
        <RoleTips role={role} />
        <div
          key={location.pathname}
          className="flex-1 overflow-auto page-enter mobile-page"
        >
          <Outlet />
        </div>
      </main>

      <button
        type="button"
        onClick={() => navigate(quickAction.path)}
        className="md:hidden fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 inline-flex h-14 min-w-14 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-xl shadow-indigo-600/30"
        aria-label={quickAction.label}
      >
        <QuickIcon className="h-5 w-5" />
        <span>{quickAction.label}</span>
      </button>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur border-t border-neutral-200 flex items-center h-[calc(4rem+env(safe-area-inset-bottom))] px-2 pb-[env(safe-area-inset-bottom)] z-50 overflow-x-auto mobile-bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === `/${role}` || item.path === '/laundry-staff'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-20 h-14 space-y-1 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isActive ? "text-indigo-600 bg-indigo-50" : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
