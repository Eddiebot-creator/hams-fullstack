import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ScanLine } from "lucide-react";
import { Button } from "@/src/components/ui/button";

type BarcodeDetectorShape = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

function parseQrValue(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("HAMS-STUDENT:")) return trimmed.replace("HAMS-STUDENT:", "").trim();
  return trimmed;
}

export default function CameraQrScanner({
  onDetected,
  label = "Scan QR code",
}: {
  onDetected: (studentId: string, rawValue: string) => void;
  label?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorShape | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("Camera is ready.");

  const stopCamera = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsOpen(false);
  };

  const scanFrame = async () => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || video.readyState < 2) {
      frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    try {
      const codes = await detector.detect(video);
      const rawValue = codes[0]?.rawValue;
      if (rawValue) {
        const studentId = parseQrValue(rawValue);
        setMessage(`Detected ${studentId}`);
        onDetected(studentId, rawValue);
        navigator.vibrate?.(80);
        stopCamera();
        return;
      }
    } catch {
      setMessage("Point the camera clearly at the QR code.");
    }

    frameRef.current = requestAnimationFrame(scanFrame);
  };

  const startCamera = async () => {
    const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorShape }).BarcodeDetector;
    if (!BarcodeDetectorCtor) {
      setMessage("This browser does not support QR scanning. Use Chrome/Edge or enter the ID manually.");
      return;
    }

    try {
      detectorRef.current = new BarcodeDetectorCtor({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsOpen(true);
      setMessage("Scanning... point the camera at the student QR code.");
      frameRef.current = requestAnimationFrame(scanFrame);
    } catch {
      setMessage("Camera permission was blocked or no camera was found.");
    }
  };

  useEffect(() => stopCamera, []);

  return (
    <div className="rounded-3xl border border-neutral-100 bg-neutral-950 p-3 shadow-inner">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-900">
        <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${isOpen ? "block" : "hidden"}`} />
        {!isOpen && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-400">
            <ScanLine className="h-14 w-14 animate-pulse text-indigo-400" />
            <p className="text-sm font-semibold">{label}</p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-4 rounded-2xl border-4 border-indigo-400/40" />
        {isOpen && <div className="pointer-events-none absolute left-6 right-6 top-1/2 h-0.5 bg-indigo-400 shadow-[0_0_14px_rgba(129,140,248,1)]" />}
      </div>
      <p className="mt-3 min-h-5 text-center text-xs font-medium text-neutral-300">{message}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" onClick={startCamera} disabled={isOpen} className="h-11 bg-indigo-600 text-white hover:bg-indigo-700">
          <Camera className="h-4 w-4" />
          Start
        </Button>
        <Button type="button" onClick={stopCamera} variant="outline" className="h-11 border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 hover:text-white">
          <CameraOff className="h-4 w-4" />
          Stop
        </Button>
      </div>
    </div>
  );
}
