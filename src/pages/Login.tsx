import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { PasswordInput } from "@/src/components/ui/password-input";
import { Label } from "@/src/components/ui/label";
import { showToast } from "@/src/components/ui/toast";
import { ArrowRight, Lock, Mail, ShieldAlert, Shirt, User, UtensilsCrossed } from "lucide-react";
import { api, type Role } from "@/src/lib/api";

const roleOptions: Array<{ role: Role; label: string; description: string; icon: typeof User }> = [
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

const roleColors: Record<Role, string> = {
  student: "border-indigo-300 bg-indigo-50",
  kitchen: "border-orange-300 bg-orange-50",
  laundry: "border-sky-300 bg-sky-50",
  admin: "border-red-300 bg-red-50",
};

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const { user, token } = await api.login({ email, password });
      localStorage.setItem("hamsUser", JSON.stringify(user));
      localStorage.setItem("hamsToken", token);
      showToast(`Welcome, ${user.name}.`);
      navigate(destinations[user.role]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white border border-neutral-100 shadow-sm flex items-center justify-center overflow-hidden">
                <img src="/logo.jpg" alt="Nile University Logo" className="w-full h-full object-contain p-1" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-indigo-600">Hostel Add-on Management System</p>
                <h1 className="text-3xl font-bold text-neutral-950">HAMS</h1>
              </div>
            </div>
            <p className="text-neutral-500 text-sm mt-2">Select your role to sign in</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {roleOptions.map((option, i) => {
              const Icon = option.icon;
              return (
                <motion.button
                  key={option.role}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => setSelectedRole(option.role)}
                  className={`text-left rounded-2xl border-2 bg-white p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${roleColors[option.role]}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <Icon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <p className="text-lg font-black text-neutral-950">{option.label}</p>
                  </div>
                  <p className="text-sm text-neutral-500">{option.description}</p>
                  <p className="mt-3 text-xs font-bold text-indigo-600">Tap to sign in →</p>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const selectedOption = roleOptions.find((r) => r.role === selectedRole)!;
  const SelectedIcon = selectedOption.icon;

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-neutral-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-neutral-100">
            <button onClick={() => setSelectedRole(null)}
              className="text-sm text-neutral-500 hover:text-neutral-700 mb-4 flex items-center gap-1">
              ← Back to roles
            </button>
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 ${roleColors[selectedRole]}`}>
                <SelectedIcon className="w-5 h-5 text-indigo-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-950">Sign in as {selectedOption.label}</h2>
                <p className="text-sm text-neutral-500">{selectedOption.description}</p>
              </div>
            </div>
          </div>
          <div className="p-6 sm:p-8 space-y-5">
            <form className="space-y-5" onSubmit={handleLogin}>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>
              )}
              <div>
                <Label htmlFor="email" className="text-neutral-700">Email address</Label>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-neutral-400" />
                  </div>
                  <Input id="email" name="email" type="email" required
                    className="pl-10 block w-full border-neutral-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg bg-neutral-50"
                    value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="password" className="text-neutral-700">Password</Label>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-neutral-400" />
                  </div>
                  <PasswordInput id="password" name="password" required
                    className="pl-10 block w-full border-neutral-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg bg-neutral-50"
                    value={password} onChange={(event) => setPassword(event.target.value)} />
                </div>
              </div>
              <button type="button" onClick={() => navigate("/reset-password")}
                className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                Forgot password?
              </button>
              <Button type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                disabled={isLoading}>
                {isLoading ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Connecting...</>
                ) : (
                  <>Sign in<ArrowRight className="ml-2 w-4 h-4" /></>
                )}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
