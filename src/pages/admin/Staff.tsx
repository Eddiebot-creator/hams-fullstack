import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Mail, Search, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { SelectMenu } from "@/src/components/ui/select-menu";
import { api, type StaffUser } from "@/src/lib/api";
import { showToast } from "@/src/components/ui/toast";
import { CardSkeleton } from "@/src/components/ui/skeleton";

export default function AdminStaff() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", role: "kitchen" as "kitchen" | "laundry" | "admin", status: "Active" });

  useEffect(() => {
    api.staff().then(setStaff).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  const filteredStaff = useMemo(() => {
    const query = search.toLowerCase();
    return staff.filter((member) => {
      const matchesSearch = member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query);
      const matchesRole = roleFilter === "All" || member.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [roleFilter, search, staff]);

  const saveStaff = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    try {
      const created = await api.createStaff(form);
      setStaff((current) => [...current, created]);
      setForm({ name: "", email: "", role: "kitchen", status: "Active" });
      setIsAdding(false);
      setMessage("Staff account created.");
      showToast("Staff account created.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to create staff account.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Manage Staff</h1>
        <Button onClick={() => setIsAdding((value) => !value)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {message && <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-800">{message}</div>}

      {isAdding && (
        <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} onSubmit={saveStaff} className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
          <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-4">
            <h2 className="text-base font-semibold text-neutral-900">New staff account</h2>
            <p className="text-sm text-neutral-500">Default password is password.</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-5">
            <Input required placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <Input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <SelectMenu value={form.role} onChange={(value) => setForm({ ...form, role: value as "kitchen" | "laundry" | "admin" })} label="Role" className="min-w-0" options={[
              { value: "kitchen", label: "Kitchen", description: "Meal scanner access" },
              { value: "laundry", label: "Laundry", description: "Laundry tools" },
              { value: "admin", label: "Admin", description: "Full management" },
            ]} />
            <SelectMenu value={form.status} onChange={(value) => setForm({ ...form, status: value })} label="Status" className="min-w-0" options={[
              { value: "Active", label: "Active", description: "Can sign in" },
              { value: "Inactive", label: "Inactive", description: "Access paused" },
            ]} />
          </div>
          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">{isSaving ? "Saving..." : "Save Staff"}</Button>
          </div>
        </motion.form>
      )}

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-neutral-400" />
          </div>
          <Input placeholder="Search staff name or email..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10 bg-neutral-50 border-neutral-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 rounded-lg w-full" />
        </div>
        <SelectMenu value={roleFilter} onChange={setRoleFilter} label="Role" className="w-full sm:w-56" options={[
          { value: "All", label: "All roles", description: "Every staff type" },
          { value: "kitchen", label: "Kitchen", description: "Kitchen staff" },
          { value: "laundry", label: "Laundry", description: "Laundry staff" },
          { value: "admin", label: "Admin", description: "Administrators" },
        ]} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredStaff.map((member) => (
          <div key={member.id} className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-neutral-900">{member.name}</p>
                <p className="text-sm text-neutral-500 flex items-center gap-2 mt-2"><Mail className="w-4 h-4" />{member.email}</p>
              </div>
              <span className="rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-semibold capitalize">{member.role}</span>
            </div>
            <p className="mt-4 text-sm text-neutral-600 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-600" />{member.status}</p>
            <Link to={`/admin/users/${member.id}`} className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-900">View history</Link>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
