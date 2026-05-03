import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, ScanLine } from "lucide-react";
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
  const lastValueRef = useRef("");
  const stableCountRef = useRef(0);
  const detectedRef = useRef(false);
  const stopTimerRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDetected, setIsDetected] = useState(false);
  const [message, setMessage] = useState("Camera is ready.");

  const stopCamera = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    frameRef.current = null;
    stopTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    lastValueRef.current = "";
    stableCountRef.current = 0;
    detectedRef.current = false;
    setIsOpen(false);
    setIsDetected(false);
  };

  const scanFrame = async () => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (detectedRef.current) return;

    if (!video || !detector || video.readyState < 2) {
      frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    try {
      const codes = await detector.detect(video);
      const rawValue = codes[0]?.rawValue;
      if (rawValue) {
        const studentId = parseQrValue(rawValue);
        if (rawValue === lastValueRef.current) {
          stableCountRef.current += 1;
        } else {
          lastValueRef.current = rawValue;
          stableCountRef.current = 1;
        }

        setMessage(`Hold steady... reading ${studentId}`);

        if (stableCountRef.current >= 2) {
          detectedRef.current = true;
          setIsDetected(true);
          setMessage(`Detected ${studentId}`);
          navigator.vibrate?.(80);

          stopTimerRef.current = window.setTimeout(() => {
            onDetected(studentId, rawValue);
            stopCamera();
          }, 650);
          return;
        }
      } else {
        lastValueRef.current = "";
        stableCountRef.current = 0;
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
      setIsDetected(false);
      detectedRef.current = false;
      lastValueRef.current = "";
      stableCountRef.current = 0;
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
        {isOpen && !isDetected && <div className="pointer-events-none absolute left-6 right-6 top-1/2 h-0.5 animate-pulse bg-indigo-400 shadow-[0_0_14px_rgba(129,140,248,1)]" />}
        {isDetected && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-[1px]">
            <div className="rounded-full bg-white p-4 shadow-xl">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 min-h-5 text-center text-xs font-medium text-neutral-300">{message}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" onClick={startCamera} disabled={isOpen}>
          <Camera className="h-4 w-4" />
          Start
        </Button>
        <Button type="button" onClick={stopCamera} variant="secondary">
          <CameraOff className="h-4 w-4" />
          Stop
        </Button>
      </div>
    </div>
  );
}
