import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { CalendarClock, ClipboardList, Download, Edit2, IdCard, PackagePlus, Search, Filter, StickyNote, Trash2, UserRound } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { api, type LaundryBasket } from "@/src/lib/api";

export default function LaundryBaskets() {
  const [baskets, setBaskets] = useState<LaundryBasket[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    basketCode: "",
    studentId: "",
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
          basket.basketCode.includes(search) ||
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
      const basket = editingId ? await api.updateLaundryBasket(editingId, form) : await api.createLaundryBasket(form);
      setBaskets((current) => editingId ? current.map((item) => item.id === editingId ? basket : item) : [basket, ...current]);
      resetForm();
      setIsAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add basket.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBasket = async (basket: LaundryBasket) => {
    if (!window.confirm(`Delete basket #${basket.basketCode}?`)) return;

    try {
      await api.deleteLaundryBasket(basket.id);
      setBaskets((current) => current.filter((item) => item.id !== basket.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete basket.");
    }
  };

  const approveBasket = async (basket: LaundryBasket) => {
    try {
      const updated = await api.updateLaundryBasket(basket.id, {
        basketCode: basket.basketCode,
        studentId: basket.studentId,
        status: "Pending",
        receivedAt: basket.receivedAt,
        estimatedFinish: basket.estimatedFinish ?? "",
        notes: basket.notes ?? "Approved by laundry staff",
        staffName: "Laundry Staff",
      });
      setBaskets((current) => current.map((item) => item.id === basket.id ? updated : item));
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

      {isAdding && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAddBasket}
          className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden"
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
                <span className="text-sm font-medium text-neutral-700">Basket status</span>
                <select
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                  className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Washing">Washing</option>
                  <option value="Ready">Ready</option>
                  <option value="Picked Up">Picked Up</option>
                </select>
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

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <Input
              type="text"
              placeholder="Search by Basket ID or Student ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10 bg-neutral-50 border-neutral-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 rounded-lg w-full"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-neutral-400" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="flex h-10 w-full sm:w-48 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <option value="All">All statuses</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Pending">Pending</option>
              <option value="Washing">Washing</option>
              <option value="Ready">Ready</option>
              <option value="Picked Up">Picked Up</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
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
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      basket.status === 'Ready' ? 'bg-green-100 text-green-800' :
                      basket.status === 'Washing' ? 'bg-indigo-100 text-indigo-800' :
                      basket.status === 'Pending' || basket.status === 'Pending Approval' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-neutral-100 text-neutral-800'
                    }`}>
                      {basket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{basket.receivedAt}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {basket.status === "Pending Approval" && (
                      <button onClick={() => approveBasket(basket)} className="text-green-700 hover:text-green-900 mr-3 font-semibold">
                        Approve
                      </button>
                    )}
                    <button onClick={() => startEdit(basket)} className="text-indigo-600 hover:text-indigo-900 mr-3" title="Edit basket">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeleteBasket(basket)} className="text-red-600 hover:text-red-900" title="Delete basket">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
