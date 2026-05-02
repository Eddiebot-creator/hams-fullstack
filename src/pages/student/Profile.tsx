import { useEffect, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { User, Mail, Phone, Building, ShieldCheck, Bell } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { api, type Notification, type Student } from "@/src/lib/api";

export default function Profile() {
  const [student, setStudent] = useState<Student | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", hostel: "", room: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("hamsUser") || "{}");
    const studentId = storedUser.studentId || "240011223";
    api.studentOverview(studentId).then((overview) => {
      setStudent(overview.student);
      setProfileForm({
        name: overview.student.name,
        phone: overview.student.phone || "",
        hostel: overview.student.hostel || "",
        room: overview.student.room || "",
      });
    }).catch(console.error);
    api.notifications("student", studentId).then(setNotifications).catch(console.error);
  }, []);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!student) return;
    setMessage("");
    try {
      const updated = await api.updateProfile(student.id, profileForm);
      setStudent(updated);
      localStorage.setItem("hamsUser", JSON.stringify(updated));
      setIsEditing(false);
      setMessage("Profile updated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to update profile.");
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!student) return;
    setMessage("");
    try {
      await api.changePassword(student.id, passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setMessage("Password changed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to change password.");
    }
  };

  const markAllRead = async () => {
    if (!student) return;
    await api.markNotificationsRead({ role: "student", studentId: student.studentId });
    setNotifications((current) => current.map((item) => ({ ...item, isRead: 1 })));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Student Profile</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden"
      >
        <div className="h-32 bg-indigo-600 relative">
          <div className="absolute -bottom-12 left-8 w-24 h-24 bg-white rounded-full p-1 shadow-md">
            <div className="w-full h-full bg-indigo-100 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-indigo-600" />
            </div>
          </div>
        </div>
        
        <div className="pt-16 pb-8 px-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">{student?.name || "Student"}</h2>
              <p className="text-neutral-500 font-medium">{student ? `${student.course}, ${student.level}` : "Loading profile"}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditing((value) => !value)}>{isEditing ? "Close" : "Edit Profile"}</Button>
          </div>

          {message && <div className="mb-6 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-800">{message}</div>}

          {isEditing && (
            <form onSubmit={saveProfile} className="mb-8 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input required placeholder="Full name" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} />
                <Input placeholder="Phone" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} />
                <Input placeholder="Hostel" value={profileForm.hostel} onChange={(event) => setProfileForm({ ...profileForm, hostel: event.target.value })} />
                <Input placeholder="Room" value={profileForm.room} onChange={(event) => setProfileForm({ ...profileForm, room: event.target.value })} />
              </div>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Profile</Button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <Mail className="w-5 h-5 text-neutral-400 mr-3" />
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Email</p>
                  <p className="font-medium text-neutral-900">{student?.email || "-"}</p>
                </div>
              </div>
              
              <div className="flex items-center p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <Phone className="w-5 h-5 text-neutral-400 mr-3" />
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Phone</p>
                  <p className="font-medium text-neutral-900">{student?.phone || "-"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <Building className="w-5 h-5 text-neutral-400 mr-3" />
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Hostel</p>
                  <p className="font-medium text-neutral-900">{student?.room ? `${student.hostel}, ${student.room}` : student?.hostel || "-"}</p>
                </div>
              </div>
              
              <div className="flex items-center p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <ShieldCheck className="w-5 h-5 text-neutral-400 mr-3" />
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Student ID</p>
                  <p className="font-medium text-neutral-900 font-mono">{student?.studentId || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <form onSubmit={changePassword} className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Change Password</h2>
          <p className="text-sm text-neutral-500">Use at least 6 characters for the new password.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input required type="password" placeholder="Current password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} />
          <Input required type="password" placeholder="New password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} />
        </div>
        <Button type="submit" variant="outline">Update Password</Button>
      </form>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <Bell className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">My Updates</h2>
            <p className="text-sm text-neutral-500">Messages saved for your student account.</p>
          </div>
          {notifications.some((item) => item.isRead === 0) && (
            <Button variant="outline" size="sm" className="ml-auto" onClick={markAllRead}>Mark read</Button>
          )}
        </div>
        <div className="divide-y divide-neutral-100">
          {notifications.length === 0 ? (
            <p className="p-6 text-sm text-neutral-500">No updates yet.</p>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className={`p-6 ${notification.isRead === 0 ? "bg-indigo-50/50" : ""}`}>
                <p className="font-semibold text-neutral-900">{notification.title}</p>
                <p className="text-sm text-neutral-600 mt-1">{notification.message}</p>
                <p className="text-xs text-neutral-400 mt-2">{notification.createdAt}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
