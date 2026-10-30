"""
==============================================================
models.py - Struktur Tabel Database (ORM SQLAlchemy 2.0)
==============================================================
File ini mendefinisikan tabel-tabel database menggunakan
tipe data Mapped bawaan SQLAlchemy 2.0 agar terbaca sempurna
oleh IDE/VS Code tanpa menghasilkan garis merah (type warning).
==============================================================
"""

from datetime import datetime, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
from typing import Optional
from sqlalchemy import String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class User(Base):
    """
    Tabel 'users': Menyimpan akun pengguna yang terdaftar.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user", nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=utc_now)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class UserData(Base):
    """
    Tabel 'user_data': Menyimpan seluruh data keuangan pengguna
    (alokasi budget, catatan transaksi, tagihan, tabungan, dan dompet)
    dalam format JSON teks yang ringkas dan fleksibel.
    """
    __tablename__ = "user_data"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    data: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)


class ActivityLog(Base):
    """
    Tabel 'activity_logs': Mencatat riwayat aktivitas seperti login,
    simpan transaksi, atau pembayaran tagihan.
    """
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=utc_now)
