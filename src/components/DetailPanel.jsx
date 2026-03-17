import { TYPE_LABELS } from '../data/config';

export default function DetailPanel({ container, stacks, onClose }) {
  if (!container) return null;

  const ct = container;
  const stack = stacks[ct.zone]?.[ct.row]?.[ct.col] || [];

  return (
    <div className="detail-panel open">
      <div className="detail-header">
        <h2 style={{ color: `var(--${ct.type})` }}>{ct.id}</h2>
        <button className="detail-close" onClick={onClose}>✕</button>
      </div>
      <div className="detail-body">
        <div className="detail-status-bar">
          <span className="detail-status-chip" style={{ background: `var(--${ct.type}-bg)`, color: `var(--${ct.type})` }}>
            {TYPE_LABELS[ct.type]}
          </span>
          <span className="detail-status-chip" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            Tier {ct.tier}/{stack.length}
          </span>
        </div>
        <div className="detail-field">
          <label>Position complète</label>
          <div className="val mono">{ct.zone} — Bay {String(ct.col + 1).padStart(2, '0')} — Row {String(ct.row + 1).padStart(2, '0')} — Tier {ct.tier}</div>
        </div>
        <div className="detail-field">
          <label>Hauteur de pile</label>
          <div className="val mono">{stack.length} / 3 niveaux</div>
        </div>
        <div className="detail-field">
          <label>Client</label>
          <div className="val">{ct.client}</div>
        </div>
        <div className="detail-field">
          <label>Poids</label>
          <div className="val mono">{ct.weight}</div>
        </div>
        <div className="detail-field">
          <label>Date d'entrée</label>
          <div className="val mono">{ct.entryDate}</div>
        </div>
        <div className="detail-field">
          <label>Sortie prévue</label>
          <div className="val mono">{ct.exitDate}</div>
        </div>
        <div className="detail-field">
          <label>Transporteur</label>
          <div className="val mono">{ct.id.substring(0, 4)}</div>
        </div>
        <div className="detail-field">
          <label>Accessible directement</label>
          <div className="val" style={{ color: ct.tier === stack.length ? 'var(--empty-20)' : 'var(--full-20)' }}>
            {ct.tier === stack.length ? '✓ Oui (sommet de pile)' : '✗ Non (conteneur en dessous)'}
          </div>
        </div>
        <div className="detail-field">
          <label>Source</label>
          <div className="val" style={{ color: 'var(--accent)' }}>CargoWise → Sync auto</div>
        </div>
      </div>
    </div>
  );
}
