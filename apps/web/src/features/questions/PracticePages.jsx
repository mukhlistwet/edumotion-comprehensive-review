import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Heart, Lightbulb, Sparkles, XCircle } from 'lucide-react';
import { QUESTION_TYPE_LABELS } from '@edumotion/domain';
import { useServices } from '../../app/ServiceContext.jsx';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormulaBlock,
  LoadingState,
  ProgressBar,
  SectionHeader
} from '../../shared/index.js';
import { QuestionRenderer } from './QuestionRenderer.jsx';

export function ActivityPlayerPage() {
  const { activityId = 'act_alg_intro' } = useParams();
  const { services, showToast } = useServices();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const [hintText, setHintText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await services.learning.getActivityDelivery(activityId);
      setData(res);
      setIndex(0);
      setFeedbacks({});
      setHintText('');
    } catch (err) {
      setError(err?.message || 'Gagal memuat aktivitas.');
    } finally {
      setLoading(false);
    }
  }, [services, activityId]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  if (loading) return <LoadingState message="Memuat aktivitas pembelajaran..." />;
  if (error) return <ErrorState message={error} onRetry={loadActivity} />;
  if (!data || data.questions.length === 0) {
    return <EmptyState title="Aktivitas kosong" description="Belum ada soal pada aktivitas ini." />;
  }

  const questions = data.questions;
  const currentQ = questions[index];
  const currentFeedback = feedbacks[currentQ.questionId];

  const handleRequestHint = async () => {
    try {
      const res = await services.learning.getQuestionHint(currentQ.questionId, 0);
      setHintText(res.hint);
    } catch (err) {
      showToast(err?.message || 'Petunjuk belum tersedia.', 'warning');
    }
  };

  const handleCheckAnswer = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await services.learning.submitPracticeAttempt(activityId, {
        questionId: currentQ.questionId,
        response: answers[currentQ.questionId],
        hintUsed: Boolean(hintText),
        idempotencyKey: `attempt_${activityId}_${currentQ.questionId}`
      });
      setFeedbacks((prev) => ({ ...prev, [currentQ.questionId]: res }));
      if (res.heartsRemaining !== null && res.heartsRemaining !== undefined) {
        setData((prev) => ({
          ...prev,
          activity: { ...prev.activity, hearts: res.heartsRemaining }
        }));
      }
      if (res.xpAwarded > 0) {
        showToast(`+${res.xpAwarded} XP tercatat pada XP Ledger!`);
      }
    } catch (err) {
      showToast(err?.message || 'Gagal memeriksa jawaban.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-brand-700">
            {data.activity.mode === 'challenge' ? 'Mode Tantangan' : 'Mode Latihan'}
          </p>
          <h1 className="font-display text-2xl font-black text-navy-900">{data.activity.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {data.activity.heartsEnabled ? (
            <Badge tone="error">
              <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" aria-hidden="true" />
              {data.activity.hearts} Hearts
            </Badge>
          ) : (
            <Badge tone="info">Tanpa Hearts</Badge>
          )}
          <Button variant="secondary" size="sm" onClick={() => navigate('/student/practice')}>
            Keluar
          </Button>
        </div>
      </div>

      <Card className="space-y-2" padding="p-4">
        <div className="flex justify-between text-xs font-extrabold text-text-secondary">
          <span>Pertanyaan {index + 1} dari {questions.length}</span>
          <span>{Math.round(((index + 1) / questions.length) * 100)}%</span>
        </div>
        <ProgressBar value={index + 1} max={questions.length} label="Progres soal" />
      </Card>

      <Card className="space-y-5" padding="p-5 sm:p-7">
        <QuestionRenderer
          question={currentQ}
          value={answers[currentQ.questionId]}
          disabled={Boolean(currentFeedback)}
          onChange={(val) => setAnswers((prev) => ({ ...prev, [currentQ.questionId]: val }))}
        />

        {hintText ? (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            <p className="font-extrabold">Petunjuk Belajar:</p>
            <p className="mt-1 font-semibold">{hintText}</p>
          </div>
        ) : null}

        {currentFeedback ? (
          <div
            role="status"
            className={`rounded-2xl border p-4 text-sm ${
              currentFeedback.correct
                ? 'border-green-200 bg-success-50 text-navy-900'
                : 'border-red-200 bg-red-50 text-navy-900'
            }`}
          >
            <div className="flex items-center gap-2 font-black">
              {currentFeedback.correct ? (
                <CheckCircle2 className="h-5 w-5 text-success-600" aria-hidden="true" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
              )}
              <span>{currentFeedback.feedback?.message}</span>
            </div>
            {currentFeedback.feedback?.steps?.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-text-secondary">
                {currentFeedback.feedback.steps.map((st, idx) => (
                  <li key={idx}>
                    <FormulaBlock content={st} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-app-border pt-4">
          {currentQ.delivery?.hintAvailable && !currentFeedback ? (
            <Button variant="ghost" size="sm" onClick={handleRequestHint}>
              <Lightbulb className="h-4 w-4 text-orange-500" aria-hidden="true" />
              Lihat Petunjuk
            </Button>
          ) : (
            <span />
          )}

          <div className="flex flex-wrap gap-2">
            {index > 0 ? (
              <Button variant="secondary" onClick={() => { setIndex((i) => i - 1); setHintText(''); }}>
                Sebelumnya
              </Button>
            ) : null}

            {!currentFeedback ? (
              <Button loading={submitting} onClick={handleCheckAnswer}>
                Periksa Jawaban
              </Button>
            ) : index < questions.length - 1 ? (
              <Button onClick={() => { setIndex((i) => i + 1); setHintText(''); }}>
                Soal Berikutnya →
              </Button>
            ) : (
              <Button onClick={() => navigate('/student/mastery')}>
                Selesai & Lihat Mastery →
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export function PracticeHubPage() {
  const { services } = useServices();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setActivities(await services.learning.listActivities());
    } catch (err) {
      setError(err?.message || 'Gagal memuat daftar latihan.');
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Memuat katalog latihan & tantangan..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (activities.length === 0) {
    return <EmptyState title="Belum ada aktivitas latihan" description="Semua aktivitas sedang kosong pada skenario saat ini." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Latihan & Tantangan"
        title="Pilih Sesi Latihan Interaktif"
        subtitle="Setiap aktivitas latihan mencatat bukti penguasaan kompetensi dan memperbarui jadwal Spaced Repetition."
        action={
          <Link to="/student/gallery">
            <Button variant="outline" size="sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Buka Galeri 14 Tipe Soal
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activities.map((act) => (
          <Card key={act.id} className="flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <Badge tone={act.mode === 'challenge' ? 'warning' : 'info'}>{act.type}</Badge>
                <span className="text-xs font-extrabold text-orange-700">+{act.xpReward} XP</span>
              </div>
              <h3 className="mt-2 font-display text-lg font-extrabold text-navy-900">{act.title}</h3>
              <p className="mt-1 text-xs font-semibold text-text-secondary">
                {act.questionIds.length} soal · Estimasi {act.estimatedMinutes} menit ·{' '}
                {act.heartsEnabled ? 'Hearts aktif' : 'Tanpa Hearts'}
              </p>
            </div>
            <Link to={`/student/activities/${act.id}`}>
              <Button className="w-full">Mulai Sesi</Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function InteractiveGalleryPage() {
  const { services } = useServices();
  const [items, setItems] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    services.learning
      .listInteractiveGallery()
      .then((res) => setItems(res))
      .finally(() => setLoading(false));
  }, [services]);

  if (loading) return <LoadingState message="Memuat galeri 14 tipe soal kanonis..." />;
  if (items.length === 0) return <EmptyState title="Galeri belum tersedia" />;

  const active = items[activeIdx];
  const q = active.question;

  const handleGrade = async () => {
    const res = await services.learning.gradeGalleryPreview(q.questionId, answers[q.questionId]);
    setFeedback(res);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Interactive Question Gallery"
        title="14 Pola Soal Kanonis EduMotion"
        subtitle="Uji langsung seluruh tipe interaksi Matematika & Fisika menggunakan Student Delivery DTO tanpa kebocoran kunci jawaban."
      />

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card padding="p-3" className="h-fit">
          <nav aria-label="Pilih tipe soal" className="grid grid-cols-2 gap-1 lg:grid-cols-1">
            {items.map((item, idx) => (
              <button
                key={item.question.questionId}
                type="button"
                onClick={() => {
                  setActiveIdx(idx);
                  setFeedback(null);
                }}
                className={`min-h-11 rounded-xl px-3 py-2 text-left text-xs font-extrabold transition ${
                  idx === activeIdx
                    ? 'bg-navy-900 text-white'
                    : 'text-text-secondary hover:bg-surface-muted'
                }`}
              >
                {String(idx + 1).padStart(2, '0')} · {QUESTION_TYPE_LABELS[item.question.type] || item.question.type}
              </button>
            ))}
          </nav>
        </Card>

        <Card padding="p-5 sm:p-7" className="space-y-5">
          <QuestionRenderer
            question={q}
            value={answers[q.questionId]}
            onChange={(val) => {
              setAnswers((prev) => ({ ...prev, [q.questionId]: val }));
              setFeedback(null);
            }}
          />

          {feedback ? (
            <div
              role="status"
              className={`rounded-2xl border p-4 text-sm ${
                feedback.correct ? 'border-green-200 bg-success-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <p className="font-black">{feedback.correct ? '✓ Tepat!' : 'Belum tepat'}</p>
              <p className="mt-1 font-semibold">{feedback.feedback?.message}</p>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-app-border pt-4">
            <Button variant="secondary" onClick={() => { setAnswers((prev) => ({ ...prev, [q.questionId]: undefined })); setFeedback(null); }}>
              Reset
            </Button>
            <Button onClick={handleGrade}>Cek Jawaban</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
