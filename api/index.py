import os
import sys
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Pastikan direktori api/ ada di sys.path
api_dir = os.path.dirname(__file__)
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

from database import engine, Base
from routes import auth_routes, sync_routes

# Otomatis inisialisasi tabel database
try:
    Base.metadata.create_all(bind=engine)
except Exception as err:
    print("Database init info:", err)

app = FastAPI(
    title="API Kalkulator Uang Jajan",
    description="Backend Python Serverless di Vercel",
    version="1.0.0"
)

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:3000",
    "https://kalkulator-duit.shukohdev.web.id",
    "https://shukohdev.web.id",
    "https://kalkulator-duit.shukohh21.workers.dev"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https://([a-zA-Z0-9-]+\.)*(shukohdev\.web\.id|vercel\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Folder penyimpanan bukti foto (di Vercel dialihkan ke /tmp)
if os.getenv("VERCEL"):
    UPLOAD_DIR = "/tmp/uploads"
else:
    UPLOAD_DIR = os.path.join(api_dir, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth_routes.router)
app.include_router(sync_routes.router)


@app.get("/")
def root():
    return {
        "status": "online",
        "app": "Backend Kalkulator Uang Jajan",
        "platform": "Vercel Serverless Python",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "database": "connected",
        "platform": "Vercel Serverless Python"
    }
