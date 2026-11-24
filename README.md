# EduMotion — Consolidated Review & Implementation Baseline

Paket ini menggabungkan seluruh artefak EduMotion yang tersedia, hasil audit konsistensi, kontrak kanonis, rencana implementasi, dan prototype Journey Experience Engine.

## Mulai dari sini
1. `docs/COMPREHENSIVE-AUDIT-AND-REVIEW.md` — temuan, resolusi konflik, rekomendasi.
2. `docs/ARCHITECTURE-DECISIONS.md` — keputusan arsitektur yang menjadi acuan.
3. `docs/CANONICAL-DATA-MODEL.md` — model data tunggal dan migrasi.
4. `docs/API-AND-EVENT-CONTRACTS.md` — endpoint dan event baseline.
5. `contracts/` — JSON Schema dan katalog template.
6. `docs/QA-ACCEPTANCE-TEST-PLAN.md` — test plan.
7. `docs/IMPLEMENTATION-ROADMAP.md` — urutan delivery.
8. `prototypes/journey-experience-engine.html` — prototype yang sudah direview dan diperbaiki.

## Struktur
- `docs/`: audit, keputusan, model data, API, QA, roadmap.
- `contracts/`: schema authoring, student delivery, Journey view model, template catalog.
- `prototypes/`: Journey Experience Engine demo.
- `source-artifacts/`: semua HTML, Markdown, dan README sumber dari paket-paket EduMotion terdahulu.

## Keputusan produk yang dikunci
- Random template berubah pada chapter baru.
- User hanya dapat mengganti template untuk chapter berikutnya.
- Unlock template menggunakan model hybrid: base + achievement/premium.
- Satu canonical progression engine, banyak visual renderer.
- Mastery, journey progress, XP, dan player rank adalah konsep berbeda.
- Manual Builder dan AI Generator menggunakan satu Question Authoring Schema.
- AI output tidak boleh auto-publish.
- Formal exam menggunakan server-authoritative timer, immutable snapshot, autosave, dan tanpa hearts.

## Catatan penting
- Prototype HTML bersifat simulasi frontend, bukan aplikasi produksi dan bukan bukti integrasi backend.
- File HTML referensi lama dipertahankan sebagai arsip; bila ada perbedaan, dokumen kanonis dalam `docs/` dan `contracts/` yang berlaku.
- Estimasi sprint belum dikunci karena perlu discovery repository, tim, dan infrastruktur.
- Audit ini merupakan review dokumen/prototype, bukan audit keamanan formal atau validasi akademik oleh subject-matter expert.

## Teknologi baseline
- Web: React + Vite + JavaScript/JSX.
- Styling: Tailwind CSS.
- Backend: LoopBack 4.
- Database: PostgreSQL.
- Queue/cache: Redis + BullMQ.
- Canonical cross-platform contracts: JSON Schema.
- Math/physics execution: deterministic, isolated, resource-bounded services.


## Updated implementation order (mandatory)

1. **FE first, complete**: implement all features, functions, flows and states using JSON mock data. Responsive across mobile/tablet/desktop.
2. **FE review/refinement**: adjust UX, consistency, workflows and edge cases; then finalize API contract, BE plan and DB plan based on the reviewed FE.
3. **Backend & Database**: implement against the approved contracts.
4. **Integration**: switch FE adapter from mock to real API and run regression/contract tests.

The FE must be backend-agnostic and use a configurable API base URL. APIs must support web and mobile (Android/iOS). Compatible backend implementations may be built using LoopBackJS, Express.js, Django, FastAPI, Go or other frameworks without changing FE feature components/business flows—only configuration and a compatible adapter/contract implementation should be needed. Read `docs/IMPLEMENTATION-STRATEGY-FE-FIRST-AND-PORTABLE-API.md`.
