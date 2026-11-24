# Matriks Auth, RBAC, Tenancy Scope & Entitlement (Phase 2–4)

**Sumber Kebenaran Kode:** [enums.js](file:///d:/Experimen/edumotion-comprehensive-review/packages/domain/src/enums.js) & [rbac-engine.js](file:///d:/Experimen/edumotion-comprehensive-review/packages/domain/src/rbac-engine.js)  
**Penegakan Otoritatif:** Ditegakkan pada lapisan service backend (`apps/api/src/services/*`) berdasarkan token Bearer terverifikasi server, bukan hanya guard UI.

---

## 1. Pemetaan Role Kanonis terhadap Izin (`PERMISSIONS`) & Batas Scope

| Role (`ROLES`) | Scope Resource Wajib | Permission Inti (`PERMISSIONS`) | Operasi yang Ditolak Keras (403) |
|---|---|---|---|
| `student` | `self` (+ `tenantId` institusi) | `student.learn`, `student.assessment` | Semua endpoint `/studio`, `/school/*`, `/admin/*`, dan data siswa lain |
| `parent` | `linkedStudentIds` resmi saja | `parent.view_linked_child` | Mengakses `studentId` di luar `parent_student_links` (`403 FORBIDDEN_STUDENT_LINK`), fitur author/school/admin |
| `teacher` | `tenantId` + `assignedClassIds` + mapel | `question.* (draft)`, `ai.generate`, `school.view_dashboard`, `school.manage_subjects`, `school.grade_assessment`, `school.view_reports` | Mengakses draft soal tenant lain (`403 FORBIDDEN_TENANT_ACCESS`), publikasi global, operasi platform admin |
| `homeroom_teacher` | `tenantId` + `assignedClassIds` | `school.view_dashboard`, `school.manage_classes`, `school.view_reports`, `school.counseling_access` | Rombel di luar penugasan, billing/peran kustom, operasi platform |
| `counselor` | `tenantId` + `counseling_risk_scope` | `school.view_dashboard`, `school.counseling_access` (wajib tercatat di `audit_logs`) | Mengubah nilai asesmen, membaca data tenant lain |
| `content_author` | `tenantId` (atau global jika staf platform) | `question.read`, `question.create_draft`, `question.edit_draft`, `ai.generate` | Approve review, publish soal, mengubah status institusi |
| `reviewer` | `tenantId` + subject scope | `question.read`, `question.review` | Mengubah soal `published` secara langsung, publish final, aksi tenant lain |
| `publisher` | `tenantId` / `global` | `question.read`, `question.publish`, `question.archive` | Mengedit konten soal langsung tanpa buat versi baru |
| `school_academic_admin` | `tenantId` penuh | `school.view_dashboard`, `manage_students`, `manage_staff`, `manage_classes`, `manage_subjects`, `manage_calendar`, `view_reports`, `manage_roles` | Tenant lain (`tenant B`), billing platform, audit log global |
| `vice_principal` | `tenantId` penuh | `school.view_dashboard`, `manage_classes`, `manage_subjects`, `manage_calendar`, `grade_assessment`, `view_reports` | Tenant lain, manajemen institusi platform |
| `principal` | `tenantId` penuh | `school.view_dashboard`, `view_reports`, `counseling_access`, `manage_settings` | Tenant lain, platform ops |
| `school_owner` | `tenantId` penuh | Seluruh manajemen sekolah termasuk `school.manage_roles` & `school.manage_settings` | Tenant lain, konsol platform |
| `platform_curriculum_admin` | `global_curriculum` (**bukan superuser**) | `question.*` (sampai publish), `ai.generate`, `platform.view_overview`, `platform.manage_curricula`, `platform.manage_global_questions`, `platform.manage_journey_templates` | `platform.manage_institutions` (`403`), `platform.manage_billing` (`403`), `platform.manage_users` (`403`), `platform.view_audit_logs` (`403`) |
| `platform_super_admin` | Platform global | Seluruh 32 `PERMISSIONS` (`Object.values(PERMISSIONS)`) | Mutasi lintas tenant tanpa `auditReason` (`422 AUDIT_REASON_REQUIRED`) |

## 2. Kebijakan Entitlement (Non-Pay-to-Win)
- Paket `freemium`, `premium`, `family`, `institution_basic`, dan `institution_pro` membuka fitur produktivitas/visual (seperti template Journey spesial `racing`/`galaxy` atau kuota kolaborasi sekolah).
- **Larangan Mutlak:** Entitlement berbayar **tidak pernah** mengubah skor jawaban, bobot kompetensi mastery, nilai asesmen formal, ataupun syarat kelulusan node.
