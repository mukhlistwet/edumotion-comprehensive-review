import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Eye,
  Lock,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useServices } from '../../app/ServiceContext.jsx';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  ProgressBar,
  SectionHeader
} from '../../shared/index.js';
import { JourneyTemplateRenderer } from './renderers/JourneyRenderers.jsx';

export function JourneyExperiencePage() {
  const { journeyId = 'jrn_math_smp_algebra', chapterId = 'ch_alg_01' } = useParams();
  const { services, showToast, accessibility } = useServices();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [empty, setEmpty] = useState(false);
  const [viewModel, setViewModel] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [preferences, setPreferences] = useState({ selectionMode: 'adaptive', pendingTemplateId: null });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [previewTemplateId, setPreviewTemplateId] = useState(null);
  const [advancing, setAdvancing] = useState(false);
  const [completingNode, setCompletingNode] = useState(false);

  const loadJourney = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [mapRes, tplList, prefRes] = await Promise.all([
        services.journey.getChapterMap(journeyId, chapterId, accessibility),
        services.journey.listTemplates(),
        services.journey.getPreferences()
      ]);
      if (mapRes.empty) {
        setEmpty(true);
        setViewModel(null);
      } else {
        setEmpty(false);
        setViewModel(mapRes.viewModel);
        setSelectedNodeId((prev) => {
          const exists = mapRes.viewModel.nodes.some((n) => n.id === prev);
          return exists ? prev : mapRes.viewModel.progress.currentNodeId || mapRes.viewModel.nodes[0]?.id;
        });
      }
      setTemplates(tplList);
      setPreferences(prefRes);
    } catch (err) {
      setError(err?.message || 'Gagal memuat Journey chapter.');
    } finally {
      setLoading(false);
    }
  }, [services, journeyId, chapterId, accessibility]);

  useEffect(() => {
    loadJourney();
  }, [loadJourney]);

  const handleSelectMode = async (mode) => {
    try {
      const updated = await services.journey.updatePreferences({
        selectionMode: mode,
        preferredTemplateId: preferences.preferredTemplateId
      });
      setPreferences(updated);
      showToast(`Mode perjalanan '${mode}' disimpan untuk chapter berikutnya. Snapshot chapter aktif tetap terkunci.`);
    } catch (err) {
      showToast(err?.message || 'Gagal mengubah mode.', 'error');
    }
  };

  const handleChoosePendingTemplate = async (tplId) => {
    try {
      const res = await services.journey.setPendingTemplate({ templateId: tplId });
      setPreferences(res.preferences);
      showToast(res.message);
    } catch (err) {
      showToast(err?.message || 'Template belum terbuka.', 'warning');
    }
  };

  const handleCompleteSelectedNode = async () => {
    if (!selectedNodeId || completingNode) return;
    setCompletingNode(true);
    try {
      const res = await services.journey.completeNode(journeyId, selectedNodeId, {
        idempotencyKey: `ui_complete_${selectedNodeId}`
      });
      showToast(
        res.alreadyCompleted
          ? 'Checkpoint sudah selesai sebelumnya (idempotent, tanpa XP ganda).'
          : `Checkpoint selesai! +${res.xpAwarded} XP (Total: ${res.xpBalance} XP).`
      );
      await loadJourney();
    } catch (err) {
      showToast(err?.message || 'Prasyarat checkpoint belum terpenuhi.', 'error');
    } finally {
      setCompletingNode(false);
    }
  };

  const handleStartNextChapter = async () => {
    setAdvancing(true);
    try {
      const res = await services.journey.startNextChapter(journeyId, {
        currentChapterId: chapterId,
        idempotencyKey: `next_${journeyId}_${chapterId}`
      });
      if (res.snapshot?.fallbackNotice) {
        showToast(res.snapshot.fallbackNotice, 'warning');
      } else {
        showToast(`Chapter baru dimulai dengan template: ${res.snapshot.templateId}`);
      }
      navigate(`/student/journeys/${journeyId}/chapters/${res.chapterId}`);
    } catch (err) {
      showToast(err?.message || 'Selesaikan seluruh checkpoint chapter ini terlebih dahulu.', 'warning');
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) return <LoadingState message="Memuat peta perjalanan belajar..." />;
  if (error) return <ErrorState message={error} onRetry={loadJourney} />;
  if (empty || !viewModel) {
    return (
      <EmptyState
        title="Belum ada chapter aktif"
        description="Pilih mata pelajaran atau mulai jalur belajar dari katalog."
        actionLabel="Lihat Mata Pelajaran"
        onAction={() => navigate('/student/subjects')}
      />
    );
  }

  const selectedNode = viewModel.nodes.find((n) => n.id === selectedNodeId) || viewModel.nodes[0];
  const activeTemplateInfo = templates.find((t) => t.id === viewModel.template.id);
  const allCompleted = viewModel.progress.completedNodes >= viewModel.progress.totalNodes;

  // Build read-only sandbox preview viewModel (never mutates active snapshot)
  const previewViewModel = previewTemplateId
    ? {
        ...viewModel,
        template: {
          ...viewModel.template,
          id: previewTemplateId
        }
      }
    : null;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Journey Experience Engine"
        title={viewModel.chapter.title}
        subtitle="Satu engine progres kanonis dengan 6 adapter presentasi. Pergantian template hanya berlaku pada batas chapter."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={loadJourney}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Muat Ulang (Anti-Reroll)
            </Button>
            {journeyId === 'jrn_math_smp_algebra' && chapterId === 'ch_alg_01' ? (
              <Button
                size="sm"
                loading={advancing}
                disabled={!allCompleted}
                onClick={handleStartNextChapter}
              >
                Chapter Berikutnya
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        }
      />

      {/* Chapter Snapshot Header */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="completed">Template Aktif: {activeTemplateInfo?.name || viewModel.template.id}</Badge>
            <Badge tone="info">Mode Snapshot: {viewModel.template.selectionMode}</Badge>
            {preferences.pendingTemplateId ? (
              <Badge tone="warning">
                Pending Chapter Berikutnya: {templates.find((t) => t.id === preferences.pendingTemplateId)?.name || preferences.pendingTemplateId}
              </Badge>
            ) : null}
          </div>
          <span className="text-sm font-extrabold tabular-nums text-navy-900">
            {viewModel.progress.completedNodes} / {viewModel.progress.totalNodes} Checkpoint
          </span>
        </div>
        <ProgressBar value={viewModel.progress.completedNodes} max={viewModel.progress.totalNodes} label="Progres chapter" />
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <JourneyTemplateRenderer
            viewModel={viewModel}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />

          {/* Template Gallery & Selection Mode */}
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-black">Galeri Gaya Perjalanan (6 Template)</h2>
                <p className="text-xs text-text-secondary">
                  Pratinjau bersifat read-only. Memilih template di tengah chapter menyimpannya sebagai pilihan untuk chapter berikutnya.
                </p>
              </div>
              <Link to="/upgrade" className="text-xs font-extrabold text-blue-700 hover:underline">
                Cara membuka template spesial →
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((tpl) => {
                const isActive = tpl.id === viewModel.template.id;
                const isPending = tpl.id === preferences.pendingTemplateId;
                return (
                  <div
                    key={tpl.id}
                    className={`flex flex-col justify-between rounded-2xl border-2 p-3.5 transition ${
                      isActive
                        ? 'border-brand-500 bg-brand-50/40'
                        : isPending
                          ? 'border-orange-500 bg-orange-50/40'
                          : 'border-app-border bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-black">{tpl.name}</span>
                        {isActive ? (
                          <Badge tone="completed">Aktif</Badge>
                        ) : isPending ? (
                          <Badge tone="warning">Pending</Badge>
                        ) : !tpl.unlocked ? (
                          <Badge tone="locked">Terkunci</Badge>
                        ) : !tpl.eligible ? (
                          <Badge tone="warning">Nonaktif</Badge>
                        ) : (
                          <Badge tone="info">Tersedia</Badge>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-text-secondary">{tpl.description}</p>
                      <p className="mt-2 text-[11px] font-bold text-text-muted">
                        {tpl.base ? 'Template Dasar (Gratis)' : 'Spesial · Achievement atau Premium'}
                      </p>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPreviewTemplateId(tpl.id)}
                        className="flex-1"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        Pratinjau
                      </Button>
                      <Button
                        size="sm"
                        variant={isActive ? 'ghost' : 'primary'}
                        disabled={isActive || !tpl.eligible}
                        onClick={() => handleChoosePendingTemplate(tpl.id)}
                        className="flex-1"
                      >
                        {isActive ? 'Dipakai' : !tpl.eligible ? 'Terkunci' : 'Pilih Next'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-app-border pt-4">
              <div>
                <p className="text-sm font-extrabold text-navy-900">Mode Seleksi Chapter Berikutnya</p>
                <p className="text-xs text-text-secondary">
                  Adaptive memilih otomatis berbasis konteks; Random memilih 1× saat chapter baru dibuat (tidak berubah saat refresh).
                </p>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Pilih mode perjalanan">
                {['adaptive', 'personal', 'random'].map((mode) => {
                  const active = preferences.selectionMode === mode;
                  return (
                    <Button
                      key={mode}
                      size="sm"
                      variant={active ? 'primary' : 'secondary'}
                      onClick={() => handleSelectMode(mode)}
                    >
                      {mode === 'adaptive' ? 'Adaptive' : mode === 'personal' ? 'Personal' : 'Random'}
                    </Button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Side Checkpoint Detail */}
        <aside className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Badge
                tone={
                  selectedNode?.status === 'completed'
                    ? 'completed'
                    : selectedNode?.status === 'locked'
                      ? 'locked'
                      : 'in_progress'
                }
              >
                {selectedNode?.status === 'completed'
                  ? 'Selesai'
                  : selectedNode?.status === 'locked'
                    ? 'Terkunci'
                    : 'Siap Dimainkan'}
              </Badge>
              {selectedNode?.levelMilestoneBadge !== null && selectedNode?.levelMilestoneBadge !== undefined ? (
                <span className="text-xs font-extrabold text-text-muted">
                  Milestone Level {selectedNode.levelMilestoneBadge}
                </span>
              ) : null}
            </div>

            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-text-muted">
                Checkpoint #{selectedNode?.sequence} · {selectedNode?.kind}
              </p>
              <h3 className="mt-1 font-display text-xl font-black text-navy-900">{selectedNode?.title}</h3>
              <p className="mt-1.5 text-sm text-text-secondary">{selectedNode?.description}</p>
            </div>

            <div className="rounded-xl bg-surface-muted p-3 text-xs space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-text-secondary">Hadiah Penyelesaian</span>
                <span className="text-orange-700">+{selectedNode?.rewardPreview?.xp || 50} XP</span>
              </div>
              {selectedNode?.status === 'locked' ? (
                <p className="pt-1 font-bold text-text-secondary">
                  <Lock className="mr-1 inline h-3.5 w-3.5" />
                  Selesaikan checkpoint prasyarat sebelumnya untuk membuka misi ini.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              {selectedNode?.activityIds?.[0] ? (
                <Button
                  className="w-full"
                  disabled={selectedNode?.status === 'locked'}
                  onClick={() => navigate(`/student/activities/${selectedNode.activityIds[0]}`)}
                >
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  {selectedNode?.status === 'completed' ? 'Ulangi Aktivitas' : 'Mulai Aktivitas'}
                </Button>
              ) : null}

              {selectedNode?.status !== 'locked' && selectedNode?.status !== 'completed' ? (
                <Button
                  variant="outline"
                  className="w-full"
                  loading={completingNode}
                  onClick={handleCompleteSelectedNode}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Tandai Checkpoint Selesai (Demo)
                </Button>
              ) : null}
            </div>
          </Card>

          <Card className="bg-navy-900 text-white border-navy-700 space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-yellow-400">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>Aturan Integritas</span>
            </div>
            <p className="text-sm font-bold">Ganti dunia, bukan progres atau nilai akademik.</p>
            <p className="text-xs leading-5 text-slate-300">
              Mastery kompetensi, XP ledger, dan akses ujian tetap terpisah dari pemilihan template visual.
            </p>
          </Card>

          <Card className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-purple-700">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>Pindah Jalur Belajar</span>
            </div>
            <div className="flex flex-col gap-2 text-xs font-extrabold">
              <Link to="/student/journeys/jrn_math_smp_algebra/chapters/ch_alg_01" className="text-blue-700 hover:underline">
                <Compass className="mr-1 inline h-3.5 w-3.5" /> Matematika SMP · Aljabar
              </Link>
              <Link to="/student/journeys/jrn_math_sma_quadratic/chapters/ch_quad_01" className="text-blue-700 hover:underline">
                <Compass className="mr-1 inline h-3.5 w-3.5" /> Matematika SMA · Fungsi Kuadrat
              </Link>
              <Link to="/student/journeys/jrn_phys_sma_mechanics/chapters/ch_phys_01" className="text-blue-700 hover:underline">
                <Compass className="mr-1 inline h-3.5 w-3.5" /> Fisika SMA · Kinematika & Newton
              </Link>
            </div>
          </Card>
        </aside>
      </div>

      {/* Read-only Sandbox Template Preview Modal */}
      <Modal
        open={Boolean(previewTemplateId)}
        onClose={() => setPreviewTemplateId(null)}
        title={`Pratinjau Sandbox: ${templates.find((t) => t.id === previewTemplateId)?.name || ''}`}
        subtitle="Pratinjau bersifat read-only. Tidak mengubah snapshot chapter aktif atau progres."
        maxWidth="max-w-3xl"
        footer={
          <Button variant="secondary" onClick={() => setPreviewTemplateId(null)}>
            Tutup Pratinjau
          </Button>
        }
      >
        {previewViewModel ? (
          <JourneyTemplateRenderer
            viewModel={previewViewModel}
            selectedNodeId={selectedNodeId}
            onSelectNode={() => {}}
          />
        ) : null}
      </Modal>
    </div>
  );
}
