import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  Award,
  Bell,
  BookOpen,
  BrainCircuit,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  Compass,
  CreditCard,
  Dumbbell,
  FilePlus2,
  Flame,
  GraduationCap,
  HeartHandshake,
  House,
  Layers,
  LogOut,
  Map,
  Menu,
  School,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  User,
  UserCheck,
  Users,
  Zap
} from 'lucide-react';
import { PERMISSIONS, ROLES } from '@edumotion/domain';
import { useAuth } from './AuthSessionContext.jsx';
import { Drawer } from '../shared/index.js';

function NavItemLink({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${
          isActive
            ? 'bg-brand-500 text-white shadow-sm'
            : 'text-text-secondary hover:bg-surface-muted hover:text-navy-900'
        }`
      }
    >
      {Icon ? <Icon className="h-5 w-5 shrink-0" aria-hidden="true" /> : null}
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

function BaseResponsiveShell({
  brandSubtitle,
  navItems,
  secondaryItems = [],
  mobileBottomItems = [],
  topRightExtras = null,
  sidebarFooter = null,
  children
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderNavList = (onItemClick) => (
    <div className="flex h-full flex-col">
      <Link
        to="/"
        onClick={onItemClick}
        className="mb-6 flex items-center gap-3 px-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 rounded-xl"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-500 font-display text-xl font-black text-white">
          e
        </span>
        <div className="min-w-0">
          <div className="font-display text-xl font-black tracking-tight text-navy-900">EduMotion</div>
          <div className="truncate text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
            {brandSubtitle}
          </div>
        </div>
      </Link>

      <nav className="space-y-1" aria-label="Navigasi utama">
        {navItems.map((item) => (
          <NavItemLink key={item.to} {...item} onClick={onItemClick} />
        ))}
      </nav>

      {secondaryItems.length > 0 ? (
        <div className="mt-6 border-t border-app-border pt-4">
          <p className="mb-2 px-3 text-[11px] font-extrabold uppercase tracking-wider text-text-muted">Lainnya</p>
          <nav className="space-y-1" aria-label="Navigasi sekunder">
            {secondaryItems.map((item) => (
              <NavItemLink key={item.to} {...item} onClick={onItemClick} />
            ))}
          </nav>
        </div>
      ) : null}

      {sidebarFooter ? <div className="mt-auto pt-5">{sidebarFooter}</div> : null}

      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100"
      >
        <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>Keluar</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-muted lg:flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-sm focus:font-extrabold focus:text-white"
      >
        Lewati ke konten utama
      </a>

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-app-border bg-white px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
        {renderNavList()}
      </aside>

      {/* Mobile/Tablet Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Menu EduMotion">
        {renderNavList(() => setDrawerOpen(false))}
      </Drawer>

      <div className="min-w-0 flex-1 flex flex-col">
        <header className="sticky top-0 z-20 border-b border-app-border bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Buka menu navigasi"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-navy-900 hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="truncate font-display text-lg font-black text-navy-900">EduMotion</span>
            </div>

            <div className="hidden min-w-0 lg:block">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                {brandSubtitle}
              </p>
              <p className="truncate text-sm font-extrabold text-navy-900">
                {user?.title || user?.displayName}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {topRightExtras}
              <div className="flex items-center gap-2 rounded-full border border-app-border bg-surface-muted px-2.5 py-1">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-xs font-black text-blue-700">
                  {user?.initials || 'EM'}
                </span>
                <span className="hidden text-xs font-extrabold text-navy-900 sm:inline">
                  {user?.displayName}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className={`mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7 ${
            mobileBottomItems.length > 0 ? 'pb-24 lg:pb-8' : ''
          }`}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation (Student Shell) */}
      {mobileBottomItems.length > 0 ? (
        <nav
          aria-label="Navigasi bawah mobile"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-app-border bg-white px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
        >
          <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
            {mobileBottomItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[11px] font-extrabold transition ${
                      isActive ? 'text-brand-700 bg-brand-50' : 'text-text-muted'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

export function StudentShell({ children }) {
  const navItems = [
    { to: '/student/dashboard', icon: House, label: 'Beranda' },
    { to: '/student/journeys/jrn_math_smp_algebra/chapters/ch_alg_01', icon: Map, label: 'Jalur Belajar' },
    { to: '/student/practice', icon: Dumbbell, label: 'Latihan' },
    { to: '/student/assessments', icon: CalendarCheck, label: 'Ujian & Tryout' },
    { to: '/student/mastery', icon: Target, label: 'Penguasaan' },
    { to: '/student/leaderboard', icon: Trophy, label: 'Liga & Misi' }
  ];

  const secondaryItems = [
    { to: '/student/subjects', icon: BookOpen, label: 'Mata Pelajaran' },
    { to: '/student/gallery', icon: Layers, label: 'Galeri 14 Tipe Soal' },
    { to: '/student/history', icon: Activity, label: 'Riwayat Belajar' },
    { to: '/student/notifications', icon: Bell, label: 'Notifikasi' },
    { to: '/student/subscription', icon: CreditCard, label: 'Paket Langganan' },
    { to: '/student/profile', icon: User, label: 'Profil & Aksesibilitas' }
  ];

  const mobileBottomItems = [
    { to: '/student/dashboard', icon: House, label: 'Beranda' },
    { to: '/student/journeys/jrn_math_smp_algebra/chapters/ch_alg_01', icon: Map, label: 'Belajar' },
    { to: '/student/practice', icon: Dumbbell, label: 'Latihan' },
    { to: '/student/leaderboard', icon: Trophy, label: 'Liga' },
    { to: '/student/profile', icon: User, label: 'Profil' }
  ];

  const topRightExtras = (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-flex items-center gap-1 rounded-xl bg-orange-50 px-2.5 py-1.5 text-xs font-extrabold text-orange-700"
        title="Streak harian"
      >
        <Flame className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden min-[360px]:inline">Streak</span>
      </span>
      <Link
        to="/student/notifications"
        aria-label="Lihat notifikasi"
        className="grid h-10 w-10 place-items-center rounded-xl border border-app-border text-text-secondary hover:bg-surface-muted"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );

  return (
    <BaseResponsiveShell
      brandSubtitle="Ruang Belajar Siswa"
      navItems={navItems}
      secondaryItems={secondaryItems}
      mobileBottomItems={mobileBottomItems}
      topRightExtras={topRightExtras}
      sidebarFooter={
        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3.5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-purple-700">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>Pendamping Belajar</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            Perkuat kompetensi dengan jadwal review 1/3/7/14/30 hari.
          </p>
          <Link
            to="/student/mastery"
            className="mt-2.5 inline-flex min-h-9 w-full items-center justify-center rounded-xl bg-purple-500 px-3 text-xs font-extrabold text-white hover:bg-purple-700"
          >
            Buka Jadwal Review
          </Link>
        </div>
      }
    >
      {children}
    </BaseResponsiveShell>
  );
}

export function StudioShell({ children }) {
  const { can } = useAuth();
  const navItems = [
    { to: '/studio', icon: Layers, label: 'Ringkasan Studio' },
    { to: '/studio/questions', icon: BookOpen, label: 'Bank Soal' }
  ];
  if (can(PERMISSIONS.QUESTION_CREATE_DRAFT)) {
    navItems.push({ to: '/studio/questions/new', icon: FilePlus2, label: 'Manual Builder' });
  }
  if (can(PERMISSIONS.AI_GENERATE)) {
    navItems.push({ to: '/studio/ai-generator', icon: BrainCircuit, label: 'AI Generator' });
  }
  if (can(PERMISSIONS.QUESTION_REVIEW) || can(PERMISSIONS.QUESTION_PUBLISH) || can(PERMISSIONS.QUESTION_EDIT_DRAFT)) {
    navItems.push({ to: '/studio/reviews', icon: ClipboardCheck, label: 'Antrean Review' });
  }

  return (
    <BaseResponsiveShell brandSubtitle="Content Studio" navItems={navItems}>
      {children}
    </BaseResponsiveShell>
  );
}

export function SchoolShell({ children }) {
  const { user, can } = useAuth();
  const navItems = [];

  if (user?.role === ROLES.PARENT) {
    navItems.push({ to: '/school/parent', icon: UserCheck, label: 'Pantau Anak' });
  } else {
    navItems.push({ to: '/school/dashboard', icon: School, label: 'Dashboard Sekolah' });
    if (can(PERMISSIONS.SCHOOL_MANAGE_STUDENTS) || can(PERMISSIONS.SCHOOL_VIEW_REPORTS)) {
      navItems.push({ to: '/school/students', icon: Users, label: 'Siswa' });
    }
    if (can(PERMISSIONS.SCHOOL_MANAGE_STAFF)) {
      navItems.push({ to: '/school/staff', icon: GraduationCap, label: 'Guru & Staf' });
    }
    if (can(PERMISSIONS.SCHOOL_MANAGE_CLASSES) || can(PERMISSIONS.SCHOOL_VIEW_DASHBOARD)) {
      navItems.push({ to: '/school/classes', icon: Building2, label: 'Kelas & Rombel' });
    }
    if (can(PERMISSIONS.SCHOOL_MANAGE_SUBJECTS) || can(PERMISSIONS.QUESTION_CREATE_DRAFT)) {
      navItems.push({ to: '/school/subjects', icon: BookOpen, label: 'Mapel & Penugasan' });
    }
    if (can(PERMISSIONS.SCHOOL_MANAGE_CALENDAR) || can(PERMISSIONS.SCHOOL_VIEW_DASHBOARD)) {
      navItems.push({ to: '/school/calendar', icon: CalendarDays, label: 'Kalender Akademik' });
    }
    if (can(PERMISSIONS.SCHOOL_GRADE_ASSESSMENT)) {
      navItems.push({ to: '/school/assessments', icon: ClipboardCheck, label: 'Asesmen & Rubrik' });
    }
    if (can(PERMISSIONS.SCHOOL_VIEW_REPORTS)) {
      navItems.push({ to: '/school/reports', icon: Award, label: 'Laporan Akademik' });
    }
    if (can(PERMISSIONS.SCHOOL_COUNSELING_ACCESS)) {
      navItems.push({ to: '/school/counseling', icon: HeartHandshake, label: 'Konseling / BK' });
    }
    if (can(PERMISSIONS.SCHOOL_MANAGE_ROLES)) {
      navItems.push({ to: '/school/roles', icon: ShieldCheck, label: 'Peran Kustom' });
    }
    if (can(PERMISSIONS.SCHOOL_MANAGE_SETTINGS)) {
      navItems.push({ to: '/school/settings', icon: Settings, label: 'Pengaturan Sekolah' });
    }
    if (can(PERMISSIONS.QUESTION_CREATE_DRAFT)) {
      navItems.push({ to: '/studio/questions', icon: FilePlus2, label: 'Studio Bank Soal' });
    }
  }

  return (
    <BaseResponsiveShell brandSubtitle="Portal Akademi / Sekolah" navItems={navItems}>
      {children}
    </BaseResponsiveShell>
  );
}

export function AdminShell({ children }) {
  const { can } = useAuth();
  const navItems = [{ to: '/admin/dashboard', icon: Zap, label: 'Ringkasan Platform' }];

  if (can(PERMISSIONS.PLATFORM_MANAGE_INSTITUTIONS)) {
    navItems.push({ to: '/admin/institutions', icon: Building2, label: 'Institusi & Tenant' });
  }
  if (can(PERMISSIONS.PLATFORM_MANAGE_USERS)) {
    navItems.push({ to: '/admin/users', icon: Users, label: 'Pengguna Global' });
  }
  if (can(PERMISSIONS.PLATFORM_MANAGE_CURRICULA)) {
    navItems.push({ to: '/admin/curricula', icon: BookOpen, label: 'Kurikulum & Taksonomi' });
  }
  if (can(PERMISSIONS.PLATFORM_MANAGE_GLOBAL_QUESTIONS)) {
    navItems.push({ to: '/admin/questions', icon: ClipboardCheck, label: 'Bank Soal Global' });
  }
  if (can(PERMISSIONS.PLATFORM_MANAGE_JOURNEY_TEMPLATES)) {
    navItems.push({ to: '/admin/journey-templates', icon: Compass, label: 'Journey Templates' });
  }
  if (can(PERMISSIONS.PLATFORM_MANAGE_BILLING)) {
    navItems.push({ to: '/admin/billing', icon: CreditCard, label: 'Paket & Entitlement' });
  }
  if (can(PERMISSIONS.PLATFORM_MONITOR_AI)) {
    navItems.push({ to: '/admin/ai-usage', icon: BrainCircuit, label: 'Operasi & Kuota AI' });
  }
  if (can(PERMISSIONS.PLATFORM_MANAGE_ROLES)) {
    navItems.push({ to: '/admin/roles', icon: ShieldCheck, label: 'Matriks RBAC' });
  }
  if (can(PERMISSIONS.PLATFORM_VIEW_AUDIT_LOGS)) {
    navItems.push({ to: '/admin/audit-logs', icon: Activity, label: 'Audit Log' });
  }
  if (can(PERMISSIONS.PLATFORM_MANAGE_SETTINGS)) {
    navItems.push({ to: '/admin/settings', icon: Settings, label: 'Pengaturan Platform' });
  }

  return (
    <BaseResponsiveShell brandSubtitle="Platform Console" navItems={navItems}>
      {children}
    </BaseResponsiveShell>
  );
}
