import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import LiquidadorExpress from './LiquidadorExpress.jsx';
import { ExpressPageHeader } from './ExpressUiBlocks.jsx';
import {
  expressBtnGhost,
  expressCard,
  expressCardBody,
  expressPageWrap,
  expressScope,
} from './expressFenixUi.js';

export default function LiquidadorExpressPage() {
  const location = useLocation();
  const casoExpress = location.state?.casoExpress ?? null;

  const subtitulo = useMemo(() => {
    if (casoExpress?.numeroSiniestro) {
      return `Maqueta basada en Liquidador.xlsm — caso ${casoExpress.numeroSiniestro}`;
    }
    return 'Maqueta del liquidador Express (FORMATO_LIQUIDACION + Check-list + Salvamento + recibo)';
  }, [casoExpress]);

  return (
    <div className={expressScope}>
      <div className={expressPageWrap}>
        <ExpressPageHeader
          badge="Express · Maqueta"
          title="Liquidador Express"
          subtitle={subtitulo}
          activePath="/express/liquidador"
          actions={
            <Link to="/express/carga" className={expressBtnGhost}>
              <FaArrowLeft />
              Volver a Carga
            </Link>
          }
        />

        <div className={expressCard}>
          <div className={expressCardBody}>
            <LiquidadorExpress
              casoExpress={casoExpress}
              valorInicial={casoExpress?.valorIndemnizacion}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
