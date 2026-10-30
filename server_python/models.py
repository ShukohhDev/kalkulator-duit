"""
==============================================================
models.py - Struktur Tabel Database (ORM SQLAlchemy)
==============================================================
File ini mendefinisikan tabel-tabel yang akan otomatis dibuat
di dalam database MySQL atau SQLite.
Didesain sederhana agar mudah dibaca dan dipahami pemula.
==============================================================
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from database import Base


class User(Base):
    """
    Tabel 'users': Menyimpan akun pengguna yang terdaftar.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)


class UserData(Base):
    """
    Tabel 'user_data': Menyimpan seluruh data keuangan pengguna
    (alokasi budget, catatan transaksi, tagihan, tabungan, dan dompet)
    dalam format JSON teks yang ringkas dan fleksibel.
    """
    __tablename__ = "user_data"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    data = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ActivityLog(Base):
    """
    Tabel 'activity_logs': Mencatat riwayat aktivitas seperti login,
    simpan transaksi, atau pembayaran tagihan.
    """
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), index=True, nullable=False)
    action = Column(String(50), nullable=False)
    description = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
