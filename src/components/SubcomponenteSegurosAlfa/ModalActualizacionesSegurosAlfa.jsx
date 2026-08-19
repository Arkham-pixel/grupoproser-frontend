import React from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { alfaFieldLabel, formatAlfaPreviewValue } from './alfaActualizacionesModalPresentacion.js';

function SummaryCard({ value, label }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        textAlign: 'center',
        bgcolor: 'background.paper',
        height: '100%',
      }}
    >
      <Typography variant="h4" component="div" fontWeight={700} lineHeight={1.1}>
        {value ?? 0}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Paper>
  );
}

function ChangeBlock({ entry }) {
  const showSiniestroBadge = entry.badges?.includes('NUEVO_SINIESTRO');
  const showPolizaBadge = entry.badges?.includes('POLIZA_CONFIRMADA');
  return (
    <Box sx={{ mt: 1.5 }}>
      {showPolizaBadge && (
        <Chip
          size="small"
          label="PÓLIZA CONFIRMADA"
          color="success"
          variant="outlined"
          sx={{ mb: 0.75, fontWeight: 600 }}
        />
      )}
      {showSiniestroBadge && (
        <Chip
          size="small"
          label="NUEVO NÚMERO DE SINIESTRO"
          color="info"
          variant="outlined"
          sx={{ mb: 0.75, ml: showPolizaBadge ? 0.75 : 0, fontWeight: 600 }}
        />
      )}
      <Typography variant="subtitle2" fontWeight={600}>
        {entry.label || alfaFieldLabel(entry.field)}
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ mt: 0.75 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">
            Anterior
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
            {entry.beforeDisplay}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.disabled" sx={{ px: 0.5 }}>
          →
        </Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">
            Nuevo
          </Typography>
          <Typography variant="body2" fontWeight={700} sx={{ wordBreak: 'break-word' }}>
            {entry.afterDisplay}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

function CaseCard({ row, expanded }) {
  const isNew = row.action === 'CREATED';
  const siniestroLabel = row.siniestro ? `Siniestro: ${row.siniestro}` : 'Siniestro: Pendiente';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {row.consecutivo || (isNew ? 'Caso nuevo' : `Fila ${row.rowNumber}`)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {siniestroLabel}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={isNew ? 'NUEVO CASO' : 'ACTUALIZACIÓN'}
          color={isNew ? 'primary' : 'default'}
          sx={{ fontWeight: 600 }}
        />
      </Stack>

      {isNew ? (
        <Stack spacing={0.5} sx={{ mt: 1.5 }}>
          {[
            ['Asegurado', row.asegurado],
            ['Identificación', row.identificacion],
            ['Número de póliza', row.numeroPoliza],
            ['Número de siniestro', row.siniestro],
            ['Número de crédito', row.numeroCredito],
            ['Ciudad', row.ciudad],
            ['Fecha del siniestro', row.fechaSiniestro],
          ].map(([label, value]) => {
            if (value == null || value === '') return null;
            return (
              <Typography key={label} variant="body2">
                <Box component="span" color="text.secondary">
                  {label}:{' '}
                </Box>
                {formatAlfaPreviewValue(
                  label.includes('Fecha')
                    ? 'fechaSiniestro'
                    : label.includes('póliza')
                      ? 'numeroPoliza'
                      : label.includes('siniestro')
                        ? 'siniestro'
                        : 'text',
                  value
                )}
              </Typography>
            );
          })}
        </Stack>
      ) : (
        <Box sx={{ mt: 1 }}>
          {(expanded ? row.changes : row.changes?.slice?.(0) || row.changes || []).map((entry) => (
            <ChangeBlock key={entry.field} entry={entry} />
          ))}
          {(!row.changes || row.changes.length === 0) && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Sin detalle de campos en el preview.
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
}

/**
 * Modal ejecutivo de actualizaciones Seguros Alfa (solo presentación).
 */
export default function ModalActualizacionesSegurosAlfa({
  open,
  viewModel,
  showAllChanges,
  confirmOpen,
  loadingPreview,
  executing,
  error,
  onClose,
  onToggleAll,
  onAskConfirm,
  onCancelConfirm,
  onConfirmExecute,
  allowExecute = false,
}) {
  if (!open || !viewModel) return null;

  const vm = viewModel;
  const casesToShow = showAllChanges ? vm.allActionable : vm.principal;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700} component="div">
            {vm.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {vm.subtitle}
          </Typography>
          <Stack spacing={0.25} sx={{ mt: 1.25 }}>
            <Typography variant="caption" color="text.secondary">
              Archivo: {vm.fileName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Actualizado por Alfa: {vm.lastModifiedDisplay}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Revisado por ARNALD: {vm.lastCheckedDisplay}
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Paper
              elevation={0}
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: 'error.50',
                border: '1px solid',
                borderColor: 'error.light',
              }}
            >
              <Typography variant="body2" color="error.main">
                {error}
              </Typography>
            </Paper>
          )}

          <Typography variant="overline" color="text.secondary">
            Resumen
          </Typography>
          <Stack
            direction="row"
            flexWrap="wrap"
            useFlexGap
            spacing={1.5}
            sx={{ mt: 0.5, mb: 2.5 }}
          >
            {[
              [vm.indicators.created, 'Casos nuevos'],
              [vm.indicators.updated, 'Casos actualizados'],
              [vm.indicators.claimNumberAssignments, 'Siniestros asignados'],
              [vm.indicators.policyNumberUpdates, 'Pólizas actualizadas'],
              [vm.indicators.conflicts, 'Conflictos'],
            ].map(([value, label]) => (
              <Box key={label} sx={{ flex: '1 1 140px', minWidth: 120, maxWidth: 200 }}>
                <SummaryCard value={value} label={label} />
              </Box>
            ))}
          </Stack>

          <Typography variant="overline" color="text.secondary">
            Cambios principales
          </Typography>

          {loadingPreview ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Cargando detalle del preview…
            </Typography>
          ) : (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {casesToShow.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No hay casos nuevos ni actualizaciones en este preview.
                </Typography>
              )}
              {casesToShow.map((row) => (
                <CaseCard
                  key={`${row.action}-${row.rowNumber}-${row.consecutivo || ''}`}
                  row={row}
                  expanded={showAllChanges}
                />
              ))}
              {!showAllChanges && vm.additionalCount > 0 && (
                <Typography variant="body2" color="text.secondary">
                  + {vm.additionalCount} cambios adicionales
                </Typography>
              )}
            </Stack>
          )}

          {vm.ambiguous?.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="overline" color="warning.main">
                Requieren revisión
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 1 }}>
                {vm.ambiguous.map((row) => {
                  const candidatos =
                    (row.candidateConsecutivos || [])
                      .map((c) => (typeof c === 'string' ? c : c?.consecutivo))
                      .filter(Boolean) || [];
                  return (
                    <Paper
                      key={`amb-${row.rowNumber}`}
                      elevation={0}
                      sx={{
                        p: 1.75,
                        border: '1px solid',
                        borderColor: 'warning.light',
                        borderRadius: 2,
                        bgcolor: 'warning.50',
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>
                        Fila {row.rowNumber}
                        {row.identificacion ? ` · ID ${row.identificacion}` : ''}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.75 }}>
                        No fue posible determinar de forma segura a qué caso de ARNALD corresponde
                        este registro.
                      </Typography>
                      {(candidatos.length > 0 || (row.candidateCaseIds || []).length > 0) && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Posibles casos:
                          </Typography>
                          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 0.5 }}>
                            {(candidatos.length
                              ? candidatos
                              : row.candidateCaseIds.map((id) => String(id).slice(-6))
                            ).map((c) => (
                              <Chip key={c} size="small" label={c} variant="outlined" />
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          )}

          {vm.rejected?.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="overline" color="error.main">
                Registros no procesables
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 1 }}>
                {vm.rejected.map((row) => (
                  <Paper
                    key={`rej-${row.rowNumber}`}
                    elevation={0}
                    sx={{
                      p: 1.75,
                      border: '1px solid',
                      borderColor: 'error.light',
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      Fila {row.rowNumber}
                      {row.identificacion ? ` · ID ${row.identificacion}` : ''}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {row.rejection?.message || row.message || 'Registro no procesable.'}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
          {(vm.additionalCount > 0 || showAllChanges || vm.allActionable.length > 0) && (
            <Button onClick={() => onToggleAll?.()} disabled={loadingPreview}>
              {showAllChanges ? 'Ver menos' : 'Ver todos los cambios'}
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => onClose?.()} disabled={executing}>
            Revisar después
          </Button>
          {vm.canExecute && allowExecute && (
            <Button
              variant="contained"
              onClick={() => onAskConfirm?.()}
              disabled={executing || loadingPreview || !vm.sessionId}
            >
              {executing ? 'Actualizando…' : 'Actualizar ARNALD'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmOpen)} onClose={() => onCancelConfirm?.()} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar actualización</DialogTitle>
        <DialogContent>
          <Typography variant="body2">ARNALD aplicará:</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {vm.indicators.created} casos nuevos
          </Typography>
          <Typography variant="body2">
            {vm.indicators.updated} casos actualizados
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Las celdas vacías no borran datos llenos (Excel ↔ ARNALD). Los registros que
            requieren revisión no se aplican automáticamente.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1.5 }}>
            ¿Deseas continuar?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onCancelConfirm?.()} disabled={executing}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={() => onConfirmExecute?.()} disabled={executing}>
            {executing ? 'Actualizando…' : 'Sí, actualizar ARNALD'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
