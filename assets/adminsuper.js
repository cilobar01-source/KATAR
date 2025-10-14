// ===================================================
// 👑 Adminsuper v4.1 — Semua Role dari Satu Dashboard
// ===================================================
import { auth, db, storage } from "../../config/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const loading = document.getElementById("loading");
const toastEl = document.getElementById("toast");
const sections = ["berita","kas","surat","umkm","users","media","pengaturan"];

function setLoading(v){ if(loading) loading.style.display = v ? "flex" : "none"; }
function toast(msg){ if(!toastEl) return; toastEl.textContent = msg; toastEl.classList.add("show"); setTimeout(()=>toastEl.classList.remove("show"),2800); }
function showSection(name){
  if(name==="beranda"){ sections.forEach(s => (document.getElementById("section-"+s).style.display="none")); return; }
  sections.forEach(s => { const el = document.getElementById("section-"+s); if(!el) return; el.style.display = (s===name) ? "block" : "none"; });
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-section]").forEach(el => el.addEventListener("click", ()=> showSection(el.dataset.section)));

// ---------- Gate: must login (optional: role check) ----------
onAuthStateChanged(auth, async (user)=>{
  if(!user){ alert("Silakan login terlebih dahulu."); window.location.href="../login/login.html"; return; }
  // OPTIONAL strict check role adminsuper:
  const p = await getDoc(doc(db,"profiles", user.uid));
  if (p.exists() && (p.data().role||"").toUpperCase() !== "ADMINSUPER"){
    alert("Akses khusus Adminsuper.");
    window.location.href="../dashboard/warga.html"; return;
  }
  await Promise.all([loadNews(), loadKas(), loadSurat(), loadUMKM(), loadUsers()]);
});

// =================== BERITA ===================
const newsTitle = document.getElementById("newsTitle");
const newsBody  = document.getElementById("newsBody");
const btnAddNews = document.getElementById("btnAddNews");
const newsTable = document.querySelector("#newsTable tbody");

btnAddNews?.addEventListener("click", async ()=>{
  const judul = (newsTitle?.value||"").trim();
  const isi = (newsBody?.value||"").trim();
  if(!judul||!isi){ toast("Lengkapi judul & isi"); return; }
  setLoading(true);
  try{
    await addDoc(collection(db,"berita"),{ judul, isi, tanggal: serverTimestamp() });
    newsTitle.value=""; newsBody.value="";
    await loadNews(); toast("Berita ditambahkan");
  }catch(e){ toast("Gagal tambah berita: "+e.message); }
  finally{ setLoading(false); }
});

async function loadNews(){
  newsTable.innerHTML = "<tr><td colspan='3'>Memuat...</td></tr>";
  try{
    const q = query(collection(db,"berita"), orderBy("tanggal","desc"));
    const snap = await getDocs(q);
    let html = "";
    snap.forEach(d=>{
      const x = d.data();
      const tgl = x.tanggal?.toDate ? x.tanggal.toDate().toLocaleString() : "-";
      html += `<tr>
        <td>${x.judul||"-"}</td>
        <td>${tgl}</td>
        <td><button class="btn" data-del-news="${d.id}" style="background:linear-gradient(135deg,#ff9c9c,#ff5e5e);color:#300">Hapus</button></td>
      </tr>`;
    });
    newsTable.innerHTML = html || "<tr><td colspan='3'>Belum ada berita</td></tr>";
    newsTable.querySelectorAll("[data-del-news]").forEach(b => b.addEventListener("click", async ()=>{
      if(!confirm("Hapus berita ini?")) return;
      await deleteDoc(doc(db,"berita", b.dataset.delNews));
      loadNews(); toast("Berita dihapus");
    }));
  }catch(e){ newsTable.innerHTML = "<tr><td colspan='3'>Gagal memuat berita</td></tr>"; }
}

// =================== KAS & IURAN ===================
const kasJenis = document.getElementById("kasJenis");
const kasJumlah = document.getElementById("kasJumlah");
const kasKet = document.getElementById("kasKet");
const btnAddKas = document.getElementById("btnAddKas");
const kasTable = document.querySelector("#kasTable tbody");

btnAddKas?.addEventListener("click", async ()=>{
  const jenis = kasJenis.value;
  const jumlah = Number(kasJumlah.value||0);
  const ket = kasKet.value.trim();
  if(!jumlah || jumlah<=0){ toast("Masukkan jumlah yang valid"); return; }
  setLoading(true);
  try{
    await addDoc(collection(db,"kas"),{ jenis, jumlah, keterangan: ket, tanggal: serverTimestamp() });
    kasJumlah.value=""; kasKet.value="";
    await loadKas(); toast("Transaksi ditambahkan");
  }catch(e){ toast("Gagal tambah kas: "+e.message); }
  finally{ setLoading(false); }
});

async function loadKas(){
  kasTable.innerHTML = "<tr><td colspan='5'>Memuat...</td></tr>";
  try{
    const q = query(collection(db,"kas"), orderBy("tanggal","desc"));
    const snap = await getDocs(q);
    let html = "";
    snap.forEach(d=>{
      const x = d.data();
      const tgl = x.tanggal?.toDate ? x.tanggal.toDate().toLocaleString() : "-";
      html += `<tr>
        <td>${x.jenis}</td>
        <td>Rp ${Number(x.jumlah||0).toLocaleString('id-ID')}</td>
        <td>${x.keterangan||"-"}</td>
        <td>${tgl}</td>
        <td><button class="btn" data-del-kas="${d.id}" style="background:linear-gradient(135deg,#ff9c9c,#ff5e5e);color:#300">Hapus</button></td>
      </tr>`;
    });
    kasTable.innerHTML = html || "<tr><td colspan='5'>Belum ada transaksi</td></tr>";
    kasTable.querySelectorAll("[data-del-kas]").forEach(b => b.addEventListener("click", async ()=>{
      if(!confirm("Hapus transaksi ini?")) return;
      await deleteDoc(doc(db,"kas", b.dataset.delKas));
      loadKas(); toast("Transaksi dihapus");
    }));
  }catch(e){ kasTable.innerHTML = "<tr><td colspan='5'>Gagal memuat data kas</td></tr>"; }
}

// =================== SURAT (PDF via Storage) ===================
const suratNama = document.getElementById("suratNama");
const suratFile = document.getElementById("suratFile");
const btnUploadSurat = document.getElementById("btnUploadSurat");
const suratTable = document.querySelector("#suratTable tbody");

btnUploadSurat?.addEventListener("click", async ()=>{
  const nama = suratNama.value.trim();
  const file = suratFile.files?.[0];
  if(!nama || !file){ toast("Isi nama surat & pilih file PDF"); return; }
  if(file.type !== "application/pdf"){ toast("File harus PDF"); return; }
  setLoading(true);
  try{
    const key = `surat/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g,'_')}`;
    const r = ref(storage, key);
    await uploadBytes(r, file);
    const url = await getDownloadURL(r);
    await addDoc(collection(db,"surat"),{ nama_surat:nama, url_file:url, storage_path:key, tanggal_upload: serverTimestamp() });
    suratNama.value=""; suratFile.value="";
    await loadSurat(); toast("Surat diupload");
  }catch(e){ toast("Gagal upload surat: "+e.message); }
  finally{ setLoading(false); }
});

async function loadSurat(){
  suratTable.innerHTML = "<tr><td colspan='4'>Memuat...</td></tr>";
  try{
    const q = query(collection(db,"surat"), orderBy("tanggal_upload","desc"));
    const snap = await getDocs(q);
    let html = "";
    snap.forEach(d=>{
      const x = d.data();
      const tgl = x.tanggal_upload?.toDate ? x.tanggal_upload.toDate().toLocaleString() : "-";
      html += `<tr>
        <td>${x.nama_surat||"-"}</td>
        <td><a href="${x.url_file}" target="_blank">Buka PDF</a></td>
        <td>${tgl}</td>
        <td>
          <button class="btn" data-del-surat-id="${d.id}" data-del-surat-path="${x.storage_path||''}" style="background:linear-gradient(135deg,#ff9c9c,#ff5e5e);color:#300">Hapus</button>
        </td>
      </tr>`;
    });
    suratTable.innerHTML = html || "<tr><td colspan='4'>Belum ada surat</td></tr>";
    suratTable.querySelectorAll("[data-del-surat-id]").forEach(b => b.addEventListener("click", async ()=>{
      if(!confirm("Hapus surat ini beserta filenya?")) return;
      const id = b.dataset.delSuratId, path = b.dataset.delSuratPath;
      try{
        if(path){ await deleteObject(ref(storage, path)); }
      }catch(e){ /* ignore if not exist */ }
      await deleteDoc(doc(db,"surat", id));
      loadSurat(); toast("Surat dihapus");
    }));
  }catch(e){ suratTable.innerHTML = "<tr><td colspan='4'>Gagal memuat surat</td></tr>"; }
}

// =================== UMKM ===================
const umkmNama = document.getElementById("umkmNama");
const umkmBidang = document.getElementById("umkmBidang");
const umkmKontak = document.getElementById("umkmKontak");
const umkmPemilik = document.getElementById("umkmPemilik");
const btnAddUMKM = document.getElementById("btnAddUMKM");
const umkmTable = document.querySelector("#umkmTable tbody");

btnAddUMKM?.addEventListener("click", async ()=>{
  const nama = umkmNama.value.trim();
  const bidang = umkmBidang.value.trim();
  const kontak = umkmKontak.value.trim();
  const pemilik = umkmPemilik.value.trim();
  if(!nama||!bidang||!pemilik){ toast("Isi minimal nama, bidang, pemilik"); return; }
  setLoading(true);
  try{
    await addDoc(collection(db,"umkm"),{ nama_usaha:nama, bidang, kontak, pemilik, dibuat: serverTimestamp() });
    umkmNama.value = umkmBidang.value = umkmKontak.value = umkmPemilik.value = "";
    await loadUMKM(); toast("UMKM ditambahkan");
  }catch(e){ toast("Gagal tambah UMKM: "+e.message); }
  finally{ setLoading(false); }
});

async function loadUMKM(){
  umkmTable.innerHTML = "<tr><td colspan='5'>Memuat...</td></tr>";
  try{
    const q = query(collection(db,"umkm"), orderBy("dibuat","desc"));
    const snap = await getDocs(q);
    let html = "";
    snap.forEach(d=>{
      const x = d.data();
      html += `<tr>
        <td>${x.nama_usaha||"-"}</td>
        <td>${x.bidang||"-"}</td>
        <td>${x.pemilik||"-"}</td>
        <td>${x.kontak||"-"}</td>
        <td><button class="btn" data-del-umkm="${d.id}" style="background:linear-gradient(135deg,#ff9c9c,#ff5e5e);color:#300">Hapus</button></td>
      </tr>`;
    });
    umkmTable.innerHTML = html || "<tr><td colspan='5'>Belum ada data</td></tr>";
    umkmTable.querySelectorAll("[data-del-umkm]").forEach(b => b.addEventListener("click", async ()=>{
      if(!confirm("Hapus UMKM ini?")) return;
      await deleteDoc(doc(db,"umkm", b.dataset.delUmkm));
      loadUMKM(); toast("UMKM dihapus");
    }));
  }catch(e){ umkmTable.innerHTML = "<tr><td colspan='5'>Gagal memuat UMKM</td></tr>"; }
}

// =================== USERS & ROLE ===================
const usersTable = document.querySelector("#usersTable tbody");
async function loadUsers(){
  usersTable.innerHTML = "<tr><td colspan='5'>Memuat...</td></tr>";
  try{
    const snap = await getDocs(collection(db,"profiles"));
    let html = "";
    const roles = ["WARGA","KETUA","SEKRETARIS","BENDAHARA","BIDANG_UMKM","BIDANG_OLAHRAGA","BIDANG_PENDIDIKAN","BIDANG_MEDIA","ADMINSUPER"];
    snap.forEach(d=>{
      const u = d.data(); const role = (u.role||"WARGA").toUpperCase(); const sub = u.subrole||"";
      const opts = roles.map(r=>`<option value="${r}" ${r===role?"selected":""}>${r}</option>`).join("");
      html += `<tr>
        <td>${u.nama||"-"}</td>
        <td>${u.email||"-"}</td>
        <td><select id="role-${d.id}">${opts}</select></td>
        <td><input id="sub-${d.id}" value="${sub}" style="width:140px"></td>
        <td>
          <button class="btn" data-save="${d.id}">Simpan</button>
          <button class="btn" data-del="${d.id}" style="background:linear-gradient(135deg,#ff9c9c,#ff5e5e);color:#300">Hapus</button>
        </td>
      </tr>`;
    });
    usersTable.innerHTML = html || "<tr><td colspan='5'>Belum ada user</td></tr>";
    usersTable.querySelectorAll("[data-save]").forEach(b => b.addEventListener("click", async ()=>{
      const id = b.dataset.save; const role = document.getElementById("role-"+id).value; const sub = document.getElementById("sub-"+id).value;
      try{ await updateDoc(doc(db,"profiles",id), { role, subrole: sub }); toast("Perubahan disimpan"); }catch(e){ toast("Gagal simpan: "+e.message); }
    }));
    usersTable.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async ()=>{
      if(!confirm("Hapus user ini dari Firestore?")) return;
      try{ await deleteDoc(doc(db,"profiles", b.dataset.del)); loadUsers(); toast("User dihapus"); }catch(e){ toast("Gagal hapus: "+e.message); }
    }));
  }catch(e){ usersTable.innerHTML = "<tr><td colspan='5'>Gagal memuat</td></tr>"; }
}

// =================== PENGATURAN (logo optional) ===================
const setNamaRT = document.getElementById("setNamaRT");
const setAlamat = document.getElementById("setAlamat");
const setWA = document.getElementById("setWA");
const setLogo = document.getElementById("setLogo");
const btnSaveSettings = document.getElementById("btnSaveSettings");

btnSaveSettings?.addEventListener("click", async ()=>{
  setLoading(true);
  try{
    let logoURL = null;
    if(setLogo.files && setLogo.files[0]){
      const f = setLogo.files[0]; const key = "settings/logo.png";
      await uploadBytes(ref(storage,key), f);
      logoURL = await getDownloadURL(ref(storage,key));
    }
    const payload = { nama_rt:setNamaRT.value.trim(), alamat:setAlamat.value.trim(), whatsapp:setWA.value.trim(), update_at: serverTimestamp() };
    if(logoURL) payload.logo = logoURL;
    // gunakan dokumen tunggal: settings/site
    const siteRef = doc(db,"settings","site");
    // updateDoc apabila ada, kalau belum ada, pakai set (merge)
    try{ await updateDoc(siteRef, payload); }
    catch{ await addDoc(collection(db,"_init"),{_:"_" }); /* ensure permissions */; await updateDoc(siteRef, payload).catch(async()=>{ await (await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")).setDoc(siteRef,payload); }); }
    toast("Pengaturan disimpan");
  }catch(e){ toast("Gagal simpan pengaturan: "+e.message); }
  finally{ setLoading(false); }
});
