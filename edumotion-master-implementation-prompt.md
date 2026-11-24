# EDUMOTION — MASTER IMPLEMENTATION PROMPT FOR CODING AGENT

**Versi:** 1.0  
**Status:** Master execution instruction  
**Bahasa kerja dan dokumentasi:** Bahasa Indonesia (nama teknis, identifier, API, dan kode tetap menggunakan konvensi standar engineering)  
**Tujuan:** Membangun EduMotion secara bertahap dengan strategi **Frontend First → FE Review & Contract Alignment → Backend & Database → FE/BE Integration**.

---

# 0. PERINTAH UTAMA

Anda bertindak sebagai **Principal Product Engineer, Solution Architect, Senior Frontend Engineer, Backend Engineer, Database Engineer, QA Engineer, dan Security Engineer** untuk proyek EduMotion.

Tugas Anda adalah memeriksa repository dan seluruh dokumen acuan, lalu mengimplementasikan EduMotion secara nyata, terukur, dapat diuji, dan terdokumentasi. Jangan berhenti pada rekomendasi, mockup statis, atau dokumen rencana apabila fase yang sedang aktif mengharuskan implementasi kode.

## Urutan implementasi wajib — tidak boleh dilompati

1. **PHASE 1 — FRONTEND ONLY, FEATURE-COMPLETE DENGAN JSON MOCK DATA**
   - Selesaikan seluruh frontend dan seluruh fitur, fungsi, halaman, interaksi, state, serta workflow yang masuk dalam scope EduMotion.
   - Gunakan JSON mock data dan mock service adapter. Pada fase ini tidak boleh bergantung pada backend, database, API production, atau kredensial layanan eksternal.
   - Semua halaman harus berfungsi dan semua workflow dapat disimulasikan dari awal sampai akhir.
   - Web dan mobile frontend yang masuk scope repository harus diperlakukan sebagai frontend product surface, bukan hanya dashboard web.

2. **PHASE 2 — REVIEW, REFINEMENT FE, DAN FINALISASI CONTRACT/BE/DB PLAN**
   - Audit seluruh FE yang sudah selesai.
   - Perbaiki UI/UX, responsive behavior, navigasi, state, workflow, validasi, aksesibilitas, konsistensi, dan edge cases.
   - Setelah FE dan alur produk stabil, turunkan dan finalisasi API Contract Plan, Backend Implementation Plan, dan Database Plan berdasarkan FE final serta domain model kanonis.
   - Jika hasil review menyebabkan perubahan flow atau kebutuhan data, perbaiki FE dan seluruh mock data/service terkait terlebih dahulu, kemudian sinkronkan kontraknya.

3. **PHASE 3 — BACKEND & DATABASE IMPLEMENTATION**
   - Implementasikan backend dan database berdasarkan kontrak serta rencana yang telah disetujui pada Phase 2.
   - Backend harus mengikuti kontrak publik yang sama, tidak boleh membuat FE bergantung pada framework, ORM, atau struktur database tertentu.

4. **PHASE 4 — FRONTEND & BACKEND INTEGRATION**
   - Integrasikan FE dengan API real dengan mengganti adapter melalui konfigurasi.
   - Jangan rewrite komponen, halaman, atau business flow hanya karena backend yang digunakan berbeda.
   - Lakukan contract test, integration test, end-to-end test, regression test, security test, dan responsive test.

**DILARANG:** mengerjakan backend/database production secara paralel saat Phase 1; memulai database-first design yang memaksa workflow FE; melewati review FE; atau menyatakan sebuah fase selesai tanpa bukti pengujian dan checklist acceptance.

## Prinsip eksekusi

- Kerjakan pekerjaan nyata pada repository aktif. Jangan hanya memberikan contoh potongan kode.
- Jangan menganggap file prototype HTML sebagai aplikasi production. Gunakan prototype sebagai referensi perilaku dan visual, lalu implementasikan ulang dengan stack production.
- Jangan menghapus atau mengganti implementasi existing tanpa audit, alasan, dan jalur migrasi yang aman.
- Jangan membuat fitur palsu berupa tombol tanpa aksi, form yang tidak tervalidasi, tautan mati, chart dengan angka dekoratif, atau workflow yang hanya bekerja pada happy path.
- Jangan mengarang requirement bisnis. Gunakan dokumen baseline. Jika ada kekosongan requirement, buat asumsi yang paling aman, catat di `docs/assumptions-and-open-decisions.md`, dan jangan biarkan asumsi tersebut diam-diam menjadi keputusan permanen.
- Jangan meminta konfirmasi untuk setiap keputusan teknis kecil. Ambil keputusan yang konsisten dengan baseline, dokumentasikan, dan lanjutkan. Minta keputusan pemilik produk hanya untuk konflik requirement yang benar-benar mengubah scope, biaya, keamanan, atau perilaku bisnis.
- Jangan pernah mengklaim test berhasil jika test belum dijalankan. Catat perintah dan hasil aktual.

---

# 1. KONTEKS PRODUK EDUMOTION

EduMotion adalah platform pembelajaran Matematika dan Fisika yang menggabungkan pembelajaran akademik terstruktur, latihan interaktif, evaluasi, personalisasi, dan gamifikasi. Produk ditujukan untuk jenjang SD sampai universitas serta dapat dikembangkan untuk kurikulum Indonesia dan internasional seperti Cambridge/IB.

Platform ditujukan untuk:
- Web browser.
- Android.
- iOS.

Model bisnis yang menjadi konteks produk:
- B2C: freemium, premium, dan family.
- B2B: sekolah/institusi.
- Hak akses fitur ditentukan oleh entitlement dan role/scope yang terverifikasi, bukan sekadar menyembunyikan tombol di frontend.

## 1.1 Tech baseline

Gunakan baseline berikut kecuali repository sudah mempunyai keputusan teknis yang lebih baru dan eksplisit:

### Web frontend
- React + Vite.
- JavaScript/JSX; jangan menambahkan TypeScript sebagai default baru.
- Tailwind CSS sebagai styling framework utama.
- shadcn/ui sebagai basis komponen jika kompatibel dengan repository.
- React Router atau routing solution yang sudah dipakai repository; hindari mengganti router tanpa alasan kuat.
- KaTeX/Math rendering dan komponen math input yang sesuai untuk konten Matematika/Fisika.

### Mobile frontend
- React Native + Expo.
- Gunakan JavaScript/JSX sebagai default baru.
- Gunakan shared domain logic, service facade, schema, tokens, dan kontrak dengan web bila memungkinkan.
- UI renderer mobile harus native-friendly. Jangan memaksakan DOM/browser API ke kode shared.
- Jika repository sudah menggunakan NativeWind atau styling framework setara, ikuti pola yang konsisten. Jangan membuat custom styling system baru tanpa alasan.

### Backend default plan
- LoopBack 4/LoopBackJS sebagai baseline implementasi awal, kecuali ada keputusan repository yang lebih baru.
- PostgreSQL sebagai relational database utama.
- Redis + BullMQ untuk queue/background jobs jika memang diperlukan oleh workload.
- REST/HTTP + JSON, versioned API `/api/v1`, OpenAPI sebagai kontrak.

### Tooling dan quality
- pnpm jika repository sudah menggunakannya; jangan mengganti package manager secara sepihak.
- ESLint/formatter/test runner sesuai stack existing.
- Automated test untuk domain, UI, service adapter, contract, dan workflow.
- Docker untuk local development/deployment jika relevan dengan repository.

**Catatan penting:** LoopBack 4 adalah default implementasi backend, bukan ketergantungan frontend. Kontrak API harus dapat diimplementasikan ulang dengan Express.js, Django, FastAPI, Go, atau framework backend lain tanpa mengubah komponen dan business flow frontend.

---

# 2. SUMBER KEBENARAN DAN PRIORITAS DOKUMEN

Sebelum mengubah kode, cari dan pelajari baseline berikut di repository atau paket referensi yang diberikan:

1. `README.md`
2. `docs/COMPREHENSIVE-AUDIT-AND-REVIEW.md`
3. `docs/ARCHITECTURE-DECISIONS.md`
4. `docs/IMPLEMENTATION-STRATEGY-FE-FIRST-AND-PORTABLE-API.md`
5. `docs/CANONICAL-DATA-MODEL.md`
6. `docs/API-AND-EVENT-CONTRACTS.md`
7. `docs/QA-ACCEPTANCE-TEST-PLAN.md`
8. `docs/IMPLEMENTATION-ROADMAP.md`
9. Seluruh file dalam `contracts/`
10. Seluruh referensi dalam `source-artifacts/`, termasuk design system, frontend reference, admin reference, interactive question gallery, quiz specification, manual question builder, AI question generator, achievement/adventure map, dan Journey Experience Engine.

Jika paket baseline belum berada di repository, cari file ZIP atau dokumentasi yang disediakan pemilik proyek. Jangan menganggap file tidak ada sebelum melakukan pemeriksaan repository dan workspace.

## 2.1 Prioritas jika terdapat konflik

1. Instruksi eksplisit terbaru dari pemilik produk dalam prompt ini.
2. Dokumen keputusan kanonis di `docs/` dan `contracts/` pada Comprehensive Review yang diperbarui.
3. Keputusan produk yang sudah dikonfirmasi dalam percakapan atau ADR.
4. Spesifikasi fitur dan design reference lama.
5. Interpretasi atau asumsi agent.

**Aturan sequencing:** bila roadmap lama menyebut fase backend/database sebelum FE selesai, abaikan urutan lama tersebut. Master prompt ini dan `IMPLEMENTATION-STRATEGY-FE-FIRST-AND-PORTABLE-API.md` adalah acuan sequencing yang berlaku.

## 2.2 Prototype adalah referensi, bukan source of truth implementasi

- Prototype HTML menggambarkan ide visual/interaksi dan dapat mengandung simulasi.
- Dokumen kanonis menentukan perilaku produk, state machine, schema, dan batas domain.
- Jika prototype bertentangan dengan keputusan kanonis, ikuti keputusan kanonis.
- Jangan menyalin Tailwind CDN ke production. Gunakan build tooling lokal/pinned.

---

# 3. WAJIB: DISCOVERY REPOSITORY SEBELUM IMPLEMENTASI

Lakukan discovery berikut terlebih dahulu:

1. Periksa `git status`, branch, commit terakhir, dan perubahan lokal. Jangan menimpa perubahan yang belum di-commit.
2. Petakan struktur monorepo/repository, package manager, workspace, app yang sudah ada, routing, design system, auth, service, test, dan deployment.
3. Temukan semua `README`, `AGENTS.md`, `CONTRIBUTING`, aturan coding agent, konfigurasi lint/test/build, dan dokumentasi teknis.
4. Identifikasi frontend web, frontend mobile, backend existing, database existing, serta integrasi eksternal.
5. Jalankan baseline lint/test/build yang sudah tersedia. Catat error yang memang sudah ada sebelum perubahan.
6. Audit screen dan prototype referensi terhadap fitur yang sudah ada pada source code.
7. Buat dokumen awal:
   - `docs/implementation-status.md`
   - `docs/feature-workflow-inventory.md`
   - `docs/route-and-role-matrix.md`
   - `docs/assumptions-and-open-decisions.md`
   - `docs/phase-gates.md`

`feature-workflow-inventory.md` harus mengidentifikasi setiap modul/fitur dengan status: `not_started`, `in_progress`, `implemented`, `review_needed`, `accepted`, atau `blocked`.

Jangan mulai membangun ulang sesuatu yang sebenarnya sudah selesai dan lolos acceptance. Audit dulu, pertahankan yang baik, lalu lengkapi gap.

---

# 4. ARSITEKTUR FRONTEND YANG WAJIB

FE harus backend-agnostic dan mock-first.

## 4.1 Batas layer

Gunakan pembagian tanggung jawab yang jelas. Struktur berikut adalah rekomendasi, sesuaikan dengan repository yang sudah ada tanpa membuat duplikasi:

```text
apps/
  web/                         # React + Vite
  mobile/                      # React Native + Expo (jika dalam workspace)
packages/
  domain/                      # domain rules, enums, state transitions
  contracts/                   # JSON Schema/OpenAPI fixtures/DTO definitions
  services/                    # domain service facade/interface
  design-tokens/               # shared tokens bila sesuai lintas platform
  shared-utils/                # utilities tanpa browser coupling
src/ atau apps/web/src/
  app/                         # routes, providers, app shell
  features/                    # module-based feature slices
  domain/                      # frontend domain helpers
  services/                    # facade/domain service calls
  api/                         # transport, config, auth, error normalization
  adapters/
    mock/                       # JSON fixtures + mock services
    http/                       # real API services; boleh skeleton dulu
  shared/                      # shared UI/components/hooks/utils
  assets/
tests/
docs/
```

Jangan memaksakan monorepo/package layout baru jika struktur existing sudah sehat. Yang wajib adalah separation of concerns, bukan nama folder tertentu.

## 4.2 Komponen tidak boleh memanggil HTTP secara langsung

- Komponen UI tidak boleh memakai `fetch`, Axios, atau HTTP client secara langsung.
- Komponen menggunakan feature hooks atau domain service facade.
- Service facade tidak boleh mengandung framework/database-specific code.
- Mock adapter dan HTTP adapter harus memenuhi service interface dan DTO yang sama.
- DTO mapper menempatkan perbedaan API payload dan UI view model pada adapter boundary.
- Tidak boleh ada endpoint URL hard-coded di komponen.
- Semua error API dinormalisasi pada satu tempat.

Contoh pola konseptual:

```js
// Feature/UI
const result = await learningService.getLearningPath(pathId);

// Adapter dipilih melalui konfigurasi aplikasi
const learningService = serviceProvider.learning;

// Mock adapter dan HTTP adapter implementasi kontrak yang sama
```

Contoh di atas adalah panduan arsitektur, bukan instruksi untuk menyalin kode secara literal.

## 4.3 Konfigurasi API tunggal

Web:
- Gunakan `VITE_API_BASE_URL` atau runtime config terpusat.
- Jangan menyebarkan hostname/backend route ke komponen.
- Default mock adapter aktif pada Phase 1.

Mobile:
- Gunakan `EXPO_PUBLIC_API_BASE_URL` atau mekanisme runtime config yang sesuai Expo.
- Jangan memakai `window`, `document`, `localStorage`, atau browser-only APIs di shared service/domain code.
- Gunakan secure storage platform untuk token; jangan menyimpan token produksi di plain AsyncStorage.

Saat berpindah dari backend A ke backend B yang mematuhi kontrak yang sama, perubahan deployment harus cukup pada konfigurasi base URL. Perubahan kontrak hanya boleh terjadi sebagai versi API baru yang terencana, bukan karena framework backend.

## 4.4 Mock service wajib realistis

Mock adapter harus mampu mensimulasikan:
- Latency dan request in-flight.
- Success dan server error.
- Validation error per field.
- Empty state dan data populated.
- Unauthorized, forbidden, locked, dan unavailable state.
- Pagination, sort, filter, search.
- Retry, timeout, cancellation bila relevan.
- Mutasi create/update/delete sesuai otorisasi.
- Optimistic update dan rollback jika dipakai.
- Concurrent interaction sederhana, duplicate submission, serta idempotency behavior yang tampak pada UI.

Gunakan seed data deterministik. Jangan menghasilkan data random yang membuat screenshot/test berubah-ubah tanpa kontrol.

JSON mock harus disimpan sebagai file fixture berversi, bukan tersebar sebagai object inline di banyak komponen. Mock state boleh menggunakan repository/in-memory store atau mekanisme demo yang terisolasi. Jangan menjadikan browser storage sebagai dependency production.

Setiap feature utama setidaknya mempunyai skenario:
- Normal.
- Loading.
- Empty.
- Error.
- Unauthorized/forbidden jika relevan.
- Locked/disabled jika relevan.
- Validation failed jika relevan.
- Success/confirmation.

---

# 5. SCOPE FRONTEND: INVENTARIS FITUR WAJIB DIAUDIT DAN DILENGKAPI

Jangan menganggap daftar berikut membatasi kebutuhan yang sudah tertulis di baseline. Gunakan seluruh dokumen/prototype untuk membuat inventory final. Tidak boleh menghilangkan fitur kanonis hanya karena belum ada pada source code.

## 5.1 Shared experience dan account

- Public/entry screens yang memang masuk scope repository.
- Login, register/onboarding, logout, forgot/reset password, session expired.
- Profile dan account settings.
- Role-based navigation dan protected routes.
- Notification/inbox UI jika termasuk scope produk.
- Subscription/entitlement display dan access-denied/upgrade experience sesuai model bisnis.
- Responsive layout, app shell, loading, error boundary, empty state, offline/unavailable state yang sesuai platform.

Jangan membuat role/permission security hanya di FE. FE hanya mengatur pengalaman; server tetap wajib memverifikasi izin.

## 5.2 Student learning experience

- Student dashboard dan ringkasan aktivitas.
- Curriculum, grade/level, subject, topic, competency.
- Learning path, chapter, journey node, activity.
- Chapter/journey map dengan beberapa renderer template.
- Lesson/activity player dan question interaction.
- Feedback jawaban, explanation, worked solution, hint dan review.
- Activity history, progress, learning recommendation dan remedial route.
- Competency mastery terpisah dari completion, XP, player rank, dan nilai akademik.
- Spaced repetition/review schedule awal 1, 3, 7, 14, 30 hari, dapat disesuaikan berdasarkan bukti mastery.
- Practice, daily/weekly challenge, tryout, UTS/UAS/formal assessment sesuai role/entitlement.
- Results, review, analytics/progress view sesuai hak akses.

## 5.3 Interactive question and activity renderer

Sediakan renderer yang sesuai dengan canonical question types:

1. `single_choice`
2. `multiple_select`
3. `true_false`
4. `numeric`
5. `short_text`
6. `fill_blank`
7. `matching`
8. `ordering`
9. `drag_drop`
10. `graph_plot`
11. `formula_input`
12. `diagram_label`
13. `simulation`
14. `worked_solution`

Catatan:
- Legacy `essay` dipetakan melalui adapter ke `worked_solution` dengan response mode rich-text, bukan dibuat sebagai tipe paralel.
- Setiap renderer mempunyai state, validasi input, submit, feedback, retry/review sesuai mode.
- Bedakan practice mode dan formal exam mode. Assessment mode bukan question type.
- UI boleh menampilkan preview/feedback sesuai policy, tetapi Student Delivery DTO tidak boleh mengekspos answer key, hidden scoring, unreleased explanation, reviewer notes, atau AI provenance.
- Math/Physics visual, graph, geometry, formula, diagram, dan simulation harus mempunyai fallback yang usable pada layar kecil.
- Tidak boleh menganggap interaksi drag-and-drop sebagai satu-satunya input; sediakan alternatif touch/keyboard/accessibility yang layak.

## 5.4 Journey Experience Engine

Gunakan satu canonical progression model:

`Curriculum → Subject → Learning Path → Chapter → Journey Node → Activity → Question Version(s)`

Journey template adalah renderer/presentation adapter untuk canonical journey view model, bukan progression engine yang berbeda.

Template katalog dari baseline:
- Adventure.
- Board Game.
- Explore / World Exploration.
- Skill Tree.
- Racing.
- Galaxy Mission.

Aturan produk yang tidak boleh berubah tanpa keputusan pemilik produk:
- Template berubah pada batas chapter saja.
- Pilihan template di tengah chapter menjadi pending preference untuk chapter berikutnya.
- Snapshot template chapter yang sedang aktif bersifat immutable.
- Adaptive, Personal, dan Random adalah selection modes.
- Random dipilih ketika chapter baru dibuat, bukan saat refresh.
- Random selection harus kompatibel dengan subject/level/chapter/accessibility dan eligibility; hindari template yang sama bila alternatif eligible ada.
- Personal menggunakan preferensi/pending template bila masih kompatibel dan unlocked; jika tidak, lakukan fallback yang jelas.
- Adaptive menggunakan aturan/weights terkontrol dan tie-break deterministik.
- Base templates tersedia sesuai baseline; special templates dapat dibuka melalui achievement ATAU premium.
- Template premium hanya mengubah tampilan/experience; tidak boleh memberi keuntungan akademik, mastery, nilai, XP fairness, atau exam access.
- Refresh atau pindah device tidak boleh mereroll template chapter.

Level 0–10 atau rank hanya presentation/milestone jika masih digunakan, bukan sistem progression akademik paralel.

## 5.5 Gamification dan progress

- XP ledger presentation.
- Streaks.
- Hearts hanya untuk practice sesuai aturan produk; jangan terapkan hearts pada formal exam.
- Gems/currency presentation bila ada di baseline.
- Quests, achievements, leagues, daily/weekly challenges.
- Leaderboard dengan privacy-conscious design, khususnya anak.
- Player rank terpisah dari academic mastery.
- Tidak ada manipulasi XP di sisi client sebagai authoritative record.
- Mock boleh mensimulasikan award, tetapi domain service harus membuat alur konsisten dan mudah digantikan API real.

## 5.6 Teacher/content author dan Question Bank

- Question bank listing, search, filter, sort, detail, preview, version history.
- Manual Question Builder lengkap sesuai spec: metadata, curriculum mapping, competency, question content, answer configuration, scoring, explanation/feedback, delivery/governance.
- Semua canonical question types harus bisa dibuat/di-preview sesuai kapabilitasnya.
- Draft, validation, submit for review, review feedback, approve, publish, archive, create new version.
- Published question version immutable; edit menghasilkan versi baru.
- Field-level validation dan blocking/non-blocking validation findings.
- Media upload UI pada Phase 1 harus memakai mocked upload flow dan file validation UX; tidak memanggil storage production.
- Role/permission states untuk author, reviewer, publisher, administrator.

## 5.7 AI Question Generator

Bangun seluruh pengalaman UI dan workflow dengan simulated/mock pipeline. Tidak memerlukan model AI real saat Phase 1.

Pipeline yang perlu direpresentasikan:
1. Generation brief/configuration.
2. Blueprint planner.
3. Question generation.
4. Schema validation.
5. Deterministic/domain verification.
6. Quality review.
7. Repair/retry dengan batas percobaan.
8. Human review.
9. Accept/reject.

UI harus menunjukkan status run/item, progress, error, warning, cost/usage indicator bila relevan, retry, cancel, preview, review dan audit trail.

Aturan mutlak:
- AI output wajib structured JSON dan tervalidasi.
- AI tidak boleh auto-publish.
- Accept dari AI menghasilkan Question draft, bukan published question.
- Tidak ada arbitrary generated code execution.
- Mock pipeline harus bisa mensimulasikan malformed JSON, wrong calculation, unknown taxonomy reference, rejection, retry limit, cost cap, dan human review.

## 5.8 Admin Platform dan Akademi/Sekolah

Gunakan referensi admin platform, admin akademi, dan role-permission matrix. Pastikan inventory mencakup modul yang benar-benar didefinisikan di artefak, termasuk:
- Overview/dashboard sesuai cakupan role.
- User/member/role management.
- Curriculum, taxonomy, subject, competency dan learning content management.
- Question governance/review/publishing.
- Journey template/catalog/configuration dan unlock policy.
- Subscription/entitlement/plan administration bila termasuk scope.
- Institution/school/class/teacher/student management bila didefinisikan.
- Analytics/reporting dan audit view sesuai permission.
- Tenant, class, subject, resource scope.

Jangan membuat semua admin sebagai superuser. Implementasikan tampilan berdasarkan role dan scope; siapkan permission matrix dan negative test. Periksa referensi role-permission yang ada sebelum menetapkan menu.

## 5.9 Assessment dan exam experience

- Formal assessment mempunyai state dan UX sendiri.
- Timer bersumber dari server pada implementasi backend; selama Phase 1 mock mensimulasikan server-authoritative timestamps dan expiry.
- Exam question snapshot immutable.
- Autosave dan submission mempunyai UI status, retry, offline/disconnection feedback, dan idempotent simulation.
- XP tidak memengaruhi academic grade.
- Hearts tidak digunakan pada formal exam.
- Result/explanation release mengikuti policy.

---

# 6. CANONICAL DOMAIN RULES — JANGAN MEMBUAT MODEL PARALEL

## 6.1 Progression hierarchy

Gunakan satu hierarchy:

```text
Curriculum + Version
  └── Subject
      └── Learning Path
          └── Chapter
              └── Journey Node
                  └── Activity
                      └── Question Version(s)
```

Competency mastery adalah cross-cutting evidence keyed by user + competency. XP ledger terpisah. Journey progress terpisah. Player rank terpisah. Journey template chapter snapshot terpisah.

## 6.2 State machines kanonis

### Chapter
`planned → available → in_progress → completed → archived`

### Journey node
`locked → available → in_progress → completed`

`mastered` dan `remedial` adalah annotation/evidence atau recommendation, bukan lifecycle state tambahan.

### Question
`draft → validation_failed | in_review → approved → published → archived`

Published version immutable. Editing published content creates a new version.

### AI generation
`queued → generating → validating → needs_review → accepted | rejected | failed`

Accepted creates a question draft; never publishes directly.

### Assessment session
`created → started → submitted → grading → graded`

Alternative terminal states: `expired`, `cancelled`, `invalidated`.

## 6.3 Data integrity rules

- XP ledger append-only; correction uses compensating entries.
- XP award, node completion, chapter completion, and submission must support idempotency.
- Mastery derived from evidence/policy, never from XP amount.
- Chapter snapshot immutable after start.
- Server is authoritative for unlock, entitlement, assessment timer/scoring, mastery, XP, and consequential progression.
- Student-facing responses use allowlisted projection, not internal authoring records.

---

# 7. RESPONSIVE, ACCESSIBILITY, DAN DEVICE REQUIREMENTS

Responsive bukan finishing task. Setiap feature wajib didesain, diimplementasikan, dan diuji untuk form factor yang relevan.

## 7.1 Target viewport QA

Sekurang-kurangnya validasi pada:
- 320–360 px: small mobile.
- 375–430 px: common mobile.
- 600–820 px: tablet portrait/small tablet.
- 900–1100 px: tablet landscape/small laptop.
- 1280–1440 px: desktop.
- 1600–1920 px: wide desktop.

Pilih breakpoint sesuai design system, jangan hanya mengandalkan scaling.

## 7.2 Layout rules

- Mobile-first.
- Desktop: sidebar/header/navigation sesuai role.
- Tablet: navigation, grid, sidebar, toolbar dan editor disederhanakan/diubah sesuai ruang.
- Mobile: drawer/bottom navigation atau pola lain yang paling usable; hindari sidebar desktop dipaksa masuk viewport kecil.
- Safe-area inset untuk mobile.
- Tidak boleh ada horizontal overflow halaman secara tidak sengaja.
- Form, modal, dropdown, table, map, editor, graph, simulation, dan question interaction harus mempunyai mobile interaction pattern yang disengaja.
- Horizontal scrolling diperbolehkan hanya saat memang masuk akal dan ada affordance.
- Jangan membuat kontrol penting bergantung pada hover.
- Touch target harus memadai; gunakan target sekitar 44×44 CSS px bila sesuai konteks.
- Pastikan keyboard navigation, focus visible, labels, semantic structure, contrast, zoom, reduced motion dan screen reader support.

## 7.3 Acceptance responsive

Untuk setiap route/feature:
- Tidak ada clipping teks/kontrol.
- Tidak ada tombol tertutup sticky header/footer.
- Dialog dapat dipakai pada layar pendek.
- Input dan keyboard tidak menutupi bagian penting di mobile.
- Chart/graph/visualisasi tetap dapat dibaca dan dioperasikan.
- State loading/error/empty tetap usable.
- Navigation dapat dijangkau dengan touch dan keyboard sesuai platform.

Screenshot/visual regression atau dokumentasi hasil viewport harus disimpan pada test artifacts bila tooling tersedia.

---

# 8. BACKEND-AGNOSTIC API: PERSYARATAN WAJIB

Persyaratan ini harus sudah dipikirkan dari arsitektur FE pada Phase 1, tetapi kontrak final baru dibekukan pada Phase 2.

## 8.1 Satu domain API untuk Web dan Mobile

- Web, Android, dan iOS memakai domain API dan DTO kanonis yang sama.
- Jangan membuat endpoint yang hanya bisa dipanggil dari browser.
- Jangan mengandalkan cookie browser sebagai satu-satunya mekanisme autentikasi.
- Gunakan documented token-based flow yang kompatibel dengan web/mobile, misalnya Authorization Bearer dengan access/refresh token lifecycle yang jelas, rotation/revocation policy, dan platform-appropriate secure storage.
- Server harus memvalidasi role, tenant, resource scope, entitlement, dan ownership.
- API harus aman untuk mobile client publik; jangan pernah menaruh secret server di aplikasi mobile.
- Upload, pagination, retry, cancellation, idempotency, dan error semantics harus terdokumentasi.

## 8.2 API portability

API publik harus bersifat implementation-neutral:
- REST/HTTP + JSON.
- Prefix versioning `/api/v1`.
- OpenAPI sebagai contract source dan dokumentasi.
- Error envelope yang konsisten.
- Standard pagination, filtering, sorting, timestamp, identifier, correlation ID.
- Standard auth/authorization semantics.
- Idempotency key untuk operasi penting.
- DTO tidak boleh mengekspos ORM entity atau tabel database.
- Tidak boleh ada response/error/URL convention khusus LoopBack yang menjadi kewajiban FE.

Backend dapat diimplementasikan menggunakan LoopBackJS, Express.js, Django, FastAPI, Go, atau teknologi lain. Implementasi alternatif harus lulus contract compatibility tests.

**Batas janji “cukup ganti base URL”:** ini benar apabila backend pengganti mengimplementasikan OpenAPI contract, DTO, error semantics, auth behavior, dan business rules yang sama. Jika backend tidak kompatibel, perlu adapter/compatibility layer atau API version baru; jangan menyebutnya hanya pergantian base URL bila kontraknya berubah.

## 8.3 API client requirements

Central API client menangani:
- Base URL/runtime config.
- Auth token injection dan refresh handling.
- Timeout dan cancellation.
- Correlation/request ID.
- Serialization/deserialization.
- Standard error normalization.
- Retry policy yang aman dan tidak mengulang mutation tanpa idempotency.
- Upload/download abstraction.
- Pagination response normalization.
- Telemetry/logging tanpa membocorkan token, credential, PII, atau answer key.

---

# 9. PHASE 1 — COMPLETE FE DENGAN MOCK JSON (FE ONLY)

Ini fase implementasi pertama dan fokus utama sampai selesai.

## 9.1 Batasan Phase 1

BOLEH:
- Implementasi semua UI web dan mobile sesuai scope.
- Implementasi shared domain logic dan service facade.
- Implementasi mock adapter, JSON fixtures, deterministic seeded scenarios.
- Implementasi route, navigation, state management, validation dan local demo mutations.
- Implementasi automated UI/domain/workflow tests.
- Membuat draft DTO/view model untuk kebutuhan FE, diberi label provisional.

TIDAK BOLEH:
- Membuat backend production.
- Membuat/mengunci schema database production atau menjalankan migration production.
- Mengimplementasikan authentication server real.
- Menautkan FE ke API production yang belum disetujui.
- Mengunci API final berdasarkan struktur mock semata.
- Membuat mock yang menutupi kebutuhan/error flow.

## 9.2 Output wajib Phase 1

- Semua route/screen dalam inventory terimplementasi.
- Semua role dan navigasi yang masuk scope dapat diuji menggunakan seeded personas.
- Semua feature utama mempunyai real interaction, validasi dan states.
- Mock JSON fixture berversi dan dokumentasinya.
- Mock service adapter untuk semua domain service yang dibutuhkan screen.
- Responsive layout seluruh route.
- Design system dan reusable components yang konsisten.
- Unit/component/workflow tests untuk critical path.
- Screenshot atau test report viewport untuk route penting.
- `docs/feature-workflow-inventory.md` diperbarui dengan bukti.
- `docs/phase-1-fe-completion-report.md`.

## 9.3 FE completion gate

Phase 1 hanya boleh dinyatakan selesai jika:
- Tidak ada fitur critical/high priority yang hanya berupa placeholder.
- Tidak ada dead button/dead-end route pada critical workflow.
- Semua critical workflow dapat diselesaikan dengan mock data.
- Semua form mempunyai field validation dan feedback.
- Semua screen mempunyai loading/empty/error state sesuai kebutuhan.
- Responsive review selesai untuk web dan mobile yang masuk scope.
- Keyboard/accessibility baseline diperiksa.
- Lint, test, build berhasil atau semua kegagalan yang diterima dicatat eksplisit.
- Known issues memiliki severity, owner/recommendation, dan keputusan: fix now atau accepted.
- Feature inventory dan traceability matrix diperbarui.

**Setelah Phase 1 gate tercapai, lanjut ke Phase 2. Jangan langsung implementasi backend/database.**

---

# 10. PHASE 2 — FE REVIEW, REFINEMENT, DAN FINALISASI API/BE/DB PLAN

Urutan internal Phase 2:

1. Product/workflow review seluruh FE.
2. UX, visual consistency, responsive dan accessibility review.
3. Review semua state/edge cases/role scopes.
4. Perbaiki FE dan mock workflow berdasarkan temuan.
5. Jalankan ulang critical tests dan regression.
6. Freeze FE behavior dan DTO/view model boundary.
7. Turunkan API Contract Plan dari kebutuhan final FE/domain.
8. Turunkan Backend Implementation Plan dari contract dan domain rules.
9. Turunkan Database Plan dari contract/domain/backend needs.
10. Verifikasi consistency lintas ketiganya melalui traceability matrix.
11. Buat Phase 2 approval package.

## 10.1 Dokumen wajib hasil Phase 2

Buat atau perbarui setidaknya:

- `docs/FE-FINAL-REVIEW.md`
- `docs/UX-AND-RESPONSIVE-AUDIT.md`
- `docs/FEATURE-WORKFLOW-SPECIFICATION.md`
- `docs/FRONTEND-ARCHITECTURE.md`
- `docs/MOCK-DATA-CATALOG.md`
- `docs/FE-TO-API-TRACEABILITY.md`
- `docs/API-CONTRACT-PLAN.md`
- `contracts/openapi-v1.yaml` atau `.json`
- `docs/BACKEND-IMPLEMENTATION-PLAN.md`
- `docs/DATABASE-IMPLEMENTATION-PLAN.md`
- `docs/ERD.md` atau diagram ERD setara
- `docs/AUTH-RBAC-TENANCY-MATRIX.md`
- `docs/API-MOBILE-COMPATIBILITY.md`
- `docs/PHASE-2-APPROVAL-PACKAGE.md`

Pertahankan file canonical yang sudah ada. Jangan membuat dokumen duplikat yang bertentangan; update atau supersede dengan jelas.

## 10.2 API Contract Plan harus menjelaskan

- API resource, route, HTTP method, request/response schema.
- Authentication dan authorization.
- Tenant/resource scoping.
- Error codes/envelope dan field validation errors.
- Pagination/filter/sort/search conventions.
- Idempotency dan concurrency semantics.
- Upload/download/media lifecycle.
- Assessment session/timer/autosave/submission semantics.
- Journey template snapshot and pending preference semantics.
- AI generation run/item lifecycle.
- Event contract, event versioning, outbox dan idempotent consumers.
- Rate limits, timeout, retry, correlation ID dan observability.
- Mobile compatibility and secure auth flows.
- Backward compatibility/versioning policy.
- Mapping setiap endpoint ke FE feature dan acceptance tests.

## 10.3 Backend Implementation Plan harus menjelaskan

- Module/bounded context dan tanggung jawab.
- Authentication, authorization, tenancy/RBAC, entitlements.
- Domain services, controllers/handlers, repositories, adapters.
- Validation, transaction boundaries, idempotency.
- Background workers/queue dan outbox.
- AI service integration dan safety isolation.
- File upload security dan storage.
- Audit trail, observability, metrics, logs, tracing.
- Rate limiting, abuse controls, secrets management.
- Deployment, environment config, backups, restore dan disaster recovery.
- Contract tests dan test strategy.
- Bagian mana yang framework-specific dan bagaimana menjaga portability.

## 10.4 Database Implementation Plan harus menjelaskan

- Entity, relationship, cardinality, primary/foreign keys.
- Unique/check constraints dan indexes.
- Transaction boundaries dan isolation concerns.
- Soft-delete/archive/data retention bila dibutuhkan.
- Versioning/immutable question version and exam snapshot.
- XP append-only ledger dan idempotency keys.
- Mastery evidence/current projection.
- Journey chapter snapshot/preferences/unlocks.
- Assessment sessions/responses/results.
- Tenant/resource scopes.
- Migration order, deterministic backfill, rollback/forward-fix.
- Backup/restore and migration verification.
- Data lifecycle, privacy minimization dan retention.

**Jangan memaksakan desain database ke FE. Database mengikuti kebutuhan produk/domain dan API yang telah diturunkan dari FE final.**

## 10.5 Phase 2 gate

Sebelum Phase 3 dimulai, harus tersedia:
- FE final dan seluruh issue prioritas tinggi tertutup/diterima.
- API contract plan + OpenAPI valid.
- Backend plan.
- Database plan + ERD.
- Role/permission/tenant matrix.
- FE-to-API-to-domain-to-DB traceability matrix.
- Acceptance criteria dan QA plan.
- Daftar keputusan yang masih terbuka.

Buat laporan yang jelas mengenai hal-hal yang memerlukan persetujuan pemilik produk. Jangan mengklaim telah mendapat persetujuan jika belum diberikan.

---

# 11. PHASE 3 — BACKEND & DATABASE IMPLEMENTATION

Phase ini hanya boleh dimulai setelah Phase 2 gate dan approval yang diperlukan terpenuhi.

## 11.1 Prinsip backend

- Implementasikan API contract; jangan mendesain ulang behavior secara sepihak.
- Backend adalah authoritative source untuk consequential business state.
- Controllers/handlers tipis; business rules berada pada application/domain services.
- Database access berada pada repository/data access boundary.
- Validasi dilakukan server-side meski FE sudah memvalidasi.
- Tidak mengembalikan database/ORM entity mentah ke public API.
- Error format harus konsisten dan tidak membocorkan internals.
- Gunakan transaction boundary yang benar untuk operasi multi-entity.
- Gunakan outbox untuk event yang harus konsisten dengan transaksi.
- Semua event consumer harus idempotent, retryable, dan memiliki dead-letter handling.

## 11.2 Security minimum

- Password hashing menggunakan algoritma modern yang sesuai.
- Access/refresh token lifecycle aman, rotation/revocation sesuai desain.
- RBAC + tenant/resource scope diperiksa server-side.
- Rate limiting dan abuse protection pada auth, generation, upload, assessment dan endpoint sensitif.
- Input validation, output encoding, injection defense.
- CORS allowlist untuk web clients; jangan menggunakan wildcard credentialed CORS.
- CSRF protection bila cookie auth digunakan.
- Secrets melalui environment/secret manager, bukan source code.
- Audit privileged action dan perubahan entitlement.
- Data minimization, privacy dan protection untuk child users.
- Jangan log token, password, answer keys, sensitive payload, atau PII berlebihan.

## 11.3 Upload dan media security

- Allowlist format yang memang dibutuhkan.
- Validasi MIME, magic bytes/signature, ukuran, dimensi dan extension; jangan percaya Content-Type dari client.
- Quarantine/scan file bila infrastruktur mendukung.
- Randomized object keys; jangan memakai nama file user sebagai path.
- Storage tidak boleh mengeksekusi file upload.
- Batasi image dimensions/decompression bombs dan processing resource.
- AuthZ pada upload/download/presigned URLs.
- Private storage untuk konten privat; URL signed dengan expiry bila diperlukan.

## 11.4 Domain integrity wajib

Tegakkan seluruh canonical domain rules pada bagian 6, termasuk:
- Single learning progression model.
- Immutable question versions.
- Allowlisted student delivery DTO.
- AI accepted item creates draft, not published.
- Immutable exam snapshot.
- Server-authoritative exam timer, scoring, expiry dan submission.
- Idempotent autosave/submission/completion/XP award.
- Append-only XP ledger.
- Mastery tidak diturunkan dari XP.
- Journey template selection dan snapshot chapter-level.
- Entitlement tidak memberikan academic advantage.

## 11.5 Database delivery

- Implementasikan schema sesuai Phase 2 plan.
- Migration harus versioned, reviewable, repeatable dan aman.
- Sediakan seed minimal untuk local development/test, bukan data production.
- Tambahkan indexes berdasarkan query patterns yang terukur.
- Hindari destructive migration tanpa backup, explicit plan, dan rollback/forward-fix.
- Tambahkan migration tests dan backup/restore verification.
- Jangan dual-write ke dua model progression secara permanen.

## 11.6 Phase 3 gate

- Semua OpenAPI operations memiliki implementation atau status eksplisit.
- Contract tests pass.
- Unit/integration/security tests untuk domain kritikal pass.
- Migrations dapat dijalankan pada clean database dan upgrade database yang didukung.
- Role/tenant negative access tests pass.
- Idempotency, transaction dan outbox tests pass.
- Logs/metrics/health checks tersedia.
- No unresolved P0/P1 security/data-integrity/assessment-integrity issues.
- Backend dapat dijalankan secara local dengan dokumentasi yang reproducible.

---

# 12. PHASE 4 — FE/BE INTEGRATION

## 12.1 Integration rules

- Implementasikan real HTTP adapter yang memenuhi service facade yang telah dipakai mock adapter.
- Pilihan adapter diubah melalui config/provider, bukan conditional logic menyebar di komponen.
- Perubahan FE selama integration harus punya alasan dan traceability ke contract atau bug yang terbukti.
- Jangan mengubah UX hanya untuk menyesuaikan response backend yang menyimpang; perbaiki backend/adapter agar sesuai contract kecuali terdapat keputusan produk yang sah untuk mengubah contract.
- Pertahankan mock adapter untuk local development, story/demo, offline prototype, dan automated tests.
- Pastikan seluruh user journey tetap dapat diuji dengan mock maupun real API.

## 12.2 Integration test matrix

Test setidaknya:
- Authentication, refresh, logout, expired session.
- Role/tenant/resource access.
- Student learning path → chapter → node → activity → attempt → feedback.
- Journey template selection, pending preference, next chapter, refresh/cross-device snapshot.
- Question authoring → validation → review → approval → publish → new version.
- AI generation run → validation → human review → accept/reject.
- Assessment create → start → autosave → submit → grade/result release/expiry.
- Mastery evidence/current state update.
- XP/achievement/streak idempotency.
- Entitlement changes and access behavior.
- Upload invalid/oversized/unsupported/malicious files.
- API pagination/filter/sort/error/timeout/retry.
- Mobile token auth and API compatibility.

## 12.3 Phase 4 gate

- Critical workflows pass E2E with real backend.
- Contract tests and OpenAPI validation pass.
- No P0/P1 security, data integrity, assessment integrity, or cross-tenant issues.
- Responsive regression passes for all supported clients.
- Performance and load checks are documented.
- Mobile API compatibility verified.
- Environment/deployment/runbook/rollback documentation complete.
- Mock adapter still works and is not coupled to production secrets.

---

# 13. QA, TESTING, DAN DEFINITION OF DONE

## 13.1 Testing pyramid

Gunakan tingkat pengujian sesuai stack:
- Unit tests: domain rules, validators, mappers, state transitions.
- Component tests: form, renderer, dialogs, navigation, accessibility states.
- Service tests: mock/HTTP adapter parity.
- Workflow tests: critical user journeys.
- Contract tests: schema/OpenAPI compatibility.
- Integration tests: API + database + queue/storage.
- E2E tests: end-to-end scenarios per role/device.
- Responsive/visual checks: representative viewport dan device.
- Security tests: RBAC, tenant scope, upload, auth, data leakage, abuse controls.

Pilih tooling berdasarkan repository; jangan menambah banyak framework yang tumpang tindih.

## 13.2 Critical test cases yang wajib diadaptasi

### Journey
- Refresh chapter tidak mengubah template.
- Ganti template di tengah chapter hanya menyimpan pending preference.
- Next chapter menggunakan preference yang valid.
- Template yang terkunci tidak dapat dipilih melalui forged request.
- Node completion sebelum prerequisite ditolak.
- Duplicate completion tidak memberi XP ganda.
- Disable template tidak merusak chapter snapshot yang sudah aktif.
- Keyboard navigation dan reduced motion tetap usable.

### Question authoring
- Draft valid tersimpan.
- Invalid type-specific structure ditolak.
- Publish dengan blocking validation errors ditolak.
- Published version immutable.
- Student delivery tidak mengembalikan answer key/hidden scoring.
- Cross-tenant author access ditolak.
- Unsupported/unsafe media ditolak/quarantined.
- Duplicate publish idempotent.

### AI generator
- Malformed JSON ditolak.
- Wrong calculation gagal deterministic verifier.
- Unknown competency/taxonomy ditolak.
- Generated executable code ditolak dan tidak dieksekusi.
- Retry/cost cap mencegah infinite loop.
- Accept hanya membuat draft.
- Human review selalu required sebelum publish.

### Assessment
- Client clock manipulation tidak mengubah server deadline.
- Exam snapshot immutable.
- Autosave dan submit retry idempotent.
- Expired session mengikuti server state.
- XP tidak mengubah nilai ujian.
- Hearts tidak digunakan pada formal exam.

### Security and tenant
- Cross-tenant read/write/export/media/analytics denied.
- Privileged actions audited.
- Child leaderboard privacy defaults aman.
- Student DTO tidak mengandung reviewer note, prompt, answer key, atau AI provenance.

### FE/BE portability
- Mengganti API base URL ke backend contract-compatible lain tidak memerlukan perubahan komponen.
- Web dan mobile memakai domain API/DTO yang sama.
- Tidak ada browser-only assumption pada shared client/domain services.
- HTTP errors dinormalisasi konsisten.

## 13.3 Definition of Done setiap feature

Sebuah feature baru boleh berstatus `implemented` jika:
- UI dan interaksi selesai.
- Role/permission state sesuai.
- Loading, empty, error, success, validation state tersedia.
- Mobile/tablet/desktop behavior diperiksa.
- Accessibility baseline diperiksa.
- Service facade digunakan; tidak ada hard-coded API call di komponen.
- Mock data dan scenario terkait tersedia selama Phase 1/2.
- Tests untuk domain dan critical interactions tersedia.
- Dokumentasi/inventory diperbarui.
- Tidak ada console error, runtime exception, dead action atau broken navigation pada alur yang diuji.

---

# 14. CODING STANDARDS DAN IMPLEMENTATION QUALITY

- Ikuti repository conventions dan gunakan naming konsisten.
- Pecah feature berdasarkan bounded UI/domain responsibilities, bukan membuat satu file raksasa.
- Hindari overengineering dan abstraksi yang tidak dipakai.
- Jangan menggandakan domain rule pada beberapa komponen.
- Gunakan reusable component untuk pola berulang, tetapi jangan memaksa semua layar menjadi template identik.
- Gunakan design tokens dan component variants agar konsistensi terjaga.
- Web styling wajib menggunakan Tailwind atau framework styling yang disetujui. **Jangan menggunakan native CSS untuk styling biasa.** Custom CSS hanya untuk kasus khusus yang tidak praktis dicapai dengan utility/framework, misalnya geometri SVG kompleks atau efek khusus; jelaskan alasannya.
- Jangan menggunakan inline style untuk menggantikan sistem design token kecuali untuk nilai dinamis yang memang diperlukan.
- Hindari magic numbers dan duplicated enums.
- Validasi semua external/user input.
- Jangan menyimpan secret, API key, password, atau token dalam source code/mock fixture.
- Jangan mengandalkan data di client untuk authorization/entitlement.
- Hindari dependency yang tidak perlu dan audit lisensinya bila relevan.
- Pertahankan performa: lazy loading, pagination/virtualization untuk daftar besar, media optimization, code splitting, memoization bila terukur perlu.
- Jangan menambahkan animasi yang mengganggu pembelajaran, accessibility, atau reduced-motion preference.

---

# 15. DOKUMENTASI, TRACEABILITY, DAN HANDOFF

Selalu pelihara dokumen berikut sepanjang pengerjaan:

```text
docs/
  implementation-status.md
  feature-workflow-inventory.md
  route-and-role-matrix.md
  assumptions-and-open-decisions.md
  phase-gates.md
  FE-FINAL-REVIEW.md                         # Phase 2
  UX-AND-RESPONSIVE-AUDIT.md                 # Phase 2
  FEATURE-WORKFLOW-SPECIFICATION.md          # Phase 2
  FRONTEND-ARCHITECTURE.md                   # Phase 2
  MOCK-DATA-CATALOG.md                       # Phase 1/2
  FE-TO-API-TRACEABILITY.md                  # Phase 2
  API-CONTRACT-PLAN.md                       # Phase 2
  BACKEND-IMPLEMENTATION-PLAN.md             # Phase 2
  DATABASE-IMPLEMENTATION-PLAN.md            # Phase 2
  ERD.md                                     # Phase 2
  AUTH-RBAC-TENANCY-MATRIX.md                # Phase 2
  API-MOBILE-COMPATIBILITY.md                # Phase 2
  PHASE-1-FE-COMPLETION-REPORT.md            # Phase 1
  PHASE-2-APPROVAL-PACKAGE.md                # Phase 2
  PHASE-3-BE-DB-COMPLETION-REPORT.md          # Phase 3
  PHASE-4-INTEGRATION-COMPLETION-REPORT.md   # Phase 4
```

Jangan membuat semua file kosong di awal. Buat/update sesuai fase dan isi dengan hasil aktual.

Traceability minimal:

`Product Requirement → Feature → Screen/Workflow → Domain Rule → Mock Scenario → API Operation → Backend Module → DB Entity → Test Case`

Setiap fitur critical harus dapat ditelusuri dari requirement sampai test.

---

# 16. CARA KERJA AGENT DAN AUTONOMY

## 16.1 Mode kerja

- Bekerja autonomous dalam batas repository/workspace yang ditentukan pemilik proyek.
- Jangan mengakses atau mengubah file di luar workspace tanpa izin.
- Jangan melakukan deployment, mengirim email, mengeluarkan biaya layanan, menghapus data production, menjalankan destructive migration, atau mengubah credential tanpa persetujuan eksplisit.
- Jangan mengarang hasil external service atau mengaku sudah menguji mobile device fisik jika hanya emulator/browser.
- Jika build/test gagal, diagnosis dan perbaiki sebelum melanjutkan; jangan menyembunyikan kegagalan.

## 16.2 Task execution loop

Untuk setiap batch pekerjaan:
1. Baca inventory dan status fase aktif.
2. Pilih task dengan dependency terpenuhi dan prioritas tertinggi.
3. Periksa file terkait dan implementation existing.
4. Implementasikan perubahan terkecil yang menyelesaikan task secara end-to-end.
5. Jalankan lint/test/build yang relevan.
6. Periksa responsive dan role states jika UI berubah.
7. Perbarui inventory, changelog, dan dokumentasi.
8. Tandai task sebagai `implemented`, `review_needed`, `blocked`, atau `accepted` dengan bukti.
9. Lanjutkan task berikutnya dalam fase yang sama.

Jangan berhenti setelah membuat rencana awal. Lanjutkan implementasi di fase aktif sampai seluruh task yang dapat diselesaikan selesai atau ada blocker yang benar-benar membutuhkan akses/keputusan eksternal.

## 16.3 Phase boundary

- Jangan melompati phase gate.
- Setelah Phase 1, tampilkan ringkasan FE, test evidence, responsive evidence, known issues, dan minta approval untuk masuk Phase 2 jika environment kerja mengharuskan approval.
- Setelah Phase 2, tampilkan contract/BE/DB approval package. Jangan mulai Phase 3 tanpa approval pemilik produk untuk keputusan yang belum disetujui.
- Setelah Phase 3, laporkan readiness integration.
- Setelah Phase 4, laporkan release readiness dan remaining risks.

Bila agent session berakhir sebelum fase selesai, tinggalkan repository dalam keadaan coherent dan update `implementation-status.md` agar agent berikutnya dapat melanjutkan tanpa mengulang discovery.

---

# 17. FORMAT LAPORAN SETIAP SESI

Pada akhir setiap sesi implementasi, laporkan dengan format:

```text
## Current Phase
Phase X — <name>

## Completed
- <perubahan konkret dan file/module terkait>

## Verification
- Command: <command>
- Result: PASS/FAIL/BLOCKED
- Evidence: <ringkasan hasil aktual>

## Responsive / Device Checks
- Viewports/devices yang benar-benar diuji
- Temuan dan status

## Inventory Progress
- Implemented: N
- Review needed: N
- Blocked: N
- Remaining: N

## Decisions / Assumptions
- Keputusan yang diambil dan alasan
- Hal yang masih membutuhkan product owner

## Risks / Known Issues
- Severity, dampak, langkah selanjutnya

## Next Tasks
- Task berikutnya dalam phase yang sama

## Phase Gate
- PASS / NOT READY
- Alasan dan bukti
```

Jangan menyamakan file yang sudah dibuat dengan fitur yang sudah selesai. Gunakan bukti: route berfungsi, workflow berjalan, test lulus, dan acceptance terpenuhi.

---

# 18. INSTRUKSI MULAI — KERJAKAN SEKARANG

Mulai dengan urutan berikut:

1. Lakukan repository discovery menyeluruh tanpa merusak perubahan existing.
2. Baca semua dokumen baseline EduMotion yang tersedia.
3. Buat/update `implementation-status.md`, `feature-workflow-inventory.md`, `route-and-role-matrix.md`, `assumptions-and-open-decisions.md`, dan `phase-gates.md`.
4. Bandingkan implementasi existing dengan scope fitur dan artefak referensi.
5. Tentukan gap Phase 1 secara detail berdasarkan module, route, role, workflow dan device.
6. Susun task breakdown internal yang dependency-aware.
7. **Mulai implementasi Phase 1 — FE ONLY dengan JSON mock data.**
8. Lanjutkan iterasi sampai FE feature-complete dan seluruh Phase 1 acceptance criteria terpenuhi.
9. Jangan implementasikan BE production atau database production sebelum Phase 2 selesai dan gate disetujui.

**Target utama:** EduMotion harus memiliki frontend yang lengkap, interaktif, konsisten, responsive, dapat diuji dengan mock JSON, dan tidak terikat pada teknologi backend tertentu. Setelah FE benar-benar stabil, barulah API contract, Backend Plan, dan Database Plan difinalisasi; setelah itu backend/database dibangun; terakhir integrasi dilakukan dengan mengganti adapter/configuration, bukan menulis ulang FE.

**Mulai dari repository yang ada. Pertahankan hal yang sudah benar, perbaiki yang belum benar, dan implementasikan gap sampai acceptance terpenuhi.**
