# PARKIRIN

Aplikasi web informasi parkir kampus. Alurnya mengikuti flowchart:
Login NPM → Validasi → Pilih zona dan kendaraan → Check-in → Perbarui jumlah → Hitung indeks → Status dan rekomendasi → Check-out → Simpan → Selesai.

## Cara menjalankan (5 menit)

1. Ekstrak file zip ke `C:\Proyek\parkirin`.
2. Buka VS Code → **File → Open Folder** → pilih folder tersebut.
3. Pasang ekstensi **Live Server** (Ctrl+Shift+X).
4. Klik kanan `index.html` → **Open with Live Server**.
5. Login: isi **NPM** (hanya angka, minimal 15 digit) dan **Password yang sama dengan NPM**.

Penting: jangan buka `index.html` dengan klik ganda. Aplikasi memakai ES module, yang hanya jalan lewat alamat `http://` (Live Server).

Tes logika: buka `tes.html` lewat Live Server. Harus tertulis **18 dari 18 tes lulus**.

## Peta kode (untuk menjelaskan ke dosen)

| File | Peran | Padanan di flowchart / modul |
|---|---|---|
| `index.html` | Kerangka halaman | UI |
| `css/style.css` | Warna, tata letak, responsif HP | UI |
| `js/logika.js` | Rumus indeks, status, rekomendasi zona terdekat, validasi login | LOGIKA (kotak proses dan keputusan) |
| `js/app.js` | Membaca input, mengganti layar, memanggil logika | UI (kotak input/output) |
| `js/data.js` | Simpan dan ambil data (mode demo atau Firebase) | "Simpan Data" |
| `js/tes.js`, `tes.html` | Kriteria uji logika | TES |
| `js/firebase-config.js` | Pengaturan Firebase | Konfigurasi |
| `firestore.rules` | Aturan keamanan database | Keamanan |

Aturan emas: `logika.js` tidak boleh menyentuh HTML. Karena itu logika bisa dites tanpa membuka tampilan.

## Dua mode data

- **Mode demo (bawaan):** `FIREBASE_CONFIG = null`. Data tersimpan di browser sendiri. Cocok untuk mencoba dan presentasi offline.
- **Mode online (Firebase):** data zona dibagikan ke semua pengguna secara real-time, login memakai NPM dan password.

## Menghubungkan Firebase

1. Buka console.firebase.google.com → **Add project** → beri nama `parkirin` → (Google Analytics boleh dimatikan).
2. Menu **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
3. Menu **Build → Firestore Database → Create database** → pilih lokasi terdekat (mis. `asia-southeast2` Jakarta) → mulai dengan **production mode**.
4. Tab **Rules** di Firestore: hapus isinya, tempel isi file `firestore.rules`, klik **Publish**.
5. **Project settings** (ikon roda gigi) → **Your apps** → ikon web `</>` → daftarkan aplikasi → salin objek `firebaseConfig`.
6. Buka `js/firebase-config.js`, ganti `null` dengan objek tersebut (contohnya ada di komentar file).
7. Jalankan ulang Live Server. Subtitle di pojok atas berubah menjadi "Terhubung ke database". Login pertama kali otomatis membuat akunmu (password = NPM), lalu coba check-in.
8. Pertama kali ada yang login, data 4 zona dibuat otomatis di Firestore.

Catatan: `apiKey` Firebase memang boleh terlihat di kode web. Yang melindungi data adalah **aturan di firestore.rules**, jadi jangan lewati langkah 4.

Saat sudah dipublikasikan, tambahkan domain websitemu di **Authentication → Settings → Authorized domains**.

## Mempublikasikan agar bisa dibuka di HP

**Cara termudah: Netlify**
1. Buka app.netlify.com/drop.
2. Seret seluruh folder `parkirin` ke halaman itu.
3. Link `https://....netlify.app` muncul. Kirim lewat WA, buka di HP.
4. Mode Firebase: tambahkan domain Netlify ke Authorized domains (lihat di atas).

**Alternatif: GitHub Pages**
1. Unggah folder ke repo GitHub (Source Control di VS Code → Publish to GitHub).
2. Repo → **Settings → Pages → Deploy from a branch → main → / (root)**.
3. Link: `https://username.github.io/parkirin/`.

**Memasang di layar utama HP:** buka link di Chrome Android → menu ⋮ → **Tambahkan ke layar utama**.

## Keamanan yang sudah diterapkan

- Password tidak disimpan di kode kita. Ditangani Firebase Authentication (mode online).
- Data parkir tiap pengguna hanya bisa dibaca dan ditulis pemiliknya.
- Jumlah kendaraan hanya bisa berubah 1 per aksi dan tidak melewati kapasitas.
- Check-in dan check-out memakai transaksi, supaya tidak bentrok jika banyak orang bersamaan.
- Teks dari pengguna di-escape sebelum ditampilkan (mencegah penyisipan HTML).

## Batasan yang perlu kamu tahu (tulis jujur di laporan)

- Password sama dengan NPM hanya cocok untuk prototipe: siapa pun yang tahu NPM seseorang bisa masuk sebagai dia. NPM juga belum diverifikasi ke sistem resmi kampus. Solusi lanjutan: password buatan sendiri atau login akun kampus (SSO).
- Tidak ada validasi lokasi (GPS), sesuai flowchart.
- Pengguna yang lupa check-out membuat angka zona melebihi kenyataan. Solusi lanjutan: batas durasi otomatis (mis. 10 jam).
- Data zona awal (nama, kapasitas, isi) dan jarak antar zona (`JARAK`) hanyalah contoh. Ganti di `js/logika.js` dengan hasil survei kampusmu. Kalau mengubah ID zona di luar A-D, ubah juga `firestore.rules`.

## Bagian yang bisa kamu ubah sendiri

- Batas status: `BATAS_LENGANG` di `js/logika.js` (Penuh = 100%, Padat = di antaranya).
- Warna: variabel di bagian atas `css/style.css`.
- Aturan login: fungsi `validasiNpm` dan `validasiLogin` di `js/logika.js` (setiap perubahan, perbarui juga tes di `js/tes.js`).
