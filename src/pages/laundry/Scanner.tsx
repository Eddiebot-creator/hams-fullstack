import { useState } from "react";
import { motion } from "motion/react";
import { ScanLine, CheckCircle2, XCircle, Package, Shirt, IdCard } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { api, type LaundryBasket, type Student } from "@/src/lib/api";
import { showToast } from "@/src/components/ui/toast";
import CameraQrScanner from "@/src/components/scanner/CameraQrScanner";

export default function LaundryScanner() {
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [actionType, setActionType] = useState<'receive' | 'return'>('receive');
  const [basketCode, setBasketCode] = useState("");
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("Waiting for scan...");
  const [basket, setBasket] = useState<LaundryBasket | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [clothesCount, setClothesCount] = useState("1");
  const [lastQrPayload, setLastQrPayload] = useState("");

  const saveScan = async () => {
    if (!basketCode.trim() || !studentId.trim()) {
      setScanStatus("error");
      setMessage("Enter basket code and student ID before scanning.");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("hamsUser") || "{}");
    setIsSaving(true);
    setBasket(null);
    setStudent(null);

    try {
      const result = await api.scanLaundry({
        action: actionType,
        basketCode: basketCode.trim(),
        studentId: studentId.trim(),
        clothesCount: Math.max(1, Number(clothesCount) || 1),
        qrPayload: lastQrPayload || undefined,
        staffName: storedUser.name || "Laundry Staff",
      });
      setBasket(result.basket);
      setStudent(result.student);
      setMessage(result.message);
      setScanStatus("success");
      navigator.vibrate?.(80);
      showToast(result.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to save laundry scan.");
      setScanStatus("error");
      navigator.vibrate?.([80, 60, 80]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQrDetected = (id: string, rawValue: string) => {
    setLastQrPayload(rawValue);
    if (rawValue.startsWith("HAMS-LAUNDRY:")) {
      const parts = rawValue.split(":");
      const scannedBasket = parts[1] || "";
      const scannedStudent = parts[2] || id;
      const scannedCount = parts[3] || "1";
      if (scannedBasket) setBasketCode(scannedBasket);
      setStudentId(scannedStudent);
      setClothesCount(String(Math.max(1, Number(scannedCount) || 1)));
      setMessage(`Laundry QR detected for ${scannedStudent}. Save scan to confirm.`);
    } else {
      setStudentId(id);
      setMessage(`Student ID ${id} detected. Enter basket code and save.`);
    }
    setScanStatus("idle");
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-lg mx-auto space-y-4 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-5 sm:p-8 shadow-xl border border-neutral-100 w-full text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
        
        <h1 className="text-2xl font-bold text-neutral-900 mb-2 mt-4">Laundry Scanner</h1>
        <p className="text-neutral-500 mb-6">Save every laundry scan directly to the database.</p>

        <div className="grid grid-cols-2 gap-2 mb-6">
          <Button 
            variant={actionType === 'receive' ? 'default' : 'outline'} 
            onClick={() => setActionType('receive')}
            className={`h-12 ${actionType === 'receive' ? 'bg-indigo-600 text-white' : 'text-neutral-600'}`}
          >
            <Package className="w-4 h-4 mr-2" />
            Receive
          </Button>
          <Button
            variant={actionType === 'return' ? 'default' : 'outline'}
            onClick={() => setActionType('return')}
            className={`h-12 ${actionType === 'return' ? 'bg-indigo-600 text-white' : 'text-neutral-600'}`}
          >
            <Shirt className="w-4 h-4 mr-2" />
            Return
          </Button>
          
        </div>

        <div className="grid grid-cols-1 gap-3 mb-6 text-left">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-neutral-700 flex items-center gap-2"><Package className="w-4 h-4" /> Basket code</span>
            <Input value={basketCode} onChange={(event) => setBasketCode(event.target.value)} placeholder="Example: 1042" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold text-neutral-700 flex items-center gap-2"><IdCard className="w-4 h-4" /> Student ID</span>
            <Input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="Example: 240011223" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold text-neutral-700 flex items-center gap-2"><Shirt className="w-4 h-4" /> Clothes count</span>
            <Input type="number" min={1} value={clothesCount} onChange={(event) => setClothesCount(event.target.value)} placeholder="Example: 7" />
          </label>
        </div>
        
        <div className="mb-6">
          <CameraQrScanner label="Camera QR laundry scanner" onDetected={handleQrDetected} />
        </div>

        <div className="mb-6">
          <Button onClick={saveScan} disabled={isSaving} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white">
            <ScanLine className="w-4 h-4" />
            {isSaving ? "Saving scan..." : `Save ${actionType === "receive" ? "Receive" : "Return"} Scan`}
          </Button>
        </div>

        {/* Scanner Status Display */}
        {scanStatus === 'idle' && (
          <div className="space-y-4 text-center">
            <p className="text-sm font-medium text-neutral-500">Waiting for scan...</p>
          </div>
        )}

        {scanStatus === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col items-center"
          >
            <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
            <p className="font-bold text-green-800 text-lg">Verification Approved</p>
            <p className="text-sm text-green-700">{message}</p>
            {student && <p className="text-sm text-green-600 mt-1">{student.name} - {student.studentId}</p>}
            {basket && <p className="text-xs text-green-600 mt-1">Status saved as {basket.status} • {basket.clothesCount || 1} clothes</p>}
          </motion.div>
        )}

        {scanStatus === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col items-center"
          >
            <XCircle className="w-10 h-10 text-red-500 mb-2" />
            <p className="font-bold text-red-800 text-lg">Verification Rejected</p>
            <p className="text-sm text-red-600">{message}</p>
          </motion.div>
        )}
       </motion.div>
    </div>
  );
}
