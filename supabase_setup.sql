-- ==============================================================================
-- SKRIP SETUP DATABASE SUPABASE UNTUK KALKULATOR UANG JAJAN (KALKULATOR DUITMU)
-- ==============================================================================
-- Jalankan skrip ini di menu SQL Editor pada dashboard Supabase Anda.

-- 1. Buat tabel pengguna aplikasi (app_users)
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  salt text not null,
  hash text not null,
  role text not null default 'user', -- 'admin' untuk pemilik, 'user' untuk pengguna biasa
  created_at timestamptz not null default now(),
  last_login timestamptz not null default now()
);

-- 2. Aktifkan Row Level Security (RLS) untuk keamanan data
alter table public.app_users enable row level security;

-- 3. Kebijakan Keamanan (RLS Policies):
-- Izinkan aplikasi membaca data pengguna (untuk autentikasi & daftar akun bagi admin)
create policy "Allow read users"
  on public.app_users for select
  using (true);

-- Izinkan registrasi akun baru
create policy "Allow register users"
  on public.app_users for insert
  with check (true);

-- Izinkan pembaruan last_login & update peran
create policy "Allow update users"
  on public.app_users for update
  using (true);

-- Izinkan penghapusan akun oleh admin
create policy "Allow delete users"
  on public.app_users for delete
  using (true);

-- ==============================================================================
-- CARA MENGANGKAT AKUN ANDA MENJADI ADMIN / PEMILIK WEBSITE:
-- Catatan: Daftarkan dulu akun "Shukoh#Dev" di halaman login website,
-- baru jalankan perintah di bawah ini (tanpa tanda -- di depannya):

UPDATE public.app_users
SET role = 'admin'
WHERE username = 'Shukoh#Dev';
-- ==============================================================================

-- ==============================================================================
-- 4. TABEL LAPORAN PENGGUNA (KRITIK, SARAN, BUG)
-- ==============================================================================
create table if not exists public.user_reports (
  id text primary key default gen_random_uuid()::text,
  username text not null,
  type text not null,                  -- 'Bug', 'Kritik', 'Saran'
  page text,
  message text not null,
  status text not null default 'baru', -- 'baru', 'diproses', 'selesai'
  admin_reply text,                    -- Pesan balasan dari pemilik / admin
  replied_at timestamptz,              -- Waktu balasan dikirimkan
  created_at timestamptz not null default now()
);

-- Perintah jika tabel user_reports sudah terlanjur dibuat sebelumnya:
alter table public.user_reports add column if not exists admin_reply text;
alter table public.user_reports add column if not exists replied_at timestamptz;

alter table public.user_reports enable row level security;

create policy "Allow insert reports" on public.user_reports for insert with check (true);
create policy "Allow select reports" on public.user_reports for select using (true);
create policy "Allow update reports" on public.user_reports for update using (true);
create policy "Allow delete reports" on public.user_reports for delete using (true);

-- ==============================================================================
-- 5. TABEL SINKRONISASI DATA KEUANGAN PENGGUNA (CLOUD SYNC ANTAR-PERANGKAT)
-- ==============================================================================
create table if not exists public.user_data (
  username text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

create policy "Allow all on user_data"
  on public.user_data
  for all
  using (true)
  with check (true);

