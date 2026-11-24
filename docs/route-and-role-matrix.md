# Matriks Route, Role, Permission Scope & Entitlement

Dokumen ini mendefinisikan seluruh route pada `@edumotion/web` dan screen pada `@edumotion/mobile`, beserta guard RBAC, batas scope resource, dan kebutuhan entitlement.  
**Prinsip keamanan wajib:** UI route guard hanya mengatur pengalaman pengguna; seluruh mock service adapter (Phase 1) dan backend API (Phase 3/4) memverifikasi permission dan resource scope secara otoritatif.

## 1. Daftar Role & Scope Kanonis

| Role Key | Nama Peran | Scope Utama | Keterangan |
|---|---|---|---|
| `student` | Siswa / Mahasiswa | `self` (+ `organization` jika terdaftar sekolah) | Akses belajar, latihan, ujian, gamifikasi |
| `parent` | Orang Tua / Wali | `linked_child` | Hanya melihat anak yang terverifikasi tertaut |
| `teacher` | Guru / Pengajar | `organization` + `assigned_class` + `assigned_subject` | Konten, tugas, penilaian kelas yang diajar |
| `homeroom_teacher` | Wali Kelas | `organization` + `assigned_class` | Ringkasan rombel tanggung jawab |
| `counselor` | Konselor / BK | `organization` + `counseling_risk_scope` | Sinyal risiko belajar & tindak lanjut (diaudit) |
| `content_author` | Penulis Soal | `organization` (atau `global` jika staf platform) | Buat/edit draft soal & jalankan AI Generator |
| `reviewer` | Penelaah / SME | `organization` + `subject` | Tinjau, beri catatan, setujui/tolak draft |
| `publisher` | Penerbit Konten | `organization` / `global` | Terbitkan versi soal `approved` menjadi `published` |
| `school_academic_admin` | Admin Akademik / TU | `organization` | Siswa, guru, rombel, enrollment, kalender |
| `vice_principal` | Wakasek Kurikulum | `organization` | Kurikulum sekolah, mapel, penugasan, asesmen |
| `principal` | Kepala Sekolah | `organization` | Dashboard institusi, persetujuan, laporan |
| `school_owner` | Pemilik Yayasan / Sekolah | `organization` | Pengaturan institusi, paket B2B, peran kustom |
| `platform_curriculum_admin` | Admin Kurikulum Platform | `global_curriculum` (bukan superuser) | Kurikulum, taksonomi, bank soal global, Journey templates (tanpa billing/user ops) |
| `platform_super_admin` | Platform Super Admin | `platform` (lintas tenant diaudit) | Seluruh operasi platform + wajib alasan audit untuk akses lintas-tenant |

## 2. Matriks Route Web (`@edumotion/web`)

| Route Path | Nama Halaman | Role Diizinkan | Scope / Kebijakan Khusus | Entitlement |
|---|---|---|---|---|
| `/` | Beranda Publik EduMotion | Publik | Redirect opsional atau akses menu masuk | Semua |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Autentikasi & Onboarding | Publik / Guest | Validasi input; demo persona switcher pada Phase 1 | Semua |
| `/session-expired`, `/access-denied`, `/upgrade` | Status Sesi & Paket | Semua | Penanganan 401/403 & tampilan paket B2C/B2B | Semua |
| `/student/dashboard` | Dashboard Siswa | `student` | Data milik `self` | Freemium+ |
| `/student/subjects`, `/student/paths` | Kurikulum, Mapel & Path | `student` | Filter jenjang/kurikulum | Freemium+ |
| `/student/journeys/:journeyId/chapters/:chapterId` | Journey Experience Engine | `student` | Snapshot per `userId + chapterId`; template spesial butuh unlock | Base gratis; Special achievement/premium |
| `/student/activities/:activityId`, `/student/practice`, `/student/challenges`, `/student/gallery` | Pemutar Latihan & 14 Renderer | `student` | Student Delivery DTO allowlisted; hearts hanya di practice | Freemium+ (kuota tantangan) |
| `/student/assessments` | Daftar Asesmen & Ujian | `student` | Jadwal & sesi milik user/kelas | Freemium/Institution |
| `/student/assessments/:assessmentId/session/:sessionId` | Arena Ujian Formal | `student` | Immutable snapshot, server timer, no hearts | Sesuai jadwal ujian |
| `/student/assessments/:assessmentId/result/:sessionId` | Hasil & Pembahasan Ujian | `student` | Ditahan hingga `releaseAt` bila kebijakan menunda | Sesuai sesi |
| `/student/mastery` | Penguasaan & Spaced Repetition | `student` | Evidence mastery terpisah dari XP + rute remedial | Freemium+ |
| `/student/history`, `/student/notifications` | Riwayat & Notifikasi | `student` | Milik `self` | Freemium+ |
| `/student/leaderboard`, `/student/quests`, `/student/achievements` | Liga, Misi & Lencana | `student` | Child-safe name masking untuk siswa di bawah umur | Freemium+ |
| `/student/subscription`, `/student/profile`, `/student/settings` | Langganan, Profil & Aksesibilitas | `student` | Pengaturan `reducedMotion`, `highContrast`, `textScale` | Freemium+ |
| `/studio` | Ringkasan Content Studio | `content_author`, `reviewer`, `publisher`, `teacher`, `platform_curriculum_admin`, `platform_super_admin` | Terbatas pada tenant atau global sesuai peran | Studio access |
| `/studio/questions` | Bank Soal | Role Studio | Isolasi tenant ketat | Studio access |
| `/studio/questions/new`, `/studio/questions/:questionId/edit` | Manual Question Builder | `content_author`, `teacher`, `platform_curriculum_admin`, `platform_super_admin` | Draft only editable; published harus buat versi baru | Studio access |
| `/studio/reviews` | Antrean Review & Publikasi | `reviewer`, `publisher`, `content_author`, `platform_curriculum_admin`, `platform_super_admin` | Approve oleh `reviewer`; Publish oleh `publisher` | Studio access |
| `/studio/ai-generator` | AI Question Generator | `content_author`, `teacher`, `platform_curriculum_admin`, `platform_super_admin` | Output selalu berstatus `draft`; hormati cost cap tenant | AI quota |
| `/school/dashboard` | Dashboard Akademi / Sekolah | Role staf sekolah (`teacher` s.d. `school_owner`) | `tenantId === user.tenantId` | B2B Institution |
| `/school/students`, `/school/staff`, `/school/classes`, `/school/subjects`, `/school/calendar` | Manajemen Akademik | Sesuai permission masing-masing | Wali kelas/guru hanya lihat kelas/mapel ditugaskan | B2B Institution |
| `/school/assessments`, `/school/reports` | Asesmen Sekolah, Grading Rubrik & Laporan | `teacher`, `homeroom_teacher`, `vice_principal`, `principal`, `school_owner` | Grading manual untuk `worked_solution` terikat tugas kelas | B2B Institution |
| `/school/counseling` | Konseling & Risiko Belajar | `counselor`, `homeroom_teacher`, `principal` | Akses dicatat ke audit log | B2B Institution |
| `/school/parent` | Portal Orang Tua | `parent` | Hanya anak yang terverifikasi pada `linkedStudentIds` | Family / B2B |
| `/school/roles`, `/school/settings` | Peran Kustom & Pengaturan Sekolah | `school_owner`, `school_academic_admin` | Tenant scope | B2B Institution |
| `/admin/dashboard` | Ringkasan Platform Admin | `platform_curriculum_admin`, `platform_super_admin` | Menu disesuaikan per permission (bukan semua superuser) | Platform Ops |
| `/admin/institutions`, `/admin/users`, `/admin/billing`, `/admin/ai-usage`, `/admin/roles`, `/admin/audit-logs`, `/admin/settings` | Operasi Platform | `platform_super_admin` (sebagian read-only sesuai permission) | Aksi lintas tenant wajib isi alasan audit | Platform Ops |
| `/admin/curricula`, `/admin/questions`, `/admin/journey-templates` | Tata Kelola Kurikulum, Soal & Template | `platform_curriculum_admin`, `platform_super_admin` | Menonaktifkan template tidak merusak snapshot chapter aktif | Platform Ops |

## 3. Matriks Screen Mobile (`@edumotion/mobile` — React Native + Expo)

| Screen Key | Nama Layar | Role | Keterangan |
|---|---|---|---|
| `auth` | Masuk & Pilih Persona | Publik / Semua | Token disimpan via `SecureStore` abstraction (bukan plain AsyncStorage) |
| `home` | Beranda Siswa | `student` | Target harian, streak, XP, lanjutkan chapter, jadwal review |
| `journey` | Peta Perjalanan | `student` | Ke-6 renderer template adaptif layar sentuh, mode selector, pending preference |
| `practice_exam` | Latihan & Ujian | `student` | 14 renderer tipe soal touch-accessible + formal exam timer & autosave |
| `mastery` | Penguasaan & Review | `student` | Skor kompetensi 0–100, antrean spaced repetition 1/3/7/14/30d, remedial |
| `leaderboard` | Liga, Misi & Lencana | `student` | Quests, badges, leaderboard dengan privasi anak |
| `parent` | Pantau Anak (Orang Tua) | `parent` | Ringkasan progres & asesmen anak tertaut saja |
| `profile` | Profil & Pengaturan | `student`, `parent` | Aksesibilitas, status paket, logout |
