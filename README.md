# EduMotion — Platform Pembelajaran Adaptif, Journey Engine & Asesmen Multi-Tenant

**EduMotion** adalah platform pembelajaran interaktif dan asesmen multi-peran yang dibangun dengan arsitektur **Frontend-First, Domain-Driven & Backend-Portable**. Satu engine aturan bisnis tunggal (`@edumotion/domain`) menggerakkan permukaan **Web (`@edumotion/web`)**, **Mobile React Native/Expo (`@edumotion/mobile`)**, serta **Backend API LoopBack 4 + PostgreSQL (`@edumotion/api`)**, dengan kemampuan berpindah antara mode **Mock JSON** dan **HTTP API nyata** cukup melalui konfigurasi environment tanpa mengubah komponen UI maupun alur bisnis.

---

## Daftar Isi

1. [Tentang Aplikasi & Arsitektur Monorepo](#tentang-aplikasi--arsitektur-monorepo)
2. [Fitur Utama & Keputusan Produk Kanonis](#fitur-utama--keputusan-produk-kanonis)
3. [Data Seed & Daftar Akun Testing Semua Aktor (14 Role / 17 Persona)](#data-seed--daftar-akun-testing-semua-aktor-14-role--17-persona)
4. [Alur Pengujian Lengkap (Testing Flows per Aktor)](#alur-pengujian-lengkap-testing-flows-per-aktor)
5. [How to Deploy & Run Step-by-Step](#how-to-deploy--run-step-by-step)
6. [Verifikasi, Pengujian & Peta Dokumentasi Proyek](#verifikasi-pengujian--peta-dokumentasi-proyek)

---

## Tentang Aplikasi & Arsitektur Monorepo

EduMotion mendukung segmen **B2C (SD, SMP, SMA, Universitas, Keluarga/Orang Tua)** dan **B2B Multi-Tenant (Sekolah & Bimbingan Belajar)** dengan isolasi tenant ketat, pemisahan antara nilai akademik (*mastery*) vs poin gamifikasi (*XP*), serta tata kelola konten soal terstruktur.

### Arsitektur Workspace

```mermaid
flowchart TB
  subgraph Clients["Aplikasi Frontend (UI & Shell Saja)"]
    Web["@edumotion/web (React 19 + Vite + Tailwind v4 + KaTeX)"]
    Mobile["@edumotion/mobile (React Native + Expo + SecureStore)"]
  end

  subgraph Shared["Paket Bersama (Portable, Zero DOM/Framework Lock-In)"]
    Tokens["@edumotion/design-tokens (Warna, Tipografi, Spacing 4px)"]
    Domain["@edumotion/domain (9 Modul Aturan Bisnis & RBAC Tunggal)"]
    Services["@edumotion/services (12 Service Facade, Mock Adapter, HTTP Client)"]
  end

  subgraph Backend["Backend & Penyimpanan (@edumotion/api)"]
    API["LoopBack 4 REST /api/v1 + Express Alt Portability"]
    Security["Keamanan (scrypt, HMAC JWT 15m, Refresh Rotation, Magic-Bytes Media)"]
    Outbox["Transactional Outbox Worker & Dead-Letter Queue"]
    DB["PostgreSQL (pg.Pool / PGlite WASM) + Append-Only Triggers"]
  end

  Web --> Tokens
  Web --> Services
  Mobile --> Tokens
  Mobile --> Services
  Services --> Domain
  Services -->|"VITE_ADAPTER_MODE=http / EXPO_PUBLIC_ADAPTER_MODE=http"| API
  API --> Domain
  API --> Security
  API --> Outbox
  API --> DB
```

### Struktur Direktori Utama

- `packages/design-tokens/`: Token warna kanonis, status semantik non-warna, skala tipografi, dan spasi 4px lintas Web & Mobile.
- `packages/domain/`: Single Source of Truth aturan bisnis (`enums`, `rbac-engine`, `journey-engine`, `question-engine`, `mastery-engine`, dll.).
- `packages/services/`: 12 domain service (`SERVICE_NAMES`), fixture JSON v1 (`packages/services/src/fixtures/v1/`), Mock Adapter deterministik, dan HTTP Adapter lengkap dengan single-flight token refresh.
- `apps/web/`: Aplikasi Web responsif (`320px` s.d. `1920px`) dengan `57` rute eksplisit + fallback 404 dan `React.lazy` code-splitting.
- `apps/mobile/`: Aplikasi React Native / Expo dengan `8` layar native, `expo-secure-store` abstraction, serta preview `react-native-web` (`390×844`).
- `apps/api/`: Server **LoopBack 4** (`@loopback/rest` + `@loopback/core`) pada `/api/v1` sesuai `contracts/openapi-v1.yaml` (`86` path), host alternatif plain `express` (`apps/api/src/express-alt-app.js`), migrasi SQL berversi, seed deterministik, serta backup/restore checksum SHA-256.
- `contracts/`: JSON Schema kanonis (`question-authoring-v1`, `question-student-delivery-v1`, `journey-view-v1`, `journey-template-catalog`) dan kontrak OpenAPI `3.0.3` (`contracts/openapi-v1.yaml`).
- `docs/`: Dokumen arsitektur, model data, ERD, matriks RBAC/tenancy, rencana implementasi, laporan Phase 1–4, dan runbook rilis/rollback.
- `prototypes/` & `source-artifacts/`: Arsip HTML referensi dan prototype awal Journey Experience Engine.

### Teknologi Baseline

| Lapisan | Teknologi |
|---|---|
| Web | React 19 + Vite 8 + React Router 7 + Tailwind CSS v4 + KaTeX + Lucide |
| Mobile | React Native 0.88 + Expo 58 + `expo-secure-store` + `react-native-web` preview |
| Backend Default & Alternatif | LoopBack 4 (`@loopback/core`, `@loopback/rest`) + Express Alt Portability host |
| Database | PostgreSQL (`pg.Pool` untuk PostgreSQL 16 Docker/server; `@electric-sql/pglite` WASM untuk dev lokal tanpa Docker) |
| Cache / Antrean | Redis 7 + Transactional Outbox PostgreSQL (`outbox_events`, `processed_events`) |
| Pengujian | ESLint 9, Vitest (`44` unit/contract/backend/integration tests), Playwright (`8` mock E2E + `2` real-backend E2E) |

---

## Fitur Utama & Keputusan Produk Kanonis

1. **Journey Experience Engine (6 Template Visual di Atas Satu Model Kanonis):**
   - Mendukung 6 tema map visual (`adventure`, `board`, `explore`, `skill`, `racing`, `galaxy`) di atas satu `journey-view-v1.schema.json`.
   - Snapshot chapter bersifat **immutable**: mengganti template di tengah chapter hanya menyimpan `pendingTemplateId` dan baru diterapkan ketika memulai chapter baru.
   - Mode pemilihan: `adaptive`, `personal`, `random` (memilih 1× saat chapter baru, menghindari template chapter sebelumnya, dan bertahan saat refresh), serta `admin`.
   - Model unlock **hybrid** (paket `freemium` mendapat template dasar; `premium`/`institution_pro`/achievement membuka template khusus).
2. **Bank Soal Kanonis & 14 Tipe Soal Interaktif:**
   - Seluruh 14 tipe soal (`single_choice`, `multiple_select`, `true_false`, `numeric`, `short_text`, `fill_blank`, `matching`, `ordering`, `drag_drop`, `graph_plot`, `formula_input`, `diagram_label`, `simulation`, `worked_solution`) didukung penuh pada renderer siswa maupun editor author. Tipe lama `essay` dinormalisasi menjadi `worked_solution`.
   - **Zero Answer Leakage:** Proyeksi Student Delivery DTO menghapus `answerSpec`, `scoring`, `provenance`, `governance`, dan pembahasan yang belum dirilis.
3. **Manual Question Builder & Siklus Publikasi Terkendali:**
   - Editor 5-tab (`1. Konten` s.d. `5. Delivery`) + **Live Student Preview** + upload media tervalidasi (`MIME`, ekstensi, `magicBytesHex` anti-spoofing `.exe`, batas `10 MB`, batas dimensi pixel-bomb `4096×4096`).
   - Siklus tata kelola ketat: `draft` → `in_review` → `approved` → `published` → `archived`. Soal `published` bersifat **immutable** (perubahan wajib membuat versi baru `v2` sebagai `draft`).
4. **AI Question Generator (Draft-Only + Verifier Deterministik):**
   - Menjalankan pipeline 9 tahap dengan verifier deterministik anti-JSON rusak, salah hitung matematika, taksonomi fiktif, dan kode berbahaya/XSS (`eval`/`<script>`).
   - Membatasi anggaran per run (`budgetCapUsd = $1.00`) dan **output AI wajib masuk sebagai `draft`** (dilarang auto-publish).
5. **Latihan Interaktif vs Ujian Formal (Tryout / Formal Exam):**
   - Latihan memakai Hearts dan hint; **Ujian Formal** menggunakan timer otoritatif server, snapshot soal immutable, autosave jawaban berkala, pelepasan hasil berbasis jadwal `release_at`, **tanpa Hearts**, dan **XP tidak pernah memengaruhi nilai ujian**.
6. **Mastery Engine, Spaced Repetition & Gamifikasi Append-Only:**
   - Skor penguasaan kompetensi (`0–100`) dan interval ulangan berkala (`1, 3, 7, 14, 30` hari) dihitung terpisah dari saldo XP.
   - Tabel `xp_ledger` dan `audit_logs` dilindungi **trigger PL/pgSQL append-only** di level database PostgreSQL (`UPDATE`/`DELETE` ditolak dengan `APPEND_ONLY_VIOLATION`).
   - **Privasi Anak Default:** Akun dengan `isMinor = true` disamarkan (`Penjelajah #XXXX`) pada `/student/leaderboard` kecuali pemilik akun sendiri atau bila sudah opt-in persetujuan orang tua.
7. **Portal Sekolah, Konseling BK & Portal Orang Tua:**
   - Koreksi rubrik esai terstruktur (`worked_solution`), manajemen rombel/siswa/kalender, peran kustom sekolah, catatan konseling BK teraudit, serta Portal Orang Tua yang hanya mengizinkan akses ke siswa tertaut resmi di `parent_student_links`.
8. **Konsol Platform Admin & Isolasi Lintas-Tenant:**
   - Pemisahan izin ketat antara `platform_curriculum_admin` (kurikulum, soal global, konfigurasi template Journey; tanpa billing/manajemen user) vs `platform_super_admin` (manajemen tenant/user/billing/audit log lintas-tenant yang mewajibkan `auditReason`).

---

## Data Seed & Daftar Akun Testing Semua Aktor (14 Role / 17 Persona)

Repositori menyediakan skrip seed deterministik yang mengisi **seluruh 14 role kanonis** (`17` akun persona across `3` tenant), kurikulum, 20 soal (14 tipe lengkap), learning journey, assessment/tryout, leaderboard, sinyal konseling, serta data audit awal.

> **Password Default Semua Akun Demo Seed:** `edumotion-demo`  
> *(Dapat diubah lewat variabel environment `DEMO_SEED_PASSWORD` sebelum menjalankan `npm run db:seed`)*

### Cara Menjalankan Migrasi & Seed

```bash
npm run db:migrate
npm run db:seed
```

Perintah `npm run db:seed` bersifat **idempotent** (`ON CONFLICT DO NOTHING`), aman dijalankan ulang, otomatis melakukan hashing password menggunakan **`scrypt` + salt acak** untuk backend HTTP, serta menampilkan tabel ringkasan seluruh 17 akun aktor di terminal.

### Daftar Lengkap 17 Akun Aktor Seed (14 Canonical Roles)

| # | ID Akun | Role Kanonis | Nama Tampilan | Email Login | Password | Tenant | Rute Awal Default | Fokus Pengujian Utama |
|---|---|---|---|---|---|---|---|---|
| 1 | `usr_student_smp_free` | `student` | Bima Pratama | `bima.smp@edumotion.demo` | `edumotion-demo` | `tenant_cendekia` (SMA Cendekia) | `/student/dashboard` | Siswa SMP Freemium, leaderboard anak tersamar (`isMinor`), template dasar, hybrid lock |
| 2 | `usr_student_sma_prem` | `student` | Alex Wijaya | `alex.sma@edumotion.demo` | `edumotion-demo` | `tenant_cendekia` (SMA Cendekia) | `/student/dashboard` | Siswa SMA Premium, semua 6 template Journey terbuka, rubrik `worked_solution` |
| 3 | `usr_student_sd_family` | `student` | Nadia Santoso | `nadia.sd@edumotion.demo` | `edumotion-demo` | Global B2C (`null`) | `/student/dashboard` | Siswa SD Family, tertaut ke akun Orang Tua `usr_parent_dewi` |
| 4 | `usr_student_univ` | `student` | Rama Kusuma | `rama.univ@edumotion.demo` | `edumotion-demo` | Global B2C (`null`) | `/student/dashboard` | Mahasiswa Universitas Premium (`isMinor = false`, Kalkulus & Fisika) |
| 5 | `usr_parent_dewi` | `parent` | Dewi Santoso | `dewi.parent@edumotion.demo` | `edumotion-demo` | Global B2C (`null`) | `/school/parent` | Portal Orang Tua; hanya dapat melihat progres anak tertaut (`Nadia Santoso`) |
| 6 | `usr_author_a` | `content_author` | Sari Lestari, S.Pd. | `sari.author@cendekia.demo` | `edumotion-demo` | `tenant_cendekia` | `/studio` | Manual Question Builder (5-tab + upload media) & AI Question Generator (`draft`) |
| 7 | `usr_reviewer_a` | `reviewer` | Dr. Hendro Gunawan | `hendro.reviewer@cendekia.demo` | `edumotion-demo` | `tenant_cendekia` | `/studio` | Antrean Review SME (`/studio/reviews`): approve / reject draft soal |
| 8 | `usr_publisher_a` | `publisher` | Dina Kartika | `dina.publisher@cendekia.demo` | `edumotion-demo` | `tenant_cendekia` | `/studio` | Publikasi soal berstatus `approved` → `published` & arsip soal |
| 9 | `usr_teacher_b` | `teacher` | Farid Rahman | `farid.teacher@pintar.demo` | `edumotion-demo` | `tenant_pintar` (Bimbel Pintar) | `/school/dashboard` | **Uji isolasi lintas-tenant** (ditolak `403` mengakses soal/siswa SMA Cendekia) |
| 10 | `usr_homeroom_a` | `homeroom_teacher` | Budi Hartono, S.Pd. | `budi.walikelas@cendekia.demo` | `edumotion-demo` | `tenant_cendekia` | `/school/dashboard` | Wali Kelas `X IPA 1` (`cls_10_ipa_1`): pantau kelas perwalian, laporan, konseling |
| 11 | `usr_counselor_a` | `counselor` | Bagus Prabowo, M.Psi. | `bagus.bk@cendekia.demo` | `edumotion-demo` | `tenant_cendekia` | `/school/dashboard` | Konselor / BK (`/school/counseling`): melihat sinyal risiko & mencatat tindak lanjut teraudit |
| 12 | `usr_academic_admin_a` | `school_academic_admin` | Tono Suryono, S.Kom. | `tono.akademik@cendekia.demo` | `edumotion-demo` | `tenant_cendekia` | `/school/dashboard` | Admin Akademik Sekolah: kelola siswa, staf, kelas, mapel, kalender, & peran kustom (`/school/roles`) |
| 13 | `usr_school_admin_a` | `vice_principal` | Rina Amelia | `rina.wakasek@cendekia.demo` | `edumotion-demo` | `tenant_cendekia` | `/school/dashboard` | Wakasek Kurikulum: koreksi rubrik `worked_solution` (`/school/assessments`), kelas, kalender |
| 14 | `usr_principal_a` | `principal` | Drs. Wahyu Hidayat, M.Pd. | `wahyu.kepsek@cendekia.demo` | `edumotion-demo` | `tenant_cendekia` | `/school/dashboard` | Kepala Sekolah: supervisi dashboard, laporan akademik, konseling, & pengaturan sekolah |
| 15 | `usr_school_owner_a` | `school_owner` | Ir. Irfan Hakim, M.M. | `irfan.yayasan@cendekia.demo` | `edumotion-demo` | `tenant_cendekia` | `/school/dashboard` | Ketua Yayasan / School Owner: wewenang penuh tata kelola institusi sekolah |
| 16 | `usr_platform_curriculum` | `platform_curriculum_admin` | Maya Kusuma | `maya.curriculum@edumotion.demo` | `edumotion-demo` | Global Platform (`null`) | `/admin/dashboard` | Admin Kurikulum **Scoped**: kelola kurikulum & template Journey global; ditolak `403` untuk billing & audit log |
| 17 | `usr_platform_super` | `platform_super_admin` | Super Admin | `admin.platform@edumotion.demo` | `edumotion-demo` | Global Platform (`null`) | `/admin/dashboard` | Super Admin Platform: kelola seluruh tenant (`tenant_harapan` dll.), billing, AI monitor, & `/admin/audit-logs` |

### Daftar Tenant Seed

| Tenant ID | Nama Institusi | Jenis | Paket | Status |
|---|---|---|---|---|
| `tenant_cendekia` | SMA Cendekia Nusantara (Bandung) | Sekolah | `institution_pro` | `active` |
| `tenant_pintar` | Bimbel Pintar Bersama (Depok) | Bimbingan belajar | `institution_basic` | `active` |
| `tenant_harapan` | SMP Harapan Bangsa (Bogor) | Sekolah | `trial` | `pending_verification` |

> **Catatan Demo Bar (`MockScenarioBar`):** Saat `VITE_ADAPTER_MODE=mock` atau ketika `ALLOW_DEMO_PERSONA_LOGIN=true`, tombol **"Buka simulator persona"** di pojok kanan bawah Web serta daftar quick-login di halaman `/login` maupun aplikasi Mobile memungkinkan perpindahan instan ke seluruh 17 akun aktor tanpa mengetik password berulang kali. Di produksi, atur `ALLOW_DEMO_PERSONA_LOGIN=false` agar endpoint demo login otomatis tertutup (`403`) dan login hanya melalui form email + kata sandi.

---

## Alur Pengujian Lengkap (Testing Flows per Aktor)

### Diagram Alur Lintas Aktor

```mermaid
flowchart LR
  subgraph StudentFlow["1. Alur Belajar & Mobile Sync (Student)"]
    S1["Login Siswa (Web / Mobile)"] --> S2["Journey Map Bab 1 (Snapshot Immutable)"]
    S2 --> S3["Set Pending Template (Berlaku Bab 2)"]
    S3 --> S4["Latihan 14 Tipe Soal & Ujian Formal (Tanpa Hearts)"]
    S4 --> S5["XP Ledger & Mastery Sync ke Mobile 390x844"]
  end

  subgraph AuthorFlow["2. Alur Tata Kelola Konten (Studio)"]
    A1["Author: Manual Builder / AI Generator -> Draft"] --> A2["Submit Review"]
    A2 --> A3["Reviewer SME: Approve"]
    A3 --> A4["Publisher: Publish v1 (Immutable)"]
  end

  subgraph SchoolFlow["3. Alur Sekolah, BK & Orang Tua"]
    SC1["Wakasek / Guru: Koreksi Rubrik Uraian"] --> SC2["Konselor BK: Tindak Lanjut Sinyal Risiko"]
    SC3["Admin Akademik / Kepsek / Yayasan: Kelola Kelas & Peran"]
    SC4["Parent: Pantau Anak Tertaut (403 Jika Non-Tertaut)"]
  end

  subgraph AdminFlow["4. Alur Platform Admin & Audit"]
    P1["Curriculum Admin (Scoped): Kurikulum & Template Global"]
    P2["Super Admin: Verifikasi Tenant + Wajib auditReason -> Audit Logs"]
  end

  A4 --> S4
```

---

### Flow 1 — Siswa (`student`) & Sinkronisasi Lintas Perangkat (Web ↔ Mobile)

1. **Login:** Masuk sebagai **`bima.smp@edumotion.demo`** (SMP Freemium) atau **`alex.sma@edumotion.demo`** (SMA Premium) dengan password `edumotion-demo`. Anda diarahkan ke `/student/dashboard`.
2. **Eksplorasi 14 Tipe Soal:** Buka `/student/gallery` untuk menguji interaktivitas seluruh 14 tipe soal kanonis (termasuk Plot Grafik, Input Rumus KaTeX, Label Diagram, Seret & Letakkan, dan Simulasi Fisika 2D) tanpa kebocoran kunci jawaban.
3. **Journey Experience Engine & Snapshot Immutable:**
   - Buka `/student/journeys/jrn_math_smp_algebra/chapters/ch_alg_01`.
   - Pilih template baru melalui pemilih template (mis. `galaxy` untuk Alex Premium; untuk Bima Freemium template khusus terkunci `TEMPLATE_LOCKED` hingga upgrade paket `/upgrade`).
   - Pastikan **map Bab 1 tetap bertahan** pada template snapshot aktif, lalu selesaikan node yang tersedia hingga membuka Bab 2 (`startNextChapter`), di mana `pendingTemplateId` otomatis diterapkan.
4. **Latihan vs Ujian Formal Tryout:**
   - Buka `/student/activities/act_alg_intro` untuk menguji mode Latihan (Hearts berkurang jika salah, hint tersedia, pembaruan `xp_ledger`).
   - Buka `/student/assessments` lalu mulai Ujian Formal (`tryout` / `formal_exam`). Pastikan timer berjalan, **tidak ada Hearts**, nilai tidak dipengaruhi XP, dan status hasil mengikuti `release_at`.
5. **Leaderboard Ramah Anak & Cross-Device Sync Web ↔ Mobile:**
   - Buka `/student/leaderboard` sebagai `bima.smp@edumotion.demo`: akun minor lain tampil tersamar (`Penjelajah #XXXX`).
   - Buka aplikasi Mobile (`npm run dev:mobile`) pada `http://127.0.0.1:5174`, login menggunakan akun **yang sama** (`bima.smp@edumotion.demo`), lalu pastikan saldo XP dan progres Journey langsung sinkron dari PostgreSQL.

### Flow 2 — Content Authoring, AI Generator & Publikasi Soal (`content_author` → `reviewer` → `publisher`)

1. **Author (`sari.author@cendekia.demo`):**
   - Masuk ke `/studio/questions/new` (**Manual Question Builder**): isi konten & spesifikasi 5 tab, uji unggah media PNG valid vs penolakan file palsu/berbahaya, lihat **Live Student Preview** (tanpa bocor kunci), simpan sebagai `draft`, lalu klik **Ajukan Review**.
   - Masuk ke `/studio/ai-generator` (**AI Question Generator**): jalankan generasi soal berbatas anggaran (`budgetCapUsd`), tinjau hasil verifikasi deterministik, dan terima item valid → item **wajib masuk bank soal sebagai `draft`**, bukan `published`.
2. **Reviewer SME (`hendro.reviewer@cendekia.demo`):**
   - Buka `/studio/reviews`, periksa draf yang diajukan Sari, lalu klik **Setujui (`approved`)**.
3. **Publisher (`dina.publisher@cendekia.demo`):**
   - Buka `/studio/reviews`, klik **Terbitkan (`published`)**. Coba edit langsung soal `published` sebagai Author → sistem menolak perubahan langsung (`PUBLISHED_QUESTION_IMMUTABLE`), dan Author hanya dapat membuat **Versi Baru (`v2`)** berstatus `draft`.

### Flow 3 — Operasional & Supervisi Sekolah + Uji Isolasi Lintas-Tenant

1. **Penilaian Rubrik (`rina.wakasek@cendekia.demo`):** Buka `/school/assessments`, pilih pengumpulan `worked_solution` atas nama Alex Wijaya, masukkan skor tiap kriteria rubrik dan catatan, lalu simpan.
2. **Wali Kelas (`budi.walikelas@cendekia.demo`):** Buka `/school/dashboard` dan `/school/students`; perhatikan cakupan data otomatis terfilter hanya pada kelas perwaliannya (`X IPA 1`).
3. **Konseling BK (`bagus.bk@cendekia.demo`):** Buka `/school/counseling`, tinjau sinyal risiko belajar (Dimas Saputra), tambahkan catatan tindak lanjut konseling → tercatat ke audit log.
4. **Admin Akademik, Kepala Sekolah & Yayasan (`tono.akademik@cendekia.demo`, `wahyu.kepsek@cendekia.demo`, `irfan.yayasan@cendekia.demo`):** Uji manajemen siswa (`/school/students`), custom role sekolah (`/school/roles`), kalender (`/school/calendar`), dan laporan akademik (`/school/reports`).
5. **Uji Isolasi Lintas-Tenant (`farid.teacher@pintar.demo`):** Login sebagai guru Tenant B (`tenant_pintar`). Pastikan kelas/siswa yang muncul hanyalah milik Bimbel Pintar (`Kelas Intensif SMP-1`) dan akses terhadap draft soal SMA Cendekia (`tenant_cendekia`) ditolak `403 Forbidden`.

### Flow 4 — Portal Orang Tua (`parent`)

1. Login sebagai **`dewi.parent@edumotion.demo`** (di Web `/school/parent` maupun tab **Anak** pada `@edumotion/mobile`).
2. Verifikasi bahwa hanya progres belajar, XP, jadwal, dan histori anak tertaut (**Nadia Santoso** — `usr_student_sd_family`) yang dapat dilihat. Permintaan API ke ID siswa lain otomatis ditolak dengan `403 FORBIDDEN_STUDENT_LINK`.

### Flow 5 — Konsol Platform Admin (`platform_curriculum_admin` vs `platform_super_admin`)

1. **Admin Kurikulum Scoped (`maya.curriculum@edumotion.demo`):**
   - Di `/admin/dashboard`, kelola kurikulum global (`/admin/curricula`), bank soal global (`/admin/questions`), dan aktif/nonaktifkan template Journey (`/admin/journey-templates`).
   - Pastikan menu institusi, billing, manajemen user, dan audit log tidak tersedia (dan ditolak `403` pada level API).
2. **Super Admin Platform (`admin.platform@edumotion.demo`):**
   - Buka `/admin/institutions`, verifikasi atau ubah status tenant (mis. `SMP Harapan Bangsa`) dengan mengisi **`auditReason` wajib**.
   - Buka `/admin/audit-logs` dan pastikan setiap aksi lintas-tenant serta publikasi soal tercatat permanen secara kronologis (append-only di PostgreSQL).

---

## How to Deploy & Run Step-by-Step

### Prasyarat Sistem
- **Node.js `>= 20`** & **npm `>= 10`** (diuji pada `npm 11.16.0` dengan npm workspaces)
- *(Opsional, untuk Mode Produksi/Staging Container)* **Docker** & **Docker Compose** (PostgreSQL 16 + Redis 7)

---

### Mode 1 — Quick Local Development (Mock JSON Mode, Tanpa Backend/DB)

Cocok untuk demonstrasi antarmuka Web & Mobile secepat mungkin menggunakan fixture JSON v1.

**Step 1: Clone & Install Dependensi Monorepo**
```bash
git clone https://github.com/mukhlistwet/edumotion-comprehensive-review.git
cd edumotion-comprehensive-review
npm install
```

**Step 2: Jalankan Web Frontend (`http://localhost:5173`)**
```bash
npm run dev
```

**Step 3: Jalankan Mobile Preview (`http://localhost:5174`) — Terminal Baru**
```bash
npm run dev:mobile
```
*(Untuk menjalankan di emulator Android/iOS atau Expo Go, gunakan `npm --workspace=@edumotion/mobile run start`)*

---

### Mode 2 — Local Full-Stack Real Backend + PostgreSQL Tanpa Docker (Embedded `@electric-sql/pglite`)

Menjalankan API **LoopBack 4** nyata pada port `4000` dengan database **PostgreSQL WASM (`@electric-sql/pglite`)** yang tersimpan di disk lokal (`./apps/api/data/pglite`), lengkap dengan DDL, trigger PL/pgSQL append-only, password `scrypt`, JWT, dan migrasi.

**Step 1: Salin Konfigurasi Environment**
```bash
cp .env.example .env
```
*(Di Windows PowerShell: `Copy-Item .env.example .env`. Biarkan `DATABASE_URL=` kosong agar otomatis memakai `PGlite`.)*

**Step 2: Jalankan Migrasi Skema PostgreSQL & Seed Semua 17 Aktor**
```bash
npm run db:migrate
npm run db:seed
```

**Step 3: Jalankan Backend API LoopBack 4 (`http://127.0.0.1:4000/api/v1`)**
```bash
npm run dev:api
```
Verifikasi endpoint health & OpenAPI:
- Health: `http://127.0.0.1:4000/api/v1/health`
- Readiness DB: `http://127.0.0.1:4000/api/v1/ready`
- OpenAPI JSON: `http://127.0.0.1:4000/openapi.json`

**Step 4: Jalankan Web Frontend Terhubung ke Backend Nyata (`http://localhost:5173`) — Terminal Baru**
- **Linux / macOS (Bash):**
  ```bash
  VITE_ADAPTER_MODE=http VITE_API_BASE_URL=http://127.0.0.1:4000/api/v1 npm run dev
  ```
- **Windows (PowerShell):**
  ```powershell
  $env:VITE_ADAPTER_MODE="http"; $env:VITE_API_BASE_URL="http://127.0.0.1:4000/api/v1"; npm run dev
  ```

**Step 5: Jalankan Mobile Preview Terhubung ke Backend Nyata (`http://localhost:5174`) — Terminal Baru**
- **Linux / macOS (Bash):**
  ```bash
  EXPO_PUBLIC_ADAPTER_MODE=http EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:4000/api/v1 npm run dev:mobile
  ```
- **Windows (PowerShell):**
  ```powershell
  $env:EXPO_PUBLIC_ADAPTER_MODE="http"; $env:EXPO_PUBLIC_API_BASE_URL="http://127.0.0.1:4000/api/v1"; npm run dev:mobile
  ```

---

### Mode 3 — Staging / Production Deployment (PostgreSQL 16 + Redis 7 via Docker Compose & Build Web/Mobile)

**Step 1: Siapkan Variabel Lingkungan Produksi (`.env`)**
Salin `.env.example` dan **wajib ubah** nilai berikut untuk environment staging/produksi:
```env
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgres://edumotion:STRONG_DB_PASSWORD@localhost:5432/edumotion
JWT_SECRET=ganti-dengan-secret-acak-minimal-32-karakter-dari-secret-manager
ALLOWED_ORIGINS=https://app.edumotion.domain
ALLOW_DEMO_PERSONA_LOGIN=false
AUTO_SEED_DEMO=false

VITE_ADAPTER_MODE=http
VITE_API_BASE_URL=https://api.edumotion.domain/api/v1

EXPO_PUBLIC_ADAPTER_MODE=http
EXPO_PUBLIC_API_BASE_URL=https://api.edumotion.domain/api/v1
```
> **Penting:** Menyetel `ALLOW_DEMO_PERSONA_LOGIN=false` dan `AUTO_SEED_DEMO=false` secara otomatis menutup akses `/api/v1/auth/demo-personas` serta `/api/v1/auth/demo-login` (`403 Forbidden`) di server produksi.

**Step 2: Jalankan PostgreSQL 16 & Redis 7 via Docker Compose**
```bash
docker compose up -d postgres redis
```

**Step 3: Terapkan Migrasi Database (dan Seed Khusus Environment Staging/QA)**
```bash
DATABASE_URL="postgres://edumotion:edumotion_dev_password@localhost:5432/edumotion" npm run db:migrate

# Opsional: jalankan hanya untuk environment staging/QA (jangan dijalankan di produksi nyata)
DATABASE_URL="postgres://edumotion:edumotion_dev_password@localhost:5432/edumotion" npm run db:seed
```

**Step 4: Jalankan Backend API**
- **Via Node.js langsung (mis. di balik Nginx/Caddy + PM2/systemd):**
  ```bash
  npm run dev:api
  ```
- **Atau via Docker Compose container penuh** (pastikan menambahkan `Dockerfile` Node 20 bila mem-build image `api` dari `docker-compose.yml` dan memperbarui `JWT_SECRET` serta `ALLOW_DEMO_PERSONA_LOGIN=false`).

**Step 5: Build Bundle Produksi Frontend Web & Mobile**
```bash
VITE_ADAPTER_MODE=http VITE_API_BASE_URL=https://api.edumotion.domain/api/v1 \
EXPO_PUBLIC_ADAPTER_MODE=http EXPO_PUBLIC_API_BASE_URL=https://api.edumotion.domain/api/v1 \
npm run build
```
- Artefak statis `@edumotion/web` dihasilkan di `apps/web/dist/` (siap di-deploy ke Nginx, Cloudflare Pages, Vercel, atau S3 + CloudFront).
- Artefak preview `@edumotion/mobile` dihasilkan di `apps/mobile/dist/`, dan build native Android/iOS dapat dibuat dengan EAS / Expo (`apps/mobile/`).

**Step 6: Verifikasi Pasca-Deploy & Backup/Rollback**
1. Pastikan `GET /api/v1/health` mengembalikan `{ "ok": true }` (`200 OK`) dan `GET /api/v1/ready` mengembalikan status koneksi PostgreSQL serta antrean outbox.
2. Sebelum setiap migrasi skema baru (`003_...sql`), ambil snapshot database (`pg_dump` atau `exportDatabaseBackup` di `apps/api/src/db/backup-restore.js`).
3. Rujuk panduan rilis, rotasi `JWT_SECRET`, pencabutan refresh token massal, dan rollback lengkap pada [docs/DEPLOYMENT-RUNBOOK-AND-ROLLBACK.md](docs/DEPLOYMENT-RUNBOOK-AND-ROLLBACK.md).

---

## Verifikasi, Pengujian & Peta Dokumentasi Proyek

### Suite Pengujian Monorepo

| Perintah | Cakupan Pengujian |
|---|---|
| `npm run lint` | ESLint 9 across seluruh workspace (menegakkan boundary UI bebas `fetch`/`/api/v1` & domain bebas DOM) |
| `npm test` | Seluruh Vitest suite (unit arsitektur, Ajv schema kanonis, OpenAPI/portability, paritas adapter & RBAC, QA domain, renderer 14 soal & 6 Journey, RTL workflow, migrasi/trigger/backup DB, keamanan/outbox, & 13 skenario integrasi FE/BE) |
| `npm run test:backend` | Suite kontrak OpenAPI, portabilitas LoopBack 4 vs Express, migrasi SQL, trigger append-only, & backup/restore |
| `npm run test:integration` | Matriks integrasi penuh Web + Mobile `SecureStore` ↔ LoopBack 4 + PostgreSQL |
| `npm run test:e2e` | Playwright E2E Chromium (mode `mock`: 6 viewport `320px–1920px`, aksesibilitas keyboard, alur lintas peran, & Mobile `390×844`) |
| `npm run test:e2e:integration` | Playwright E2E Chromium **Real-Backend** (API `:4000` + Web `:4175` + Mobile `:4176` tersinkronisasi PostgreSQL nyata) |

### Peta Dokumentasi Kanonis

- `docs/COMPREHENSIVE-AUDIT-AND-REVIEW.md` — temuan audit awal, resolusi konflik, & rekomendasi.
- `docs/ARCHITECTURE-DECISIONS.md` & `docs/IMPLEMENTATION-STRATEGY-FE-FIRST-AND-PORTABLE-API.md` — keputusan arsitektur & strategi FE-first portable.
- `docs/CANONICAL-DATA-MODEL.md` & `docs/ERD.md` — model data tunggal & ERD relasional PostgreSQL.
- `docs/API-AND-EVENT-CONTRACTS.md`, `docs/API-CONTRACT-PLAN.md`, & `contracts/openapi-v1.yaml` — spesifikasi REST API & kontrak OpenAPI `3.0.3`.
- `docs/AUTH-RBAC-TENANCY-MATRIX.md` & `docs/FE-TO-API-TRACEABILITY.md` — matriks 14 role, 32 izin, isolasi tenant, & ketertelusuran FE ke API.
- `docs/QA-ACCEPTANCE-TEST-PLAN.md` — skenario penerimaan QA kanonis.
- `docs/DEPLOYMENT-RUNBOOK-AND-ROLLBACK.md` — panduan deploy produksi, health check, rotasi secret, backup/restore, & rollback.
- `docs/PHASE-1-FE-COMPLETION-REPORT.md`, `docs/PHASE-2-APPROVAL-PACKAGE.md`, `docs/PHASE-3-BE-DB-COMPLETION-REPORT.md`, & `docs/PHASE-4-INTEGRATION-COMPLETION-REPORT.md` — laporan pencapaian dan gerbang fase Phase 1–4.
