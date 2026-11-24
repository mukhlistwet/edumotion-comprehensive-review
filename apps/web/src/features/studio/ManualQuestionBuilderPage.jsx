import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Monitor,
  Plus,
  Send,
  Smartphone,
  Trash2,
  Upload
} from 'lucide-react';
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  normalizeLegacyQuestionInput,
  toStudentDeliveryDto,
  validateQuestionAuthoring
} from '@edumotion/domain';
import { useServices } from '../../app/ServiceContext.jsx';
import {
  Badge,
  Button,
  Card,
  FormField,
  FormulaBlock,
  Input,
  LoadingState,
  SectionHeader,
  Select,
  Tabs,
  Textarea
} from '../../shared/index.js';
import { QuestionRenderer } from '../questions/QuestionRenderer.jsx';

function buildEmptyTemplateForType(type, prevQuestion) {
  const base = prevQuestion || {
    schemaVersion: 'edumotion-question-v1',
    id: '55555555-5555-4555-8555-000000000099',
    version: 1,
    type,
    metadata: {
      code: 'MAT-NEW-001',
      title: 'Soal Baru',
      curriculumId: 'cur_merdeka',
      curriculumVersionId: 'ver_merdeka_2026',
      gradeLevelId: 'grade_smp_8',
      subjectId: 'subj_math',
      topicId: 'top_algebra_linear',
      competencyIds: ['comp_solve_linear'],
      difficulty: 'medium',
      bloomLevel: 'apply',
      locale: 'id-ID',
      estimatedSeconds: 60
    },
    content: {
      stem: 'Tentukan nilai x dari persamaan \\(2x + 6 = 14\\).',
      instruction: 'Ikuti instruksi soal dengan teliti.',
      media: []
    },
    scoring: { method: 'exact_match', maxPoints: 10 },
    explanation: {
      steps: ['Sederhanakan kedua ruas persamaan secara bertahap.'],
      hints: ['Gunakan operasi invers secara konsisten.'],
      correctFeedback: 'Tepat!',
      incorrectFeedback: 'Coba periksa kembali langkah penyelesaianmu.'
    },
    delivery: {
      allowedModes: ['practice', 'challenge'],
      hintPolicy: 'progressive',
      feedbackPolicy: 'immediate',
      visibility: 'institution'
    },
    accessibility: { altText: '', transcript: '', keyboardAlternative: 'Mendukung navigasi keyboard' },
    governance: { status: 'draft' }
  };

  if (type === 'single_choice' || type === 'multiple_select') {
    return {
      ...base,
      type,
      interaction: {
        options: [
          { id: 'opt_a', label: '2' },
          { id: 'opt_b', label: '4' },
          { id: 'opt_c', label: '6' },
          { id: 'opt_d', label: '8' }
        ]
      },
      answerSpec: { correctOptionIds: ['opt_b'] }
    };
  }
  if (type === 'true_false') {
    return { ...base, type, interaction: { trueLabel: 'Benar', falseLabel: 'Salah' }, answerSpec: { correctAnswer: true } };
  }
  if (type === 'numeric') {
    return { ...base, type, interaction: { unit: 'm/s', decimalRule: '±0.01' }, answerSpec: { expectedValue: 4, tolerance: 0.01 } };
  }
  if (type === 'short_text') {
    return { ...base, type, interaction: { placeholder: 'Tulis jawaban...' }, answerSpec: { acceptedAnswers: ['konstanta'] } };
  }
  if (type === 'fill_blank') {
    return {
      ...base,
      type,
      interaction: {
        templateText: 'Jika x = 3, maka 2x + 1 = [blank_1].',
        blanks: [{ id: 'blank_1', label: 'Slot 1' }]
      },
      answerSpec: { blanks: { blank_1: ['7'] } }
    };
  }
  if (type === 'matching') {
    return {
      ...base,
      type,
      interaction: {
        leftItems: [{ id: 'l1', label: 'Gaya' }, { id: 'l2', label: 'Energi' }],
        rightItems: [{ id: 'r1', label: 'Newton' }, { id: 'r2', label: 'Joule' }]
      },
      answerSpec: { correctPairs: { l1: 'r1', l2: 'r2' } }
    };
  }
  if (type === 'ordering') {
    return {
      ...base,
      type,
      interaction: {
        items: [{ id: 's1', label: 'Langkah 1' }, { id: 's2', label: 'Langkah 2' }]
      },
      answerSpec: { correctOrder: ['s1', 's2'] }
    };
  }
  if (type === 'drag_drop') {
    return {
      ...base,
      type,
      interaction: {
        draggableItems: [{ id: 'd1', label: '4' }, { id: 'd2', label: 'x' }],
        dropZones: [{ id: 'z1', label: 'Koefisien' }, { id: 'z2', label: 'Variabel' }]
      },
      answerSpec: { correctPlacements: { d1: 'z1', d2: 'z2' } }
    };
  }
  if (type === 'graph_plot') {
    return {
      ...base,
      type,
      interaction: { bounds: { minX: -5, maxX: 5, minY: -5, maxY: 5 } },
      answerSpec: { targetPoints: [{ x: 2, y: 3 }], tolerance: 0.4 }
    };
  }
  if (type === 'formula_input') {
    return {
      ...base,
      type,
      interaction: { expressionDisplay: '2(x+3)-x', variables: ['x'] },
      answerSpec: { acceptedExpressions: ['x+6', '6+x'] }
    };
  }
  if (type === 'diagram_label') {
    return {
      ...base,
      type,
      interaction: {
        diagramSvgKind: 'right_triangle',
        regions: [{ id: 'r1', code: 'R1', x: 195, y: 82 }],
        labelBank: [{ id: 'lb1', label: 'Hipotenusa' }]
      },
      answerSpec: { correctLabels: { r1: 'lb1' } }
    };
  }
  if (type === 'simulation') {
    return {
      ...base,
      type,
      interaction: {
        simulationModel: 'newton_second_law',
        formulaLatex: 'a = \\frac{F}{m}',
        parameters: [
          { id: 'mass', label: 'Massa (m)', unit: 'kg', min: 1, max: 10, step: 1, defaultValue: 2 },
          { id: 'force', label: 'Gaya (F)', unit: 'N', min: 2, max: 50, step: 2, defaultValue: 10 }
        ],
        unit: 'm/s²'
      },
      answerSpec: { expectedValue: 5, tolerance: 0.1 }
    };
  }
  return {
    ...base,
    type: 'worked_solution',
    interaction: { responseMode: 'rich_text', minWords: 5 },
    answerSpec: { requiredKeywords: ['x'], sampleAnswer: 'Langkah penyelesaian terstruktur.' },
    scoring: {
      method: 'weighted_rubric',
      maxPoints: 10,
      rubric: [{ id: 'rub_1', criterion: 'Langkah & konsep tepat', maxPoints: 10 }]
    }
  };
}

export function ManualQuestionBuilderPage() {
  const { questionId } = useParams();
  const isEditing = Boolean(questionId);
  const { services, showToast } = useServices();
  const navigate = useNavigate();

  const [taxonomy, setTaxonomy] = useState(null);
  const [question, setQuestion] = useState(() => buildEmptyTemplateForType('single_choice'));
  const [activeTab, setActiveTab] = useState('content');
  const [previewViewport, setPreviewViewport] = useState('desktop');
  const [previewResponse, setPreviewResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const tax = await services.learning.getTaxonomy();
        setTaxonomy(tax);
        if (isEditing) {
          const detail = await services.question.getById(questionId);
          setQuestion(detail.question);
        }
      } catch (err) {
        showToast(err?.message || 'Gagal memuat data soal.', 'error');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [services, questionId, isEditing, showToast]);

  if (loading) return <LoadingState message="Memuat Manual Question Builder..." />;

  const validation = validateQuestionAuthoring(question);
  const studentPreviewDto = toStudentDeliveryDto(question, { mode: 'practice' });

  const handleTypeSwitch = (nextType) => {
    if (nextType === 'essay') {
      setQuestion((prev) => normalizeLegacyQuestionInput({ ...prev, type: 'essay' }));
      showToast("Alias legacy 'essay' dipetakan otomatis ke 'worked_solution' (rich_text).");
      return;
    }
    setQuestion((prev) => buildEmptyTemplateForType(nextType, prev));
    setPreviewResponse(null);
  };

  const handleMockUpload = async (fileName, mimeType, sizeBytes) => {
    setUploadStatus('Mengunggah (simulasi)...');
    try {
      const asset = await services.media.mockUploadFile({
        fileName,
        mimeType,
        sizeBytes,
        altText: question.accessibility?.altText || 'Ilustrasi soal Matematika/Fisika'
      });
      setQuestion((prev) => ({
        ...prev,
        content: {
          ...prev.content,
          media: [...(prev.content?.media || []), { id: asset.id, type: 'image', url: asset.url, altText: asset.altText }]
        }
      }));
      setUploadStatus(`Berhasil diunggah: ${asset.fileName}`);
    } catch (err) {
      setUploadStatus(`Ditolak: ${err.message}`);
      showToast(err.message, 'error');
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      if (isEditing) {
        const res = await services.question.updateDraft(question.id, question);
        setQuestion(res.question);
        showToast('Perubahan draf tersimpan.');
      } else {
        const res = await services.question.createDraft(question);
        showToast('Draf soal baru berhasil disimpan.');
        navigate(`/studio/questions/${res.question.id}/edit`, { replace: true });
      }
    } catch (err) {
      showToast(err?.message || 'Gagal menyimpan draf.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    setSaving(true);
    try {
      let targetId = question.id;
      if (!isEditing) {
        const created = await services.question.createDraft(question);
        targetId = created.question.id;
      } else {
        await services.question.updateDraft(question.id, question);
      }
      await services.question.submitForReview(targetId);
      showToast('Soal lolos validasi dan diajukan ke Antrean Review SME!');
      navigate('/studio/reviews');
    } catch (err) {
      showToast(err?.message || 'Validasi gagal. Periksa error pemblokir di panel kanan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateAnswerSpec = (patch) => {
    setQuestion((q) => ({ ...q, answerSpec: { ...(q.answerSpec || {}), ...patch } }));
  };

  const updateInteraction = (patch) => {
    setQuestion((q) => ({ ...q, interaction: { ...(q.interaction || {}), ...patch } }));
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Manual Question Builder"
        title={isEditing ? `Edit Soal · ${question.metadata?.code || question.id}` : 'Buat Soal Baru'}
        subtitle="Semua tipe soal kanonis menggunakan skema v1 tunggal. Kunci jawaban terpisah dari Student Delivery DTO."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={saving} onClick={handleSaveDraft}>
              Simpan Draf
            </Button>
            <Button loading={saving} onClick={handleSubmitReview}>
              <Send className="h-4 w-4" aria-hidden="true" />
              Ajukan ke Review
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {/* Metadata Setup */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-black">Metadata & Pemetaan Kurikulum</h2>
              <Badge tone={question.governance?.status === 'published' ? 'completed' : 'info'}>
                v{question.version} · {question.governance?.status || 'draft'}
              </Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField id="qb-title" label="Judul Internal" required>
                <Input
                  id="qb-title"
                  value={question.metadata?.title || ''}
                  onChange={(e) => setQuestion((q) => ({ ...q, metadata: { ...q.metadata, title: e.target.value } }))}
                />
              </FormField>
              <FormField id="qb-code" label="Kode Soal" required>
                <Input
                  id="qb-code"
                  value={question.metadata?.code || ''}
                  onChange={(e) => setQuestion((q) => ({ ...q, metadata: { ...q.metadata, code: e.target.value } }))}
                />
              </FormField>
              <FormField id="qb-curr" label="Kurikulum">
                <Select
                  id="qb-curr"
                  value={question.metadata?.curriculumId || ''}
                  onChange={(e) => setQuestion((q) => ({ ...q, metadata: { ...q.metadata, curriculumId: e.target.value } }))}
                >
                  {(taxonomy?.curricula || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </FormField>
              <FormField id="qb-grade" label="Jenjang & Kelas">
                <Select
                  id="qb-grade"
                  value={question.metadata?.gradeLevelId || ''}
                  onChange={(e) => setQuestion((q) => ({ ...q, metadata: { ...q.metadata, gradeLevelId: e.target.value } }))}
                >
                  {(taxonomy?.gradeLevels || []).map((g) => <option key={g.id} value={g.id}>{g.displayName}</option>)}
                </Select>
              </FormField>
              <FormField id="qb-subject" label="Mata Pelajaran">
                <Select
                  id="qb-subject"
                  value={question.metadata?.subjectId || ''}
                  onChange={(e) => setQuestion((q) => ({ ...q, metadata: { ...q.metadata, subjectId: e.target.value } }))}
                >
                  {(taxonomy?.subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </FormField>
              <FormField id="qb-comp" label="Kompetensi Utama" error={validation.fieldErrors['metadata.competencyIds']}>
                <Select
                  id="qb-comp"
                  value={question.metadata?.competencyIds?.[0] || ''}
                  onChange={(e) => setQuestion((q) => ({ ...q, metadata: { ...q.metadata, competencyIds: e.target.value ? [e.target.value] : [] } }))}
                >
                  <option value="">-- Pilih kompetensi --</option>
                  {(taxonomy?.competencies || []).map((c) => <option key={c.id} value={c.id}>{c.code} · {c.description}</option>)}
                </Select>
              </FormField>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <FormField id="qb-diff" label="Tingkat Kesulitan">
                <Select
                  id="qb-diff"
                  value={question.metadata?.difficulty || 'medium'}
                  onChange={(e) => setQuestion((q) => ({ ...q, metadata: { ...q.metadata, difficulty: e.target.value } }))}
                >
                  <option value="very_easy">Sangat Mudah</option>
                  <option value="easy">Mudah</option>
                  <option value="medium">Sedang</option>
                  <option value="hard">Sulit</option>
                  <option value="very_hard">Sangat Sulit</option>
                </Select>
              </FormField>
              <FormField id="qb-bloom" label="Level Kognitif Bloom">
                <Select
                  id="qb-bloom"
                  value={question.metadata?.bloomLevel || 'apply'}
                  onChange={(e) => setQuestion((q) => ({ ...q, metadata: { ...q.metadata, bloomLevel: e.target.value } }))}
                >
                  <option value="remember">C1 Remember</option>
                  <option value="understand">C2 Understand</option>
                  <option value="apply">C3 Apply</option>
                  <option value="analyze">C4 Analyze</option>
                  <option value="evaluate">C5 Evaluate</option>
                  <option value="create">C6 Create</option>
                </Select>
              </FormField>
              <FormField id="qb-sec" label="Estimasi (Detik)">
                <Input
                  id="qb-sec"
                  type="number"
                  min={10}
                  value={question.metadata?.estimatedSeconds || 60}
                  onChange={(e) => setQuestion((q) => ({ ...q, metadata: { ...q.metadata, estimatedSeconds: Number(e.target.value || 60) } }))}
                />
              </FormField>
            </div>
          </Card>

          {/* 5 Builder Tabs */}
          <Card padding="p-0" className="overflow-hidden">
            <Tabs
              activeId={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: 'content', label: '1. Konten' },
                { id: 'answer', label: '2. Jawaban' },
                { id: 'scoring', label: '3. Penilaian' },
                { id: 'explanation', label: '4. Pembahasan' },
                { id: 'delivery', label: '5. Delivery' }
              ]}
            />

            <div className="p-5 space-y-5">
              {activeTab === 'content' ? (
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-extrabold text-navy-900">Pilih Tipe Soal Kanonis (14 Tipe + Legacy Essay)</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {QUESTION_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleTypeSwitch(t)}
                          className={`min-h-11 rounded-xl border-2 px-3 py-2 text-left text-xs font-extrabold transition ${
                            question.type === t
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-app-border bg-white text-text-secondary hover:bg-surface-muted'
                          }`}
                        >
                          {QUESTION_TYPE_LABELS[t]}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleTypeSwitch('essay')}
                        className="min-h-11 rounded-xl border-2 border-dashed border-app-border px-3 py-2 text-left text-xs font-extrabold text-text-muted hover:bg-surface-muted"
                      >
                        Impor Alias &lsquo;essay&rsquo; → worked_solution
                      </button>
                    </div>
                  </div>

                  <FormField id="mb-stem" label="Pertanyaan / Stem Soal (mendukung LaTeX \\(...\\))" required error={validation.fieldErrors['content.stem']}>
                    <Textarea
                      id="mb-stem"
                      rows={3}
                      value={question.content?.stem || ''}
                      error={validation.fieldErrors['content.stem']}
                      onChange={(e) => setQuestion((q) => ({ ...q, content: { ...q.content, stem: e.target.value } }))}
                    />
                  </FormField>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setQuestion((q) => ({ ...q, content: { ...q.content, stem: `${q.content?.stem || ''} \\(x = 5\\)` } }))}
                    >
                      + Sisip Rumus KaTeX
                    </Button>
                  </div>

                  <FormField id="mb-instr" label="Instruksi Pengerjaan">
                    <Input
                      id="mb-instr"
                      value={question.content?.instruction || ''}
                      onChange={(e) => setQuestion((q) => ({ ...q, content: { ...q.content, instruction: e.target.value } }))}
                    />
                  </FormField>

                  {/* Mock Media Uploader */}
                  <div className="rounded-2xl border border-dashed border-app-border bg-surface-muted p-4 space-y-3">
                    <p className="text-xs font-extrabold text-navy-900">Pengunggah Media Mock (Validasi Format & Keamanan)</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleMockUpload('diagram-vektor.png', 'image/png', 240000)}>
                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                        Simulasi Unggah PNG Valid
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleMockUpload('skrip-berbahaya.exe', 'application/x-msdownload', 1024)}>
                        Uji Tolak File Berbahaya (.exe)
                      </Button>
                    </div>
                    {uploadStatus ? <p className="text-xs font-bold text-text-secondary">{uploadStatus}</p> : null}
                  </div>
                </div>
              ) : null}

              {activeTab === 'answer' ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-700">
                    Editor Kunci Jawaban untuk tipe: <b>{QUESTION_TYPE_LABELS[question.type]}</b> (tidak dikirim ke Student Delivery DTO).
                  </div>

                  {['single_choice', 'multiple_select'].includes(question.type) ? (
                    <div className="space-y-3">
                      {(question.interaction?.options || []).map((opt, idx) => {
                        const isChecked = (question.answerSpec?.correctOptionIds || []).includes(opt.id);
                        return (
                          <div key={opt.id} className="flex items-center gap-2">
                            <input
                              type={question.type === 'single_choice' ? 'radio' : 'checkbox'}
                              name="mb-correct-opt"
                              aria-label={`Tandai opsi ${idx + 1} benar`}
                              checked={isChecked}
                              onChange={() => {
                                if (question.type === 'single_choice') {
                                  updateAnswerSpec({ correctOptionIds: [opt.id] });
                                } else {
                                  const curr = question.answerSpec?.correctOptionIds || [];
                                  updateAnswerSpec({
                                    correctOptionIds: isChecked ? curr.filter((x) => x !== opt.id) : [...curr, opt.id]
                                  });
                                }
                              }}
                              className="h-5 w-5 accent-brand-500"
                            />
                            <Input
                              value={opt.label}
                              onChange={(e) => {
                                const nextOpts = [...question.interaction.options];
                                nextOpts[idx] = { ...opt, label: e.target.value };
                                updateInteraction({ options: nextOpts });
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="Hapus opsi"
                              onClick={() => {
                                const nextOpts = question.interaction.options.filter((o) => o.id !== opt.id);
                                updateInteraction({ options: nextOpts });
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
                            </Button>
                          </div>
                        );
                      })}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const opts = question.interaction?.options || [];
                          updateInteraction({
                            options: [...opts, { id: `opt_${Date.now()}`, label: `Opsi ${opts.length + 1}` }]
                          });
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        Tambah Opsi
                      </Button>
                    </div>
                  ) : null}

                  {question.type === 'true_false' ? (
                    <FormField id="ans-tf" label="Kunci Jawaban Benar / Salah">
                      <Select
                        id="ans-tf"
                        value={String(Boolean(question.answerSpec?.correctAnswer))}
                        onChange={(e) => updateAnswerSpec({ correctAnswer: e.target.value === 'true' })}
                      >
                        <option value="true">Benar</option>
                        <option value="false">Salah</option>
                      </Select>
                    </FormField>
                  ) : null}

                  {['numeric', 'simulation'].includes(question.type) ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <FormField id="ans-num" label="Nilai Target" error={validation.fieldErrors['answerSpec.expectedValue']}>
                        <Input
                          id="ans-num"
                          type="number"
                          value={question.answerSpec?.expectedValue ?? ''}
                          onChange={(e) => updateAnswerSpec({ expectedValue: e.target.value === '' ? undefined : Number(e.target.value) })}
                        />
                      </FormField>
                      <FormField id="ans-tol" label="Toleransi">
                        <Input
                          id="ans-tol"
                          type="number"
                          step="0.01"
                          value={question.answerSpec?.tolerance ?? 0.01}
                          onChange={(e) => updateAnswerSpec({ tolerance: Number(e.target.value || 0) })}
                        />
                      </FormField>
                      <FormField id="ans-unit" label="Satuan">
                        <Input
                          id="ans-unit"
                          value={question.interaction?.unit || ''}
                          onChange={(e) => updateInteraction({ unit: e.target.value })}
                        />
                      </FormField>
                    </div>
                  ) : null}

                  {question.type === 'short_text' ? (
                    <FormField id="ans-st" label="Daftar Jawaban Diterima (pisahkan dengan koma)">
                      <Input
                        id="ans-st"
                        value={(question.answerSpec?.acceptedAnswers || []).join(', ')}
                        onChange={(e) => updateAnswerSpec({ acceptedAnswers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      />
                    </FormField>
                  ) : null}

                  {question.type === 'formula_input' ? (
                    <FormField id="ans-fml" label="Ekspresi Matematika Kunci (pisahkan dengan koma)">
                      <Input
                        id="ans-fml"
                        value={(question.answerSpec?.acceptedExpressions || []).join(', ')}
                        onChange={(e) => updateAnswerSpec({ acceptedExpressions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      />
                    </FormField>
                  ) : null}

                  {['fill_blank', 'matching', 'ordering', 'drag_drop', 'graph_plot', 'diagram_label', 'worked_solution'].includes(question.type) ? (
                    <div className="space-y-3">
                      <FormField id="ans-json" label="Konfigurasi Struktur AnswerSpec JSON Tervalidasi">
                        <Textarea
                          id="ans-json"
                          rows={5}
                          value={JSON.stringify(question.answerSpec || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              setQuestion((q) => ({ ...q, answerSpec: parsed }));
                            } catch {
                              // Biarkan pengguna mengetik JSON valid
                            }
                          }}
                        />
                      </FormField>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeTab === 'scoring' ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField id="sc-max" label="Poin Maksimum" error={validation.fieldErrors['scoring.maxPoints']}>
                      <Input
                        id="sc-max"
                        type="number"
                        min={1}
                        value={question.scoring?.maxPoints || 10}
                        onChange={(e) => setQuestion((q) => ({ ...q, scoring: { ...q.scoring, maxPoints: Number(e.target.value || 1) } }))}
                      />
                    </FormField>
                    <FormField id="sc-method" label="Metode Penilaian">
                      <Select
                        id="sc-method"
                        value={question.scoring?.method || 'exact_match'}
                        onChange={(e) => setQuestion((q) => ({ ...q, scoring: { ...q.scoring, method: e.target.value } }))}
                      >
                        <option value="exact_match">Exact Match</option>
                        <option value="partial_credit">Partial Credit</option>
                        <option value="weighted_rubric">Weighted Rubric</option>
                        <option value="manual_grading">Manual Grading</option>
                      </Select>
                    </FormField>
                  </div>

                  {question.type === 'worked_solution' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-extrabold">Kriteria Rubrik</p>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const rub = question.scoring?.rubric || [];
                            setQuestion((q) => ({
                              ...q,
                              scoring: {
                                ...q.scoring,
                                rubric: [...rub, { id: `rub_${Date.now()}`, criterion: 'Kriteria baru', maxPoints: 5 }]
                              }
                            }));
                          }}
                        >
                          + Tambah Kriteria
                        </Button>
                      </div>
                      {(question.scoring?.rubric || []).map((r, idx) => (
                        <div key={r.id} className="grid grid-cols-[1fr_100px] gap-2">
                          <Input
                            value={r.criterion}
                            onChange={(e) => {
                              const next = [...question.scoring.rubric];
                              next[idx] = { ...r, criterion: e.target.value };
                              setQuestion((q) => ({ ...q, scoring: { ...q.scoring, rubric: next } }));
                            }}
                          />
                          <Input
                            type="number"
                            value={r.maxPoints}
                            onChange={(e) => {
                              const next = [...question.scoring.rubric];
                              next[idx] = { ...r, maxPoints: Number(e.target.value || 0) };
                              setQuestion((q) => ({ ...q, scoring: { ...q.scoring, rubric: next } }));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeTab === 'explanation' ? (
                <div className="space-y-4">
                  <FormField id="ex-steps" label="Langkah Pembahasan (1 baris = 1 langkah)">
                    <Textarea
                      id="ex-steps"
                      rows={4}
                      value={(question.explanation?.steps || []).join('\n')}
                      onChange={(e) =>
                        setQuestion((q) => ({
                          ...q,
                          explanation: { ...q.explanation, steps: e.target.value.split('\n').filter((s) => s.trim()) }
                        }))
                      }
                    />
                  </FormField>
                  <FormField id="ex-hints" label="Tangga Petunjuk / Hint (1 baris = 1 petunjuk)">
                    <Textarea
                      id="ex-hints"
                      rows={2}
                      value={(question.explanation?.hints || []).join('\n')}
                      onChange={(e) =>
                        setQuestion((q) => ({
                          ...q,
                          explanation: { ...q.explanation, hints: e.target.value.split('\n').filter((s) => s.trim()) }
                        }))
                      }
                    />
                  </FormField>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField id="ex-ok" label="Feedback Jawaban Benar">
                      <Input
                        id="ex-ok"
                        value={question.explanation?.correctFeedback || ''}
                        onChange={(e) => setQuestion((q) => ({ ...q, explanation: { ...q.explanation, correctFeedback: e.target.value } }))}
                      />
                    </FormField>
                    <FormField id="ex-bad" label="Feedback Jawaban Salah">
                      <Input
                        id="ex-bad"
                        value={question.explanation?.incorrectFeedback || ''}
                        onChange={(e) => setQuestion((q) => ({ ...q, explanation: { ...q.explanation, incorrectFeedback: e.target.value } }))}
                      />
                    </FormField>
                  </div>
                </div>
              ) : null}

              {activeTab === 'delivery' ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField id="del-vis" label="Visibilitas">
                      <Select
                        id="del-vis"
                        value={question.delivery?.visibility || 'institution'}
                        onChange={(e) => setQuestion((q) => ({ ...q, delivery: { ...q.delivery, visibility: e.target.value } }))}
                      >
                        <option value="private">Privat Penulis</option>
                        <option value="institution">Sekolah / Institusi</option>
                        <option value="global">Global Question Bank</option>
                      </Select>
                    </FormField>
                    <FormField id="del-fb" label="Kebijakan Rilis Pembahasan">
                      <Select
                        id="del-fb"
                        value={question.delivery?.feedbackPolicy || 'immediate'}
                        onChange={(e) => setQuestion((q) => ({ ...q, delivery: { ...q.delivery, feedbackPolicy: e.target.value } }))}
                      >
                        <option value="immediate">Langsung setelah jawab (Latihan)</option>
                        <option value="after_submission">Setelah selesai sesi</option>
                        <option value="after_release">Sesuai jadwal rilis ujian</option>
                      </Select>
                    </FormField>
                  </div>

                  <label className="flex min-h-11 items-center gap-2 rounded-xl border border-app-border p-3 text-xs font-extrabold text-red-700">
                    <input
                      type="checkbox"
                      checked={Boolean(question.delivery?.heartsEnabled)}
                      onChange={(e) => setQuestion((q) => ({ ...q, delivery: { ...q.delivery, heartsEnabled: e.target.checked } }))}
                    />
                    <span>Paksa Hearts Aktif (diblokir otomatis bila mode mencakup formal_exam)</span>
                  </label>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        {/* Right Panel: Validation & Live Student Preview */}
        <aside className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-black">Validasi Deterministik</h2>
              <Badge tone={validation.valid ? 'completed' : 'error'}>
                {validation.valid ? 'Lolos Gerbang' : `${validation.blockingErrors.length} Blocker`}
              </Badge>
            </div>
            {validation.blockingErrors.length > 0 ? (
              <ul className="space-y-1.5 text-xs font-bold text-red-700">
                {validation.blockingErrors.map((err, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{err.message}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-1.5 text-xs font-bold text-success-600">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Tidak ada blocking error skema maupun aturan tipe soal.
              </p>
            )}
            {validation.warnings.length > 0 ? (
              <div className="border-t border-app-border pt-2 space-y-1 text-xs font-semibold text-orange-700">
                <p className="font-extrabold">Peringatan ({validation.warnings.length}):</p>
                {validation.warnings.map((w, i) => (
                  <p key={i}>• {w.message}</p>
                ))}
              </div>
            ) : null}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-display text-base font-black">
                <Eye className="h-4 w-4 text-blue-700" aria-hidden="true" />
                <span>Live Student Preview</span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Tampilan desktop"
                  onClick={() => setPreviewViewport('desktop')}
                  className={`rounded-lg p-1.5 ${previewViewport === 'desktop' ? 'bg-navy-900 text-white' : 'text-text-muted'}`}
                >
                  <Monitor className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Tampilan mobile"
                  onClick={() => setPreviewViewport('mobile')}
                  className={`rounded-lg p-1.5 ${previewViewport === 'mobile' ? 'bg-navy-900 text-white' : 'text-text-muted'}`}
                >
                  <Smartphone className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className={`mx-auto rounded-2xl border border-app-border bg-surface-muted p-4 ${previewViewport === 'mobile' ? 'max-w-[300px]' : 'w-full'}`}>
              <QuestionRenderer
                question={studentPreviewDto}
                value={previewResponse}
                onChange={setPreviewResponse}
              />
            </div>

            <p className="text-[11px] font-semibold text-text-muted">
              Pratinjau ini dirender dari Student Delivery DTO allowlisted (<FormulaBlock content="\\text{answerSpec} = \\emptyset" />).
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
