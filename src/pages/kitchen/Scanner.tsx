import { useState } from "react";
import { motion } from "motion/react";
import { ScanLine, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { api } from "@/src/lib/api";

export default function KitchenScanner() {
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scanMessage, setScanMessage] = useState("Waiting for scan...");
  const [studentId] = useState("240011223");

  const simulateScan = async (mealId: number) => {
    try {
      const result = await api.scanMeal(mealId, studentId);
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
            <p className="text-sm font-medium text-neutral-500">Waiting for scan...</p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={() => simulateScan(2)} className="border-green-200 text-green-700 hover:bg-green-50">
                Success
              </Button>
              <Button variant="outline" onClick={() => simulateScan(1)} className="border-red-200 text-red-700 hover:bg-red-50">
                Denied
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
