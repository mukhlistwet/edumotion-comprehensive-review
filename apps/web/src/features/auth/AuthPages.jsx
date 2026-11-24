import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Compass, GraduationCap, Lock, ShieldAlert, Sparkles, Zap } from 'lucide-react';
import { useServices } from '../../app/ServiceContext.jsx';
import { getHomePathForRole, useAuth } from '../../app/AuthSessionContext.jsx';
import { Badge, Button, Card, FormField, Input, Select } from '../../shared/index.js';

export function LandingPage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-surface-muted text-navy-900">
      <header className="sticky top-0 z-20 border-b border-app-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500 font-display text-xl font-black text-white">e</span>
            <span className="font-display text-xl font-black">EduMotion</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/upgrade" className="hidden rounded-xl px-3 py-2 text-sm font-extrabold text-text-secondary hover:bg-surface-subtle sm:inline-flex">
              Paket & Sekolah
            </Link>
            {user ? (
              <Link to={getHomePathForRole(user.role)}>
                <Button size="sm">Buka Ruang Saya</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button size="sm">Masuk</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16 space-y-12">
        <section className="grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <Badge tone="completed">Matematika & Fisika · SD hingga Universitas</Badge>
            <h1 className="font-display text-3xl font-black tracking-tight text-navy-900 sm:text-5xl">
              Belajar Terstruktur, Terukur, dan Menyenangkan.
            </h1>
            <p className="text-base leading-7 text-text-secondary">
              EduMotion menggabungkan Journey Experience Engine dengan 6 tema dunia, 14 tipe soal interaktif sains & matematika, pemantauan penguasaan kompetensi berbasis spaced repetition, serta studio authoring berbantuan AI yang aman.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to={user ? getHomePathForRole(user.role) : '/login'}>
                <Button size="lg">
                  {user ? 'Lanjutkan ke Aplikasi' : 'Mulai Demo Persona'}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="secondary">Daftar Akun Baru</Button>
              </Link>
            </div>
          </div>

          <Card padding="p-6" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-brand-50 p-4">
                <Compass className="h-6 w-6 text-brand-700" aria-hidden="true" />
                <h2 className="mt-2 font-display text-base font-extrabold">6 Tema Journey</h2>
                <p className="mt-1 text-xs text-text-secondary">Adventure, Board, Explore, Skill Tree, Racing, Galaxy di atas satu engine kanonis.</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4">
                <Zap className="h-6 w-6 text-blue-700" aria-hidden="true" />
                <h2 className="mt-2 font-display text-base font-extrabold">14 Tipe Soal</h2>
                <p className="mt-1 text-xs text-text-secondary">Grafik Kartesius, rumus KaTeX, simulasi hukum Newton, hingga uraian rubrik.</p>
              </div>
              <div className="rounded-2xl bg-purple-50 p-4">
                <Sparkles className="h-6 w-6 text-purple-700" aria-hidden="true" />
                <h2 className="mt-2 font-display text-base font-extrabold">AI Studio Aman</h2>
                <p className="mt-1 text-xs text-text-secondary">Pipeline 9 tahap dengan verifier deterministik dan gerbang human review.</p>
              </div>
              <div className="rounded-2xl bg-orange-50 p-4">
                <GraduationCap className="h-6 w-6 text-orange-700" aria-hidden="true" />
                <h2 className="mt-2 font-display text-base font-extrabold">Portal Sekolah</h2>
                <p className="mt-1 text-xs text-text-secondary">Isolasi tenant ketat, grading guru, BK, dan pantau anak Orang Tua.</p>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}

export function LoginPage() {
  const { personas, loginWithCredentials, switchPersona } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('bima.smp@edumotion.demo');
  const [password, setPassword] = useState('edumotion-demo');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError('');
    setSubmitting(true);
    try {
      const loggedUser = await loginWithCredentials({ email, password });
      navigate(redirectTo || getHomePathForRole(loggedUser.role), { replace: true });
    } catch (err) {
      setFieldErrors(err?.fieldErrors || {});
      setFormError(err?.message || 'Gagal masuk.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickPersona = async (personaId) => {
    setSubmitting(true);
    setFormError('');
    try {
      await switchPersona(personaId, (next) => {
        navigate(getHomePathForRole(next.role), { replace: true });
      });
    } catch (err) {
      setFormError(err?.message || 'Gagal beralih persona.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-muted px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <Card padding="p-6">
          <Link to="/" className="inline-flex items-center gap-2 font-display text-xl font-black text-navy-900">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white">e</span>
            EduMotion
          </Link>
          <h1 className="mt-5 font-display text-2xl font-black">Masuk ke Akun</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Gunakan email demo atau pilih persona peran di sebelah untuk menguji seluruh workflow.
          </p>

          {formError ? (
            <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
              {formError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            <FormField id="login-email" label="Email" required error={fieldErrors.email}>
              <Input
                id="login-email"
                type="email"
                value={email}
                error={fieldErrors.email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@sekolah.id"
              />
            </FormField>

            <FormField id="login-password" label="Kata Sandi" required error={fieldErrors.password}>
              <Input
                id="login-password"
                type="password"
                value={password}
                error={fieldErrors.password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
              />
            </FormField>

            <div className="flex items-center justify-between text-xs font-bold">
              <Link to="/forgot-password" className="text-blue-700 hover:underline">Lupa kata sandi?</Link>
              <Link to="/register" className="text-brand-700 hover:underline">Daftar baru</Link>
            </div>

            <Button type="submit" loading={submitting} className="w-full">
              Masuk
            </Button>
          </form>
        </Card>

        <Card padding="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-black">Persona Demo Phase 1 (JSON Mock)</h2>
              <p className="text-xs text-text-secondary">Klik salah satu persona untuk masuk langsung dan menguji RBAC serta scope.</p>
            </div>
            <Badge tone="info">{personas.length} Persona</Badge>
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {personas.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={submitting}
                onClick={() => handleQuickPersona(p.id)}
                className="flex min-h-11 items-start gap-3 rounded-xl border border-app-border bg-white p-3 text-left transition hover:border-brand-500 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-subtle text-xs font-black text-navy-900">
                  {p.initials}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold text-navy-900">{p.title}</div>
                  <div className="truncate text-[11px] font-semibold text-text-muted">{p.email}</div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-text-secondary">{p.description}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { services, showToast } = useServices();
  const { refreshSession } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    educationLevel: 'SMP',
    curriculumId: 'cur_merdeka'
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    try {
      const res = await services.auth.register(form);
      await refreshSession();
      showToast('Akun berhasil dibuat! Onboarding selesai.');
      navigate(getHomePathForRole(res.user.role));
    } catch (err) {
      setFieldErrors(err?.fieldErrors || {});
      showToast(err?.message || 'Gagal mendaftar.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-muted px-4 py-10">
      <Card className="mx-auto max-w-md" padding="p-6">
        <h1 className="font-display text-2xl font-black">Daftar & Onboarding</h1>
        <p className="mt-1 text-sm text-text-secondary">Pilih jenjang dan kurikulum awal untuk mempersonalisasi jalur belajar.</p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <FormField id="reg-name" label="Nama Lengkap" required error={fieldErrors.displayName}>
            <Input
              id="reg-name"
              value={form.displayName}
              error={fieldErrors.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Contoh: Siti Rahma"
            />
          </FormField>
          <FormField id="reg-email" label="Email" required error={fieldErrors.email}>
            <Input
              id="reg-email"
              type="email"
              value={form.email}
              error={fieldErrors.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="siti@edumotion.id"
            />
          </FormField>
          <FormField id="reg-pass" label="Kata Sandi" required error={fieldErrors.password}>
            <Input
              id="reg-pass"
              type="password"
              value={form.password}
              error={fieldErrors.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="reg-level" label="Jenjang">
              <Select
                id="reg-level"
                value={form.educationLevel}
                onChange={(e) => setForm({ ...form, educationLevel: e.target.value })}
              >
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
                <option value="UNIVERSITY">Universitas</option>
              </Select>
            </FormField>
            <FormField id="reg-curr" label="Kurikulum">
              <Select
                id="reg-curr"
                value={form.curriculumId}
                onChange={(e) => setForm({ ...form, curriculumId: e.target.value })}
              >
                <option value="cur_merdeka">Kurikulum Merdeka</option>
                <option value="cur_cambridge">Cambridge</option>
                <option value="cur_ib">IB Diploma</option>
              </Select>
            </FormField>
          </div>
          <Button type="submit" loading={submitting} className="w-full">
            Buat Akun & Mulai Belajar
          </Button>
          <p className="text-center text-xs font-bold text-text-secondary">
            Sudah punya akun? <Link to="/login" className="text-blue-700 hover:underline">Masuk di sini</Link>
          </p>
        </form>
      </Card>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { services } = useServices();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sentMsg, setSentMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await services.auth.requestPasswordReset({ email });
      setSentMsg(res.message);
    } catch (err) {
      setError(err?.fieldErrors?.email || err?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-muted px-4 py-12">
      <Card className="mx-auto max-w-md" padding="p-6">
        <h1 className="font-display text-2xl font-black">Lupa Kata Sandi</h1>
        <p className="mt-1 text-sm text-text-secondary">Masukkan email terdaftar untuk menerima tautan reset (simulasi).</p>
        {sentMsg ? (
          <div className="mt-4 rounded-xl border border-green-200 bg-success-50 p-4 text-sm font-bold text-success-600">
            <CheckCircle2 className="mb-1 inline h-4 w-4 mr-1" /> {sentMsg}
            <div className="mt-3">
              <Link to="/reset-password?token=demo-reset-token">
                <Button size="sm">Lanjut ke Halaman Reset</Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            <FormField id="fp-email" label="Email" required error={error}>
              <Input id="fp-email" type="email" value={email} error={error} onChange={(e) => setEmail(e.target.value)} />
            </FormField>
            <Button type="submit" loading={loading} className="w-full">Kirim Tautan Reset</Button>
          </form>
        )}
        <Link to="/login" className="mt-4 block text-center text-xs font-bold text-blue-700 hover:underline">
          Kembali ke Login
        </Link>
      </Card>
    </div>
  );
}

export function ResetPasswordPage() {
  const { services, showToast } = useServices();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await services.auth.resetPassword({ token: 'demo-reset-token', newPassword: password });
      showToast('Kata sandi berhasil diperbarui.');
      navigate('/login');
    } catch (err) {
      setError(err?.fieldErrors?.newPassword || err?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-muted px-4 py-12">
      <Card className="mx-auto max-w-md" padding="p-6">
        <h1 className="font-display text-2xl font-black">Buat Kata Sandi Baru</h1>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <FormField id="rp-pass" label="Kata Sandi Baru" required error={error}>
            <Input id="rp-pass" type="password" value={password} error={error} onChange={(e) => setPassword(e.target.value)} />
          </FormField>
          <Button type="submit" loading={loading} className="w-full">Simpan Kata Sandi</Button>
        </form>
      </Card>
    </div>
  );
}

export function SessionExpiredPage() {
  const { services } = useServices();
  const { refreshSession } = useAuth();
  const navigate = useNavigate();

  const handleRestore = async () => {
    if (services.mockControl) {
      services.mockControl.setScenarioOptions({ forceScenario: 'normal' });
    }
    await refreshSession();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface-muted px-4 py-14">
      <Card className="mx-auto max-w-md text-center" padding="p-6">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-50 text-orange-700">
          <Lock className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-black">Sesi Berakhir (401)</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Sesi masuk Anda telah habis atau dibatalkan. Silakan masuk kembali untuk melanjutkan aktivitas belajar.
        </p>
        <Button className="mt-5 w-full" onClick={handleRestore}>Masuk Kembali</Button>
      </Card>
    </div>
  );
}

export function AccessDeniedPage() {
  const { user } = useAuth();
  const location = useLocation();
  return (
    <div className="min-h-screen bg-surface-muted px-4 py-14">
      <Card className="mx-auto max-w-md text-center" padding="p-6">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-700">
          <ShieldAlert className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-black">Akses Ditolak (403)</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Peran <b>{user?.role || 'tamu'}</b> tidak memiliki otorisasi untuk membuka halaman{' '}
          <code className="rounded bg-surface-subtle px-1.5 py-0.5 text-xs">{location.state?.from || 'ini'}</code>.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to={user ? getHomePathForRole(user.role) : '/login'}>
            <Button>Kembali ke Beranda Saya</Button>
          </Link>
          <Link to="/upgrade">
            <Button variant="secondary">Lihat Paket & Hak Akses</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export function UpgradePlanPage() {
  const { services, showToast } = useServices();
  const { user, refreshSession } = useAuth();
  const [plans, setPlans] = useState([]);
  const [upgrading, setUpgrading] = useState(null);

  useEffect(() => {
    services.platformAdmin.listPlans().then(setPlans).catch(() => {});
  }, [services]);

  const handleUpgrade = async (planId) => {
    if (!user) {
      showToast('Masuk terlebih dahulu untuk mengubah paket.', 'warning');
      return;
    }
    setUpgrading(planId);
    try {
      await services.auth.upgradeEntitlement({ planId });
      await refreshSession();
      showToast(`Entitlement diperbarui ke ${planId}. Template Journey spesial kini terbuka (tanpa keuntungan nilai akademik).`);
    } catch (err) {
      showToast(err?.message || 'Gagal memperbarui paket.', 'error');
    } finally {
      setUpgrading(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface-muted px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge tone="info">B2C & B2B Entitlement</Badge>
            <h1 className="mt-2 font-display text-3xl font-black">Paket Belajar & Sekolah</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Paket Premium membuka tema Journey spesial dan fitur produktivitas. Nilai akademik, mastery, dan kelulusan ujian tetap 100% murni dari kemampuan belajar.
            </p>
          </div>
          <Link to={user ? getHomePathForRole(user.role) : '/login'}>
            <Button variant="secondary">Kembali</Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((p) => {
            const isCurrent = user?.entitlement === p.id;
            return (
              <Card key={p.id} className={`flex flex-col ${isCurrent ? 'border-2 border-brand-500' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-text-muted">{p.audience}</span>
                  {isCurrent ? <Badge tone="completed">Aktif</Badge> : null}
                </div>
                <h2 className="mt-2 font-display text-xl font-black">{p.name}</h2>
                <p className="mt-2 font-display text-2xl font-black text-brand-700">
                  {p.priceIdr === 0 ? 'Gratis' : `Rp ${p.priceIdr.toLocaleString('id-ID')}`}
                  {p.priceIdr > 0 ? <span className="text-xs font-bold text-text-muted">/bln</span> : null}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-xs font-semibold text-text-secondary">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5 w-full"
                  variant={isCurrent ? 'secondary' : 'primary'}
                  disabled={isCurrent}
                  loading={upgrading === p.id}
                  onClick={() => handleUpgrade(p.id)}
                >
                  {isCurrent ? 'Paket Saat Ini' : 'Pilih Paket (Demo)'}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
