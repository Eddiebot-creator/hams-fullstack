import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Clock, Download, Edit2, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { SelectMenu } from "@/src/components/ui/select-menu";
import { api, type Meal } from "@/src/lib/api";
import { CardSkeleton } from "@/src/components/ui/skeleton";
import { showToast } from "@/src/components/ui/toast";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";

const emptyForm = {
  type: "Breakfast",
  startTime: "06:30 AM",
  endTime: "08:45 AM",
  menu: "",
  status: "Upcoming",
};

export default function AdminMeals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [mealToDelete, setMealToDelete] = useState<Meal | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    api.meals().then(setMeals).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  const filteredMeals = useMemo(() => {
    const query = search.toLowerCase();
    return meals.filter((meal) => {
      const matchesSearch = meal.type.toLowerCase().includes(query) || meal.menu.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || meal.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [meals, search, statusFilter]);

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  };

  const startEdit = (meal: Meal) => {
    setForm({
      type: meal.type,
      startTime: meal.startTime,
      endTime: meal.endTime,
      menu: meal.menu,
      status: meal.status,
    });
    setEditingId(meal.id);
    setIsEditing(true);
    setError("");
  };

  const handleSaveMeal = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const meal = editingId ? await api.updateMeal(editingId, form) : await api.createMeal(form);
      setMeals((current) => editingId ? current.map((item) => item.id === editingId ? meal : item) : [...current, meal]);
      resetForm();
      setIsEditing(false);
      showToast(editingId ? "Meal updated." : "Meal added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save meal.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMeal = async (meal: Meal) => {
    try {
      await api.deleteMeal(meal.id);
      setMeals((current) => current.filter((item) => item.id !== meal.id));
      setMealToDelete(null);
      showToast("Meal deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete meal.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Manage Meals</h1>
        <div className="flex items-center gap-3">
          <a href={api.exportUrl("meals")} download>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </a>
          <Button onClick={() => { resetForm(); setIsEditing((value) => !value); }} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Meal
          </Button>
        </div>
      </div>

      {isEditing && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSaveMeal}
          className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden"
        >
          <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-neutral-900">{editingId ? "Edit meal" : "New meal"}</h2>
                <p className="text-sm text-neutral-500">Set meal windows and menu details for kitchen scanning.</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
              <label className="space-y-2">
                <SelectMenu value={form.type} onChange={(value) => {
                  updateForm("type", value);
                  if (value === "Breakfast") {
                    setForm((current) => ({ ...current, type: value, startTime: "06:30 AM", endTime: "08:45 AM" }));
                  } else {
                    setForm((current) => ({ ...current, type: value, startTime: "05:00 PM", endTime: "07:45 PM" }));
                  }
                }} label="Meal type" className="min-w-0" options={[
                  { value: "Breakfast", label: "Breakfast", description: "6:30 AM - 8:45 AM" },
                  { value: "Dinner", label: "Dinner", description: "5:00 PM - 7:45 PM" },
                ]} />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neutral-400" />
                  Start time
                </span>
                <Input required placeholder="07:30 AM" value={form.startTime} onChange={(event) => updateForm("startTime", event.target.value)} />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neutral-400" />
                  End time
                </span>
                <Input required placeholder="09:30 AM" value={form.endTime} onChange={(event) => updateForm("endTime", event.target.value)} />
              </label>

              <label className="space-y-2">
                <SelectMenu value={form.status} onChange={(value) => updateForm("status", value)} label="Status" className="min-w-0" options={[
                  { value: "Completed", label: "Completed", description: "Meal is finished" },
                  { value: "Active", label: "Active", description: "Scanning open" },
                  { value: "Upcoming", label: "Upcoming", description: "Scheduled later" },
                ]} />
              </label>

              <label className="space-y-2 md:col-span-2 xl:col-span-1">
                <span className="text-sm font-medium text-neutral-700">Menu</span>
                <Input required placeholder="Rice, chicken, salad" value={form.menu} onChange={(event) => updateForm("menu", event.target.value)} />
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { resetForm(); setIsEditing(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isSaving ? "Saving..." : editingId ? "Update Meal" : "Save Meal"}
            </Button>
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
              placeholder="Search meal or menu..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10 bg-neutral-50 border-neutral-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 rounded-lg w-full"
            />
          </div>
          <SelectMenu value={statusFilter} onChange={setStatusFilter} label="Status" className="w-full sm:w-56" options={[
            { value: "All", label: "All statuses", description: "Every meal" },
            { value: "Completed", label: "Completed", description: "Finished meals" },
            { value: "Active", label: "Active", description: "Currently open" },
            { value: "Upcoming", label: "Upcoming", description: "Scheduled meals" },
          ]} />
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
        <>
        <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
          {filteredMeals.map((meal) => (
            <div key={meal.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-900">{meal.type}</p>
                  <p className="text-sm text-neutral-500">{meal.startTime} - {meal.endTime}</p>
                </div>
                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  meal.status === 'Active' ? 'bg-green-100 text-green-800' :
                  meal.status === 'Upcoming' ? 'bg-indigo-100 text-indigo-800' :
                  'bg-neutral-100 text-neutral-800'
                }`}>
                  {meal.status}
                </span>
              </div>
              <p className="text-sm text-neutral-600 mt-3">{meal.menu}</p>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => startEdit(meal)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => setMealToDelete(meal)}>Delete</Button>
              </div>
            </div>
          ))}
          {filteredMeals.length === 0 && <p className="text-sm text-neutral-500 text-center py-8">No meals match your search.</p>}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Meal Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Time Window</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Menu Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredMeals.map((meal) => (
                <tr key={meal.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{meal.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{meal.startTime} - {meal.endTime}</td>
                  <td className="px-6 py-4 text-sm text-neutral-500 truncate max-w-xs">{meal.menu}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      meal.status === 'Active' ? 'bg-green-100 text-green-800' :
                      meal.status === 'Upcoming' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-neutral-100 text-neutral-800'
                    }`}>
                      {meal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => startEdit(meal)} className="text-indigo-600 hover:text-indigo-900 mr-3" title="Edit meal">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setMealToDelete(meal)} className="text-red-600 hover:text-red-900" title="Delete meal">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredMeals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-neutral-500">No meals yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>
      <ConfirmDialog
        open={!!mealToDelete}
        title="Delete meal?"
        message={mealToDelete ? `This removes ${mealToDelete.type} and related scan records.` : ""}
        confirmLabel="Delete meal"
        onCancel={() => setMealToDelete(null)}
        onConfirm={() => mealToDelete && handleDeleteMeal(mealToDelete)}
      />
    </div>
  );
}
