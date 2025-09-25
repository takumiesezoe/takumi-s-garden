const LINK_RE = /\[\[([^\]|#]+?)(?:\|([^\]]+))?\]\]/g;

function buildItems(markdown) {
  const items = [];
  if (!markdown) {
    return items;
  }

  let match;
  while ((match = LINK_RE.exec(markdown)) !== null) {
    const rawTarget = (match[1] || '').trim();
    if (!rawTarget) continue;
    const label = (match[2] || rawTarget).trim();
    const baseName = rawTarget.replace(/\.md$/i, '');
    const fileName = `${baseName}.md`;
    items.push({ label, fileName });
  }
  return items;
}

function normalizeBase(base) {
  if (!base) return '';
  return base.endsWith('/') ? base : `${base}/`;
}

function clearList(listEl) {
  while (listEl.firstChild) {
    listEl.removeChild(listEl.firstChild);
  }
}

export function initPoemIndex(options = {}) {
  const {
    listSelector = '#poem-list',
    statusSelector = '#status',
    hintSelector = '#hint',
    indexPath = 'index.md',
    viewerBase = 'viewer.html',
    fileBase = '',
    limit = null,
    fallbackMarkdown = null,
  } = options;

  const listEl = document.querySelector(listSelector);
  if (!listEl) {
    console.warn(`initPoemIndex: no encontré el elemento '${listSelector}'.`);
    return;
  }

  const statusEl = statusSelector ? document.querySelector(statusSelector) : null;
  const hintEl = hintSelector ? document.querySelector(hintSelector) : null;

  const setStatus = (text) => {
    if (statusEl) {
      statusEl.textContent = text;
    }
  };

  const setHintVisible = (visible) => {
    if (hintEl) {
      hintEl.hidden = !visible;
    }
  };

  const fileBasePath = normalizeBase(fileBase);
  const limited = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null;
  const isFileProtocol =
    typeof window !== 'undefined' &&
    window.location &&
    window.location.protocol === 'file:';

  const renderItems = (items) => {
    clearList(listEl);

    if (!items.length) {
      setStatus('No hay poemas listados en index.md.');
      return;
    }

    const visibleItems = limited ? items.slice(0, limited) : items;
    setStatus('Lista preparada.');
    setHintVisible(false);

    visibleItems.forEach(({ label, fileName }) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      const encoded = encodeURIComponent(fileName);
      link.href = `${viewerBase}?file=${encoded}`;
      link.textContent = label;
      li.appendChild(link);
      listEl.appendChild(li);

      if (!isFileProtocol) {
        fetch(`${fileBasePath}${encoded}`, { method: 'HEAD' })
          .then((response) => {
            if (!response.ok) {
              throw new Error('missing');
            }
          })
          .catch(() => {
            li.classList.add('missing');
            link.removeAttribute('href');
            const warning = document.createElement('span');
            warning.textContent = '(archivo faltante)';
            li.appendChild(warning);
            setHintVisible(true);
            setStatus('Hay poemas pendientes por subir.');
          });
      }
    });

    if (limited && items.length > visibleItems.length) {
      const moreLi = document.createElement('li');
      moreLi.classList.add('more-items', 'muted');
      const remaining = items.length - visibleItems.length;
      moreLi.textContent = `… y ${remaining} poema${remaining === 1 ? '' : 's'} más en el índice completo.`;
      listEl.appendChild(moreLi);
    }
  };

  const renderFromMarkdown = (markdown) => {
    const items = buildItems(markdown);
    renderItems(items);
    return items.length;
  };

  if (fallbackMarkdown) {
    try {
      const count = renderFromMarkdown(fallbackMarkdown);
      if (count) {
        setStatus('Lista precargada. Verificando actualizaciones…');
      }
    } catch (error) {
      console.error('No se pudo renderizar el índice precargado:', error);
    }
  }

  fetch(indexPath)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`No se pudo cargar index.md (HTTP ${response.status})`);
      }
      return response.text();
    })
    .then((markdown) => {
      renderFromMarkdown(markdown);
    })
    .catch((error) => {
      console.error(error);
      if (!listEl.childElementCount) {
        setStatus('No se pudo preparar el índice.');
      } else {
        setStatus('Mostrando la copia precargada del índice.');
      }
    });
}

export default initPoemIndex;
