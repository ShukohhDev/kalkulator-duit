# Menggunakan base image Python 3.13 slim yang ringan dan efisien
FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860

# Instal dependensi
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Salin kode aplikasi
COPY . .

# Buat folder penyimpanan uploads
RUN mkdir -p uploads

EXPOSE 7860
EXPOSE 8000

# Perintah menjalankan server uvicorn pada port cloud
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]

