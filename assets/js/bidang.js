// ===================================================
// 📚 Dashboard Bidang v4.3 (Media + Olahraga + Pendidikan + UMKM)
// ===================================================
import { auth, db, storage } from "../../config/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const loading = document.getElementById("loading");
const toastEl = document.getElementById("toast");
function setLoading(v){ loading.style.display = v ? "flex" : "none"; }
function toast(msg){ toastEl.textContent = msg; toastEl.classList.add("show"); setTimeout(()=>toastEl.classList.remove("show"),2600); }

// Auth Gate
onAuthStateChanged(auth, async (user)=>{
  if(!user){ alert("Silakan login terlebih dahulu."); window.location.href="../login/login.html"; return; }
  await loadAll();
});

// TAB SYSTEM
const tabs = document.querySelectorAll(".tab-menu button");
const sections = document.querySelectorAll(".tab-content");
tabs.forEach(t=>{
  t.addEventListener("click",()=>{
    tabs.forEach(b=>b.classList.remove("active"));
    t.classList.add("active");
    sections.forEach(s=>s.classList.remove("active"));
    document.getElementById(t.dataset.tab).classList.add("active");
  });
});

// ================= MEDIA =================
const btnAddMedia = document.getElementById("btnAddMedia");
btnAddMedia.addEventListener("click", async ()=>{
  const judul = mediaJudul.value.trim();
  const isi = mediaIsi.value.trim();
  const file = mediaFoto.files[0];
  if(!judul || !isi || !file){ toast("Lengkapi data dan pilih gambar!"); return; }
  setLoading(true);
  try{
    const refFile = ref(storage, "media/"+Date.now()+"_"+file.name);
    await uploadBytes(refFile, file);
    const url = await getDownloadURL(refFile);
    await addDoc(collection(db,"berita"),{
      judul, isi, foto:url, tanggal: serverTimestamp(), kategori:"Media"
    });
    toast("Berita diupload");
    loadMedia();
  }catch(e){ toast("Gagal upload: "+e.message); }
  finally{ setLoading(false); }
});

async function loadMedia(){
  const list = document.getElementById("mediaList");
  const snap = await getDocs(collection(db,"berita"));
  let html = "";
  snap.forEach(d=>{
    const x = d.data();
    if(x.kategori!=="Media") return;
    html+=`<div class="item"><b>${x.judul}</b><br>${x.isi}<br><img src="${x.foto}" style="width:100%;border-radius:8px;margin-top:6px;"/></div>`;
  });
  list.innerHTML = html || "<p>Tidak ada berita media.</p>";
}

// ================= OLAHRAGA =================
btnAddOlah.addEventListener("click", async ()=>{
  const nama = olahNama.value, hasil = olahHasil.value, tanggal = olahTanggal.value;
  if(!nama){ toast("Isi nama kegiatan"); return; }
  await addDoc(collection(db,"olahraga"),{nama,hasil,tanggal,created:serverTimestamp()});
  toast("Kegiatan ditambah"); loadOlah();
});
async function loadOlah(){
  const list = document.getElementById("olahList");
  const snap = await getDocs(collection(db,"olahraga"));
  let html = "";
  snap.forEach(d=>{
    const x = d.data();
    html+=`<div class="item"><b>${x.nama}</b> (${x.tanggal||"-"})<br>${x.hasil||""}</div>`;
  });
  list.innerHTML = html || "<p>Tidak ada kegiatan olahraga.</p>";
}

// ================= PENDIDIKAN =================
btnAddPend.addEventListener("click", async ()=>{
  const j = pendJudul.value, k = pendKeterangan.value, t = pendTanggal.value;
  if(!j){ toast("Isi nama kegiatan"); return; }
  await addDoc(collection(db,"pendidikan"),{judul:j,keterangan:k,tanggal:t,created:serverTimestamp()});
  toast("Kegiatan pendidikan ditambah"); loadPend();
});
async function loadPend(){
  const list = document.getElementById("pendList");
  const snap = await getDocs(collection(db,"pendidikan"));
  let html = "";
  snap.forEach(d=>{
    const x = d.data();
    html+=`<div class="item"><b>${x.judul}</b> (${x.tanggal||"-"})<br>${x.keterangan||""}</div>`;
  });
  list.innerHTML = html || "<p>Tidak ada kegiatan pendidikan.</p>";
}

// ================= UMKM =================
btnAddUMKM.addEventListener("click", async ()=>{
  const n = umkmNama.value, b = umkmBidang.value, c = umkmKontak.value;
  if(!n){ toast("Isi nama usaha"); return; }
  await addDoc(collection(db,"umkm"),{nama:n,bidang:b,kontak:c,created:serverTimestamp()});
  toast("Data UMKM ditambah"); loadUMKM();
});
async function loadUMKM(){
  const list = document.getElementById("umkmList");
  const snap = await getDocs(collection(db,"umkm"));
  let html = "";
  snap.forEach(d=>{
    const x = d.data();
    html+=`<div class="item"><b>${x.nama}</b> (${x.bidang||"-"})<br>${x.kontak||""}</div>`;
  });
  list.innerHTML = html || "<p>Belum ada data UMKM.</p>";
}

// ================= LOAD SEMUA =================
async function loadAll(){
  await Promise.all([loadMedia(), loadOlah(), loadPend(), loadUMKM()]);
}
