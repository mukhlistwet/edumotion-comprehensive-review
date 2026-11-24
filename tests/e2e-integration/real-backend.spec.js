import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const artifactDir = path.join(rootDir, 'tests/artifacts/integration');
fs.mkdirSync(artifactDir, { recursive: true });

test.describe('Phase 4 End-to-End Integrasi FE Web + Mobile ↔ Real LoopBack 4 API + PostgreSQL', () => {
  test('Siswa login nyata di Web, selesaikan node Journey di PostgreSQL, ikut Ujian Tryout, lalu Mobile menampilkan XP tersinkron', async ({
    page
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    await page.waitForSelector('h1');

    // Login kredensial real ke /api/v1/auth/login
    await page.fill('#login-email', 'bima.smp@edumotion.demo');
    await page.fill('#login-password', 'edumotion-demo');
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();

    await page.waitForURL('**/student/dashboard');
    await page.waitForSelector('text=Halo, Bima Pratama!');

    // Cek responsivitas dashboard HTTP mode pada desktop (zero overflow)
    const deskOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(deskOverflow).toBe(false);
    await page.screenshot({ path: path.join(artifactDir, 'real-web-student-dashboard-1280.png') });

    // Buka Journey Engine dan tandai checkpoint #3 selesai langsung ke PostgreSQL
    await page.locator('aside').getByRole('link', { name: 'Jalur Belajar' }).click();
    await page.waitForURL('**/student/journeys/jrn_math_smp_algebra/chapters/ch_alg_01');
    await page.waitForSelector('text=Number Forest');

    await page.getByRole('button', { name: /Tandai Checkpoint Selesai/i }).click();
    await page.waitForSelector('text=3 / 8 Checkpoint');
    await page.screenshot({ path: path.join(artifactDir, 'real-web-journey-persisted-1280.png') });

    // Ikut Ujian Tryout formal via menu sidebar
    await page.locator('aside').getByRole('link', { name: 'Ujian & Tryout' }).click();
    await page.waitForURL('**/student/assessments');
    await page.waitForSelector('text=Tryout Matematika Semester Ganjil');
    await page.getByRole('button', { name: /Mulai \/ Lanjutkan Ujian/i }).first().click();
    await page.waitForSelector('text=Ujian Formal · Snapshot Immutable');

    await page.getByRole('button', { name: 'Kumpulkan Ujian' }).click();
    await page.getByRole('button', { name: 'Ya, Kumpulkan Sekarang' }).click();
    await page.waitForSelector('text=Ringkasan Nilai Akademik');
    await page.screenshot({ path: path.join(artifactDir, 'real-web-exam-result-1280.png') });

    // Cek Mobile viewport (375px) Web tidak overflow setelah navigasi real API
    await page.setViewportSize({ width: 375, height: 812 });
    const mobileWebOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(mobileWebOverflow).toBe(false);

    // Sekarang buka @edumotion/mobile pada :4176 dan verifikasi XP bertambah (340 + 50 = 390 XP) tersinkron dari PostgreSQL
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:4176/');
    await page.waitForSelector('text=EduMotion Mobile');
    await page.getByRole('button', { name: 'Masuk' }).click();
    await page.waitForSelector('text=Halo, Bima Pratama!');
    await page.waitForSelector('text=390');
    await page.screenshot({ path: path.join(artifactDir, 'real-mobile-synced-390x844.png') });

    expect(pageErrors).toEqual([]);
  });

  test('Author (Manual Builder + AI Generator Draft-Only), Sekolah & Platform Admin terhubung ke PostgreSQL nyata + ukur latensi', async ({
    page
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. Login Author
    await page.goto('/login');
    await page.fill('#login-email', 'sari.author@cendekia.demo');
    await page.fill('#login-password', 'edumotion-demo');
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await page.waitForURL('**/studio');
    await page.waitForSelector('text=Pusat Penulisan & Tata Kelola Soal');

    // Simpan draft dari Manual Question Builder ke PostgreSQL
    await page.locator('aside').getByRole('link', { name: 'Manual Builder' }).click();
    await page.waitForSelector('text=Live Student Preview');
    await page.getByRole('button', { name: 'Simpan Draf' }).click();
    await page.waitForURL('**/studio/questions/*/edit');

    // Jalankan AI Question Generator dan terima item sebagai Draft
    await page.locator('aside').getByRole('link', { name: 'AI Generator' }).click();
    await page.waitForSelector('text=Buat Draf Soal Terstruktur dengan AI');
    await page.getByRole('button', { name: /Terima ke Draft Bank Soal/i }).first().click();
    await page.waitForSelector('text=Lihat Draft di Bank Soal');

    // Logout Author -> Login Wakasek Sekolah
    await page.locator('aside').getByRole('button', { name: 'Keluar' }).click();
    await page.waitForURL('**/login');
    await page.fill('#login-email', 'rina.wakasek@cendekia.demo');
    await page.fill('#login-password', 'edumotion-demo');
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await page.waitForURL('**/school/dashboard');
    await page.waitForSelector('text=Dashboard Akademik Sekolah');
    await page.screenshot({ path: path.join(artifactDir, 'real-web-school-1280.png') });

    // Logout Wakasek -> Login Super Admin -> Audit Logs nyata
    await page.locator('aside').getByRole('button', { name: 'Keluar' }).click();
    await page.waitForURL('**/login');
    await page.fill('#login-email', 'admin.platform@edumotion.demo');
    await page.fill('#login-password', 'edumotion-demo');
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await page.waitForURL('**/admin/dashboard');
    await page.waitForSelector('text=Ringkasan Operasional EduMotion');

    await page.locator('aside').getByRole('link', { name: 'Audit Log' }).click();
    await page.waitForURL('**/admin/audit-logs');
    await page.locator('table').getByText('QUESTION_PUBLISHED').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(artifactDir, 'real-web-admin-audit-1280.png') });

    // Ukur latensi /health dan /ready
    const perfStart = Date.now();
    const healthRes = await page.request.get('http://127.0.0.1:4000/api/v1/health');
    const healthMs = Date.now() - perfStart;
    const readyStart = Date.now();
    const readyRes = await page.request.get('http://127.0.0.1:4000/api/v1/ready');
    const readyMs = Date.now() - readyStart;
    expect(healthRes.status()).toBe(200);
    expect(readyRes.status()).toBe(200);
    expect(readyMs).toBeLessThan(1000);
    console.log(`PERF_BENCHMARK health=${healthMs}ms ready=${readyMs}ms`);

    const metricsRes = await page.request.get('http://127.0.0.1:4000/api/v1/metrics');
    expect(metricsRes.status()).toBe(200);

    expect(pageErrors).toEqual([]);
  });
});
