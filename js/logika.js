// =====================================================
// LOGIKA (tanpa UI): rumus dan aturan aplikasi PARKIRIN
// File ini TIDAK boleh menyentuh HTML/DOM, supaya mudah dites.
// =====================================================

// Status zona dari indeks parkir (akumulasi / kapasitas):
//   di bawah 70% -> Lengang | 70% sampai kurang dari 100% -> Padat | 100% -> Penuh
export const BATAS_LENGANG = 0.7;

// Data awal zona (contoh). Ganti dengan hasil survei kampusmu.
// kap = kapasitas petak, isi = jumlah kendaraan saat ini.
// Sengaja dibuat berbeda: ada zona yang motornya penuh tapi mobilnya belum, dan sebaliknya.
export const ZONA_AWAL = [
  { id: "A", nama: "Zona A - Gerbang Utama", kap: { motor: 300, mobil: 80 }, isi: { motor: 300, mobil: 52 } },
  { id: "B", nama: "Zona B - RBFT", kap: { motor: 250, mobil: 60 }, isi: { motor: 205, mobil: 60 } },
  { id: "C", nama: "Zona C - Lapangan Upacara", kap: { motor: 200, mobil: 50 }, isi: { motor: 110, mobil: 44 } },
  { id: "D", nama: "Zona D - Musala Teknik", kap: { motor: 120, mobil: 30 }, isi: { motor: 96, mobil: 12 } },
];

// Jarak antar zona dalam meter (contoh, ukur ulang di kampusmu). Dipakai untuk rekomendasi zona terdekat.
export const JARAK = {
  A: { B: 150, C: 300, D: 450 },
  B: { C: 160, D: 280 },
  C: { D: 140 },
};

export function jarakAntar(a, b) {
  if (a === b) return 0;
  const j = (JARAK[a] && JARAK[a][b]) ?? (JARAK[b] && JARAK[b][a]);
  return j === undefined ? Infinity : j;
}

// Node "Akun valid?": NPM hanya angka, minimal 15 digit
export function validasiNpm(npm) {
  return /^\d{15,}$/.test(npm);
}

// Login berhasil jika NPM valid dan password sama dengan NPM
export function validasiLogin(npm, password) {
  return validasiNpm(npm) && password === npm;
}

// Node "Hitung Indeks Kepadatan Parkir": indeks = akumulasi / kapasitas
export function indeks(isi, kap) {
  if (kap <= 0) return 1;
  return isi / kap;
}

export function status(i) {
  if (i < BATAS_LENGANG) return "Lengang";
  if (i < 1) return "Padat";
  return "Penuh";
}

// Nama kelas CSS untuk warna status
export function kelasStatus(s) {
  return { Lengang: "ok", Padat: "warn", Penuh: "bad" }[s];
}

export function indeksZona(zona, jenis) {
  return indeks(zona.isi[jenis], zona.kap[jenis]);
}

export function sisa(zona, jenis) {
  return zona.kap[jenis] - zona.isi[jenis];
}

export function penuh(zona, jenis) {
  return sisa(zona, jenis) <= 0;
}

// Node "Rekomendasi Zona": zona TERDEKAT dari zona yang dipilih yang masih punya petak kosong
// untuk jenis kendaraan tersebut. Hasil: { zona, jarak } atau null jika semua penuh.
export function rekomendasiTerdekat(zonas, jenis, dariId) {
  const kandidat = zonas.filter((z) => z.id !== dariId && !penuh(z, jenis));
  if (kandidat.length === 0) return null;
  const t = kandidat.reduce((a, b) => (jarakAntar(dariId, b.id) < jarakAntar(dariId, a.id) ? b : a));
  return { zona: t, jarak: jarakAntar(dariId, t.id) };
}

// Mengubah milidetik menjadi teks durasi
export function formatDurasi(ms) {
  const menit = Math.max(1, Math.round(ms / 60000));
  const jam = Math.floor(menit / 60);
  return jam > 0 ? `${jam} jam ${menit % 60} menit` : `${menit} menit`;
}
