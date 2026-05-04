import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { KeyRound, Mail, Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";

async function apiForgotPassword(email: string) {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed.");
  return data;
}

async function apiResetPassword(token: string, password: string) {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Reset failed.");
  return data;
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  return token ? <ResetForm token={token} /> : <ForgotForm />;
}

function ForgotForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true);
    try {
      await apiForgotPassword(email.trim());
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-neutral-100 overflow-hidden"
      >
        <div className="h-2 w-full bg-indigo-600" />
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Mail className="h-7 w-7 text-indigo-600" />
            </div>
          </div>

          {done ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <h1 className="text-2xl font-black text-neutral-950">Check your email</h1>
              <p className="text-sm text-neutral-500">
                If an account exists for <span className="font-bold text-neutral-700">{email}</span>, a password reset link has been sent. Check your inbox and spam folder.
              </p>
              <Link to="/login">
                <Button variant="outline" className="mt-4 w-full">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black text-neutral-950 text-center">Forgot password?</h1>
              <p className="mt-2 text-sm text-neutral-500 text-center">
                Enter your email and we'll send you a reset link.
              </p>

              <div className="mt-8 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Email address</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    autoComplete="email"
                  />
                </div>

                {error && (
                  <p className="text-sm font-semibold text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
                )}

                <Button onClick={handleSubmit} disabled={loading} className="w-full">
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>

                <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-900 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await apiResetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-neutral-100 overflow-hidden"
      >
        <div className="h-2 w-full bg-indigo-600" />
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <KeyRound className="h-7 w-7 text-indigo-600" />
            </div>
          </div>

          {done ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <h1 className="text-2xl font-black text-neutral-950">Password reset!</h1>
              <p className="text-sm text-neutral-500">Your password has been updated. You can now sign in with your new password.</p>
              <Link to="/login">
                <Button className="mt-4 w-full">Sign In</Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black text-neutral-950 text-center">Set new password</h1>
              <p className="mt-2 text-sm text-neutral-500 text-center">Choose a strong password for your account.</p>

              <div className="mt-8 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">New password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1.5">Confirm password</label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    autoComplete="new-password"
                  />
                </div>

                {error && (
                  <p className="text-sm font-semibold text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
                )}

                <Button onClick={handleSubmit} disabled={loading} className="w-full">
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>

                <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-900 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
