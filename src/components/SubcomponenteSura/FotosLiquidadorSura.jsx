import React from 'react';
import { useTranslation } from 'react-i18next';
import { expressBtnPrimary } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { expressFormSection, expressSectionTitle } from '../SubcomponenteExpress/expressFenixUi.js';
import FotosInspeccionSura from './FotosInspeccionSura.jsx';

export default function FotosLiquidadorSura({
  casoId = '',
  fotos = [],
  onFotosChange,
  onGuardarEnCaso,
  onCasoChange,
  guardandoCaso = false,
}) {
  const { t } = useTranslation();

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
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('segurosSura.fotosAgil.hint')}
        </p>

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
