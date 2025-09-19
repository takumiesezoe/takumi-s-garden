---
idioma: <% tp.system.suggester(["Español", "Inglés"], ["Español", "Inglés"]) %>
fecha: <% tp.date.now("YYYY-MM-DD HH:mm") %>
numero: <%*
/*
  AUTO-NUMERACIÓN PARA "Escritos":
  - Busca todas las notas en la carpeta "Escritos"
  - Lee su frontmatter "numero"
  - Asigna max(numero)+1
*/
const dv = app.plugins.plugins?.dataview?.api;
if (!dv) { tR = 1; } else {
  const pages = dv.pages('"Escritos"'); // ← CAMBIA "Escritos" si tu carpeta tiene otro nombre
  const nums = pages.numero?.array?.() ?? [];
  const valid = nums.filter(n => typeof n === 'number' && !isNaN(n));
  const maxNum = valid.length ? Math.max(...valid) : 0;
  tR = maxNum + 1;
}
%>
---
# <% tp.file.title %>
