function pickImages(it){
  const id = it.Id || it.id || "";
  const imgs = [];
  const logo = it.Logo1 || it.Logo || it.logo || (id ? `imagenes/${id}/logo.png` : "");
  if (logo) imgs.push(logo);
  // CSV keys Imagen1..Imagen10 (case variants)
  for(let i=1;i<=10;i++){
    const k1 = "Imagen"+i, k2 = "imagen"+i;
    if(it[k1]) imgs.push(it[k1]);
    if(it[k2]) imgs.push(it[k2]);
  }
  return [...new Set(imgs)].filter(Boolean);
}

// ⚠️ Cambia por tu URL pública CSV
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBAuMdD25rU-PCyLnn_6nOeb_NHRQtOHglGFL2QqMN7BD98JmWvJ1O2o6LkOjhwP0KCxYzTY_V3u9R/pub?gid=0&single=true&output=csv";
const $ = (s)=>document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function getParam(name){ return new URL(location.href).searchParams.get(name); }
function parseCSV(text){
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",").map(h=>h.trim().toLowerCase());
  return lines.map(l=>{
    const cells = l.split(",");
    const obj={}; headers.forEach((h,i)=>obj[h]=cells[i]?.trim()); return obj;
  });
}

function render(row){
  $("#detailLogo").src = row.logo || "";
  $("#detailName").textContent = row.nombre || "Nombre no disponible";
  $("#detailMeta").textContent = [row.categoria,row.ciudad,`Sección ${row.seccion}`].filter(Boolean).join(" • ");
  $("#detailDesc").textContent = row.descripcion || "Descripción no disponible";

  const whatsappBtn = $("#btnWhatsApp");
  if (row.whatsapp) {
    whatsappBtn.href = `https://wa.me/${row.whatsapp.replace(/\D/g, '')}`;
    whatsappBtn.style.display = "inline-block";
  } else {
    whatsappBtn.style.display = "none";
  }

  const webBtn = $("#btnWeb");
  if (row.web) {
    webBtn.href = row.web;
    webBtn.style.display = "inline-block";
  } else {
    webBtn.style.display = "none";
  }
  
  // Renderizar la galería
  const gallery = $("#detailGallery");
  const images = pickImages(row);
  if (images.length > 0) {
    gallery.innerHTML = images.map((src, i) => `<img src="${src}" alt="Foto ${i + 1}" onerror="this.style.display='none'">`).join("");
    gallery.style.display = "grid";
  } else {
    gallery.style.display = "none";
  }

  $("#detailLoading").classList.add("hidden");
  $("#detail").classList.remove("hidden");
}

async function load(){
  const id=getParam("id");
  if(!id){ $("#detailError").classList.remove("hidden"); return; }
  try{
    const res=await fetch(SHEET_CSV_URL);
    const text=await res.text();
    const rows=parseCSV(text);
    const row=rows.find(r=>r.id===id);
    if(!row) throw "No encontrado";
    render(row);
  }catch(e){
    console.error(e);
    $("#detailLoading").classList.add("hidden");
    $("#detailError").classList.remove("hidden");
  }
}
load();

function setupLightbox(){
  const lb = document.getElementById("lightbox");
  const img = document.getElementById("lightboxImg");
  const close = document.querySelector(".lightbox-close");
  function hide(){ lb.classList.add("hidden"); img.removeAttribute("src"); }
  close.addEventListener("click", hide);
  lb.addEventListener("click", (e)=>{ if(e.target===lb) hide(); });
  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") hide(); });
  // Delegate on gallery
  document.body.addEventListener("click",(e)=>{
    const t = e.target;
    if(t && t.matches(".gallery img")){
      const src = t.getAttribute("src");
      if(src){
        img.src = src;
        lb.classList.remove("hidden");
      }
    }
  });
}
document.addEventListener("DOMContentLoaded", setupLightbox);
