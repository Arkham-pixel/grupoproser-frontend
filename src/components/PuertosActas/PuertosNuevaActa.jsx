import React, { useState } from 'react';
import PuertosFotosActa from './PuertosFotosActa';
import PuertosDocumentosAdjuntos from './PuertosDocumentosAdjuntos';
import PuertosFacturacionActa from './PuertosFacturacionActa';
import PuertosObservacionesActa from './PuertosObservacionesActa';
import { FaSave, FaFilePdf, FaEraser, FaSync } from 'react-icons/fa';

function Seccion({ titulo, children, cols = 4 }) {
  const gridCls =
    cols === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <header className="px-5 py-3 bg-slate-100 dark:bg-slate-700/80 border-b border-slate-200 dark:border-slate-600">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{titulo}</h3>
      </header>
      <div className={`p-5 grid ${gridCls} gap-4`}>{children}</div>
    </section>
  );
}

function Campo({ label, obligatorio = false, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {obligatorio && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100';

const REGIONALES = [
  'BUENAVENTURA',
  'MUELLES CONTECAR',
  'BARRANQUILLA PUERTO',
  'BOGOTÁ',
  'SPRC CARTAGENA',
];

const TIPOS_INSPECCION = [
  'INSPECCIÓN DIAN',
  'PREINSPECCIÓN',
  'PREINSPECCIÓN NOVEDAD',
  'INSPECCIÓN',
];

const TIPOS_AVERIA = ['ABOLLADURAS', 'ROTURA', 'HUMEDAD', 'FALTANTE', 'OTRO'];

function BotonesAccion({ onGrabar, onPdf }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onGrabar}
        className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
      >
        <FaSave /> Grabar
      </button>
      <button
        type="button"
        onClick={onPdf}
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
      >
        <FaFilePdf /> PDF
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
      >
        <FaEraser /> Limpiar
      </button>
    </div>
  );
}

export default function PuertosNuevaActa() {
  const [fotos, setFotos] = useState([]);

  const handleDemoPdf = () => {
    alert('Maqueta: el PDF se generará aquí en la versión funcional (jspdf).');
  };

  const handleGrabar = () => {
    alert(`Maqueta: acta guardada con ${fotos.length} foto(s). PDF inmediato en versión funcional.`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Módulo de Actas — Nueva Acta</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Puertos · Arnald DataFlow</p>
        </div>
        <BotonesAccion onGrabar={handleGrabar} onPdf={handleDemoPdf} />
      </div>

      {/* 1. Información básica */}
      <Seccion titulo="Información básica">
        <Campo label="Regional" obligatorio>
          <select className={inputCls} defaultValue="">
            <option value="">Seleccionar</option>
            {REGIONALES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Nro. de Acta" obligatorio>
          <input className={inputCls} placeholder="BV635260" defaultValue="BV20260609001" />
        </Campo>
        <Campo label="Fecha de Acta" obligatorio>
          <input type="datetime-local" className={inputCls} defaultValue="2026-06-09T08:00" />
        </Campo>
        <Campo label="Fecha Llegada" obligatorio>
          <input type="date" className={inputCls} defaultValue="2026-06-09" />
        </Campo>
        <Campo label="Ciudad">
          <input className={inputCls} placeholder="CIUDAD" />
        </Campo>
        <Campo label="Tipo de Inspección" obligatorio>
          <select className={inputCls} defaultValue="">
            <option value="">Seleccionar</option>
            {TIPOS_INSPECCION.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Inspector" obligatorio>
          <div className="flex gap-2">
            <select className={`${inputCls} flex-1`} defaultValue="">
              <option value="">Seleccionar</option>
              <option>Inspector Demo 1</option>
              <option>Inspector Demo 2</option>
            </select>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-emerald-700 dark:text-emerald-300"
              title="Actualizar catálogo"
            >
              <FaSync />
            </button>
          </div>
        </Campo>
        <Campo label="Estado" obligatorio>
          <select className={inputCls} defaultValue="activo">
            <option value="activo">Activo</option>
            <option value="cerrado">Cerrado</option>
            <option value="borrador">Borrador</option>
          </select>
        </Campo>
      </Seccion>

      {/* 2. Datos del asegurado */}
      <Seccion titulo="Datos del asegurado">
        <Campo label="Aseguradora" obligatorio>
          <select className={inputCls} defaultValue="">
            <option value="">Seleccionar</option>
            <option>SURA</option>
            <option>MAPFRE</option>
            <option>LIBERTY</option>
            <option>BOLÍVAR</option>
          </select>
        </Campo>
        <Campo label="Sucursal" obligatorio>
          <select className={inputCls} defaultValue="">
            <option value="">Seleccionar</option>
            <option>Bogotá</option>
            <option>Medellín</option>
            <option>Cali</option>
            <option>Barranquilla</option>
          </select>
        </Campo>
        <Campo label="Asegurado" obligatorio>
          <input className={inputCls} placeholder="ASEGURADO" />
        </Campo>
        <Campo label="Mercancía" obligatorio>
          <input className={inputCls} placeholder="MERCANCÍA" />
        </Campo>
        <Campo label="Empaque" obligatorio>
          <div className="flex gap-2">
            <select className={`${inputCls} flex-1`} defaultValue="">
              <option value="">Seleccionar</option>
              <option>CONTENEDOR DE 40 PIES</option>
              <option>CONTENEDOR X 40&apos; OPEN TOP</option>
              <option>PALLET</option>
              <option>CAJA DE CARTÓN</option>
              <option>CARGA SUELTA</option>
            </select>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-emerald-700 dark:text-emerald-300"
              title="Actualizar catálogo"
            >
              <FaSync />
            </button>
          </div>
        </Campo>
        <Campo label="Nro. de Piezas">
          <input type="number" className={inputCls} placeholder="0" min="0" />
        </Campo>
        <Campo label="Fecha Construcción" obligatorio>
          <input type="date" className={inputCls} defaultValue="2026-06-09" />
        </Campo>
        <Campo label="Pedido">
          <input className={inputCls} placeholder="NRO. PEDIDO" />
        </Campo>
      </Seccion>

      {/* 3. Transporte exterior */}
      <Seccion titulo="Transporte exterior">
        <Campo label="País de Origen">
          <input className={inputCls} placeholder="PAÍS DE ORIGEN" />
        </Campo>
        <Campo label="País Destino Final">
          <input className={inputCls} placeholder="PAÍS DESTINO FINAL" />
        </Campo>
        <Campo label="Tipo de Transporte">
          <select className={inputCls} defaultValue="">
            <option value="">Seleccionar</option>
            <option>MARÍTIMO</option>
            <option>AÉREO</option>
            <option>TERRESTRE</option>
            <option>MULTIMODAL</option>
          </select>
        </Campo>
        <Campo label="Motonave">
          <input className={inputCls} placeholder="MOTONAVE" />
        </Campo>
        <Campo label="Puerto de Origen">
          <input className={inputCls} placeholder="PUERTO DE ORIGEN" />
        </Campo>
        <Campo label="Puerto de Arribo">
          <input className={inputCls} placeholder="PUERTO DE ARRIBO" />
        </Campo>
        <Campo label="Registro">
          <input className={inputCls} placeholder="REGISTRO" />
        </Campo>
        <Campo label="Doc. Transporte">
          <input className={inputCls} placeholder="DOC. TRANSPORTE / BL" />
        </Campo>
      </Seccion>

      {/* 4. Transporte interior */}
      <Seccion titulo="Transporte interior">
        <Campo label="Transportadora">
          <input className={inputCls} placeholder="TRANSPORTADORA" />
        </Campo>
        <Campo label="Remesa / Remisión">
          <input className={inputCls} placeholder="REMESA / REMISIÓN" />
        </Campo>
        <Campo label="Conductor">
          <input className={inputCls} placeholder="CONDUCTOR" />
        </Campo>
        <Campo label="Cédula">
          <input className={inputCls} placeholder="CÉDULA" />
        </Campo>
        <Campo label="Placa">
          <input className={inputCls} placeholder="XXX111" />
        </Campo>
        <Campo label="Modelo">
          <input className={inputCls} placeholder="MODELO" />
        </Campo>
        <Campo label="Marca">
          <input className={inputCls} placeholder="MARCA" />
        </Campo>
        <Campo label="Celular">
          <input type="tel" className={inputCls} placeholder="CELULAR" />
        </Campo>
        <Campo label="Origen Despacho">
          <input className={inputCls} placeholder="ORIGEN DESPACHO" />
        </Campo>
        <Campo label="Destino Despacho">
          <input className={inputCls} placeholder="DESTINO DESPACHO" />
        </Campo>
        <Campo label="Carta de Porte" className="lg:col-span-2">
          <input className={inputCls} placeholder="CARTA DE PORTE" />
        </Campo>
      </Seccion>

      {/* 5. Detalle de inspección */}
      <Seccion titulo="Detalle de inspección" cols={3}>
        <Campo label="Lugar de Reconocimiento" obligatorio>
          <input className={inputCls} placeholder="LUGAR DE RECONOCIMIENTO" />
        </Campo>
        <Campo label="Contacto" obligatorio>
          <input className={inputCls} placeholder="CONTACTO" />
        </Campo>
        <Campo label="Peso Tara (kg)">
          <input type="number" className={inputCls} placeholder="Peso Tara" min="0" step="0.01" />
        </Campo>
        <Campo label="Peso Neto (kg)">
          <input type="number" className={inputCls} placeholder="Peso Neto" min="0" step="0.01" />
        </Campo>
        <Campo label="Peso Bruto (kg)">
          <input type="number" className={inputCls} placeholder="Peso Bruto" min="0" step="0.01" />
        </Campo>
        <Campo label="Avería SI / NO" obligatorio>
          <select className={inputCls} defaultValue="">
            <option value="">Seleccionar</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </Campo>
        <Campo label="Tipo de Avería">
          <select className={inputCls} defaultValue="">
            <option value="">Seleccionar</option>
            {TIPOS_AVERIA.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Campo>
      </Seccion>

      {/* 6. Fotos */}
      <PuertosFotosActa fotos={fotos} onChange={setFotos} />

      {/* 7. Documentos adjuntos */}
      <PuertosDocumentosAdjuntos />

      {/* 8. Facturación */}
      <PuertosFacturacionActa />

      {/* 9. Observaciones y recomendaciones */}
      <PuertosObservacionesActa />

      <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-600">
        <BotonesAccion onGrabar={handleGrabar} onPdf={handleDemoPdf} />
      </div>
    </div>
  );
}
