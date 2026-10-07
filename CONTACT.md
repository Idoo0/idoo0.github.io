# Mengubah kontak

Buka **Contact** di admin lokal. Klik **Upload CV**, pilih PDF maksimal 25 MB, lalu **Save changes**. Path CV dan nama file unduhan otomatis terisi. Gunakan **Open CV** untuk memeriksa file, **Replace CV** untuk mengganti, atau **Clear CV** untuk menghapus link dari draft. File lama tetap disimpan agar backup dapat dipulihkan. Saat push ke GitHub, sertakan PDF baru di `assets/documents/` beserta `data/contact.json`.

Kontak juga bisa diubah langsung melalui `data/contact.json`, lalu refresh halaman.

- `email`: alamat email publik. Data awal diambil dari PDF LinkedIn yang kamu kirim. Tombol Email me membuka aplikasi email dengan subjek awal yang bisa diubah pengunjung.
- `linkedin`: URL profil LinkedIn.
- `github`: URL profil GitHub. Tombol tampil nonaktif jika kosong.
- `cv`: path CV, misalnya `assets/documents/ridho-aditya-cv.pdf`, atau URL CV yang sudah dihosting. Tombol Download CV muncul setelah field ini diisi. File lokal harus tersedia pada path tersebut.
- `cvFilename`: nama file saat mengunduh CV lokal.

Link LinkedIn dan GitHub dibuka di tab baru. CV lokal diunduh; CV dari situs lain dibuka di tab baru. Kotak surat bisa dibuka dengan klik, tap, Enter, atau Space. Back to top kembali ke hero.
