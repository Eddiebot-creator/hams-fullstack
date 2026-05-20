const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";
const cache = new Map<string, { expiresAt: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();

type ApiRequestOptions = RequestInit & {
  cacheMs?: number;
  retry?: number;
  timeoutMs?: number;
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function friendlyNetworkError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return new Error("The server is taking too long to respond. Please wait a moment and try again.");
  }
  if (error instanceof TypeError && error.message.toLowerCase().includes("fetch")) {
    return new Error("Unable to reach the server. Check your internet connection and try again.");
  }
  if (error instanceof Error && error.message.toLowerCase().includes("signal is aborted")) {
    return new Error("The request timed out before the server replied. Please try again.");
  }
  return error;
}

async function readErrorMessage(response: Response, path: string) {
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    const error = await response.json().catch(() => null);
    return error?.message || `Request failed with status ${response.status}.`;
  }

  const text = await response.text().catch(() => "");
  if (response.status >= 500) {
    return `The server had a problem while processing ${path}. Check Render logs or try again in a moment.`;
  }
  return text.trim() || `Request failed with status ${response.status}.`;
}

async function fetchJson<T>(path: string, options: RequestInit, retries: number, timeoutMs: number): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("hamsToken") ? { Authorization: `Bearer ${localStorage.getItem("hamsToken")}` } : {}),
          ...options.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, path);
        const shouldRetry = response.status >= 500 && attempt < retries;
        if (shouldRetry) {
          await wait(350 * (attempt + 1));
          continue;
        }
        if (response.status === 401 && !path.startsWith("/auth/")) {
          localStorage.removeItem("hamsToken");
          localStorage.removeItem("hamsUser");
          window.dispatchEvent(new CustomEvent("hams-session-expired"));
        }
        throw new Error(message);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      const canRetry = attempt < retries;
      if (!canRetry) throw friendlyNetworkError(error);
      await wait(350 * (attempt + 1));
    } finally {
      window.clearTimeout(timeout);
    }
  }

  throw new Error("Request failed.");
}

async function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  const { cacheMs = 0, retry, timeoutMs = 12000, ...fetchOptions } = options ?? {};
  const method = fetchOptions.method ?? "GET";
  const cacheKey = `${method}:${path}`;
  const requestRetries = retry ?? (method === "GET" ? 1 : 0);

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

  const promise = fetchJson<T>(path, fetchOptions, requestRetries, timeoutMs);
  if (method === "GET" && cacheMs > 0) {
    pending.set(cacheKey, promise);
  }

  try {
    const value = await promise;
    if (method === "GET" && cacheMs > 0) {
      cache.set(cacheKey, { expiresAt: Date.now() + cacheMs, value });
    }
    return value;
  } catch (error) {
    const stale = cache.get(cacheKey);
    if (method === "GET" && stale) return stale.value as T;
    throw error;
  } finally {
    pending.delete(cacheKey);
  }
}

export type Role = "student" | "kitchen" | "laundry" | "admin";

export type Student = {
  id: number;
  name: string;
  email: string;
  studentId: string;
  hostel: string;
  room?: string;
  gender?: string;
  course: string;
  level: string;
  phone: string;
  photoUrl?: string;
  mealSubscribed?: boolean;
  laundrySubscribed?: boolean;
  status: string;
};

export type Meal = {
  id: number;
  type: string;
  weekday?: string;
  startTime: string;
  endTime: string;
  menu: string;
  status: string;
  windowLabel?: string;
  consumed?: 0 | 1;
  scannedAt?: string | null;
};

export type LaundryBasket = {
  id: number;
  basketCode: string;
  studentId: string;
  clothesCount?: number;
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
  gender: string;
  course: string;
  level: string;
  phone?: string;
  mealSubscribed?: boolean;
  laundrySubscribed?: boolean;
  status?: string;
};

export type CreateLaundryBasketPayload = {
  basketCode: string;
  studentId: string;
  clothesCount?: number;
  status: string;
  receivedAt: string;
  estimatedFinish?: string;
  notes?: string;
  staffName?: string;
};

export type CreateMealPayload = {
  type: string;
  weekday?: string;
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
  studentStatus?: { active: number; inactive: number };
  laundryVolume?: Array<{ status: string; count: number }>;
  unresolvedIssues?: number;
  peakScans?: Array<{ label: string; count: number }>;
};

export type AdminControlCenter = {
  dashboard: AdminDashboard;
  pendingBaskets: LaundryBasket[];
  audits: AuditLog[];
};

export type UserHistory = {
  user: (Student & { role: Role }) | StaffUser;
  meals: Array<{ id: number; type: string; menu: string; scannedAt: string }>;
  laundry: Array<{ id: number; basketCode: string; status: string; receivedAt: string; estimatedFinish: string | null; notes: string | null }>;
  notifications: Array<{ id: number; title: string; message: string; createdAt: string; isRead: 0 | 1 }>;
  audits: AuditLog[];
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type UserPreferences = {
  theme: "system" | "light" | "dark";
  dashboardLayout: "comfortable" | "compact";
  tableFilters: Record<string, unknown>;
  lastSelectedMeal: number | null;
  notificationSettings: Record<string, boolean>;
};

export type LaundryIssue = {
  id: number;
  basketId: number;
  basketCode: string;
  studentId: string;
  issueType: string;
  notes: string;
  status: string;
  reportedBy: string;
  createdAt: string;
  resolvedAt: string | null;
};

export type ApprovalRequest = {
  id: number;
  requestType: string;
  entityType: string;
  entityRef: string | null;
  requestedBy: string;
  status: string;
  notes: string | null;
  createdAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
};

export type TimelineEvent = {
  type: string;
  title: string;
  detail: string | null;
  createdAt: string;
};

export type MealTicket = {
  code: string;
  mealType: string;
  studentId: string;
  studentName: string;
  serviceDate: string;
  scannedAt: string;
  validWindow?: string;
  status: string;
};

export type GlobalSearchResults = {
  students: Student[];
  staff: StaffUser[];
  baskets: LaundryBasket[];
  meals: Meal[];
};

export type DatabaseHealth = {
  ok: boolean;
  database: string;
  databaseReady?: boolean;
  users?: number;
  message?: string;
};

export type DatabaseSummary = Record<string, number>;

export const api = {
  login: (payload: { email: string; password: string; role?: Role | null }) =>
    request<{ user: Student & { role: Role }; token: string }>("/auth/login", {
      method: "POST",
      timeoutMs: 30000,
      body: JSON.stringify(payload),
    }),
  requestPasswordReset: (payload: { email: string }) =>
    request<{ message: string; resetLink?: string; resetToken?: string }>("/auth/request-password-reset", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  resetPasswordWithToken: (payload: { token: string; newPassword: string }) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  globalSearch: (query: string) => request<GlobalSearchResults>(`/search?q=${encodeURIComponent(query.trim())}`, { cacheMs: 1200 }),
  students: () => request<Student[]>("/students", { cacheMs: 15000 }),
  studentsPage: (params: { page: number; pageSize?: number; search?: string; status?: string }) =>
    request<Paginated<Student>>(`/students?page=${params.page}&pageSize=${params.pageSize ?? 20}&search=${encodeURIComponent(params.search ?? "")}&status=${encodeURIComponent(params.status ?? "All")}`, { cacheMs: 8000 }),
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
  updateProfile: (id: number, payload: { name: string; phone?: string; hostel?: string; room?: string; gender?: string }) =>
    request<Student & { role: Role }>(`/users/${id}/profile`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  updateSubscription: (id: number, payload: { service: "meals" | "laundry"; subscribed: boolean }) =>
    request<Student & { role: Role }>(`/users/${id}/subscriptions`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  updatePhoto: (id: number, payload: { photoUrl: string }) =>
    request<Student & { role: Role }>(`/users/${id}/photo`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  preferences: () => request<UserPreferences>("/users/me/preferences", { cacheMs: 5000 }),
  savePreferences: (payload: UserPreferences) =>
    request<UserPreferences>("/users/me/preferences", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  changePassword: (id: number, payload: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>(`/users/${id}/password`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  resetUserPassword: (id: number, payload: { newPassword: string }) =>
    request<{ message: string }>(`/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  userHistory: (id: number) => request<UserHistory>(`/users/${id}/history`, { cacheMs: 8000 }),
  userTimeline: (id: number) => request<{ user: Student & { role: Role }; events: TimelineEvent[] }>(`/users/${id}/timeline`, { cacheMs: 8000 }),
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
  laundryBasketsPage: (params: { page: number; pageSize?: number; search?: string; status?: string }) =>
    request<Paginated<LaundryBasket>>(`/laundry/baskets?page=${params.page}&pageSize=${params.pageSize ?? 20}&search=${encodeURIComponent(params.search ?? "")}&status=${encodeURIComponent(params.status ?? "All")}`, { cacheMs: 8000 }),
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
  scanLaundry: (payload: { action: "receive" | "return"; basketCode: string; studentId: string; clothesCount?: number; qrPayload?: string; staffName?: string }) =>
    request<{ message: string; basket: LaundryBasket; student: Student }>("/laundry/scan", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  laundryIssues: (params?: { page?: number; status?: string }) =>
    request<Paginated<LaundryIssue>>(`/laundry/issues?page=${params?.page ?? 1}&status=${encodeURIComponent(params?.status ?? "All")}`, { cacheMs: 8000 }),
  createLaundryIssue: (payload: { basketId: number; issueType: string; notes?: string }) =>
    request<LaundryIssue>("/laundry/issues", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateLaundryIssue: (id: number, payload: { status: "Open" | "Resolved" }) =>
    request<{ message: string }>(`/laundry/issues/${id}`, {
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
  requestLaundry: (studentId: string, payload: { basketCode?: string; clothesCount?: number; receivedAt?: string; estimatedFinish?: string; notes?: string }) =>
    request<LaundryBasket>(`/student/${studentId}/laundry-request`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  notifications: (role: Role, studentId?: string) =>
    request<Notification[]>(`/notifications?role=${role}${studentId ? `&studentId=${studentId}` : ""}`, { cacheMs: 5000 }),
  notificationsPage: (params: { role: Role; studentId?: string; page: number; pageSize?: number }) =>
    request<Paginated<Notification>>(`/notifications?role=${params.role}${params.studentId ? `&studentId=${params.studentId}` : ""}&page=${params.page}&pageSize=${params.pageSize ?? 20}`, { cacheMs: 5000 }),
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
  auditLogsPage: (params: { page: number; pageSize?: number; search?: string }) =>
    request<Paginated<AuditLog>>(`/audit-logs?page=${params.page}&pageSize=${params.pageSize ?? 20}&search=${encodeURIComponent(params.search ?? "")}`, { cacheMs: 8000 }),
  approvals: (params?: { page?: number; status?: string }) =>
    request<Paginated<ApprovalRequest>>(`/admin/approvals?page=${params?.page ?? 1}&status=${encodeURIComponent(params?.status ?? "Pending")}`, { cacheMs: 8000 }),
  decideApproval: (id: number, payload: { status: "Approved" | "Rejected" }) =>
    request<{ message: string }>(`/admin/approvals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  importStudents: (payload: { csv: string; defaultPassword?: string }) =>
    request<{ message: string; created: number; skipped: number }>("/admin/import/students", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  databaseHealth: () => request<DatabaseHealth>("/database/health", { cacheMs: 5000, timeoutMs: 15000 }),
  databaseSummary: () => request<DatabaseSummary>("/database/summary", { cacheMs: 10000, timeoutMs: 15000 }),
  backupUrl: () => `${API_BASE_URL}/database/backup`,
  adminAnalytics: () => request<AdminAnalytics>("/admin/analytics", { cacheMs: 20000 }),
  exportUrl: (kind: "students" | "meals" | "baskets" | "audits") => `${API_BASE_URL}/export/${kind}`,
  studentOverview: (studentId: string) => request<StudentOverview>(`/student/${studentId}/overview`, { cacheMs: 8000 }),
  scanMeal: (mealId: number, studentId: string, lateReason?: string, qrPayload?: string) =>
    request<{ message: string; studentId: string; meal: Meal; student: Student; ticket: MealTicket }>(`/meals/${mealId}/scan`, {
      method: "POST",
      body: JSON.stringify({ studentId, lateReason, qrPayload }),
    }),
  claimMeal: (studentId: string, mealId: number) =>
    request<{ message: string; studentId: string; meal: Meal; student: Student; ticket: MealTicket }>(`/student/${studentId}/claim-meal`, {
      method: "POST",
      body: JSON.stringify({ mealId }),
    }),
};
