import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ScanFace,
  Camera,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { useFaceEnrollModal } from "@/features/face-recognition/FaceEnrollModalContext";

const FACE_API_URL = import.meta.env.VITE_FACE_API_URL ?? "http://localhost:8000";

interface Branch {
  branch_id: string;
  branch_name: string;
  shop_number: string | null;
}

interface RecognitionResult {
  matched:           boolean;
  employee_id?:      string;
  employee_name?:    string;
  profile_photo_url?: string | null;
  confidence?:       number;
  reason?:           string;
  action?:           "check_in" | "check_out" | "already_done";
  time?:             string;
}

type ScanState = "idle" | "scanning" | "result";

const FaceRecognition = () => {
  const { user, role, profile, loading } = useAuth();

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { openEnroll } = useFaceEnrollModal();

  const [branches, setBranches]         = useState<Branch[]>([]);
  const [branchId, setBranchId]         = useState<string>("");
  const [scanState, setScanState]       = useState<ScanState>("idle");
  const [result, setResult]             = useState<RecognitionResult | null>(null);
  const [cameraReady, setCameraReady]   = useState(false);

  const [employees, setEmployees]       = useState<{ employee_id: string; employee_name: string }[]>([]);
  const [enrollId, setEnrollId]         = useState<string>("");

  useEffect(() => {
    if (!profile?.tenant_id) return;
    supabase
      .from("employees")
      .select("employee_id, employee_name")
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "active")
      .order("employee_name")
      .then(({ data }) => { if (data) setEmployees(data as any); });
  }, [profile?.tenant_id]);

  /* ── Auth guards ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center mesh-gradient">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;

  /* ── Load branches ── */
  useEffect(() => {
    if (!profile?.tenant_id) return;
    supabase
      .from("branch_details")
      .select("branch_id, branch_name, shop_number")
      .eq("tenant_id", profile.tenant_id)
      .then(({ data }) => {
        if (data) setBranches(data);
      });
  }, [profile?.tenant_id]);

  /* ── Camera lifecycle ── */
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setCameraReady(true);
      }
    } catch {
      toast.error("Cannot access webcam — please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  /* ── Scan ── */
  const handleScan = async () => {
    if (!branchId) { toast.error("Please select a branch first."); return; }
    if (!cameraReady) { toast.error("Camera not ready."); return; }
    if (!profile?.tenant_id) return;

    setScanState("scanning");
    setResult(null);

    // Capture frame
    const video  = videoRef.current!;
    const canvas = canvasRef.current!;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);

    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", 0.9)
    );

    try {
      // 1. Call recognition API
      const form = new FormData();
      form.append("image",     blob,             "frame.jpg");
      form.append("tenant_id", profile.tenant_id!);

      const apiRes  = await fetch(`${FACE_API_URL}/recognize`, { method: "POST", body: form });
      const payload = await apiRes.json();

      if (!payload.matched) {
        setResult({ matched: false, reason: payload.reason ?? "Face not recognised. Please try again." });
        setScanState("result");
        return;
      }

      // 2. Log attendance
      const today = new Date().toLocaleDateString("en-CA");
      const now   = new Date().toISOString();

      const { data: existing } = await supabase
        .from("daily_attendance_records")
        .select("id, check_in_time, check_out_time")
        .eq("tenant_id",   profile.tenant_id!)
        .eq("employee_id", payload.employee_id)
        .eq("date",        today)
        .maybeSingle();

      let action: RecognitionResult["action"];

      if (!existing) {
        await supabase.from("daily_attendance_records").insert({
          tenant_id:                  profile.tenant_id,
          branch_id:                  branchId,
          employee_id:                payload.employee_id,
          date:                       today,
          check_in_time:              now,
          status:                     "present",
          face_recognition_confidence: payload.confidence,
          recognition_method:         "deepface_arcface",
        });
        action = "check_in";
      } else if (!existing.check_out_time) {
        await supabase.from("daily_attendance_records")
          .update({
            check_out_time:              now,
            face_recognition_confidence: payload.confidence,
          })
          .eq("id", existing.id);
        action = "check_out";
      } else {
        action = "already_done";
      }

      setResult({
        matched:           true,
        employee_id:       payload.employee_id,
        employee_name:     payload.employee_name,
        profile_photo_url: payload.profile_photo_url,
        confidence:        payload.confidence,
        action,
        time:              new Date().toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" }),
      });
      setScanState("result");

    } catch (err: any) {
      toast.error(err.message ?? "Scan failed");
      setScanState("idle");
    }
  };

  const reset = () => {
    setScanState("idle");
    setResult(null);
  };

  const branchLabel = (b: Branch) =>
    b.shop_number ? `${b.shop_number} - ${b.branch_name}` : b.branch_name;

  return (
    <div className="min-h-screen mesh-gradient">
      <AppHeader title="Face Recognition" subtitle="Attendance check-in / check-out" />

      <main className="container max-w-2xl py-8 space-y-6">

        {/* Branch selector */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">Select Branch</h3>
          </div>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose branch for this kiosk…" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.branch_id} value={b.branch_id}>
                  {branchLabel(b)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Enroll employee */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <UserPlus className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">Enroll Employee Face</h3>
          </div>
          <div className="flex gap-3">
            <Select value={enrollId} onValueChange={setEnrollId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select employee to enroll…" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.employee_id} value={e.employee_id}>
                    {e.employee_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!enrollId}
              onClick={() => {
                const emp = employees.find((e) => e.employee_id === enrollId);
                if (!emp) return;
                openEnroll({ employeeId: emp.employee_id, employeeName: emp.employee_name });
              }}
              className="gap-2 teal-gradient text-primary-foreground shadow-md shrink-0"
            >
              <UserPlus className="w-4 h-4" /> Enroll
            </Button>
          </div>
        </div>

        {/* Camera + scan */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
            <ScanFace className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">Face Scanner</h3>
          </div>

          {/* Webcam */}
          <div className="relative bg-black aspect-square">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover transition-opacity [transform:scaleX(-1)] ${
                scanState === "result" ? "opacity-20" : "opacity-100"
              }`}
            />

            {/* Face guide ellipse */}
            {scanState !== "result" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-72 h-[22rem] rounded-full border-2 border-primary/50 border-dashed" />
              </div>
            )}

            {/* Scanning overlay */}
            {scanState === "scanning" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
                <ScanFace className="w-12 h-12 text-primary animate-pulse" />
                <p className="text-white font-semibold text-sm">Scanning…</p>
              </div>
            )}

            {/* Result overlay */}
            <AnimatePresence>
              {scanState === "result" && result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center p-6"
                >
                  <div className="bg-card rounded-2xl border border-border shadow-lg p-6 w-full max-w-xs text-center">
                    {result.matched ? (
                      <>
                        {result.profile_photo_url ? (
                          <img
                            src={result.profile_photo_url}
                            alt={result.employee_name}
                            className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-4 border-primary/30"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl font-bold text-primary">
                              {result.employee_name?.[0]?.toUpperCase()}
                            </span>
                          </div>
                        )}

                        <p className="font-bold text-foreground text-base">{result.employee_name}</p>

                        {result.action === "check_in" && (
                          <div className="mt-2 flex items-center justify-center gap-1.5 text-emerald-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-semibold">Checked In — {result.time}</span>
                          </div>
                        )}
                        {result.action === "check_out" && (
                          <div className="mt-2 flex items-center justify-center gap-1.5 text-blue-600">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-semibold">Checked Out — {result.time}</span>
                          </div>
                        )}
                        {result.action === "already_done" && (
                          <div className="mt-2 flex items-center justify-center gap-1.5 text-muted-foreground">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Already completed today</span>
                          </div>
                        )}

                        <p className="text-[11px] text-muted-foreground mt-2">
                          Confidence: {result.confidence?.toFixed(1)}%
                        </p>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-16 h-16 text-destructive mx-auto mb-3" />
                        <p className="font-semibold text-foreground">Not Recognised</p>
                        <p className="text-xs text-muted-foreground mt-1">{result.reason}</p>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {/* Action button */}
          <div className="px-5 py-4 flex justify-center gap-3">
            {scanState !== "result" ? (
              <Button
                onClick={handleScan}
                disabled={scanState === "scanning" || !branchId || !cameraReady}
                size="lg"
                className="gap-2 teal-gradient text-primary-foreground shadow-md px-10"
              >
                {scanState === "scanning" ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning…</>
                ) : (
                  <><Camera className="w-4 h-4" /> Scan Face</>
                )}
              </Button>
            ) : (
              <Button onClick={reset} size="lg" variant="outline" className="gap-2 px-10">
                <RefreshCw className="w-4 h-4" /> Scan Next
              </Button>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default FaceRecognition;
