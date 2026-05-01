import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Mail, Lock, ArrowRight, User, UtensilsCrossed, Shirt, ShieldAlert } from "lucide-react";
import { api, type Role } from "@/src/lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const email = `${role}@example.com`;
      const { user } = await api.login({ email, password: "password", role });
      localStorage.setItem("hamsUser", JSON.stringify(user));

      setIsLoading(false);
      if (role === "student") navigate("/student");
      if (role === "kitchen") navigate("/kitchen");
      if (role === "laundry") navigate("/laundry-staff");
      if (role === "admin") navigate("/admin");
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-50/50 blur-3xl" />
        <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-50/50 blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
         <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-100/60 overflow-hidden mb-6">
  <img 
    src="/logo.jpg" 
    alt="Nile University Logo" 
    className="w-full h-full object-contain p-3" 
  />
</div>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-6 text-center text-3xl font-extrabold text-neutral-900 tracking-tight"
        >
          HAMS
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-2 text-center text-sm text-neutral-600"
        >
          Select your role to continue
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-white py-8 px-4 shadow-xl shadow-neutral-200/50 sm:rounded-2xl sm:px-10 border border-neutral-100">
          
          <div className="mb-6 grid grid-cols-4 gap-2">
            <button onClick={() => setRole("student")} className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${role === "student" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"}`}>
              <User className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Student</span>
            </button>
            <button onClick={() => setRole("kitchen")} className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${role === "kitchen" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"}`}>
              <UtensilsCrossed className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Kitchen</span>
            </button>
            <button onClick={() => setRole("laundry")} className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${role === "laundry" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"}`}>
              <Shirt className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Laundry</span>
            </button>
            <button onClick={() => setRole("admin")} className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${role === "admin" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"}`}>
              <ShieldAlert className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Admin</span>
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
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
                  className="pl-10 block w-full border-neutral-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                  placeholder="you@example.com"
                  value={`${role}@example.com`}
                  readOnly
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-neutral-700">
                  Password
                </Label>
              </div>
              <div className="mt-2 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-neutral-400" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="pl-10 block w-full border-neutral-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                  placeholder="••••••••"
                  value="password"
                  readOnly
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign in as {role.charAt(0).toUpperCase() + role.slice(1)}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
