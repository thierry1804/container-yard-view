import { ZONES, MAX_TIER, CARRIERS, CLIENTS } from './config';
import { getSize } from './rules';

function genId() {
  return CARRIERS[Math.floor(Math.random() * CARRIERS.length)] + String(Math.floor(Math.random() * 9000000) + 1000000);
}

function randDate(b, f) {
  const d = new Date();
  d.setDate(d.getDate() - b + Math.floor(Math.random() * (b + f)));
  return d.toISOString().split('T')[0];
}

export function posLabel(z, r, c) {
  return `${z}-Bay${String(c + 1).padStart(2, '0')}-R${String(r + 1).padStart(2, '0')}`;
}

export function generateYardData() {
  const stacks = {};
  const allContainers = [];

  ZONES.forEach(zone => {
    stacks[zone.id] = [];
    for (let r = 0; r < zone.rows; r++) {
      stacks[zone.id][r] = [];
      for (let c = 0; c < zone.cols; c++) {
        const stack = [];
        const rand = Math.random();
        let count = rand < 0.2 ? 0 : rand < 0.5 ? 1 : rand < 0.8 ? 2 : 3;
        for (let t = 1; t <= count; t++) {
          let type;
          if (zone.id === 'R') {
            type = Math.random() < 0.55 ? 'reefer' : 'reefer-full';
          } else {
            const has20 = stack.some(ct => getSize(ct.type) === 20);
            if (has20) {
              // Only allow 20' containers on top of 20'
              type = Math.random() < 0.5 ? 'empty-20' : 'full-20';
            } else {
              const tr = Math.random();
              type = tr < 0.25 ? 'empty-20' : tr < 0.45 ? 'empty-40' : tr < 0.7 ? 'full-20' : 'full-40';
            }
          }
          const ct = {
            zone: zone.id, row: r, col: c, tier: t, id: genId(), type,
            client: CLIENTS[Math.floor(Math.random() * CLIENTS.length)],
            entryDate: randDate(15, 0),
            exitDate: randDate(0, 10),
            weight: type.includes('full') || type === 'reefer-full'
              ? (Math.floor(Math.random() * 22000) + 4000) + ' kg'
              : '—',
          };
          stack.push(ct);
          allContainers.push(ct);
        }
        stacks[zone.id][r][c] = stack;
      }
    }
  });

  return { stacks, allContainers };
}
