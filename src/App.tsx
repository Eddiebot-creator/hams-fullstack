/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { ToastViewport } from "./components/ui/toast";
import NetworkStatus from "./components/layout/NetworkStatus";
import { CardSkeleton } from "./components/ui/skeleton";

const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Account = lazy(() => import("./pages/Account"));
const Notifications = lazy(() => import("./pages/Notifications"));

const StudentDashboard = lazy(() => import("./pages/student/Dashboard"));
const StudentQR = lazy(() => import("./pages/student/QRCode"));
const StudentLaundry = lazy(() => import("./pages/student/Laundry"));
const StudentProfile = lazy(() => import("./pages/student/Profile"));

const KitchenDashboard = lazy(() => import("./pages/kitchen/Dashboard"));
const KitchenScanner = lazy(() => import("./pages/kitchen/Scanner"));

const LaundryDashboard = lazy(() => import("./pages/laundry/Dashboard"));
const LaundryBaskets = lazy(() => import("./pages/laundry/Baskets"));
const LaundryBoard = lazy(() => import("./pages/laundry/Board"));
const LaundryReports = lazy(() => import("./pages/laundry/Reports"));
const LaundryScanner = lazy(() => import("./pages/laundry/Scanner"));
const LaundryIssues = lazy(() => import("./pages/laundry/Issues"));

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminMeals = lazy(() => import("./pages/admin/Meals"));
const AdminStudents = lazy(() => import("./pages/admin/Students"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const AdminStaff = lazy(() => import("./pages/admin/Staff"));
const AdminAudit = lazy(() => import("./pages/admin/Audit"));
const AdminUserHistory = lazy(() => import("./pages/admin/UserHistory"));
const AdminApprovals = lazy(() => import("./pages/admin/Approvals"));
const AdminTools = lazy(() => import("./pages/admin/Tools"));

function PageLoader() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

function ProtectedLayout({ role }: { role: "student" | "kitchen" | "laundry" | "admin" }) {
  const user = JSON.parse(localStorage.getItem("hamsUser") || "{}");
  const token = localStorage.getItem("hamsToken");
  return token && user.role === role ? <Layout role={role} /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Router>
      <ToastViewport />
      <NetworkStatus />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Student Routes */}
        <Route path="/student" element={<ProtectedLayout role="student" />}>
          <Route index element={<StudentDashboard />} />
          <Route path="qr" element={<StudentQR />} />
          <Route path="laundry" element={<StudentLaundry />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* Kitchen Routes */}
        <Route path="/kitchen" element={<ProtectedLayout role="kitchen" />}>
          <Route index element={<KitchenDashboard />} />
          <Route path="scanner" element={<KitchenScanner />} />
          <Route path="account" element={<Account />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* Laundry Staff Routes */}
        <Route path="/laundry-staff" element={<ProtectedLayout role="laundry" />}>
          <Route index element={<LaundryDashboard />} />
          <Route path="baskets" element={<LaundryBaskets />} />
          <Route path="board" element={<LaundryBoard />} />
          <Route path="reports" element={<LaundryReports />} />
          <Route path="issues" element={<LaundryIssues />} />
          <Route path="scanner" element={<LaundryScanner />} />
          <Route path="account" element={<Account />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedLayout role="admin" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="meals" element={<AdminMeals />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="users/:id" element={<AdminUserHistory />} />
          <Route path="staff" element={<AdminStaff />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="audit" element={<AdminAudit />} />
          <Route path="approvals" element={<AdminApprovals />} />
          <Route path="tools" element={<AdminTools />} />
          <Route path="account" element={<Account />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    </Router>
  );
}
