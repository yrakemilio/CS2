// URL de tu Google Sheet CSV de anuncios (puede ser otro CSV o la misma hoja)
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBAuMdD25rU-PCyLnn_6nOeb_NHRQtOHglGFL2QqMN7BD98JmWvJ1O2o6LkOjhwP0KCxYzTY_V3u9R/pub?gid=1&single=true&output=csv";

let DATA = [];
let FILTERS = { q: "", seccion: "", ciudad: "", categoria: "" };

const $ = (sel) => document.querySelector(sel);

// parse CSV básico
function parseCSV(text){
  const rows = text.trim().split("\n");
  const headers = rows.shift().split(",").map(h=>h.trim().toLowerCase());
  return rows.map(l=>{
    const cells = l.split(",");
    const obj={}; headers.forEach((h,i)=> obj[h]=cells[i]?.trim());
    return obj;
  });
}

// render de resultados
function renderCards(items){
  $("#results").innerHTML = items.map(it=>`
    <article class="card">
      ${it.logo ? `<img class="card-logo" src="${it.logo}" alt="Logo ${it.nombre}">` : ''}
      <div class="card-body">
        <h3 class="card-title">${it.nombre}</h3>
        <p class="card-meta">${[it.categoria,it.ciudad,it.seccion].filter(Boolean).join(" • ")}</p>
        <p class="card-desc">${(it.descripcion||"").slice(0,120)}…</p>
        <a class="card-link" href="detalle.html?id=${it.id}">Ver más</a>
      </div>
    </article>
  `).join("");
}

// llenar filtros
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

// aplicar filtros
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

// mostrar anuncio único
function showAd(ad){
  let container = document.querySelector(".ad-section");
  if(!container){
    // si no existe, creamos la sección
    container = document.createElement("div");
    container.className = "ad-section";
    document.querySelector(".main-grid").prepend(container);
  }
  container.innerHTML = `
    ${ad.imagen ? `<img src="${ad.imagen}" alt="Anuncio" style="width:100%;border-radius:8px;margin-bottom:8px;">` : ''}
    <h3>${ad.titulo || "Anuncio"}</h3>
    <p>${ad.descripcion || ""}</p>
    ${ad.link ? `<a href="${ad.link}" class="btn" target="_blank">Ver más</a>` : ''}
  `;
}

// cargar datos
async function loadData(){
  $("#loading").classList.remove("hidden");
  try{
    const res = await fetch(SHEET_CSV_URL);
    const text = await res.text();
    DATA = parseCSV(text);
    populateFilters();
    $("#loading").classList.add("hidden");
    $("#empty").classList.remove("hidden");

    // si hay anuncios en el CSV (marcados con ad=true), mostramos el primero
    const ad = DATA.find(d=>d.ad && d.ad.toLowerCase() === "true");
    if(ad) showAd(ad);

  }catch(e){
    console.error(e);
    $("#loading").classList.add("hidden");
    $("#error").classList.remove("hidden");
  }
}

// eventos de filtros
$("#btnBuscar").addEventListener("click",()=>{ FILTERS.q=$("#q").value; applyFilters(); });
["seccion","ciudad","categoria"].forEach(id=>{
  $("#"+id).addEventListener("change",e=>{ FILTERS[id]=e.target.value; applyFilters(); });
});

loadData();
