
import { validasiNim, validasiPassword, indeksZona, status, kelasStatus, sisa, rekomendasi, formatDurasi } from "./logika.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";
import { buatPenyimpanan } from "./data.js";

const el = (id) => document.getElementById(id);
const appEl = el("app");


const S = {
  langkah: "login",
  user: null,
  jenis: "motor",
  zonas: [],
  aktif: null,
  zonaPilihan: null,
  hasil: null,
  pesan: "",
  nimIsi: "",
  pwIsi: "",
  sibuk: false,
};
let store;
let berhenti = null;


function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}


function tampilLogin() {
  const fb = store.butuhPassword;
  return `
  <section class="card">
    <h2>Login dengan NIM</h2>
    <label for="nim">NIM (10 digit angka)</label>
    <input id="nim" inputmode="numeric" maxlength="10" autocomplete="username" placeholder="mis. 2205101001">
    ${fb ? `<label for="pw">Kata sandi (minimal 6 karakter)</label>
    <input id="pw" type="password" autocomplete="current-password">` : ""}
    <button class="btn" data-aksi="masuk" ${S.sibuk ? "disabled" : ""}>${S.pesan ? "Login Ulang" : "Masuk"}</button>
    ${fb ? `<button class="btn btn-alt" data-aksi="daftar" ${S.sibuk ? "disabled" : ""}>Daftar akun baru</button>` : ""}
    ${S.pesan ? `<p class="err" role="alert">${esc(S.pesan)}</p>` : ""}
    ${fb ? "" : `<p class="note">Mode demo: data tersimpan di browser ini saja. Hubungkan Firebase agar data dibagikan ke semua pengguna.</p>`}
  </section>`;
}

function tampilPilih() {
  const opsi = S.zonas
    .map((z) => {
      const s = status(indeksZona(z, S.jenis));
      const penuh = sisa(z, S.jenis) <= 0;
      return `<option value="${esc(z.id)}" ${z.id === S.zonaPilihan ? "selected" : ""} ${penuh ? "disabled" : ""}>${esc(z.nama)} (${s})</option>`;
    })
    .join("");
  return `
  <section class="card">
    <h2>Pilih zona dan jenis kendaraan</h2>
    <div class="mut">NIM ${esc(S.user.nim)}</div>
    <label>Jenis kendaraan</label>
    <div class="seg">
      <button class="${S.jenis === "motor" ? "on" : ""}" data-aksi="jenis" data-nilai="motor">🏍️ Motor</button>
      <button class="${S.jenis === "mobil" ? "on" : ""}" data-aksi="jenis" data-nilai="mobil">🚗 Mobil</button>
    </div>
    <label for="zona">Zona parkir</label>
    <select id="zona">${opsi}</select>
    <button class="btn" data-aksi="checkin" ${S.sibuk ? "disabled" : ""}>Check-in</button>
    ${S.pesan ? `<p class="err" role="alert">${esc(S.pesan)}</p>` : ""}
    <p class="note">Zona yang penuh tidak bisa dipilih.</p>
  </section>`;
}

function tampilStatus() {
  const j = S.aktif.jenis;
  const z = S.zonas.find((x) => x.id === S.aktif.zona);
  if (!z) return `<section class="card"><p class="mut">Memuat data zona...</p></section>`;
  const i = indeksZona(z, j);
  const st = status(i);
  const k = kelasStatus(st);
  const best = rekomendasi(S.zonas, j);
  const teksRek = !best
    ? "Semua zona penuh."
    : best.id === z.id
    ? "Zona Anda sudah yang paling lengang."
    : `${esc(best.nama)} paling lengang (${Math.round(indeksZona(best, j) * 100)}%). Pertimbangkan zona ini untuk lain waktu.`;
  const daftar = S.zonas
    .map((x) => {
      const ix = indeksZona(x, j);
      const kk = kelasStatus(status(ix));
      return `<div class="zona ${kk}">
        <div class="row"><span class="nama">${esc(x.nama)}</span><b>${Math.round(ix * 100)}% · ${status(ix)}</b></div>
        <div class="bar"><i style="width:${Math.min(100, Math.round(ix * 100))}%"></i></div>
        <small>Sisa ${sisa(x, j)} petak</small></div>`;
    })
    .join("");
  return `
  <section class="card">
    <div class="row"><h2 style="margin:0">Anda parkir di ${esc(z.nama)}</h2><span class="tag ${k}">${st}</span></div>
    <div class="${k}"><div class="bar"><i style="width:${Math.min(100, Math.round(i * 100))}%"></i></div></div>
    <div class="mut">Indeks kepadatan ${Math.round(i * 100)}% · terisi ${z.isi[j]} dari ${z.kap[j]} (${j})</div>
  </section>
  <section class="rec"><b>Rekomendasi zona</b><div>${teksRek}</div></section>
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
    ${store.mode === "demo" ? `<button class="btn btn-alt" data-aksi="reset">Reset data demo</button>` : ""}
  </section>`;
}


const NAMA_LANGKAH = ["Login", "Pilih zona", "Status", "Selesai"];
const URUTAN = { login: 0, pilih: 1, status: 2, selesai: 3 };

function gambar() {
  el("steps").innerHTML = NAMA_LANGKAH.map((n, i) => {
    const kelas = i === URUTAN[S.langkah] ? "on" : i < URUTAN[S.langkah] ? "done" : "";
    return `<li class="${kelas}">${n}</li>`;
  }).join("");
  el("btnKeluar").hidden = !S.user;
  appEl.innerHTML = { login: tampilLogin, pilih: tampilPilih, status: tampilStatus, selesai: tampilSelesai }[S.langkah]();
  if (S.langkah === "login" && el("nim")) {
    el("nim").value = S.nimIsi;
    if (el("pw")) el("pw").value = S.pwIsi;
  }
}


async function jalankan(fn) {
  
  if (el("nim")) S.nimIsi = el("nim").value.trim();
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
    if (S.langkah === "pilih" || S.langkah === "status" || S.langkah === "selesai") gambar();
  });
}

async function setelahLogin(user) {
  S.user = user;
  S.aktif = await store.ambilAktif(user.id);
  S.langkah = S.aktif ? "status" : "pilih";
  mulaiLangganan();
}

async function bacaFormLogin(daftar) {
  const nim = S.nimIsi;
  const pw = S.pwIsi;
  if (!validasiNim(nim)) throw new Error("Akun tidak valid. NIM harus 10 digit angka.");
  if (store.butuhPassword && !validasiPassword(pw)) throw new Error("Kata sandi minimal 6 karakter.");
  const user = daftar ? await store.daftar(nim, pw) : await store.masuk(nim, pw);
  S.pwIsi = "";
  await setelahLogin(user);
}

const AKSI = {
  masuk: () => jalankan(() => bacaFormLogin(false)),
  daftar: () => jalankan(() => bacaFormLogin(true)),
  jenis: (d) => {
    S.jenis = d.nilai;
    S.pesan = "";
    gambar();
  },
  checkin: () =>
    jalankan(async () => {
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
  reset: () =>
    jalankan(async () => {
      await store.resetData();
    }),
};

appEl.addEventListener("click", (e) => {
  const tombol = e.target.closest("[data-aksi]");
  if (tombol && !tombol.disabled) AKSI[tombol.dataset.aksi](tombol.dataset);
});
appEl.addEventListener("change", (e) => {
  if (e.target.id === "zona") S.zonaPilihan = e.target.value;
});
el("btnKeluar").addEventListener("click", async () => {
  if (berhenti) berhenti();
  await store.keluar();
  Object.assign(S, { langkah: "login", user: null, aktif: null, hasil: null, pesan: "", nimIsi: "", pwIsi: "" });
  gambar();
});


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
