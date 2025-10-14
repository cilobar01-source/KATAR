// ===================================================
// 👥 Dashboard Anggota v4.3.1
// ===================================================
import { auth, db } from "../../config/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDocs, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loading = document.getElementById("loading");
const toastEl = document.getElementById("toast");
function setLoading(v){ loading.style.display = v ? "flex" : "none"; }
function toast(msg){ toastEl.textContent = msg; toastEl.classList.add("show"); setTimeout(()=>toastEl.classList.remove("show"),2600); }

onAuthStateChanged(auth, async (user)=>{
  if(!user){ alert("Silakan login terlebih dahulu."); window.location.href="../login/login.html"; return; }
  setLoading(true);
  await Promise.all([loadPengumuman(), loadAgenda(), loadBerita()]);
  setLoading(false);
});

// Pengumuman
async function loadPengumuman(){
  const box = document.getElementById("anggotaPengumuman");
  const snap = await getDocs(collection(db,"pengumuman"));
  let html = "";
  snap.forEach(d=>{
    const x = d.data();
    html += `<div class="item glass"><b>${x.judul}</b> — ${x.isi}</div>`;
  });
  box.innerHTML = html || "<p>Belum ada pengumuman.</p>";
}

// Agenda
async function loadAgenda(){
  const box = document.getElementById("anggotaAgenda");
  const snap = await getDocs(collection(db,"agenda"));
  let html = "";
  snap.forEach(d=>{
    const x = d.data();
    html += `<div class="item glass"><b>${x.judul}</b> (${x.tanggal||"-"})<br>${x.deskripsi||""}</div>`;
  });
  box.innerHTML = html || "<p>Belum ada agenda kegiatan.</p>";
}

// Berita
async function loadBerita(){
  const box = document.getElementById("anggotaBerita");
  const snap = await getDocs(collection(db,"berita"));
  let html = "";
  snap.forEach(d=>{
    const x = d.data();
    html += `<div class="item glass"><b>${x.judul}</b><br>${x.isi||""}</div>`;
  });
  box.innerHTML = html || "<p>Belum ada berita terbaru.</p>";
}
