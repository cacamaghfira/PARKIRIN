// =====================================================
// TES: kriteria uji untuk logika (dijalankan di tes.html)
// =====================================================
import { validasiNpm, validasiLogin, indeks, status, penuh, rekomendasiTerdekat, formatDurasi, ZONA_AWAL } from "./logika.js";

export function jalankanTes() {
  const salin = () => JSON.parse(JSON.stringify(ZONA_AWAL));
  const semuaPenuh = salin().map((z) => ({ ...z, isi: { ...z.kap } }));
  const npm = "123456789012345"; // 15 digit
  const uji = [
    ["validasiNpm: 15 digit angka = benar", validasiNpm(npm) === true],
    ["validasiNpm: 14 digit = salah", validasiNpm("12345678901234") === false],
    ["validasiNpm: ada huruf = salah", validasiNpm("12345678901234a") === false],
    ["validasiLogin: password sama dengan NPM = berhasil", validasiLogin(npm, npm) === true],
    ["validasiLogin: password berbeda = gagal", validasiLogin(npm, "salah") === false],
    ["validasiLogin: NPM terlalu pendek = gagal", validasiLogin("abc", "abc") === false],
    ["indeks(45, 60) = 0.75", indeks(45, 60) === 0.75],
    ["status(0.69) = Lengang", status(0.69) === "Lengang"],
    ["status(0.7) = Padat", status(0.7) === "Padat"],
    ["status(0.99) = Padat", status(0.99) === "Padat"],
    ["status(1) = Penuh", status(1) === "Penuh"],
    ["data awal: tidak ada zona yang motor dan mobilnya sama-sama penuh", ZONA_AWAL.every((z) => !(penuh(z, "motor") && penuh(z, "mobil")))],
    ["data awal: ada zona yang motornya penuh", ZONA_AWAL.some((z) => penuh(z, "motor"))],
    ["data awal: ada zona yang mobilnya penuh", ZONA_AWAL.some((z) => penuh(z, "mobil"))],
    ["rekomendasi dari Zona A (motor penuh) = Zona B", rekomendasiTerdekat(salin(), "motor", "A").zona.id === "B"],
    ["rekomendasi dari Zona B (mobil penuh) = Zona A", rekomendasiTerdekat(salin(), "mobil", "B").zona.id === "A"],
    ["rekomendasi saat semua zona penuh = null", rekomendasiTerdekat(semuaPenuh, "motor", "A") === null],
    ["formatDurasi(95 menit) = 1 jam 35 menit", formatDurasi(95 * 60000) === "1 jam 35 menit"],
  ];
  return uji.map(([nama, lulus]) => ({ nama, lulus }));
}
