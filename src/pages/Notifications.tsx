import { useEffect, useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { api, type Notification, type Role } from "@/src/lib/api";

export default function Notifications() {
  const user = JSON.parse(localStorage.getItem("hamsUser") || "{}");
  const role = (user.role || "student") as Role;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [message, setMessage] = useState("");

  const loadNotifications = () => {
    api.notifications(role, user.studentId).then(setNotifications).catch(console.error);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAllRead = async () => {
    await api.markNotificationsRead({ role, studentId: user.studentId });
    setNotifications((current) => current.map((item) => ({ ...item, isRead: 1 })));
    setMessage("Notifications marked as read.");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
          <p className="text-sm text-neutral-500 mt-1">Updates from meals, laundry, accounts, and system activity.</p>
        </div>
        <Button variant="outline" onClick={markAllRead}>
          <CheckCircle2 className="w-4 h-4" />
          Mark all read
        </Button>
      </div>

      {message && <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">{message}</div>}

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-10 text-center">
            <Bell className="w-10 h-10 mx-auto text-neutral-300 mb-3" />
            <p className="font-semibold text-neutral-900">No notifications yet</p>
            <p className="text-sm text-neutral-500 mt-1">New activity will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {notifications.map((notification) => (
              <div key={notification.id} className={`p-5 ${notification.isRead === 0 ? "bg-indigo-50/50" : "bg-white"}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${notification.isRead === 0 ? "bg-indigo-100" : "bg-neutral-100"}`}>
                    <Bell className={`w-5 h-5 ${notification.isRead === 0 ? "text-indigo-700" : "text-neutral-500"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-900">{notification.title}</p>
                    <p className="text-sm text-neutral-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-neutral-400 mt-2">{notification.createdAt}</p>
                  </div>
                  {notification.isRead === 0 && <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 mt-2" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
