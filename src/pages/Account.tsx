import { useEffect, useState, type FormEvent } from "react";
import { Bell, CheckCircle2, ImagePlus, KeyRound, Phone, Settings, UserRound } from "lucide-react";
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
    gender: storedUser.gender || "",
  });
  const [serviceState, setServiceState] = useState({
    mealSubscribed: storedUser.mealSubscribed !== false,
    laundrySubscribed: storedUser.laundrySubscribed !== false,
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
  const completeItems = [
    Boolean(profileForm.name),
    Boolean(storedUser.email),
    Boolean(profileForm.phone),
    storedUser.role !== "student" || Boolean(profileForm.hostel),
    storedUser.role !== "student" || Boolean(profileForm.room),
    storedUser.role !== "student" || Boolean(profileForm.gender),
    Boolean(photoPreview),
  ];
  const completion = Math.round((completeItems.filter(Boolean).length / completeItems.length) * 100);

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

  const toggleSubscription = async (service: "meals" | "laundry") => {
    try {
      const subscribed = service === "meals" ? !serviceState.mealSubscribed : !serviceState.laundrySubscribed;
      const updated = await api.updateSubscription(storedUser.id, { service, subscribed });
      localStorage.setItem("hamsUser", JSON.stringify(updated));
      setServiceState({
        mealSubscribed: updated.mealSubscribed !== false,
        laundrySubscribed: updated.laundrySubscribed !== false,
      });
      showToast(`${service === "meals" ? "Meal" : "Laundry"} service ${subscribed ? "subscribed" : "unsubscribed"}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to update subscription.", "error");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Personal control center</p>
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="text-sm text-neutral-500 mt-1 capitalize">{storedUser.role} workspace account, preferences, security, and profile.</p>
      </div>

      {message && <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-800">{message}</div>}

      <section className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Account readiness</h2>
              <p className="text-sm text-neutral-500">Complete profiles make scanner checks and service updates more reliable.</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-3xl font-black text-neutral-950">{completion}%</p>
            <div className="mt-2 h-2 w-full min-w-40 overflow-hidden rounded-full bg-neutral-100 sm:w-44">
              <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${completion}%` }} />
            </div>
          </div>
        </div>
      </section>

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
          {storedUser.role === "student" && (
            <>
              <Input placeholder="Hostel" value={profileForm.hostel} onChange={(event) => setProfileForm({ ...profileForm, hostel: event.target.value })} />
              <Input placeholder="Room" value={profileForm.room} onChange={(event) => setProfileForm({ ...profileForm, room: event.target.value })} />
              <SelectMenu value={profileForm.gender} onChange={(value) => setProfileForm({ ...profileForm, gender: value })} label="Gender" className="min-w-0" options={[
                { value: "Male", label: "Male", description: "Male student" },
                { value: "Female", label: "Female", description: "Female student" },
              ]} />
            </>
          )}
        </div>
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Phone className="w-4 h-4 mr-2" />
          Save Profile
        </Button>
      </form>

      {storedUser.role === "student" && (
        <section className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Service Subscriptions</h2>
              <p className="text-sm text-neutral-500">Control whether meals and laundry are active for your student account.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ServiceSubscription
              title="Meals"
              subscribed={serviceState.mealSubscribed}
              onToggle={() => toggleSubscription("meals")}
            />
            <ServiceSubscription
              title="Laundry"
              subscribed={serviceState.laundrySubscribed}
              onToggle={() => toggleSubscription("laundry")}
            />
          </div>
        </section>
      )}

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

function ServiceSubscription({ title, subscribed, onToggle }: { title: string; subscribed: boolean; onToggle: () => void }) {
  return (
    <div className={`rounded-2xl border p-4 ${subscribed ? "border-green-100 bg-green-50" : "border-amber-100 bg-amber-50"}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{title}</p>
      {subscribed ? (
        <span className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-green-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-green-800">
          Subscribed
        </span>
      ) : (
        <Button type="button" variant="default" className="mt-3 w-full" onClick={onToggle}>
          {`Subscribe ${title}`}
        </Button>
      )}
    </div>
  );
}
