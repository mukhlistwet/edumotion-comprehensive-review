import { Component, Suspense, lazy } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { PERMISSIONS, ROLES } from '@edumotion/domain';
import { Button, Card, LoadingState } from '../shared/index.js';
import { AdminShell, SchoolShell, StudentShell, StudioShell } from './AppShells.jsx';
import { MockScenarioBar } from './MockScenarioBar.jsx';
import { RoleScopeGuard } from './RoleScopeGuard.jsx';
import {
  AccessDeniedPage,
  ForgotPasswordPage,
  LandingPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  SessionExpiredPage,
  UpgradePlanPage
} from '../features/auth/AuthPages.jsx';
import {
  StudentDashboardPage,
  StudentHistoryPage,
  StudentMasteryPage,
  StudentNotificationsPage,
  StudentProfileSettingsPage,
  StudentSubjectsPage
} from '../features/student/StudentPages.jsx';

function lazyNamed(loader, exportName) {
  return lazy(() => loader().then((mod) => ({ default: mod[exportName] })));
}

const JourneyExperiencePage = lazyNamed(
  () => import('../features/journey/JourneyExperiencePage.jsx'),
  'JourneyExperiencePage'
);
const ActivityPlayerPage = lazyNamed(
  () => import('../features/questions/PracticePages.jsx'),
  'ActivityPlayerPage'
);
const InteractiveGalleryPage = lazyNamed(
  () => import('../features/questions/PracticePages.jsx'),
  'InteractiveGalleryPage'
);
const PracticeHubPage = lazyNamed(
  () => import('../features/questions/PracticePages.jsx'),
  'PracticeHubPage'
);
const AssessmentHubPage = lazyNamed(
  () => import('../features/assessment/AssessmentPages.jsx'),
  'AssessmentHubPage'
);
const AssessmentResultPage = lazyNamed(
  () => import('../features/assessment/AssessmentPages.jsx'),
  'AssessmentResultPage'
);
const FormalExamSessionPage = lazyNamed(
  () => import('../features/assessment/AssessmentPages.jsx'),
  'FormalExamSessionPage'
);
const LeaderboardPage = lazyNamed(
  () => import('../features/gamification/GamificationPages.jsx'),
  'LeaderboardPage'
);
const QuestionBankPage = lazyNamed(
  () => import('../features/studio/StudioPages.jsx'),
  'QuestionBankPage'
);
const ReviewQueuePage = lazyNamed(
  () => import('../features/studio/StudioPages.jsx'),
  'ReviewQueuePage'
);
const StudioOverviewPage = lazyNamed(
  () => import('../features/studio/StudioPages.jsx'),
  'StudioOverviewPage'
);
const ManualQuestionBuilderPage = lazyNamed(
  () => import('../features/studio/ManualQuestionBuilderPage.jsx'),
  'ManualQuestionBuilderPage'
);
const AIQuestionGeneratorPage = lazyNamed(
  () => import('../features/ai-generator/AIQuestionGeneratorPage.jsx'),
  'AIQuestionGeneratorPage'
);
const ParentPortalPage = lazyNamed(
  () => import('../features/school/SchoolPages.jsx'),
  'ParentPortalPage'
);
const SchoolAssessmentsGradingPage = lazyNamed(
  () => import('../features/school/SchoolPages.jsx'),
  'SchoolAssessmentsGradingPage'
);
const SchoolCounselingPage = lazyNamed(
  () => import('../features/school/SchoolPages.jsx'),
  'SchoolCounselingPage'
);
const SchoolDashboardPage = lazyNamed(
  () => import('../features/school/SchoolPages.jsx'),
  'SchoolDashboardPage'
);
const SchoolDirectorySectionPage = lazyNamed(
  () => import('../features/school/SchoolPages.jsx'),
  'SchoolDirectorySectionPage'
);
const SchoolRolesPage = lazyNamed(
  () => import('../features/school/SchoolPages.jsx'),
  'SchoolRolesPage'
);
const SchoolStudentsPage = lazyNamed(
  () => import('../features/school/SchoolPages.jsx'),
  'SchoolStudentsPage'
);
const AuditLogsPage = lazyNamed(
  () => import('../features/admin/AdminPages.jsx'),
  'AuditLogsPage'
);
const GlobalRbacMatrixPage = lazyNamed(
  () => import('../features/admin/AdminPages.jsx'),
  'GlobalRbacMatrixPage'
);
const InstitutionsTenantsPage = lazyNamed(
  () => import('../features/admin/AdminPages.jsx'),
  'InstitutionsTenantsPage'
);
const JourneyTemplateAdminPage = lazyNamed(
  () => import('../features/admin/AdminPages.jsx'),
  'JourneyTemplateAdminPage'
);
const PlatformOverviewPage = lazyNamed(
  () => import('../features/admin/AdminPages.jsx'),
  'PlatformOverviewPage'
);
const PlatformSubSectionPage = lazyNamed(
  () => import('../features/admin/AdminPages.jsx'),
  'PlatformSubSectionPage'
);

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Terjadi kesalahan antarmuka.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-muted p-6 flex items-center justify-center">
          <Card className="max-w-md text-center space-y-3">
            <h1 className="font-display text-2xl font-black text-red-700">Terjadi Gangguan Aplikasi</h1>
            <p className="text-sm text-text-secondary">{this.state.message}</p>
            <Button onClick={() => this.setState({ hasError: false, message: '' })}>Muat Ulang Tampilan</Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface-muted px-4 py-16">
      <Card className="mx-auto max-w-md text-center space-y-4">
        <h1 className="font-display text-3xl font-black text-navy-900">404 · Halaman Tidak Ditemukan</h1>
        <p className="text-sm text-text-secondary">Rute yang Anda tuju belum terdaftar atau telah dipindahkan.</p>
        <Link to="/">
          <Button>Kembali ke Beranda</Button>
        </Link>
      </Card>
    </div>
  );
}

const STUDIO_ROLES = [
  ROLES.CONTENT_AUTHOR,
  ROLES.REVIEWER,
  ROLES.PUBLISHER,
  ROLES.TEACHER,
  ROLES.PLATFORM_CURRICULUM_ADMIN,
  ROLES.PLATFORM_SUPER_ADMIN
];

export function AppRouter() {
  return (
    <AppErrorBoundary>
      <Suspense fallback={<div className="mx-auto max-w-4xl p-6"><LoadingState message="Memuat modul halaman..." /></div>}>
      <Routes>
        {/* Public & Auth Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/session-expired" element={<SessionExpiredPage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />
        <Route path="/upgrade" element={<UpgradePlanPage />} />

        {/* Student Experience */}
        <Route path="/student/dashboard" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><StudentDashboardPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/subjects" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><StudentSubjectsPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/paths" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><StudentSubjectsPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/journeys/:journeyId/chapters/:chapterId" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><JourneyExperiencePage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/activities/:activityId" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><ActivityPlayerPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/practice" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><PracticeHubPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/challenges" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><PracticeHubPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/gallery" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><InteractiveGalleryPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/assessments" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><AssessmentHubPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/assessments/:assessmentId/session/:sessionId" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><FormalExamSessionPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/assessments/:assessmentId/result/:sessionId" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><AssessmentResultPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/mastery" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><StudentMasteryPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/history" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><StudentHistoryPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/notifications" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><StudentNotificationsPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/leaderboard" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><LeaderboardPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/quests" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><LeaderboardPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/achievements" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><LeaderboardPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/subscription" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><UpgradePlanPage /></RoleScopeGuard>} />
        <Route path="/student/profile" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><StudentProfileSettingsPage /></StudentShell></RoleScopeGuard>} />
        <Route path="/student/settings" element={<RoleScopeGuard allowedRoles={[ROLES.STUDENT]}><StudentShell><StudentProfileSettingsPage /></StudentShell></RoleScopeGuard>} />

        {/* Content Studio */}
        <Route path="/studio" element={<RoleScopeGuard allowedRoles={STUDIO_ROLES}><StudioShell><StudioOverviewPage /></StudioShell></RoleScopeGuard>} />
        <Route path="/studio/questions" element={<RoleScopeGuard requiredPermission={PERMISSIONS.QUESTION_READ}><StudioShell><QuestionBankPage /></StudioShell></RoleScopeGuard>} />
        <Route path="/studio/questions/new" element={<RoleScopeGuard requiredPermission={PERMISSIONS.QUESTION_CREATE_DRAFT}><StudioShell><ManualQuestionBuilderPage /></StudioShell></RoleScopeGuard>} />
        <Route path="/studio/questions/:questionId/edit" element={<RoleScopeGuard requiredPermission={PERMISSIONS.QUESTION_EDIT_DRAFT}><StudioShell><ManualQuestionBuilderPage /></StudioShell></RoleScopeGuard>} />
        <Route path="/studio/reviews" element={<RoleScopeGuard allowedRoles={STUDIO_ROLES}><StudioShell><ReviewQueuePage /></StudioShell></RoleScopeGuard>} />
        <Route path="/studio/ai-generator" element={<RoleScopeGuard requiredPermission={PERMISSIONS.AI_GENERATE}><StudioShell><AIQuestionGeneratorPage /></StudioShell></RoleScopeGuard>} />

        {/* School / Academy Portal */}
        <Route path="/school/dashboard" element={<RoleScopeGuard requiredPermission={PERMISSIONS.SCHOOL_VIEW_DASHBOARD}><SchoolShell><SchoolDashboardPage /></SchoolShell></RoleScopeGuard>} />
        <Route path="/school/students" element={<RoleScopeGuard requiredPermission={PERMISSIONS.SCHOOL_VIEW_DASHBOARD}><SchoolShell><SchoolStudentsPage /></SchoolShell></RoleScopeGuard>} />
        <Route path="/school/staff" element={<RoleScopeGuard requiredPermission={PERMISSIONS.SCHOOL_VIEW_DASHBOARD}><SchoolShell><SchoolDirectorySectionPage title="Direktori Guru & Staf" subtitle="Penugasan guru per mata pelajaran dan rombongan belajar." /></SchoolShell></RoleScopeGuard>} />
        <Route path="/school/classes" element={<RoleScopeGuard requiredPermission={PERMISSIONS.SCHOOL_VIEW_DASHBOARD}><SchoolShell><SchoolDirectorySectionPage title="Kelas & Rombongan Belajar" subtitle="Daftar kelas aktif dalam cakupan institusi Anda." /></SchoolShell></RoleScopeGuard>} />
        <Route path="/school/subjects" element={<RoleScopeGuard requiredPermission={PERMISSIONS.SCHOOL_VIEW_DASHBOARD}><SchoolShell><SchoolDirectorySectionPage title="Mata Pelajaran & Penugasan" subtitle="Pemetaan guru pengampu Matematika dan Fisika." /></SchoolShell></RoleScopeGuard>} />
        <Route path="/school/calendar" element={<RoleScopeGuard requiredPermission={PERMISSIONS.SCHOOL_VIEW_DASHBOARD}><SchoolShell><SchoolDirectorySectionPage title="Jadwal & Kalender Akademik" subtitle="Tryout, UTS, UAS, dan rapat kurikulum sekolah." /></SchoolShell></RoleScopeGuard>} />
        <Route path="/school/assessments" element={<RoleScopeGuard requiredPermission={PERMISSIONS.SCHOOL_GRADE_ASSESSMENT}><SchoolShell><SchoolAssessmentsGradingPage /></SchoolShell></RoleScopeGuard>} />
        <Route path="/school/reports" element={<RoleScopeGuard requiredPermission={PERMISSIONS.SCHOOL_VIEW_REPORTS}><SchoolShell><SchoolDirectorySectionPage title="Laporan Akademik & Penguasaan" subtitle="Rekap kompetensi per rombel terpisah dari XP gamifikasi." /></SchoolShell></RoleScopeGuard>} />
        <Route path="/school/counseling" element={<RoleScopeGuard requiredPermission={PERMISSIONS.SCHOOL_COUNSELING_ACCESS}><SchoolShell><SchoolCounselingPage /></SchoolShell></RoleScopeGuard>} />
        <Route path="/school/parent" element={<RoleScopeGuard requiredPermission={PERMISSIONS.PARENT_VIEW_LINKED}><SchoolShell><ParentPortalPage /></SchoolShell></RoleScopeGuard>} />
        <Route path="/school/roles" element={<RoleScopeGuard requiredPermission={PERMISSIONS.SCHOOL_MANAGE_ROLES}><SchoolShell><SchoolRolesPage /></SchoolShell></RoleScopeGuard>} />
        <Route path="/school/settings" element={<RoleScopeGuard requiredPermission={PERMISSIONS.SCHOOL_VIEW_DASHBOARD}><SchoolShell><SchoolDirectorySectionPage title="Pengaturan Sekolah" subtitle="Profil institusi, tahun ajaran aktif, dan kebijakan privasi." /></SchoolShell></RoleScopeGuard>} />

        {/* Platform Admin Console */}
        <Route path="/admin/dashboard" element={<RoleScopeGuard requiredPermission={PERMISSIONS.PLATFORM_VIEW_OVERVIEW}><AdminShell><PlatformOverviewPage /></AdminShell></RoleScopeGuard>} />
        <Route path="/admin/institutions" element={<RoleScopeGuard requiredPermission={PERMISSIONS.PLATFORM_MANAGE_INSTITUTIONS}><AdminShell><InstitutionsTenantsPage /></AdminShell></RoleScopeGuard>} />
        <Route path="/admin/users" element={<RoleScopeGuard requiredPermission={PERMISSIONS.PLATFORM_MANAGE_USERS}><AdminShell><PlatformSubSectionPage title="Pengguna Global Lintas Tenant" subtitle="Kelola status akun platform dan institusi dengan pencatatan audit." /></AdminShell></RoleScopeGuard>} />
        <Route path="/admin/curricula" element={<RoleScopeGuard requiredPermission={PERMISSIONS.PLATFORM_MANAGE_CURRICULA}><AdminShell><PlatformSubSectionPage title="Kurikulum & Taksonomi Global" subtitle="Kurikulum Merdeka, Cambridge, dan IB beserta versi aktif." mode="curricula" /></AdminShell></RoleScopeGuard>} />
        <Route path="/admin/questions" element={<RoleScopeGuard requiredPermission={PERMISSIONS.PLATFORM_MANAGE_GLOBAL_QUESTIONS}><AdminShell><QuestionBankPage /></AdminShell></RoleScopeGuard>} />
        <Route path="/admin/journey-templates" element={<RoleScopeGuard requiredPermission={PERMISSIONS.PLATFORM_MANAGE_JOURNEY_TEMPLATES}><AdminShell><JourneyTemplateAdminPage /></AdminShell></RoleScopeGuard>} />
        <Route path="/admin/billing" element={<RoleScopeGuard requiredPermission={PERMISSIONS.PLATFORM_MANAGE_BILLING}><AdminShell><PlatformSubSectionPage title="Paket, Langganan & Entitlement" subtitle="Konfigurasi paket B2C dan B2B EduMotion." mode="billing" /></AdminShell></RoleScopeGuard>} />
        <Route path="/admin/ai-usage" element={<RoleScopeGuard requiredPermission={PERMISSIONS.PLATFORM_MONITOR_AI}><AdminShell><PlatformSubSectionPage title="Operasi & Kuota AI Generator" subtitle="Pemantauan anggaran biaya AI dan antrean worker lintas institusi." /></AdminShell></RoleScopeGuard>} />
        <Route path="/admin/roles" element={<RoleScopeGuard requiredPermission={PERMISSIONS.PLATFORM_MANAGE_ROLES}><AdminShell><GlobalRbacMatrixPage /></AdminShell></RoleScopeGuard>} />
        <Route path="/admin/audit-logs" element={<RoleScopeGuard requiredPermission={PERMISSIONS.PLATFORM_VIEW_AUDIT_LOGS}><AdminShell><AuditLogsPage /></AdminShell></RoleScopeGuard>} />
        <Route path="/admin/settings" element={<RoleScopeGuard requiredPermission={PERMISSIONS.PLATFORM_MANAGE_SETTINGS}><AdminShell><PlatformSubSectionPage title="Pengaturan Global Platform" subtitle="Konfigurasi keamanan, privasi anak PDP, dan retensi data." /></AdminShell></RoleScopeGuard>} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
      <MockScenarioBar />
    </AppErrorBoundary>
  );
}
