import { useState, type FormEvent } from "react";
import { KeyRound, Phone, UserRound } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { PasswordInput } from "@/src/components/ui/password-input";
import { api } from "@/src/lib/api";

export default function Account() {
  const storedUser = JSON.parse(localStorage.getItem("hamsUser") || "{}");
  const [message, setMessage] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: storedUser.name || "",
    phone: storedUser.phone || "",
    hostel: storedUser.hostel || "",
    room: storedUser.room || "",
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    try {
      const updated = await api.updateProfile(storedUser.id, profileForm);
      localStorage.setItem("hamsUser", JSON.stringify(updated));
      setMessage("Profile updated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to update profile.");
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    try {
      await api.changePassword(storedUser.id, passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setMessage("Password changed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to change password.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Account</h1>
        <p className="text-sm text-neutral-500 mt-1 capitalize">{storedUser.role} workspace account</p>
      </div>

      {message && <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-800">{message}</div>}

      <form onSubmit={saveProfile} className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <UserRound className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Profile Details</h2>
            <p className="text-sm text-neutral-500">Saved to your backend user record.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input required placeholder="Full name" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} />
          <Input placeholder="Phone" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} />
        </div>
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Phone className="w-4 h-4 mr-2" />
          Save Profile
        </Button>
      </form>

      <form onSubmit={changePassword} className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-neutral-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Change Password</h2>
            <p className="text-sm text-neutral-500">New passwords must be at least 6 characters.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PasswordInput required placeholder="Current password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} />
          <PasswordInput required placeholder="New password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} />
        </div>
        <Button type="submit" variant="outline">Update Password</Button>
      </form>
    </div>
  );
}
