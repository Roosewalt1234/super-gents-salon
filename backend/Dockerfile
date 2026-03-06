FROM python:3.11-slim

# System deps for opencv + image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-download ArcFace + RetinaFace models so they're baked into the image (avoids slow cold starts)
RUN python - <<'EOF'
import numpy as np
from deepface import DeepFace
dummy = np.zeros((224, 224, 3), dtype=np.uint8)
try:
    DeepFace.represent(dummy, model_name="ArcFace", detector_backend="retinaface", enforce_detection=False)
except Exception:
    pass
print("ArcFace + RetinaFace models cached.")
EOF

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
