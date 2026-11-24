import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { DEFAULT_TEMPLATE_CATALOG, QUESTION_TYPES, toStudentDeliveryDto } from '@edumotion/domain';
import { FIXTURES_V1, createServiceProvider } from '@edumotion/services';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relPath), 'utf8'));
}

describe('Validasi Kontrak Kanonis JSON Schema (Ajv 2020-12)', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);

  const authoringSchema = loadJson('contracts/question-authoring-v1.schema.json');
  const deliverySchema = loadJson('contracts/question-student-delivery-v1.schema.json');
  const journeySchema = loadJson('contracts/journey-view-v1.schema.json');
  const templateCatalog = loadJson('contracts/journey-template-catalog.json');

  const validateAuthoring = ajv.compile(authoringSchema);
  const validateDelivery = ajv.compile(deliverySchema);
  const validateJourney = ajv.compile(journeySchema);

  it('seluruh 14 tipe soal kanonis terwakili pada fixture Bank Soal v1', () => {
    const presentTypes = new Set(FIXTURES_V1.questionsBank.questions.map((q) => q.type));
    for (const canonicalType of QUESTION_TYPES) {
      expect(presentTypes.has(canonicalType), `Tipe soal ${canonicalType} wajib ada pada fixture`).toBe(true);
    }
  });

  it('seluruh soal pada fixture memenuhi contracts/question-authoring-v1.schema.json', () => {
    for (const q of FIXTURES_V1.questionsBank.questions) {
      const ok = validateAuthoring(q);
      expect(ok, `Validasi authoring gagal untuk ${q.id}: ${JSON.stringify(validateAuthoring.errors)}`).toBe(true);
    }
  });

  it('proyeksi toStudentDeliveryDto memenuhi contracts/question-student-delivery-v1.schema.json dan nol kebocoran kunci', () => {
    for (const q of FIXTURES_V1.questionsBank.questions) {
      const dto = toStudentDeliveryDto(q, { mode: 'formal_exam' });
      const ok = validateDelivery(dto);
      expect(ok, `Validasi delivery gagal untuk ${q.id}: ${JSON.stringify(validateDelivery.errors)}`).toBe(true);
      expect(dto).not.toHaveProperty('answerSpec');
      expect(dto).not.toHaveProperty('scoring');
      expect(dto).not.toHaveProperty('provenance');
      expect(dto).not.toHaveProperty('governance');
      expect(dto).not.toHaveProperty('explanation');
      expect(dto.delivery.hintAvailable).toBe(false);
    }
  });

  it('output Journey getChapterMap memenuhi contracts/journey-view-v1.schema.json', async () => {
    const provider = createServiceProvider();
    const res = await provider.journey.getChapterMap('jrn_math_smp_algebra', 'ch_alg_01');
    const ok = validateJourney(res.viewModel);
    expect(ok, `Validasi journey view model gagal: ${JSON.stringify(validateJourney.errors)}`).toBe(true);
  });

  it('katalog template domain cocok dengan contracts/journey-template-catalog.json', () => {
    const contractIds = templateCatalog.map((t) => t.id).sort();
    const domainIds = DEFAULT_TEMPLATE_CATALOG.map((t) => t.id).sort();
    expect(domainIds).toEqual(contractIds);
  });
});
