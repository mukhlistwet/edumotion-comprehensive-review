# EduMotion Interactive Learning UI Gallery

## Isi referensi
Satu halaman playground yang memuat 12 pola soal:
1. Single choice
2. Multiple select
3. True/false
4. Numeric input + unit
5. Fill in the blank
6. Matching
7. Ordering / reorder
8. Graph plotting
9. Diagram-based geometry
10. Physics parameter simulation
11. Formula/expression input
12. Worked solution / essay

## Produk dan mode
- Practice / lesson: hint dan feedback langsung, XP dan hearts dapat digunakan sesuai aturan.
- Challenge: konfigurasi timer, hint, hearts dan XP per challenge.
- Placement test: tanpa hearts; hasil dipakai untuk menentukan titik awal learning path.
- Tryout/UTS/UAS: server-authoritative timer, autosave, immutable question snapshot, no hearts, no XP affecting grade, feedback sesuai release policy.
- Teacher review: rubric, anotasi, status review, dan audit trail untuk jawaban uraian.

## Komponen frontend
- `LearningActivityShell`: layout activity dan responsive shell.
- `ActivityHeader`: subject, title, progress, timer, exit confirmation.
- `QuestionRenderer`: resolver berbasis `question.type`.
- `QuestionMedia`: formula, image, graph, diagram, simulation.
- `AnswerControl`: input adapter untuk tiap tipe.
- `HintPanel`, `FeedbackPanel`, `QuestionNavigator`.
- `SessionAutosave`, `SessionSubmit`, `ResultSummary`.
- Per-type renderer: `SingleChoice`, `MultiSelect`, `TrueFalse`, `Numeric`, `FillBlank`, `Matching`, `Ordering`, `GraphPlot`, `DiagramLabel`, `Simulation`, `FormulaInput`, `WorkedSolution`.

## Kontrak question
Question payload minimal:
`id`, `version`, `type`, `subjectId`, `topicId`, `competencyIds`, `difficulty`, `stem`, `instruction`, `media[]`, `interaction`, `answerSpec`, `hint`, `solution`, `feedback`, `scoring`, `accessibility`, `metadata`.
Jangan kirim `answerSpec`, `solution`, atau feedback sebelum release time pada asesmen formal. AI menghasilkan structured JSON, bukan executable JS. Validasi schema, cek matematika/fisika, dan lakukan approval sebelum publish.

## Integrasi visual/math
- KaTeX: formula display.
- MathLive: formula input.
- JSXGraph / Plotly: grafik dan geometri.
- SVG / Konva: diagram interaktif.
- Three.js + Rapier: visualisasi 3D dan simulasi.
- Math.js untuk kalkulasi numerik; symbolic math melalui service terisolasi (mis. SymPy).

## Aturan UX
- Stem harus self-contained, menyertakan satuan, kondisi, presisi, dan asumsi.
- Opsi jawaban seimbang dan tidak memberi petunjuk tidak sengaja.
- Feedback menjelaskan konsep dan proses, bukan hanya label benar/salah.
- Semua drag/reorder memiliki alternatif keyboard/tombol.
- Grafik dan diagram menyediakan label, satuan, kontras, dan alternatif aksesibel.
- Mobile: satu kolom, tombol sentuh memadai, media dapat zoom/scroll.
- Ujian: timer dan status sesi ditentukan server; autosave idempotent; final submit mengunci jawaban.

## Catatan demo
HTML menggunakan Tailwind CDN, data ilustratif, dan interaksi frontend untuk menunjukkan pola. Validasi jawaban, timer, dan penyimpanan bukan backend produksi. Implementasi final mengikuti design tokens pada `design.md` dan menggunakan Tailwind build lokal; tidak menggunakan native CSS untuk styling komponen.
