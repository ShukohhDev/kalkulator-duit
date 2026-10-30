@echo off
title Server Python Kalkulator Uang Jajan
cls
echo ==============================================================
echo Menjalankan Server Backend Python (FastAPI)
echo Kalkulator Uang Jajan
echo ==============================================================
echo Alamat Server: http://localhost:8000
echo Dokumentasi API: http://localhost:8000/docs
echo.
echo Tekan tombol Ctrl + C untuk menghentikan server.
echo ==============================================================
echo.

python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause

