# Panduan Deployment, Runbook Operasional & Rollback EduMotion (Phase 4)

**Cakupan Layanan:**
1. `@edumotion/api` (`apps/api` — LoopBack 4 REST `/api/v1` + PostgreSQL)
2. `@edumotion/web` (`apps/web` — React + Vite SPA)
3. `@edumotion/mobile` (`apps/mobile` — React Native + Expo + `SecureStore`)

---

## 1. Variabel Environment & Konfigurasi (`Single Config Switch`)

Rujukan templat: [.env.example](file:///d:/Experimen/edumotion-comprehensive-review/.env.example)

| Variabel | Aplikasi | Nilai Dev Lokal | Nilai Staging / Produksi Wajib |
|---|---|---|---|
| `NODE_ENV` | `@edumotion/api` | `development` | `production` |
| `PORT` / `HOST` | `@edumotion/api` | `4000` / `127.0.0.1` | `4000` / `0.0.0.0` |
| `DATABASE_URL` | `@edumotion/api` | *(kosong → pakai `@electric-sql/pglite`)* | `postgres://user:pass@host:5432/edumotion` |
| `PGLITE_DATA_DIR` | `@edumotion/api` | `./apps/api/data/pglite` atau `memory://` | Tidak dipakai saat `DATABASE_URL` aktif |
| `JWT_SECRET` | `@edumotion/api` | Dev secret sementara | Secret acak ≥ 32 karakter dari Secret Manager |
| `ALLOWED_ORIGINS` | `@edumotion/api` | Origin localhost dev (`4173–4176`, `5173`) | Domain HTTPS resmi web (dilarang wildcard `*`) |
| `ALLOW_DEMO_PERSONA_LOGIN` | `@edumotion/api` | `true` | **`false`** (menutup `/auth/demo-login` & `/auth/demo-personas` dengan 403) |
| `AUTO_SEED_DEMO` | `@edumotion/api` | `true` | **`false`** |
| `VITE_ADAPTER_MODE` | `@edumotion/web` | `mock` atau `http` | `http` |
| `VITE_API_BASE_URL` | `@edumotion/web` | `http://127.0.0.1:4000/api/v1` | `https://api.edumotion.domain/api/v1` |
| `EXPO_PUBLIC_ADAPTER_MODE` | `@edumotion/mobile` | `mock` atau `http` | `http` |
| `EXPO_PUBLIC_API_BASE_URL` | `@edumotion/mobile` | `http://127.0.0.1:4000/api/v1` | `https://api.edumotion.domain/api/v1` |

---

## 2. Prosedur Menjalankan Secara Lokal & Container

### A. Menjalankan Lokal dengan Docker Compose (PostgreSQL 16 + Redis 7 + API)
```bash
docker compose up -d postgres redis
npm run db:migrate
npm run db:seed    # Opsional, hanya untuk environment dev/demo
npm run dev:api
```

### B. Menjalankan Lokal Tanpa Daemon Docker (Menggunakan PGlite PostgreSQL WASM)
```bash
npm run db:migrate
npm run db:seed
npm run dev:api
```
Untuk menjalankan frontend terhubung ke backend real:
```bash
# Terminal 1: API LoopBack 4 di port 4000
npm run dev:api
# Terminal 2: Web (set VITE_ADAPTER_MODE=http VITE_API_BASE_URL=http://127.0.0.1:4000/api/v1)
npm run dev
# Terminal 3: Mobile Preview (set EXPO_PUBLIC_ADAPTER_MODE=http EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:4000/api/v1)
npm run dev:mobile
```

---

## 3. Monitoring, Health Checks & Tolok Ukur Performa

- **Liveness:** `GET /api/v1/health` → `{ ok: true, service: '@edumotion/api' }`
- **Readiness:** `GET /api/v1/ready` → memverifikasi `SELECT 1` pada PostgreSQL & mengembalikan jumlah antrean `outbox_events` (`503` jika DB gagal).
- **Metrics:** `GET /api/v1/metrics` → `totalRequests`, `totalErrors`, `statusCounts`.
- **Observasi Benchmark Lokal (`tests/e2e-integration/real-backend.spec.js` pada Windows):**
  - `GET /api/v1/health`: **`14 ms`** (`200 OK`)
  - `GET /api/v1/ready` (termasuk `SELECT 1` + query outbox): **`5 ms`** (`200 OK`)
  - Skenario lengkap E2E Browser (Login Web → Journey Node Persist → Tryout Submit → Mobile `390×844` Sync): **`5.0 s`**
  - Skenario lengkap Author (Manual Draft → AI Draft) → School Portal → Super Admin Audit Logs: **`6.4 s`**

---

## 4. Prosedur Backup, Restore, Migrasi Aman, Rollback & Rotasi Secret

1. **Backup Sebelum Migrasi:**
   Jalankan `exportDatabaseBackup(db)` ([backup-restore.js](file:///d:/Experimen/edumotion-comprehensive-review/apps/api/src/db/backup-restore.js)) atau `pg_dump` sebelum menerapkan skrip migrasi `00N_*.sql` baru di staging/produksi. Simpan hasil beserta `checksumSha256`.
2. **Aturan Migrasi Aditif & Forward-Fix:**
   Skrip migrasi di [apps/api/migrations/](file:///d:/Experimen/edumotion-comprehensive-review/apps/api/migrations/001_canonical_schema.sql) dicatat dengan checksum SHA-256 pada tabel `schema_migrations`. Jangan mengubah isi skrip yang sudah diterapkan; perbaikan skema memakai file baru (`003_...sql`) dalam transaksi.
3. **Rollback Aplikasi & Data:**
   - **Rollback API/FE:** Kembalikan container image / build tag sebelumnya; kontrak `/api/v1` aditif menjamin klien lama tetap kompatibel.
   - **Rollback Skema:** Gunakan backup snapshot terverifikasi melalui `restoreDatabaseBackup(db, backupPayload)` (untuk dev/staging) atau `pg_restore` snapshot sebelum migrasi.
4. **Rotasi `JWT_SECRET` & Pencabutan Sesi:**
   - Ganti `JWT_SECRET` di Secret Manager; seluruh access token lama (berumur maks 15 menit) akan ditolak `401` dan klien otomatis merotasi melalui refresh token atau login ulang.
   - Untuk pencabutan paksa seluruh sesi, jalankan: `UPDATE auth_refresh_tokens SET revoked_at = NOW() WHERE revoked_at IS NULL;`
