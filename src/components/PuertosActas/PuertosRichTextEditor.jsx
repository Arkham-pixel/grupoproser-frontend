import React, {
  forwardRef,
  memo,
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
  const savedRange = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [paletaAbierta, setPaletaAbierta] = useState(false);
  const [palettePos, setPalettePos] = useState({ top: 0, left: 0 });
  const [masColores, setMasColores] = useState(false);
  const [hexManual, setHexManual] = useState('#c41e3a');
  const [mostrarPlaceholder, setMostrarPlaceholder] = useState(
    () => !textoPlanoDeHtml(value)
  );

  const anchoPaleta = masColores ? 240 : 188;
  const altoEstimado = masColores ? 360 : 200;

  const aplicarHtmlExterno = useCallback((html) => {
    const el = editorRef.current;
    const next = html || '';
    if (el) el.innerHTML = next;
    lastHtml.current = next;
    dirtyRef.current = false;
    savedRange.current = null;
    setMostrarPlaceholder(!textoPlanoDeHtml(next));
  }, []);

  // Carga inicial / cambio de acta (syncKey)
  useEffect(() => {
    if (syncKeyRef.current !== syncKey) {
      syncKeyRef.current = syncKey;
      aplicarHtmlExterno(value);
      return;
    }
    // Solo aplicar value externo si el usuario no ha editado
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

  useImperativeHandle(
    ref,
    () => ({
      /** Fuerza el HTML actual al padre (para Grabar / PDF). */
      flush: () => emitir(true),
      getHtml: () => leerHtml(),
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
        </div>
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
          className="px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none"
          style={{ minHeight }}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={() => {
            dirtyRef.current = true;
            lastHtml.current = editorRef.current?.innerHTML || '';
            actualizarPlaceholder();
            // Sincroniza al padre en cada cambio para que Grabar/PDF no pierdan texto
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
    </div>
  );
});

export default memo(PuertosRichTextEditor);
