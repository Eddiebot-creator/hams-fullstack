import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { IdCard, ScanLine, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { api, type Meal } from "@/src/lib/api";

export default function KitchenScanner() {
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scanMessage, setScanMessage] = useState("Waiting for scan...");
  const [studentId, setStudentId] = useState("240011223");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealId, setMealId] = useState(2);

  useEffect(() => {
    api.meals().then((items) => {
      setMeals(items);
      const activeMeal = items.find((meal) => meal.status === "Active") ?? items[0];
      if (activeMeal) setMealId(activeMeal.id);
    }).catch(console.error);
  }, []);

  const simulateScan = async () => {
    if (!studentId.trim()) {
      setScanMessage("Enter a student ID before scanning.");
      setScanStatus("error");
      return;
    }

    try {
      const result = await api.scanMeal(mealId, studentId.trim());
      setScanMessage(`${result.meal.type} approved for Student ID: ${result.studentId}`);
      setScanStatus("success");
    } catch (err) {
      setScanMessage(err instanceof Error ? err.message : "Scan denied.");
      setScanStatus("error");
    }

    setTimeout(() => setScanStatus('idle'), 3000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-lg mx-auto space-y-6 flex flex-col items-center justify-center min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 shadow-xl border border-neutral-100 w-full text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
        
        <h1 className="text-2xl font-bold text-neutral-900 mb-2 mt-4">Meal Scanner</h1>
        <p className="text-neutral-500 mb-8">Scan student QR code to mark meal as taken</p>
        
        <div className="relative w-64 h-64 mx-auto mb-8 bg-neutral-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
          {/* Simulated Camera View */}
          <div className="absolute inset-0 border-4 border-indigo-500/30 m-4 rounded-xl pointer-events-none"></div>
          <ScanLine className="w-16 h-16 text-indigo-500/50 animate-pulse" />
          
          {/* Scanning animation line */}
          <motion.div 
            animate={{ y: [-120, 120, -120] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-4 right-4 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,1)] z-10"
          />
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
                <span className="text-sm font-medium text-neutral-700">Meal to scan</span>
                <select
                  value={mealId}
                  onChange={(event) => setMealId(Number(event.target.value))}
                  className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {meals.map((meal) => (
                    <option key={meal.id} value={meal.id}>
                      {meal.type} ({meal.status})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex justify-center">
              <Button onClick={simulateScan} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Verify Student Meal
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
