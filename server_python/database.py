"""
==============================================================
database.py - Pengaturan Koneksi Database (MySQL / SQLite)
==============================================================
Modul ini bertugas menghubungkan aplikasi backend Python ke
basis data MySQL. Jika MySQL belum aktif atau belum disetting,
aplikasi otomatis menggunakan database SQLite lokal (.db)
agar server tetap bisa langsung dijalankan oleh pemula.
==============================================================
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. Baca konfigurasi dari file .env jika ada
load_dotenv()

# 2. Ambil URL koneksi database:
#    - Format MySQL : mysql+pymysql://username:password@localhost:3306/nama_database
#    - Format SQLite: sqlite:///./kalkulator_duit.db (default bawaan)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kalkulator_duit.db")

# 3. Inisialisasi engine SQLAlchemy
if DATABASE_URL.startswith("sqlite"):
    # Pengaturan khusus SQLite
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # Pengaturan untuk MySQL dengan pemulihan koneksi otomatis
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600
    )

# 4. Buat pembuat sesi (SessionLocal) untuk query data
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 5. Base class untuk semua model tabel
Base = declarative_base()


def get_db():
    """
    Fungsi bantuan untuk membuka koneksi database saat request datang,
    dan otomatis menutupnya saat request selesai.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
