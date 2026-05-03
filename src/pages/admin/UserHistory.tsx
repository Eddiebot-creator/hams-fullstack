import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Bell, KeyRound, ListChecks, Shirt, UtensilsCrossed, UserRound } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { PasswordInput } from "@/src/components/ui/password-input";
import { CardSkeleton } from "@/src/components/ui/skeleton";
import { showToast } from "@/src/components/ui/toast";
import { api, type TimelineEvent, type UserHistory } from "@/src/lib/api";

export default function AdminUserHistory() {
  const { id } = useParams();
  const userId = Number(id);
  const [history, setHistory] = useState<UserHistory | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [newPassword, setNewPassword] = useState("password");

  useEffect(() => {
    if (userId) {
      api.userHistory(userId).then(setHistory).catch(console.error);
      api.userTimeline(userId).then((data) => setTimeline(data.events)).catch(console.error);
    }
  }, [userId]);

  const resetPassword = async () => {
    try {
      const result = await api.resetUserPassword(userId, { newPassword });
      showToast(result.message);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to reset password.", "error");
    }
  };

  if (!history) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
              <UserRound className="w-7 h-7 text-indigo-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">{history.user.name}</h1>
              <p className="text-sm text-neutral-500">{history.user.email}</p>
              <p className="text-xs text-neutral-400 capitalize mt-1">{history.user.role}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <PasswordInput value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" />
            <Button onClick={resetPassword} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <KeyRound className="w-4 h-4" />
              Reset Password
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <h2 className="font-semibold text-neutral-900 flex items-center gap-2 mb-4"><UtensilsCrossed className="w-5 h-5 text-green-600" /> Meal History</h2>
          <div className="space-y-3">
            {history.meals.length === 0 ? <p className="text-sm text-neutral-500">No meals recorded.</p> : history.meals.map((meal) => (
              <div key={meal.id} className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
                <p className="font-medium text-neutral-900">{meal.type}</p>
                <p className="text-xs text-neutral-500 mt-1">{meal.scannedAt}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <h2 className="font-semibold text-neutral-900 flex items-center gap-2 mb-4"><Shirt className="w-5 h-5 text-indigo-600" /> Laundry History</h2>
          <div className="space-y-3">
            {history.laundry.length === 0 ? <p className="text-sm text-neutral-500">No laundry recorded.</p> : history.laundry.map((basket) => (
              <div key={basket.id} className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-neutral-900">#{basket.basketCode}</p>
                  <p className="text-xs font-semibold text-indigo-700">{basket.status}</p>
                </div>
                <p className="text-xs text-neutral-500 mt-1">{basket.receivedAt}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <h2 className="font-semibold text-neutral-900 flex items-center gap-2 mb-4"><Bell className="w-5 h-5 text-yellow-600" /> Notifications</h2>
          <div className="space-y-3">
            {history.notifications.length === 0 ? <p className="text-sm text-neutral-500">No notifications recorded.</p> : history.notifications.map((notification) => (
              <div key={notification.id} className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
                <p className="font-medium text-neutral-900">{notification.title}</p>
                <p className="text-xs text-neutral-500 mt-1">{notification.createdAt}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
        <h2 className="font-semibold text-neutral-900 flex items-center gap-2 mb-4"><ListChecks className="w-5 h-5 text-indigo-600" /> Full Activity Timeline</h2>
        <div className="space-y-3">
          {timeline.length === 0 ? <p className="text-sm text-neutral-500">No timeline activity yet.</p> : timeline.map((event, index) => (
            <div key={`${event.type}-${index}`} className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <p className="font-medium text-neutral-900">{event.title}</p>
                <p className="text-xs text-neutral-400">{event.createdAt}</p>
              </div>
              {event.detail && <p className="text-sm text-neutral-500 mt-1">{event.detail}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
