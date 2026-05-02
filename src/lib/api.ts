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
  meals: () => request<Meal[]>("/meals"),
  laundryBaskets: () => request<LaundryBasket[]>("/laundry/baskets"),
  createLaundryBasket: (payload: CreateLaundryBasketPayload) =>
    request<LaundryBasket>("/laundry/baskets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  studentOverview: (studentId: string) => request<StudentOverview>(`/student/${studentId}/overview`),
  scanMeal: (mealId: number, studentId: string) =>
    request<{ message: string; studentId: string; meal: Meal }>(`/meals/${mealId}/scan`, {
      method: "POST",
      body: JSON.stringify({ studentId }),
    }),
};
