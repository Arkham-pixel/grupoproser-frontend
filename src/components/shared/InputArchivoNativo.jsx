import React, { forwardRef } from 'react';

/**
 * Input de archivo/cámara que no usa display:none.
 * En iPad/Safari, un input hidden + cambio de modo oscuro/claro deja
 * capture="environment" inerte hasta recargar la página.
 */
const estiloOculto = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
  opacity: 0,
};

const InputArchivoNativo = forwardRef(function InputArchivoNativo(
  { id, accept, capture, multiple, onChange, disabled },
  ref
) {
  return (
    <input
      ref={ref}
      id={id}
      type="file"
      accept={accept}
      capture={capture}
      multiple={multiple || undefined}
      onChange={onChange}
      disabled={disabled}
      style={estiloOculto}
      tabIndex={-1}
    />
  );
});

export default InputArchivoNativo;
