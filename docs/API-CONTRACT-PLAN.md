# Rencana Kontrak API EduMotion (`/api/v1`)

**Kontrak Kanonis:** [openapi-v1.yaml](file:///d:/Experimen/edumotion-comprehensive-review/contracts/openapi-v1.yaml) (OpenAPI `3.0.3`, versi `1.0.0`)  
**Skema Data Terkait:** [journey-view-v1.schema.json](file:///d:/Experimen/edumotion-comprehensive-review/contracts/journey-view-v1.schema.json), [question-authoring-v1.schema.json](file:///d:/Experimen/edumotion-comprehensive-review/contracts/question-authoring-v1.schema.json), [question-student-delivery-v1.schema.json](file:///d:/Experimen/edumotion-comprehensive-review/contracts/question-student-delivery-v1.schema.json)

---

## 1. Prinsip Desain & Portabilitas Kontrak

1. **Netral Teknologi Backend & Database:** Seluruh endpoint berada di bawah prefix `/api/v1` memakai JSON UTF-8 dan HTTP status code standar. Tidak ada field ORM internal LoopBack, model relation directive, atau query string khusus database yang boleh disyaratkan oleh FE.
2. **Satu Kontrak untuk Web dan Mobile:** Kedua permukaan (`@edumotion/web` dan `@edumotion/mobile`) mengonsumsi DTO dan endpoint yang sama melalui `@edumotion/services`. Tidak ada endpoint yang mengasumsikan cookie browser, `window.location`, atau HTML redirect server-side.
3. **Standard Error Envelope:**
   ```json
   {
     "error": {
       "code": "STRING_ENUM_CODE",
       "message": "Pesan aman bagi pengguna",
       "details": {},
       "fieldErrors": { "field": "pesan" },
       "correlationId": "uuid"
     }
   }
   ```
4. **Korelasi, Paginasi, Filter, & Sort:**
   - Setiap request dapat membawa `X-Correlation-ID` (server menghasilkan UUID bila absen dan mengembalikan header `X-Correlation-ID` yang sama pada response serta mencatatnya ke log/audit).
   - Koleksi besar memakai query `page`, `pageSize`, `search`, `status`, `type`, `subjectId`, `sort`, serta amplop `{ items, pagination: { page, pageSize, totalItems, totalPages } }`.

## 2. Semantik Autentikasi, Idempotency & Konkurensi

| Mekanisme | Aturan Kontrak Wajib |
|---|---|
| **Token Auth (Bearer)** | Access token JWT/HMAC berumur pendek (`15 menit`) dikirim via `Authorization: Bearer <token>`. Refresh token acak dikirim ke `POST /auth/refresh` dan dirotasi setiap pemakaian (`auth_refresh_tokens`); logout (`POST /auth/logout`) mencabut refresh token segera. |
| **Idempotency-Key** | Wajib/didukung pada `POST /journeys/{journeyId}/nodes/{nodeId}/complete`, `POST /journeys/{journeyId}/chapters/next`, `POST /activities/{activityId}/attempts`, `POST /questions/{questionId}/publish`, `POST /assessments/{assessmentId}/sessions`, `PUT /assessment-sessions/{sessionId}/responses/{questionSnapshotId}`, `POST /assessment-sessions/{sessionId}/submit`, dan `POST /me/quests/{questId}/claim`. Kunci dideduplikasi di tabel `idempotency_records(scope_key, idempotency_key)` dalam transaksi database. |
| **Immutability & Optimistic Integrity** | `PUT /journeys/chapters/{chapterId}/snapshot` secara eksplisit mengembalikan `409 CHAPTER_TEMPLATE_IMMUTABLE`. `PATCH /questions/{questionId}` pada status `published` mengembalikan `409 PUBLISHED_QUESTION_IMMUTABLE`. Pengeditan konten terbit wajib melalui `POST /questions/{questionId}/new-version`. |
| **Timer & Snapshot Ujian** | `serverNowMs`, `startedAt`, `expiresAt`, dan `remainingSeconds` dihitung dari jam server. Permintaan `PUT /responses/...` setelah `serverNow > expiresAt` mengembalikan `409 SESSION_EXPIRED`. |
| **Upload & Media (`POST /question-media/presign`)** | Menegakkan allowlist MIME/ekstensi, validasi magic bytes (`415 UNSAFE_OR_UNSUPPORTED_MEDIA`), batas ukuran `<= 10 MB` (`413 FILE_TOO_LARGE`), batas dimensi `<= 4096×4096`, dan menghasilkan randomized `storageKey`. |
| **Outbox Event Contract** | Mutasi konsekuensial menulis event berversi (`eventVersion: 1`, `correlationId`, tanpa answer key/secret/PII berlebihan) ke tabel transaksional `outbox_events` sesuai 14 nama event kanonis pada `API-AND-EVENT-CONTRACTS.md`. |

## 3. Kebijakan Versioning & Kompatibilitas Mundur
- Perubahan aditif (field opsional baru pada response DTO) bersifat kompatibel dalam `/api/v1`.
- Perubahan memecah kontrak (menghapus/mengubah tipe field wajib atau status code) dilarang di `/api/v1` dan wajib menaikkan prefix ke `/api/v2`.
- Uji kompatibilitas otomatis dijalankan terhadap spesifikasi `contracts/openapi-v1.yaml` pada host LoopBack 4 maupun host alternatif Express.
