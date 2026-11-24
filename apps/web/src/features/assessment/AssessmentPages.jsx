import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Clock,
  Lock,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { useServices } from '../../app/ServiceContext.jsx';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormulaBlock,
  LoadingState,
  Modal,
  SectionHeader
} from '../../shared/index.js';
import { QuestionRenderer } from '../questions/QuestionRenderer.jsx';

export function AssessmentHubPage() {
  const { services, showToast } = useServices();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingId, setStartingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAssessments(await services.assessment.listAssessments());
    } catch (err) {
      setError(err?.message || 'Gagal memuat daftar asesmen.');
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = async (assessmentId) => {
    setStartingId(assessmentId);
    try {
      const res = await services.assessment.startSession(assessmentId, {
        idempotencyKey: `start_${assessmentId}`
      });
      navigate(`/student/assessments/${assessmentId}/session/${res.session.id}`);
    } catch (err) {
      showToast(err?.message || 'Gagal memulai sesi ujian.', 'error');
    } finally {
      setStartingId(null);
    }
  };

  if (loading) return <LoadingState message="Memuat jadwal Tryout, UTS, dan UAS..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (assessments.length === 0) {
    return <EmptyState title="Belum ada asesmen terjadwal" description="Periksa kembali jadwal ujian dari sekolahmu." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Asesmen & Ujian Formal"
        title="Tryout, UTS, UAS & Placement Test"
        subtitle="Timer otoritatif server, snapshot soal immutable, autosave idempotent, tanpa hearts, dan XP tidak memengaruhi nilai."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {assessments.map((asm) => (
          <Card key={asm.id} className="flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={asm.mode === 'formal_exam' ? 'error' : 'info'}>
                  {asm.mode === 'formal_exam' ? 'Ujian Resmi' : 'Tryout'}
                </Badge>
                <span className="text-xs font-extrabold tabular-nums text-text-muted">
                  {asm.durationMinutes} menit
                </span>
              </div>
              <h3 className="font-display text-lg font-black text-navy-900">{asm.title}</h3>
              <p className="text-xs font-semibold text-text-secondary">{asm.subtitle}</p>
              <div className="rounded-xl bg-surface-muted p-3 text-xs font-semibold text-text-secondary space-y-1">
                <div>{asm.questionIds.length} soal · Snapshot immutable</div>
                <div>{asm.scheduledLabel}</div>
                <div>Kebijakan Hearts: Nonaktif (dilarang di ujian formal)</div>
              </div>
            </div>
            <Button loading={startingId === asm.id} onClick={() => handleStart(asm.id)} className="w-full">
              Mulai / Lanjutkan Ujian
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function FormalExamSessionPage() {
  const { assessmentId, sessionId } = useParams();
  const { services, showToast } = useServices();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [bookmarks, setBookmarks] = useState({});
  const [saveState, setSaveState] = useState('saved'); // saving | saved | error
  const [saveErrorMsg, setSaveErrorMsg] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sess = await services.assessment.getSession(sessionId);
      setSession(sess);
      setRemainingSeconds(sess.remainingSeconds);
      const initAnswers = {};
      const initBm = {};
      Object.entries(sess.responses || {}).forEach(([snapId, obj]) => {
        initAnswers[snapId] = obj.response;
        initBm[snapId] = Boolean(obj.bookmarked);
      });
      setAnswers(initAnswers);
      setBookmarks(initBm);
    } catch (err) {
      setError(err?.message || 'Gagal memuat sesi ujian.');
    } finally {
      setLoading(false);
    }
  }, [services, sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Server-authoritative countdown tick (resynced independently of client clock skew)
  useEffect(() => {
    if (!session || session.status !== 'started') return undefined;
    const id = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [session]);

  const persistResponse = async (snapshotId, responseValue, isBookmarked) => {
    setSaveState('saving');
    setSaveErrorMsg('');
    try {
      await services.assessment.autosaveResponse(sessionId, snapshotId, {
        response: responseValue,
        bookmarked: Boolean(isBookmarked),
        idempotencyKey: `save_${sessionId}_${snapshotId}`
      });
      setSaveState('saved');
    } catch (err) {
      setSaveState('error');
      setSaveErrorMsg(err?.message || 'Gagal menyimpan jawaban otomatis.');
    }
  };

  const handleSubmitExam = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await services.assessment.submitSession(sessionId, {
        idempotencyKey: `submit_${sessionId}`
      });
      setConfirmOpen(false);
      showToast('Ujian berhasil dikumpulkan!');
      navigate(`/student/assessments/${assessmentId}/result/${sessionId}`);
    } catch (err) {
      showToast(err?.message || 'Gagal mengumpulkan ujian. Coba ulangi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Menyiapkan arena ujian formal..." />;
  if (error) return <ErrorState message={error} onRetry={loadSession} />;
  if (!session) return <EmptyState title="Sesi tidak ditemukan" />;

  const snapshots = session.snapshots || [];
  const activeSnap = snapshots[currentIdx];
  const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const secs = String(remainingSeconds % 60).padStart(2, '0');

  return (
    <div className="space-y-5">
      {/* Exam Top Bar */}
      <Card padding="p-4" className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="error">Ujian Formal · Snapshot Immutable</Badge>
            <span className="text-xs font-extrabold text-text-muted">Tanpa Hearts</span>
          </div>
          <h1 className="mt-1 font-display text-xl font-black text-navy-900">{session.title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            aria-label="Sisa waktu ujian otoritatif server"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-50 px-3.5 py-2 text-sm font-black tabular-nums text-orange-700"
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span>{mins}:{secs}</span>
          </div>
          <Button variant="primary" size="sm" onClick={() => setConfirmOpen(true)}>
            Kumpulkan Ujian
          </Button>
        </div>
      </Card>

      {/* Autosave & Server Clock Integrity Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-app-border bg-white px-4 py-2.5 text-xs font-bold">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <span>
            Status Simpan:{' '}
            {saveState === 'saving' ? (
              <span className="text-blue-700">Menyimpan otomatis...</span>
            ) : saveState === 'error' ? (
              <span className="text-red-700">{saveErrorMsg}</span>
            ) : (
              <span className="text-success-600">Tersimpan otomatis (idempotent)</span>
            )}
          </span>
        </div>
        {saveState === 'error' && activeSnap ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => persistResponse(activeSnap.snapshotId, answers[activeSnap.snapshotId], bookmarks[activeSnap.snapshotId])}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Coba Simpan Ulang
          </Button>
        ) : (
          <span className="text-text-muted">
            Waktu server mengendalikan deadline (kebal manipulasi jam perangkat).
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card padding="p-5 sm:p-7" className="space-y-5">
          {activeSnap ? (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-app-border pb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-text-muted">
                  Soal {currentIdx + 1} dari {snapshots.length} · Bobot {activeSnap.points} poin
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextBm = !bookmarks[activeSnap.snapshotId];
                    setBookmarks((prev) => ({ ...prev, [activeSnap.snapshotId]: nextBm }));
                    persistResponse(activeSnap.snapshotId, answers[activeSnap.snapshotId], nextBm);
                  }}
                  aria-label="Tandai soal ragu-ragu"
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-extrabold ${
                    bookmarks[activeSnap.snapshotId]
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-app-border text-text-secondary'
                  }`}
                >
                  <Bookmark className="h-4 w-4" aria-hidden="true" />
                  {bookmarks[activeSnap.snapshotId] ? 'Ditandai' : 'Tandai'}
                </button>
              </div>

              <QuestionRenderer
                question={activeSnap.deliveryDto}
                value={answers[activeSnap.snapshotId]}
                onChange={(val) => {
                  setAnswers((prev) => ({ ...prev, [activeSnap.snapshotId]: val }));
                  persistResponse(activeSnap.snapshotId, val, bookmarks[activeSnap.snapshotId]);
                }}
              />

              <div className="flex justify-between border-t border-app-border pt-4">
                <Button
                  variant="secondary"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => i - 1)}
                >
                  ← Soal Sebelumnya
                </Button>
                {currentIdx < snapshots.length - 1 ? (
                  <Button onClick={() => setCurrentIdx((i) => i + 1)}>
                    Soal Berikutnya →
                  </Button>
                ) : (
                  <Button onClick={() => setConfirmOpen(true)}>Selesai & Kumpulkan</Button>
                )}
              </div>
            </>
          ) : null}
        </Card>

        {/* Navigator Sidebar */}
        <aside className="space-y-4">
          <Card className="space-y-3">
            <h2 className="font-display text-base font-black">Navigasi Nomor Soal</h2>
            <div className="grid grid-cols-5 gap-2">
              {snapshots.map((snap, idx) => {
                const answered = answers[snap.snapshotId] !== undefined && answers[snap.snapshotId] !== '';
                const marked = bookmarks[snap.snapshotId];
                const isActive = idx === currentIdx;
                return (
                  <button
                    key={snap.snapshotId}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    aria-label={`Pindah ke soal ${idx + 1}`}
                    className={`min-h-11 rounded-xl border-2 text-xs font-black transition ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : marked
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : answered
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-app-border bg-white text-text-secondary'
                    }`}
                  >
                    {idx + 1}
                    {marked ? '★' : ''}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] font-semibold text-text-muted">
              Hijau: terjawab · Oranye ★: ditandai · Biru: aktif
            </p>
          </Card>

          <Card className="bg-blue-50 border-blue-100 text-xs font-semibold text-blue-700 space-y-1">
            <p className="font-extrabold">Catatan Integritas Ujian</p>
            <p>Kunci jawaban dan pembahasan tidak dikirim ke perangkat siswa selama ujian berlangsung.</p>
          </Card>
        </aside>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Konfirmasi Pengumpulan Ujian"
        subtitle="Setelah dikumpulkan, seluruh jawaban akan dikunci."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Periksa Lagi</Button>
            <Button loading={submitting} onClick={handleSubmitExam}>Ya, Kumpulkan Sekarang</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-text-secondary">
          <div className="flex items-center gap-2 font-bold text-navy-900">
            <AlertTriangle className="h-5 w-5 text-orange-500" aria-hidden="true" />
            <span>
              Terjawab {snapshots.filter((s) => answers[s.snapshotId] !== undefined && answers[s.snapshotId] !== '').length} dari {snapshots.length} soal.
            </span>
          </div>
          <p>Pengiriman bersifat idempotent. Klik ganda tidak akan menghasilkan pengiriman atau penilaian ganda.</p>
        </div>
      </Modal>
    </div>
  );
}

export function AssessmentResultPage() {
  const { sessionId } = useParams();
  const { services } = useServices();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    services.assessment
      .getResult(sessionId)
      .then(setResult)
      .catch((err) => setError(err?.message || 'Hasil ujian belum tersedia.'))
      .finally(() => setLoading(false));
  }, [services, sessionId]);

  if (loading) return <LoadingState message="Memuat hasil ujian..." />;
  if (error) return <ErrorState message={error} />;
  if (!result) return <EmptyState title="Hasil tidak ditemukan" />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SectionHeader
        eyebrow="Hasil Asesmen Resmi"
        title="Ringkasan Nilai Akademik"
        subtitle="Nilai dihitung murni dari jawaban akademik; XP tidak memengaruhi skor ujian."
        action={
          <Link to="/student/assessments">
            <Button variant="secondary" size="sm">Kembali ke Daftar Asesmen</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-extrabold text-text-muted">Nilai Akademik</p>
          <p className="mt-2 font-display text-3xl font-black tabular-nums text-brand-700">
            {result.academicScore} <span className="text-base text-text-muted">/ {result.maxScore}</span>
          </p>
        </Card>
        <Card>
          <p className="text-xs font-extrabold text-text-muted">Persentase</p>
          <p className="mt-2 font-display text-3xl font-black tabular-nums text-navy-900">
            {result.percentage}%
          </p>
        </Card>
        <Card>
          <p className="text-xs font-extrabold text-text-muted">Status Penilaian</p>
          <div className="mt-2">
            <Badge tone={result.status === 'graded' ? 'completed' : 'warning'}>
              {result.status === 'graded' ? 'Selesai Dinilai' : `${result.pendingManualCount} Menunggu Rubrik Guru`}
            </Badge>
          </div>
        </Card>
      </div>

      {!result.resultsReleased ? (
        <Card className="border-orange-200 bg-orange-50 space-y-2">
          <div className="flex items-center gap-2 font-extrabold text-orange-700">
            <Lock className="h-5 w-5" aria-hidden="true" />
            <span>Pembahasan & Kunci Jawaban Masih Ditahan</span>
          </div>
          <p className="text-sm text-navy-900">
            Sesuai kebijakan rilis asesmen sekolah, rincian kunci dan pembahasan baru dibuka pada:{' '}
            <b>{result.releaseAt}</b>.
          </p>
        </Card>
      ) : (
        <Card className="space-y-4">
          <h2 className="font-display text-lg font-black">Tinjauan Per Soal</h2>
          <div className="space-y-3">
            {result.items.map((item) => (
              <div key={item.snapshotId} className="rounded-xl border border-app-border p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-extrabold">Soal #{item.sequence}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold tabular-nums">
                      {item.earnedPoints} / {item.maxPoints} poin
                    </span>
                    {item.pendingManualReview ? (
                      <Badge tone="warning">Perlu Rubrik Guru</Badge>
                    ) : (
                      <Badge tone={item.correct ? 'completed' : 'error'}>
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {item.correct ? 'Tepat' : 'Perlu Latihan'}
                      </Badge>
                    )}
                  </div>
                </div>
                {item.explanation?.steps?.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-xs font-semibold text-text-secondary">
                    {item.explanation.steps.map((s, idx) => (
                      <li key={idx}>
                        <FormulaBlock content={s} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
