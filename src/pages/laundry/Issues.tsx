import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { SelectMenu } from "@/src/components/ui/select-menu";
import { api, type LaundryBasket, type LaundryIssue } from "@/src/lib/api";
import { showToast } from "@/src/components/ui/toast";

export default function LaundryIssues() {
  const [issues, setIssues] = useState<LaundryIssue[]>([]);
  const [baskets, setBaskets] = useState<LaundryBasket[]>([]);
  const [form, setForm] = useState({ basketId: "", issueType: "Damaged item", notes: "" });

  const load = () => {
    api.laundryIssues().then((data) => setIssues(data.items)).catch(console.error);
    api.laundryBaskets().then(setBaskets).catch(console.error);
  };

  useEffect(load, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.createLaundryIssue({ basketId: Number(form.basketId), issueType: form.issueType, notes: form.notes });
      setForm({ basketId: "", issueType: "Damaged item", notes: "" });
      showToast("Laundry issue saved and admin notified.");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to save issue.", "error");
    }
  };

  const resolveIssue = async (id: number) => {
    await api.updateLaundryIssue(id, { status: "Resolved" });
    showToast("Issue marked resolved.");
    load();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Laundry Issues</h1>
        <p className="text-sm text-neutral-500 mt-1">Record damaged, missing, delayed, or special-case laundry problems.</p>
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
        <SelectMenu value={form.basketId} onChange={(value) => setForm({ ...form, basketId: value })} label="Basket" className="min-w-0" options={[
          { value: "", label: "Select basket", description: "Choose record" },
          ...baskets.map((basket) => ({ value: String(basket.id), label: `#${basket.basketCode}`, description: basket.studentId })),
        ]} />
        <SelectMenu value={form.issueType} onChange={(value) => setForm({ ...form, issueType: value })} label="Issue type" className="min-w-0" options={[
          { value: "Damaged item", label: "Damaged item", description: "Item needs review" },
          { value: "Missing item", label: "Missing item", description: "Item not found" },
          { value: "Delayed basket", label: "Delayed basket", description: "Taking too long" },
          { value: "Wrong basket", label: "Wrong basket", description: "Mismatch found" },
        ]} />
        <Input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Issue notes" />
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white"><AlertTriangle className="w-4 h-4" /> Save Issue</Button>
      </form>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm divide-y divide-neutral-100">
        {issues.length === 0 ? <p className="p-8 text-center text-sm text-neutral-500">No issues reported.</p> : issues.map((issue) => (
          <div key={issue.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="font-semibold text-neutral-900">{issue.issueType} on basket #{issue.basketCode}</p>
              <p className="text-sm text-neutral-500">{issue.studentId} - {issue.reportedBy} - {issue.status}</p>
              {issue.notes && <p className="text-sm text-neutral-600 mt-1">{issue.notes}</p>}
            </div>
            {issue.status === "Open" && <Button size="sm" variant="outline" onClick={() => resolveIssue(issue.id)}>Mark resolved</Button>}
          </div>
        ))}
      </div>
    </div>
  );
}
