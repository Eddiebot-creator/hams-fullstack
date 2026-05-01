import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { User, Mail, Phone, Building, ShieldCheck } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { api, type Student } from "@/src/lib/api";

export default function Profile() {
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("hamsUser") || "{}");
    const studentId = storedUser.studentId || "240011223";
    api.studentOverview(studentId).then((overview) => setStudent(overview.student)).catch(console.error);
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Student Profile</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden"
      >
        <div className="h-32 bg-indigo-600 relative">
          <div className="absolute -bottom-12 left-8 w-24 h-24 bg-white rounded-full p-1 shadow-md">
            <div className="w-full h-full bg-indigo-100 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-indigo-600" />
            </div>
          </div>
        </div>
        
        <div className="pt-16 pb-8 px-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">{student?.name || "Student"}</h2>
              <p className="text-neutral-500 font-medium">{student ? `${student.course}, ${student.level}` : "Loading profile"}</p>
            </div>
            <Button variant="outline" size="sm">Edit Profile</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <Mail className="w-5 h-5 text-neutral-400 mr-3" />
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Email</p>
                  <p className="font-medium text-neutral-900">{student?.email || "-"}</p>
                </div>
              </div>
              
              <div className="flex items-center p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <Phone className="w-5 h-5 text-neutral-400 mr-3" />
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Phone</p>
                  <p className="font-medium text-neutral-900">{student?.phone || "-"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <Building className="w-5 h-5 text-neutral-400 mr-3" />
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Hostel</p>
                  <p className="font-medium text-neutral-900">{student?.hostel || "-"}</p>
                </div>
              </div>
              
              <div className="flex items-center p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <ShieldCheck className="w-5 h-5 text-neutral-400 mr-3" />
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Student ID</p>
                  <p className="font-medium text-neutral-900 font-mono">{student?.studentId || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
