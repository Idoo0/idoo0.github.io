# Ridho Aditya Porto

Portfolio statis dengan editor konten lokal. Node.js 20+ diperlukan untuk admin; tidak ada dependency yang perlu di-install.

## Jalankan lokal

```powershell
npm start
```

- Portfolio: http://127.0.0.1:8765/
- Admin: http://127.0.0.1:8765/admin/

`npm start` memantau modul server dan otomatis memuat ulang server ketika kode validator atau daftar kategori berubah. Jika server sudah berjalan sebelum pembaruan ini, tekan **Ctrl+C** di terminal server lalu jalankan `npm start` kembali. Draft pada halaman admin tetap tersedia; klik **Save changes** lagi setelah server siap.

Server lama seperti `python -m http.server` harus dihentikan terlebih dahulu jika memakai port 8765. Untuk port lain, gunakan `$env:PORT = '8766'; npm start`.

## Mengedit konten

Portfolio memakai bahasa Inggris tanpa pilihan bahasa. Header menampilkan tombol suara dengan ikon speaker berukuran 20 px; garis miring muncul ketika suara dimatikan. Label suara tetap tersedia untuk pembaca layar dan tooltip.

Admin hanya membuka editor pada alamat loopback HTTP/HTTPS (`localhost`, `127.0.0.1`, atau `[::1]`) dengan API server lokal yang tersedia. Di hosting statis, alamat nonlokal, file langsung, atau server lokal tanpa API, halaman hanya menampilkan kotak **Access unauthorized**.

Pilih section di admin, edit form, lalu **Save changes**. File di `data/` langsung berubah di disk. Add, Hapus, dan tombol panah mengubah draft; perubahan baru disimpan setelah Save. Untuk Experience, Projects, dan Achievements, pilih item dari daftar lalu klik tombol **Hapus** di atas editor dan konfirmasi. **Reload** membaca ulang file. Tab **JSON** dapat mengedit seluruh isi file, termasuk field tambahan.

Foto dan logo dapat diunggah langsung lewat **Upload image / Replace image** pada setiap kolom gambar dan galeri. Preview tersedia untuk gambar lama maupun hasil upload. JPG, PNG, WebP, AVIF, dan GIF diterima, maksimal 25 MB; GIF memakai satu frame. Gambar diproses lokal di browser lalu ditulis sebagai WebP ke folder `assets/` yang sesuai. **Save changes** menyimpan path-nya ke JSON.

Logo dinormalisasi menjadi 256 × 256 tanpa memotong gambar, dengan padding transparan. Foto galeri maksimal 1920 × 1440, cover proyek 1600 × 1000, foto profil 1200 × 1600, dan latar hero 2880 × 1800. Foto mempertahankan rasio aslinya dan tidak diperbesar jika ukurannya sudah lebih kecil. File baru memakai nama unik; Replace / Clear / Remove tidak menghapus file gambar lama sehingga JSON backup tetap bisa dipulihkan.

Upload foto Experience dan foto utama Achievement juga membuat file `.preview.webp`, maksimal 480 × 480, dengan resize bertahap dan penajaman ringan. Kolase dan thumbnail kecil memakai preview ini; saat foto diklik, modal memuat foto ukuran penuh. Sertakan file preview bersama foto asli ketika mengunggah `assets/` ke GitHub. Foto lama tanpa preview tetap memakai sumber aslinya, dan path pada JSON tidak perlu diubah.

Pada **Kolase foto & link** di Experience, tiap item punya pilihan **Foto — preview**, **Link — redirect**, atau **GitHub — repo**. Mode Link memiliki URL tujuan dan label saat hover, misalnya “Project repo”; thumbnail memakai upload gambar yang sama. Klik item Link membuka URL di tab baru, sedangkan Foto membuka modal gambar. Foto lama tetap menggunakan mode Foto.

Urutkan kolase Experience dengan menahan pegangan **⠿** atau preview foto, lalu geser ke item tujuan. Pada layar sentuh gunakan pegangan; preview tetap bisa dipakai untuk scroll. Posisi dibaca dari kiri ke kanan, 1–3 (dari atas ke bawah di layar kecil). Pegangan juga mendukung panah kiri/kanan atau atas/bawah lewat keyboard. Mode, foto, URL, dan label berpindah bersama; klik **Save changes** untuk menyimpan urutannya.

Experience menampilkan lima pengalaman pertama saat dibuka. Klik **Show more** di bawah timeline untuk menambahkan lima pengalaman berikutnya; tombol hilang setelah seluruh hasil ditampilkan. Filter memakai kategori role seperti Software Engineer, AI/ML Engineer, Data Scientist, Data Analyst, Data Engineer, Leadership, dan Teaching. Pilih satu atau beberapa **Kategori role** di admin; kategori ini terpisah dari teks Posisi. Tombol **All roles** mencakup seluruh pengalaman dengan pagination yang sama. Pergantian role mengembalikan daftar ke lima item awal. Field `highlighted` lama tidak lagi dipakai untuk Experience. JSON lama tanpa `roles` masih dapat dibaca berdasarkan judul posisi.

Slot foto kosong tidak ditampilkan di portfolio. Experience dengan satu atau dua foto hanya menampilkan jumlah tersebut; jika semua slot kosong, kolase dan ruangnya hilang. Slot kosong tetap tersedia di admin untuk menambahkan foto. Item Link atau GitHub dengan URL valid tetap tampil.

Untuk repo, pilih **GitHub — repo** dan tempel URL seperti `https://github.com/username/project`. Thumbnail standar langsung muncul dan editor mengambil social preview repo secara otomatis, termasuk gambar khusus yang diatur pemilik repo. Label terisi `username/project` dan dapat diganti. Klik **Save changes** untuk menyimpan; jika preview masih dimuat, Save menunggunya terlebih dahulu. **Refresh thumbnail** mengambil ulang gambar. Repo harus publik untuk mengambil social preview. Jika koneksi gagal, thumbnail standar tetap digunakan; jika gambar tidak tersedia, kartu tetap menampilkan label dan dapat membuka repo. URL thumbnail disimpan di JSON sehingga portfolio tetap berjalan pada hosting statis.

CV dapat diunggah melalui **Contact → Upload CV** di admin: pilih PDF maksimal 25 MB, lalu klik **Save changes**. Path di `assets/documents/` dan nama file unduhan terisi otomatis. **Open CV** membuka file untuk diperiksa; **Replace CV** mengganti CV di draft, dan **Clear CV** menghapus link dari draft. File lama tetap tersedia untuk backup. Path atau URL publik juga dapat diisi manual. Sertakan PDF yang baru diunggah bersama `data/contact.json` saat push ke GitHub. Attachment lain tetap ditaruh di `assets/documents/`, lalu isi path relatif atau URL publik pada kolom link. Upload tidak memerlukan instalasi dependency tambahan.

Project menampilkan **Challenge and approach → What I worked on → The result & feature**. Hasil dan fitur proyek ditulis dalam satu kolom; gunakan baris berawalan `- ` untuk fitur dan baris kosong antarparagraf. Achievement menampilkan **Recognition** paling atas, lalu **The problem and approach → What I worked on → The result**. Admin dan modal memakai satu definisi bagian di `assets/js/detail-data.js`; isi diambil dari JSON. Challenge dan approach digabung dalam satu kolom. Galeri Project mendukung jumlah foto bebas melalui **+ Add photo**, sedangkan galeri Achievement mendukung 1–3 foto. Keduanya memiliki **Links & attachments**: klik **Add link**, tulis label tombol sendiri, lalu isi URL atau path attachment di `assets/documents/`.

Setelah **Save changes** pada Projects atau Achievements, tab portfolio pada alamat yang sama otomatis membaca ulang JSON dan memperbarui detail yang sedang terbuka. Pembaruan memakai event antar-tab, tanpa polling. Jika file JSON diedit langsung atau browser tidak mendukung BroadcastChannel, refresh halaman untuk membaca perubahan. Data detail lama juga ditampilkan dalam kolom gabungan admin dan disimpan dalam format baru saat kamu mengeditnya.

Project dibuka pada filter **Selected**. Centang **Tampilkan di Selected** di admin untuk memilih maksimal enam project. Kolom **Kategori** memakai dropdown Web, Mobile, AI/ML, Web3/Crypto, Data, dan IoT/Hardware; kategori yang dipilih menentukan filter di web. Setelahnya, **Jenis produk** ditulis bebas, misalnya Chatbot atau Dashboard analitik, dan tampil pada kartu serta modal. Jenis produk tidak menambah kategori filter. Dropdown status menyediakan Concept, Research, Experiment, In progress, Prototype, Alpha, Beta, Production, dan Archived. All serta filter kategori tetap mendukung Show more.

Satu versi sebelumnya disimpan di `admin/.backups/<nama>.json` sebelum setiap Save. Folder ini tidak disajikan oleh server dan diabaikan oleh Git. Untuk memulihkan, hentikan server lalu salin file backup ke file yang sesuai di `data/`.

Jika file diedit dari tempat lain setelah dibuka di admin, Save ditolak dengan pesan konflik. Reload data terbaru sebelum mencoba lagi. Perubahan yang belum disimpan akan diminta konfirmasi sebelum berpindah koleksi atau menutup halaman.

## Animasi dan performa

Hero dan mailbox tetap bergerak saat terlihat; animasinya dijeda otomatis di luar layar, saat tab disembunyikan, atau saat modal menutupi halaman. Ilustrasi role yang tidak aktif juga dijeda. Tekstur kertas memakai satu SVG kecil tanpa filter noise, dan latar hero bawaan memakai WebP 2304 × 1294; PNG asli tetap tersedia sebagai sumber.

Kolase Experience bergerak lewat `translate` selama 180 ms. Tinggi layout berubah sekali, tanpa animasi `height` / `top` per frame; ruang foto dipertahankan sampai gerakan menutup selesai. ResizeObserver mengukur isi detail hanya ketika ukurannya berubah. Semua efek tetap mengikuti `prefers-reduced-motion`.

## Struktur

```text
index.html                 Entry point
sections/                  HTML terpisah untuk tiap section, footer, dan modal
assets/css/portfolio.css   Style portfolio
assets/js/loader.js        Memuat section dan menunggu konten siap
assets/js/portfolio.js     Interaksi portfolio dan rendering JSON
assets/images/             Latar hero, foto profil, dan logo universitas
data/                      hero, about, experience, projects, achievements, contact JSON
admin/                     Halaman editor dan API penulisan lokal
docs/                      Seluruh dokumentasi Markdown, termasuk instruksi ini
server.mjs                 Server lokal
```

## Upload ke GitHub

Halaman `404.html` di root menjadi halaman error khusus GitHub Pages, dengan tombol **Back to home** menuju `/`. Sertakan file ini saat upload. Gaya dan teksnya berdiri sendiri tanpa JavaScript; path asset diawali `/` agar tetap benar pada URL salah yang bertingkat di situs `idoo0.github.io`. Jika dipindah ke situs subfolder repository, sesuaikan awalan path asset dan link berandanya. Server lokal juga menampilkan halaman ini dengan status HTTP 404 untuk navigasi browser ke alamat yang tidak ditemukan; endpoint API tetap mengembalikan JSON.

Setelah mengedit, unggah / commit JSON baru di `data/` beserta asset yang berubah. Untuk unggahan pertama setelah refactor ini, sertakan juga `index.html`, `sections/`, `assets/`, dan seluruh `data/`.

Portfolio tetap berjalan di hosting statis seperti GitHub Pages; tidak memerlukan server Node di hosting. Semua path mendukung situs pada subfolder repository. Halaman admin hanya dapat menyimpan ketika dibuka dari server lokal di atas. API tidak tersedia di GitHub Pages. Jangan upload `admin/.backups/`.

## Pesan commit

Semua pesan commit wajib mengikuti **Conventional Commits**. Tulis ringkasan dalam bahasa Inggris, gunakan kata kerja bentuk perintah, dan jelaskan perubahan secara spesifik tanpa titik di akhir.

Format:

```text
type(scope): description
```

Scope opsional; gunakan bila membantu menjelaskan bagian yang berubah, misalnya `portfolio`, `admin`, `contact`, `content`, atau `readme`.

- `feat`: fitur baru.
- `fix`: perbaikan bug atau perilaku yang salah.
- `docs`: perubahan dokumentasi.
- `style`: perubahan format kode tanpa perubahan perilaku; bukan otomatis untuk perubahan tampilan CSS.
- `refactor`: perubahan struktur kode tanpa menambah fitur atau memperbaiki bug.
- `test`: penambahan atau perubahan pengujian.
- `chore`: pemeliharaan, konfigurasi umum, atau pembaruan konten portfolio.
- `build`: perubahan proses build atau dependency.
- `ci`: perubahan workflow integrasi atau deployment otomatis.

Pilih type berdasarkan perubahan sebenarnya. Untuk perubahan yang memutus kompatibilitas, tambahkan `!` sebelum titik dua dan jelaskan dampaknya di body atau footer `BREAKING CHANGE:`.

Contoh untuk proyek ini:

```text
feat(portfolio): add personal portfolio website
feat(admin): add PDF upload for contact CV
fix(contact): open mailbox door to the left
docs(readme): introduce portfolio in English
chore(content): update featured projects and CV
chore(pages): add static publishing configuration
```

## Pemeriksaan

```powershell
npm test
```

Test memakai folder sementara, bukan data portofolio. Mencakup penulisan file, backup, validasi, konflik concurrent save, serta pembatasan endpoint lokal.
