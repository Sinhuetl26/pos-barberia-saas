export function inventoryKind(item: { tipo: string; naturaleza?: string | null }): 'SERVICIO' | 'PRODUCTO' | 'INSUMO' {
  return item.tipo === 'SERVICIO' ? 'SERVICIO' : item.naturaleza === 'INSUMO' ? 'INSUMO' : 'PRODUCTO';
}
