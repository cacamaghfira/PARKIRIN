
import { validasiNim, validasiPassword, indeks, status, rekomendasi, formatDurasi, ZONA_AWAL } from "./logika.js";

export function jalankanTes() {
  const salin = () => JSON.parse(JSON.stringify(ZONA_AWAL));
  const semuaPenuh = salin().map((z) => ({ ...z, isi: { ...z.kap } }));
  const uji = [
    ["validasiNim('2205101001') = benar", validasiNim("2205101001") === true],
    ["validasiNim('abc') = salah", validasiNim("abc") === false],
    ["validasiNim('12345') = salah (kurang dari 10 digit)", validasiNim("12345") === false],
    ["validasiPassword('abcdef') = benar", validasiPassword("abcdef") === true],
    ["validasiPassword('abc') = salah", validasiPassword("abc") === false],
    ["indeks(45, 60) = 0.75", indeks(45, 60) === 0.75],
    ["status(0.69) = Lengang", status(0.69) === "Lengang"],
    ["status(0.7) = Padat", status(0.7) === "Padat"],
    ["status(0.9) = Penuh", status(0.9) === "Penuh"],
    ["rekomendasi data awal (motor) = Zona D", rekomendasi(salin(), "motor").id === "D"],
    ["rekomendasi saat semua penuh = null", rekomendasi(semuaPenuh, "motor") === null],
    ["formatDurasi(95 menit) = 1 jam 35 menit", formatDurasi(95 * 60000) === "1 jam 35 menit"],
  ];
  return uji.map(([nama, lulus]) => ({ nama, lulus }));
}
