# Kompatibilitas API Mobile (Android & iOS) EduMotion

**Klien Target:** `@edumotion/mobile` (React Native + Expo)  
**Shared Service Core:** `@edumotion/services` & `@edumotion/domain`

---

## 1. Jaminan Portabilitas Lintas-Platform Web & Mobile
1. **Satu Kontrak REST `/api/v1`:** Web dan Mobile memanggil endpoint, HTTP method, query, error envelope, dan DTO kanonis yang **100% identik** ([openapi-v1.yaml](file:///d:/Experimen/edumotion-comprehensive-review/contracts/openapi-v1.yaml)).
2. **Tanpa Ketergantungan Cookie Browser / DOM:**
   - Autentikasi memakai header `Authorization: Bearer <accessToken>` serta JSON refresh flow `POST /auth/refresh` (`refreshToken` di body) — tidak membutuhkan `Set-Cookie`, CSRF HTML token, ataupun redirect OAuth browser-only.
   - `packages/domain`, `packages/services`, dan `apps/mobile/src` dilarang menyentuh `window`, `document`, `localStorage`, atau `sessionStorage` (ditegakkan oleh [eslint.config.js](file:///d:/Experimen/edumotion-comprehensive-review/eslint.config.js) dan [architecture-boundaries.test.js](file:///d:/Experimen/edumotion-comprehensive-review/tests/unit/architecture-boundaries.test.js)).
3. **Secure Token Storage (`createSecureTokenStorage`):**
   - Pada [mobile-env.js](file:///d:/Experimen/edumotion-comprehensive-review/apps/mobile/src/config/mobile-env.js), `createSecureTokenStorage(secureStoreModule)` membungkus API asinkron `SecureStore` (`getItemAsync`, `setItemAsync`, `deleteItemAsync`) untuk menyimpan objek token terenkripsi pada Keychain iOS / Keystore Android, bukan `AsyncStorage` teks biasa.
   - Pada lingkungan test atau tanpa modul native terpasang, adapter otomatis fallback ke `Map` in-memory agar test unit & integrasi HTTP berjalan deterministik.
4. **Konfigurasi Environment Single Switch:**
   - Web membaca `VITE_API_BASE_URL` & `VITE_ADAPTER_MODE`.
   - Mobile membaca `EXPO_PUBLIC_API_BASE_URL` & `EXPO_PUBLIC_ADAPTER_MODE`.
   - Mengganti host backend (LoopBack 4 vs Express vs FastAPI) tidak menyentuh komponen layar `@edumotion/mobile`.
5. **Keamanan Mobile Client Publik:**
   - Tidak ada `JWT_SECRET`, credential database, maupun API key penyedia AI di dalam bundle `apps/mobile`.
   - Payload `QuestionStudentDelivery` tersanitasi di server (`toStudentDeliveryDto`) sehingga inspeksi traffic/bundle mobile tidak pernah melihat kunci jawaban maupun catatan penelaah.
6. **Ketahanan Jaringan Mobile:**
   - Timeout request dikendalikan `AbortController` (`8000 ms`).
   - Retry otomatis pada `createHttpClient` hanya berlaku untuk `GET` atau mutasi yang membawa `Idempotency-Key` eksplisit (misal autosave jawaban ujian & completion checkpoint), mencegah pemberian XP ganda saat koneksi seluler terputus-sambung.
