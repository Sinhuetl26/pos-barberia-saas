export interface OperationSummary {
  generatedAt: string; localDate: string; timeZone: string; branchName: string;
  metrics: { revenue: number; tips: number; sales: number; averageTicket: number; yesterdayRevenue: number;
    appointments: number; pending: number; noShows: number; completed: number; inactiveClients: number;
    activeBarbers: number; openRegisters: number; lowStock: number };
  upcoming: { id: string; fechaHora: string; estado: string; nombreServicio: string | null; duracionMinutos: number; cliente: { nombre: string }; barbero: { nombre: string } }[];
  lowStockProducts: { id: string; nombre: string; stockActual: number; stockMinimo: number }[];
  hourlyRevenue: { hour: number; revenue: number }[];
}

export interface IntegrationCatalog {
  checkedAt: string; scope: 'platform'; verification: 'configuration_only';
  connectors: { id: string; name: string; category: string; available: boolean;
    status: 'missing' | 'sandbox' | 'configured' | 'planned'; description: string; detail: string;
    steps: string[]; docsUrl: string; actionLabel: string; actionUrl: string; configurationIssues?: string[] }[];
}
