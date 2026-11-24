# EduMotion — Quiz & Question UI Specification

## Tujuan dan mode
Standar ini berlaku untuk lesson practice, latihan mandiri, daily challenge, placement test, tryout, UTS, dan UAS. Mengikuti `design.md`: Nunito Sans/Nunito, brand green `#58CC02`, ink `#172B4D`, sky `#1CB0F6`, violet `#A560E8`, amber `#FF9600`, spacing 4px, radius 12–24px, Tailwind CSS.

| Fitur | Practice | Challenge | Tryout / UTS / UAS |
|---|---|---|---|
| Timer | Opsional | Sesuai aturan | Wajib; server-authoritative |
| Hearts | Bisa | Configurable | Tidak ada |
| XP | Boleh | Boleh | Tidak memengaruhi nilai |
| Hint | Boleh | Configurable | Biasanya nonaktif |
| Pembahasan | Per soal | Per soal/sesi | Sesuai release policy |
| Revisit | Ya | Configurable | Sesuai aturan ujian |
| Autosave | Wajib | Wajib | Wajib, idempotent |

## Struktur layar
1. Top bar: nama aktivitas, progress, timer (bila berlaku), exit confirmation.
2. Metadata: subject, topic, competency, difficulty, question type.
3. Question stem: instruksi ringkas, lengkap, mandiri.
4. Media area: formula, gambar, tabel, grafik, diagram atau simulasi.
5. Answer renderer sesuai `type`.
6. Hint tersembunyi sampai diminta; tidak membocorkan jawaban.
7. Feedback: status, alasan, langkah penyelesaian, remedial link.
8. Navigation: previous/next, skip, bookmark, question map.
9. Result: skor, mastery per kompetensi, rekomendasi review; XP hanya untuk mode yang mengizinkan.

## Jenis soal yang perlu didukung
- `single_choice`: tepat satu jawaban.
- `multiple_select`: pilih semua jawaban benar.
- `true_false`: pernyataan utuh yang dapat diverifikasi.
- `numeric`: angka dengan unit, toleransi, presisi dan aturan desimal.
- `short_text`: jawaban teks singkat dengan normalisasi terkontrol.
- `fill_blank`: satu atau lebih slot kosong pada teks atau rumus.
- `matching`: pasangkan dua himpunan.
- `ordering`: susun urutan langkah/proses/besaran.
- `drag_drop`: tempatkan objek atau label ke target.
- `graph_plot`: plot titik, garis, atau kurva.
- `formula_input`: ekspresi matematika; MathLive untuk input.
- `diagram_label`: label bagian diagram.
- `simulation`: ubah parameter simulasi 2D/3D lalu jawab dari observasi.
- `worked_solution`: uraian/langkah penyelesaian, rubric/manual/AI-assisted review.

## Renderer dan pola interaksi
- Pilihan: full-width selectable cards, state default/selected/locked/correct/incorrect.
- Multiple select: checkbox dan instruksi eksplisit “Pilih semua”.
- Numeric: input angka dan unit terpisah; aturan pembulatan terlihat.
- Formula: KaTeX untuk display, MathLive untuk input.
- Graph: sumbu, grid, label, satuan; sediakan keyboard/table fallback.
- Matching/order: drag harus punya alternatif keyboard-accessible.
- Diagram: target cukup besar untuk layar sentuh.
- Simulation: kontrol parameter, satuan, batas nilai, reset, pause/run. Tidak pernah menjalankan kode hasil generasi AI.
- Semua soal harus dapat digunakan pada layar mobile; media lebar diberi zoom/scroll atau representasi alternatif.

## Feedback dan mastery
Jangan hanya menampilkan “Benar/Salah”. Tampilkan alasan, konsep, kalkulasi/langkah yang benar, dan rekomendasi lesson untuk kompetensi yang belum dikuasai. Mastery dihitung per competency dari akurasi, kesulitan, konsistensi, dan retensi. XP ledger terpisah dari nilai akademik.

## Kontrak data konseptual
Question: `id`, `version`, `subjectId`, `topicId`, `competencyIds`, `type`, `difficulty`, `stem`, `media[]`, `interaction`, `options[]` atau `answerSpec`, `hint`, `solution`, `feedback`, `scoring`, `accessibility`, `metadata`.
- Validasi payload dengan JSON Schema + AJV.
- Simpan versi soal. Assessment harus memakai immutable question snapshot.
- Jangan kirim `correctAnswer`, `solution`, atau feedback sebelum waktu rilis.
- AI menghasilkan structured JSON saja; lakukan schema validation, verifikasi matematika/fisika, dan human review sebelum publish.
- Renderer dipisah per jenis soal, bukan satu komponen raksasa.

## State dan keamanan sesi
`unseen → viewed → answered → submitted → graded → reviewed`
- Autosave dengan idempotency key.
- Server menjadi sumber kebenaran timer dan status sesi ujian.
- Reconnect harus sinkron berdasarkan revision/version.
- Final submit mengunci jawaban.
- Cegah double submit dan sediakan retry/error state.
- Ujian formal tidak memakai hearts dan XP tidak memengaruhi nilai.

## Komponen frontend yang disarankan
`QuizSessionShell`, `QuestionRenderer`, `QuestionNavigator`, `AnswerInput`, `HintPanel`, `FeedbackPanel`, `QuizResultSummary`.
Renderer: `SingleChoiceQuestion`, `MultiSelectQuestion`, `TrueFalseQuestion`, `NumericQuestion`, `ShortTextQuestion`, `OrderingQuestion`, `MatchingQuestion`, `GraphPlotQuestion`, `FormulaInputQuestion`, `SimulationQuestion`.

## Implementasi
React + Vite + JavaScript/JSX, Tailwind CSS. Shared business logic berada di domain layer, bukan komponen presentational. KaTeX, MathLive, JSXGraph/Plotly, SVG/Konva, Three.js sesuai kebutuhan. Styling produksi wajib Tailwind utility/design token; jangan gunakan native CSS untuk styling komponen. HTML demo ini memakai CDN dan data dummy hanya untuk preview.
