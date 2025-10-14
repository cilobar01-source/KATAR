// ===================================================
// 💰 Bendahara v4.2 — Kas + Kategori + Rekap Bulanan + Grafik
// ===================================================
import { auth, db } from "../../config/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loading = document.getElementById("loading");
const toastEl = document.getElementById("toast");
function setLoading(v){ loading.style.display = v ? "flex" : "none"; }
function toast(msg){ toastEl.textContent = msg; toastEl.classList.add("show"); setTimeout(()=>toastEl.classList.remove("show"),2600); }
const rupiah = (n)=>"Rp "+Number(n||0).toLocaleString("id-ID");

let rawKas = [];
let viewKas = [];

const chartCanvas = document.getElementById("kasChart");
let kasChart = null;

// Auth
onAuthStateChanged(auth, async (user)=>{
  if(!user){ alert("Silakan login terlebih dahulu."); window.location.href="../login/login.html"; return; }
  const p = await getDoc(doc(db,"profiles", user.uid));
  const role = (p.exists()? (p.data().role||"").toUpperCase() : "WARGA");
  if(!["BENDAHARA","ADMINSUPER"].includes(role)){
    alert("Akses khusus Bendahara/Adminsuper"); window.location.href="../dashboard/warga.html"; return;
  }
  await loadKas();
});

// Elements
const kasJenis = document.getElementById("kasJenis");
const kasJumlah = document.getElementById("kasJumlah");
const kasKet = document.getElementById("kasKet");
const kasKategori = document.getElementById("kasKategori");
const kasTanggalManual = document.getElementById("kasTanggalManual");
const btnAddKas = document.getElementById("btnAddKas");

const fStart = document.getElementById("fStart");
const fEnd = document.getElementById("fEnd");
const fJenis = document.getElementById("fJenis");
const btnFilter = document.getElementById("btnFilter");
const btnReset = document.getElementById("btnResetFilter");
const btnExport = document.getElementById("btnExportCSV");

const sumInEl = document.getElementById("sumIn");
const sumOutEl = document.getElementById("sumOut");
const sumBalEl = document.getElementById("sumBal");
const kasTable = document.querySelector("#kasTable tbody");
const rekapEl = document.getElementById("rekapBulanan");

// Load kas
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
        jenis: x.jenis,
        jumlah: Number(x.jumlah||0),
        kategori: x.kategori || "-",
        keterangan: x.keterangan || "-",
        tanggal: x.tanggal?.toDate ? x.tanggal.toDate() : null
      });
    });
    applyFilter();
  }catch(e){ kasTable.innerHTML = "<tr><td colspan='6'>Gagal memuat data</td></tr>"; }
  finally{ setLoading(false); }
}

// Tambah kas
btnAddKas?.addEventListener("click", async ()=>{
  const jenis = kasJenis.value;
  const jumlah = Number(kasJumlah.value||0);
  const ket = kasKet.value.trim();
  const kategori = kasKategori.value.trim();
  const tManual = kasTanggalManual.value ? new Date(kasTanggalManual.value+"T00:00:00") : null;
  if(!jumlah||jumlah<=0){ toast("Jumlah tidak valid"); return; }
  setLoading(true);
  try{
    await addDoc(collection(db,"kas"),{
      jenis, jumlah, keterangan:ket, kategori,
      tanggal: tManual ? tManual : serverTimestamp()
    });
    toast("Transaksi ditambahkan");
    kasJumlah.value = kasKet.value = kasKategori.value = kasTanggalManual.value = "";
    await loadKas();
  }catch(e){ toast("Gagal tambah: "+e.message); }
  finally{ setLoading(false); }
});

// Filter
btnFilter?.addEventListener("click", applyFilter);
btnReset?.addEventListener("click", ()=>{ fStart.value=fEnd.value=""; fJenis.value="SEMUA"; applyFilter(); });

// Filter logic
function applyFilter(){
  const s=fStart.value?new Date(fStart.value+"T00:00:00"):null;
  const e=fEnd.value?new Date(fEnd.value+"T23:59:59"):null;
  const j=fJenis.value;
  viewKas = rawKas.filter(r=>{
    let ok=true;
    if(j!=="SEMUA" && r.jenis!==j) ok=false;
    if(s && r.tanggal && r.tanggal<s) ok=false;
    if(e && r.tanggal && r.tanggal>e) ok=false;
    return ok;
  });
  renderTable(viewKas);
  renderSummary(viewKas);
  renderMonthlyChart(viewKas);
}

// Render table
function renderTable(rows){
  if(!rows.length){ kasTable.innerHTML="<tr><td colspan='6'>Tidak ada data</td></tr>"; return; }
  kasTable.innerHTML = rows.map(r=>{
    const t=r.tanggal?r.tanggal.toLocaleDateString("id-ID"):"-";
    return `<tr>
      <td>${t}</td><td>${r.jenis}</td><td>${r.kategori||"-"}</td>
      <td>${rupiah(r.jumlah)}</td><td>${r.keterangan}</td>
      <td><button class="btn" data-del="${r.id}" style="background:linear-gradient(135deg,#ff9c9c,#ff5e5e);color:#300">Hapus</button></td>
    </tr>`;
  }).join("");
  kasTable.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click", async()=>{
    if(!confirm("Hapus transaksi ini?"))return;
    await deleteDoc(doc(db,"kas",b.dataset.del));toast("Dihapus");loadKas();
  }));
}

// Ringkasan
function renderSummary(rows){
  const inT=rows.filter(r=>r.jenis==="Pemasukan").reduce((a,b)=>a+b.jumlah,0);
  const outT=rows.filter(r=>r.jenis==="Pengeluaran").reduce((a,b)=>a+b.jumlah,0);
  const sal=inT-outT;
  sumInEl.textContent=rupiah(inT);sumOutEl.textContent=rupiah(outT);sumBalEl.textContent=rupiah(sal);
}

// Chart bulanan
function renderMonthlyChart(rows){
  const map={};
  rows.forEach(r=>{
    if(!r.tanggal)return;
    const m=r.tanggal.getFullYear()+"-"+String(r.tanggal.getMonth()+1).padStart(2,"0");
    if(!map[m])map[m]={in:0,out:0};
    if(r.jenis==="Pemasukan")map[m].in+=r.jumlah;
    if(r.jenis==="Pengeluaran")map[m].out+=r.jumlah;
  });
  const labels=Object.keys(map).sort();
  const inVals=labels.map(m=>map[m].in);
  const outVals=labels.map(m=>map[m].out);
  rekapEl.innerHTML = labels.map((m,i)=>`<b>${m}</b>: Pemasukan ${rupiah(inVals[i])} — Pengeluaran ${rupiah(outVals[i])}`).join("<br>");
  if(kasChart) kasChart.destroy();
  kasChart=new Chart(chartCanvas,{
    type:"bar",
    data:{
      labels,
      datasets:[
        {label:"Pemasukan",data:inVals,backgroundColor:"rgba(0,194,255,.6)"},
        {label:"Pengeluaran",data:outVals,backgroundColor:"rgba(255,99,132,.6)"}
      ]
    },
    options:{
      responsive:true,
      plugins:{legend:{display:true,labels:{color:"#fff"}}},
      scales:{x:{ticks:{color:"#fff"}},y:{ticks:{color:"#fff"}}}
    }
  });
}

// Export CSV
btnExport?.addEventListener("click",()=>{
  if(!viewKas.length){toast("Tidak ada data");return;}
  const header=["Tanggal","Jenis","Kategori","Jumlah","Keterangan"];
  const rows=viewKas.map(r=>[r.tanggal?r.tanggal.toISOString():"",r.jenis,r.kategori||"",r.jumlah,r.keterangan||""]);
  const csv=[header,...rows].map(a=>a.join(",")).join("\\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download="laporan_kas.csv";
  document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  toast("CSV diunduh");
});
