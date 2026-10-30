"""
==============================================================
auth_helper.py - Bantuan Keamanan & Enkripsi Kata Sandi
==============================================================
File ini berisi fungsi-fungsi sederhana untuk:
1. Mengacak (hash) kata sandi dengan bcrypt agar tidak bisa dibaca.
2. Memeriksa apakah kata sandi yang diketik user sesuai dengan hash.
3. Membuat dan memverifikasi token JWT untuk sesi login.
==============================================================
"""

import os
from datetime import datetime, timedelta
import bcrypt
import jwt
from dotenv import load_dotenv

load_dotenv()

# Kunci rahasia untuk menandatangani token JWT
JWT_SECRET = os.getenv("JWT_SECRET", "kalkulator_duit_shukohdev_secret_key_2026")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24


def hash_password(plain_password: str) -> str:
    """Mengacak kata sandi asli menjadi format hash yang aman."""
    pwd_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Mencocokkan kata sandi input dengan hash yang ada di database."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def create_access_token(username: str, role: str = "user") -> str:
    """Membuat token JWT dengan masa berlaku 24 jam."""
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": username,
        "role": role,
        "exp": expire
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Membaca isi token JWT untuk mengetahui siapa user yang mengirimnya."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return {}
