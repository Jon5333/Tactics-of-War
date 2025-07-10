let grid = [], selectedUnitType = 'infantry';
let deploymentPhase = true;
let currentFaction = 'france';
let routedTimers = {};

document.getElementById('unitType').onchange = e => selectedUnitType = e.target.value;

document.getElementById('deployBtn').onclick = () => {
  if (currentFaction === 'france') {
    currentFaction = 'russia';
    document.getElementById('deployFaction').textContent = 'Russia';
  } else {
    deploymentPhase = false;
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameUI').style.display = 'block';
    updateTurnDisplay();
  }
};

document.getElementById('endTurn').onclick = () => {
  grid.forEach(tile => {
    const unit = tile.unit;
    if (unit && unit.faction === currentFaction) unit.hasMoved = false;
    if (unit && unit.routed) {
      const id = tile.row + ',' + tile.col;
      routedTimers[id] = (routedTimers[id] || 0) + 1;
      moveAway(tile);
      if (routedTimers[id] >= 3) {
        tile.unit = null;
        tile.textContent = '';
        tile.element.classList.remove('routed');
      }
    }
  });
  currentFaction = currentFaction === 'france' ? 'russia' : 'france';
  updateTurnDisplay();
};

function updateTurnDisplay() {
  document.getElementById('turnDisplay').textContent = 'Current Turn: ' + (currentFaction === 'france' ? 'France' : 'Russia');
}

function createBattlefield(rows = 20, cols = 20) {
  const battlefield = document.getElementById('battlefield');
  battlefield.innerHTML = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.dataset.row = r;
      tile.dataset.col = c;
      tile.onclick = () => handleTileClick(tile, r, c);
      battlefield.appendChild(tile);
      grid.push({ row: r, col: c, unit: null, element: tile });
    }
  }
}

function handleTileClick(tileEl, row, col) {
  const tile = grid.find(g => g.row === row && g.col === col);
  if (deploymentPhase) {
    if (currentFaction === 'france' && row >= 10) return;
    if (currentFaction === 'russia' && row < 10) return;
    tile.unit = {
      type: selectedUnitType,
      faction: currentFaction,
      hp: 100,
      morale: 100,
      hasMoved: false
    };
    tileEl.textContent = selectedUnitType[0].toUpperCase();
  } else {
    const unit = tile.unit;
    if (unit && unit.faction === currentFaction && !unit.hasMoved) {
      const target = prompt("Enter target coordinates (row,col):");
      const [tr, tc] = target.split(',').map(Number);
      const targetTile = grid.find(g => g.row === tr && g.col === tc);
      if (!targetTile) return;
      if (!targetTile.unit) {
        targetTile.unit = unit;
        targetTile.element.textContent = tile.element.textContent;
        tile.unit = null;
        tileEl.textContent = '';
      } else if (targetTile.unit.faction !== currentFaction) {
        targetTile.unit.hp -= 50;
        targetTile.unit.morale -= 40;
        if (targetTile.unit.morale < 30) {
          targetTile.unit.routed = true;
          targetTile.element.classList.add('routed');
        }
        if (targetTile.unit.hp <= 0) {
          targetTile.unit = null;
          targetTile.element.textContent = '';
        }
      }
      unit.hasMoved = true;
    }
  }
}

function moveAway(tile) {
  const directions = [[-1,0],[1,0],[0,-1],[0,1]];
  for (let [dr,dc] of directions) {
    const nr = tile.row + dr, nc = tile.col + dc;
    const nextTile = grid.find(g => g.row === nr && g.col === nc);
    if (nextTile && !nextTile.unit) {
      nextTile.unit = tile.unit;
      nextTile.unit.hasMoved = true;
      nextTile.element.textContent = tile.element.textContent;
      nextTile.element.classList.add('routed');
      tile.unit = null;
      tile.element.textContent = '';
      tile.element.classList.remove('routed');
      break;
    }
  }
}

createBattlefield();
