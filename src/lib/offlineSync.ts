import { api } from "./api";
import { listOfflineActions, removeOfflineAction, retryLater } from "./offlineQueue";

type MealScanPayload = {
  mealId: number;
  studentId: string;
  lateReason?: string;
  qrPayload?: string;
  clientScannedAt: string;
};

type LaundryScanPayload = {
  action: "receive" | "return";
  basketCode: string;
  studentId: string;
  clothesCount?: number;
  qrPayload?: string;
  staffName?: string;
  clientScannedAt: string;
};

export async function syncOfflineQueue() {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const items = await listOfflineActions();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      if (item.kind === "meal-scan") {
        const payload = item.payload as MealScanPayload;
        await api.scanMeal(payload.mealId, payload.studentId, payload.lateReason, payload.qrPayload, payload.clientScannedAt);
      } else {
        await api.scanLaundry(item.payload as LaundryScanPayload);
      }
      await removeOfflineAction(item.id);
      synced += 1;
    } catch {
      await retryLater(item);
      failed += 1;
    }
  }

  return { synced, failed };
}

