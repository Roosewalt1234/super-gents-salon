import { useEffect, useRef, useState } from "react";
import { useFaceEnrollModal } from "./FaceEnrollModalContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

const FACE_API_URL = import.meta.env.VITE_FACE_API_URL ?? "http://localhost:8000";

type Step = "preview" | "captured" | "enrolling" | "success" | "error";

const FaceEnrollModal = () => {
  const { isOpen, target, closeEnroll, onDone } = useFaceEnrollModal();
  const { profile } = useAuth();

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep]       = useState<Step>("preview");
  const [errMsg, setErrMsg]   = useState("");
  const [captureUrl, setCaptureUrl] = useState<string>("");

  /* ── Start webcam when modal opens ── */
  useEffect(() => {
    if (!isOpen) return;
    setStep("preview");
    setCaptureUrl("");
    setErrMsg("");
    startCamera();
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setErrMsg("Could not access webcam. Please allow camera permissions.");
      setStep("error");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  /* ── Capture frame ── */
  const capture = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCaptureUrl(dataUrl);
    stopCamera();
    setStep("captured");
  };

  const retake = () => {
    setCaptureUrl("");
    setStep("preview");
    startCamera();
  };

  /* ── Submit to backend ── */
  const enroll = async () => {
    if (!target || !profile?.tenant_id || !captureUrl) return;
    setStep("enrolling");

    try {
      // Convert dataURL to Blob
      const res  = await fetch(captureUrl);
      const blob = await res.blob();

      // 1. Send to FastAPI /enroll
      const form = new FormData();
      form.append("image",       blob,           "face.jpg");
      form.append("employee_id", target.employeeId);
      form.append("tenant_id",   profile.tenant_id);

      const apiRes = await fetch(`${FACE_API_URL}/enroll`, {
        method: "POST",
        body:   form,
      });

      if (!apiRes.ok) {
        const err = await apiRes.json().catch(() => ({}));
        throw new Error(err.detail ?? "Enrollment failed");
      }

      // 2. Upload photo to Supabase Storage and update employee record
      const fileName = `${profile.tenant_id}/${target.employeeId}.jpg`;
      await supabase.storage
        .from("face-images")
        .upload(fileName, blob, { upsert: true, contentType: "image/jpeg" });

      const { data: urlData } = supabase.storage
        .from("face-images")
        .getPublicUrl(fileName);

      await supabase
        .from("employees")
        .update({ face_image_url: urlData.publicUrl })
        .eq("id", target.employeeId);

      setStep("success");
      toast.success(`${target.employeeName} enrolled successfully`);
      onDone?.();
    } catch (err: any) {
      setErrMsg(err.message ?? "Enrollment failed");
      setStep("error");
    }
  };

  const handleClose = () => {
    stopCamera();
    closeEnroll();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Enroll Face — {target?.employeeName}
          </DialogTitle>
          <DialogDescription>
            Position the employee's face in the frame and capture.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">

          {/* Video / captured frame */}
          <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
            {step === "preview" && (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover [transform:scaleX(-1)]"
              />
            )}
            {(step === "captured" || step === "enrolling") && captureUrl && (
              <img src={captureUrl} alt="Captured" className="w-full h-full object-cover" />
            )}
            {step === "success" && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-white">
                <CheckCircle className="w-16 h-16 text-emerald-400" />
                <p className="font-semibold text-lg">Enrolled!</p>
              </div>
            )}
            {step === "error" && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-white px-6 text-center">
                <AlertCircle className="w-12 h-12 text-destructive" />
                <p className="text-sm text-destructive">{errMsg}</p>
              </div>
            )}

            {/* Face guide overlay */}
            {step === "preview" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-72 h-[22rem] rounded-full border-2 border-primary/60 border-dashed" />
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            {step === "preview" && (
              <>
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={capture} className="gap-2 teal-gradient text-primary-foreground">
                  <Camera className="w-4 h-4" /> Capture
                </Button>
              </>
            )}

            {step === "captured" && (
              <>
                <Button variant="outline" onClick={retake} className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Retake
                </Button>
                <Button onClick={enroll} className="gap-2 teal-gradient text-primary-foreground">
                  <CheckCircle className="w-4 h-4" /> Enroll
                </Button>
              </>
            )}

            {step === "enrolling" && (
              <Button disabled className="gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Enrolling…
              </Button>
            )}

            {step === "success" && (
              <Button onClick={handleClose} className="teal-gradient text-primary-foreground">
                Done
              </Button>
            )}

            {step === "error" && (
              <>
                <Button variant="outline" onClick={handleClose}>Close</Button>
                <Button variant="outline" onClick={retake} className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Try Again
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FaceEnrollModal;
