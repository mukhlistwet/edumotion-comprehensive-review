import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const artifactDir = path.join(rootDir, 'tests/artifacts/viewports');
fs.mkdirSync(artifactDir, { recursive: true });

const TARGET_VIEWPORTS = [
  { name: 'small-mobile-320', width: 320, height: 640 },
  { name: 'common-mobile-375', width: 375, height: 812 },
  { name: 'tablet-portrait-768', width: 768, height: 1024 },
  { name: 'tablet-landscape-1024', width: 1024, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'wide-desktop-1920', width: 1920, height: 1080 }
];

test.describe('EduMotion Multi-Viewport Responsive, Keyboard A11y & E2E Workflows', () => {
  for (const vp of TARGET_VIEWPORTS) {
    test(`Dashboard & Journey bebas horizontal overflow pada ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/student/dashboard');
      await page.waitForSelector('h1');

      const dashOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      expect(dashOverflow, `Horizontal overflow pada dashboard di ${vp.name}`).toBe(false);
      await page.screenshot({ path: path.join(artifactDir, `web-dashboard-${vp.name}.png`) });

      // Navigasi ke Journey Engine
      await page.goto('/student/journeys/jrn_math_smp_algebra/chapters/ch_alg_01');
      await page.waitForSelector('h2');
      const journeyOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      expect(journeyOverflow, `Horizontal overflow pada Journey di ${vp.name}`).toBe(false);

      if (vp.width === 375 || vp.width === 1440) {
        await page.screenshot({ path: path.join(artifactDir, `web-journey-${vp.name}.png`) });
      }
      expect(pageErrors).toEqual([]);
    });
  }

  test('Alur E2E lintas peran, keyboard navigation, Manual Builder, AI Generator, Sekolah & Admin', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. Uji keyboard Tab navigation pada halaman Journey
    await page.goto('/student/journeys/jrn_math_smp_algebra/chapters/ch_alg_01');
    await page.waitForSelector('h2');
    await page.keyboard.press('Tab');
    const activeTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT', 'SELECT']).toContain(activeTag);

    // 2. Uji Galeri 14 Tipe Soal & Simulasi Fisika
    await page.goto('/student/gallery');
    await page.waitForSelector('h2');
    await page.screenshot({ path: path.join(artifactDir, 'web-gallery-14-types.png') });

    // 3. Beralih ke Content Author via Mock Simulator Bar
    await page.getByRole('button', { name: /Buka simulator persona/i }).click();
    await page.locator('#sim-persona').selectOption('usr_author_a');
    await page.waitForURL('**/studio');
    await page.waitForSelector('text=Pusat Penulisan & Tata Kelola Soal');

    await page.locator('aside').getByRole('link', { name: 'Manual Builder' }).click();
    await page.waitForSelector('text=Live Student Preview');
    await page.screenshot({ path: path.join(artifactDir, 'web-manual-builder-1280.png') });

    await page.locator('aside').getByRole('link', { name: 'AI Generator' }).click();
    await page.waitForSelector('text=Buat Draf Soal Terstruktur dengan AI');
    await page.screenshot({ path: path.join(artifactDir, 'web-ai-generator-1280.png') });

    // 4. Beralih ke Wakasek Sekolah (Portal Sekolah)
    await page.locator('#sim-persona').selectOption('usr_school_admin_a');
    await page.waitForURL('**/school/dashboard');
    await page.waitForSelector('text=Dashboard Akademik Sekolah');
    await page.screenshot({ path: path.join(artifactDir, 'web-school-portal-1280.png') });

    // 5. Beralih ke Platform Super Admin (Konsol Platform)
    await page.locator('#sim-persona').selectOption('usr_platform_super');
    await page.waitForURL('**/admin/dashboard');
    await page.waitForSelector('text=Ringkasan Operasional EduMotion');
    await page.screenshot({ path: path.join(artifactDir, 'web-admin-console-1280.png') });

    expect(pageErrors).toEqual([]);
  });

  test('Preview @edumotion/mobile pada viewport 390x844 bebas error dan overflow', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:4174/');
    await page.waitForSelector('text=EduMotion Mobile');

    await page.getByText('Siswa SMP · Freemium').click();
    await page.waitForSelector('text=Halo, Bima Pratama!');

    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(mobileOverflow).toBe(false);
    await page.screenshot({ path: path.join(artifactDir, 'mobile-preview-home-390x844.png') });

    await page.getByText('Journey', { exact: true }).click();
    await page.waitForSelector('text=Adventure · Number Forest');
    await page.screenshot({ path: path.join(artifactDir, 'mobile-preview-journey-390x844.png') });

    expect(pageErrors).toEqual([]);
  });
});
