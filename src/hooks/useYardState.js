import { useState, useCallback, useRef } from 'react';
import { ZONES as INITIAL_ZONES, MAX_TIER, TYPES, CARRIERS, CLIENTS } from '../data/config';
import { generateYardData, posLabel } from '../data/generateData';
import { canStack, compactZone } from '../data/rules';

export function useYardState() {
  const [dataVersion, setDataVersion] = useState(0);
  const stacksRef = useRef(null);
  const containersRef = useRef(null);
  const [zones, setZones] = useState(INITIAL_ZONES);
  const [moveHistory, setMoveHistory] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState([]);
  const [stackPopup, setStackPopup] = useState(null);
  const [detailContainer, setDetailContainer] = useState(null);
  const [movementLog, setMovementLog] = useState([]);

  // Initialize data once
  if (!stacksRef.current) {
    const { stacks, allContainers } = generateYardData();
    stacksRef.current = stacks;
    containersRef.current = allContainers;
  }

  const stacks = stacksRef.current;
  const allContainers = containersRef.current;

  const forceUpdate = useCallback(() => {
    setDataVersion(v => v + 1);
  }, []);

  const showToast = useCallback((type, html) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, html }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  // ============ ZONE MANAGEMENT ============

  const addZone = useCallback((id, label, rows, cols) => {
    if (stacks[id]) {
      showToast('error', `La zone <strong>${id}</strong> existe déjà.`);
      return false;
    }
    // Init empty stacks
    stacks[id] = [];
    for (let r = 0; r < rows; r++) {
      stacks[id][r] = [];
      for (let c = 0; c < cols; c++) {
        stacks[id][r][c] = [];
      }
    }
    setZones(prev => [...prev, { id, label, rows, cols }]);
    showToast('success', `Zone <strong>${id}</strong> créée (${rows}x${cols}).`);
    forceUpdate();
    return true;
  }, [stacks, showToast, forceUpdate]);

  const editZone = useCallback((zoneId, newLabel, newRows, newCols) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return false;

    // Check if shrinking would lose containers
    const oldRows = zone.rows;
    const oldCols = zone.cols;

    if (newRows < oldRows) {
      for (let r = newRows; r < oldRows; r++) {
        for (let c = 0; c < oldCols; c++) {
          if (stacks[zoneId][r] && stacks[zoneId][r][c] && stacks[zoneId][r][c].length > 0) {
            showToast('error', `Impossible : des conteneurs occupent les rangées supprimées. Videz-les d'abord.`);
            return false;
          }
        }
      }
    }
    if (newCols < oldCols) {
      for (let r = 0; r < Math.min(oldRows, newRows); r++) {
        for (let c = newCols; c < oldCols; c++) {
          if (stacks[zoneId][r] && stacks[zoneId][r][c] && stacks[zoneId][r][c].length > 0) {
            showToast('error', `Impossible : des conteneurs occupent les colonnes supprimées. Videz-les d'abord.`);
            return false;
          }
        }
      }
    }

    // Expand rows
    for (let r = oldRows; r < newRows; r++) {
      stacks[zoneId][r] = [];
      for (let c = 0; c < Math.max(oldCols, newCols); c++) {
        stacks[zoneId][r][c] = [];
      }
    }
    // Expand cols on existing rows
    for (let r = 0; r < Math.min(oldRows, newRows); r++) {
      for (let c = oldCols; c < newCols; c++) {
        stacks[zoneId][r][c] = [];
      }
    }
    // Shrink rows
    if (newRows < oldRows) {
      stacks[zoneId].length = newRows;
    }
    // Shrink cols
    if (newCols < oldCols) {
      for (let r = 0; r < newRows; r++) {
        stacks[zoneId][r].length = newCols;
      }
    }

    setZones(prev => prev.map(z => z.id === zoneId ? { ...z, label: newLabel, rows: newRows, cols: newCols } : z));
    showToast('success', `Zone <strong>${zoneId}</strong> modifiée.`);
    forceUpdate();
    return true;
  }, [zones, stacks, showToast, forceUpdate]);

  const deleteZone = useCallback((zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return false;

    // Check if zone has containers
    let count = 0;
    for (let r = 0; r < zone.rows; r++) {
      for (let c = 0; c < zone.cols; c++) {
        count += stacks[zoneId][r][c].length;
      }
    }
    if (count > 0) {
      showToast('error', `Impossible : la zone <strong>${zoneId}</strong> contient encore ${count} conteneur(s). Videz-la d'abord.`);
      return false;
    }

    // Remove from allContainers (should be none but safety)
    // Remove stacks
    delete stacks[zoneId];
    setZones(prev => prev.filter(z => z.id !== zoneId));
    if (zoneFilter === zoneId) setZoneFilter('all');
    showToast('success', `Zone <strong>${zoneId}</strong> supprimée.`);
    forceUpdate();
    return true;
  }, [zones, stacks, zoneFilter, showToast, forceUpdate, setZoneFilter]);

  // ============ CONTAINER MOVEMENTS ============

  const genContainerId = useCallback(() => {
    return CARRIERS[Math.floor(Math.random() * CARRIERS.length)] + String(Math.floor(Math.random() * 9000000) + 1000000);
  }, []);

  // ARRIVAL: new container enters the yard
  const containerArrival = useCallback((opts) => {
    const { id, type, client, weight, zoneId, row, col } = opts;
    if (!stacks[zoneId] || !stacks[zoneId][row] || !stacks[zoneId][row][col]) {
      showToast('error', 'Emplacement invalide.');
      return false;
    }
    const targetStack = stacks[zoneId][row][col];
    if (targetStack.length >= MAX_TIER) {
      showToast('error', `Pile pleine à ${posLabel(zoneId, row, col)}.`);
      return false;
    }
    if (!canStack(type, targetStack)) {
      showToast('error', `Interdit : un 40' ne peut pas être empilé sur un 20'.`);
      return false;
    }

    const ct = {
      id: id || genContainerId(),
      type,
      client: client || 'N/A',
      weight: weight || (type.includes('full') || type === 'reefer-full' ? '— kg' : '—'),
      zone: zoneId,
      row,
      col,
      tier: targetStack.length + 1,
      entryDate: new Date().toISOString().split('T')[0],
      exitDate: '',
    };

    targetStack.push(ct);
    allContainers.push(ct);

    setMovementLog(prev => [{
      action: 'arrival',
      ct,
      position: posLabel(zoneId, row, col),
      time: new Date(),
    }, ...prev]);

    showToast('success', `Arrivée : <strong>${ct.id}</strong> placé à ${posLabel(zoneId, row, col)}.`);
    forceUpdate();
    return true;
  }, [stacks, allContainers, showToast, forceUpdate, genContainerId]);

  // DEPARTURE: container leaves the yard
  const containerDeparture = useCallback((containerId) => {
    // Find the container
    const ct = allContainers.find(c => c.id === containerId);
    if (!ct) {
      showToast('error', `Conteneur <strong>${containerId}</strong> introuvable.`);
      return false;
    }
    const stack = stacks[ct.zone][ct.row][ct.col];
    if (stack[stack.length - 1] !== ct) {
      showToast('error', `<strong>${containerId}</strong> n'est pas au sommet. Déplacez les conteneurs au-dessus d'abord.`);
      return false;
    }

    // Remove from stack
    stack.pop();
    stack.forEach((c, i) => { c.tier = i + 1; });

    // Remove from allContainers
    const idx = allContainers.indexOf(ct);
    if (idx !== -1) allContainers.splice(idx, 1);

    setMovementLog(prev => [{
      action: 'departure',
      ct: { ...ct },
      position: posLabel(ct.zone, ct.row, ct.col),
      time: new Date(),
    }, ...prev]);

    showToast('success', `Départ : <strong>${ct.id}</strong> retiré de ${posLabel(ct.zone, ct.row, ct.col)}.`);
    forceUpdate();
    return true;
  }, [stacks, allContainers, showToast, forceUpdate]);

  // TRANSFER: move container to another zone (auto-find first available slot)
  const containerTransfer = useCallback((containerId, targetZoneId) => {
    const ct = allContainers.find(c => c.id === containerId);
    if (!ct) {
      showToast('error', `Conteneur <strong>${containerId}</strong> introuvable.`);
      return false;
    }
    const srcStack = stacks[ct.zone][ct.row][ct.col];
    if (srcStack[srcStack.length - 1] !== ct) {
      showToast('error', `<strong>${containerId}</strong> n'est pas au sommet. Déplacez les conteneurs au-dessus d'abord.`);
      return false;
    }

    const targetZone = zones.find(z => z.id === targetZoneId);
    if (!targetZone) {
      showToast('error', `Zone <strong>${targetZoneId}</strong> introuvable.`);
      return false;
    }

    // Find first available slot
    let placed = false;
    for (let r = 0; r < targetZone.rows && !placed; r++) {
      for (let c = 0; c < targetZone.cols && !placed; c++) {
        const slot = stacks[targetZoneId][r][c];
        if (slot.length < MAX_TIER && canStack(ct.type, slot)) {
          const fromPos = posLabel(ct.zone, ct.row, ct.col);

          // Remove from source
          srcStack.pop();
          srcStack.forEach((x, i) => { x.tier = i + 1; });

          // Place in destination
          ct.zone = targetZoneId;
          ct.row = r;
          ct.col = c;
          ct.tier = slot.length + 1;
          slot.push(ct);

          const toPos = posLabel(targetZoneId, r, c);

          setMovementLog(prev => [{
            action: 'transfer',
            ct,
            fromPosition: fromPos,
            position: toPos,
            time: new Date(),
          }, ...prev]);

          showToast('success', `Transfert : <strong>${ct.id}</strong> de ${fromPos} → ${toPos}.`);
          placed = true;
        }
      }
    }

    if (!placed) {
      showToast('error', `Aucun emplacement disponible dans la zone <strong>${targetZoneId}</strong>.`);
      return false;
    }

    forceUpdate();
    return true;
  }, [stacks, allContainers, zones, showToast, forceUpdate]);

  // ============ DRAG & DROP MOVE ============

  const executeMove = useCallback((ct, fromZone, fromRow, fromCol, toZone, toRow, toCol, addToHistory) => {
    const srcStack = stacks[fromZone][fromRow][fromCol];
    const idx = srcStack.indexOf(ct);
    if (idx !== -1) srcStack.splice(idx, 1);
    srcStack.forEach((c, i) => { c.tier = i + 1; });

    const dstStack = stacks[toZone][toRow][toCol];
    ct.zone = toZone; ct.row = toRow; ct.col = toCol;
    ct.tier = dstStack.length + 1;
    dstStack.push(ct);

    if (addToHistory) {
      setMoveHistory(prev => [{
        ct, fromZone, fromRow, fromCol, toZone, toRow, toCol,
        time: new Date()
      }, ...prev]);
      showToast('success', `<strong>${ct.id}</strong> déplacé de ${posLabel(fromZone, fromRow, fromCol)} → ${posLabel(toZone, toRow, toCol)}`);
    }

    forceUpdate();
  }, [stacks, forceUpdate, showToast]);

  const undoMove = useCallback((index) => {
    const move = moveHistory[index];
    if (!move) return;

    const dstStack = stacks[move.toZone][move.toRow][move.toCol];
    if (dstStack[dstStack.length - 1] !== move.ct) {
      showToast('error', `Impossible d'annuler : <strong>${move.ct.id}</strong> n'est plus au sommet de la pile.`);
      return;
    }
    const srcStack = stacks[move.fromZone][move.fromRow][move.fromCol];
    if (srcStack.length >= MAX_TIER) {
      showToast('error', `Impossible d'annuler : ${posLabel(move.fromZone, move.fromRow, move.fromCol)} est plein.`);
      return;
    }
    if (!canStack(move.ct.type, srcStack)) {
      showToast('error', `Impossible d'annuler : un 40' ne peut pas être empilé sur un 20'.`);
      return;
    }

    executeMove(move.ct, move.toZone, move.toRow, move.toCol, move.fromZone, move.fromRow, move.fromCol, false);
    setMoveHistory(prev => prev.filter((_, i) => i !== index));
    showToast('info', `Mouvement annulé : <strong>${move.ct.id}</strong> retourné à ${posLabel(move.fromZone, move.fromRow, move.fromCol)}`);
  }, [moveHistory, stacks, executeMove, showToast]);

  // ============ COMPACT ============

  const handleCompactZone = useCallback((zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;
    const count = compactZone(stacks, zone);
    if (count === 0) {
      showToast('info', `Zone ${zoneId} est déjà vide.`);
      return;
    }
    setMoveHistory([]);
    forceUpdate();
    showToast('success', `Zone ${zoneId} compactée : <strong>${count}</strong> conteneurs réorganisés.`);
  }, [zones, stacks, forceUpdate, showToast]);

  const handleCompactAll = useCallback(() => {
    let total = 0;
    zones.forEach(zone => {
      total += compactZone(stacks, zone);
    });
    if (total === 0) {
      showToast('info', 'Le yard est déjà vide.');
      return;
    }
    setMoveHistory([]);
    forceUpdate();
    showToast('success', `Yard compacté : <strong>${total}</strong> conteneurs réorganisés sur ${zones.length} zones.`);
  }, [zones, stacks, forceUpdate, showToast]);

  // ============ STATS ============

  const totalContainers = allContainers.length;
  const totalSlots = zones.reduce((s, z) => s + z.rows * z.cols * MAX_TIER, 0);
  const occupancy = totalSlots > 0 ? Math.round(totalContainers / totalSlots * 100) : 0;
  const reeferCount = allContainers.filter(c => c.type.includes('reefer')).length;
  let multiStacks = 0;
  zones.forEach(z => {
    if (!stacks[z.id]) return;
    for (let r = 0; r < z.rows; r++)
      for (let c = 0; c < z.cols; c++)
        if (stacks[z.id][r] && stacks[z.id][r][c] && stacks[z.id][r][c].length >= 2) multiStacks++;
  });

  const typeCounts = {};
  TYPES.forEach(t => { typeCounts[t] = allContainers.filter(c => c.type === t).length; });

  return {
    stacks, allContainers, zones, dataVersion,
    moveHistory, movementLog,
    activeFilter, setActiveFilter,
    zoneFilter, setZoneFilter,
    searchQuery, setSearchQuery,
    toasts, showToast,
    stackPopup, setStackPopup,
    detailContainer, setDetailContainer,
    executeMove, undoMove,
    addZone, editZone, deleteZone,
    containerArrival, containerDeparture, containerTransfer,
    compactZone: handleCompactZone, compactAll: handleCompactAll,
    stats: { totalContainers, occupancy, reeferCount, multiStacks, typeCounts },
  };
}
