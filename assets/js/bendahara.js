// ===================================================
// 💰 Bendahara — Kas & Iuran (CRUD + Ringkasan + Filter + CSV)
// Akses: BENDAHARA atau ADMINSUPER
// ===================================================
import { auth, db } from "../../config/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---- UI helpers
const loading = document.getElementById("loading");
const toastEl = document.getElementById("toast");
function setLoading(v){ if(loading) loading.style.display = v ? "flex" : "none"; }
function toast(msg){ if(!toastEl) return; toastEl.textContent = msg; toastEl.classList.add("show"); setTimeout(()=>toastEl.classList.remove("show"),2600); }
const rupiah = (n)=> "Rp " + Number(n||0).toLocaleString("id-ID");

// ---- Elements
const kasJenis   = document.getElementById("kasJenis");
const kasJumlah  = document.getElementById("kasJumlah");
const kasKet     = document.getElementById("kasKet");
const btnAddKas  = document.getElementById("btnAddKas");

const fStart     = document.getElementById("fStart");
const fEnd       = document.getElementById("fEnd");
const fJenis     = document.getElementById("fJenis");
const btnFilter  = document.getElementById("btnFilter");
const btnReset   = document.getElementById("btnResetFilter");
const btnExport  = document.getElementById("btnExportCSV");

const sumInEl    = document.getElementById("sumIn");
const sumOutEl   = document.getElementById("sumOut");
const sumBalEl   = document.getElementById("sumBal");
const kasTable   = document.querySelector("#kasTable tbody");

// ---- State
let rawKas = [];      // semua data dari Firestore (cache)
let viewKas = [];     // data setelah filter

// ---- Auth Gate (role check optional via Firestore)
import { getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
onAuthStateChanged(auth, async (user)=>{
  if(!user){ alert("Silakan login terlebih dahulu."); window.location.href="../login/login.html"; return; }

  try {
    const p = await getDoc(doc(db, "profiles", user.uid));
    const role = (p.exists() ? (p.data().role||"").toUpperCase() : "WARGA");
    if (!["BENDAHARA", "ADMINSUPER"].includes(role)) {
      alert("Akses khusus Bendahara atau Adminsuper.");
      window.location.href = "../dashboard/warga.html";
      return;
    }
  } catch(e){
    // jika profil tidak terbaca, tetap tahan akses
    alert("Profil tidak ditemukan. Akses ditolak.");
    window.location.href = "../login/login.html";
    return;
  }

  await loadKas();   // initial load
});

// ---- Load & Render
async function loadKas(){
  setLoading(true);
  try{
    const q = query(collection(db,"kas"), orderBy("tanggal","desc"));
    const snap = await getDocs(q);
    rawKas = [];
    snap.forEach(d=>{
      const x = d.data();
      rawKas.push({
        id: d.id,
        jenis: x.jenis || "-",
        jumlah: Number(x.jumlah||0),
        keterangan: x.keterangan || "-",
        tanggal: x.tanggal?.toDate ? x.tanggal.toDate() : null
      });
    });
    applyFilter(); // ini juga akan render tabel + ringkasan
  }catch(e){
    kasTable.innerHTML = "<tr><td colspan='5'>Gagal memuat data kas</td></tr>";
  }finally{
    setLoading(false);
  }
}

function applyFilter(){
  const start = fStart.value ? new Date(fStart.value + "T00:00:00") : null;
  const end   = fEnd.value   ? new Date(fEnd.value + "T23:59:59") : null;
  const jenis = fJenis.value;

  viewKas = rawKas.filter(x=>{
    let ok = true;
    if (jenis !== "SEMUA" && x.jenis !== jenis) ok = false;
    if (start && x.tanggal && x.tanggal < start) ok = false;
    if (end && x.tanggal && x.tanggal > end) ok = false;
    return ok;
  });

  renderTable(viewKas);
  renderSummary(viewKas);
}

function renderSummary(rows){
  const pemasukan = rows.filter(r=>r.jenis==="Pemasukan").reduce((a,b)=>a + (b.jumlah||0), 0);
  const pengeluaran = rows.filter(r=>r.jenis==="Pengeluaran").reduce((a,b)=>a + (b.jumlah||0), 0);
  const saldo = pemasukan - pengeluaran;

  sumInEl.textContent  = rupiah(pemasukan);
  sumOutEl.textContent = rupiah(pengeluaran);
  sumBalEl.textContent = rupiah(saldo);
}

function renderTable(rows){
  if (!rows.length){
    kasTable.innerHTML = "<tr><td colspan='5'>Belum ada transaksi</td></tr>";
    return;
  }
  kasTable.innerHTML = rows.map(r=>{
    const tgl = r.tanggal ? r.tanggal.toLocaleString("id-ID") : "-";
    return `<tr>
      <td>${tgl}</td>
      <td>${r.jenis}</td>
      <td>${rupiah(r.jumlah)}</td>
      <td>${r.keterangan}</td>
      <td>
        <button class="btn" data-del="${r.id}" style="background:linear-gradient(135deg,#ff9c9c,#ff5e5e);color:#300">Hapus</button>
      </td>
    </tr>`;
  }).join("");

  kasTable.querySelectorAll("[data-del]").forEach(b=>{
    b.addEventListener("click", async ()=>{
      if(!confirm("Hapus transaksi ini?")) return;
      try{
        await deleteDoc(doc(db,"kas", b.dataset.del));
        toast("Transaksi dihapus");
        await loadKas();
      }catch(e){ toast("Gagal hapus: "+e.message); }
    });
  });
}

// ---- Actions
btnAddKas?.addEventListener("click", async ()=>{
  const jenis = kasJenis.value;
  const jumlah = Number(kasJumlah.value||0);
  const ket = kasKet.value.trim();
  if (!jumlah || jumlah <= 0){
    toast("Masukkan jumlah yang valid");
    return;
  }
  setLoading(true);
  try{
    await addDoc(collection(db,"kas"),{
      jenis, jumlah, keterangan: ket, tanggal: serverTimestamp()
    });
    kasJumlah.value = ""; kasKet.value = "";
    toast("Transaksi ditambahkan");
    await loadKas();
  }catch(e){
    toast("Gagal tambah transaksi: " + e.message);
  }finally{
    setLoading(false);
  }
});

btnFilter?.addEventListener("click", applyFilter);
btnReset?.addEventListener("click", ()=>{
  fStart.value = ""; fEnd.value = ""; fJenis.value = "SEMUA";
  applyFilter();
});

btnExport?.addEventListener("click", ()=>{
  if(!viewKas.length){ toast("Tidak ada data untuk diexport"); return; }
  const header = ["Tanggal","Jenis","Jumlah","Keterangan"];
  const rows = viewKas.map(r=>[
    r.tanggal ? r.tanggal.toISOString() : "",
    r.jenis,
    r.jumlah,
    (r.keterangan||"").replace(/[\r\n]+/g," ")
  ]);
  const csv = [header, ...rows].map(arr => arr.map(cell=>{
    let c = String(cell==null?"":cell);
    if (c.includes(",") || c.includes("\"")) c = `"${c.replace(/"/g,'""')}"`;
    return c;
  }).join(",")).join("\n");

  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "laporan_kas.csv";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast("CSV terunduh");
});
