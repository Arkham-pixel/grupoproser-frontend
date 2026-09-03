import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaImages } from 'react-icons/fa';
import { expressBtnPrimary, expressBtnSecondary } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { expressFormSection, expressSectionTitle } from '../SubcomponenteExpress/expressFenixUi.js';
import FotosInspeccionSura from './FotosInspeccionSura.jsx';
import { fotosArchiveroPendientesEnInformeSura } from './informeAgilSuraHelpers.js';
import { importarFotosArchiveroAlInformeCaso } from './syncFotosNsrAlInformeSura.js';

export default function FotosLiquidadorSura({
  casoId = '',
  caso = null,
  fotos = [],
  onFotosChange,
  onGuardarEnCaso,
  onCasoChange,
  guardandoCaso = false,
}) {
  const { t } = useTranslation();
  const [importando, setImportando] = React.useState(false);
  const pendientes = fotosArchiveroPendientesEnInformeSura(
    { ...(caso || {}), archivos: caso?.archivos },
    fotos
  );

  const handleTraerDelArchivero = async () => {
    if (!casoId) return;
    setImportando(true);
    try {
      const result = await importarFotosArchiveroAlInformeCaso({
        casoId,
        casoBase: caso || {},
      });
      if (result?.fotosAgil) onFotosChange?.(result.fotosAgil);
      if (result?.caso) onCasoChange?.(result.caso);
    } catch (err) {
      console.error(err);
      window.alert(err.message || t('segurosSura.archive.importToReportError'));
    } finally {
      setImportando(false);
    }
  };

  const appendArchivosAlCaso = (nuevos = []) => {
    if (!nuevos.length || !onCasoChange) return;
    onCasoChange((prev) => {
      if (!prev) return prev;
      const list = Array.isArray(prev.archivos) ? prev.archivos : [];
      const ids = new Set(list.map((a) => String(a._id)));
      const merged = [...list];
      nuevos.forEach((a) => {
        if (a?._id && !ids.has(String(a._id))) merged.push(a);
      });
      return { ...prev, archivos: merged };
    });
  };

  const quitarArchivoDelCaso = (archivoId) => {
    if (!archivoId || !onCasoChange) return;
    onCasoChange((prev) => {
      if (!prev) return prev;
      const list = (Array.isArray(prev.archivos) ? prev.archivos : []).filter(
        (a) => String(a._id) !== String(archivoId)
      );
      return { ...prev, archivos: list };
    });
  };

  return (
    <div className="space-y-5">
      <section className={expressFormSection}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`${expressSectionTitle} mb-0`}>
            {t('segurosSura.fotosAgil.title')}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {casoId && pendientes.length > 0 && (
              <button
                type="button"
                className={expressBtnSecondary}
                disabled={guardandoCaso || importando}
                onClick={handleTraerDelArchivero}
              >
                <FaImages />
                {importando
                  ? t('segurosSura.archive.importToReportWorking')
                  : t('segurosSura.archive.importToReport', { count: pendientes.length })}
              </button>
            )}
            {onGuardarEnCaso && (
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={guardandoCaso || !casoId}
                onClick={() => onGuardarEnCaso?.()}
              >
                {guardandoCaso
                  ? t('segurosSura.workspace.saving')
                  : t('segurosSura.fotosAgil.save')}
              </button>
            )}
          </div>
        </div>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('segurosSura.fotosAgil.hint')}
        </p>
        {pendientes.length > 0 && (
          <p className="mb-4 font-body text-xs text-amber-800 dark:text-amber-200">
            {t('segurosSura.fotosAgil.importFromArchiveHint', { count: pendientes.length })}
          </p>
        )}

        {!casoId ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            {t('segurosSura.fotosAgil.savedCaseRequired')}
          </p>
        ) : (
          <FotosInspeccionSura
            casoId={casoId}
            fotosInforme={fotos}
            inputIdPrefix="sura-fotos-agil"
            onFotosInformeChange={(lista) => onFotosChange?.(lista)}
            onArchivoCreado={(creado) => {
              if (creado) appendArchivosAlCaso([creado]);
            }}
            onArchivoEliminado={(archivoId) => quitarArchivoDelCaso(archivoId)}
          />
        )}
      </section>
    </div>
  );
}
