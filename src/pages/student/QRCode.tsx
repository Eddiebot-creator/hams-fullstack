import { motion } from "motion/react";
import { QrCode, RefreshCw } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export default function QRCode() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-lg mx-auto space-y-6 flex flex-col items-center justify-center min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 shadow-xl border border-neutral-100 w-full text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
        
        <h1 className="text-2xl font-bold text-neutral-900 mb-2 mt-4">Your QR Code</h1>
        <p className="text-neutral-500 mb-8">Scan this code at the kitchen or laundry</p>
        
        <div className="bg-white p-4 rounded-2xl border-2 border-neutral-100 shadow-sm inline-block mb-8 relative">
          {/* Simulated QR Code using a placeholder image */}
          <img 
            src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=student-12345" 
            alt="Student QR Code" 
            className="w-64 h-64 rounded-xl"
          />
          
          {/* Scanning animation line */}
          <motion.div 
            animate={{ y: [0, 250, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute top-4 left-4 right-4 h-1 bg-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.8)] z-10"
          />
        </div>

        <div className="space-y-4">
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
            <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-1">Student ID</p>
            <p className="text-xl font-bold text-neutral-900 font-mono tracking-widest">240011223</p>
          </div>
          
          <Button variant="outline" className="w-full flex items-center justify-center">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Code
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
