export interface RebookingDraft {
  tenantId: string;
  sucursalId: string;
  clienteNombre: string;
  clienteTelefono: string;
  barberoId: string;
  servicioId: string;
  tipoCorte: string;
}

export function availableRebookingSelection(draft: Pick<RebookingDraft, 'barberoId' | 'servicioId'>, barbers: { id: string; activo?: boolean }[], services: { id: string; activo?: boolean }[]) {
  return {
    barberoId: barbers.some(row => row.id === draft.barberoId && row.activo !== false) ? draft.barberoId : '',
    servicioId: services.some(row => row.id === draft.servicioId && row.activo !== false) ? draft.servicioId : '',
  };
}
