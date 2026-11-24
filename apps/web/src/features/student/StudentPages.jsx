import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Atom,
  Bell,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Flame,
  GraduationCap,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Zap
} from 'lucide-react';
import { useServices } from '../../app/ServiceContext.jsx';
import { useAuth } from '../../app/AuthSessionContext.jsx';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  ProgressBar,
  SectionHeader,
  Select,
  StatCard
} from '../../shared/index.js';

export function StudentDashboardPage() {
  const { services } = useServices();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [mastery, setMastery] = useState(null);
  const [pathsData, setPathsData] = useState({ items: [], chapters: [] });
  const [assessments, setAssessments] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [st, mst, pth, asm] = await Promise.all([
        services.gamification.getDashboardStats(),
        services.mastery.getOverview(),
        services.learning.listPaths(),
        services.assessment.listAssessments()
      ]);
      setStats(st);
      setMastery(mst);
      setPathsData(pth);
      setAssessments(asm);
    } catch (err) {
      setError(err?.message || 'Gagal memuat dashboard siswa.');
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Menyiapkan ruang belajarmu..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const proficientCount = (mastery?.competencies || []).filter((c) => c.score >= 60).length;
  const totalCompCount = (mastery?.competencies || []).length || 1;
  const remedialFirst = mastery?.remedialRecommendations?.[0];
  const primaryJourney = pathsData.items[0] || { journeyId: 'jrn_math_smp_algebra' };
  const primaryChapter = pathsData.chapters.find((c) => c.journeyId === primaryJourney.journeyId) || { id: 'ch_alg_01' };

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-extrabold text-brand-700">Ruang belajarmu</p>
          <h1 className="mt-1 font-display text-3xl font-black tracking-tight text-navy-900 sm:text-4xl">
            Halo, {user?.displayName || 'Siswa'}!
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-text-secondary sm:text-base">
            Sedikit demi sedikit, penguasaan kompetensimu terus berkembang. Siap melanjutkan misi hari ini?
          </p>
        </div>
        <Link to={`/student/journeys/${primaryJourney.journeyId}/chapters/${primaryChapter.id}`}>
          <Button size="lg">
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            Lanjutkan Belajar
          </Button>
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Statistik belajar">
        <StatCard
          label="Target harian"
          value={stats?.dailyXpEarned ?? 0}
          suffix={`/ ${stats?.dailyXpTarget ?? 30} XP`}
          progress={((stats?.dailyXpEarned ?? 0) / (stats?.dailyXpTarget ?? 30)) * 100}
          icon={<Target className="h-5 w-5" aria-hidden="true" />}
          iconTone="bg-brand-50 text-brand-700"
        />
        <StatCard
          label="Streak"
          value={stats?.streakDays ?? 0}
          suffix="hari"
          hint={`Terbaik: ${stats?.bestStreak ?? 0} hari`}
          icon={<Flame className="h-5 w-5" aria-hidden="true" />}
          iconTone="bg-orange-50 text-orange-700"
        />
        <StatCard
          label="Total XP (Terpisah dari Nilai)"
          value={(stats?.xpBalance ?? 0).toLocaleString('id-ID')}
          hint={`Rank: Lv.${stats?.rank?.level ?? 0} ${stats?.rank?.title ?? ''}`}
          icon={<Zap className="h-5 w-5" aria-hidden="true" />}
          iconTone="bg-yellow-50 text-yellow-700"
        />
        <StatCard
          label="Kompetensi Dikuasai"
          value={proficientCount}
          suffix={`dari ${totalCompCount}`}
          hint="Dihitung dari bukti penguasaan, bukan XP"
          icon={<GraduationCap className="h-5 w-5" aria-hidden="true" />}
          iconTone="bg-blue-50 text-blue-700"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <Card padding="p-0" className="overflow-hidden">
            <div className="flex flex-col justify-between gap-3 bg-gradient-to-r from-brand-700 to-brand-500 p-5 text-white sm:flex-row sm:items-center sm:p-6">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-brand-100">PERJALANAN AKTIF</p>
                <h2 className="mt-1 font-display text-2xl font-black">{primaryJourney.title || 'Matematika SMP · Aljabar'}</h2>
                <p className="mt-1 text-sm text-brand-50">{primaryChapter.title || 'Chapter 01'}</p>
              </div>
              <Link to={`/student/journeys/${primaryJourney.journeyId}/chapters/${primaryChapter.id}`}>
                <Button variant="secondary" size="sm">
                  Buka Peta Journey
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  to="/student/journeys/jrn_math_smp_algebra/chapters/ch_alg_01"
                  className="flex items-start gap-3 rounded-2xl border border-app-border p-4 transition hover:border-blue-500"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                    <Calculator className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-base font-black">Matematika</h3>
                    <p className="mt-0.5 text-xs text-text-secondary">Aljabar, Fungsi Kuadrat, Geometri & Kalkulus.</p>
                  </div>
                </Link>

                <Link
                  to="/student/journeys/jrn_phys_sma_mechanics/chapters/ch_phys_01"
                  className="flex items-start gap-3 rounded-2xl border border-app-border p-4 transition hover:border-purple-500"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-700">
                    <Atom className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-base font-black">Fisika</h3>
                    <p className="mt-0.5 text-xs text-text-secondary">Besaran SI, Kinematika GLB & Simulasi Hukum Newton.</p>
                  </div>
                </Link>
              </div>
            </div>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-black">Rekomendasi Remedial</h2>
              <Badge tone="warning">Mastery &lt; 60</Badge>
            </div>
            {remedialFirst ? (
              <>
                <p className="text-sm font-extrabold text-navy-900">{remedialFirst.description}</p>
                <p className="text-xs font-semibold text-text-secondary">
                  Skor penguasaan saat ini: <b>{remedialFirst.score}/100</b>. Perkuat tanpa reset progres.
                </p>
                <Link to="/student/mastery">
                  <Button variant="outline" size="sm" className="w-full">
                    Buka Jalur Remedial
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-xs font-semibold text-text-secondary">
                Semua kompetensi yang dipelajari berada pada jalur baik! Cek jadwal review Spaced Repetition.
              </p>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-black">Agenda Ujian</h2>
              <CalendarDays className="h-5 w-5 text-blue-700" aria-hidden="true" />
            </div>
            {assessments[0] ? (
              <div className="rounded-xl bg-blue-50 p-3.5 text-xs space-y-1">
                <p className="font-black uppercase text-blue-700">{assessments[0].mode}</p>
                <p className="text-sm font-extrabold text-navy-900">{assessments[0].title}</p>
                <p className="text-text-secondary">
                  {assessments[0].questionIds.length} soal · {assessments[0].durationMinutes} menit
                </p>
              </div>
            ) : null}
            <Link to="/student/assessments" className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-700 hover:underline">
              Lihat seluruh asesmen <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function StudentSubjectsPage() {
  const { services } = useServices();
  const [data, setData] = useState({ items: [], chapters: [] });
  const [taxonomy, setTaxonomy] = useState(null);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([services.learning.listPaths(), services.learning.getTaxonomy()])
      .then(([p, t]) => {
        setData(p);
        setTaxonomy(t);
      })
      .finally(() => setLoading(false));
  }, [services]);

  if (loading) return <LoadingState message="Memuat katalog kurikulum & learning path..." />;

  const filtered = data.items.filter((p) => {
    if (subjectFilter !== 'all' && p.subjectId !== subjectFilter) return false;
    if (levelFilter !== 'all' && p.educationLevel !== levelFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Kurikulum & Learning Paths"
        title="Mata Pelajaran & Jalur Belajar"
        subtitle="Satu hierarki kanonis: Curriculum → Subject → Learning Path → Chapter → Journey Node → Activity."
      />

      <Card className="grid gap-3 sm:grid-cols-2" padding="p-4">
        <FormField id="flt-subj" label="Mata Pelajaran">
          <Select id="flt-subj" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="all">Semua Mata Pelajaran</option>
            {(taxonomy?.subjects || []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField id="flt-lvl" label="Jenjang Pendidikan">
          <Select id="flt-lvl" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="all">Semua Jenjang</option>
            <option value="SD">SD</option>
            <option value="SMP">SMP</option>
            <option value="SMA">SMA</option>
            <option value="UNIVERSITY">Universitas</option>
          </Select>
        </FormField>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="Tidak ada learning path yang cocok" description="Ubah filter mata pelajaran atau jenjang." />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {filtered.map((path) => {
            const firstChapter = data.chapters.find((c) => c.journeyId === path.journeyId);
            return (
              <Card key={path.id} className="flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge tone="info">{path.educationLevel}</Badge>
                    <span className="text-xs font-extrabold text-text-muted">{path.subjectCode}</span>
                  </div>
                  <h3 className="font-display text-lg font-black text-navy-900">{path.title}</h3>
                  <p className="text-xs text-text-secondary">{path.description}</p>
                </div>
                {firstChapter ? (
                  <Link to={`/student/journeys/${path.journeyId}/chapters/${firstChapter.id}`}>
                    <Button className="w-full">Buka Learning Path</Button>
                  </Link>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function StudentMasteryPage() {
  const { services, showToast } = useServices();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await services.mastery.getOverview());
    } catch (err) {
      setError(err?.message || 'Gagal memuat penguasaan kompetensi.');
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCompleteReview = async (srId, wasCorrect) => {
    try {
      const updated = await services.mastery.completeSpacedReview(srId, { wasCorrect });
      showToast(`Jadwal review diperbarui: interval berikutnya ${updated.intervalDays} hari.`);
      await load();
    } catch (err) {
      showToast(err?.message || 'Gagal memperbarui jadwal review.', 'error');
    }
  };

  if (loading) return <LoadingState message="Menghitung estimasi mastery dari bukti belajar..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Kompetensi & Spaced Repetition"
        title="Penguasaan Kompetensi (0–100)"
        subtitle="Mastery dihitung berdasarkan bukti pengerjaan soal unik, tingkat kesulitan, kemandirian tanpa hint, dan jadwal retensi 1, 3, 7, 14, 30 hari — terpisah dari XP."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="space-y-4">
          <h2 className="font-display text-lg font-black">Status Mastery per Kompetensi</h2>
          <div className="space-y-3">
            {(data?.competencies || []).map((comp) => (
              <div key={comp.id} className="rounded-2xl border border-app-border p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-black text-text-muted">{comp.code}</span>
                    <p className="text-sm font-extrabold text-navy-900">{comp.description}</p>
                  </div>
                  <Badge
                    tone={
                      comp.score >= 80
                        ? 'mastered'
                        : comp.score >= 60
                          ? 'completed'
                          : comp.remedialRecommended
                            ? 'warning'
                            : 'neutral'
                    }
                  >
                    {comp.score}/100 · {comp.band.label}
                  </Badge>
                </div>
                <ProgressBar value={comp.score} max={100} label={comp.code} />
                <div className="flex flex-wrap justify-between text-[11px] font-bold text-text-muted">
                  <span>Bukti soal unik: {comp.distinctQuestionCount} (total percobaan: {comp.evidenceCount})</span>
                  {comp.remedialRecommended ? (
                    <Link to="/student/activities/act_alg_formula" className="text-orange-700 hover:underline">
                      Rute Remedial Disarankan →
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <aside className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-700" aria-hidden="true" />
              <h2 className="font-display text-lg font-black">Antrean Spaced Repetition</h2>
            </div>
            <p className="text-xs text-text-secondary">
              Interval dasar: <b>1 → 3 → 7 → 14 → 30 hari</b>. Jika jawaban kurang tepat, interval kembali ke tahap 1 hari untuk penguatan retensi.
            </p>
            {(data?.dueReviews || []).length === 0 ? (
              <p className="rounded-xl bg-surface-muted p-3 text-xs font-bold text-text-muted">
                Belum ada antrean review aktif untuk akun ini.
              </p>
            ) : (
              <div className="space-y-3">
                {data.dueReviews.map((sr) => {
                  const comp = data.competencies.find((c) => c.id === sr.competencyId);
                  return (
                    <div key={sr.id} className="rounded-xl border border-app-border p-3 space-y-2">
                      <p className="text-xs font-black text-purple-700">Interval Saat Ini: {sr.intervalDays} Hari</p>
                      <p className="text-sm font-extrabold text-navy-900">{comp?.description || sr.competencyId}</p>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => handleCompleteReview(sr.id, true)}>
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Review Paham
                        </Button>
                        <Button size="sm" variant="secondary" className="flex-1" onClick={() => handleCompleteReview(sr.id, false)}>
                          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                          Perlu Ulang
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function StudentHistoryPage() {
  const { services } = useServices();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    services.mastery.getHistory().then(setItems).finally(() => setLoading(false));
  }, [services]);

  if (loading) return <LoadingState message="Memuat riwayat aktivitas..." />;

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Rekam Belajar" title="Riwayat Aktivitas" subtitle="Daftar sesi latihan dan tantangan yang telah diselesaikan." />
      {items.length === 0 ? (
        <EmptyState title="Belum ada riwayat aktivitas" description="Mulai latihan pertama untuk mencatat progres." />
      ) : (
        <div className="space-y-3">
          {items.map((h) => (
            <Card key={h.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge tone="info">{h.mode}</Badge>
                <h3 className="mt-1 font-display text-base font-black">{h.title}</h3>
                <p className="text-xs text-text-muted">{new Date(h.completedAt).toLocaleString('id-ID')}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-black text-brand-700">{h.score}%</p>
                <p className="text-xs font-extrabold text-orange-700">+{h.xpEarned} XP</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function StudentNotificationsPage() {
  const { services } = useServices();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await services.notification.list());
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id) => {
    await services.notification.markAsRead(id);
    await load();
  };

  if (loading) return <LoadingState message="Memuat kotak masuk notifikasi..." />;

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Kotak Masuk" title="Notifikasi Belajar" />
      {items.length === 0 ? (
        <EmptyState title="Tidak ada notifikasi baru" description="Semua pengingat belajar sudah terbaca." />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Card key={n.id} className={`flex flex-wrap items-center justify-between gap-3 ${!n.read ? 'border-blue-500 bg-blue-50/40' : ''}`}>
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-blue-700 shadow-sm">
                  <Bell className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-navy-900">{n.title}</h3>
                  <p className="mt-0.5 text-xs text-text-secondary">{n.body}</p>
                </div>
              </div>
              {!n.read ? (
                <Button size="sm" variant="secondary" onClick={() => markRead(n.id)}>
                  Tandai Dibaca
                </Button>
              ) : (
                <Badge tone="completed">Dibaca</Badge>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function StudentProfileSettingsPage() {
  const { services, showToast, accessibility, setAccessibility } = useServices();
  const { user, refreshSession } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [privacyPublic, setPrivacyPublic] = useState(Boolean(user?.privacyOptInPublicName));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await services.auth.updateProfile({ displayName, privacyOptInPublicName: privacyPublic });
      await refreshSession();
      showToast('Profil dan preferensi privasi disimpan.');
    } catch (err) {
      setError(err?.fieldErrors?.displayName || err?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SectionHeader
        eyebrow="Akun & Aksesibilitas"
        title="Profil, Privasi & Aksesibilitas"
        subtitle="Atur preferensi tampilan ramah aksesibilitas (WCAG 2.2 AA) dan kontrol privasi."
      />

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-black">Informasi Akun</h2>
            <Badge tone="info">Paket: {user?.entitlement || 'freemium'}</Badge>
          </div>
          <FormField id="prof-name" label="Nama Tampilan" required error={error}>
            <Input id="prof-name" value={displayName} error={error} onChange={(e) => setDisplayName(e.target.value)} />
          </FormField>

          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-app-border p-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={privacyPublic}
              onChange={(e) => setPrivacyPublic(e.target.checked)}
              className="h-4 w-4 accent-brand-500"
            />
            <span>
              Tampilkan nama asli pada Leaderboard publik (default nonaktif untuk perlindungan privasi anak)
            </span>
          </label>

          <Button type="submit" loading={saving}>Simpan Profil</Button>
        </form>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-700" aria-hidden="true" />
          <h2 className="font-display text-lg font-black">Preferensi Aksesibilitas (Web & Journey)</h2>
        </div>

        <label className="flex min-h-11 items-center justify-between rounded-xl border border-app-border p-3 text-sm font-bold">
          <span>Kurangi Gerak / Animasi (Reduced Motion)</span>
          <input
            type="checkbox"
            checked={accessibility.reducedMotion}
            onChange={(e) => setAccessibility((a) => ({ ...a, reducedMotion: e.target.checked }))}
            className="h-4 w-4 accent-brand-500"
          />
        </label>

        <label className="flex min-h-11 items-center justify-between rounded-xl border border-app-border p-3 text-sm font-bold">
          <span>Mode Kontras Tinggi (High Contrast Borders & Text)</span>
          <input
            type="checkbox"
            checked={accessibility.highContrast}
            onChange={(e) => setAccessibility((a) => ({ ...a, highContrast: e.target.checked }))}
            className="h-4 w-4 accent-brand-500"
          />
        </label>

        <FormField id="a11y-scale" label="Skala Ukuran Teks">
          <Select
            id="a11y-scale"
            value={String(accessibility.textScale)}
            onChange={(e) => setAccessibility((a) => ({ ...a, textScale: Number(e.target.value) }))}
          >
            <option value="1">Normal (100%)</option>
            <option value="1.12">Besar (112%)</option>
            <option value="1.25">Sangat Besar (125%)</option>
          </Select>
        </FormField>
      </Card>
    </div>
  );
}
