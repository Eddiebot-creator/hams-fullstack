import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { CalendarClock, ClipboardList, Download, Edit2, IdCard, PackagePlus, Search, Filter, StickyNote, Trash2, UserRound } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { SelectMenu } from "@/src/components/ui/select-menu";
import { api, type LaundryBasket } from "@/src/lib/api";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";

const basketStatusOptions = [
  { value: "Pending Approval", label: "Pending Approval", description: "Needs admin approval" },
  { value: "Pending", label: "Pending", description: "Waiting to start" },
  { value: "Washing", label: "Washing", description: "Currently washing" },
  { value: "Ready", label: "Ready", description: "Ready for pickup" },
  { value: "Picked Up", label: "Picked Up", description: "Returned to student" },
];

function BasketStatusSelect({
  value,
  onChange,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <SelectMenu
      value={value}
      onChange={onChange}
      options={basketStatusOptions}
      className={compact ? "min-w-0 w-44" : "min-w-0 w-full sm:w-52"}
    />
  );
}

export default function LaundryBaskets() {
  const [baskets, setBaskets] = useState<LaundryBasket[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [basketToDelete, setBasketToDelete] = useState<LaundryBasket | null>(null);
  const [form, setForm] = useState({
    basketCode: "",
    studentId: "",
    clothesCount: "1",
    status: "Pending",
    receivedAt: "",
    estimatedFinish: "",
    notes: "",
    staffName: "",
  });

  useEffect(() => {
    api.laundryBaskets().then(setBaskets).catch(console.error);
  }, []);

  const filteredBaskets = useMemo(
    () =>
      baskets.filter((basket) => {
        const query = search.toLowerCase();
        const matchesSearch =
          basket.basketCode.toLowerCase().includes(query) ||
          basket.studentId.toLowerCase().includes(query) ||
          basket.status.toLowerCase().includes(query);
        const matchesStatus = statusFilter === "All" || basket.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [baskets, search, statusFilter]
  );

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      basketCode: "",
      studentId: "",
      clothesCount: "1",
      status: "Pending",
      receivedAt: "",
      estimatedFinish: "",
      notes: "",
      staffName: "",
    });
    setEditingId(null);
  };

  const startEdit = (basket: LaundryBasket) => {
    setForm({
      basketCode: basket.basketCode,
      studentId: basket.studentId,
      clothesCount: String(basket.clothesCount ?? 1),
      status: basket.status,
      receivedAt: basket.receivedAt,
      estimatedFinish: basket.estimatedFinish ?? "",
      notes: basket.notes ?? "",
      staffName: "",
    });
    setEditingId(basket.id);
    setIsAdding(true);
    setError("");
  };

  const handleAddBasket = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        clothesCount: Math.min(30, Math.max(1, Number(form.clothesCount) || 1)),
      };
      const basket = editingId ? await api.updateLaundryBasket(editingId, payload) : await api.createLaundryBasket(payload);
      setBaskets((current) => editingId ? current.map((item) => item.id === editingId ? basket : item) : [basket, ...current]);
      resetForm();
      setIsAdding(false);
      setMessage(editingId ? "Basket updated." : "Basket added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add basket.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBasket = async (basket: LaundryBasket) => {
    try {
      await api.deleteLaundryBasket(basket.id);
      setBaskets((current) => current.filter((item) => item.id !== basket.id));
      setBasketToDelete(null);
      setMessage(`Basket #${basket.basketCode} deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete basket.");
    }
  };


  const changeBasketStatus = async (basket: LaundryBasket, status: string) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("hamsUser") || "{}");
      const updated = await api.updateLaundryBasketStatus(basket.id, {
        status,
        staffName: storedUser.name || "Laundry Staff",
      });
      setBaskets((current) => current.map((item) => item.id === basket.id ? updated : item));
      setMessage(`Basket #${basket.basketCode} moved to ${status}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update basket status.");
    }
  };

  const approveBasket = async (basket: LaundryBasket) => {
    try {
      const updated = await api.updateLaundryBasket(basket.id, {
        basketCode: basket.basketCode,
        studentId: basket.studentId,
        clothesCount: basket.clothesCount,
        status: "Pending",
        receivedAt: basket.receivedAt,
        estimatedFinish: basket.estimatedFinish ?? "",
        notes: basket.notes ?? "Approved by laundry staff",
        staffName: "Laundry Staff",
      });
      setBaskets((current) => current.map((item) => item.id === basket.id ? updated : item));
      setMessage(`Basket #${basket.basketCode} approved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve basket.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Manage Baskets</h1>
        <div className="flex items-center gap-3">
          <a href={api.exportUrl("baskets")} download>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </a>
          <Button onClick={() => setIsAdding((value) => !value)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <PackagePlus className="w-4 h-4 mr-2" />
            Add Basket
          </Button>
        </div>
      </div>

      {message && <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">{message}</div>}

      {isAdding && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAddBasket}
          className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-visible"
        >
          <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <PackagePlus className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-neutral-900">{editingId ? "Edit laundry basket" : "New laundry basket"}</h2>
                <p className="text-sm text-neutral-500">Register a drop-off and add it to laundry activity in one step.</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-neutral-400" />
                  Basket ID
                </span>
                <Input required placeholder="1050" value={form.basketCode} onChange={(event) => updateForm("basketCode", event.target.value)} />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-neutral-400" />
                  Student ID
                </span>
                <Input required placeholder="240011223" value={form.studentId} onChange={(event) => updateForm("studentId", event.target.value)} />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-neutral-400" />
                  Clothes count
                </span>
                <Input
                  required
                  type="number"
                  min={1}
                  max={30}
                  inputMode="numeric"
                  placeholder="Max 30"
                  value={form.clothesCount}
                  onChange={(event) => updateForm("clothesCount", String(Math.min(30, Math.max(1, Number(event.target.value) || 1))))}
                />
              </label>

              <label className="space-y-2">
                <SelectMenu value={form.status} onChange={(value) => updateForm("status", value)} label="Basket status" className="min-w-0" options={[
                  { value: "Pending", label: "Pending", description: "Waiting to begin" },
                  { value: "Pending Approval", label: "Pending Approval", description: "Needs admin approval" },
                  { value: "Washing", label: "Washing", description: "In progress" },
                  { value: "Ready", label: "Ready", description: "Ready for pickup" },
                  { value: "Picked Up", label: "Picked Up", description: "Returned to student" },
                ]} />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-neutral-400" />
                  Received time
                </span>
                <Input required placeholder="Today, 11:30 AM" value={form.receivedAt} onChange={(event) => updateForm("receivedAt", event.target.value)} />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-neutral-400" />
                  Estimated finish
                </span>
                <Input placeholder="Today, 4:00 PM" value={form.estimatedFinish} onChange={(event) => updateForm("estimatedFinish", event.target.value)} />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                  <UserRound className="w-4 h-4 text-neutral-400" />
                  Staff name
                </span>
                <Input placeholder="Laundry Staff" value={form.staffName} onChange={(event) => updateForm("staffName", event.target.value)} />
              </label>

              <label className="space-y-2 md:col-span-2 xl:col-span-3">
                <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-neutral-400" />
                  Notes
                </span>
                <Input placeholder="Optional note, machine assignment, or special care instruction" value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} />
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-neutral-500">Saving a basket also records a Received activity entry.</p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setIsAdding(false); setError(""); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isSaving ? "Saving..." : editingId ? "Update Basket" : "Save Basket"}
              </Button>
            </div>
          </div>
        </motion.form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-visible">
        <div className="p-4 sm:p-6 border-b border-neutral-100 grid grid-cols-1 gap-3 min-[560px]:grid-cols-[minmax(0,1fr)_minmax(10.5rem,13rem)] sm:grid-cols-[minmax(18rem,32rem)_minmax(15rem,20rem)] sm:items-end sm:justify-between">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <Input
              type="search"
              placeholder="Search by Basket ID or Student ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onInput={(event) => setSearch(event.currentTarget.value)}
              className="pl-10 bg-neutral-50 border-neutral-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 rounded-lg w-full"
            />
          </div>
          <div className="flex items-end gap-2 w-full min-w-0">
            <Filter className="mb-4 hidden w-4 h-4 text-neutral-400 sm:block" />
            <SelectMenu
              value={statusFilter}
              onChange={setStatusFilter}
              label="Status"
              className="min-w-0 w-full"
              options={[{ value: "All", label: "All statuses", description: "Every basket" }, ...basketStatusOptions]}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
          {filteredBaskets.map((basket) => (
            <div key={basket.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-900 font-mono">#{basket.basketCode}</p>
                  <p className="text-sm text-neutral-500 font-mono">{basket.studentId}</p>
                </div>
                <BasketStatusSelect
                  value={basket.status}
                  onChange={(value) => changeBasketStatus(basket, value)}
                  compact
                />
              </div>
              <p className="text-sm text-neutral-500 mt-3">{basket.receivedAt}</p>
              {basket.notes && <p className="text-sm text-neutral-600 mt-2">{basket.notes}</p>}
              <div className="flex flex-wrap gap-2 mt-4">
                {basket.status === "Pending Approval" && <Button size="sm" onClick={() => approveBasket(basket)} className="bg-green-600 hover:bg-green-700 text-white">Approve</Button>}
                <Button size="sm" variant="outline" onClick={() => startEdit(basket)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => setBasketToDelete(basket)}>Delete</Button>
              </div>
            </div>
          ))}
          {filteredBaskets.length === 0 && <p className="text-sm text-neutral-500 text-center py-8">No baskets match your search.</p>}
        </div>

        <div className="hidden overflow-visible md:block">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Basket ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Received</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredBaskets.map((basket, i) => (
                <tr key={i} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 font-mono">#{basket.basketCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 font-mono">{basket.studentId}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                <BasketStatusSelect
                  value={basket.status}
                  onChange={(value) => changeBasketStatus(basket, value)}
                  compact
                />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-neutral-700">{basket.receivedAt}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {basket.status === "Pending Approval" && (
                      <button onClick={() => approveBasket(basket)} className="text-green-700 hover:text-green-900 mr-3 font-semibold">
                        Approve
                      </button>
                    )}
                    <button onClick={() => startEdit(basket)} className="text-indigo-600 hover:text-indigo-900 mr-3" title="Edit basket">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setBasketToDelete(basket)} className="text-red-600 hover:text-red-900" title="Delete basket">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialog
        open={!!basketToDelete}
        title="Delete basket?"
        message={basketToDelete ? `This removes basket #${basketToDelete.basketCode} from the laundry records.` : ""}
        confirmLabel="Delete basket"
        onCancel={() => setBasketToDelete(null)}
        onConfirm={() => basketToDelete && handleDeleteBasket(basketToDelete)}
      />
    </div>
  );
}
