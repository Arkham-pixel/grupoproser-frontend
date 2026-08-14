import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';

/**
 * Ventana emergente cuando Control y Seguimiento no trae cambios.
 */
export default function ModalSinActualizacionesSura({
  open,
  fileName,
  lastModifiedDisplay,
  lastCheckedDisplay,
  onClose,
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700} component="div">
          Seguros Sura — Sin actualizaciones
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 1.5 }}>
          No hay actualizaciones pendientes de Seguros Sura.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          El archivo de Control y Seguimiento fue revisado y coincide con la información
          actual en ARNALD. No se crearán ni modificarán casos.
        </Typography>
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            Archivo: {fileName || '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Actualizado por Sura: {lastModifiedDisplay || '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Revisado por ARNALD: {lastCheckedDisplay || '—'}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={onClose}>
          Entendido
        </Button>
      </DialogActions>
    </Dialog>
  );
}
