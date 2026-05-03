import { useEffect, useState, type FormEvent } from "react";
import { Bell, ImagePlus, KeyRound, Phone, Settings, UserRound } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { PasswordInput } from "@/src/components/ui/password-input";
import { SelectMenu } from "@/src/components/ui/select-menu";
import { api, type UserPreferences } from "@/src/lib/api";
import { showToast } from "@/src/components/ui/toast";
import { compressImage } from "@/src/lib/image";
import { applyTheme } from "@/src/lib/theme";

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
  const [photoPreview, setPhotoPreview] = useState(storedUser.photoUrl || "");
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: "system",
    dashboardLayout: "comfortable",
    tableFilters: {},
    lastSelectedMeal: null,
    notificationSettings: { laundry: true, meals: true, password: true, admin: true },
  });

  useEffect(() => {
    api.preferences().then(setPreferences).catch(console.error);
  }, []);

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

  const savePhoto = async (file: File) => {
    try {
      const photoUrl = await compressImage(file);
      const updated = await api.updatePhoto(storedUser.id, { photoUrl });
      localStorage.setItem("hamsUser", JSON.stringify(updated));
      setPhotoPreview(photoUrl);
      showToast("Profile photo saved.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to save photo.", "error");
    }
  };

  const savePreferences = async () => {
    try {
      const saved = await api.savePreferences(preferences);
      setPreferences(saved);
      applyTheme(saved.theme);
      showToast("Preferences saved.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to save preferences.", "error");
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

      <section className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-neutral-100 border border-neutral-200 overflow-hidden flex items-center justify-center">
            {photoPreview ? <img src={photoPreview} alt="" className="w-full h-full object-cover" /> : <UserRound className="w-8 h-8 text-neutral-400" />}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Profile Photo</h2>
            <p className="text-sm text-neutral-500">Used on profile cards and scanner identity checks.</p>
            <label className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer">
              <ImagePlus className="w-4 h-4" />
              Upload photo
              <input type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && savePhoto(event.target.files[0])} />
            </label>
          </div>
        </div>
      </section>

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

      <section className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Saved Preferences</h2>
            <p className="text-sm text-neutral-500">These settings are saved to your user account.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectMenu value={preferences.theme} onChange={(value) => {
            const theme = value as UserPreferences["theme"];
            setPreferences({ ...preferences, theme });
            applyTheme(theme);
          }} label="Theme" options={[
            { value: "system", label: "System theme", description: "Follow device setting" },
            { value: "light", label: "Light theme", description: "Bright interface" },
            { value: "dark", label: "Dark theme", description: "Reduced brightness" },
          ]} />
          <SelectMenu value={preferences.dashboardLayout} onChange={(value) => setPreferences({ ...preferences, dashboardLayout: value as UserPreferences["dashboardLayout"] })} label="Dashboard layout" options={[
            { value: "comfortable", label: "Comfortable layout", description: "More spacing" },
            { value: "compact", label: "Compact layout", description: "More data on screen" },
          ]} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {["laundry", "meals", "password", "admin"].map((key) => (
            <label key={key} className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-sm font-medium capitalize">
              <input type="checkbox" checked={preferences.notificationSettings[key] ?? true} onChange={(event) => setPreferences({ ...preferences, notificationSettings: { ...preferences.notificationSettings, [key]: event.target.checked } })} />
              <Bell className="w-4 h-4 text-neutral-500" />
              {key} notifications
            </label>
          ))}
        </div>
        <Button type="button" onClick={savePreferences} variant="outline">Save Preferences</Button>
      </section>
    </div>
  );
}
