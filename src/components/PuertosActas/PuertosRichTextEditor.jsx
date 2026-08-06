import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { createPortal, flushSync } from 'react-dom';

const btnCls =
  'inline-flex h-8 min-w-8 items-center justify-center rounded px-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700';

const PALETA_RAPIDA = [
  '#141414',
  '#475569',
  '#c41e3a',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0d9488',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#92400e',
  '#ffffff',
];

function construirPaletaExtendida() {
  const out = [];
  for (let light = 22; light <= 78; light += 14) {
    for (let hue = 0; hue < 360; hue += 30) {
      out.push(`hsl(${hue} 75% ${light}%)`);
    }
  }
  for (let g = 10; g <= 95; g += 17) {
    out.push(`hsl(0 0% ${g}%)`);
  }
  return out;
}

const PALETA_EXTENDIDA = construirPaletaExtendida();

function normalizarHex(valor) {
  const v = String(valor || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v.toLowerCase()}`;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const s = v.slice(1);
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`.toLowerCase();
  }
  return null;
}

function textoPlanoDeHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCssLength(raw, basePx) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (s.endsWith('%')) {
    const n = parseFloat(s);
    return Number.isFinite(n) && basePx > 0 ? (n / 100) * basePx : null;
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Asegura colgroup y anchos % persistentes (editor + PDF). */
function sincronizarAnchosTabla(table, anchosPx) {
  if (!table || !anchosPx?.length) return;
  const total = anchosPx.reduce((a, b) => a + b, 0) || 1;
  const pcts = anchosPx.map((w) => Math.max(4, Math.round((w / total) * 1000) / 10));
  // Normalizar a ~100
  const sum = pcts.reduce((a, b) => a + b, 0) || 1;
  const norm = pcts.map((p) => Math.round((p / sum) * 1000) / 10);

  let colgroup = table.querySelector(':scope > colgroup');
  if (!colgroup) {
    colgroup = document.createElement('colgroup');
    table.insertBefore(colgroup, table.firstChild);
  }
  while (colgroup.children.length < norm.length) {
    colgroup.appendChild(document.createElement('col'));
  }
  while (colgroup.children.length > norm.length) {
    colgroup.removeChild(colgroup.lastChild);
  }
  Array.from(colgroup.children).forEach((col, i) => {
    col.style.width = `${norm[i]}%`;
    col.setAttribute('width', `${norm[i]}%`);
  });

  table.querySelectorAll('tr').forEach((tr) => {
    const cells = Array.from(tr.children).filter((c) =>
      /^(td|th)$/i.test(c.tagName || '')
    );
    cells.forEach((cell, i) => {
      if (i >= norm.length) return;
      cell.style.width = `${norm[i]}%`;
    });
  });
}

function leerAnchosColumnasPx(table) {
  const firstRow = table.querySelector('tr');
  if (!firstRow) return [];
  const cells = Array.from(firstRow.children).filter((c) =>
    /^(td|th)$/i.test(c.tagName || '')
  );
  if (!cells.length) return [];

  const cols = table.querySelectorAll(':scope > colgroup > col');
  if (cols.length === cells.length) {
    const tableW = table.getBoundingClientRect().width || 1;
    const fromCol = Array.from(cols).map((col) => {
      const w = parseCssLength(col.style.width || col.getAttribute('width'), tableW);
      return w && w > 0 ? w : null;
    });
    if (fromCol.every((w) => w != null)) return fromCol;
  }

  return cells.map((c) => Math.max(24, c.getBoundingClientRect().width));
}

function tablaDesdeNodo(node, root) {
  let n = node;
  while (n && n !== root) {
    if (n.nodeType === 1 && String(n.tagName || '').toLowerCase() === 'table') {
      return n;
    }
    n = n.parentNode;
  }
  return null;
}

/**
 * Editor WYSIWYG: el DOM es la fuente de verdad mientras el usuario edita.
 * No sobrescribe contenido local con un value vacío/desfasado del padre.
 */
const PuertosRichTextEditor = forwardRef(function PuertosRichTextEditor(
  {
    value = '',
    onChange,
    readOnly = false,
    placeholder = '',
    minHeight = 140,
    /** Cambia al cargar otra acta / limpiar: permite reemplazar el HTML de forma segura */
    syncKey = 'default',
    /** Identificador DOM para lectura al grabar: observaciones | recomendaciones */
    editorId = 'observaciones',
  },
  ref
) {
  const editorRef = useRef(null);
  const lastHtml = useRef(value || '');
  const dirtyRef = useRef(false);
  const syncKeyRef = useRef(syncKey);
  const colorBtnRef = useRef(null);
  const paletteRef = useRef(null);
  const colorBarRef = useRef(null);
  const colorLetterRef = useRef(null);
  const tablaBtnRef = useRef(null);
  const anchoBtnRef = useRef(null);
  const cuadroPanelRef = useRef(null);
  const savedRange = useRef(null);
  const onChangeRef = useRef(onChange);
  const resizeRef = useRef(null);
  onChangeRef.current = onChange;

  const [paletaAbierta, setPaletaAbierta] = useState(false);
  const [palettePos, setPalettePos] = useState({ top: 0, left: 0 });
  const [masColores, setMasColores] = useState(false);
  const [hexManual, setHexManual] = useState('#c41e3a');
  const [mostrarPlaceholder, setMostrarPlaceholder] = useState(
    () => !textoPlanoDeHtml(value)
  );
  const [cuadroPanel, setCuadroPanel] = useState(null); // 'insert' | 'ancho' | null
  const [cuadroPos, setCuadroPos] = useState({ top: 0, left: 0 });
  const [gridHover, setGridHover] = useState({ rows: 3, cols: 2 });
  const [anchoPct, setAnchoPct] = useState(35);
  const [tieneCuadro, setTieneCuadro] = useState(true);

  const anchoPaleta = masColores ? 240 : 188;
  const altoEstimado = masColores ? 360 : 200;
  const GRID_MAX_ROWS = 8;
  const GRID_MAX_COLS = 6;
  const ANCHO_PRESETS = [25, 35, 50, 75];

  const aplicarHtmlExterno = useCallback((html) => {
    const el = editorRef.current;
    const next = html || '';
    if (el) el.innerHTML = next;
    lastHtml.current = next;
    dirtyRef.current = false;
    savedRange.current = null;
    setMostrarPlaceholder(!textoPlanoDeHtml(next));
  }, []);

  // Sembrar HTML al montar / al cambiar de acta
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    if (syncKeyRef.current !== syncKey) {
      syncKeyRef.current = syncKey;
      aplicarHtmlExterno(value);
      return;
    }

    // Primera pintura: si el DOM está vacío y hay value, aplicar
    if (!dirtyRef.current && !textoPlanoDeHtml(el.innerHTML) && textoPlanoDeHtml(value)) {
      aplicarHtmlExterno(value);
      return;
    }

    if (dirtyRef.current) return;
    if ((value || '') === lastHtml.current) return;
    aplicarHtmlExterno(value);
  }, [value, syncKey, aplicarHtmlExterno]);

  useEffect(() => {
    if (!paletaAbierta) return undefined;
    const cerrar = (e) => {
      if (
        paletteRef.current?.contains(e.target) ||
        colorBtnRef.current?.contains(e.target)
      ) {
        return;
      }
      setPaletaAbierta(false);
      setMasColores(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [paletaAbierta]);

  useEffect(() => {
    if (!cuadroPanel) return undefined;
    const cerrar = (e) => {
      if (
        cuadroPanelRef.current?.contains(e.target) ||
        tablaBtnRef.current?.contains(e.target) ||
        anchoBtnRef.current?.contains(e.target)
      ) {
        return;
      }
      setCuadroPanel(null);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [cuadroPanel]);

  const leerHtml = () => editorRef.current?.innerHTML || lastHtml.current || '';

  const emitir = useCallback((sincrono = false) => {
    const html = leerHtml();
    lastHtml.current = html;
    dirtyRef.current = true;
    if (sincrono) {
      flushSync(() => {
        onChangeRef.current?.(html);
      });
    } else {
      onChangeRef.current?.(html);
    }
    return html;
  }, []);

  /** Arrastre de bordes: columnas y ancho total del cuadro. */
  useEffect(() => {
    if (readOnly) return undefined;
    const editor = editorRef.current;
    if (!editor) return undefined;

    const HIT = 6;

    const hitTest = (e) => {
      const tables = editor.querySelectorAll('table');
      for (const table of tables) {
        const rect = table.getBoundingClientRect();
        if (
          e.clientY < rect.top - 2 ||
          e.clientY > rect.bottom + 2 ||
          e.clientX < rect.left - 2 ||
          e.clientX > rect.right + HIT + 2
        ) {
          continue;
        }

        // Borde derecho → ancho total del cuadro
        if (Math.abs(e.clientX - rect.right) <= HIT) {
          return { mode: 'table', table, startX: e.clientX, startW: rect.width };
        }

        const firstRow = table.querySelector('tr');
        if (!firstRow) continue;
        const cells = Array.from(firstRow.children).filter((c) =>
          /^(td|th)$/i.test(c.tagName || '')
        );
        for (let i = 0; i < cells.length - 1; i += 1) {
          const cellRect = cells[i].getBoundingClientRect();
          if (Math.abs(e.clientX - cellRect.right) <= HIT) {
            return {
              mode: 'col',
              table,
              colIndex: i,
              startX: e.clientX,
              anchos: leerAnchosColumnasPx(table),
            };
          }
        }
      }
      return null;
    };

    const onMoveCursor = (e) => {
      if (resizeRef.current) return;
      const hit = hitTest(e);
      editor.style.cursor = hit ? 'col-resize' : '';
    };

    const onDown = (e) => {
      if (e.button !== 0) return;
      const hit = hitTest(e);
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation();
      resizeRef.current = hit;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const onMove = (e) => {
      const st = resizeRef.current;
      if (!st) return;
      e.preventDefault();
      const parentW = editor.clientWidth || st.table.parentElement?.clientWidth || 1;

      if (st.mode === 'table') {
        const dx = e.clientX - st.startX;
        const nextW = Math.min(parentW, Math.max(80, st.startW + dx));
        const pct = Math.round((nextW / parentW) * 1000) / 10;
        st.table.style.width = `${Math.min(100, Math.max(15, pct))}%`;
        st.table.style.maxWidth = '100%';
        return;
      }

      if (st.mode === 'col' && st.anchos?.length) {
        const dx = e.clientX - st.startX;
        const next = st.anchos.slice();
        const i = st.colIndex;
        const minCol = 28;
        let left = next[i] + dx;
        let right = next[i + 1] - dx;
        if (left < minCol) {
          right -= minCol - left;
          left = minCol;
        }
        if (right < minCol) {
          left -= minCol - right;
          right = minCol;
        }
        if (left < minCol || right < minCol) return;
        next[i] = left;
        next[i + 1] = right;
        sincronizarAnchosTabla(st.table, next);
      }
    };

    const onUp = () => {
      if (!resizeRef.current) return;
      resizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      editor.style.cursor = '';
      emitir(false);
    };

    editor.addEventListener('mousemove', onMoveCursor);
    editor.addEventListener('mousedown', onDown, true);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      editor.removeEventListener('mousemove', onMoveCursor);
      editor.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [readOnly, emitir]);

  useImperativeHandle(
    ref,
    () => ({
      flush: () => emitir(true),
      getHtml: () => {
        if (editorRef.current) {
          lastHtml.current = editorRef.current.innerHTML || '';
          return lastHtml.current;
        }
        return lastHtml.current || '';
      },
    }),
    [emitir]
  );

  const guardarSeleccion = () => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;
    const node = sel.anchorNode;
    if (node && el.contains(node)) {
      try {
        savedRange.current = sel.getRangeAt(0).cloneRange();
      } catch {
        savedRange.current = null;
      }
    }
  };

  const asegurarSeleccion = () => {
    const el = editorRef.current;
    if (!el) return false;
    el.focus();

    const sel = window.getSelection();
    if (!sel) return false;

    if (savedRange.current) {
      try {
        sel.removeAllRanges();
        sel.addRange(savedRange.current);
        if (el.contains(sel.anchorNode)) return true;
      } catch {
        savedRange.current = null;
      }
    }

    if (sel.rangeCount > 0 && el.contains(sel.anchorNode)) return true;

    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      savedRange.current = range.cloneRange();
      return true;
    } catch {
      return false;
    }
  };

  const pintarIndicadorColor = (color) => {
    if (colorBarRef.current) colorBarRef.current.style.backgroundColor = color;
    if (colorLetterRef.current) colorLetterRef.current.style.color = color;
  };

  const actualizarPlaceholder = () => {
    const vacio = !textoPlanoDeHtml(editorRef.current?.innerText);
    setMostrarPlaceholder((prev) => (prev === vacio ? prev : vacio));
  };

  const ejecutar = (comando, arg = null) => {
    if (readOnly || !editorRef.current) return;
    asegurarSeleccion();
    try {
      document.execCommand(comando, false, arg);
    } catch (err) {
      console.warn('Formato no aplicado:', comando, err);
      return;
    }
    emitir(false);
    guardarSeleccion();
    actualizarPlaceholder();
  };

  const aplicarColor = (color) => {
    if (readOnly) return;
    pintarIndicadorColor(color);
    asegurarSeleccion();
    try {
      document.execCommand('foreColor', false, color);
    } catch (err) {
      console.warn('Color no aplicado:', err);
      return;
    }
    emitir(false);
    guardarSeleccion();
    setPaletaAbierta(false);
    setMasColores(false);
  };

  const obtenerTablaActiva = () => {
    if (!editorRef.current) return null;
    asegurarSeleccion();
    const sel = window.getSelection();
    let table = null;
    if (sel?.anchorNode) {
      table = tablaDesdeNodo(sel.anchorNode, editorRef.current);
    }
    if (!table) {
      const tables = editorRef.current.querySelectorAll('table');
      table = tables[tables.length - 1] || null;
    }
    return table;
  };

  const posicionarPanelCuadro = (btnEl, ancho = 220, alto = 220) => {
    const rect = btnEl?.getBoundingClientRect();
    if (!rect) return;
    const espacioAbajo = window.innerHeight - rect.bottom;
    const top =
      espacioAbajo < alto + 8
        ? Math.max(8, rect.top - alto - 4)
        : rect.bottom + 4;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - ancho - 8
    );
    setCuadroPos({ top, left });
  };

  const abrirPanelInsertar = () => {
    if (readOnly) return;
    if (cuadroPanel === 'insert') {
      setCuadroPanel(null);
      return;
    }
    setPaletaAbierta(false);
    guardarSeleccion();
    setGridHover({ rows: 3, cols: 2 });
    setAnchoPct(35);
    posicionarPanelCuadro(tablaBtnRef.current, 228, 260);
    setCuadroPanel('insert');
  };

  const abrirPanelAncho = () => {
    if (readOnly) return;
    if (cuadroPanel === 'ancho') {
      setCuadroPanel(null);
      return;
    }
    setPaletaAbierta(false);
    guardarSeleccion();
    const table = obtenerTablaActiva();
    setTieneCuadro(Boolean(table));
    const actual =
      parseFloat(String(table?.style?.width || '').replace('%', '')) || 35;
    setAnchoPct(Math.round(actual));
    posicionarPanelCuadro(anchoBtnRef.current, 228, 160);
    setCuadroPanel('ancho');
  };

  /** Inserta una tabla editable (cuadro) en el cursor. */
  const insertarTablaCon = (filasIn, colsIn, anchoIn = 35) => {
    if (readOnly || !editorRef.current) return;
    const filas = Math.min(20, Math.max(1, filasIn || 3));
    const cols = Math.min(8, Math.max(1, colsIn || 2));
    const anchoTabla = Math.min(100, Math.max(15, anchoIn || 35));
    const anchoCol = Math.round(100 / cols);
    const resto = 100 - anchoCol * (cols - 1);

    let colgroup = '<colgroup>';
    for (let c = 0; c < cols; c += 1) {
      const w = c === cols - 1 ? resto : anchoCol;
      colgroup += `<col style="width:${w}%" width="${w}%">`;
    }
    colgroup += '</colgroup>';

    let html =
      `<table class="puertos-cuadro" border="1" cellpadding="3" cellspacing="0" style="border-collapse:collapse;width:${anchoTabla}%;max-width:100%;margin:8px 0;border:1px solid #334155;table-layout:auto;">${colgroup}`;
    for (let r = 0; r < filas; r += 1) {
      html += '<tr>';
      for (let c = 0; c < cols; c += 1) {
        const tag = r === 0 ? 'th' : 'td';
        const w = c === cols - 1 ? resto : anchoCol;
        const estilo =
          r === 0
            ? `border:1px solid #334155;padding:3px 8px;font-weight:700;text-align:center;width:${w}%;`
            : `border:1px solid #334155;padding:3px 8px;text-align:center;width:${w}%;`;
        const placeholder =
          r === 0 ? (c === 0 ? 'N° ART' : c === 1 ? 'Q' : `Col ${c + 1}`) : '&nbsp;';
        html += `<${tag} style="${estilo}">${placeholder}</${tag}>`;
      }
      html += '</tr>';
    }
    html += '</table><p><br></p>';

    asegurarSeleccion();
    try {
      document.execCommand('insertHTML', false, html);
    } catch (err) {
      console.warn('No se pudo insertar la tabla:', err);
      const el = editorRef.current;
      if (el) {
        el.focus();
        el.innerHTML = `${el.innerHTML}${html}`;
      }
    }
    emitir(false);
    guardarSeleccion();
    actualizarPlaceholder();
    setCuadroPanel(null);
  };

  const aplicarAnchoCuadro = (pctIn) => {
    if (readOnly || !editorRef.current) return;
    const table = obtenerTablaActiva();
    if (!table) return;
    const pct = Math.min(100, Math.max(15, Number(pctIn) || 55));
    table.style.width = `${pct}%`;
    table.style.maxWidth = '100%';
    table.style.tableLayout = 'fixed';
    setAnchoPct(pct);
    emitir(false);
  };

  const onToolbarMouseDown = (e) => {
    e.preventDefault();
    guardarSeleccion();
  };

  const reposicionar = (expandida) => {
    const rect = colorBtnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const alto = expandida ? 360 : 200;
    const ancho = expandida ? 240 : 188;
    const espacioAbajo = window.innerHeight - rect.bottom;
    const top =
      espacioAbajo < alto + 8
        ? Math.max(8, rect.top - alto - 4)
        : rect.bottom + 4;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - ancho - 8
    );
    setPalettePos({ top, left });
  };

  return (
    <div className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-1.5 py-1">
          <button type="button" className={btnCls} title="Negrita" onMouseDown={onToolbarMouseDown} onClick={() => ejecutar('bold')}>
            <span className="font-bold">B</span>
          </button>
          <button type="button" className={btnCls} title="Cursiva" onMouseDown={onToolbarMouseDown} onClick={() => ejecutar('italic')}>
            <span className="italic font-serif">I</span>
          </button>
          <button type="button" className={btnCls} title="Tachado" onMouseDown={onToolbarMouseDown} onClick={() => ejecutar('strikeThrough')}>
            <span className="line-through">S</span>
          </button>
          <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600" />
          <button type="button" className={btnCls} title="Lista" onMouseDown={onToolbarMouseDown} onClick={() => ejecutar('insertUnorderedList')}>
            ≡
          </button>
          <button type="button" className={btnCls} title="Lista numerada" onMouseDown={onToolbarMouseDown} onClick={() => ejecutar('insertOrderedList')}>
            1.
          </button>
          <button type="button" className={btnCls} title="Disminuir sangría" onMouseDown={onToolbarMouseDown} onClick={() => ejecutar('outdent')}>
            ⇤
          </button>
          <button type="button" className={btnCls} title="Aumentar sangría" onMouseDown={onToolbarMouseDown} onClick={() => ejecutar('indent')}>
            ⇥
          </button>
          <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600" />
          <button
            type="button"
            className={btnCls}
            title="Enlace"
            onMouseDown={onToolbarMouseDown}
            onClick={() => {
              const url = window.prompt('URL del enlace:');
              if (url) ejecutar('createLink', url);
            }}
          >
            Link
          </button>

          <button
            ref={colorBtnRef}
            type="button"
            title="Color de texto"
            className={`${btnCls} flex-col gap-0.5 !h-9`}
            onMouseDown={onToolbarMouseDown}
            onClick={() => {
              if (paletaAbierta) {
                setPaletaAbierta(false);
                setMasColores(false);
                return;
              }
              guardarSeleccion();
              reposicionar(false);
              setMasColores(false);
              setPaletaAbierta(true);
            }}
            aria-expanded={paletaAbierta}
          >
            <span ref={colorLetterRef} className="leading-none font-bold" style={{ color: '#141414' }}>
              A
            </span>
            <span
              ref={colorBarRef}
              className="block h-1 w-5 rounded-sm border border-slate-300 dark:border-slate-500"
              style={{ backgroundColor: '#141414' }}
            />
          </button>

          <button type="button" className={btnCls} title="Alinear izquierda" onMouseDown={onToolbarMouseDown} onClick={() => ejecutar('justifyLeft')}>
            Izq
          </button>
          <button type="button" className={btnCls} title="Centrar" onMouseDown={onToolbarMouseDown} onClick={() => ejecutar('justifyCenter')}>
            Cen
          </button>
          <button type="button" className={btnCls} title="Línea horizontal" onMouseDown={onToolbarMouseDown} onClick={() => ejecutar('insertHorizontalRule')}>
            —
          </button>
          <button
            ref={tablaBtnRef}
            type="button"
            className={btnCls}
            title="Insertar cuadro"
            onMouseDown={onToolbarMouseDown}
            onClick={abrirPanelInsertar}
            aria-expanded={cuadroPanel === 'insert'}
          >
            ▦
          </button>
          <button
            ref={anchoBtnRef}
            type="button"
            className={btnCls}
            title="Ancho del cuadro"
            onMouseDown={onToolbarMouseDown}
            onClick={abrirPanelAncho}
            aria-expanded={cuadroPanel === 'ancho'}
          >
            ↔
          </button>
        </div>
      )}

      {cuadroPanel &&
        createPortal(
          <div
            ref={cuadroPanelRef}
            className="fixed z-[9999] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 shadow-xl"
            style={{
              top: cuadroPos.top,
              left: cuadroPos.left,
              width: 228,
            }}
            role="dialog"
            aria-label={cuadroPanel === 'insert' ? 'Insertar cuadro' : 'Ancho del cuadro'}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {cuadroPanel === 'insert' ? (
              <>
                <p className="mb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Insertar cuadro · {gridHover.rows} × {gridHover.cols}
                </p>
                <div
                  className="inline-grid gap-0.5"
                  style={{
                    gridTemplateColumns: `repeat(${GRID_MAX_COLS}, 1fr)`,
                  }}
                  onMouseLeave={() => setGridHover({ rows: 3, cols: 2 })}
                >
                  {Array.from({ length: GRID_MAX_ROWS * GRID_MAX_COLS }).map((_, idx) => {
                    const r = Math.floor(idx / GRID_MAX_COLS) + 1;
                    const c = (idx % GRID_MAX_COLS) + 1;
                    const activo = r <= gridHover.rows && c <= gridHover.cols;
                    return (
                      <button
                        key={`${r}-${c}`}
                        type="button"
                        className={`h-4 w-4 rounded-[2px] border transition-colors ${
                          activo
                            ? 'border-sky-500 bg-sky-200 dark:bg-sky-700'
                            : 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-900'
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setGridHover({ rows: r, cols: c })}
                        onClick={() => insertarTablaCon(r, c, anchoPct)}
                        aria-label={`${r} filas, ${c} columnas`}
                      />
                    );
                  })}
                </div>
                <p className="mt-3 mb-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Ancho al insertar
                </p>
                <div className="flex flex-wrap gap-1">
                  {ANCHO_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`rounded px-2 py-1 text-[11px] font-semibold ${
                        anchoPct === p
                          ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700'
                      }`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setAnchoPct(p)}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-md bg-slate-800 px-2 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertarTablaCon(gridHover.rows, gridHover.cols, anchoPct)}
                >
                  Insertar {gridHover.rows}×{gridHover.cols}
                </button>
              </>
            ) : (
              <>
                <p className="mb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Ancho del cuadro · {anchoPct}%
                </p>
                {!tieneCuadro ? (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Haz clic dentro del cuadro y vuelve a abrir este panel.
                  </p>
                ) : (
                  <>
                    <input
                      type="range"
                      min={15}
                      max={100}
                      step={1}
                      value={anchoPct}
                      className="w-full accent-slate-700"
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setAnchoPct(v);
                        aplicarAnchoCuadro(v);
                      }}
                    />
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ANCHO_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`rounded px-2 py-1 text-[11px] font-semibold ${
                            anchoPct === p
                              ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                              : 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700'
                          }`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => aplicarAnchoCuadro(p)}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>,
          document.body
        )}

      {paletaAbierta &&
        createPortal(
          <div
            ref={paletteRef}
            className="fixed z-[9999] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-2.5 shadow-xl"
            style={{
              top: palettePos.top,
              left: palettePos.left,
              width: anchoPaleta,
              maxHeight: Math.min(altoEstimado + 40, window.innerHeight - 16),
              overflowY: 'auto',
            }}
            role="dialog"
            aria-label="Paleta de colores"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p className="mb-1.5 px-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Color de texto
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {PALETA_RAPIDA.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  title={hex}
                  className="h-7 w-7 rounded-md border border-slate-200 dark:border-slate-600"
                  style={{ backgroundColor: hex }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => aplicarColor(hex)}
                />
              ))}
            </div>

            <button
              type="button"
              className="mt-2 w-full rounded-md border border-slate-200 dark:border-slate-600 px-2 py-1.5 text-left text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setMasColores((prev) => {
                  const next = !prev;
                  requestAnimationFrame(() => reposicionar(next));
                  return next;
                });
              }}
            >
              {masColores ? 'Ocultar más colores' : 'Otro color / más colores…'}
            </button>

            {masColores && (
              <div className="mt-2 space-y-2 border-t border-slate-100 dark:border-slate-700 pt-2">
                <div className="grid grid-cols-12 gap-0.5">
                  {PALETA_EXTENDIDA.map((color) => (
                    <button
                      key={color}
                      type="button"
                      title={color}
                      className="h-4 w-full rounded-sm border border-black/10"
                      style={{ backgroundColor: color }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => aplicarColor(color)}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-7 w-7 shrink-0 rounded border border-slate-300 dark:border-slate-500"
                    style={{ backgroundColor: normalizarHex(hexManual) || '#c41e3a' }}
                  />
                  <input
                    type="text"
                    value={hexManual}
                    onChange={(e) => setHexManual(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const hex = normalizarHex(hexManual);
                        if (hex) aplicarColor(hex);
                      }
                    }}
                    placeholder="#c41e3a"
                    className="min-w-0 flex-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
                    aria-label="Código hexadecimal"
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded bg-slate-800 dark:bg-slate-200 px-2 py-1 text-[11px] font-semibold text-white dark:text-slate-900"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const hex = normalizarHex(hexManual);
                      if (hex) aplicarColor(hex);
                    }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}

      <div className="relative overflow-hidden rounded-b-lg">
        {!readOnly && placeholder && mostrarPlaceholder ? (
          <div className="pointer-events-none absolute left-3 top-2 text-sm text-slate-400">
            {placeholder}
          </div>
        ) : null}
        <div
          ref={editorRef}
          data-puertos-editor={editorId}
          className="puertos-rich-editor px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none"
          style={{ minHeight }}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={() => {
            dirtyRef.current = true;
            lastHtml.current = editorRef.current?.innerHTML || '';
            actualizarPlaceholder();
            onChangeRef.current?.(lastHtml.current);
          }}
          onBlur={() => {
            emitir(false);
          }}
          onMouseUp={guardarSeleccion}
          onKeyUp={guardarSeleccion}
          role="textbox"
          aria-multiline="true"
        />
      </div>
      <style>{`
        .puertos-rich-editor table,
        .puertos-rich-editor table.puertos-cuadro {
          border-collapse: collapse;
          width: auto;
          max-width: 100%;
          margin: 8px 0;
          table-layout: auto;
          position: relative;
        }
        .puertos-rich-editor td,
        .puertos-rich-editor th {
          border: 1px solid #334155;
          padding: 3px 8px;
          vertical-align: middle;
          word-break: break-word;
          position: relative;
          text-align: center;
        }
        .puertos-rich-editor th {
          background: transparent;
          font-weight: 700;
          text-align: center;
        }
        .dark .puertos-rich-editor th {
          background: #334155;
        }
        .dark .puertos-rich-editor td,
        .dark .puertos-rich-editor th {
          border-color: #94a3b8;
        }
        .puertos-rich-editor table::after {
          content: '';
          position: absolute;
          top: 0;
          right: -3px;
          width: 6px;
          height: 100%;
          cursor: col-resize;
        }
      `}</style>
    </div>
  );
});

export default PuertosRichTextEditor;
