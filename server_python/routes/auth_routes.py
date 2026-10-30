"""
==============================================================
auth_routes.py - Jalur API Autentikasi (Daftar & Masuk Akun)
==============================================================
Menangani proses pendaftaran akun baru dan login pengguna.
Kode dibuat lugas dan mudah dipelajari oleh pemula.
==============================================================
"""

import re
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, ActivityLog
from auth_helper import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/api/auth", tags=["Autentikasi"])


class AuthRequest(BaseModel):
    username: str
    password: str
    role: str = "user"


@router.post("/register")
def register(req: AuthRequest, db: Session = Depends(get_db)):
    """
    Mendaftarkan akun baru ke dalam database MySQL / SQLite.
    """
    clean_username = req.username.strip()

    if len(clean_username) < 3 or len(clean_username) > 24:
        raise HTTPException(
            status_code=400,
            detail="Nama pengguna harus memiliki panjang 3 sampai 24 karakter."
        )

    if not re.match(r"^[a-zA-Z0-9_\-.# ]+$", clean_username):
        raise HTTPException(
            status_code=400,
            detail="Nama pengguna hanya boleh mengandung huruf, angka, spasi, titik, minus, underscore, dan tagar (#)."
        )

    if len(req.password) < 4:
        raise HTTPException(
            status_code=400,
            detail="Kata sandi minimal harus 4 karakter."
        )

    existing = db.query(User).filter(User.username == clean_username).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Nama pengguna sudah terdaftar. Silakan pilih nama lain."
        )

    new_user = User(
        username=clean_username,
        password_hash=hash_password(req.password),
        role=req.role if req.role in ["admin", "user"] else "user",
        created_at=datetime.utcnow()
    )
    db.add(new_user)

    log = ActivityLog(
        username=clean_username,
        action="REGISTER",
        description="Pendaftaran akun pengguna baru berhasil."
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": "Akun berhasil didaftarkan! Silakan masuk.",
        "username": clean_username
    }


@router.post("/login")
def login(req: AuthRequest, db: Session = Depends(get_db)):
    """
    Memverifikasi nama pengguna dan kata sandi, lalu mengembalikan token akses.
    """
    clean_username = req.username.strip()

    user = db.query(User).filter(User.username == clean_username).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Nama pengguna atau kata sandi tidak cocok."
        )

    if not verify_password(req.password, str(user.password_hash)):
        raise HTTPException(
            status_code=401,
            detail="Nama pengguna atau kata sandi tidak cocok."
        )

    user.last_login = datetime.utcnow()
    
    log = ActivityLog(
        username=str(user.username),
        action="LOGIN",
        description="Pengguna berhasil masuk ke sistem."
    )
    db.add(log)
    db.commit()

    token = create_access_token(str(user.username), str(user.role))

    return {
        "success": True,
        "message": "Login berhasil!",
        "token": token,
        "user": {
            "username": user.username,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at is not None else None
        }
    }


@router.get("/me")
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    Mengecek siapa pengguna yang sedang aktif berdasarkan token Authorization di header.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token autentikasi tidak ditemukan.")

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    username = payload.get("sub")

    if not username:
        raise HTTPException(status_code=401, detail="Token kedaluwarsa atau tidak valid.")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Data pengguna tidak ditemukan.")

    return {
        "success": True,
        "user": {
            "username": user.username,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at is not None else None
        }
    }
