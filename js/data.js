// =====================================================
// DATA: tempat menyimpan dan mengambil data (Simpan Data)
// Ada dua "penyimpanan" dengan fungsi yang sama:
//   1. buatDemo()     -> data di browser sendiri (localStorage), tanpa internet
//   2. buatFirebase() -> data di Firebase, dibagikan ke semua pengguna secara real-time
// app.js tidak perlu tahu mana yang dipakai.
// =====================================================
import { ZONA_AWAL } from "./logika.js";

const salin = (x) => JSON.parse(JSON.stringify(x));

export async function buatPenyimpanan(config) {
  return config ? buatFirebase(config) : buatDemo();
}

// ---------- MODE DEMO ----------
function buatDemo() {
  // Nama penyimpanan ikut berubah jika ZONA_AWAL diubah, sehingga data lama di browser
  // otomatis tidak dipakai lagi (tanpa perlu menghapus manual).
  const tanda = JSON.stringify(ZONA_AWAL).split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const KZ = "parkirin_zona_" + tanda;
  const KU = "parkirin_user";
  const KA = "parkirin_aktif_";
  const baca = (k, d) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  };
  const tulis = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  };
  const pendengar = new Set();
  const zonas = () => baca(KZ, null) || salin(ZONA_AWAL);
  const kabari = () => pendengar.forEach((f) => f(zonas()));
  const ubahJumlah = (zonaId, jenis, delta) => {
    const z = zonas();
    const t = z.find((x) => x.id === zonaId);
    t.isi[jenis] = Math.max(0, Math.min(t.kap[jenis], t.isi[jenis] + delta));
    tulis(KZ, z);
    kabari();
  };

  return {
    mode: "demo",
    async masuk(npm) {
      const u = { id: npm, npm };
      tulis(KU, u);
      return u;
    },
    async keluar() {
      localStorage.removeItem(KU);
    },
    async userSaatIni() {
      const u = baca(KU, null);
      return u ? { id: u.id, npm: u.id } : null;
    },
    async ambilAktif(uid) {
      return baca(KA + uid, null);
    },
    langgananZona(cb) {
      pendengar.add(cb);
      cb(zonas());
      return () => pendengar.delete(cb);
    },
    async checkIn(uid, zonaId, jenis) {
      if (baca(KA + uid, null)) throw new Error("Anda sudah check-in. Check-out dulu.");
      const z = zonas().find((x) => x.id === zonaId);
      if (z.isi[jenis] >= z.kap[jenis]) throw new Error("Zona ini penuh. Pilih zona lain.");
      ubahJumlah(zonaId, jenis, +1);
      tulis(KA + uid, { zona: zonaId, jenis, mulai: Date.now() });
    },
    async checkOut(uid) {
      const a = baca(KA + uid, null);
      if (!a) throw new Error("Anda belum check-in.");
      ubahJumlah(a.zona, a.jenis, -1);
      localStorage.removeItem(KA + uid);
      return { zona: a.zona, jenis: a.jenis, durasi: Date.now() - a.mulai };
    },
  };
}

// ---------- MODE FIREBASE ----------
async function buatFirebase(config) {
  const B = "https://www.gstatic.com/firebasejs/10.12.2/";
  const [{ initializeApp }, A, S] = await Promise.all([
    import(B + "firebase-app.js"),
    import(B + "firebase-auth.js"),
    import(B + "firebase-firestore.js"),
  ]);
  const app = initializeApp(config);
  const auth = A.getAuth(app);
  const db = S.getFirestore(app);

  // Firebase login memakai email, jadi NPM diubah menjadi email palsu: NPM@parkirin.app
  const emailDari = (npm) => `${npm}@parkirin.app`;
  const keUser = (u) => (u ? { id: u.uid, npm: u.email.split("@")[0] } : null);
  const siapAuth = new Promise((res) => {
    const berhenti = A.onAuthStateChanged(auth, (u) => {
      berhenti();
      res(u);
    });
  });
  const terjemah = (e) => {
    const k = e.code || "";
    if (k.includes("invalid-credential") || k.includes("wrong-password") || k.includes("email-already-in-use"))
      return "NPM atau password salah.";
    if (k.includes("network")) return "Tidak ada koneksi internet.";
    if (k.includes("permission-denied")) return "Akses ditolak oleh aturan keamanan database.";
    return e.message || "Terjadi kesalahan.";
  };
  const bungkus = async (fn) => {
    try {
      return await fn();
    } catch (e) {
      throw new Error(terjemah(e));
    }
  };

  async function isiZonaAwalJikaKosong() {
    const snap = await S.getDocs(S.collection(db, "zona"));
    if (!snap.empty) return;
    for (const z of ZONA_AWAL) {
      await S.setDoc(S.doc(db, "zona", z.id), { nama: z.nama, kap: z.kap, isi: z.isi });
    }
  }

  return {
    mode: "firebase",
    // Login pertama kali otomatis membuat akun (password = NPM), login berikutnya masuk biasa
    masuk: (npm, pw) =>
      bungkus(async () => {
        try {
          return keUser((await A.signInWithEmailAndPassword(auth, emailDari(npm), pw)).user);
        } catch (e) {
          const k = e.code || "";
          if (!k.includes("invalid-credential") && !k.includes("user-not-found")) throw e;
          return keUser((await A.createUserWithEmailAndPassword(auth, emailDari(npm), pw)).user);
        }
      }),
    keluar: () => A.signOut(auth),
    userSaatIni: async () => keUser(await siapAuth),
    ambilAktif: (uid) =>
      bungkus(async () => {
        const s = await S.getDoc(S.doc(db, "parkir", uid));
        return s.exists() ? s.data() : null;
      }),
    langgananZona(cb) {
      isiZonaAwalJikaKosong().catch(() => {});
      return S.onSnapshot(
        S.collection(db, "zona"),
        (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.id.localeCompare(b.id))),
        (e) => console.error("Gagal membaca zona:", e)
      );
    },
    // Transaction: baca dan ubah dilakukan sekaligus, supaya aman jika banyak orang check-in bersamaan
    checkIn: (uid, zonaId, jenis) =>
      bungkus(() =>
        S.runTransaction(db, async (t) => {
          const zRef = S.doc(db, "zona", zonaId);
          const pRef = S.doc(db, "parkir", uid);
          const [z, p] = [await t.get(zRef), await t.get(pRef)];
          if (p.exists()) throw new Error("Anda sudah check-in. Check-out dulu.");
          const d = z.data();
          if (d.isi[jenis] >= d.kap[jenis]) throw new Error("Zona ini penuh. Pilih zona lain.");
          t.update(zRef, { ["isi." + jenis]: d.isi[jenis] + 1 });
          t.set(pRef, { zona: zonaId, jenis, mulai: Date.now() });
        })
      ),
    checkOut: (uid) =>
      bungkus(() =>
        S.runTransaction(db, async (t) => {
          const pRef = S.doc(db, "parkir", uid);
          const p = await t.get(pRef);
          if (!p.exists()) throw new Error("Anda belum check-in.");
          const a = p.data();
          const zRef = S.doc(db, "zona", a.zona);
          const z = await t.get(zRef);
          t.update(zRef, { ["isi." + a.jenis]: Math.max(0, z.data().isi[a.jenis] - 1) });
          t.delete(pRef);
          return { zona: a.zona, jenis: a.jenis, durasi: Date.now() - a.mulai };
        })
      ),
  };
}
