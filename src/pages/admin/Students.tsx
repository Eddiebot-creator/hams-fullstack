import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { BookOpen, Building2, Download, Edit2, IdCard, Mail, Phone, Search, Trash2, User, UserPlus } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { api, type Student } from "@/src/lib/api";
import { paginate } from "@/src/lib/pagination";
import { CardSkeleton } from "@/src/components/ui/skeleton";
import { showToast } from "@/src/components/ui/toast";

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    studentId: "",
    email: "",
    hostel: "",
    room: "",
    course: "",
    level: "",
    phone: "",
    status: "Active",
  });

  useEffect(() => {
    api.students().then(setStudents).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const query = search.toLowerCase();
        const matchesSearch =
          student.name.toLowerCase().includes(query) ||
          student.studentId.includes(search) ||
          student.email.toLowerCase().includes(query) ||
          student.hostel.toLowerCase().includes(query);
        const matchesStatus = statusFilter === "All" || student.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [search, statusFilter, students]
  );
  const pagedStudents = paginate<Student>(filteredStudents, page, 8);

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      studentId: "",
      email: "",
      hostel: "",
      room: "",
      course: "",
      level: "",
      phone: "",
      status: "Active",
    });
    setEditingId(null);
  };

  const startEdit = (student: Student) => {
    setForm({
      name: student.name,
      studentId: student.studentId,
      email: student.email,
      hostel: student.hostel,
      room: student.room ?? "",
      course: student.course,
      level: student.level,
      phone: student.phone ?? "",
      status: student.status,
    });
    setEditingId(student.id);
    setIsAdding(true);
    setError("");
  };

  const handleAddStudent = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const student = editingId ? await api.updateStudent(editingId, form) : await api.createStudent(form);
      setStudents((current) => {
        const next = editingId ? current.map((item) => item.id === editingId ? student : item) : [...current, student];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      resetForm();
      setIsAdding(false);
      showToast(editingId ? "Student updated." : "Student added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add student.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!window.confirm(`Delete ${student.name}? This removes the student record and related meal/laundry records.`)) return;

    try {
      await api.deleteStudent(student.id);
      setStudents((current) => current.filter((item) => item.id !== student.id));
      showToast("Student deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete student.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Manage Students</h1>
        <div className="flex items-center gap-3">
          <a href={api.exportUrl("students")} download>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </a>
          <Button onClick={() => setIsAdding((value) => !value)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {isAdding && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAddStudent}
          className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden"
        >
          <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-neutral-900">{editingId ? "Edit student profile" : "New student profile"}</h2>
                <p className="text-sm text-neutral-500">Fill the key details used for login, hostel records, meals, and laundry.</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-neutral-400" />
                  Full name
                </span>
                <Input required placeholder="Samuel Tokunbo" value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
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
                  <Mail className="w-4 h-4 text-neutral-400" />
                  Email address
                </span>
                <Input required type="email" placeholder="student@nileuniversity.edu.ng" value={form.email} onChange={(event) => updateForm("email", event.target.value)} />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-neutral-400" />
                  Hostel and room
                </span>
                <Input required placeholder="Blue Nile, Room 402" value={form.hostel} onChange={(event) => updateForm("hostel", event.target.value)} />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700">Room</span>
                <Input placeholder="Room 402" value={form.room} onChange={(event) => updateForm("room", event.target.value)} />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-neutral-400" />
                  Course
                </span>
                <Input required placeholder="Computer Science" value={form.course} onChange={(event) => updateForm("course", event.target.value)} />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700">Level</span>
                <Input required placeholder="200 Lv" value={form.level} onChange={(event) => updateForm("level", event.target.value)} />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-neutral-400" />
                  Phone
                </span>
                <Input placeholder="+234 809 000 0000" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700">Account status</span>
                <select
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                  className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-neutral-500">Default password for new students is password.</p>
            <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setIsAdding(false); setError(""); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isSaving ? "Saving..." : editingId ? "Update Student" : "Save Student"}
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
              placeholder="Search by Name or Student ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10 bg-neutral-50 border-neutral-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 rounded-lg w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="flex h-10 w-full sm:w-44 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
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
          {pagedStudents.items.map((student) => (
            <div key={student.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-900">{student.name}</p>
                  <p className="text-sm text-neutral-500 font-mono">{student.studentId}</p>
                </div>
                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  student.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {student.status}
                </span>
              </div>
              <p className="text-sm text-neutral-500 mt-3">{student.email}</p>
              <p className="text-sm text-neutral-500">{student.room ? `${student.hostel}, ${student.room}` : student.hostel}</p>
              <div className="flex gap-2 mt-4">
                <Link to={`/admin/users/${student.id}`}>
                  <Button size="sm" variant="outline">History</Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => startEdit(student)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDeleteStudent(student)}>Delete</Button>
              </div>
            </div>
          ))}
          {pagedStudents.items.length === 0 && <p className="text-sm text-neutral-500 text-center py-8">No students match your search.</p>}
        </div>

        <div className="hidden overflow-x-auto md:block">
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
              {pagedStudents.items.map((student, i) => (
                <tr key={i} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 font-mono">{student.studentId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{student.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{student.room ? `${student.hostel}, ${student.room}` : student.hostel}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      student.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link to={`/admin/users/${student.id}`} className="text-neutral-600 hover:text-neutral-900 mr-3">History</Link>
                    <button onClick={() => startEdit(student)} className="text-indigo-600 hover:text-indigo-900 mr-3" title="Edit student">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeleteStudent(student)} className="text-red-600 hover:text-red-900" title="Delete student">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between">
          <p className="text-sm text-neutral-500">Page {pagedStudents.page} of {pagedStudents.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagedStudents.page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={pagedStudents.page === pagedStudents.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
