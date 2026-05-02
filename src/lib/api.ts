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
  laundryReports: () => request<LaundryReports>("/laundry/reports"),
  studentOverview: (studentId: string) => request<StudentOverview>(`/student/${studentId}/overview`),
  scanMeal: (mealId: number, studentId: string) =>
    request<{ message: string; studentId: string; meal: Meal }>(`/meals/${mealId}/scan`, {
      method: "POST",
      body: JSON.stringify({ studentId }),
    }),
};
