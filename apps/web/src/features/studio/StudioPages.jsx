import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Archive,
  CheckCircle2,
  ClipboardCheck,
  CopyPlus,
  Edit3,
  FilePlus2,
  Search,
  Send,
  Sparkles
} from 'lucide-react';
import { PERMISSIONS, QUESTION_TYPE_LABELS, QUESTION_TYPES } from '@edumotion/domain';
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
  Modal,
  SectionHeader,
  Select,
  StatCard,
  Textarea
} from '../../shared/index.js';
import { QuestionRenderer } from '../questions/QuestionRenderer.jsx';

const STATUS_BADGE_TONE = {
  draft: 'info',
  validation_failed: 'error',
  in_review: 'warning',
  approved: 'mastered',
  published: 'completed',
  archived: 'locked'
};

export function StudioOverviewPage() {
  const { services } = useServices();
  const { can } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    services.question
      .list({ page: 1, pageSize: 50 })
      .then((res) => setQuestions(res.items || []))
      .finally(() => setLoading(false));
  }, [services]);

  if (loading) return <LoadingState message="Memuat ringkasan Content Studio..." />;

  const counts = {
    total: questions.length,
    published: questions.filter((q) => q.governance?.status === 'published').length,
    inReview: questions.filter((q) => q.governance?.status === 'in_review').length,
    approved: questions.filter((q) => q.governance?.status === 'approved').length
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Content Studio"
        title="Pusat Penulisan & Tata Kelola Soal"
        subtitle="Gunakan satu Question Authoring Schema kanonis untuk Manual Builder dan AI Generator."
        action={
          <div className="flex flex-wrap gap-2">
            {can(PERMISSIONS.QUESTION_CREATE_DRAFT) ? (
              <Link to="/studio/questions/new">
                <Button size="sm">
                  <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                  Buat Soal Manual
                </Button>
              </Link>
            ) : null}
            {can(PERMISSIONS.AI_GENERATE) ? (
              <Link to="/studio/ai-generator">
                <Button size="sm" variant="secondary">
                  <Sparkles className="h-4 w-4 text-purple-700" aria-hidden="true" />
                  AI Question Generator
                </Button>
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total Soal Terlihat" value={counts.total} />
        <StatCard label="Terbit (Published)" value={counts.published} iconTone="bg-brand-50 text-brand-700" />
        <StatCard label="Menunggu Review" value={counts.inReview} iconTone="bg-orange-50 text-orange-700" />
        <StatCard label="Siap Terbit (Approved)" value={counts.approved} iconTone="bg-purple-50 text-purple-700" />
      </div>

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-black">Alur Penerbitan Aman</h2>
        <p className="text-sm text-text-secondary">
          1. Penulis menyusun draf → 2. Validasi schema & aturan tipe soal → 3. Pengajuan review SME → 4. Publisher menerbitkan versi immutable. Mengedit soal yang sudah terbit otomatis membuat versi baru.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/studio/questions"><Button variant="secondary" size="sm">Buka Bank Soal</Button></Link>
          <Link to="/studio/reviews"><Button variant="outline" size="sm">Lihat Antrean Review</Button></Link>
        </div>
      </Card>
    </div>
  );
}

export function QuestionBankPage() {
  const { services, showToast } = useServices();
  const { can } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [filters, setFilters] = useState({ search: '', type: 'all', status: 'all', subjectId: 'all', page: 1, pageSize: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewDto, setPreviewDto] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await services.question.list(filters);
      setRows(res.items || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, totalItems: 0 });
    } catch (err) {
      setError(err?.message || 'Gagal memuat bank soal.');
    } finally {
      setLoading(false);
    }
  }, [services, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleNewVersion = async (qId) => {
    try {
      const res = await services.question.createNewVersion(qId);
      showToast(`Versi v${res.question.version} dibuat sebagai draf baru. Versi lama tetap immutable.`);
      navigate(`/studio/questions/${res.question.id}/edit`);
    } catch (err) {
      showToast(err?.message || 'Gagal membuat versi baru.', 'error');
    }
  };

  const handleArchive = async (qId) => {
    try {
      await services.question.archiveQuestion(qId);
      showToast('Soal diarsipkan.');
      await load();
    } catch (err) {
      showToast(err?.message || 'Gagal mengarsipkan soal.', 'error');
    }
  };

  const handlePreview = async (q) => {
    try {
      const dto = await services.question.previewAsStudent(q, 'practice');
      setPreviewDto(dto);
    } catch (err) {
      showToast(err?.message || 'Gagal membuka pratinjau.', 'error');
    }
  };

  const columns = [
    {
      key: 'code',
      label: 'Kode & Judul',
      render: (q) => (
        <div>
          <p className="text-xs font-black text-text-muted">{q.metadata?.code || q.id.slice(0, 8)} · v{q.version}</p>
          <p className="font-extrabold text-navy-900">{q.metadata?.title || q.content?.stem?.slice(0, 48)}</p>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Tipe Soal',
      render: (q) => <Badge tone="info">{QUESTION_TYPE_LABELS[q.type] || q.type}</Badge>
    },
    {
      key: 'status',
      label: 'Status',
      render: (q) => (
        <Badge tone={STATUS_BADGE_TONE[q.governance?.status] || 'neutral'}>
          {q.governance?.status || 'draft'}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      render: (q) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => handlePreview(q)}>Pratinjau</Button>
          {q.governance?.status !== 'published' && can(PERMISSIONS.QUESTION_EDIT_DRAFT) ? (
            <Button size="sm" variant="secondary" onClick={() => navigate(`/studio/questions/${q.id}/edit`)}>
              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Button>
          ) : null}
          {q.governance?.status === 'published' && can(PERMISSIONS.QUESTION_CREATE_DRAFT) ? (
            <Button size="sm" variant="outline" onClick={() => handleNewVersion(q.id)}>
              <CopyPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Versi Baru
            </Button>
          ) : null}
          {q.governance?.status !== 'archived' && can(PERMISSIONS.QUESTION_ARCHIVE) ? (
            <Button size="sm" variant="ghost" onClick={() => handleArchive(q.id)} aria-label={`Arsipkan ${q.metadata?.code || q.id}`}>
              <Archive className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Bank Soal Terisolasi Tenant"
        title="Daftar Soal & Riwayat Versi"
        subtitle="Menampilkan soal tenant aktif serta bank soal global yang sudah diterbitkan."
        action={
          can(PERMISSIONS.QUESTION_CREATE_DRAFT) ? (
            <Link to="/studio/questions/new">
              <Button size="sm">
                <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                Buat Soal Baru
              </Button>
            </Link>
          ) : null
        }
      />

      <Card className="grid gap-3 md:grid-cols-4" padding="p-4">
        <FormField id="qb-search" label="Cari Soal">
          <div className="relative">
            <Input
              id="qb-search"
              placeholder="Kode atau teks soal..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
            />
            <Search className="pointer-events-none absolute top-3.5 right-3 h-4 w-4 text-text-muted" aria-hidden="true" />
          </div>
        </FormField>
        <FormField id="qb-type" label="Tipe Kanonis">
          <Select id="qb-type" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, page: 1 }))}>
            <option value="all">Semua Tipe (14)</option>
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>
            ))}
          </Select>
        </FormField>
        <FormField id="qb-status" label="Status Siklus">
          <Select id="qb-status" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}>
            <option value="all">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="validation_failed">Validation Failed</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
        </FormField>
        <FormField id="qb-subj" label="Mata Pelajaran">
          <Select id="qb-subj" value={filters.subjectId} onChange={(e) => setFilters((f) => ({ ...f, subjectId: e.target.value, page: 1 }))}>
            <option value="all">Semua Mapel</option>
            <option value="subj_math">Matematika</option>
            <option value="subj_phys">Fisika</option>
          </Select>
        </FormField>
      </Card>

      {loading ? (
        <LoadingState message="Memuat daftar soal..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState title="Tidak ada soal ditemukan" description="Ubah filter pencarian atau buat soal baru." />
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
            <span>Menampilkan {rows.length} dari {pagination.totalItems} soal</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >
                Sebelumnya
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={Boolean(previewDto)}
        onClose={() => setPreviewDto(null)}
        title="Pratinjau Tampilan Siswa (Sanitized DTO)"
        subtitle="Payload jawaban benar dan catatan reviewer tidak pernah dikirim ke tampilan siswa."
        maxWidth="max-w-2xl"
        footer={<Button variant="secondary" onClick={() => setPreviewDto(null)}>Tutup</Button>}
      >
        {previewDto ? <QuestionRenderer question={previewDto} value={null} onChange={() => {}} /> : null}
      </Modal>
    </div>
  );
}

export function ReviewQueuePage() {
  const { services, showToast } = useServices();
  const { can } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentMap, setCommentMap] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await services.question.list({ page: 1, pageSize: 50 });
      setQuestions((res.items || []).filter((q) => ['in_review', 'approved', 'draft'].includes(q.governance?.status)));
    } catch (err) {
      setError(err?.message || 'Gagal memuat antrean review.');
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmitDraft = async (qId) => {
    try {
      await services.question.submitForReview(qId);
      showToast('Draf diajukan ke antrean review SME.');
      await load();
    } catch (err) {
      showToast(err?.message || 'Gagal mengajukan review.', 'error');
    }
  };

  const handleReviewDecision = async (qId, decision) => {
    try {
      await services.question.reviewQuestion(qId, {
        decision,
        comment: commentMap[qId] || (decision === 'approve' ? 'Disetujui SME.' : 'Perlu perbaikan.')
      });
      showToast(decision === 'approve' ? 'Soal disetujui (Approved).' : 'Dikembalikan ke penulis untuk revisi.');
      await load();
    } catch (err) {
      showToast(err?.message || 'Gagal memproses keputusan review.', 'error');
    }
  };

  const handlePublish = async (qId) => {
    try {
      const res = await services.question.publishQuestion(qId, { idempotencyKey: `pub_${qId}` });
      showToast(res.idempotentReplay ? 'Soal sudah terbit sebelumnya (idempotent).' : 'Soal resmi dipublikasikan ke Question Bank!');
      await load();
    } catch (err) {
      showToast(err?.message || 'Gagal mempublikasikan soal.', 'error');
    }
  };

  if (loading) return <LoadingState message="Memuat antrean review & publikasi..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Review & Governance"
        title="Antrean Review SME & Publikasi"
        subtitle="Penulis mengajukan draf → Reviewer menyetujui / meminta revisi → Publisher menerbitkan versi immutable."
      />

      {questions.length === 0 ? (
        <EmptyState title="Antrean review kosong" description="Semua soal telah diproses." />
      ) : (
        <div className="space-y-4">
          {questions.map((q) => {
            const st = q.governance?.status;
            return (
              <Card key={q.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-text-muted">{q.metadata?.code || q.id} · v{q.version}</span>
                    <h3 className="font-display text-lg font-black text-navy-900">{q.metadata?.title || q.content?.stem}</h3>
                  </div>
                  <Badge tone={STATUS_BADGE_TONE[st] || 'neutral'}>{st}</Badge>
                </div>

                <p className="text-sm text-text-secondary">{q.content?.stem}</p>

                {st === 'in_review' && can(PERMISSIONS.QUESTION_REVIEW) ? (
                  <div className="space-y-2 border-t border-app-border pt-3">
                    <Textarea
                      rows={2}
                      placeholder="Catatan penelaah (SME)..."
                      value={commentMap[q.id] || ''}
                      onChange={(e) => setCommentMap((m) => ({ ...m, [q.id]: e.target.value }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => handleReviewDecision(q.id, 'approve')}>
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Setujui (Approve)
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleReviewDecision(q.id, 'request_changes')}>
                        Minta Revisi
                      </Button>
                    </div>
                  </div>
                ) : null}

                {st === 'draft' && can(PERMISSIONS.QUESTION_EDIT_DRAFT) ? (
                  <div className="border-t border-app-border pt-3">
                    <Button size="sm" variant="outline" onClick={() => handleSubmitDraft(q.id)}>
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      Ajukan ke Review
                    </Button>
                  </div>
                ) : null}

                {st === 'approved' && can(PERMISSIONS.QUESTION_PUBLISH) ? (
                  <div className="border-t border-app-border pt-3">
                    <Button size="sm" onClick={() => handlePublish(q.id)}>
                      <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                      Publikasikan Versi Immutable
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
