import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, HeartHandshake, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { PERMISSIONS } from '@edumotion/domain';
import { useServices } from '../../app/ServiceContext.jsx';
import { useAuth } from '../../app/AuthSessionContext.jsx';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  ProgressBar,
  SectionHeader,
  Select,
  StatCard,
  Textarea
} from '../../shared/index.js';

export function SchoolDashboardPage() {
  const { services } = useServices();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await services.school.getDashboard());
    } catch (err) {
      setError(err?.message || 'Gagal memuat dashboard sekolah.');
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Memuat ringkasan portal akademi..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={data?.tenant?.name || 'Portal Akademi'}
        title="Dashboard Akademik Sekolah"
        subtitle={`Tahun ajaran ${data?.tenant?.academicYear || '2026/2027'} · Data terisolasi ketat per institusi dan penugasan rombel.`}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Siswa Dalam Scope" value={data?.students?.length || 0} icon={<Users className="h-5 w-5" />} iconTone="bg-blue-50 text-blue-700" />
        <StatCard label="Rombel Terdaftar" value={data?.classes?.length || 0} iconTone="bg-purple-50 text-purple-700" />
        <StatCard label="Rata-rata Mastery" value="79%" iconTone="bg-brand-50 text-brand-700" />
        <StatCard label="Uraian Perlu Dinilai" value={data?.pendingWorkedCount || 0} iconTone="bg-orange-50 text-orange-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 space-y-4">
          <h2 className="font-display text-lg font-black">Performa Pembelajaran per Rombel</h2>
          <div className="space-y-4">
            {(data?.classes || []).map((cls) => (
              <div key={cls.id} className="space-y-1.5">
                <div className="flex justify-between text-sm font-extrabold">
                  <span>{cls.name} ({cls.grade})</span>
                  <span>{cls.avgMastery}%</span>
                </div>
                <ProgressBar value={cls.avgMastery} max={100} label={cls.name} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-black">Agenda Akademik</h2>
          {(data?.calendar || []).map((ev) => (
            <div key={ev.id} className="flex gap-3 border-l-4 border-blue-500 pl-3 py-1">
              <span className="text-xs font-black text-blue-700">{ev.time}</span>
              <div>
                <p className="text-sm font-extrabold">{ev.title}</p>
                <p className="text-xs text-text-muted">{ev.scopeLabel}</p>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export function SchoolStudentsPage() {
  const { services, showToast } = useServices();
  const { can } = useAuth();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ name: '', nis: '', classId: 'cls_10_ipa_1' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stList, dash] = await Promise.all([services.school.listStudents(), services.school.getDashboard()]);
      setStudents(stList);
      setClasses(dash.classes || []);
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    try {
      await services.school.addStudent(form);
      setForm({ name: '', nis: '', classId: classes[0]?.id || 'cls_10_ipa_1' });
      showToast('Siswa berhasil ditambahkan ke rombel.');
      await load();
    } catch (err) {
      setFieldErrors(err?.fieldErrors || {});
      showToast(err?.message || 'Gagal menambah siswa.', 'error');
    }
  };

  if (loading) return <LoadingState message="Memuat direktori siswa sekolah..." />;

  const columns = [
    { key: 'nis', label: 'NIS' },
    { key: 'name', label: 'Nama Siswa', render: (r) => <span className="font-extrabold">{r.name}</span> },
    { key: 'avgMastery', label: 'Mastery', align: 'right', render: (r) => `${r.avgMastery}/100` },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={r.status === 'Aktif' ? 'completed' : 'warning'}>{r.status}</Badge> }
  ];

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Manajemen Akademik" title="Daftar Siswa Sekolah" subtitle="Menampilkan siswa sesuai scope institusi dan kelas yang ditugaskan." />
      {can(PERMISSIONS.SCHOOL_MANAGE_STUDENTS) ? (
        <Card>
          <form onSubmit={handleAdd} className="grid gap-3 md:grid-cols-4 items-end">
            <FormField id="stu-name" label="Nama Siswa" required error={fieldErrors.name}>
              <Input id="stu-name" value={form.name} error={fieldErrors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField id="stu-nis" label="NIS" required error={fieldErrors.nis}>
              <Input id="stu-nis" value={form.nis} error={fieldErrors.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} />
            </FormField>
            <FormField id="stu-cls" label="Rombel" error={fieldErrors.classId}>
              <Select id="stu-cls" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormField>
            <Button type="submit">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Tambah Siswa
            </Button>
          </form>
        </Card>
      ) : null}
      <DataTable columns={columns} rows={students} />
    </div>
  );
}

export function SchoolAssessmentsGradingPage() {
  const { services, showToast } = useServices();
  const [submissions, setSubmissions] = useState([]);
  const [scoresMap, setScoresMap] = useState({});
  const [noteMap, setNoteMap] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSubmissions(await services.school.listWorkedSubmissions());
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGrade = async (sub) => {
    const rubScores = {};
    for (const r of sub.rubric) {
      rubScores[r.id] = Number(scoresMap[`${sub.id}:${r.id}`] ?? r.maxPoints);
    }
    await services.school.gradeWorkedSubmission(sub.id, {
      rubricScores: rubScores,
      reviewerNote: noteMap[sub.id] || 'Langkah jelas dan benar.'
    });
    showToast('Nilai rubrik manual berhasil disimpan.');
    await load();
  };

  if (loading) return <LoadingState message="Memuat lembar jawaban uraian siswa..." />;

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Penilaian Guru" title="Asesmen & Grading Rubrik Uraian (Worked Solution)" />
      {submissions.length === 0 ? (
        <EmptyState title="Belum ada jawaban uraian untuk dinilai" />
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <Card key={sub.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-extrabold text-text-muted">{sub.assessmentTitle}</p>
                  <h3 className="font-display text-lg font-black">{sub.studentName}</h3>
                </div>
                <Badge tone={sub.status === 'graded' ? 'completed' : 'warning'}>{sub.status}</Badge>
              </div>
              <div className="rounded-xl bg-surface-muted p-3 text-sm space-y-1">
                <p className="font-bold text-text-muted">Pertanyaan: {sub.questionStem}</p>
                <p className="font-extrabold text-navy-900">Jawaban Siswa: &ldquo;{sub.studentAnswer}&rdquo;</p>
              </div>
              <div className="space-y-2">
                {sub.rubric.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-app-border p-3 text-xs">
                    <span className="font-bold">{r.criterion} (Maks {r.maxPoints} poin)</span>
                    <Input
                      type="number"
                      min={0}
                      max={r.maxPoints}
                      className="!w-24 !min-h-9"
                      value={scoresMap[`${sub.id}:${r.id}`] ?? (sub.awardedScores?.[r.id] ?? r.maxPoints)}
                      onChange={(e) => setScoresMap((m) => ({ ...m, [`${sub.id}:${r.id}`]: Number(e.target.value || 0) }))}
                    />
                  </div>
                ))}
              </div>
              <Textarea
                rows={2}
                placeholder="Catatan umpan balik guru untuk siswa..."
                value={noteMap[sub.id] ?? sub.reviewerNote ?? ''}
                onChange={(e) => setNoteMap((m) => ({ ...m, [sub.id]: e.target.value }))}
              />
              <Button onClick={() => handleGrade(sub)}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Simpan Nilai Rubrik
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function SchoolCounselingPage() {
  const { services, showToast } = useServices();
  const [signals, setSignals] = useState([]);
  const [noteMap, setNoteMap] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSignals(await services.school.listCounselingSignals());
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveNote = async (signalId) => {
    try {
      await services.school.addCounselingNote(signalId, { note: noteMap[signalId] });
      showToast('Catatan tindak lanjut konseling tersimpan dan tercatat di audit log.');
      setNoteMap((m) => ({ ...m, [signalId]: '' }));
      await load();
    } catch (err) {
      showToast(err?.fieldErrors?.note || err?.message, 'error');
    }
  };

  if (loading) return <LoadingState message="Memuat sinyal risiko belajar BK..." />;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Bimbingan Konseling (Teraudit)"
        title="Sinyal Risiko Belajar & Tindak Lanjut"
        subtitle="Akses ke data konseling terbatas hanya untuk peran berwenang dan dicatat ke audit log."
      />
      {signals.length === 0 ? (
        <EmptyState title="Tidak ada sinyal risiko aktif" />
      ) : (
        <div className="space-y-4">
          {signals.map((sig) => (
            <Card key={sig.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="h-5 w-5 text-orange-700" aria-hidden="true" />
                  <h3 className="font-display text-lg font-black">{sig.studentName}</h3>
                </div>
                <Badge tone="warning">Risiko: {sig.riskLevel}</Badge>
              </div>
              <p className="text-sm font-semibold text-text-secondary">{sig.signal}</p>
              {sig.notes.length > 0 ? (
                <div className="rounded-xl bg-surface-muted p-3 space-y-1 text-xs">
                  {sig.notes.map((n) => <p key={n.id}><b>{n.author}:</b> {n.note}</p>)}
                </div>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Catat rencana pendampingan belajar..."
                  value={noteMap[sig.id] || ''}
                  onChange={(e) => setNoteMap((m) => ({ ...m, [sig.id]: e.target.value }))}
                />
                <Button onClick={() => handleSaveNote(sig.id)}>Simpan Catatan</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function ParentPortalPage() {
  const { services } = useServices();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    services.school
      .getParentLinkedChildren()
      .then(setChildren)
      .catch((err) => setError(err?.message || 'Gagal memuat data anak tertaut.'))
      .finally(() => setLoading(false));
  }, [services]);

  if (loading) return <LoadingState message="Memuat portal pantau Orang Tua..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Portal Orang Tua / Wali"
        title="Progres Belajar Anak Tertaut"
        subtitle="Privasi terjaga: Orang Tua hanya dapat melihat data siswa yang resmi tertaut pada akunnya."
      />
      {children.length === 0 ? (
        <EmptyState title="Belum ada anak tertaut" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {children.map((ch) => (
            <Card key={ch.studentId} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge tone="info">{ch.educationLevel}</Badge>
                  <h2 className="mt-1 font-display text-xl font-black">{ch.displayName}</h2>
                </div>
                <Badge tone="completed">Tertaut Resmi</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface-muted p-3">
                  <p className="text-xs text-text-muted font-bold">Total XP</p>
                  <p className="font-display text-xl font-black">{ch.xpBalance} XP</p>
                </div>
                <div className="rounded-xl bg-surface-muted p-3">
                  <p className="text-xs text-text-muted font-bold">Streak</p>
                  <p className="font-display text-xl font-black">{ch.streakDays} hari</p>
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs font-bold">
                  <span>Target Harian</span>
                  <span>{ch.dailyXpEarned}/{ch.dailyXpTarget} XP</span>
                </div>
                <ProgressBar value={ch.dailyXpEarned} max={ch.dailyXpTarget} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function SchoolRolesPage() {
  const { services, showToast } = useServices();
  const [roles, setRoles] = useState([]);
  const [name, setName] = useState('');
  const [perms, setPerms] = useState([PERMISSIONS.SCHOOL_VIEW_DASHBOARD]);

  const load = useCallback(async () => {
    setRoles(await services.school.listCustomRoles());
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await services.school.createCustomRole({ name, permissions: perms });
      setName('');
      showToast('Peran kustom sekolah berhasil dibuat.');
      await load();
    } catch (err) {
      showToast(err?.message || 'Gagal membuat peran.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Tata Kelola Sekolah" title="Peran & Izin Kustom Sekolah" subtitle="Menu dan API mengikuti permission, bukan sekadar nama jabatan." />
      <Card>
        <form onSubmit={handleCreate} className="space-y-3">
          <FormField id="role-name" label="Nama Jabatan Kustom" required>
            <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Wali Kelas XII" />
          </FormField>
          <div className="flex flex-wrap gap-3 text-xs font-bold">
            {[PERMISSIONS.SCHOOL_VIEW_DASHBOARD, PERMISSIONS.SCHOOL_VIEW_REPORTS, PERMISSIONS.SCHOOL_GRADE_ASSESSMENT].map((p) => (
              <label key={p} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={perms.includes(p)}
                  onChange={(e) =>
                    setPerms((prev) => (e.target.checked ? [...prev, p] : prev.filter((x) => x !== p)))
                  }
                />
                <span>{p}</span>
              </label>
            ))}
          </div>
          <Button type="submit">Buat Peran Kustom</Button>
        </form>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {roles.map((r) => (
          <Card key={r.id}>
            <div className="flex items-center gap-2 font-display text-base font-black">
              <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden="true" />
              <span>{r.name}</span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">Izin: {(r.permissions || []).join(', ')}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SchoolDirectorySectionPage({ title, subtitle }) {
  const { services } = useServices();
  const [dash, setDash] = useState(null);

  useEffect(() => {
    services.school.getDashboard().then(setDash).catch(() => {});
  }, [services]);

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={dash?.tenant?.name || 'Portal Akademi'} title={title} subtitle={subtitle} />
      <DataTable
        columns={[
          { key: 'name', label: 'Nama Rombel / Unit', render: (r) => <span className="font-extrabold">{r.name}</span> },
          { key: 'grade', label: 'Tingkat' },
          { key: 'homeroomTeacher', label: 'Penanggung Jawab' },
          { key: 'studentCount', label: 'Jumlah Siswa', align: 'right' }
        ]}
        rows={dash?.classes || []}
      />
    </div>
  );
}
