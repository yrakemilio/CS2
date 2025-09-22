// Google Sheet publicado en CSV
// ⚠️ Cambia por tu URL pública CSV
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRM9140leocSHNEKxfzFonrlEQdLGklsM3hXBZ_iiwdS4CwsDLeRI-w8c7RjkoqsITvrCCqgYku46-8/pub?output=csv";

let DATA = [];

// Simple cache (1 hour)
const CACHE_KEY = "suterm_csv_cache_v1";
const CACHE_TTL_MS = 60*60*1000;

function getCachedCSV(){
  try{
    const raw = localStorage.getItem(CACHE_KEY);
    if(!raw) return null;
    const {ts, text} = JSON.parse(raw);
    if(Date.now()-ts > CACHE_TTL_MS) return null;
    return text;
  }catch(e){ return null; }
}
function setCachedCSV(text){
  try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ts:Date.now(), text})); }catch(e){}
}

function debounce(fn, ms){
  let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
}

let FILTERS = { q: "", seccion: "", ciudad: "", categoria: "" };

const $ = (sel) => document.querySelector(sel);

function parseCSV(text){
  const rows=[]; let row=[], cur='', inQ=false;
  const pushCell=()=>{ row.push(cur); cur=''; };
  const pushRow =()=>{ rows.push(row); row=[]; };

  for (let i=0;i<text.length;i++){
    const c=text[i];
    if(c === '"'){
      if(inQ && text[i+1] === '"'){ cur += '"'; i++; }
      else inQ = !inQ;
    } else if(c === ',' && !inQ){
      pushCell();
    } else if((c === '\n' || c === '\r') && !inQ){
      if(c==='\r' && text[i+1]==='\n') i++;
      pushCell(); pushRow();
    } else {
      cur += c;
    }
  }
  if(cur.length || row.length){ pushCell(); pushRow(); }

  if(!rows.length) return [];
  const headers = rows.shift().map(h => String(h||'').trim().toLowerCase());
  return rows
    .filter(r => r.some(c => String(c||'').trim()!==''))
    .map(r => {
      const o={};
      headers.forEach((h,i)=> o[h]=String(r[i]||'').trim());
      return o;
    });
}

function renderCards(items){
  $("#results").innerHTML = items.map(it=>`
    <article class="card">
      ${it.logo ? `<img class="card-logo" loading="lazy" decoding="async" src="${it.logo}" alt="Logo ${it.nombre}">` : ''}
      <div class="card-body">
        <h3 class="card-title">${it.nombre}</h3>
        <p class="card-meta">${[it.categoria,it.ciudad,it.seccion].filter(Boolean).join(" • ")}</p>
        <p class="card-desc">${(it.descripcion||"").slice(0,120)}…</p>
        <a class="card-link" href="detalle.html?id=${it.id}">Ver más</a>
      </div>
    </article>
  `).join("");
}

// ✅ NUEVA FUNCIÓN: Llenar dinámicamente los selectores de los filtros
function populateFilters(){
  const secciones = [...new Set(DATA.map(d=>d.seccion))].filter(Boolean);
  const ciudades = [...new Set(DATA.map(d=>d.ciudad))].filter(Boolean);
  const categorias = [...new Set(DATA.map(d=>d.categoria))].filter(Boolean);

  const renderOptions = (items, id) => {
    const selector = $(`#${id}`);
    selector.innerHTML = `<option value="">Todas</option>` + items.map(item => `<option value="${item}">${item}</option>`).join("");
  };

  renderOptions(secciones, "seccion");
  renderOptions(ciudades, "ciudad");
  renderOptions(categorias, "categoria");
}

function applyFilters(){
  const q = FILTERS.q.toLowerCase();
  let list = DATA.filter(r=>{
    return (!q || r.nombre.toLowerCase().includes(q) || r.descripcion.toLowerCase().includes(q)) &&
           (!FILTERS.seccion || r.seccion===FILTERS.seccion) &&
           (!FILTERS.ciudad || r.ciudad===FILTERS.ciudad) &&
           (!FILTERS.categoria || r.categoria===FILTERS.categoria);
  });
  $("#empty").classList.add("hidden");
  $("#noResults").classList.toggle("hidden", list.length!==0);
  renderCards(list);
}

async function loadData(){
  $("#loading").classList.remove("hidden");
  try{
    const res = await fetch(SHEET_CSV_URL);
    const text = await res.text();
    DATA = parseCSV(text);
    // ✅ CORRECCIÓN: Llamamos a la nueva función para llenar los filtros después de cargar los datos
    populateFilters();
    $("#loading").classList.add("hidden");
    $("#empty").classList.remove("hidden");
  }catch(e){
    console.error(e);
    $("#loading").classList.add("hidden");
    $("#error").classList.remove("hidden");
  }
}

$("#btnBuscar").addEventListener("click",()=>{ FILTERS.q=$("#q").value; applyFilters(); });
["seccion","ciudad","categoria"].forEach(id=>{
  $("#"+id).addEventListener("change",e=>{ FILTERS[id]=e.target.value; applyFilters(); });
});

loadData();


// ============ Announcement (one active) ============
const ANNOUNCE_KEY = "suterm_announce_v1";
function saveAnnounce(data){ localStorage.setItem(ANNOUNCE_KEY, JSON.stringify(data)); }
function loadAnnounce(){ try{ return JSON.parse(localStorage.getItem(ANNOUNCE_KEY)||"null"); }catch(e){ return null; } }
function clearAnnounce(){ localStorage.removeItem(ANNOUNCE_KEY); }

function renderAnnounce(){
  const a = loadAnnounce();
  const box = document.getElementById("announcePreview");
  if(!box) return;
  if(a){
    box.classList.remove("hidden");
    document.getElementById("announceTitle").textContent = a.title||"";
    document.getElementById("announceText").textContent = a.desc||"";
    const img = document.getElementById("announceImg");
    if(a.img){ img.src=a.img; img.style.display="block"; } else { img.removeAttribute("src"); img.style.display="none"; }
    // Prefill form
    document.getElementById("annTitle").value = a.title||"";
    document.getElementById("annDesc").value = a.desc||"";
  }else{
    box.classList.add("hidden");
    document.getElementById("annTitle").value = "";
    document.getElementById("annDesc").value = "";
    const img = document.getElementById("announceImg"); img.removeAttribute("src");
  }
}

function setupAnnounce(){
  const form = document.getElementById("announceSection");
  if(!form) return;
  const btnDelete = document.getElementById("annDelete");
  const formEl = document.getElementById("announceForm");
  formEl.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const title = document.getElementById("annTitle").value.trim();
    const desc = document.getElementById("annDesc").value.trim();
    const file = document.getElementById("annImage").files[0];
    if(!title || !desc){ alert("Título y descripción son obligatorios."); return; }
    let img64 = null;
    if(file){
      img64 = await new Promise((resolve,reject)=>{
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(file);
      });
    }
    // Replace previous (not acumulable)
    saveAnnounce({title, desc, img: img64});
    renderAnnounce();
  });
  btnDelete.addEventListener("click", ()=>{
    if(confirm("¿Eliminar el anuncio actual?")){
      clearAnnounce();
      renderAnnounce();
      document.getElementById("annImage").value = "";
    }
  });
  renderAnnounce();
}

// Call after DOM ready
document.addEventListener("DOMContentLoaded", setupAnnounce);
