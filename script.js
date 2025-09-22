// =====================
// CONFIG
// =====================
const CSV_URL = "https://docs.google.com/spreadsheets/d/1UEe7H53Sshc_xuHx-9JYMD8F6eECQg4czay-54cMQvM/edit?usp=drive_link";

// Arrancar vacío
const START_EMPTY = true;

let DATA = [];

// Helpers
const $ = (s)=>document.querySelector(s);
const unique = (a)=>[...new Set(a.filter(Boolean))].sort();
function norm(row){
  const out = {};
  Object.keys(row).forEach(k=>{
    const nk = String(k||"").trim();
    out[nk] = String(row[k] ?? "").trim();
  });
  return out;
}

function pickLogo(it){
  const fromSheet = it.Logo1 || it.Logo || it.logo;
  if (fromSheet) return fromSheet;
  if (it.Id) return `imagenes/${it.Id}/logo.png`;
  return "https://via.placeholder.com/600x400?text=Sin+imagen";
}
function pickImages(it){
  const id = it.Id || "";
  const imgs = [];
  const logo = it.Logo1 || it.Logo || it.logo || (id ? `imagenes/${id}/logo.png` : "");
  if (logo) imgs.push(logo);
  ["Imagen1","Imagen2","Imagen3","imagen1","imagen2","imagen3"].forEach(k=>{
    const v = it[k]; if (v) imgs.push(v);
  });
  if (id){
    ["imagen1.jpg","imagen2.jpg","imagen3.jpg"].forEach(fn=>{
      imgs.push(`imagenes/${id}/${fn}`);
    });
  }
  return [...new Set(imgs)];
}

// Cargar CSV
function loadData(){
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: ({data})=>{
      DATA = data.map(norm);
      populateFilters();
      renderEmptyMessage();
      attachListHandlers();
    },
    error: ()=>{
      $("#results").innerHTML = `<p style="color:red">⚠️ No se pudo cargar la base.</p>`;
    }
  });
}

// Lista
function populateFilters(){
  fill("seccionFilter",  unique(DATA.map(i=>i.Seccion)));
  fill("ciudadFilter",   unique(DATA.map(i=>i.Ciudad)));
  fill("categoriaFilter",unique(DATA.map(i=>i.Categoria)));
}
function fill(id, opts){
  const sel = document.getElementById(id);
  opts.forEach(v=>{
    const o=document.createElement("option");
    o.value=v; o.textContent=v; sel.appendChild(o);
  });
}
function getFilters(){
  return {
    q  : $("#searchInput").value.toLowerCase().trim(),
    sec: $("#seccionFilter").value,
    cdd: $("#ciudadFilter").value,
    cat: $("#categoriaFilter").value
  };
}
function renderEmptyMessage(){
  $("#results").innerHTML = `<p style="color:#666">Escribe algo en <b>Buscar</b> o usa los filtros.</p>`;
}
function renderList(){
  const {q,sec,cdd,cat} = getFilters();
  const box = $("#results");

  const nothingSelected = !q && !sec && !cdd && !cat;
  if (START_EMPTY && nothingSelected){
    renderEmptyMessage();
    return;
  }

  const list = DATA.filter(it=>{
    const mq  = !q   || (it.Nombre && it.Nombre.toLowerCase().includes(q)) ||
                        (it.Descripcion && it.Descripcion.toLowerCase().includes(q));
    const ms  = !sec || it.Seccion===sec;
    const mc  = !cdd || it.Ciudad===cdd;
    const mcat= !cat || it.Categoria===cat;
    return mq && ms && mc && mcat;
  });

  box.innerHTML = "";
  if (!list.length){
    box.innerHTML = `<p style="color:#666">No hay resultados.</p>`;
    return;
  }

  list.forEach(it=>{
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${pickLogo(it)}" alt="logo ${it.Nombre||''}"
           onerror="this.onerror=null;this.src='https://via.placeholder.com/600x400?text=Sin+imagen'">
      <h3>${it.Nombre||""}</h3>
      <p><b>${it.Categoria||""}</b> - ${it.Ciudad||""}, Sección ${it.Seccion||""}</p>
      <p>${it.Descripcion||""}</p>
      <a class="btn" href="#" data-id="${it.Id||''}">Ver más</a>
    `;
    box.appendChild(card);
  });

  attachDetailLinks();
}

// Detalle
function renderDetail(it){
  const box = $("#results");
  const imgs = pickImages(it);

  box.innerHTML = `
    <a class="back" href="#" style="text-decoration:none;color:#374151;display:inline-block;margin-bottom:10px">&larr; Volver</a>
    <div class="detail">
      <h2>${it.Nombre||""}</h2>
      <div class="meta"><b>${it.Categoria||""}</b> — ${it.Ciudad||""}, Sección ${it.Seccion||""}</div>
      <p>${it.Descripcion||""}</p>
      <div class="gallery">
        ${imgs.map(src=>`<img src="${src}" alt="" onerror="this.style.display='none'">`).join("")}
      </div>
    </div>
  `;
  box.querySelector(".back").addEventListener("click",(e)=>{
    e.preventDefault();
    renderList();
  });
}

// Eventos
function attachListHandlers(){
  ["searchInput","seccionFilter","ciudadFilter","categoriaFilter"].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(id==="searchInput"?"input":"change", renderList);
  });
}
function attachDetailLinks(){
  document.querySelectorAll('#results .btn[data-id]').forEach(a=>{
    a.addEventListener("click",(e)=>{
      e.preventDefault();
      const id = a.getAttribute("data-id");
      const it = DATA.find(r => (r.Id||"") === id);
      if (it) renderDetail(it);
    });
  });
}

// INIT
loadData();
