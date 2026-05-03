import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { IdCard, CheckCircle2, XCircle, UserRound, Building2, BookOpen } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { SelectMenu } from "@/src/components/ui/select-menu";
import { api, type Meal, type Student } from "@/src/lib/api";
import CameraQrScanner from "@/src/components/scanner/CameraQrScanner";

export default function KitchenScanner() {
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scanMessage, setScanMessage] = useState("Waiting for scan...");
  const [studentId, setStudentId] = useState("240011223");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealId, setMealId] = useState(2);
  const [student, setStudent] = useState<Student | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lateReason, setLateReason] = useState("");

  useEffect(() => {
    api.meals().then((items) => {
      setMeals(items);
      const activeMeal = items.find((meal) => meal.status === "Active") ?? items[0];
      if (activeMeal) setMealId(activeMeal.id);
    }).catch(console.error);
  }, []);

  const verifyStudent = async (id = studentId) => {
    const cleanId = id.trim();
    if (!cleanId) {
      setScanMessage("Enter a student ID before scanning.");
      setScanStatus("error");
      return;
    }

    setIsScanning(true);
    setStudent(null);
    try {
      const result = await api.scanMeal(mealId, cleanId, lateReason.trim() || undefined);
      setStudent(result.student);
      setScanMessage(`${result.meal.type} approved for Student ID: ${result.studentId}`);
      setScanStatus("success");
      navigator.vibrate?.(80);
    } catch (err) {
      setScanMessage(err instanceof Error ? err.message : "Scan denied.");
      setScanStatus("error");
      navigator.vibrate?.([80, 60, 80]);
    } finally {
      setIsScanning(false);
    }

    setTimeout(() => setScanStatus('idle'), 5000);
  };

  const handleQrDetected = (id: string) => {
    setStudentId(id);
    void verifyStudent(id);
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-lg mx-auto space-y-4 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-5 sm:p-8 shadow-xl border border-neutral-100 w-full text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
        
        <h1 className="text-2xl font-bold text-neutral-900 mb-2 mt-4">Meal Scanner</h1>
        <p className="text-neutral-500 mb-8">Scan student QR code to mark meal as taken</p>
        
        <div className="mb-6">
          <CameraQrScanner label="Camera QR meal scanner" onDetected={handleQrDetected} />
        </div>

        {scanStatus === 'idle' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 text-left">
              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-neutral-400" />
                  Student ID from QR
                </span>
                <Input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="240011223" />
              </label>
              <label className="space-y-2">
                <SelectMenu value={String(mealId)} onChange={(value) => setMealId(Number(value))} label="Meal to scan" options={meals.map((meal) => ({
                  value: String(meal.id),
                  label: meal.type,
                  description: meal.status,
                }))} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700">Late/override reason</span>
                <Input value={lateReason} onChange={(event) => setLateReason(event.target.value)} placeholder="Required if meal is not active" />
              </label>
            </div>
            <div className="flex justify-center">
              <Button onClick={() => verifyStudent()} disabled={isScanning} className="w-full h-12">
                {isScanning ? "Checking..." : "Verify Student Meal"}
              </Button>
            </div>
          </div>
        )}

        {scanStatus === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col items-center"
          >
            <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
            <p className="font-bold text-green-800 text-lg">Meal Approved</p>
            <p className="text-sm text-green-600">{scanMessage}</p>
            {student && (
              <div className="mt-4 grid grid-cols-1 gap-2 w-full text-left">
                <div className="flex items-center gap-3 rounded-lg bg-white/70 p-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 overflow-hidden flex items-center justify-center">
                    {student.photoUrl ? <img src={student.photoUrl} alt="" className="w-full h-full object-cover" /> : <UserRound className="w-5 h-5 text-green-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{student.name}</p>
                    <p className="text-xs text-neutral-500 font-mono">{student.studentId}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white/70 p-3">
                    <Building2 className="w-4 h-4 text-neutral-400 mb-1" />
                    <p className="text-xs text-neutral-600">{student.room ? `${student.hostel}, ${student.room}` : student.hostel}</p>
                  </div>
                  <div className="rounded-lg bg-white/70 p-3">
                    <BookOpen className="w-4 h-4 text-neutral-400 mb-1" />
                    <p className="text-xs text-neutral-600">{student.course}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {scanStatus === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col items-center"
          >
            <XCircle className="w-10 h-10 text-red-500 mb-2" />
            <p className="font-bold text-red-800 text-lg">Meal Denied</p>
            <p className="text-sm text-red-600">{scanMessage}</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
