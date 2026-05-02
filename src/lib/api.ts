const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";
const cache = new Map<string, { expiresAt: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();

async function request<T>(path: string, options?: RequestInit & { cacheMs?: number }): Promise<T> {
  const method = options?.method ?? "GET";
  const cacheKey = `${method}:${path}`;
  const cacheMs = options?.cacheMs ?? 0;
  if (method !== "GET") {
    cache.clear();
    pending.clear();
  }
  if (method === "GET" && cacheMs > 0) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    const active = pending.get(cacheKey);
    if (active) return active as Promise<T>;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed." }));
    throw new Error(error.message ?? "Request failed.");
  }

  const promise = response.json() as Promise<T>;
  if (method === "GET" && cacheMs > 0) {
    pending.set(cacheKey, promise);
    promise.then((value) => {
      cache.set(cacheKey, { expiresAt: Date.now() + cacheMs, value });
      pending.delete(cacheKey);
    }).catch(() => pending.delete(cacheKey));
  }
  return promise;
}

export type Role = "student" | "kitchen" | "laundry" | "admin";

export type Student = {
  id: number;
  name: string;
  email: string;
  studentId: string;
  hostel: string;
  room?: string;
  course: string;
  level: string;
  phone: string;
  status: string;
};

export type Meal = {
  id: number;
  type: string;
  startTime: string;
  endTime: string;
  menu: string;
  status: string;
  consumed?: 0 | 1;
  scannedAt?: string | null;
};

export type LaundryBasket = {
  id: number;
  basketCode: string;
  studentId: string;
  status: string;
  receivedAt: string;
  estimatedFinish: string | null;
  notes: string | null;
};

export type StudentOverview = {
  student: Student;
  meals: Meal[];
  laundry: LaundryBasket[];
};

export type CreateStudentPayload = {
  name: string;
  email: string;
  studentId: string;
  hostel: string;
  room?: string;
  course: string;
  level: string;
  phone?: string;
  status?: string;
};

export type CreateLaundryBasketPayload = {
  basketCode: string;
  studentId: string;
  status: string;
  receivedAt: string;
  estimatedFinish?: string;
  notes?: string;
  staffName?: string;
};

export type CreateMealPayload = {
  type: string;
  startTime: string;
  endTime: string;
  menu: string;
  status: string;
};

export type AdminDashboard = {
  stats: {
    totalStudents: number;
    mealsServedToday: number;
    laundryBaskets: number;
    systemUptime: string;
  };
  alerts: Array<{
    id: number;
    alertType: string;
    message: string;
    alertTime: string;
  }>;
};

export type KitchenDashboard = {
  currentMeal: Meal | null;
  stats: {
    totalExpected: number;
    totalServed: number;
  };
  recentScans: Array<{
    id: number;
    studentId: string;
    mealType: string;
    scannedTime: string;
    status: string;
  }>;
};

export type LaundryDashboard = {
  statusCounts: {
    pending: number;
    washing: number;
    ready: number;
    issues: number;
  };
  activity: Array<{
    id: number;
    basketCode: string;
    action: string;
    staffName: string;
    activityTime: string;
  }>;
};

export type LaundryReports = {
  reports: Array<{
    id: number;
    reportPeriod: string;
    totalBasketsProcessed: number;
    averageTurnaround: string;
    reportedIssues: number;
  }>;
  machines: Array<{
    id: number;
    name: string;
    machineType: string;
    usagePercent: number;
    status: string;
  }>;
};

export type StaffUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: string;
};

export type Notification = {
  id: number;
  userRole: string;
  studentId: string | null;
  title: string;
  message: string;
  createdAt: string;
  isRead: 0 | 1;
};

export type AuditLog = {
  id: number;
  actor: string;
  action: string;
  entityType: string;
  entityRef: string | null;
  createdAt: string;
};

export type AdminAnalytics = {
  mealTrends: Array<{ id: number; dayLabel: string; attendanceCount: number }>;
  machineUtilizationAverage: number;
  kpis: Array<{ id: number; name: string; value: string; delta: string }>;
};

export type AdminControlCenter = {
  dashboard: AdminDashboard;
  pendingBaskets: LaundryBasket[];
  audits: AuditLog[];
};

export const api = {
  login: (payload: { email: string; password: string; role: Role }) =>
    request<{ user: Student & { role: Role } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  students: () => request<Student[]>("/students", { cacheMs: 15000 }),
  createStudent: (payload: CreateStudentPayload) =>
    request<Student>("/students", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateStudent: (id: number, payload: CreateStudentPayload) =>
    request<Student>(`/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteStudent: (id: number) =>
    request<{ message: string }>(`/students/${id}`, {
      method: "DELETE",
    }),
  staff: () => request<StaffUser[]>("/staff", { cacheMs: 15000 }),
  createStaff: (payload: { name: string; email: string; role: "kitchen" | "laundry" | "admin"; status?: string; password?: string }) =>
    request<StaffUser>("/staff", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateProfile: (id: number, payload: { name: string; phone?: string; hostel?: string; room?: string }) =>
    request<Student & { role: Role }>(`/users/${id}/profile`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  changePassword: (id: number, payload: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>(`/users/${id}/password`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  meals: () => request<Meal[]>("/meals", { cacheMs: 15000 }),
  createMeal: (payload: CreateMealPayload) =>
    request<Meal>("/meals", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateMeal: (id: number, payload: CreateMealPayload) =>
    request<Meal>(`/meals/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteMeal: (id: number) =>
    request<{ message: string }>(`/meals/${id}`, {
      method: "DELETE",
    }),
  laundryBaskets: () => request<LaundryBasket[]>("/laundry/baskets", { cacheMs: 10000 }),
  createLaundryBasket: (payload: CreateLaundryBasketPayload) =>
    request<LaundryBasket>("/laundry/baskets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateLaundryBasket: (id: number, payload: CreateLaundryBasketPayload) =>
    request<LaundryBasket>(`/laundry/baskets/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  updateLaundryBasketStatus: (id: number, payload: { status: string; staffName?: string }) =>
    request<LaundryBasket>(`/laundry/baskets/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteLaundryBasket: (id: number) =>
    request<{ message: string }>(`/laundry/baskets/${id}`, {
      method: "DELETE",
    }),
  adminDashboard: () => request<AdminDashboard>("/admin/dashboard", { cacheMs: 10000 }),
  adminControlCenter: () => request<AdminControlCenter>("/admin/control-center", { cacheMs: 10000 }),
  kitchenDashboard: () => request<KitchenDashboard>("/kitchen/dashboard", { cacheMs: 8000 }),
  laundryDashboard: () => request<LaundryDashboard>("/laundry/dashboard", { cacheMs: 8000 }),
  laundryReports: () => request<LaundryReports>("/laundry/reports", { cacheMs: 20000 }),
  requestLaundry: (studentId: string, payload: { basketCode?: string; receivedAt?: string; estimatedFinish?: string; notes?: string }) =>
    request<LaundryBasket>(`/student/${studentId}/laundry-request`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  notifications: (role: Role, studentId?: string) =>
    request<Notification[]>(`/notifications?role=${role}${studentId ? `&studentId=${studentId}` : ""}`, { cacheMs: 5000 }),
  markNotificationRead: (id: number) =>
    request<{ message: string }>(`/notifications/${id}/read`, {
      method: "PATCH",
    }),
  markNotificationsRead: (payload: { role: Role; studentId?: string }) =>
    request<{ message: string }>("/notifications/read-all", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  auditLogs: () => request<AuditLog[]>("/audit-logs", { cacheMs: 10000 }),
  adminAnalytics: () => request<AdminAnalytics>("/admin/analytics", { cacheMs: 20000 }),
  exportUrl: (kind: "students" | "meals" | "baskets" | "audits") => `${API_BASE_URL}/export/${kind}`,
  studentOverview: (studentId: string) => request<StudentOverview>(`/student/${studentId}/overview`, { cacheMs: 8000 }),
  scanMeal: (mealId: number, studentId: string) =>
    request<{ message: string; studentId: string; meal: Meal; student: Student }>(`/meals/${mealId}/scan`, {
      method: "POST",
      body: JSON.stringify({ studentId }),
    }),
};
