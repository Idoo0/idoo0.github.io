# Mengubah pengalaman

Edit `data/experience.json`, lalu refresh halaman portfolio. Jalankan `npm start` lalu buka `http://127.0.0.1:8765/`. Data berada di folder `data/`; bisa diedit juga dari `http://127.0.0.1:8765/admin/`.

Tambahkan objek baru ke array JSON. Contoh:

```json
{
  "id": "my-new-role",
  "title": "Software Engineer",
  "company": "Company name",
  "type": "Internship",
  "start": "2026-01",
  "end": "2026-06",
  "location": "Indonesia",
  "roles": ["Software Engineer"],
  "logo": "",
  "images": ["", "", ""],
  "summary": "Deskripsi singkat beserta pencapaian utama.",
  "details": [
    "Kontribusi pertama untuk Show details.",
    "Kontribusi berikutnya."
  ]
}
```

- `id`: gunakan nama unik untuk setiap pengalaman.
- `type`: teks badge pertama; bebas diubah menjadi Internship, Full-time, Part-time, atau tipe lain.
- `start` / `end`: format `YYYY-MM`. Isi `end` dengan `null` untuk posisi yang masih berjalan.
- Durasi dihitung otomatis dengan bulan mulai dan selesai ikut dihitung: Januari–Juni = 6 months.
- `roles`: kategori untuk filter role, misalnya `["Software Engineer", "AI/ML Engineer"]`. Pilih kategori di admin dari Software Engineer, AI/ML Engineer, Data Scientist, Data Analyst, Data Engineer, Leadership, dan Teaching. **All roles** mencakup seluruh pengalaman; lima item pertama tampil saat halaman dibuka. Klik **Show more** di bawah timeline untuk menambahkan lima item berikutnya. Pergantian role mengembalikan daftar ke lima hasil awal. Field `highlighted` lama tidak dipakai lagi.
- `logo`: isi dengan path WebP, misalnya `assets/company_icon/uniq.webp`, atau URL gambar. Logo yang sekarang dipakai berukuran seragam 256 × 256 px. Kosongkan untuk placeholder; gambar yang gagal dimuat juga menampilkan placeholder.
- `images`: 0–3 path gambar untuk kolase di kanan, misalnya `["assets/experience/uniq-1.webp", "assets/experience/uniq-2.webp"]`. Slot foto kosong diabaikan; satu atau dua foto hanya menampilkan satu atau dua bingkai. `[]`, field yang tidak diisi, atau semua slot kosong menyembunyikan kolase beserta ruangnya. Link dengan URL yang valid tetap tampil. Saat kolase turun ke bawah deskripsi, posisinya di tengah. Show details merenggangkan foto ke samping tanpa menambah tinggi kolase; pada layout dengan foto di kanan, foto tetap merenggang ke bawah mengikuti detail.
- `summary`: deskripsi yang selalu terlihat, termasuk angka pencapaian.
- `details`: bullet point yang hanya terlihat saat Show details dibuka. Isi `[]` bila tidak diperlukan.

Urutan otomatis berdasarkan tanggal selesai terbaru pada seluruh filter role. Posisi yang masih berjalan tampil pertama; jika tanggal selesai sama, tanggal mulai terbaru tampil lebih dahulu.

Di admin, tahan pegangan **⠿** atau preview foto lalu geser ke posisi tujuan untuk mengurutkan kolase dari kiri (1) ke kanan (3). Pada layar sentuh gunakan pegangan; pada keyboard fokuskan pegangan dan tekan panah kiri/kanan atau atas/bawah. Seluruh data item ikut berpindah, termasuk mode, URL, dan label. Klik **Save changes** untuk menyimpan urutan.

Klik foto pada kolase untuk membuka preview besar tanpa crop. Tutup dengan ×, Escape, atau klik di luar modal. Slot kosong tidak bisa diklik.

Setiap item kolase juga bisa memakai **mode Link**. Di admin, pilih **Link — redirect**, isi URL tujuan dan label saat hover, lalu upload thumbnail seperti biasa. Ikon redirect muncul di tengah; label muncul saat hover atau fokus keyboard. Klik membuka URL di tab baru, tanpa modal foto. Mode Foto tetap membuka preview gambar. Pilihan ini tersedia khusus pada kolase Experience.

Contoh satu foto dan satu tautan dalam kolase yang sama:

```json
"images": [
  { "mode": "photo", "src": "assets/experience/demo.webp", "alt": "Demo bersama tim" },
  {
    "mode": "link",
    "src": "assets/experience/repo-thumbnail.webp",
    "alt": "Thumbnail repositori proyek",
    "url": "https://github.com/username/project",
    "label": "Project repo"
  }
]
```

Thumbnail boleh dikosongkan agar tetap menampilkan bingkai placeholder dengan ikon link. Item berupa string atau objek lama `{src, alt}` tetap diperlakukan sebagai Foto. URL dan label tersimpan ketika berganti mode sehingga bisa dipakai kembali.

Untuk thumbnail repo otomatis seperti saat membagikan tautan di LinkedIn, pilih **GitHub — repo** di admin dan tempel URL repo publik. Label terisi otomatis dan bisa diubah. Editor mengambil social preview repo; **Refresh thumbnail** memperbaruinya. Klik **Save changes** setelah menambahkan repo. Kartu membuka GitHub di tab baru. Thumbnail tampil utuh tanpa crop.

Untuk mengedit langsung di JSON, `src` boleh kosong pada mode GitHub; portfolio menghitung URL thumbnail standar dari URL repo tanpa memerlukan server di hosting:

```json
"images": [
  {
    "mode": "github",
    "src": "",
    "url": "https://github.com/username/project",
    "label": ""
  }
]
```

Admin menyimpan URL social preview yang berhasil dimuat ke `src`. Repo private atau gambar yang gagal dimuat tetap memiliki kartu berlabel dan link repo, tetapi preview publiknya tidak tersedia.

Untuk menambahkan deskripsi aksesibel pada foto, setiap item `images` juga boleh berupa objek:

```json
"images": [
  { "src": "assets/experience/uniq-1.webp", "alt": "Demo recommendation system bersama tim UNIQ" },
  { "src": "assets/experience/uniq-2.webp", "alt": "Diskusi pengembangan chatbot" }
]
```
