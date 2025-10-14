// ===================================================
// 📑 Dashboard Sekretaris v4.3 — Upload & Arsip Surat
// ===================================================
import { auth, db, storage } from "../../config/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const toastEl = document.getElementById("toast");
const loading = document.getElementById("loading");
function setLoading(v){ loading.style.display = v ? "flex" : "none"; }
function toast(msg){ toastEl.textContent = msg; toastEl.classList.add("show"); setTimeout(()=>toastEl.classList.remove("show"),2600); }

let suratData = [];

onAuthStateChanged(auth, async (user)=>{
  if(!user){ alert("Silakan login terlebih dahulu."); window.location.href="../login/login.html"; return; }
  await loadSurat();
});

// Upload surat
const btnUpload = document.getElementById("btnUploadSurat");
btnUpload?.addEventListener("click", async ()=>{
  const judul = suratJudul.value.trim();
  const jenis = suratJenis.value;
  const tgl = suratTanggal.value;
  const file = suratFile.files[0];
  if(!judul || !file){ toast("Lengkapi data dan pilih file PDF!"); return; }
  setLoading(true);
  try{
    const fileRef = ref(storage, "surat/"+Date.now()+"_"+file.name);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    await addDoc(collection(db,"surat"),{judul,jenis,tanggal:tgl,url,created:serverTimestamp()});
    toast("Surat berhasil diupload");
    suratJudul.value = suratTanggal.value = ""; suratFile.value="";
    await loadSurat();
  }catch(e){ toast("Gagal upload: "+e.message); }
  finally{ setLoading(false); }
});

// Load data surat
async function loadSurat(){
  setLoading(true);
  const tbody = document.querySelector("#suratTable tbody");
  const snap = await getDocs(collection(db,"surat"));
  suratData = [];
  let html = "";
  snap.forEach(d=>{
    const x = d.data(); suratData.push({...x,id:d.id});
    html += `<tr>
      <td>${x.tanggal||"-"}</td>
      <td>${x.judul}</td>
      <td>${x.jenis}</td>
      <td><a href="${x.url}" target="_blank">📄 Lihat</a></td>
      <td><button class="btn" data-del="${d.id}" style="background:linear-gradient(135deg,#ff9c9c,#ff5e5e);color:#300;">Hapus</button></td>
    </tr>`;
  });
  tbody.innerHTML = html || "<tr><td colspan='5'>Belum ada surat.</td></tr>";
  tbody.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",()=>deleteSurat(b.dataset.del)));
  setLoading(false);
}

// Hapus surat
async function deleteSurat(id){
  if(!confirm("Hapus surat ini?"))return;
  setLoading(true);
  try{
    const s = suratData.find(x=>x.id===id);
    if(s?.url){
      const fileRef = ref(storage, s.url);
      try{ await deleteObject(fileRef); }catch{}
    }
    await deleteDoc(doc(db,"surat",id));
    toast("Surat dihapus");
    await loadSurat();
  }catch(e){ toast("Gagal hapus: "+e.message); }
  finally{ setLoading(false); }
}

// Filter surat
document.getElementById("btnFilter")?.addEventListener("click", ()=>{
  const s = filterStart.value ? new Date(filterStart.value+"T00:00:00") : null;
  const e = filterEnd.value ? new Date(filterEnd.value+"T23:59:59") : null;
  const jenis = filterJenis.value;
  const tbody = document.querySelector("#suratTable tbody");
  let rows = suratData;
  if(jenis!=="SEMUA") rows = rows.filter(r=>r.jenis===jenis);
  if(s) rows = rows.filter(r=>r.tanggal && new Date(r.tanggal)>=s);
  if(e) rows = rows.filter(r=>r.tanggal && new Date(r.tanggal)<=e);
  let html="";
  rows.forEach(r=>{
    html+=`<tr><td>${r.tanggal||"-"}</td><td>${r.judul}</td><td>${r.jenis}</td>
      <td><a href="${r.url}" target="_blank">📄</a></td><td>—</td></tr>`;
  });
  tbody.innerHTML = html || "<tr><td colspan='5'>Tidak ada surat.</td></tr>";
});
