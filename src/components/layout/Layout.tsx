import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { 
  Home, QrCode, Shirt, User, 
  ScanLine, UtensilsCrossed, 
  Package, FileText, 
  Users, BarChart3, LogOut
} from "lucide-react";

const navConfig = {
  student: [
    { name: "Dashboard", path: "/student", icon: Home },
    { name: "My QR", path: "/student/qr", icon: QrCode },
    { name: "Laundry", path: "/student/laundry", icon: Shirt },
    { name: "Profile", path: "/student/profile", icon: User },
  ],
  kitchen: [
    { name: "Dashboard", path: "/kitchen", icon: Home },
    { name: "Scanner", path: "/kitchen/scanner", icon: ScanLine },
  ],
  laundry: [
    { name: "Dashboard", path: "/laundry-staff", icon: Home },
    { name: "Baskets", path: "/laundry-staff/baskets", icon: Package },
    { name: "Reports", path: "/laundry-staff/reports", icon: FileText },
    { name: "Scanner", path: "/laundry-staff/scanner", icon: ScanLine },
  ],
  admin: [
    { name: "Dashboard", path: "/admin", icon: Home },
    { name: "Meals", path: "/admin/meals", icon: UtensilsCrossed },
    { name: "Students", path: "/admin/students", icon: Users },
    { name: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  ]
};

export default function Layout({ role }: { role: keyof typeof navConfig }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = navConfig[role];

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
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === `/${role}` || item.path === '/laundry-staff'}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
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
            onClick={() => navigate('/login')}
            className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-red-500" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">MA</span>
            </div>
            <span className="ml-2 font-bold text-lg text-neutral-900">MyAds</span>
          </div>
          <button onClick={() => navigate('/login')} className="text-neutral-500 hover:text-red-600">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-neutral-200 flex justify-around items-center h-16 px-2 z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === `/${role}` || item.path === '/laundry-staff'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? "text-indigo-600" : "text-neutral-500 hover:text-neutral-900"
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
