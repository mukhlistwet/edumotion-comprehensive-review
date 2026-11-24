# Katalog Data Mock JSON v1 (`@edumotion/services`)

Seluruh fixture JSON deterministik versi `1.0.0` disimpan di `packages/services/src/fixtures/v1/` dan dijalankan oleh `createMockStore` & `createMockServices`.  
**Tidak ada secret atau kredensial production di dalam fixture.**

## 1. Daftar File Fixture (`packages/services/src/fixtures/v1/`)

| File | Isi Utama | Validasi Kontrak |
|---|---|---|
| `curricula-taxonomy.json` | 3 kurikulum (`MERDEKA`, `CAMBRIDGE`, `IB_DP`), 5 jenjang (`SD` s.d. `UNIVERSITY`), 2 mapel (`Matematika`, `Fisika`), 8 topik, 10 kompetensi | Grounding untuk Question Bank, AI Generator, & Seed SQL Phase 3 |
| `personas-users-tenants.json` | 3 tenant institusi (2 aktif, 1 pending verifikasi) + 13 seeded persona lintas role & entitlement | RBAC, scoping, child privacy, parent link |
| `learning-paths-journeys.json` | 3 learning paths, 4 chapters (termasuk chapter 1 & 2 untuk uji transisi batas chapter), node berurutan, seed snapshot & unlock | `contracts/journey-view-v1.schema.json` & `openapi-v1.yaml` |
| `questions-bank.json` | 20 soal mencakup **ke-14 canonical question types**, multi-versi (v1 published + v2 in_review), draft tenant B (uji isolasi), dan soal gagal validasi | `contracts/question-authoring-v1.schema.json` & `question-student-delivery-v1.schema.json` |
| `activities-assessments.json` | 11 aktivitas belajar + 3 asesmen (`Tryout`, `UTS Formal Exam` dengan delayed release `releaseAt`, `Placement Test`) | Aturan ujian formal & snapshot |
| `mastery-gamification.json` | Append-only XP ledger, meta streak/hearts/gems, bukti kompetensi, jadwal spaced repetition (1/3/7/14/30 hari), achievement, quest, leaderboard | Pemisahan Mastery vs XP & privasi anak |
| `ai-generation-runs.json` | Seeded AI generation run lengkap dengan 1 item `needs_review` dan 1 item `failed` (salah hitung + retry tercapai), serta model policies | Pipeline 9 tahap AI Generator |
| `school-platform-admin.json` | Data rombel/siswa/kalender SMA Cendekia & Bimbel Pintar, kiriman soal uraian untuk rubric grading, sinyal BK, peran kustom, paket, audit log | Portal Sekolah & Platform Admin |

## 2. Daftar 13 Persona Ter-Seed & Kredensial Uji Phase 3–4

Kata sandi demo standar pada seed lokal PostgreSQL (di-hash `crypto.scrypt` di DB): `edumotion-demo`.

| ID Persona | Peran | Scope / Entitlement | Kegunaan Pengujian |
|---|---|---|---|
| `usr_student_smp_free` | `student` (Bima Pratama) | `tenant_cendekia` · `freemium` · `isMinor: true` | Belajar siswa SMP, 3 template base, special templates terkunci, masking leaderboard |
| `usr_student_sma_prem` | `student` (Alex Wijaya) | `tenant_cendekia` · `premium` · `isMinor: true` | Semua 6 template Journey terbuka, simulasi & ujian SMA |
| `usr_student_sd_family` | `student` (Nadia Santoso) | `family` · tertaut ke `usr_parent_dewi` | Akun siswa SD & keterhubungan portal orang tua |
| `usr_student_univ` | `student` (Rama Kusuma) | `premium` · `UNIVERSITY` · `isMinor: false` | Kalkulus universitas & tampilan leaderboard publik |
| `usr_author_a` | `content_author` | `tenant_cendekia` | Manual Question Builder, submit review, AI Question Generator |
| `usr_reviewer_a` | `reviewer` | `tenant_cendekia` | Menelaah antrean review, request changes / approve |
| `usr_publisher_a` | `publisher` | `tenant_cendekia` | Menerbitkan soal `approved` -> `published` (idempotent) |
| `usr_school_admin_a` | `vice_principal` (Rina Amelia) | `tenant_cendekia` | Portal Akademi: rombel, siswa, kalender, laporan, grading |
| `usr_counselor_a` | `counselor` | `tenant_cendekia` | Sinyal risiko belajar & catatan tindak lanjut BK (teraudit) |
| `usr_parent_dewi` | `parent` (Dewi Santoso) | `linkedStudentIds: ['usr_student_sd_family']` | Portal Orang Tua terbatas hanya ke Nadia |
| `usr_teacher_b` | `teacher` (Farid Rahman) | `tenant_pintar` | Uji isolasi negatif lintas tenant |
| `usr_platform_curriculum` | `platform_curriculum_admin` | Scoped kurikulum & template | Menguji admin non-superuser (tanpa billing/institusi/audit log) |
| `usr_platform_super` | `platform_super_admin` | Platform penuh (wajib alasan audit) | Manajemen institusi, billing, audit logs, AI ops |

## 3. Simulasi Kondisi Jaringan & Edge Case (`__mockControl`) & Paritas Layanan Phase 2

Kedua adapter (`mock` dan `http`) kini mengekspos 12 service dengan daftar method yang identik, termasuk `auth.refreshSession()` dan `media.uploadQuestionMedia()` (`magicBytesHex` check). Panel **`MockScenarioBar`** & `__mockControl` mendukung `latencyMs`, `forceScenario` (`normal` | `empty` | `server_error` | `offline` | `timeout` | `unauthorized` | `forbidden`), `clientClockOffsetMs`, dan `reset()`.
