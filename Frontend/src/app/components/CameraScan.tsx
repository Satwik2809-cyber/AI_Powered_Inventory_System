import { useRef, useState, useEffect, useCallback } from "react";
import { apiPostFile } from "../api";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface Props {
  context?: string;
  eventName?: string;
  onAutoMatch: (product: any) => void;
  onConfirmMatch: (options: any[]) => void;
}

export default function CameraScan({ context, eventName, onAutoMatch, onConfirmMatch }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      toast.error("Camera access denied or unavailable on this device.");
      setIsOpen(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera(); // Cleanup on unmount
    };
  }, [isOpen, stopCamera]);


  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    setIsProcessing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video source
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (context) {
      // Draw the current video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to Blob (JPEG format for better size/quality ratio)
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Failed to capture image");
          setIsProcessing(false);
          return;
        }

        // Convert blob to File object expected by the API
        const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
        await handleScanAPI(file);
      }, "image/jpeg", 0.9);
    }
  };

  const handleScanAPI = async (file: File) => {
    try {
      toast.info("Analyzing image...");
      const extraData: Record<string, string> = {};
      if (context) extraData.context = context;
      if (eventName) extraData.event_name = eventName;
      
      const res = await apiPostFile("/ai/image-match", file, extraData);

      if (res.status === "auto") {
        toast.success("Product detected");
        onAutoMatch(res.product);
      }

      if (res.status === "confirm") {
        toast.message("Confirm product");
        onConfirmMatch(res.options);
        setIsOpen(false);
      }

      if (res.status === "reject") {
        // Show error but leave camera open to try again
        toast.error(res.message);
      }
      
      if (res.status === "error") {
        toast.error(res.message || "Failed to find a matching product");
      }
    } catch {
      toast.error("Camera scan failed. Backend may be unreachable.");
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <>
      <Button
        variant="outline"
        className="w-full font-bold text-slate-700 h-full flex items-center justify-center gap-2"
        onClick={() => setIsOpen(true)}
      >
        <Camera className="w-5 h-5 text-indigo-500" /> Web Camera
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border border-white/20 text-white rounded-2xl overflow-hidden shadow-2xl">
          <DialogHeader className="p-4 border-b border-white/10 flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Camera className="w-5 h-5 text-teal-400" /> Live Feed Capture
            </DialogTitle>
          </DialogHeader>

          <div className="relative bg-black w-full flex items-center justify-center overflow-hidden h-[400px]">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-teal-500 mb-4"></div>
                <p className="text-white font-bold animate-pulse">Running AI Match...</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-900 border-t border-white/10">
            <Button
              onClick={captureImage}
              disabled={isProcessing}
              className="w-full h-14 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-lg font-bold rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.4)]"
            >
              {isProcessing ? "Processing Match..." : "Capture & Search"}
            </Button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </>
  );
}