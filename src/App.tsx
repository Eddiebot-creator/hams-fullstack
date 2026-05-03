/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { ToastViewport } from "./components/ui/toast";
import NetworkStatus from "./components/layout/NetworkStatus";
import { CardSkeleton } from "./components/ui/skeleton";

const pageImports = {
  Login: () => import("./pages/Login"),
  ResetPassword: () => import("./pages/ResetPassword"),
  Account: () => import("./pages/Account"),
  Notifications: () => import("./pages/Notifications"),
  StudentDashboard: () => import("./pages/student/Dashboard"),
  StudentQR: () => import("./pages/student/QRCode"),
  StudentLaundry: () => import("./pages/student/Laundry"),
  StudentProfile: () => import("./pages/student/Profile"),
  KitchenDashboard: () => import("./pages/kitchen/Dashboard"),
  KitchenScanner: () => import("./pages/kitchen/Scanner"),
  LaundryDashboard: () => import("./pages/laundry/Dashboard"),
  LaundryBaskets: () => import("./pages/laundry/Baskets"),
  LaundryBoard: () => import("./pages/laundry/Board"),
  LaundryReports: () => import("./pages/laundry/Reports"),
  LaundryScanner: () => import("./pages/laundry/Scanner"),
  LaundryIssues: () => import("./pages/laundry/Issues"),
  AdminDashboard: () => import("./pages/admin/Dashboard"),
  AdminMeals: () => import("./pages/admin/Meals"),
  AdminStudents: () => import("./pages/admin/Students"),
  AdminAnalytics: () => import("./pages/admin/Analytics"),
  AdminStaff: () => import("./pages/admin/Staff"),
  AdminAudit: () => import("./pages/admin/Audit"),
  AdminUserHistory: () => import("./pages/admin/UserHistory"),
  AdminApprovals: () => import("./pages/admin/Approvals"),
  AdminTools: () => import("./pages/admin/Tools"),
};

const Login = lazy(pageImports.Login);
const ResetPassword = lazy(pageImports.ResetPassword);
const Account = lazy(pageImports.Account);
const Notifications = lazy(pageImports.Notifications);

const StudentDashboard = lazy(pageImports.StudentDashboard);
const StudentQR = lazy(pageImports.StudentQR);
const StudentLaundry = lazy(pageImports.StudentLaundry);
const StudentProfile = lazy(pageImports.StudentProfile);

const KitchenDashboard = lazy(pageImports.KitchenDashboard);
const KitchenScanner = lazy(pageImports.KitchenScanner);

const LaundryDashboard = lazy(pageImports.LaundryDashboard);
const LaundryBaskets = lazy(pageImports.LaundryBaskets);
const LaundryBoard = lazy(pageImports.LaundryBoard);
const LaundryReports = lazy(pageImports.LaundryReports);
const LaundryScanner = lazy(pageImports.LaundryScanner);
const LaundryIssues = lazy(pageImports.LaundryIssues);

const AdminDashboard = lazy(pageImports.AdminDashboard);
const AdminMeals = lazy(pageImports.AdminMeals);
const AdminStudents = lazy(pageImports.AdminStudents);
const AdminAnalytics = lazy(pageImports.AdminAnalytics);
const AdminStaff = lazy(pageImports.AdminStaff);
const AdminAudit = lazy(pageImports.AdminAudit);
const AdminUserHistory = lazy(pageImports.AdminUserHistory);
const AdminApprovals = lazy(pageImports.AdminApprovals);
const AdminTools = lazy(pageImports.AdminTools);

function PageLoader() {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-neutral-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="h-2 w-44 overflow-hidden rounded-full bg-indigo-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}

function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function ProtectedLayout({ role }: { role: "student" | "kitchen" | "laundry" | "admin" }) {
  const user = JSON.parse(localStorage.getItem("hamsUser") || "{}");
  const token = localStorage.getItem("hamsToken");
  return token && user.role === role ? <Layout role={role} /> : <Navigate to="/login" replace />;
}

export default function App() {
  useEffect(() => {
    const preload = () => {
      Object.values(pageImports).forEach((loadPage) => {
        loadPage().catch(() => undefined);
      });
    };
    const idle = window.requestIdleCallback?.(preload, { timeout: 2500 });
    const timer = window.setTimeout(preload, 3000);
    return () => {
      if (idle) window.cancelIdleCallback?.(idle);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <Router>
      <ToastViewport />
      <NetworkStatus />
      <Routes>
        <Route path="/login" element={<Page><Login /></Page>} />
        <Route path="/reset-password" element={<Page><ResetPassword /></Page>} />
        
        {/* Student Routes */}
        <Route path="/student" element={<ProtectedLayout role="student" />}>
          <Route index element={<Page><StudentDashboard /></Page>} />
          <Route path="qr" element={<Page><StudentQR /></Page>} />
          <Route path="laundry" element={<Page><StudentLaundry /></Page>} />
          <Route path="profile" element={<Page><StudentProfile /></Page>} />
          <Route path="account" element={<Page><Account /></Page>} />
          <Route path="notifications" element={<Page><Notifications /></Page>} />
        </Route>

        {/* Kitchen Routes */}
        <Route path="/kitchen" element={<ProtectedLayout role="kitchen" />}>
          <Route index element={<Page><KitchenDashboard /></Page>} />
          <Route path="scanner" element={<Page><KitchenScanner /></Page>} />
          <Route path="account" element={<Page><Account /></Page>} />
          <Route path="notifications" element={<Page><Notifications /></Page>} />
        </Route>

        {/* Laundry Staff Routes */}
        <Route path="/laundry-staff" element={<ProtectedLayout role="laundry" />}>
          <Route index element={<Page><LaundryDashboard /></Page>} />
          <Route path="baskets" element={<Page><LaundryBaskets /></Page>} />
          <Route path="board" element={<Page><LaundryBoard /></Page>} />
          <Route path="reports" element={<Page><LaundryReports /></Page>} />
          <Route path="issues" element={<Page><LaundryIssues /></Page>} />
          <Route path="scanner" element={<Page><LaundryScanner /></Page>} />
          <Route path="account" element={<Page><Account /></Page>} />
          <Route path="notifications" element={<Page><Notifications /></Page>} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedLayout role="admin" />}>
          <Route index element={<Page><AdminDashboard /></Page>} />
          <Route path="meals" element={<Page><AdminMeals /></Page>} />
          <Route path="students" element={<Page><AdminStudents /></Page>} />
          <Route path="users/:id" element={<Page><AdminUserHistory /></Page>} />
          <Route path="staff" element={<Page><AdminStaff /></Page>} />
          <Route path="analytics" element={<Page><AdminAnalytics /></Page>} />
          <Route path="audit" element={<Page><AdminAudit /></Page>} />
          <Route path="approvals" element={<Page><AdminApprovals /></Page>} />
          <Route path="tools" element={<Page><AdminTools /></Page>} />
          <Route path="account" element={<Page><Account /></Page>} />
          <Route path="notifications" element={<Page><Notifications /></Page>} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
