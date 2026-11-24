# Arsitektur Frontend Final EduMotion (Phase 2)

## 1. Struktur Monorepo Workspace (`npm workspaces`)
```text
packages/
  design-tokens/        # Warna kanonis, status semantik, spacing, tipografi (zero DOM)
  domain/               # Aturan bisnis pure JS ESM, validator, skoring, RBAC, state machines
  services/             # Service facade (createServiceProvider), HTTP client, token manager,
                        # HTTP adapter (/api/v1), & Mock adapter (JSON fixtures v1)
apps/
  web/                  # React 19 + Vite 8 + React Router 7 + Tailwind CSS v4 + KaTeX
  mobile/               # React Native + Expo + SecureStore token adapter + vite.mobile preview
```

## 2. Pemisahan Lapisan & Aturan Ketergantungan (Ditegakkan ESLint + Test)
1. **UI Components (`apps/web/src/features|shared|app`, `apps/mobile/src/screens|components`)**:
   - Hanya berinteraksi dengan data melalui hook `useServices()` (`ServiceContext.jsx`) atau prop `services` di Mobile.
   - Dilarang memanggil `fetch()`, `XMLHttpRequest`, maupun menyisipkan path `/api/v1` (diverifikasi via [eslint.config.js](file:///d:/Experimen/edumotion-comprehensive-review/eslint.config.js) dan [architecture-boundaries.test.js](file:///d:/Experimen/edumotion-comprehensive-review/tests/unit/architecture-boundaries.test.js)).
2. **Domain Layer (`packages/domain/src/*`)**:
   - Zero dependency pada browser (`window`, `document`, `localStorage`, `sessionStorage`), React, maupun framework backend.
   - Dipakai ulang oleh Web, Mobile, Mock Adapter (Phase 1–2), **dan** Backend Service Layer (Phase 3) untuk mencegah duplikasi aturan validasi/skoring/RBAC.
3. **Service Facade & Adapter Swapping (`packages/services`)**:
   - Web membaca `VITE_ADAPTER_MODE` (`mock` | `http`) dan `VITE_API_BASE_URL`.
   - Mobile membaca `EXPO_PUBLIC_ADAPTER_MODE` dan `EXPO_PUBLIC_API_BASE_URL` melalui [mobile-env.js](file:///d:/Experimen/edumotion-comprehensive-review/apps/mobile/src/config/mobile-env.js).
   - `createHttpClient` menangani `X-Correlation-ID`, `Idempotency-Key`, `Authorization: Bearer <token>`, retry terikat hanya untuk `GET` atau mutasi ber-`idempotencyKey`, timeout `AbortController`, auto-refresh single-flight saat `401`, serta normalisasi error `ErrorEnvelope`.
4. **Code Splitting Web (`AppRouter.jsx`)**:
   - Modul `AuthPages` dan `StudentPages` dimuat langsung untuk initial render cepat, sedangkan modul Journey, Practice/Gallery, Assessment, Gamification, Studio/Builder, AI Generator, School Portal, dan Admin Console dimuat via `React.lazy`.
