import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { PasswordInput } from "@/src/components/ui/password-input";
import { Input } from "@/src/components/ui/input";
import { api } from "@/src/lib/api";
import { showToast } from "@/src/components/ui/toast";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const result = await api.resetPasswordWithToken({ token, newPassword });
      showToast(result.message);
      navigate("/login");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to reset password.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 space-y-5">
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
          <KeyRound className="w-6 h-6 text-indigo-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Reset password</h1>
          <p className="text-sm text-neutral-500 mt-1">Paste your reset token and choose a new password.</p>
        </div>
        <Input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Reset token" required />
        <PasswordInput value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" required />
        <Button disabled={isSaving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
          {isSaving ? "Saving..." : "Reset password"}
        </Button>
        <Link to="/login" className="block text-center text-sm font-semibold text-indigo-700 hover:text-indigo-900">Back to login</Link>
      </form>
    </div>
  );
}
