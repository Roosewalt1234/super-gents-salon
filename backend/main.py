"""
Super Salon — Face Recognition Backend
FastAPI + DeepFace (ArcFace model)

Endpoints:
  GET  /health      — liveness check
  POST /enroll      — register employee face embedding
  POST /recognize   — identify employee from a webcam frame
"""

import io
import os
import json
import numpy as np
from PIL import Image
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Request, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware
from supabase import create_client, Client
from deepface import DeepFace

load_dotenv()

# ── Supabase client ────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")

db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="Super Salon Face API", version="1.0.0")

# Force CORS headers on ALL responses including unhandled 500s
class ForceCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            res = Response(status_code=200)
            res.headers["Access-Control-Allow-Origin"]  = "*"
            res.headers["Access-Control-Allow-Methods"] = "*"
            res.headers["Access-Control-Allow-Headers"] = "*"
            return res
        try:
            response = await call_next(request)
        except Exception as exc:
            response = JSONResponse(status_code=500, content={"detail": str(exc)})
        response.headers["Access-Control-Allow-Origin"]  = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response

app.add_middleware(ForceCORSMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MODEL_NAME   = "ArcFace"
DETECTOR     = "retinaface"      # more accurate than opencv
THRESHOLD    = 0.40              # cosine distance — lower = stricter


# ── Helpers ────────────────────────────────────────────────────────────────────

def upload_to_bytes(upload: UploadFile) -> bytes:
    return upload.file.read()


def bytes_to_pil(raw: bytes) -> Image.Image:
    return Image.open(io.BytesIO(raw)).convert("RGB")


def get_embedding(img: Image.Image) -> list[float]:
    """Run DeepFace ArcFace and return the 512-dim embedding."""
    # DeepFace accepts PIL images or numpy arrays
    arr = np.array(img)
    result = DeepFace.represent(
        img_path=arr,
        model_name=MODEL_NAME,
        detector_backend=DETECTOR,
        enforce_detection=False,
    )
    return result[0]["embedding"]   # list of 512 floats


def cosine_distance(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a), np.array(b)
    return float(1.0 - np.dot(va, vb) / (np.linalg.norm(va) * np.linalg.norm(vb)))


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/enroll")
async def enroll(
    image:       UploadFile = File(...),
    employee_id: str        = Form(...),
    tenant_id:   str        = Form(...),
):
    """
    Register (or update) an employee's face embedding.
    Accepts a JPEG/PNG image from the webcam capture.
    """
    raw = upload_to_bytes(image)
    try:
        pil = bytes_to_pil(raw)
        embedding = get_embedding(pil)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Face detection failed: {exc}")

    # Upsert into face_descriptors (one row per employee)
    payload = {
        "tenant_id":   tenant_id,
        "employee_id": employee_id,
        "descriptor":  json.dumps(embedding),   # stored as jsonb
        "model_name":  MODEL_NAME,
    }

    existing = (
        db.table("face_descriptors")
        .select("id")
        .eq("employee_id", employee_id)
        .maybe_single()
        .execute()
    )

    if existing and existing.data:
        db.table("face_descriptors").update(payload).eq("employee_id", employee_id).execute()
    else:
        db.table("face_descriptors").insert(payload).execute()

    return {"success": True, "employee_id": employee_id}


@app.post("/recognize")
async def recognize(
    image:     UploadFile = File(...),
    tenant_id: str        = Form(...),
):
    """
    Identify a face from a webcam frame against all enrolled employees
    in the given tenant.
    """
    raw = upload_to_bytes(image)
    try:
        pil = bytes_to_pil(raw)
        query_embedding = get_embedding(pil)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Face detection failed: {exc}")

    # Load all embeddings for this tenant
    rows = (
        db.table("face_descriptors")
        .select("employee_id, descriptor")
        .eq("tenant_id", tenant_id)
        .execute()
    )

    if not rows.data:
        return {"matched": False, "reason": "No enrolled faces for this tenant"}

    best_dist     = float("inf")
    best_employee = None

    for row in rows.data:
        stored = json.loads(row["descriptor"]) if isinstance(row["descriptor"], str) else row["descriptor"]
        dist = cosine_distance(query_embedding, stored)
        if dist < best_dist:
            best_dist     = dist
            best_employee = row["employee_id"]

    if best_dist > THRESHOLD:
        return {"matched": False, "distance": round(best_dist, 4)}

    # Fetch employee name
    emp = (
        db.table("employees")
        .select("employee_id, employee_name, profile_photo_url")
        .eq("employee_id", best_employee)
        .maybe_single()
        .execute()
    )

    confidence = round((1.0 - best_dist) * 100, 1)   # convert to %

    return {
        "matched":           True,
        "employee_id":       best_employee,
        "employee_name":     emp.data["employee_name"] if emp.data else "Unknown",
        "profile_photo_url": emp.data.get("profile_photo_url") if emp.data else None,
        "confidence":        confidence,
        "distance":          round(best_dist, 4),
    }
