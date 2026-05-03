import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { api, type ApprovalRequest } from "@/src/lib/api";
import { showToast } from "@/src/components/ui/toast";

export default function AdminApprovals() {
  const [items, setItems] = useState<ApprovalRequest[]>([]);
  const [status, setStatus] = useState("Pending");

  const load = () => {
    api.approvals({ status }).then((data) => setItems(data.items)).catch(console.error);
  };

  useEffect(load, [status]);

  const decide = async (id: number, nextStatus: "Approved" | "Rejected") => {
    try {
      const result = await api.decideApproval(id, { status: nextStatus });
      showToast(result.message);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to update request.", "error");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Approval Queue</h1>
          <p className="text-sm text-neutral-500 mt-1">Review laundry requests, password resets, and reported issues.</p>
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm">
          <option>Pending</option>
          <option>Approved</option>
          <option>Rejected</option>
          <option>All</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm divide-y divide-neutral-100">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-500">No requests found.</p>
        ) : items.map((item) => (
          <div key={item.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="font-semibold text-neutral-900">{item.requestType}</p>
              <p className="text-sm text-neutral-500">{item.entityType} {item.entityRef ? `#${item.entityRef}` : ""} by {item.requestedBy}</p>
              {item.notes && <p className="text-sm text-neutral-600 mt-2">{item.notes}</p>}
            </div>
            {item.status === "Pending" ? (
              <div className="flex gap-2">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => decide(item.id, "Approved")}><CheckCircle2 className="w-4 h-4" /> Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => decide(item.id, "Rejected")}><XCircle className="w-4 h-4" /> Reject</Button>
              </div>
            ) : <span className="text-sm font-semibold text-neutral-500">{item.status}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
