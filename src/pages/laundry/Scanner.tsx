import { useState } from "react";
import { motion } from "motion/react";
import { ScanLine, CheckCircle2, XCircle, Package, Shirt } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export default function LaundryScanner() {
  // 1. Added 'error' to the allowed states
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [actionType, setActionType] = useState<'receive' | 'return'>('receive');

  // 2. Added the 'status' variable inside the parentheses so it listens to the buttons
  const simulateScan = (status: 'success' | 'error') => {
    setScanStatus(status); // Now it uses whatever the button tells it to use!
    
    // Optional: Resets back to idle after 3 seconds automatically
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
        
        <h1 className="text-2xl font-bold text-neutral-900 mb-2 mt-4">Laundry Scanner</h1>
        <p className="text-neutral-500 mb-6">Scan student QR code to process laundry</p>

        <div className="flex justify-center space-x-2 mb-8">
          <Button 
            variant={actionType === 'receive' ? 'default' : 'outline'} 
            onClick={() => setActionType('receive')}
            className={`w-32 ${actionType === 'receive' ? 'bg-indigo-600 text-white' : 'text-neutral-600'}`}
          >
            <Package className="w-4 h-4 mr-2" />
            Receive
          </Button>
          
        </div>
        
        <div className="relative w-64 h-64 mx-auto mb-8 bg-neutral-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-indigo-500/30 m-4 rounded-xl pointer-events-none"></div>
          <ScanLine className="w-16 h-16 text-indigo-500/50 animate-pulse" />
          
          <motion.div 
            animate={{ y: [-120, 120, -120] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-4 right-4 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,1)] z-10"
          />
        </div>

{/* Testing Controls - Always visible */}
        <div className="flex flex-wrap justify-center gap-3 mb-6 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
          <Button variant="outline" onClick={() => simulateScan('success')} className="border-green-200 text-green-700 hover:bg-green-50">
            Simulate Success
          </Button>
          <Button variant="outline" onClick={() => simulateScan('error')} className="border-red-200 text-red-700 hover:bg-red-50">
            Simulate Denied
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
            <p className="text-sm text-green-600">Student ID: 20221068</p>
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
            <p className="text-sm text-red-600">Not Eligible for Laundry</p>
          </motion.div>
        )}
       </motion.div>
    </div>
  );
}
