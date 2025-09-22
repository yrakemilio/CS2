// Google Sheet publicado en CSV
// ⚠️ Cambia por tu URL pública CSV
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRM9140leocSHNEKxfzFonrlEQdLGklsM3hXBZ_iiwdS4CwsDLeRI-w8c7RjkoqsITvrCCqgYku46-8/pub?output=csv";

let DATA = [];
let FILTERS = { q: "", seccion: "", ciudad: "", categoria: "" };

const $ = (sel) => document.querySelector(sel);

function parseCSV(text){
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",").map(h=>h.trim().toLowerCase());
  return lines.map(l=>{
    const cells = l.split(",");
    const obj={};
    headers.forEach((h,i)=>obj[h]=cells[i]?.trim());
    return obj;
  });
}

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
    populateFilters();
    $("#loading").classList.add("hidden");
    $("#empty").classList.remove("hidden");
  }catch(e){
    console.error(e);
    $("#loading").classList.add("hidden");
    $("#error").classList.remove("hidden");
  }
}

function saveAnnounce({ title, desc, img }) {
  try {
    const data = JSON.stringify({ title, desc, img });
    localStorage.setItem("suterm_announcement", data);
  } catch (e) {
    console.error("Error al guardar el anuncio:", e);
  }
}

function getAnnounce() {
  try {
    const raw = localStorage.getItem("suterm_announcement");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearAnnounce() {
  localStorage.removeItem("suterm_announcement");
}

function renderAnnounce() {
  const announce = getAnnounce();
  const box = document.getElementById("announcementSection");
  if (announce && announce.title && announce.desc) {
    box.classList.remove("hidden");
    document.getElementById("annTitle").textContent = announce.title;
    document.getElementById("annDesc").textContent = announce.desc;
    const img = document.getElementById("announceImg");
    if (announce.img) {
      img.src = announce.img;
      img.classList.remove("hidden");
    } else {
      img.classList.add("hidden");
    }
  } else {
    box.classList.add("hidden");
  }
}

function setupAnnounce() {
  const form = document.getElementById("announceForm");
  const btnDelete = document.getElementById("annDelete");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("annTitleInput").value.trim();
      const desc = document.getElementById("annDescInput").value.trim();
      const file = document.getElementById("annImageInput").files[0];

      if (!title || !desc) {
        alert("Título y descripción son obligatorios.");
        return;
      }

      let img64 = null;
      if (file) {
        img64 = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = reject;
          fr.readAsDataURL(file);
        });
      }

      saveAnnounce({ title, desc, img: img64 });
      renderAnnounce();
    });
  }

  if (btnDelete) {
    btnDelete.addEventListener("click", () => {
      if (confirm("¿Eliminar el anuncio actual?")) {
        clearAnnounce();
        renderAnnounce();
        document.getElementById("annImageInput").value = "";
      }
    });
  }

  renderAnnounce();
}

$("#btnBuscar").addEventListener("click",()=>{ FILTERS.q=$("#q").value; applyFilters(); });
["seccion","ciudad","categoria"].forEach(id=>{
  $("#"+id).addEventListener("change",e=>{ FILTERS[id]=e.target.value; applyFilters(); });
});

loadData();
document.addEventListener("DOMContentLoaded", setupAnnounce);
