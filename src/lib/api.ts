const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
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

  return response.json() as Promise<T>;
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

export const api = {
  login: (payload: { email: string; password: string; role: Role }) =>
    request<{ user: Student & { role: Role } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  students: () => request<Student[]>("/students"),
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
  staff: () => request<StaffUser[]>("/staff"),
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
  meals: () => request<Meal[]>("/meals"),
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
  laundryBaskets: () => request<LaundryBasket[]>("/laundry/baskets"),
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
  deleteLaundryBasket: (id: number) =>
    request<{ message: string }>(`/laundry/baskets/${id}`, {
      method: "DELETE",
    }),
  adminDashboard: () => request<AdminDashboard>("/admin/dashboard"),
  kitchenDashboard: () => request<KitchenDashboard>("/kitchen/dashboard"),
  laundryDashboard: () => request<LaundryDashboard>("/laundry/dashboard"),
  laundryReports: () => request<LaundryReports>("/laundry/reports"),
  requestLaundry: (studentId: string, payload: { basketCode?: string; receivedAt?: string; estimatedFinish?: string; notes?: string }) =>
    request<LaundryBasket>(`/student/${studentId}/laundry-request`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  notifications: (role: Role, studentId?: string) =>
    request<Notification[]>(`/notifications?role=${role}${studentId ? `&studentId=${studentId}` : ""}`),
  markNotificationRead: (id: number) =>
    request<{ message: string }>(`/notifications/${id}/read`, {
      method: "PATCH",
    }),
  markNotificationsRead: (payload: { role: Role; studentId?: string }) =>
    request<{ message: string }>("/notifications/read-all", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  auditLogs: () => request<AuditLog[]>("/audit-logs"),
  adminAnalytics: () => request<AdminAnalytics>("/admin/analytics"),
  exportUrl: (kind: "students" | "meals" | "baskets" | "audits") => `${API_BASE_URL}/export/${kind}`,
  studentOverview: (studentId: string) => request<StudentOverview>(`/student/${studentId}/overview`),
  scanMeal: (mealId: number, studentId: string) =>
    request<{ message: string; studentId: string; meal: Meal }>(`/meals/${mealId}/scan`, {
      method: "POST",
      body: JSON.stringify({ studentId }),
    }),
};
