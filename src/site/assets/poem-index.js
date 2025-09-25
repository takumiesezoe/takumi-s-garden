(function (global) {
  var LINK_RE = /\[\[([^\]|#]+?)(?:\|([^\]]+))?\]\]/g;

  function buildItems(markdown) {
    var items = [];
    if (!markdown) {
      return items;
    }

    var match;
    while ((match = LINK_RE.exec(markdown)) !== null) {
      var rawTarget = (match[1] || '').trim();
      if (!rawTarget) {
        continue;
      }
      var label = (match[2] || rawTarget).trim();
      var baseName = rawTarget.replace(/\.md$/i, '');
      var fileName = baseName + '.md';
      items.push({ label: label, fileName: fileName });
    }
    return items;
  }

  function normalizeBase(base) {
    if (!base) {
      return '';
    }
    return base.charAt(base.length - 1) === '/' ? base : base + '/';
  }

  function clearList(listEl) {
    while (listEl.firstChild) {
      listEl.removeChild(listEl.firstChild);
    }
  }

  function initPoemIndex(options) {
    options = options || {};

    var listSelector = options.listSelector || '#poem-list';
    var statusSelector = options.statusSelector || '#status';
    var hintSelector = options.hintSelector || '#hint';
    var indexPath = options.indexPath || 'index.md';
    var viewerBase = options.viewerBase || 'viewer.html';
    var fileBase = options.fileBase || '';
    var limit = options.limit != null ? options.limit : null;
    var fallbackMarkdown = options.fallbackMarkdown || null;

    var listEl = typeof document !== 'undefined' ? document.querySelector(listSelector) : null;
    if (!listEl) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn("initPoemIndex: no encontré el elemento '" + listSelector + "'.");
      }
      return;
    }

    var statusEl = statusSelector ? document.querySelector(statusSelector) : null;
    var hintEl = hintSelector ? document.querySelector(hintSelector) : null;

    function setStatus(text) {
      if (statusEl) {
        statusEl.textContent = text;
      }
    }

    function setHintVisible(visible) {
      if (hintEl) {
        hintEl.hidden = !visible;
      }
    }

    var fileBasePath = normalizeBase(fileBase);
    var isFiniteFn = Number.isFinite || function (value) {
      return typeof value === 'number' && isFinite(value);
    };
    var limited = isFiniteFn(limit) && limit > 0 ? Math.floor(limit) : null;
    var isFileProtocol =
      typeof window !== 'undefined' &&
      window.location &&
      window.location.protocol === 'file:';
    var canFetch = typeof fetch === 'function';
    var canCheckFiles = canFetch && !isFileProtocol;

    function renderItems(items) {
      clearList(listEl);

      if (!items.length) {
        setStatus('No hay poemas listados en index.md.');
        return;
      }

      var visibleItems = limited ? items.slice(0, limited) : items;
      setStatus('Lista preparada.');
      setHintVisible(false);

      visibleItems.forEach(function (item) {
        var label = item.label;
        var fileName = item.fileName;
        var li = document.createElement('li');
        var link = document.createElement('a');
        var encoded = encodeURIComponent(fileName);
        link.href = viewerBase + '?file=' + encoded;
        link.textContent = label;
        li.appendChild(link);
        listEl.appendChild(li);

        if (canCheckFiles) {
          fetch(fileBasePath + encoded, { method: 'HEAD' })
            .then(function (response) {
              if (!response.ok) {
                throw new Error('missing');
              }
            })
            .catch(function () {
              if (!li.classList.contains('missing')) {
                li.classList.add('missing');
              }
              if (!li.querySelector('.missing-warning')) {
                var spacer = document.createTextNode(' ');
                li.appendChild(spacer);
                var warning = document.createElement('span');
                warning.className = 'missing-warning';
                warning.textContent = '(archivo faltante)';
                li.appendChild(warning);
              }
              setHintVisible(true);
              setStatus('Hay poemas pendientes por subir.');
            });
        }
      });

      if (limited && items.length > visibleItems.length) {
        var moreLi = document.createElement('li');
        moreLi.classList.add('more-items', 'muted');
        var remaining = items.length - visibleItems.length;
        moreLi.textContent = '… y ' + remaining + ' poema' + (remaining === 1 ? '' : 's') + ' más en el índice completo.';
        listEl.appendChild(moreLi);
      }
    }

    function renderFromMarkdown(markdown) {
      var items = buildItems(markdown);
      renderItems(items);
      return items.length;
    }

    if (fallbackMarkdown) {
      try {
        var count = renderFromMarkdown(fallbackMarkdown);
        if (count) {
          setStatus('Lista precargada. Verificando actualizaciones…');
        }
      } catch (error) {
        if (typeof console !== 'undefined' && console.error) {
          console.error('No se pudo renderizar el índice precargado:', error);
        }
      }
    }

    if (!canFetch) {
      if (!listEl.childElementCount) {
        setStatus('Mostrando la copia precargada del índice.');
      }
      return;
    }

    fetch(indexPath)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('No se pudo cargar index.md (HTTP ' + response.status + ')');
        }
        return response.text();
      })
      .then(function (markdown) {
        renderFromMarkdown(markdown);
      })
      .catch(function (error) {
        if (typeof console !== 'undefined' && console.error) {
          console.error(error);
        }
        if (!listEl.childElementCount) {
          setStatus('No se pudo preparar el índice.');
        } else {
          setStatus('Mostrando la copia precargada del índice.');
        }
      });
  }

  if (global) {
    global.initPoemIndex = initPoemIndex;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
