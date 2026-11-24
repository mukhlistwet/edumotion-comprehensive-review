import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  XCircle
} from 'lucide-react';
import { AI_PIPELINE_STAGES, QUESTION_TYPE_LABELS, QUESTION_TYPES } from '@edumotion/domain';
import { useServices } from '../../app/ServiceContext.jsx';
import {
  Badge,
  Button,
  Card,
  FormField,
  FormulaBlock,
  Input,
  LoadingState,
  ProgressBar,
  SectionHeader,
  Select,
  Tabs,
  Textarea
} from '../../shared/index.js';

export function AIQuestionGeneratorPage() {
  const { services, showToast } = useServices();
  const navigate = useNavigate();

  const [taxonomy, setTaxonomy] = useState(null);
  const [runs, setRuns] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('instructions');
  const [simulateFailureMode, setSimulateFailureMode] = useState('normal');
  const [fieldErrors, setFieldErrors] = useState({});

  const [brief, setBrief] = useState({
    curriculumId: 'cur_merdeka',
    curriculumVersionId: 'ver_merdeka_2026',
    gradeLevelId: 'grade_smp_8',
    subjectId: 'subj_math',
    topicId: 'top_algebra_linear',
    competencyIds: ['comp_solve_linear'],
    quantity: 3,
    difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
    questionTypes: ['single_choice'],
    bloomLevel: 'apply',
    locale: 'id-ID',
    contextStyle: 'contextual',
    instructions: 'Buat soal kontekstual dengan langkah penyelesaian jelas dan distraktor berbasis miskonsepsi.',
    budgetCapUsd: 1.0,
    maxRetries: 2
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tax, runList] = await Promise.all([
        services.learning.getTaxonomy(),
        services.aiGenerator.listRuns()
      ]);
      setTaxonomy(tax);
      setRuns(runList);
      setActiveRun((prev) => (prev ? runList.find((r) => r.id === prev.id) || runList[0] : runList[0] || null));
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const distSum =
    Number(brief.difficultyDistribution.easy || 0) +
    Number(brief.difficultyDistribution.medium || 0) +
    Number(brief.difficultyDistribution.hard || 0);

  const generatedPrompt = `You are EduMotion's schema-constrained question authoring agent.
CURRICULUM: ${brief.curriculumId} (${brief.gradeLevelId})
TOPIC: ${brief.topicId} | COMPETENCIES: ${brief.competencyIds.join(', ')}
QUANTITY: ${brief.quantity} | DIFFICULTY: Easy ${brief.difficultyDistribution.easy}%, Medium ${brief.difficultyDistribution.medium}%, Hard ${brief.difficultyDistribution.hard}%
MAX RETRIES: ${brief.maxRetries} | HARD COST CAP: $${brief.budgetCapUsd}
INSTRUCTIONS: ${brief.instructions}
RULES: Output strict JSON conforming to edumotion-question-v1. Never auto-publish. Never emit executable JS/HTML.`;

  const handleStartRun = async () => {
    setFieldErrors({});
    setRunning(true);
    try {
      const created = await services.aiGenerator.createRun({ brief, simulateFailureMode });
      setRuns((prev) => [created, ...prev]);
      setActiveRun(created);
      showToast('Pipeline 9 tahap selesai disimulasikan. Tinjau setiap item sebelum menyimpan ke Question Bank.');
    } catch (err) {
      setFieldErrors(err?.fieldErrors || {});
      showToast(err?.message || 'Gagal menjalankan AI Question Generator.', 'error');
    } finally {
      setRunning(false);
    }
  };

  const handleAcceptItem = async (itemId) => {
    try {
      const res = await services.aiGenerator.acceptItemToDraft(itemId);
      showToast(`Item diterima sebagai DRAFT (${res.draftQuestion.metadata?.code}) — belum dipublikasikan.`);
      await loadData();
    } catch (err) {
      showToast(err?.message || 'Item tidak memenuhi syarat penerimaan.', 'error');
    }
  };

  const handleBulkAccept = async () => {
    if (!activeRun) return;
    const eligible = activeRun.items.filter((it) => it.status === 'needs_review' && it.validationReport?.passed);
    if (eligible.length === 0) {
      showToast('Tidak ada item valid yang siap diterima secara massal.', 'warning');
      return;
    }
    for (const it of eligible) {
      await services.aiGenerator.acceptItemToDraft(it.id);
    }
    showToast(`${eligible.length} item valid dipromosikan menjadi Draft di Question Bank.`);
    await loadData();
  };

  const handleRejectItem = async (itemId) => {
    await services.aiGenerator.rejectItem(itemId, 'Ditolak oleh penulis pada human review');
    showToast('Item ditolak.');
    await loadData();
  };

  const handleRetryItem = async (itemId) => {
    try {
      await services.aiGenerator.retryItem(itemId);
      showToast('Item berhasil dijalankan ulang dalam batas maxRetries.');
      await loadData();
    } catch (err) {
      showToast(err?.message || 'Batas retry tercapai.', 'error');
    }
  };

  const handleCancelRun = async () => {
    if (!activeRun) return;
    const cancelled = await services.aiGenerator.cancelRun(activeRun.id);
    setActiveRun(cancelled);
    showToast('Run dibatalkan dengan aman. Jejak audit tetap tersimpan.');
  };

  if (loading) return <LoadingState message="Memuat AI Question Studio..." />;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="AI Question Generator (Simulasi Pipeline)"
        title="Buat Draf Soal Terstruktur dengan AI"
        subtitle="Non-negotiable: Output AI wajib validasi schema + verifier deterministik dan selalu menjadi DRAFT (tidak boleh auto-publish)."
        action={
          <Button loading={running} onClick={handleStartRun}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Jalankan Generator
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* Brief Configuration */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-black">1. Generation Brief (Taksonomi Terikat)</h2>
              <Badge tone="ai">Schema-First · v1</Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField id="ai-curr" label="Kurikulum" error={fieldErrors.curriculumId}>
                <Select
                  id="ai-curr"
                  value={brief.curriculumId}
                  onChange={(e) => setBrief({ ...brief, curriculumId: e.target.value })}
                >
                  {(taxonomy?.curricula || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </FormField>
              <FormField id="ai-grade" label="Jenjang & Kelas" error={fieldErrors.gradeLevelId}>
                <Select
                  id="ai-grade"
                  value={brief.gradeLevelId}
                  onChange={(e) => setBrief({ ...brief, gradeLevelId: e.target.value })}
                >
                  {(taxonomy?.gradeLevels || []).map((g) => <option key={g.id} value={g.id}>{g.displayName}</option>)}
                </Select>
              </FormField>
              <FormField id="ai-subj" label="Mata Pelajaran">
                <Select
                  id="ai-subj"
                  value={brief.subjectId}
                  onChange={(e) => setBrief({ ...brief, subjectId: e.target.value })}
                >
                  {(taxonomy?.subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </FormField>
              <FormField id="ai-comp" label="Kompetensi Target" error={fieldErrors.competencyIds}>
                <Select
                  id="ai-comp"
                  value={brief.competencyIds[0] || ''}
                  onChange={(e) => setBrief({ ...brief, competencyIds: e.target.value ? [e.target.value] : [] })}
                >
                  {(taxonomy?.competencies || []).map((c) => <option key={c.id} value={c.id}>{c.code} · {c.description}</option>)}
                </Select>
              </FormField>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <FormField id="ai-qty" label="Jumlah Soal (1–50)" error={fieldErrors.quantity}>
                <Input
                  id="ai-qty"
                  type="number"
                  min={1}
                  max={50}
                  error={fieldErrors.quantity}
                  value={brief.quantity}
                  onChange={(e) => setBrief({ ...brief, quantity: Number(e.target.value || 1) })}
                />
              </FormField>
              <FormField id="ai-qtype" label="Tipe Soal">
                <Select
                  id="ai-qtype"
                  value={brief.questionTypes[0]}
                  onChange={(e) => setBrief({ ...brief, questionTypes: [e.target.value] })}
                >
                  {QUESTION_TYPES.map((t) => <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>)}
                </Select>
              </FormField>
              <FormField id="ai-bloom" label="Level Bloom">
                <Select id="ai-bloom" value={brief.bloomLevel} onChange={(e) => setBrief({ ...brief, bloomLevel: e.target.value })}>
                  <option value="understand">C2 Understand</option>
                  <option value="apply">C3 Apply</option>
                  <option value="analyze">C4 Analyze</option>
                  <option value="evaluate">C5 Evaluate</option>
                </Select>
              </FormField>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold">Distribusi Difficulty (Wajib = 100%)</span>
                <Badge tone={distSum === 100 ? 'completed' : 'error'}>Total: {distSum}%</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <FormField id="ai-easy" label="Easy (%)">
                  <Input
                    id="ai-easy"
                    type="number"
                    value={brief.difficultyDistribution.easy}
                    onChange={(e) =>
                      setBrief({
                        ...brief,
                        difficultyDistribution: { ...brief.difficultyDistribution, easy: Number(e.target.value || 0) }
                      })
                    }
                  />
                </FormField>
                <FormField id="ai-med" label="Medium (%)">
                  <Input
                    id="ai-med"
                    type="number"
                    value={brief.difficultyDistribution.medium}
                    onChange={(e) =>
                      setBrief({
                        ...brief,
                        difficultyDistribution: { ...brief.difficultyDistribution, medium: Number(e.target.value || 0) }
                      })
                    }
                  />
                </FormField>
                <FormField id="ai-hard" label="Hard (%)">
                  <Input
                    id="ai-hard"
                    type="number"
                    value={brief.difficultyDistribution.hard}
                    onChange={(e) =>
                      setBrief({
                        ...brief,
                        difficultyDistribution: { ...brief.difficultyDistribution, hard: Number(e.target.value || 0) }
                      })
                    }
                  />
                </FormField>
              </div>
              {fieldErrors.difficultyDistribution ? (
                <p role="alert" className="text-xs font-bold text-red-700">{fieldErrors.difficultyDistribution}</p>
              ) : null}
            </div>
          </Card>

          {/* Policy & Prompt Tabs */}
          <Card padding="p-0" className="overflow-hidden">
            <Tabs
              activeId={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: 'instructions', label: 'Instruksi' },
                { id: 'quality', label: 'Aturan Kualitas & Budget' },
                { id: 'simulator', label: 'Simulator Uji Keamanan' },
                { id: 'prompt', label: 'Pratinjau Prompt' }
              ]}
            />
            <div className="p-5 space-y-4">
              {activeTab === 'instructions' ? (
                <FormField id="ai-instr" label="Instruksi Tambahan ke Agent">
                  <Textarea
                    id="ai-instr"
                    rows={3}
                    value={brief.instructions}
                    onChange={(e) => setBrief({ ...brief, instructions: e.target.value })}
                  />
                </FormField>
              ) : null}

              {activeTab === 'quality' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField id="ai-budget" label="Hard Budget Cap per Run (USD)" error={fieldErrors.budgetCapUsd}>
                    <Input
                      id="ai-budget"
                      type="number"
                      step="0.05"
                      value={brief.budgetCapUsd}
                      onChange={(e) => setBrief({ ...brief, budgetCapUsd: Number(e.target.value || 0) })}
                    />
                  </FormField>
                  <FormField id="ai-retries" label="Maksimal Percobaan Perbaikan (Max Retries)">
                    <Input
                      id="ai-retries"
                      type="number"
                      min={0}
                      max={5}
                      value={brief.maxRetries}
                      onChange={(e) => setBrief({ ...brief, maxRetries: Number(e.target.value || 0) })}
                    />
                  </FormField>
                </div>
              ) : null}

              {activeTab === 'simulator' ? (
                <FormField
                  id="ai-sim-mode"
                  label="Skenario Simulasi Pipeline & Keamanan (QA AIQ-001 s.d. AIQ-010)"
                  helperText="Uji penolakan JSON rusak, salah hitung, taksonomi fiktif, injeksi kode eksekusi, atau batas biaya."
                >
                  <Select
                    id="ai-sim-mode"
                    value={simulateFailureMode}
                    onChange={(e) => setSimulateFailureMode(e.target.value)}
                  >
                    <option value="normal">Normal (Valid Schema & Verifier)</option>
                    <option value="malformed_json">Uji AIQ-002: Output JSON Rusak (Malformed JSON)</option>
                    <option value="wrong_calculation">Uji AIQ-003: Kalkulasi Matematika Salah</option>
                    <option value="unknown_taxonomy">Uji AIQ-004: Referensi Kompetensi Fiktif</option>
                    <option value="executable_code">Uji AIQ-005: Sisipan Kode Berbahaya (&lt;script&gt;)</option>
                    <option value="cost_cap">Uji AIQ-009: Batas Anggaran Biaya Terlampaui</option>
                  </Select>
                </FormField>
              ) : null}

              {activeTab === 'prompt' ? (
                <pre className="max-h-64 overflow-auto rounded-xl bg-navy-900 p-4 text-xs font-semibold text-brand-100 whitespace-pre-wrap">
                  {generatedPrompt}
                </pre>
              ) : null}
            </div>
          </Card>

          {/* Active Run Output & Review Queue */}
          {activeRun ? (
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-black">Hasil Run: {activeRun.id}</h2>
                  <p className="text-xs font-semibold text-text-secondary">
                    Status: <b>{activeRun.status}</b> · Estimasi Biaya: ${activeRun.actualCostUsd} / Cap ${activeRun.budgetCapUsd}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={handleCancelRun}>
                    Batalkan Run
                  </Button>
                  <Button size="sm" onClick={handleBulkAccept}>
                    <FileCheck className="h-4 w-4" aria-hidden="true" />
                    Terima Item Valid sebagai Draft
                  </Button>
                </div>
              </div>

              <ProgressBar value={activeRun.progressPct} max={100} label="Progres pipeline" />

              <div className="space-y-3">
                {activeRun.items.map((item) => {
                  const passed = item.validationReport?.passed;
                  return (
                    <div key={item.id} className="rounded-2xl border border-app-border bg-surface-muted p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={passed ? 'completed' : 'error'}>
                            {passed ? 'Lolos Verifier' : 'Ditolak Verifier'}
                          </Badge>
                          <Badge tone="info">Status: {item.status}</Badge>
                          <span className="text-xs font-bold text-text-muted">
                            Retry: {item.attemptCount}/{activeRun.maxRetries} · Quality: {item.validationReport?.qualityScore}/100
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-text-muted">{item.generation?.modelId}</span>
                      </div>

                      {item.question ? (
                        <div className="rounded-xl bg-white p-3.5 space-y-2">
                          <p className="font-extrabold text-navy-900">
                            <FormulaBlock content={item.question.content?.stem || ''} />
                          </p>
                          <p className="text-xs font-semibold text-text-secondary">
                            Kunci (Author View): {JSON.stringify(item.question.answerSpec)}
                          </p>
                        </div>
                      ) : null}

                      {(item.validationReport?.findings || []).length > 0 ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-1 text-xs font-bold text-red-700">
                          {item.validationReport.findings.map((f, idx) => (
                            <p key={idx} className="flex items-start gap-1.5">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span>[{f.code}] {f.message}</span>
                            </p>
                          ))}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        {item.status === 'needs_review' && passed ? (
                          <Button size="sm" onClick={() => handleAcceptItem(item.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Terima ke Draft Bank Soal
                          </Button>
                        ) : null}
                        {item.status === 'failed' ? (
                          <Button size="sm" variant="secondary" onClick={() => handleRetryItem(item.id)}>
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                            Uji Retry
                          </Button>
                        ) : null}
                        {item.status !== 'rejected' && item.status !== 'accepted' ? (
                          <Button size="sm" variant="ghost" onClick={() => handleRejectItem(item.id)}>
                            <XCircle className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
                            Tolak
                          </Button>
                        ) : null}
                        {item.status === 'accepted' ? (
                          <Button size="sm" variant="outline" onClick={() => navigate('/studio/questions')}>
                            Lihat Draft di Bank Soal →
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </div>

        {/* Right Rail: 9-Stage Pipeline & Audit Trail */}
        <aside className="space-y-4">
          <Card className="space-y-3">
            <h2 className="font-display text-base font-black">Pipeline 9 Tahap Kanonis</h2>
            <ol className="space-y-2 text-xs">
              {AI_PIPELINE_STAGES.map((st, idx) => (
                <li key={st.id} className="flex items-center gap-2.5 rounded-xl bg-surface-muted px-3 py-2 font-bold">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-purple-100 text-[11px] font-black text-purple-700">
                    {idx + 1}
                  </span>
                  <span>{st.label}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="border-purple-200 bg-purple-50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-purple-700">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              <span>Jaminan Keamanan</span>
            </div>
            <p className="text-xs leading-5 text-navy-900">
              Tidak ada eksekusi kode hasil model. Terima item selalu menghasilkan status <b>draft</b> dan mewajibkan review manusia sebelum publikasi.
            </p>
          </Card>

          <Card className="space-y-2">
            <h3 className="font-display text-sm font-black">Riwayat & Audit Trail Run</h3>
            <div className="space-y-2">
              {runs.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveRun(r)}
                  className={`w-full rounded-xl border p-2.5 text-left text-xs ${
                    activeRun?.id === r.id ? 'border-brand-500 bg-brand-50/40' : 'border-app-border'
                  }`}
                >
                  <p className="font-extrabold text-navy-900">{r.id}</p>
                  <p className="text-text-muted">{r.status} · {r.items.length} item</p>
                </button>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
