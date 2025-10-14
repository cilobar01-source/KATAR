// ===================================================
// 👑 Dashboard Ketua v4.3 — Agenda, Rekap, Statistik
// ===================================================
import { auth, db } from "../../config/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loading = document.getElementById("loading");
const toastEl = document.getElementById("toast");
function setLoading(v){ loading.style.display = v ? "flex" : "none"; }
function toast(msg){ toastEl.textContent = msg; toastEl.classList.add("show"); setTimeout(()=>toastEl.classList.remove("show"),2600); }
const rupiah = (n)=>"Rp "+Number(n||0).toLocaleString("id-ID");

let chartKetua;

// 🔐 Cek login
onAuthStateChanged(auth, async (user)=>{
  if(!user){ alert("Silakan login terlebih dahulu."); window.location.href="../login/login.html"; return; }
  await Promise.all([loadRingkasan(), loadAgenda(), loadPengumuman()]);
});

// ======================= RINGKASAN =======================
async function loadRingkasan(){
  const kas = await getDocs(collection(db,"kas"));
  const berita = await getDocs(collection(db,"berita"));
  const umkm = await getDocs(collection(db,"umkm"));

  const totalKas = kas.docs.reduce((a,b)=>{
    const x = b.data(); return a + (x.jenis==="Pemasukan"?x.jumlah: -x.jumlah);
  },0);

  document.getElementById("sumKas").textContent = rupiah(totalKas);
  document.getElementById("sumBerita").textContent = berita.size;
  document.getElementById("sumUMKM").textContent = umkm.size;

  // Statistik bulanan (contoh: jumlah berita dan kegiatan)
  const bulan = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const chart = document.getElementById("chartKetua");
  const beritaData = Array(12).fill(0);
  berita.docs.forEach(d=>{
    const t = d.data().tanggal?.toDate?.() || new Date();
    beritaData[t.getMonth()]++;
  });
  if(chartKetua) chartKetua.destroy();
  chartKetua = new Chart(chart,{
    type:"bar",
    data:{
      labels:bulan,
      datasets:[{label:"Berita per bulan", data:beritaData, backgroundColor:"rgba(0,194,255,0.6)"}]
    },
    options:{responsive:true,plugins:{legend:{display:false}}}
  });
}

// ======================= AGENDA =======================
const btnAddAgenda = document.getElementById("btnAddAgenda");
btnAddAgenda?.addEventListener("click", async ()=>{
  const judul = agendaJudul.value.trim();
  const tgl = agendaTanggal.value;
  const desk = agendaDeskripsi.value.trim();
  if(!judul){ toast("Isi judul kegiatan"); return; }
  setLoading(true);
  try{
    await addDoc(collection(db,"agenda"),{judul,tanggal:tgl,deskripsi:desk,created:serverTimestamp()});
    toast("Agenda ditambahkan");
    agendaJudul.value = agendaTanggal.value = agendaDeskripsi.value = "";
    await loadAgenda();
  }catch(e){ toast("Gagal: "+e.message); }
  finally{ setLoading(false); }
});

async function loadAgenda(){
  const tbody = document.querySelector("#agendaTable tbody");
  const snap = await getDocs(collection(db,"agenda"));
  if(!snap.size){ tbody.innerHTML="<tr><td colspan='4'>Belum ada agenda</td></tr>"; return; }
  let html="";
  snap.forEach(d=>{
    const x=d.data();
    html+=`<tr>
      <td>${x.tanggal||"-"}</td>
      <td>${x.judul}</td>
      <td>${x.deskripsi||"-"}</td>
      <td><button class="btn" data-del="${d.id}" style="background:#ff7f7f;color:#000;">Hapus</button></td>
    </tr>`;
  });
  tbody.innerHTML = html;
  tbody.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click", async()=>{
    if(!confirm("Hapus agenda ini?"))return;
    await deleteDoc(doc(db,"agenda",b.dataset.del)); toast("Agenda dihapus"); loadAgenda();
  }));
}

// ======================= PENGUMUMAN =======================
async function loadPengumuman(){
  const list = document.getElementById("pengumumanList");
  const snap = await getDocs(collection(db,"pengumuman"));
  let html="";
  snap.forEach(d=>{
    const x=d.data();
    html+=`<div class="item"><b>${x.judul}</b> — ${x.isi}</div>`;
  });
  list.innerHTML = html || "<p>Belum ada pengumuman.</p>";
}
