# Gerbang Fase (Phase Gates) Implementasi EduMotion

Dokumen ini melacak pemenuhan syarat lulus dari setiap fase sebelum berpindah ke fase berikutnya. **Melompati phase gate dilarang.**

---

## Phase 1 Gate — Frontend Only, Feature-Complete dengan JSON Mock Data
**Status Saat Ini:** `APPROVED / PASS` *(Disetujui Pemilik Produk pada 2026-11-24 untuk melanjutkan ke Phase 2–4)*

### Checklist Penerimaan Wajib Phase 1
- [x] Seluruh route Web (57 route eksplisit + fallback 404) & screen Mobile (8 screen) pada `docs/route-and-role-matrix.md` terimplementasi tanpa dead-end route (`apps/web/src/app/AppRouter.jsx`, `apps/mobile/App.jsx`).
- [x] Seluruh fitur critical/high pada `docs/feature-workflow-inventory.md` berstatus `implemented` (10) atau `accepted` (27) dari total 37 kelompok fitur tanpa placeholder atau tombol mati.
- [x] Semua 13 seeded personas across 3 tenant pada `packages/services/src/fixtures/v1/personas-users-tenants.json` & role-scope dapat diuji dari UI (`LoginPage` & `MockScenarioBar`) dan divalidasi oleh mock service adapter (`tests/services/adapter-parity-and-rbac.test.js`, `tests/e2e/responsive-and-workflows.spec.js`).
- [x] Journey Experience Engine mengimplementasikan ke-6 template visual di atas satu canonical view model (`contracts/journey-view-v1.schema.json`), snapshot immutable per chapter, `pendingTemplateId`, mode Adaptive/Personal/Random, dan hybrid unlock (`tests/unit/qa-acceptance-domain.test.js`, `tests/components/renderers-and-mobile.test.jsx`).
- [x] Seluruh 14 canonical question types memiliki renderer siswa (`QuestionRenderer.jsx` & `MobileQuestionCard.jsx`) dan editor pada Manual Question Builder (`ManualQuestionBuilderPage.jsx`), serta legacy `essay` dipetakan ke `worked_solution` (`QST-009`).
- [x] Student Delivery DTO tidak mengekspos `answerSpec`, `scoring`, `provenance`, `governance`, atau pembahasan yang belum rilis (`tests/contracts/canonical-schemas.test.js`, `tests/unit/qa-acceptance-domain.test.js`).
- [x] AI Question Generator mensimulasikan pipeline 9 tahap, verifier deterministik (`verifyGeneratedItemDeterministic`), skenario error (JSON rusak, salah hitung, taksonomi fiktif, kode berbahaya, batas retry, cost cap), dan hanya menghasilkan `draft` (`tests/unit/qa-acceptance-domain.test.js`, `tests/workflows/critical-journeys.test.jsx`).
- [x] Portal Sekolah (grading rubrik `worked_solution`, konseling teraudit, Portal Orang Tua siswa tertaut) dan Konsol Platform Admin (menu scoped per permission — Curriculum Admin terpisah dari Super Admin — wajib `auditReason` lintas-tenant, konfigurasi Journey template) berfungsi penuh (`apps/web/src/features/school/SchoolPages.jsx`, `apps/web/src/features/admin/AdminPages.jsx`).
- [x] Semua form memiliki validasi per field; semua layar utama mendukung state normal, loading, empty, error, unauthorized/forbidden (401/403), dan locked (`MockScenarioBar`, `FeedbackStates.jsx`).
- [x] Audit responsif selesai pada 6 lebar viewport (`320px`, `375px`, `768px`, `1024px`, `1440px`, `1920px`) ditambah preview mobile `390x844` tanpa horizontal overflow tak disengaja, beserta 15 screenshot nyata di `tests/artifacts/viewports/`.
- [x] Baseline aksesibilitas (navigasi keyboard `Tab`, skip-link, `focus-visible`, label semantik/ARIA, indikator non-warna, `reducedMotion`, `highContrast`, `textScale`, touch target `min-h-11` / >= 44px) terimplementasi dan diuji (`tests/e2e/responsive-and-workflows.spec.js`, `apps/web/src/styles/theme.css`).
- [x] `npm run lint`, `npm test` (6 file, 33 test), `npm run build` (`@edumotion/web` + `@edumotion/mobile`), dan `npm run test:e2e` (8/8 test Chromium) seluruhnya **PASS** (exit code `0`).
- [x] `docs/MOCK-DATA-CATALOG.md` dan `docs/PHASE-1-FE-COMPLETION-REPORT.md` selesai ditulis.

---

## Phase 2 Gate — FE Review, Refinement, & Finalisasi API/BE/DB Plan
**Status:** `PASS / APPROVED` *(Seluruh dokumen Phase 2, pembekuan `contracts/openapi-v1.yaml`, refinement FE & verifikasi penuh telah selesai pada 2026-11-24)*
- [x] Audit menyeluruh FE final (`docs/FE-FINAL-REVIEW.md`, `docs/UX-AND-RESPONSIVE-AUDIT.md`) & seluruh temuan high/medium (`FE-REV-01..06`) ditutup dan lulus regresi.
- [x] Pembekuan perilaku FE dan batas DTO/view model (`docs/FEATURE-WORKFLOW-SPECIFICATION.md`, `docs/FRONTEND-ARCHITECTURE.md`).
- [x] Penyusunan `docs/API-CONTRACT-PLAN.md` + `contracts/openapi-v1.yaml`.
- [x] Penyusunan `docs/BACKEND-IMPLEMENTATION-PLAN.md`, `docs/DATABASE-IMPLEMENTATION-PLAN.md`, `docs/ERD.md`, `docs/AUTH-RBAC-TENANCY-MATRIX.md`, `docs/FE-TO-API-TRACEABILITY.md`, `docs/API-MOBILE-COMPATIBILITY.md`, dan `docs/PHASE-2-APPROVAL-PACKAGE.md`.
- [x] Resolusi keputusan terbuka `OPEN-01..05` dicatat eksplisit pada `docs/assumptions-and-open-decisions.md`.

---

## Phase 3 Gate — Backend & Database Implementation
**Status:** `PASS / APPROVED` *(Seluruh skema PostgreSQL, migrasi, seed, security, outbox, host LoopBack 4 + Express alternatif, dan suite test backend/kontrak lulus pada 2026-11-24)*
- [x] Seluruh endpoint `http-services.js` dan operasi inti `/api/v1` terimplementasi di `apps/api/src/http/api-v1-router.js` selaras `contracts/openapi-v1.yaml` (86 path).
- [x] Contract & backend portability tests lulus pada host LoopBack 4 (`@loopback/rest`) maupun Express alternatif (`tests/contracts/openapi-and-portability.test.js`).
- [x] Skema PostgreSQL (`001_canonical_schema.sql`), trigger PL/pgSQL append-only (`002_indexes_and_guards.sql`), seed deterministik, serta uji backup & restore lulus (`tests/backend/migrations-and-backup.test.js`).
- [x] Security suite lulus (`scrypt`, rotasi & pencabutan refresh token, guard `ALLOW_DEMO_PERSONA_LOGIN`, isolasi RBAC/tenant/parent/curriculum-admin, strict CORS allowlist, magic-bytes upload check, pixel-bomb limit, rate limit 429, redaksi log, tx rollback, & outbox DLQ) pada `tests/backend/security-outbox-and-domain.test.js`.
- [x] Endpoint observabilitas (`/api/v1/health`, `/api/v1/ready`, `/api/v1/metrics`) & dokumentasi `docs/PHASE-3-BE-DB-COMPLETION-REPORT.md` selesai.

---

## Phase 4 Gate — FE/BE Integration & Release Readiness
**Status:** `PASS / RELEASE READY` *(Seluruh alur integrasi FE Web & Mobile ↔ LoopBack 4 API + PostgreSQL, contract/portability, regression mock + real backend, & runbook rilis lulus pada 2026-11-24)*
- [x] Critical workflows Web & Mobile lulus integrasi 13 poin Matrix Bagian 12.2 dan Playwright E2E Chromium melawan LoopBack 4 + PostgreSQL nyata (`tests/integration/fe-be-full-matrix.test.js`, `tests/e2e-integration/real-backend.spec.js`).
- [x] Contract compatibility & OpenAPI validation (`contracts/openapi-v1.yaml`) lulus pada LoopBack 4 dan host alternatif Express (`tests/contracts/openapi-and-portability.test.js`).
- [x] Nol issue P0/P1 terkait keamanan (`scrypt`, rotated refresh token, magic bytes media validation, strict CORS, redaksi log), integritas data (append-only DB triggers, tx rollback, idempotency), integritas ujian (server timer, releaseAt, tanpa hearts), dan isolasi lintas-tenant.
- [x] Regresi responsif lulus pada seluruh viewport target Web (`320px`–`1920px`) & Mobile preview (`390×844`) baik pada mode `mock` maupun `http` nyata (`tests/artifacts/viewports/`, `tests/artifacts/integration/`).
- [x] Pengukuran latensi & readiness dasar terdokumentasi (`health=14ms`, `ready=5ms`) bersama panduan deployment, migrasi, backup/restore & rollback (`docs/DEPLOYMENT-RUNBOOK-AND-ROLLBACK.md`).
- [x] Kompatibilitas mobile (`Bearer` token + `SecureStore` abstraction + sinkronisasi PostgreSQL lintas perangkat Web ↔ Mobile) terverifikasi.
- [x] Mock adapter (`VITE_ADAPTER_MODE=mock`) tetap berfungsi penuh (`8/8` Playwright + `33/33` unit/workflow tests) dan bebas dari secret produksi.
- [x] Laporan penutup `docs/PHASE-4-INTEGRATION-COMPLETION-REPORT.md`, `docs/implementation-status.md`, & `docs/feature-workflow-inventory.md` (`37/37 accepted`) selesai diperbarui.
