import { useState, useEffect } from 'react';

export default function Header({ onOpenZoneManager, onOpenMovementManager }) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' EAT');
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="header">
      <div className="header-left">
        <div className="logo">YV</div>
        <div className="header-title">
          <h1>CCIS Yard View</h1>
          <span>CEVA Logistics — Dépôt Toamasina</span>
        </div>
      </div>
      <div className="header-right">
        <button className="header-action-btn" onClick={onOpenMovementManager}>
          <span className="header-action-icon">↕</span>
          Mouvements
        </button>
        <button className="header-action-btn header-action-secondary" onClick={onOpenZoneManager}>
          <span className="header-action-icon">⊞</span>
          Zones
        </button>
        <div className="live-badge"><div className="live-dot"></div> En direct</div>
        <div className="timestamp">{time}</div>
      </div>
    </div>
  );
}
