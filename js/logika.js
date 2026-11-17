
export const BATAS_LENGANG = 0.7; 
export const BATAS_PENUH = 0.9;

export const ZONA_AWAL = [
  { id: "A", nama: "Zona A · Gerbang Utama", kap: { motor: 300, mobil: 80 }, isi: { motor: 290, mobil: 76 } },
  { id: "B", nama: "Zona B · Samping Fak. Teknik", kap: { motor: 250, mobil: 60 }, isi: { motor: 205, mobil: 49 } },
  { id: "C", nama: "Zona C · Perpustakaan", kap: { motor: 200, mobil: 50 }, isi: { motor: 110, mobil: 28 } },
  { id: "D", nama: "Zona D · Belakang Kampus", kap: { motor: 400, mobil: 100 }, isi: { motor: 160, mobil: 40 } },
];

export function validasiNim(nim) {
  return /^\d{10}$/.test(nim);
}

export function validasiPassword(pw) {
  return typeof pw === "string" && pw.length >= 6;
}

export function indeks(isi, kap) {
  if (kap <= 0) return 1;
  return isi / kap;
}

export function status(i) {
  if (i < BATAS_LENGANG) return "Lengang";
  if (i < BATAS_PENUH) return "Padat";
  return "Penuh";
}

export function kelasStatus(s) {
  return { Lengang: "ok", Padat: "warn", Penuh: "bad" }[s];
}

export function indeksZona(zona, jenis) {
  return indeks(zona.isi[jenis], zona.kap[jenis]);
}

export function sisa(zona, jenis) {
  return zona.kap[jenis] - zona.isi[jenis];
}

export function rekomendasi(zonas, jenis) {
  const tersedia = zonas.filter((z) => z.isi[jenis] < z.kap[jenis]);
  if (tersedia.length === 0) return null;
  return tersedia.reduce((a, b) => (indeksZona(b, jenis) < indeksZona(a, jenis) ? b : a));
}

export function formatDurasi(ms) {
  const menit = Math.max(1, Math.round(ms / 60000));
  const jam = Math.floor(menit / 60);
  return jam > 0 ? `${jam} jam ${menit % 60} menit` : `${menit} menit`;
}
