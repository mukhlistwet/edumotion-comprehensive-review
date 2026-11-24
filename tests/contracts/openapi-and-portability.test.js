// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import yaml from 'yaml';
import { createServiceProvider } from '@edumotion/services';
import { createLoopBackEduMotionApp } from '../../apps/api/src/loopback-app.js';
import { createExpressAltApp } from '../../apps/api/src/express-alt-app.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('Kontrak OpenAPI v1 & Uji Portabilitas Backend (LoopBack 4 vs Express Alternatif)', () => {
  let lbApp;
  let lbInfo;
  let expApp;
  let expInfo;

  beforeAll(async () => {
    lbApp = await createLoopBackEduMotionApp({ silentLogs: true });
    lbInfo = await lbApp.start();
    expApp = await createExpressAltApp({ silentLogs: true });
    expInfo = await expApp.start();
  });

  afterAll(async () => {
    if (lbApp) await lbApp.stop();
    if (expApp) await expApp.stop();
  });

  it('spesifikasi contracts/openapi-v1.yaml lengkap dan mencakup seluruh endpoint http-services.js serta diekspos LoopBack /openapi.json', async () => {
    const spec = yaml.parse(fs.readFileSync(path.join(rootDir, 'contracts/openapi-v1.yaml'), 'utf8'));
    expect(spec.openapi).toBe('3.0.3');

    const httpSrc = fs.readFileSync(path.join(rootDir, 'packages/services/src/adapters/http/http-services.js'), 'utf8');
    const matches = [...httpSrc.matchAll(/httpClient\.(?:get|post|put|patch|delete)\(\s*[`'"]([^`'"]+)/g)];
    expect(matches.length).toBeGreaterThan(40);

    for (const m of matches) {
      const normalized = m[1].replace(/\$\{([^}]+)\}/g, '{$1}');
      // parameter name in template literals may differ from openapi param name, match structurally by segment count & static parts
      const regexPattern =
        '^' +
        normalized
          .split('/')
          .map((seg) => (seg.startsWith('{') ? '\\{[^}]+\\}' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
          .join('/') +
        '$';
      const re = new RegExp(regexPattern);
      const found = Object.keys(spec.paths).some((p) => re.test(p));
      expect(found, `Path http-services '${normalized}' wajib terdaftar di contracts/openapi-v1.yaml`).toBe(true);
    }

    const servedSpec = await fetch(`${lbInfo.url}/openapi.json`).then((r) => r.json());
    expect(servedSpec.paths['/api/v1/questions']).toBeTruthy();
    expect(servedSpec.paths['/api/v1/auth/login']).toBeTruthy();
  });

  it('@edumotion/services dalam mode http bekerja identik terhadap LoopBack 4 dan server alternatif Express cukup dengan ganti apiBaseUrl', async () => {
    const targets = [lbInfo.apiBaseUrl, expInfo.apiBaseUrl];
    for (const apiBaseUrl of targets) {
      const provider = createServiceProvider({
        config: { adapterMode: 'http', apiBaseUrl },
        fetchImpl: fetch
      });
      const loginRes = await provider.auth.loginWithCredentials({
        email: 'bima.smp@edumotion.demo',
        password: 'edumotion-demo'
      });
      expect(loginRes.user.id).toBe('usr_student_smp_free');
      expect(loginRes.tokens.accessToken).toBeTruthy();

      const mapRes = await provider.journey.getChapterMap('jrn_math_smp_algebra', 'ch_alg_01');
      expect(mapRes.viewModel.template.id).toBe('adventure');
      expect(mapRes.viewModel.nodes).toHaveLength(8);

      const gallery = await provider.learning.listInteractiveGallery();
      expect(gallery).toHaveLength(14);
      for (const item of gallery) {
        expect(item.question).not.toHaveProperty('answerSpec');
        expect(item.question).not.toHaveProperty('scoring');
      }
    }
  });
});
