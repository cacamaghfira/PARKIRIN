// =====================================================
// UI: membaca input pengguna dan menampilkan hasil
// Alur mengikuti flowchart: Login -> Pilih Zona -> Status -> Selesai
// =====================================================
import { validasiLogin, indeksZona, status, kelasStatus, sisa, penuh, rekomendasiTerdekat, formatDurasi } from "./logika.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";
import { buatPenyimpanan } from "./data.js";

const el = (id) => document.getElementById(id);
const appEl = el("app");

// State = semua data yang sedang dipakai layar
const S = {
  langkah: "login", // login | pilih | status | selesai
  user: null,
  jenis: "motor",
  zonas: [],
  aktif: null, // data parkir pengguna saat ini
  zonaPilihan: null,
  hasil: null, // hasil check-out
  pesan: "",
  npmIsi: "",
  pwIsi: "",
  sibuk: false,
};
let store;
let berhenti = null; // fungsi untuk berhenti mendengarkan data zona

// Mencegah teks pengguna merusak HTML (keamanan dasar)
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
const persen = (z, j) => Math.min(100, Math.round(indeksZona(z, j) * 100));

// ---------- Tampilan tiap langkah ----------
function tampilLogin() {
  return `
  <section class="card">
    <h2>Login</h2>
    <label for="npm">NPM</label>
    <input id="npm" inputmode="numeric" autocomplete="username" placeholder="Masukkan NPM">
    <label for="pw">Password</label>
    <input id="pw" type="password" autocomplete="current-password" placeholder="Masukkan password">
    <button class="btn" data-aksi="masuk" ${S.sibuk ? "disabled" : ""}>${S.pesan ? "Login Ulang" : "Masuk"}</button>
    ${S.pesan ? `<p class="err" role="alert">${esc(S.pesan)}</p>` : ""}
  </section>`;
}

function tampilPilih() {
  const j = S.jenis;
  const z = S.zonas.find((x) => x.id === S.zonaPilihan);
  const opsi = S.zonas
    .map((x) => {
      const label = penuh(x, j) ? "Penuh" : status(indeksZona(x, j));
      return `<option value="${esc(x.id)}" ${x.id === S.zonaPilihan ? "selected" : ""}>${esc(x.nama)} (${label})</option>`;
    })
    .join("");

  let info = "";
  let rek = "";
  if (z) {
    const k = kelasStatus(penuh(z, j) ? "Penuh" : status(indeksZona(z, j)));
    info = `<div class="${k}"><div class="bar"><i style="width:${persen(z, j)}%"></i></div></div>
      <div class="mut">Terisi ${z.isi[j]} dari ${z.kap[j]} (${j}) · sisa ${Math.max(0, sisa(z, j))} petak</div>`;
    // Rekomendasi hanya muncul jika zona yang dipilih penuh
    if (penuh(z, j)) {
      const r = rekomendasiTerdekat(S.zonas, j, z.id);
      rek = r
        ? `<section class="rec"><b>${esc(z.nama)} penuh untuk ${j}</b>
            <div>Rekomendasi terdekat: <b>${esc(r.zona.nama)}</b> (±${r.jarak} m), masih sisa ${sisa(r.zona, j)} petak.</div>
            <button class="btn" data-aksi="pakaiRek" data-id="${esc(r.zona.id)}">Pilih ${esc(r.zona.nama)}</button></section>`
        : `<section class="rec"><b>Semua zona penuh untuk ${j}.</b><div>Coba lagi beberapa saat lagi.</div></section>`;
    }
  }
  return `
  <section class="card">
    <h2>Pilih zona dan jenis kendaraan</h2>
    <div class="mut">NPM ${esc(S.user.npm)}</div>
    <label>Jenis kendaraan</label>
    <div class="seg">
      <button class="${j === "motor" ? "on" : ""}" data-aksi="jenis" data-nilai="motor">🏍️ Motor</button>
      <button class="${j === "mobil" ? "on" : ""}" data-aksi="jenis" data-nilai="mobil">🚗 Mobil</button>
    </div>
    <label for="zona">Zona parkir</label>
    <select id="zona">${opsi}</select>
    ${info}
    <button class="btn" data-aksi="checkin" ${S.sibuk ? "disabled" : ""}>Check-in</button>
    ${S.pesan ? `<p class="err" role="alert">${esc(S.pesan)}</p>` : ""}
  </section>${rek}`;
}

function tampilStatus() {
  const j = S.aktif.jenis;
  const z = S.zonas.find((x) => x.id === S.aktif.zona);
  if (!z) return `<section class="card"><p class="mut">Memuat data zona...</p></section>`;
  const st = penuh(z, j) ? "Penuh" : status(indeksZona(z, j));
  const k = kelasStatus(st);
  const daftar = S.zonas
    .map((x) => {
      const s = penuh(x, j) ? "Penuh" : status(indeksZona(x, j));
      return `<div class="zona ${kelasStatus(s)}">
        <div class="row"><span class="nama">${esc(x.nama)}</span><b>${persen(x, j)}% · ${s}</b></div>
        <div class="bar"><i style="width:${persen(x, j)}%"></i></div>
        <small>Sisa ${Math.max(0, sisa(x, j))} petak</small></div>`;
    })
    .join("");
  return `
  <section class="card">
    <div class="row"><h2 style="margin:0">Anda parkir di ${esc(z.nama)}</h2><span class="tag ${k}">${st}</span></div>
    <div class="${k}"><div class="bar"><i style="width:${persen(z, j)}%"></i></div></div>
    <div class="mut">Indeks kepadatan ${persen(z, j)}% · terisi ${z.isi[j]} dari ${z.kap[j]} (${j})</div>
  </section>
  <section class="card"><h2>Semua zona (${j})</h2>${daftar}</section>
  <section class="card">
    <h2>Pengguna selesai parkir?</h2>
    <button class="btn" data-aksi="checkout" ${S.sibuk ? "disabled" : ""}>Ya, Check-out</button>
    <button class="btn btn-alt" data-aksi="pindah" ${S.sibuk ? "disabled" : ""}>Belum, pilih zona lain</button>
    ${S.pesan ? `<p class="err" role="alert">${esc(S.pesan)}</p>` : ""}
  </section>`;
}

function tampilSelesai() {
  const h = S.hasil;
  const z = S.zonas.find((x) => x.id === h.zona);
  return `
  <section class="card center">
    <div class="check">✓</div>
    <h2>Selesai</h2>
    <p>Check-out berhasil dan data tersimpan.<br>Zona: <b>${esc(z ? z.nama : h.zona)}</b><br>Durasi parkir: <b>${formatDurasi(h.durasi)}</b></p>
    <button class="btn" data-aksi="ulang">Parkir lagi</button>
    <button class="btn btn-alt" data-aksi="keluar">Keluar</button>
  </section>`;
}

// ---------- Menggambar layar ----------
const NAMA_LANGKAH = ["Login", "Pilih zona", "Status", "Selesai"];
const URUTAN = { login: 0, pilih: 1, status: 2, selesai: 3 };

function gambar() {
  el("steps").innerHTML = NAMA_LANGKAH.map((n, i) => {
    const kelas = i === URUTAN[S.langkah] ? "on" : i < URUTAN[S.langkah] ? "done" : "";
    return `<li class="${kelas}">${n}</li>`;
  }).join("");
  el("btnKeluar").hidden = !S.user;
  appEl.innerHTML = { login: tampilLogin, pilih: tampilPilih, status: tampilStatus, selesai: tampilSelesai }[S.langkah]();
  if (S.langkah === "login" && el("npm")) {
    el("npm").value = S.npmIsi;
    el("pw").value = S.pwIsi;
  }
}

// ---------- Aksi (apa yang terjadi saat tombol ditekan) ----------
async function jalankan(fn) {
  // Simpan isian form dulu, karena layar akan digambar ulang (tombol jadi nonaktif)
  if (el("npm")) S.npmIsi = el("npm").value.trim();
  if (el("pw")) S.pwIsi = el("pw").value;
  S.sibuk = true;
  S.pesan = "";
  gambar();
  try {
    await fn();
  } catch (e) {
    S.pesan = e.message;
  }
  S.sibuk = false;
  gambar();
}

function mulaiLangganan() {
  if (berhenti) berhenti();
  berhenti = store.langgananZona((z) => {
    S.zonas = z;
    if (!S.zonaPilihan || !z.find((x) => x.id === S.zonaPilihan)) S.zonaPilihan = z[0] ? z[0].id : null;
    if (S.user) gambar();
  });
}

async function setelahLogin(user) {
  S.user = user;
  S.aktif = await store.ambilAktif(user.id);
  S.langkah = S.aktif ? "status" : "pilih";
  mulaiLangganan();
}

async function keluarApp() {
  if (berhenti) berhenti();
  await store.keluar();
  Object.assign(S, { langkah: "login", user: null, aktif: null, hasil: null, pesan: "", npmIsi: "", pwIsi: "" });
  gambar();
}

const AKSI = {
  // Node "Akun valid?": NPM minimal 15 digit angka, password harus sama dengan NPM
  masuk: () =>
    jalankan(async () => {
      if (!validasiLogin(S.npmIsi, S.pwIsi)) throw new Error("NPM atau password salah.");
      const user = await store.masuk(S.npmIsi, S.pwIsi);
      S.pwIsi = "";
      await setelahLogin(user);
    }),
  jenis: (d) => {
    S.jenis = d.nilai;
    S.pesan = "";
    gambar();
  },
  pakaiRek: (d) => {
    S.zonaPilihan = d.id;
    S.pesan = "";
    gambar();
  },
  checkin: () =>
    jalankan(async () => {
      const z = S.zonas.find((x) => x.id === S.zonaPilihan);
      if (z && penuh(z, S.jenis)) throw new Error(`Check-in gagal: ${z.nama} penuh untuk ${S.jenis}. Pilih zona yang direkomendasikan.`);
      await store.checkIn(S.user.id, S.zonaPilihan, S.jenis);
      S.aktif = await store.ambilAktif(S.user.id);
      S.langkah = "status";
    }),
  pindah: () =>
    jalankan(async () => {
      await store.checkOut(S.user.id);
      S.aktif = null;
      S.langkah = "pilih";
    }),
  checkout: () =>
    jalankan(async () => {
      S.hasil = await store.checkOut(S.user.id);
      S.aktif = null;
      S.langkah = "selesai";
    }),
  ulang: () => {
    S.langkah = "pilih";
    S.pesan = "";
    gambar();
  },
  keluar: () => keluarApp(),
};

appEl.addEventListener("click", (e) => {
  const tombol = e.target.closest("[data-aksi]");
  if (tombol && !tombol.disabled) AKSI[tombol.dataset.aksi](tombol.dataset);
});
appEl.addEventListener("change", (e) => {
  if (e.target.id === "zona") {
    S.zonaPilihan = e.target.value;
    S.pesan = "";
    gambar();
  }
});
el("btnKeluar").addEventListener("click", keluarApp);

// ---------- Mulai aplikasi ----------
(async function mulai() {
  try {
    store = await buatPenyimpanan(FIREBASE_CONFIG);
  } catch (e) {
    el("modeInfo").textContent = "Gagal memuat";
    appEl.innerHTML = `<section class="card"><p class="err">Gagal memuat Firebase: ${esc(e.message)}. Periksa koneksi internet dan isi firebase-config.js.</p></section>`;
    return;
  }
  el("modeInfo").textContent = store.mode === "demo" ? "Mode demo (data di perangkat ini)" : "Terhubung ke database";
  const user = await store.userSaatIni();
  if (user) await setelahLogin(user);
  gambar();
})();
