export const MAX_TIER = 3;

export const ZONES = [
  { id: 'A', label: 'Zone A — Import', rows: 6, cols: 10 },
  { id: 'B', label: 'Zone B — Export', rows: 5, cols: 10 },
  { id: 'C', label: 'Zone C — Transit', rows: 4, cols: 10 },
  { id: 'R', label: 'Zone R — Reefer', rows: 3, cols: 8 },
];

export const TYPES = ['empty-20', 'empty-40', 'full-20', 'full-40', 'reefer', 'reefer-full'];

export const TYPE_LABELS = {
  'empty-20': "Vide·20'",
  'empty-40': "Vide·40'",
  'full-20': "Plein·20'",
  'full-40': "Plein·40'",
  'reefer': 'Reefer·Vide',
  'reefer-full': 'Reefer·Plein',
};

export const CARRIERS = ['MSCU', 'CMAU', 'MAEU', 'HLCU', 'OOLU', 'EISU', 'TCLU', 'MSKU', 'ONEU', 'CSLU'];
export const CLIENTS = ['Jovenna', 'Star', 'Brasseries', 'Socota', 'Galana', 'Henri Fraise', 'Total Energies', 'Ambatovy', 'QMM', 'Colas'];
