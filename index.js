// Google Sheet publicado en CSV
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBAuMdD25rU-PCyLnn_6nOeb_NHRQtOHglGFL2QqMN7BD98JmWvJ1O2o6LkOjhwP0KCxYzTY_V3u9R/pub?gid=0&single=true&output=csv";

let DATA = [];
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
  $(".results-container").innerHTML = items.map(it=>`
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

// Llenar selectores de filtros
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

// Renderizar anuncio único
function renderAd(){
  const adContainer = $(".ad-section");
  if(!adContainer) return;
  const ad = DATA.find(d=>d.anuncio && d.anuncio.toLowerCase() === "sí");
  if(ad){
    adContainer.innerHTML = `
      <h3>Anuncio</h3>
      <p>${ad.nombre}</p>
      ${ad.logo ? `<img src="${ad.logo}" alt="${ad.nombre}" style="width:100%;border-radius:8px;margin-top:6px;">` : ''}
      <a class="btn" href="detalle.html?id=${ad.id}">Ver más</a>
    `;
  } else {
    adContainer.innerHTML = "";
  }
}

async function loadData(){
  $("#loading").classList.remove("hidden");
  try{
    const res = await fetch(SHEET_CSV_URL);
    const text = await res.text();
    DATA = parseCSV(text);
    populateFilters();
    $("#loading").classList.add("hidden");
    $("#empty").classList.remove("hidden");
    renderAd();
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
