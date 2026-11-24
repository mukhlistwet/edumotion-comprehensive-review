# EduMotion — Admin & Akademi UI Reference

## 1. Platform Admin
Untuk operator EduMotion sebagai pemilik platform (bukan staf sekolah).
- Mengelola seluruh institusi/tenant, verifikasi, status dan paket.
- Mengelola akun lintas institusi, katalog kurikulum, bank soal global, dan publikasi konten.
- Mengelola paket, subscription, billing, entitlement, kuota AI.
- Memantau health sistem, antrean AI, audit log, keamanan dan konfigurasi global.
- Akses lintas tenant harus dibatasi, dicatat, dan memerlukan alasan untuk tindakan sensitif.

## 2. Portal Akademi / Sekolah
Satu portal multi-peran untuk staf di sebuah institusi. Role bukan hanya `school_admin`; sekolah dapat menetapkan beberapa jabatan:
- **School Owner / Yayasan**: pengaturan institusi, unit/cabang, paket dan laporan agregat.
- **Kepala Sekolah**: dashboard institusi, performa akademik, persetujuan dan laporan.
- **Wakil Kepala Sekolah / Kurikulum**: kalender akademik, struktur kelas, mapel, penugasan guru, asesmen dan laporan.
- **Admin Akademik / Tata Usaha**: data siswa, guru/staf, rombel, impor/ekspor, enrollment dan administrasi.
- **Guru**: kelas yang ditugaskan, materi, tugas, bank soal pribadi/sekolah, penilaian dan progres siswa yang diajar.
- **Wali Kelas**: data dan ringkasan siswa di rombel yang menjadi tanggung jawabnya.
- **Konselor / BK**: sinyal risiko belajar dan catatan tindak lanjut dengan akses terbatas.
- **Orang Tua**: hanya siswa yang ditautkan dan data yang diizinkan.

## 3. Prinsip permission
- Gunakan RBAC + scope berbasis organisasi, kelas, mata pelajaran, dan penugasan.
- Role adalah kumpulan permission; jangan hardcode menu berdasarkan nama role.
- Backend wajib memvalidasi permission dan tenant scope pada setiap request.
- Guru hanya melihat kelas/siswa yang ditugaskan; wali kelas hanya rombel tanggung jawabnya.
- Data sensitif siswa dibatasi, akses dicatat dalam audit log.
- Sediakan custom role dengan permission yang dapat dipilih oleh pemilik institusi sesuai batas kebijakan platform.

## 4. Catatan implementasi
File HTML menggunakan Tailwind CDN untuk preview. Implementasi produksi wajib menggunakan Tailwind build yang dipin versinya, token dari `design.md`, komponen reusable, route guard, dan permission-aware navigation. Seluruh angka/nama pada template adalah data dummy.
