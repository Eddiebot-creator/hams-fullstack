import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Search, UserPlus, MoreVertical } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { api, type Student } from "@/src/lib/api";

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    studentId: "",
    email: "",
    hostel: "",
    course: "",
    level: "",
    phone: "",
    status: "Active",
  });

  useEffect(() => {
    api.students().then(setStudents).catch(console.error);
  }, []);

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const query = search.toLowerCase();
        return student.name.toLowerCase().includes(query) || student.studentId.includes(search);
      }),
    [search, students]
  );

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      studentId: "",
      email: "",
      hostel: "",
      course: "",
      level: "",
      phone: "",
      status: "Active",
    });
  };

  const handleAddStudent = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const student = await api.createStudent(form);
      setStudents((current) => [...current, student].sort((a, b) => a.name.localeCompare(b.name)));
      resetForm();
      setIsAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add student.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Manage Students</h1>
        <Button onClick={() => setIsAdding((value) => !value)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Student
        </Button>
      </div>

      {isAdding && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAddStudent}
          className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input required placeholder="Full name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
            <Input required placeholder="Student ID" value={form.studentId} onChange={(event) => updateForm("studentId", event.target.value)} />
            <Input required type="email" placeholder="Email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} />
            <Input required placeholder="Hostel / Room" value={form.hostel} onChange={(event) => updateForm("hostel", event.target.value)} />
            <Input required placeholder="Course" value={form.course} onChange={(event) => updateForm("course", event.target.value)} />
            <Input required placeholder="Level" value={form.level} onChange={(event) => updateForm("level", event.target.value)} />
            <Input placeholder="Phone" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} />
            <select
              value={form.status}
              onChange={(event) => updateForm("status", event.target.value)}
              className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setIsAdding(false); setError(""); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isSaving ? "Saving..." : "Save Student"}
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
              type="text"
              placeholder="Search by Name or Student ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10 bg-neutral-50 border-neutral-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 rounded-lg w-full"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Hostel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredStudents.map((student, i) => (
                <tr key={i} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 font-mono">{student.studentId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{student.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{student.hostel}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      student.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-neutral-400 hover:text-neutral-600">
                      <MoreVertical className="h-5 w-5" />
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
