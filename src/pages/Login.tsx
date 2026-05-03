import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { PasswordInput } from "@/src/components/ui/password-input";
import { Label } from "@/src/components/ui/label";
import { showToast } from "@/src/components/ui/toast";
import { ArrowRight, Lock, Mail, ShieldAlert, Shirt, User, UtensilsCrossed } from "lucide-react";
import { api, type Role } from "@/src/lib/api";

const roleOptions: Array<{
  role: Role;
  label: string;
  description: string;
  icon: typeof User;
}> = [
  { role: "student", label: "Student", description: "Meals, QR code, profile, and laundry status", icon: User },
  { role: "kitchen", label: "Kitchen", description: "Meal dashboard and student scan approval", icon: UtensilsCrossed },
  { role: "laundry", label: "Laundry", description: "Basket tracking, reports, and laundry scanner", icon: Shirt },
  { role: "admin", label: "Admin", description: "Students, meals, analytics, and system overview", icon: ShieldAlert },
];

const destinations: Record<Role, string> = {
  student: "/student",
  kitchen: "/kitchen",
  laundry: "/laundry-staff",
  admin: "/admin",
};

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("student@example.com");
  const [password, setPassword] = useState("password");

  const selectedRole = useMemo(() => roleOptions.find((option) => option.role === role) ?? roleOptions[0], [role]);
  const SelectedIcon = selectedRole.icon;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { user, token } = await api.login({ email, password, role });
      localStorage.setItem("hamsUser", JSON.stringify(user));
      localStorage.setItem("hamsToken", token);
      showToast(`Welcome, ${user.name}.`);
      navigate(destinations[role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6 lg:gap-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-neutral-100 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="p-6 sm:p-8 lg:p-10 h-full flex flex-col justify-center gap-10">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center overflow-hidden">
                  <img src="/logo.jpg" alt="Nile University Logo" className="w-full h-full object-contain p-2" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-600">Hostel Attendance Management System</p>
                  <h1 className="text-3xl sm:text-4xl font-bold text-neutral-950 tracking-tight">HAMS</h1>
                </div>
              </div>

              <div className="space-y-4 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-950">One place for meals, laundry, students, and staff operations.</h2>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-neutral-100 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="p-6 sm:p-8 border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center">
                <SelectedIcon className="w-5 h-5 text-indigo-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-950">Sign in</h2>
                <p className="text-sm text-neutral-500">{selectedRole.description}</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roleOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = option.role === role;

                return (
                  <button
                    key={option.role}
                    type="button"
                    onClick={() => {
                      setRole(option.role);
                      setEmail(`${option.role}@example.com`);
                    }}
                    className={`text-left rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                        : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isSelected ? "bg-white" : "bg-neutral-50"}`}>
                        <Icon className={`w-5 h-5 ${isSelected ? "text-indigo-700" : "text-neutral-500"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{option.label}</p>
                        <p className="text-xs opacity-75 mt-0.5">{option.role}@example.com</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <form className="space-y-5" onSubmit={handleLogin}>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-neutral-700">
                  Email address
                </Label>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-neutral-400" />
                  </div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="pl-10 block w-full border-neutral-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg bg-neutral-50"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-neutral-700">
                  Password
                </Label>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-neutral-400" />
                  </div>
                  <PasswordInput
                    id="password"
                    name="password"
                    required
                    className="pl-10 block w-full border-neutral-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg bg-neutral-50"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const result = await api.requestPasswordReset({ email });
                    showToast(result.message);
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : "Unable to request reset.", "error");
                  }
                }}
                className="text-sm font-semibold text-indigo-700 hover:text-indigo-900"
              >
                Request password reset
              </button>

              <Button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Enter {selectedRole.label} Workspace
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
