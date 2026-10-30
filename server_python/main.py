"""
==============================================================
main.py - Server Utama Backend Python (FastAPI)
Kalkulator Uang Jajan
==============================================================
File ini adalah gerbang utama aplikasi server backend Python.
Dibuat sederhana, bersih, dan mudah dibaca oleh pemula.
Menyediakan REST API yang terhubung ke database MySQL / SQLite.
==============================================================
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Import engine database dan Base model
from database import engine, Base

# Import router API
from routes import auth_routes, sync_routes

# 1. Otomatis buat tabel di database (MySQL / SQLite) saat server dijalankan
Base.metadata.create_all(bind=engine)

# 2. Inisialisasi aplikasi FastAPI
app = FastAPI(
    title="API Kalkulator Uang Jajan",
    description="Backend Python sederhana & efisien dengan dukungan MySQL & SQLite",
    version="1.0.0"
)

# 3. Konfigurasi CORS (Cross-Origin Resource Sharing)
# Mengizinkan frontend (Vite lokal dan domain resmi) berkomunikasi dengan API ini
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Folder Penyimpanan Bukti Foto Transaksi
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# 5. Pasang Rute-Rute API
app.include_router(auth_routes.router)
app.include_router(sync_routes.router)


# 6. Rute Health Check (Pemeriksaan Status Server)
@app.get("/")
def root():
    """Halaman pembuka API untuk memastikan server aktif."""
    return {
        "status": "online",
        "app": "Backend Kalkulator Uang Jajan",
        "tech_stack": "Python (FastAPI) + MySQL / SQLite",
        "docs_url": "/docs"  # Buka alamat http://localhost:8000/docs untuk mencoba API langsung di browser
    }


@app.get("/api/health")
def health_check():
    """Pemeriksaan kondisi server untuk monitoring."""
    return {
        "status": "ok",
        "database": "connected"
    }


if __name__ == "__main__":
    import uvicorn
    # Menjalankan server pada port 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
