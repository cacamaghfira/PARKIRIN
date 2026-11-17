
import { ZONA_AWAL } from "./logika.js";

const salin = (x) => JSON.parse(JSON.stringify(x));

export async function buatPenyimpanan(config) {
  return config ? buatFirebase(config) : buatDemo();
}


function buatDemo() {
  const KZ = "parkirin_zona";
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
    butuhPassword: false,
    async masuk(nim) {
      const u = { id: nim, nim };
      tulis(KU, u);
      return u;
    },
    async daftar(nim) {
      return this.masuk(nim);
    },
    async keluar() {
      localStorage.removeItem(KU);
    },
    async userSaatIni() {
      return baca(KU, null);
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
    async resetData() {
      localStorage.removeItem(KZ);
      kabari();
    },
  };
}


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

  
  const emailDari = (nim) => `${nim}@parkirin.app`;
  const keUser = (u) => (u ? { id: u.uid, nim: u.email.split("@")[0] } : null);
  const siapAuth = new Promise((res) => {
    const berhenti = A.onAuthStateChanged(auth, (u) => {
      berhenti();
      res(u);
    });
  });
  const terjemah = (e) => {
    const k = e.code || "";
    if (k.includes("invalid-credential") || k.includes("wrong-password") || k.includes("user-not-found"))
      return "NIM atau kata sandi salah, atau akun belum didaftarkan.";
    if (k.includes("email-already-in-use")) return "NIM ini sudah terdaftar. Silakan masuk.";
    if (k.includes("weak-password")) return "Kata sandi terlalu lemah (minimal 6 karakter).";
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
    butuhPassword: true,
    masuk: (nim, pw) =>
      bungkus(async () => keUser((await A.signInWithEmailAndPassword(auth, emailDari(nim), pw)).user)),
    daftar: (nim, pw) =>
      bungkus(async () => keUser((await A.createUserWithEmailAndPassword(auth, emailDari(nim), pw)).user)),
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
    resetData: async () => {},
  };
}
