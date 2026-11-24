# Audit UX, Responsivitas & Aksesibilitas (Phase 2)

**Tanggal:** 2026-11-24  
**Cakupan Perangkat & Viewport QA (`tests/e2e/responsive-and-workflows.spec.js`):**
1. Small Mobile: `320×640`
2. Common Mobile: `375×812`
3. Tablet Portrait: `768×1024`
4. Tablet Landscape / Small Laptop: `1024×768`
5. Desktop: `1440×900`
6. Wide Desktop: `1920×1080`
7. Workflow Studio/Sekolah/Admin: `1280×800`
8. Preview Native-Layout Mobile (`@edumotion/mobile` via `react-native-web`): `390×844`

---

## 1. Hasil Audit Pola Navigasi & Tata Letak Per Form Factor

| Breakpoint | Pola Navigasi Web | Hasil Uji Overflow | Temuan & Penanganan |
|---|---|---|---|
| `320px` & `375px` (Mobile) | Header atas ringkas + tombol menu `Drawer` + `Bottom Navigation` 5 tab (Siswa) + safe-area inset | `scrollWidth <= innerWidth + 1` (0 overflow) | Di `320px` teks `Streak` di header disembunyikan agar judul merek lebih lega; ikon + `aria-label` tetap hadir. |
| `768px` (Tablet Portrait) | Drawer navigasi + grid kartu 2 kolom | 0 overflow | Modal bertransformasi dari bottom sheet mobile menjadi dialog terpusat (`sm:items-center`). |
| `1024px`, `1440px`, `1920px` (Desktop & Wide) | Sidebar kiri `w-64` sticky + konten utama `max-w-[1440px]` + panel inspektor kanan pada Journey & Builder | 0 overflow | Tidak ada tabrakan konten dengan sidebar atau footer mobile (bottom nav otomatis hidden di `lg:`). |
| Mobile `390×844` (`@edumotion/mobile`) | Header native + body scrollable + bottom tab 6 item (`minHeight: 44px`) | 0 overflow | Bottom tab menempel di dasar layar setelah `#root` dibuat `flex-col min-h-screen`. |

---

## 2. Audit Aksesibilitas Baseline

| Kriteria Aksesibilitas | Status | Bukti Implementasi |
|---|---|---|
| Skip to Main Content & Landmark Semantik | **PASS** | `<a href="#main-content">` skip-link, `<aside>`, `<header>`, `<nav aria-label="...">`, `<main id="main-content">` di `AppShells.jsx`. |
| Navigasi Keyboard & `focus-visible` | **PASS** | `Tab` teruji pada Playwright E2E; tombol & link memakai `focus-visible:ring-4`; modal mendukung `Escape` untuk menutup (`Modal.jsx`). |
| Ukuran Touch Target Minimal `44×44 CSS px` | **PASS** | Kelas `min-h-11` pada kontrol navigasi/tombol Web dan `minHeight: 44` pada tab/tombol `@edumotion/mobile`. |
| Indikator Status Non-Warna | **PASS** | `Badge.jsx` & Journey nodes memadukan warna dengan ikon Lucide dan teks label (`Selesai`, `Sedang berjalan`, `Terkunci`). |
| Preferensi Aksesibilitas Pengguna | **PASS** | Toggle `reducedMotion`, `highContrast`, dan `textScale` di `StudentProfileSettingsPage` & `ServiceContext.jsx` (`theme.css`). |
| Alternatif Non-Drag & Kontrol Simulasi | **PASS** | `OrderingRenderer` dan `DragDropRenderer` memakai tombol pindah naik/turun & pemilih kategori; `GraphPlotRenderer` & `DiagramLabelRenderer` mendukung klik/koordinat tombol; `SimulationRenderer` menyediakan Play/Pause/Reset. |

---

## 3. Catatan Sisa Minor (Low Severity — Accepted untuk Pasca-Phase 4)
- **Dev-Only Simulator Overlay:** Pada mode `mock` di lebar sangat sempit `320px`, pil mengambang `Simulator Mock` bertumpuk di pojok kanan bawah kartu terakhir. Hal ini **tidak muncul** ketika `VITE_ADAPTER_MODE=http` (mode produksi Phase 4), sehingga diterima tanpa mengubah tata letak kartu siswa.
- **Chunk Split Vendor KaTeX:** Chunk utama Web sudah turun dari `942 kB` ke `797 kB` melalui `React.lazy`; pemisahan chunk vendor `katex`/`react` di konfigurasi Rollup/Rolldown dicatat sebagai optimasi opsional pasca-rilis.
