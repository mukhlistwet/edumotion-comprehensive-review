import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function collectFiles(dir, extensions = ['.js', '.jsx']) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      results.push(...collectFiles(full, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

describe('Batas Arsitektur Frontend-First & Portability', () => {
  it('komponen UI Web dan Mobile tidak memanggil fetch/XMLHttpRequest atau hard-code /api/v1', () => {
    const uiDirs = [
      path.join(rootDir, 'apps/web/src/features'),
      path.join(rootDir, 'apps/web/src/shared'),
      path.join(rootDir, 'apps/web/src/app'),
      path.join(rootDir, 'apps/mobile/src/components'),
      path.join(rootDir, 'apps/mobile/src/screens')
    ];
    const files = [...uiDirs.flatMap((d) => collectFiles(d)), path.join(rootDir, 'apps/mobile/App.jsx')];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      expect(text, `Direct fetch() terdeteksi di ${file}`).not.toMatch(/\bfetch\s*\(/);
      expect(text, `XMLHttpRequest terdeteksi di ${file}`).not.toMatch(/\bXMLHttpRequest\b/);
      expect(text, `Endpoint /api/v1 terdeteksi di ${file}`).not.toMatch(/\/api\/v1/);
    }
  });

  it('shared packages dan mobile app source tidak bergantung pada browser window/document/localStorage', () => {
    const sharedFiles = [
      ...collectFiles(path.join(rootDir, 'packages')),
      ...collectFiles(path.join(rootDir, 'apps/mobile/src')).filter((f) => !f.endsWith('main.preview.jsx')),
      path.join(rootDir, 'apps/mobile/App.jsx')
    ];
    for (const file of sharedFiles) {
      const rawText = fs.readFileSync(file, 'utf8');
      const codeOnly = rawText.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(codeOnly, `window API terdeteksi di ${file}`).not.toMatch(/\bwindow\./);
      expect(codeOnly, `document API terdeteksi di ${file}`).not.toMatch(/\bdocument\./);
      expect(codeOnly, `localStorage terdeteksi di ${file}`).not.toMatch(/\blocalStorage\b/);
      expect(codeOnly, `sessionStorage terdeteksi di ${file}`).not.toMatch(/\bsessionStorage\b/);
    }
  });

  it('apps/web menggunakan Tailwind CSS tanpa native CSS class untuk komponen biasa', () => {
    const cssFiles = collectFiles(path.join(rootDir, 'apps/web/src'), ['.css']);
    expect(cssFiles.length).toBe(1);
    const themeCss = fs.readFileSync(cssFiles[0], 'utf8');
    expect(themeCss).toContain('@import "tailwindcss";');
    expect(themeCss).toContain('@theme');
    expect(themeCss).not.toMatch(/^\.[a-zA-Z_-]+\s*\{/m);
  });
});
