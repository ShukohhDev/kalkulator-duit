"""
==============================================================
sync_routes.py - Jalur Sinkronisasi Data Keuangan
==============================================================
Menangani penyimpanan (Push) dan pengambilan (Pull) seluruh
data transaksi, alokasi anggaran, tagihan, dan tabungan
antara browser (frontend) dan basis data MySQL / SQLite.
==============================================================
"""

import json
from datetime import datetime
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import UserData, ActivityLog

router = APIRouter(prefix="/api/sync", tags=["Sinkronisasi"])


class PushSyncRequest(BaseModel):
    username: str
    data: Dict[str, Any]


@router.post("/push")
def push_user_data(req: PushSyncRequest, db: Session = Depends(get_db)):
    """
    Menyimpan atau memperbarui data keuangan pengguna ke basis data.
    """
    clean_username = req.username.strip()
    if not clean_username:
        raise HTTPException(status_code=400, detail="Nama pengguna wajib diisi.")

    now = datetime.utcnow()
    json_string = json.dumps(req.data, ensure_ascii=False)

    user_data = db.query(UserData).filter(UserData.username == clean_username).first()

    if user_data:
        user_data.data = json_string
        user_data.updated_at = now
    else:
        user_data = UserData(
            username=clean_username,
            data=json_string,
            updated_at=now
        )
        db.add(user_data)

    log = ActivityLog(
        username=clean_username,
        action="SYNC_PUSH",
        description="Data keuangan berhasil disinkronkan ke server."
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": "Data berhasil disimpan di server database.",
        "updated_at": now.isoformat()
    }


@router.get("/pull")
def pull_user_data(username: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    """
    Mengambil data keuangan pengguna dari basis data MySQL / SQLite.
    """
    clean_username = username.strip()
    user_data = db.query(UserData).filter(UserData.username == clean_username).first()

    if not user_data or not user_data.data:
        return {
            "success": False,
            "error": "Belum ada data di server untuk akun ini.",
            "state": None
        }

    try:
        parsed_data = json.loads(str(user_data.data))
    except Exception:
        parsed_data = None

    return {
        "success": True,
        "message": "Data berhasil dimuat dari server.",
        "state": parsed_data,
        "updated_at": user_data.updated_at.isoformat() if user_data.updated_at is not None else None
    }
