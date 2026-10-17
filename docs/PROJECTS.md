# Mengubah proyek

`data/projects.json` berisi 30 proyek: 27 dari daftar Notion, ditambah CORA, YUDHA, dan Kawanua TumouTou. Socratix dan Socratix v2 digabung menjadi satu proyek **Socratix**, dengan narasi perkembangan dari guided learning dan visualisasi menjadi tutor multi-agent. Selected menampilkan maksimal enam proyek dengan `selected: true`. Semua filter diurutkan berdasarkan bulan selesai terbaru. Proyek lainnya muncul melalui All dan filter kategori.

Judul, role, periode, tech stack, dan link mengikuti metadata Notion. Isi modal dilengkapi dari repository, demo, video proyek, serta informasi proyek yang sudah ada di `data/experience.json`. Lampiran Colab yang meminta login, dua repository desa yang mengembalikan 404, dan entri tanpa lampiran dilengkapi dengan draf berdasarkan judul/metadata. Review deskripsi, status, serta kontribusi pribadi sebelum menerbitkan portfolio.

Setiap proyek memiliki `source` untuk catatan asal data: `notionPage`, `notionId`, `notionTitle`, `attachmentRead`, `note`, dan `draftFields`. Entri baru dari GitHub memakai `repository`, `revision`, dan `references`. `draftFields` mencatat bagian yang perlu ditinjau; `attachmentRead: true` berarti ada bagian lampiran yang dibaca, bukan seluruh perilaku proyek sudah diuji. Jika ada, `supportingExperience` menunjuk data pengalaman yang mendukung angka atau konteks proyek. Field ini tidak tampil pada kartu/modal, tetapi tetap dipertahankan saat menyimpan lewat admin.

Cover dan galeri kosong memakai ilustrasi yang sudah ada dan menyembunyikan galeri. CORA memakai header asli repository dan YUDHA memakai artwork asli landing page, keduanya dikonversi ke WebP; Socratix memakai cover yang sudah ada. Tidak ada thumbnail baru yang dibuat dari AI. Proyek Automatic Waste Sorting memakai jenis produk Embedded / IoT dan `categories: ["IoT/Hardware"]`; terlihat pada filter IoT/Hardware dan All. Filter Game berisi ArusBiru, CORA, dan YUDHA.

Periode CORA **May–Jul 2026** dan YUDHA **Mar–Sep 2026** mengikuti tanggal yang diberikan. Socratix memakai periode gabungan **Aug 2025–Jun 2026**, dari bulan mulai iterasi pertama hingga bulan selesai iterasi kedua. Status CORA Prototype (Devnet), Socratix Prototype, dan YUDHA Beta (landing page menyebut Open Beta). Socratix memakai role dari iterasi pertama; role CORA dan YUDHA dikosongkan sampai dikonfirmasi. Kontribusi pribadi masih berupa draf yang bisa disesuaikan di admin. Socratix menyertakan video proyek pertama, source code, dan Technical roadmap (`assets/documents/socratix-v2-roadmap.pdf`); sumber kedua iterasi disimpan dalam `source.iterations`. Proposal Smart-Hybrid Katingting adalah proyek berbeda, sehingga tidak dipakai untuk ketiga entri ini.

**Kawanua TumouTou** berfokus pada pengabdian masyarakat Genera-Z Berbakti di Pulau Derawan pada **3–31 Juli 2025**: edukasi kesehatan dan gizi, praktik kebersihan di sekolah, diskusi bersama warga, aktivitas fisik bersama, serta kepedulian lingkungan. Laporan akhir mendukung konteks kegiatan; 20 program dan SROI 2,64 adalah hasil keseluruhan tim. Role ditulis Community Service Team Member. Entri memakai status Archived untuk program lapangan yang selesai, foto bersih pantai sebagai cover, dan lima foto kegiatan masyarakat. Empat foto edukasi dan diskusi diekstrak dari laporan dan dikonversi ke WebP. Link yang ditampilkan adalah pitch deck; tech stack dan kategori teknologi dikosongkan. Entri muncul di All karena enam slot Selected sudah terisi. Laporan asli menjadi sumber internal karena memuat kontak dan nomor identitas pribadi.

- `id`: nama unik untuk setiap proyek.
- `title`, `year`, `role`: judul dan informasi yang muncul pada kartu atau modal.
- `start`, `end`: bulan mulai dan selesai, format `YYYY-MM`, misalnya `"2025-01"` dan `"2025-12"`. Periode tampil di bawah judul kartu dan pada **Period** di modal sebagai **Jan 2025 – Dec 2025**. Edit melalui **Bulan mulai** / **Bulan selesai** di admin. Bulan selesai kosong atau `null` tampil sebagai **Present** jika bulan mulai diisi. Tanggal selesai tidak boleh mendahului tanggal mulai. Jika belum ada periode, web tetap memakai `year`.
- `categories`: **Kategori** untuk filter project, misalnya `["AI/ML", "Web"]`. Pilih satu atau beberapa lewat dropdown admin: `Web`, `Mobile`, `AI/ML`, `Web3/Crypto`, `Data`, `IoT/Hardware`, atau `Game`. Hapus pilihan lewat tombol × pada label.
- `category`: **Jenis produk**, kolom teks bebas setelah Kategori di admin, misalnya `Chatbot`, `Dashboard analitik`, atau `Aplikasi mobile`. Tampil pada kartu dan modal; tidak menentukan filter. Nama key JSON ini tetap `category` agar data yang sudah ada bisa dipakai.
- `status`: pilih lewat dropdown: `Concept` (masih ide), `Research` (penelitian), `Experiment` (eksplorasi / tes model), `In progress` (sedang dikerjakan), `Prototype` (demo awal), `Alpha` (uji internal), `Beta` (uji pengguna), `Production` (sudah digunakan), atau `Archived` (tidak aktif).
- `selected`: `true` untuk tampil pada Selected, `false` untuk hanya tampil di All / kategori. Maksimal enam project boleh dipilih. Centang **Tampilkan di Selected** di admin. Semua filter diurutkan dari `end` terbaru; proyek yang masih berjalan tampil pertama, lalu tanggal mulai terbaru jika tanggal selesai sama. Tahun menjadi fallback jika periode belum lengkap. Data tanpa tanggal/tahun tampil terakhir.
- `summary`: deskripsi pendek pada kartu.
- `challengeApproach`: masalah dan pendekatan dalam satu bagian **Challenge and approach**. Pisahkan paragraf dengan satu baris kosong.
- `contributions`: daftar kontribusi pribadi untuk **What I worked on**.
- `result`: satu kolom **The result & feature** untuk hasil dan fitur proyek. Pisahkan paragraf dengan satu baris kosong dan awali setiap fitur dengan `- ` untuk menampilkan daftar. Field kosong tidak ditampilkan. Data lama `features` otomatis digabung ke kolom ini saat dibaca oleh admin.
- `tech`: daftar tech stack. Kartu menampilkan tiga yang pertama, modal menampilkan semuanya.
- `illustration`: cover bawaan. Pilihan: `vision`, `agent`, `recommendation`, `pipeline`, `backend`, `analytics`.
- `cover`: path gambar cover, misalnya `assets/projects/leaflens-cover.webp`. Kosongkan untuk ilustrasi bawaan. Gambar yang gagal dimuat kembali menggunakan ilustrasi.
- `images`: daftar screenshot / foto untuk detail. Tambahkan foto sebanyak yang diperlukan melalui **+ Add photo** di admin. Isi `""` untuk placeholder, atau `[]` untuk menyembunyikan galeri.
- `links`: daftar tombol dengan label bebas dan URL, misalnya Pitch deck, Live demo, Source code, atau Paper. Tambah / hapus lewat **Links & attachments → Add link** di admin. `[]` menyembunyikan tombol. URL kosong menjadi placeholder nonaktif; nama tombol tetap wajib diisi. Link dibuka di tab baru.

Contoh link tambahan dan file lokal:

```json
"links": [
  { "label": "Pitch deck", "url": "assets/documents/leaflens-pitch-deck.pdf" },
  { "label": "Source code", "url": "https://github.com/your-account/your-project" }
]
```

Taruh attachment di `assets/documents/`, lalu isi path relatif dari root portfolio. Gunakan URL http/https untuk file eksternal. Nama file dengan spasi bisa ditulis dengan `%20`.

Contoh gambar dengan deskripsi aksesibel:

```json
"images": [
  { "src": "assets/projects/leaflens-upload.webp", "alt": "Halaman upload foto daun" },
  { "src": "assets/projects/leaflens-result.webp", "alt": "Hasil klasifikasi kesehatan tanaman" }
]
```

Urutan kartu di Selected, All, dan kategori mengikuti bulan selesai terbaru tanpa mengubah pilihan item atau array JSON. Sorting dilakukan sebelum pagination agar Show more melanjutkan urutan yang sama. Klik kartu untuk membuka detail; tutup modal lewat tombol silang, Escape, atau klik di luar modal.

Klik gambar cover atau foto galeri untuk membuka preview besar tanpa crop. Tombol kaca pembesar menandai foto yang bisa dibuka. Jika preview dibuka dari detail proyek, menutupnya mengembalikan fokus ke foto dan detail proyek tetap terbuka. Placeholder kosong tidak bisa diklik.

Modal dan admin memakai urutan **Challenge and approach → What I worked on → The result & feature** dari satu definisi. Isi seluruh bagian berasal dari JSON. Save di admin otomatis memperbarui tab portfolio pada alamat yang sama, termasuk modal yang sedang terbuka. Field lama `challenge` + `approach` / `solution` dimuat sebagai satu kolom gabungan agar isinya bisa diedit lewat form. Hasil dan fitur juga disimpan bersama sebagai teks `result`; kolom `features` terpisah tidak digunakan lagi.

Daftar awal membuka **Selected** dan hanya menampilkan project dengan `selected: true`, maksimal enam. Tombol filter berurutan **Selected → All → Web → Mobile → AI/ML → Web3/Crypto → Data → IoT/Hardware → Game**.

Pada All dan filter kategori, daftar dimulai dari enam proyek. Tombol **Show more** di bawah daftar menambahkan enam proyek berikutnya dan hilang setelah semuanya tampil. Saat mengganti filter, daftar kembali dimulai dari enam proyek pertama. Selected tidak memiliki Show more karena dibatasi enam.

Filter `All` mencakup seluruh proyek. Kategori yang belum berisi proyek menampilkan pesan kosong. Jika `categories` kosong, proyek tetap muncul di All dan di Selected jika dipilih.
