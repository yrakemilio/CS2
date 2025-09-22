/// ⚠️ Cambia por tu URL pública CSV
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBAuMdD25rU-PCyLnn_6nOeb_NHRQtOHglGFL2QqMN7BD98JmWvJ1O2o6LkOjhwP0KCxYzTY_V3u9R/pub?gid=0&single=true&output=csv";
const $ = (s) => document.querySelector(s);

function getParam(name){
  return new URL(location.href).searchParams.get(name);
}

function parseCSV(text){
  const rows=[]; let row=[], cur='', inQ=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(inQ && text[i+1]==='"'){ cur+='"'; i++; }
      else inQ=!inQ;
    }else if(c===',' && !inQ){
      row.push(cur); cur='';
    }else if((c==='\n'||c==='\r') && !inQ){
      if(c==='\r'&&text[i+1]==='\n') i++;
      row.push(cur); rows.push(row);
      row=[]; cur='';
    }else cur+=c;
  }
  if(cur||row.length){ row.push(cur); rows.push(row); }

  const headers=rows.shift().map(h=>h.trim().toLowerCase());
  return rows.map((r,i)=>{
    const o={};
    headers.forEach((h,idx)=>o[h]=(r[idx]||"").trim());
    if(!o.id) o.id=String(i+1); // generar id si no hay
    return o;
  });
}

function render(row){
  if(row.logo) $("#detailLogo").src = row.logo;
  $("#detailName").textContent = row.nombre || "Sin nombre";
  $("#detailMeta").textContent = [row.categoria,row.ciudad,row.seccion].filter(Boolean).join(" • ");
  $("#detailDesc").textContent = row.descripcion || "Sin descripción";

  // Botón 1: WhatsApp (sin cambios)
  if(row.whatsapp) $("#btnWhatsApp").href = `https://wa.me/${row.whatsapp}`;

  // Botón 2: Web / Contacto
  // Ahora el texto viene de la columna `descuento` de la hoja.
  const webBtn = $("#btnWeb");
  if (row.pagina && row.pagina.trim() !== "") {
    webBtn.href = row.pagina;
    webBtn.textContent = row.descuento && row.descuento.trim() !== "" ? row.descuento : "Visitar sitio";
    webBtn.classList.remove("hidden");
  } else {
    // Si no hay URL, ocultamos el botón para evitar href="#"
    webBtn.classList.add("hidden");
  }

  const imgs=[row.imagen1,row.imagen2,row.imagen3,row.imagen4,row.imagen5].filter(Boolean);
  $("#detailGallery").innerHTML = imgs.map((src,i)=>`<img src="${src}" alt="Foto ${i+1}">`).join("");
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
    const row=rows.find(r=>String(r.id)===String(id));
    if(!row) throw new Error("No encontrado");
    render(row);
  }catch(e){
    console.error(e);
    $("#detailLoading").classList.add("hidden");
    $("#detailError").classList.remove("hidden");
  }
}
load();
