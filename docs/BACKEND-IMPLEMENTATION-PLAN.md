# Rencana Implementasi Backend EduMotion (`@edumotion/api`)

**Lokasi Modul Target (Phase 3):** `apps/api/` (`package.json` `@edumotion/api`, pure JavaScript ESM)

---

## 1. Bounded Modules & Tanggung Jawab Arsitektur

```text
apps/api/src/
  http/
    api-v1-router.js        # Controller/route handlers tipis (/api/v1), parsing input & response DTO
    middlewares.js          # Correlation ID, security headers, strict CORS allowlist, Bearer auth, error normalizer
  services/
    app-container.js        # Komposisi repositories, domain services, security & outbox
    auth-service.js         # Scrypt auth, JWT/HMAC access token, rotated refresh token, demo policy guard
    journey-service.js      # Orchestrator snapshot chapter, pending template, node prereq & next chapter tx
    learning-service.js     # Taksonomi, paths, sanitized activity delivery, practice attempt, mastery & XP
    question-service.js     # Question Bank, validasi @edumotion/domain, review SME, publish idempotent, cloning
    ai-service.js           # AI run brief validation, cost cap, 9-stage simulator, deterministic verifier, draft-only accept
    assessment-service.js   # Snapshot ujian immutable, clock otoritatif server, autosave/submit idempotent, release policy
    gamification-service.js # Append-only XP ledger query, child-safe leaderboard, quests, achievements, notifications
    school-admin-service.js # Tenant/class/parent scoping, rubric grading, audited counseling, custom roles, platform admin
    outbox-worker.js        # Transactional outbox dispatcher, idempotent consumer ledger, bounded retry & dead-letter
  repositories/
    sql-repositories.js     # Isolasi seluruh SQL PostgreSQL + row-to-domain mappers & transaksi ACID
  security/
    password.js             # crypto.scrypt + salt acak + crypto.timingSafeEqual
    tokens.js               # Bearer token verifier/signer + SHA-256 hash refresh tokens
    rate-limiter.js         # Sliding-window rate limit per IP & kategori endpoint (auth, ai, media, api)
    media-validator.js      # MIME, ekstensi, magic bytes check, max size, max image dimensions, randomized object key
    logger.js               # JSON structured logger dengan redaksi token/password/answerSpec + metrics collector
  db/
    pool.js                 # Driver PostgreSQL dual-mode: pg.Pool (DATABASE_URL) atau PGlite Postgres WASM (lokal/test)
    migrate.js              # Runner migrasi SQL berversi (schema_migrations)
    seed.js                 # Seed deterministik dari struktur kanonis setara FIXTURES_V1
    backup-restore.js       # Export snapshot JSON berurutan FK & restore terverifikasi checksum/row-count
  loopback-app.js           # Host default LoopBack 4 (@loopback/rest RestApplication + /openapi.json + mount /api/v1)
  express-alt-app.js        # Host alternatif plain Express membuktikan 0% ketergantungan kontrak ke LoopBack
  server.js                 # Entrypoint HTTP server lokal & health check
```

## 2. Batas Portabilitas & Pemisahan Domain vs Framework
- Seluruh aturan bisnis inti (validasi 14 tipe soal, sanitasi Student Delivery DTO, kalkulasi skor, evaluasi ekspresi matematika, algoritma pemilihan template Journey, state transitions, RBAC default + custom role evaluation) dipanggil langsung dari `@edumotion/domain` (`packages/domain/src/`) di sisi server — **bukan** ditulis ulang di controller LoopBack.
- Controller HTTP (`api-v1-router.js`) hanya bertugas membaca request, memanggil middleware auth/rate-limit, memanggil application service, dan memetakan `ApiError` ke format `ErrorEnvelope`.
- Transisi antar-tabel konsekuensial (`completeNode`, `startNextChapter`, `publishQuestion`, `acceptItemToDraft`, `submitPracticeAttempt`, `submitSession`, `upgradeEntitlement`) dijalankan dalam transaksi database tunggal `db.transaction(...)` bersama `idempotency_records` dan `outbox_events`.

## 3. Keamanan Minimum & Observabilitas Wajib
1. **Password & Token:** `crypto.scrypt` dengan salt 16-byte unik; access token kedaluwarsa 15 menit; refresh token di-hash SHA-256 dan dirotasi pada setiap `/auth/refresh`; reuse token yang sudah dicabut langsung ditolak `401`.
2. **Non-Production Demo Guard:** `POST /auth/demo-login` dan `GET /auth/demo-personas` dikontrol flag environment `ALLOW_DEMO_PERSONA_LOGIN` (default `true` pada local dev, ditolak `403` apabila disetel `false` untuk staging/produksi).
3. **RBAC & Scoping Server-Side:** Setiap handler memeriksa permission (`hasPermission`), `tenantId`, `assignedClassIds`, dan `linkedStudentIds` di server sebelum mengembalikan atau memodifikasi data.
4. **CORS & Headers:** Allowlist origin (`ALLOWED_ORIGINS`); penolakan wildcard `*` bila credentialed; header keamanan `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.
5. **Rate Limiting & Cost Protection:** Pembatasan permintaan terpisah pada `/auth/*`, `/ai/*`, dan `/question-media/presign`; kuota biaya `budgetCapUsd` AI divalidasi di server sebelum menjalankan proses.
6. **Observabilitas:** Log JSON selalu melewati `redactSensitiveFields` sehingga password, token, jawaban/kunci soal (`answerSpec`), dan PII berlebih tidak pernah tercetak. Endpoint `/api/v1/health`, `/api/v1/ready`, dan `/api/v1/metrics` disediakan untuk monitoring.
