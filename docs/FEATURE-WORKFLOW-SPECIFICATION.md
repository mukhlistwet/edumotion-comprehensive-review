# Spesifikasi Fitur & Workflow Final EduMotion (Baseline Kontrak Phase 2)

Dokumen ini mengunci perilaku fungsional frontend final untuk seluruh kelompok fitur (`FEAT-ACC-01` s.d. `FEAT-ADM-03`) sebagai dasar penurunan API Contract, Backend Plan, dan Database Plan.

## 1. Auth, Akun, Entitlement & App Shell (`FEAT-ACC-01..05`)
- **Login & Registrasi:** Form email/password memvalidasi format email dan panjang kata sandi >= 6 karakter per field. Registrasi membekukan jenjang & kurikulum awal (`cur_merdeka`/`cur_cambridge`/`cur_ib`).
- **Demo Persona Switcher:** Hanya aktif bila mode mock atau `ALLOW_DEMO_PERSONA_LOGIN=true` (dinonaktifkan di environment produksi). Di Web, perpindahan persona lewat `AuthSessionContext.switchPersona` menavigasikan rute target secara atomik bersama `pendingRedirectPath` agar guard peran tidak memicu false-403.
- **Token Lifecycle Lintas Platform:** Web dan Mobile memakai access token Bearer (`15m`) + refresh token terrotasi (`/auth/refresh`). Token Mobile disimpan di `SecureStore` abstraction (`apps/mobile/src/config/mobile-env.js`).
- **States Wajib:** Setiap layar menangani `loading`, `empty`, `error` (+ coba lagi), `401` (refresh/session expired), dan `403` (access denied).

## 2. Pengalaman Belajar, Mastery & Gamifikasi (`FEAT-STD-01..04`, `FEAT-GAM-01..02`)
- **Hierarki Tunggal:** `Curriculum + Version → Subject → Learning Path → Chapter → Journey Node → Activity → Question Version`.
- **Mastery vs XP:** Skor penguasaan kompetensi (`0–100`) dihitung dari kebenaran jawaban, kesulitan, pemakaian hint, dan **anti-farming** (soal ber-`questionVersionId` identik hanya dihitung 1 bukti unik dalam perhitungan `distinctQuestionCount`). XP berasal dari ledger append-only (`xp_ledger`) dengan entri kompensasi untuk koreksi.
- **Spaced Repetition:** Interval kanonis `1, 3, 7, 14, 30` hari menyesuaikan skor dan kebenaran sesi review.
- **Leaderboard Aman Anak:** Pengguna `isMinor === true` otomatis disamarkan (`Penjelajah #XXXX`) untuk seluruh pengguna lain kecuali dirinya sendiri.

## 3. Journey Experience Engine (`FEAT-JRN-01..05`)
- **Satu View Model, 6 Adapter Visual:** `adventure`, `board`, `explore`, `skill`, `racing`, dan `galaxy` semuanya merender `JourneyViewModel` (`contracts/journey-view-v1.schema.json`).
- **Snapshot & Boundary Rules:** Snapshot dibuat saat chapter pertama dibuka dan immutable sepanjang chapter berjalan. Pemilihan template baru di tengah chapter menyimpan `pendingTemplateId`; perubahan baru aktif saat `startNextChapter` (atau fallback ke `adaptive` bila terkunci/nonaktif). Mode `random` memilih 1 kali di awal chapter dan menghindari template chapter sebelumnya.

## 4. Question Engine, Builder, AI Generator & Assessment (`FEAT-QST-01..04`, `FEAT-ASM-01..03`, `FEAT-STU-01..04`, `FEAT-AIQ-01..03`)
- **14 Tipe Kanonis + Alias Legacy:** Semua 14 tipe dibaca/tulis via `question-authoring-v1.schema.json`; `essay` dinormalisasi ke `worked_solution` (`responseMode: 'rich_text'`). Delivery ke siswa selalu melalui proyeksi allowlist `question-student-delivery-v1.schema.json`.
- **Tata Kelola Soal:** State machine `draft → validation_failed | in_review → approved → published → archived`. Versi `published` immutable; pengeditan wajib memanggil `createNewVersion` (`version + 1`, `draft`).
- **AI Generator:** Pipeline 9 tahap + verifier deterministik (tolak JSON rusak, salah hitung matematika, referensi taksonomi fiktif, dan pola kode berbahaya). Item AI yang diterima selalu masuk sebagai `draft`.
- **Ujian Formal:** Snapshot soal dibuat immutable saat session start; timer selalu dihitung terhadap `serverNowMs` (kebal manipulasi jam client); hearts dimatikan; XP tidak memengaruhi nilai; pembahasan ditahan bila `releaseAt > serverNow`.

## 5. Portal Sekolah & Konsol Platform (`FEAT-SCH-01..04`, `FEAT-ADM-01..03`)
- **Isolasi Tenant & Class Scope:** Staf sekolah dibatasi ke `tenantId` dan `assignedClassIds` masing-masing.
- **Grading Rubrik & Konseling:** Penilaian manual soal `worked_solution` dan akses/penambahan catatan sinyal BK semuanya tercatat dalam `audit_logs`.
- **Portal Orang Tua:** Terbatas secara server-side ke `linkedStudentIds`.
- **Admin Terpisah (`platform_curriculum_admin` vs `platform_super_admin`):** Admin kurikulum tidak dapat mengubah status tenant maupun membaca log audit lintas tenant; perubahan institusi oleh Super Admin mewajibkan `auditReason` >= 5 karakter.
