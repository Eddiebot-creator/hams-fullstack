import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { CalendarDays, Clock, Download, Edit2, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { SelectMenu } from "@/src/components/ui/select-menu";
import { api, type Meal } from "@/src/lib/api";
import { CardSkeleton } from "@/src/components/ui/skeleton";
import { showToast } from "@/src/components/ui/toast";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const emptyForm = {
  weekday: "Monday",
  type: "Breakfast",
  startTime: "06:30 AM",
  endTime: "08:45 AM",
  menu: "",
  status: "Upcoming",
};

const dayOrder = new Map(weekdays.map((day, index) => [day, index]));

export default function AdminMeals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dayFilter, setDayFilter] = useState("All");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [mealToDelete, setMealToDelete] = useState<Meal | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  const loadMeals = () => {
    setIsLoading(true);
    api.meals().then(setMeals).catch(console.error).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadMeals();
  }, []);

  const filteredMeals = useMemo(() => {
    const query = search.toLowerCase();
    return meals
      .filter((meal) => {
        const weekday = meal.weekday ?? "Monday";
        const matchesSearch = meal.type.toLowerCase().includes(query) || meal.menu.toLowerCase().includes(query) || weekday.toLowerCase().includes(query);
        const matchesStatus = statusFilter === "All" || meal.status === statusFilter;
        const matchesDay = dayFilter === "All" || weekday === dayFilter;
        return matchesSearch && matchesStatus && matchesDay;
      })
      .sort((a, b) => (dayOrder.get(a.weekday ?? "Monday") ?? 99) - (dayOrder.get(b.weekday ?? "Monday") ?? 99) || a.type.localeCompare(b.type));
  }, [meals, search, statusFilter, dayFilter]);

  const groupedMeals = weekdays.map((weekday) => ({
    weekday,
    meals: filteredMeals.filter((meal) => (meal.weekday ?? "Monday") === weekday),
  })).filter((group) => dayFilter === "All" || group.weekday === dayFilter);

  const updateForm = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  };

  const startEdit = (meal: Meal) => {
    setForm({
      weekday: meal.weekday ?? "Monday",
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Manage Meals</h1>
          <p className="mt-1 text-sm font-medium text-neutral-600">Plan and edit hostel meals from Monday to Sunday.</p>
        </div>
        <div className="flex items-center gap-3">
          <a href={api.exportUrl("meals")} download>
            <Button variant="outline"><Download className="w-4 h-4 mr-2" />Export</Button>
          </a>
          <Button onClick={() => { setIsEditing((value) => !value); if (!isEditing) resetForm(); }} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-2" />Add Meal
          </Button>
        </div>
      </div>

      {isEditing && (
        <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSaveMeal} className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-visible">
          <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center"><UtensilsCrossed className="w-5 h-5 text-indigo-600" /></div>
              <div>
                <h2 className="text-base font-semibold text-neutral-900">{editingId ? "Edit meal" : "Add weekday meal"}</h2>
                <p className="text-sm text-neutral-600">Choose a day, meal window, time, menu, and status.</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <SelectMenu value={form.weekday} onChange={(value) => updateForm("weekday", value)} label="Weekday" options={weekdays.map((day) => ({ value: day, label: day }))} />
              <SelectMenu value={form.type} onChange={(value) => updateForm("type", value)} label="Meal" options={[{ value: "Breakfast", label: "Breakfast", description: "Morning meal" }, { value: "Dinner", label: "Dinner", description: "Evening meal" }]} />
              <SelectMenu value={form.status} onChange={(value) => updateForm("status", value)} label="Status" options={[{ value: "Upcoming", label: "Upcoming" }, { value: "Active", label: "Active" }, { value: "Completed", label: "Completed" }, { value: "Unavailable", label: "Unavailable" }]} />
              <label className="space-y-2"><span className="text-sm font-medium text-neutral-700 flex items-center gap-2"><Clock className="w-4 h-4 text-neutral-400" />Start time</span><Input required value={form.startTime} onChange={(event) => updateForm("startTime", event.target.value)} /></label>
              <label className="space-y-2"><span className="text-sm font-medium text-neutral-700 flex items-center gap-2"><Clock className="w-4 h-4 text-neutral-400" />End time</span><Input required value={form.endTime} onChange={(event) => updateForm("endTime", event.target.value)} /></label>
              <label className="space-y-2 md:col-span-2 xl:col-span-3"><span className="text-sm font-medium text-neutral-700 flex items-center gap-2"><UtensilsCrossed className="w-4 h-4 text-neutral-400" />Menu</span><Input required placeholder="Rice, stew, protein, vegetables" value={form.menu} onChange={(event) => updateForm("menu", event.target.value)} /></label>
            </div>
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
          </div>
          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-neutral-600">Meals are grouped by weekday so admin can update each day separately.</p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setIsEditing(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">{isSaving ? "Saving..." : editingId ? "Update Meal" : "Save Meal"}</Button>
            </div>
          </div>
        </motion.form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-visible">
        <div className="p-4 sm:p-6 border-b border-neutral-100 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(18rem,1fr)_12rem_12rem] lg:items-end">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-neutral-400" /></div>
            <Input type="search" placeholder="Search meal, weekday, or menu..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10 bg-neutral-50 border-neutral-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 rounded-lg w-full" />
          </div>
          <SelectMenu value={dayFilter} onChange={setDayFilter} label="Day" className="min-w-0" options={[{ value: "All", label: "All days" }, ...weekdays.map((day) => ({ value: day, label: day }))]} />
          <SelectMenu value={statusFilter} onChange={setStatusFilter} label="Status" className="min-w-0" options={[{ value: "All", label: "All statuses" }, { value: "Upcoming", label: "Upcoming" }, { value: "Active", label: "Active" }, { value: "Completed", label: "Completed" }, { value: "Unavailable", label: "Unavailable" }]} />
        </div>

        {isLoading ? (
          <div className="p-6 grid gap-4 md:grid-cols-2"><CardSkeleton /><CardSkeleton /></div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {groupedMeals.map((group) => (
              <section key={group.weekday} className="p-4 sm:p-6">
                <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-indigo-600" /><h2 className="text-lg font-black text-neutral-900">{group.weekday}</h2></div>
                {group.meals.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm font-medium text-neutral-600">No meals found for this day/filter.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {group.meals.map((meal) => (
                      <div key={meal.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">{meal.type}</p>
                            <h3 className="mt-1 text-base font-black text-neutral-900">{meal.menu}</h3>
                            <p className="mt-2 text-sm font-semibold text-neutral-700">{meal.startTime} - {meal.endTime}</p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-800 shadow-sm border border-neutral-200">{meal.status}</span>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(meal)}><Edit2 className="mr-2 h-4 w-4" />Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => setMealToDelete(meal)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog open={!!mealToDelete} title="Delete meal?" message={mealToDelete ? `This removes ${mealToDelete.type} for ${mealToDelete.weekday ?? "Monday"}.` : ""} confirmLabel="Delete meal" onCancel={() => setMealToDelete(null)} onConfirm={() => mealToDelete && handleDeleteMeal(mealToDelete)} />
    </div>
  );
}
