// Google Sheet publicado en CSV
// ⚠️ Cambia por tu URL pública CSV
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBAuMdD25rU-PCyLnn_6nOeb_NHRQtOHglGFL2QqMN7BD98JmWvJ1O2o6LkOjhwP0KCxYzTY_V3u9R/pub?gid=0&single=true&output=csv";

let DATA = [];

// Simple cache (1 hour)
const CACHE_KEY = "suterm_csv_cache_v1";
const CACHE_TTL_MS = 60 * 60 * 1000;

function getCachedCSV() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, text } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return text;
  } catch (e) {
    return null;
  }
}

function setCachedCSV(text) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), text }));
  } catch (e) {}
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

let FILTERS = {
  q: "",
  seccion: "",
  ciudad: "",
  categoria: ""
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",").map(h => h.trim().toLowerCase());
  return lines.map(l => {
    const cells = l.split(",");
    const obj = {};
    headers.forEach((h, i) => obj[h] = cells[i]?.trim());
    return obj;
  });
}

function render(rows = []) {
  const resultEl = $("#results");
  resultEl.innerHTML = rows
    .map(
      (it) => `
        <article class="card">
          <img class="card-logo" src="${it.logo}" alt="Logo de ${it.nombre}" onerror="this.src='https://via.placeholder.com/80x80?text=Logo'">
          <div class="card-body">
            <h3 class="card-title">${it.nombre}</h3>
            <p class="card-meta">${[it.categoria, it.ciudad, `Sección ${it.seccion}`].filter(Boolean).join(" • ")}</p>
            <p class="card-desc">${it.descripcion}</p>
            <a class="card-link" href="detalle.html?id=${it.id}">Ver más</a>
          </div>
        </article>
      `
    )
    .join("");

  const states = {
    loading: $("#loading"),
    empty: $("#empty"),
    noResults: $("#noResults"),
    error: $("#error"),
  };

  Object.values(states).forEach((el) => el.classList.add("hidden"));

  if (rows.length === 0) {
    if (FILTERS.q || FILTERS.seccion || FILTERS.ciudad || FILTERS.categoria) {
      states.noResults.classList.remove("hidden");
    } else {
      states.empty.classList.remove("hidden");
    }
  }
}

function getFilters() {
  FILTERS = {
    q: $("#q").value.toLowerCase().trim(),
    seccion: $("#seccion").value,
    ciudad: $("#ciudad").value,
    categoria: $("#categoria").value,
  };
  return FILTERS;
}

function filterData() {
  const { q, seccion, ciudad, categoria } = getFilters();
  return DATA.filter((it) => {
    const name = it.nombre?.toLowerCase() || "";
    const desc = it.descripcion?.toLowerCase() || "";
    const meetsSearch = !q || name.includes(q) || desc.includes(q);
    const meetsSeccion = !seccion || it.seccion === seccion;
    const meetsCiudad = !ciudad || it.ciudad === ciudad;
    const meetsCategoria = !categoria || it.categoria === categoria;
    return meetsSearch && meetsSeccion && meetsCiudad && meetsCategoria;
  });
}

const renderList = debounce(() => {
  const filtered = filterData();
  render(filtered);
}, 300);

function populateFilters(data) {
  const secciones = [...new Set(data.map((r) => r.seccion).filter(Boolean))].sort();
  const ciudades = [...new Set(data.map((r) => r.ciudad).filter(Boolean))].sort();
  const categorias = [...new Set(data.map((r) => r.categoria).filter(Boolean))].sort();

  const createOptions = (arr) => arr.map((v) => `<option value="${v}">${v}</option>`).join("");

  $("#seccion").innerHTML += createOptions(secciones);
  $("#ciudad").innerHTML += createOptions(ciudades);
  $("#categoria").innerHTML += createOptions(categorias);
}

async function load() {
  try {
    const cached = getCachedCSV();
    if (cached) {
      DATA = parseCSV(cached);
      populateFilters(DATA);
      render(DATA);
      return;
    }

    $("#loading").classList.remove("hidden");
    const res = await fetch(SHEET_CSV_URL);
    const text = await res.text();
    DATA = parseCSV(text);
    setCachedCSV(text);
    populateFilters(DATA);
    render(DATA);
  } catch (e) {
    console.error(e);
    $("#loading").classList.add("hidden");
    $("#error").classList.remove("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  load();

  $("#q").addEventListener("input", renderList);
  $("#btnBuscar").addEventListener("click", () => renderList());
  $("#seccion").addEventListener("change", renderList);
  $("#ciudad").addEventListener("change", renderList);
  $("#categoria").addEventListener("change", renderList);
});

// Anuncio
function saveAnnounce(data) {
  localStorage.setItem("suterm_announcement", JSON.stringify(data));
}
function getAnnounce() {
  const raw = localStorage.getItem("suterm_announcement");
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
function clearAnnounce() {
  localStorage.removeItem("suterm_announcement");
}
function renderAnnounce() {
  const box = $("#announcementSection");
  const a = getAnnounce();
  if (a) {
    box.classList.remove("hidden");
    $("#annTitle").textContent = a.title || "";
    $("#annDesc").textContent = a.desc || "";
    if (a.img) {
      $("#announceImg").src = a.img;
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
      saveAnnounce({
        title,
        desc,
        img: img64
      });
      renderAnnounce();
      alert("Anuncio guardado.");
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

document.addEventListener("DOMContentLoaded", setupAnnounce);
