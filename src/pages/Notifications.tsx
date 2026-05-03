import { useEffect, useState } from "react";
import { Bell, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { api, type Notification, type Role } from "@/src/lib/api";
import { CardSkeleton } from "@/src/components/ui/skeleton";
import { showToast } from "@/src/components/ui/toast";

export default function Notifications() {
  const user = JSON.parse(localStorage.getItem("hamsUser") || "{}");
  const role = (user.role || "student") as Role;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const loadNotifications = () => {
    setIsLoading(true);
    api.notifications(role, user.studentId).then(setNotifications).catch(console.error).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAllRead = async () => {
    await api.markNotificationsRead({ role, studentId: user.studentId });
    setNotifications((current) => current.map((item) => ({ ...item, isRead: 1 })));
    showToast("Notifications marked as read.");
  };

  const markOneRead = async (notification: Notification) => {
    if (notification.isRead === 1) return;
    await api.markNotificationRead(notification.id);
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, isRead: 1 } : item));
    showToast("Notification marked as read.");
  };

  const visibleNotifications = filter === "unread" ? notifications.filter((item) => item.isRead === 0) : notifications;
  const unreadCount = notifications.filter((item) => item.isRead === 0).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
          <p className="text-sm text-neutral-500 mt-1">Updates from meals, laundry, accounts, and system activity.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={filter === "all" ? "secondary" : "outline"} onClick={() => setFilter("all")}>All</Button>
          <Button variant={filter === "unread" ? "secondary" : "outline"} onClick={() => setFilter("unread")}>Unread {unreadCount ? `(${unreadCount})` : ""}</Button>
          <Button variant="outline" onClick={loadNotifications}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCircle2 className="w-4 h-4" />
            Mark all read
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 p-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="p-10 text-center">
            <Bell className="w-10 h-10 mx-auto text-neutral-300 mb-3" />
            <p className="font-semibold text-neutral-900">{filter === "unread" ? "No unread notifications" : "No notifications yet"}</p>
            <p className="text-sm text-neutral-500 mt-1">{filter === "unread" ? "Everything is caught up." : "New activity will appear here."}</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {visibleNotifications.map((notification) => (
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
                  {notification.isRead === 0 ? (
                    <Button size="sm" variant="outline" onClick={() => markOneRead(notification)}>
                      Mark read
                    </Button>
                  ) : (
                    <span className="text-xs font-semibold text-neutral-400 mt-2">Read</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
