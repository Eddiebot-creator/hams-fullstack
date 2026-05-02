/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Account from "./pages/Account";
import Notifications from "./pages/Notifications";
import Layout from "./components/layout/Layout";

// Student Pages
import StudentDashboard from "./pages/student/Dashboard";
import StudentQR from "./pages/student/QRCode";
import StudentLaundry from "./pages/student/Laundry";
import StudentProfile from "./pages/student/Profile";

// Kitchen Pages
import KitchenDashboard from "./pages/kitchen/Dashboard";
import KitchenScanner from "./pages/kitchen/Scanner";

// Laundry Staff Pages
import LaundryDashboard from "./pages/laundry/Dashboard";
import LaundryBaskets from "./pages/laundry/Baskets";
import LaundryBoard from "./pages/laundry/Board";
import LaundryReports from "./pages/laundry/Reports";
import LaundryScanner from "./pages/laundry/Scanner";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminMeals from "./pages/admin/Meals";
import AdminStudents from "./pages/admin/Students";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminStaff from "./pages/admin/Staff";
import AdminAudit from "./pages/admin/Audit";

function ProtectedLayout({ role }: { role: "student" | "kitchen" | "laundry" | "admin" }) {
  const user = JSON.parse(localStorage.getItem("hamsUser") || "{}");
  return user.role === role ? <Layout role={role} /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
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
          <Route path="scanner" element={<LaundryScanner />} />
          <Route path="account" element={<Account />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedLayout role="admin" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="meals" element={<AdminMeals />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="staff" element={<AdminStaff />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="audit" element={<AdminAudit />} />
          <Route path="account" element={<Account />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
