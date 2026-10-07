# Mengubah prestasi

Edit `data/achievements.json`, lalu refresh halaman, atau gunakan halaman admin. Tiga kartu utama memakai tiga entri pertama dengan `highlighted: true`. Kartu utama dan prestasi lainnya masing-masing diurutkan dari bulan perolehan terbaru saat ditampilkan; array JSON tidak perlu diurutkan sendiri.

Judul, pengakuan, issuer, tahun, dan level mengikuti Notion. Prestasi LIDM, Satria Data, dan GEMASTIK yang tercatat pada level **University** diberi label jelas sebagai prestasi tingkat universitas. Notion tidak memuat narasi detail atau sertifikat; deskripsi kontribusi dan pendekatan yang belum dijelaskan dibuat sebagai draft singkat. Informasi NEUROKIT, Genera-Z, Bangkit, dan Home Credit dilengkapi dari data experience yang sebelumnya diambil dari CV.

- `date`: bulan dan tahun perolehan, format `YYYY-MM`, misalnya `"2025-11"`. Ditampilkan sebagai **Nov 2025** di bawah judul kartu/baris dan pada **Awarded** di modal. Edit lewat **Bulan & tahun perolehan** di admin. Field ini dipakai untuk mengurutkan seluruh prestasi, termasuk Selected. Nilai kosong diperbolehkan; `year` menjadi fallback. Tanggal diperlakukan sebagai bulan kalender tanpa konversi timezone. Tanggal perolehan bisa berbeda dari awal pengalaman kerja/program.
- `source`: catatan asal data, judul asli Notion, tanggal asli, level, dan referensi experience. `source.draftFields` mencatat kolom yang perlu kamu periksa. Metadata ini tidak tampil di web dan dipertahankan saat Save di admin.
- Foto, sertifikat, dan logo yang diunggah lewat admin tetap dipakai. Jika gambar kosong, ilustrasi bawaan digunakan. Link proyek yang diberi label presentasi/source code tidak dianggap sertifikat penghargaan.

- `id`: nama unik.
- `title`, `category`, `issuer`, `year`, `recognition`: judul, jenis prestasi, pemberi penghargaan, tahun, dan pengakuannya. Tahun kosong tidak ditampilkan.
- `highlighted`: `true` untuk kartu besar. Maksimal tiga prestasi pertama dengan nilai `true` tampil besar; semua sisanya tetap muncul sebagai baris foto — prestasi — issuer.
- `summary`: deskripsi singkat pada kartu besar dan modal.
- `recognition`: ditampilkan di panel informasi sebelah kanan modal, bersama issuer dan tahun. Jika kosong, barisnya disembunyikan.
- `problemApproach`: isi **The problem and approach**, masalah dan pendekatannya. Pisahkan paragraf dengan satu baris kosong.
- `contributions`: daftar kontribusi untuk **What I worked on**.
- `result`: hasil untuk **The result**. Bagian kosong tidak ditampilkan.
- `image`: foto atau sertifikat, misalnya `assets/achievements/pimnas.webp`. Kosong atau gagal dimuat akan memakai ilustrasi bawaan.
- `imageAlt`: deskripsi singkat gambar untuk aksesibilitas.
- `illustration`: ilustrasi bawaan, pilihan `medal`, `trophy`, `certificate`, atau `community`.
- `issuerLogo`: path logo kecil pada kartu utama, baris prestasi lainnya, dan modal, di samping nama issuer. Boleh kosong; nama issuer tetap ditampilkan jika logo tidak tersedia atau gagal dimuat.
- `images`: galeri yang sama seperti proyek, maksimal tiga foto. Isi path gambar atau object `{ "src": "assets/achievements/photo.webp", "alt": "Deskripsi foto" }`. `""` menjadi placeholder; `[]` menyembunyikan galeri.
- Klik foto utama atau galeri untuk membuka preview besar tanpa crop. Tutup lewat ×, Escape, atau klik di luar modal. Detail prestasi tetap terbuka saat preview ditutup; placeholder kosong tidak bisa diklik.
- `links`: daftar attachment dengan label bebas. Tambah / hapus lewat **Links & attachments → Add link** di admin. Bisa URL http/https atau file lokal di `assets/documents/`. `[]` menyembunyikan tombol; URL kosong menjadi placeholder nonaktif.

```json
"links": [
  { "label": "Certificate", "url": "assets/documents/pimnas-certificate.pdf" },
  { "label": "Announcement", "url": "https://example.com/award-announcement" }
]
```

Simpan foto di `assets/achievements`. Kartu utama dan daftar lainnya masing-masing diurutkan berdasarkan `date` terbaru, dengan urutan JSON sebagai penentu jika bulannya sama. Entri yang hanya memiliki `year` ditempatkan setelah entri dengan bulan lengkap pada tahun yang sama; entri tanpa tanggal maupun tahun diletakkan terakhir. Modal bisa ditutup lewat silang, Escape, atau klik di luar modal.

Modal menampilkan **The problem and approach → What I worked on → The result**, sesuai kolom admin. **Awarded** dan **Recognition** muncul di panel informasi sebelah kanan. Isi berasal dari JSON. Save di admin otomatis memperbarui tab portfolio pada alamat yang sama, termasuk tanggal, urutan daftar, dan modal yang sedang terbuka. Data lama `overview` / `details` juga bisa diedit melalui kolom baru.
