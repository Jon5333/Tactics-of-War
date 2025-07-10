let grid = [];
let currentFaction = 'france';
let selectedUnitType = 'infantry';
let deploymentPhase = true;
let selectedTile = null;

// Terrain combat modifiers
const combatMods = {
  plain: 1,
  hill: 1.1,
  forest: 0.9,
  river: 0.8,
  bridge: 1
};

document.getElementById('unitType').onchange = e => {
  selectedUnitType = e.target.value;
};
document.getElementById('deployBtn').onclick = deployNext;
document.getElementById('endTurnBtn').onclick = endTurn;

function deployNext() {
  if (currentFaction === 'france') {
    currentFaction = 'russia';
    document.getElementById('deployFaction').textContent = 'Russia';
  } else {
    deploymentPhase = false;
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameUI').style.display = 'block';
    updateTurnDisplay();
  }
}

function updateTurnDisplay() {
  document.getElementById('turnDisplay').textContent =
    'Current Turn: ' + (currentFaction === 'france' ? 'France' : 'Russia');
}

function createBattlefield() {
  const bf = document.getElementById('battlefield');
  bf.innerHTML = '';
  grid = [];

  const rows = 20, cols = 20;
  // 1) Generate base map
  let map = Array(rows).fill().map(() => Array(cols).fill('plain'));

  // 2) Random forests & hills
  for (let i = 0; i < 50; i++) {
    let r = Math.floor(Math.random() * rows),
        c = Math.floor(Math.random() * cols),
        t = Math.random() < 0.5 ? 'forest' : 'hill';
    map[r][c] = t;
  }

  // 3) River down middle
  const mid = Math.floor(cols / 2);
  for (let r = 0; r < rows; r++) {
    map[r][mid] = 'river';
    if (Math.random() > 0.7 && mid + 1 < cols) map[r][mid + 1] = 'river';
  }

  // 4) Bridges
  map[2][mid] = 'bridge';
  map[17][mid] = 'bridge';

  // 5) Build grid cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const terrain = map[r][c];
      const div = document.createElement('div');
      div.className = `tile ${terrain}`;
      div.dataset.row = r;
      div.dataset.col = c;
      div.dataset.terrain = terrain;
      div.onclick = () => onTileClick(r, c);
      bf.appendChild(div);
      grid.push({ row: r, col: c, terrain, unit: null, element: div });
    }
  }
}

// Handle clicks for deploy, move, or attack
function onTileClick(r, c) {
  const cell = grid.find(t => t.row === r && t.col === c);

  if (deploymentPhase) {
    // Deploy phase restrictions
    if ((currentFaction === 'france' && r >= 10) ||
        (currentFaction === 'russia' && r < 10)) return;
    if (cell.unit) return;
    cell.unit = {
      type: selectedUnitType,
      faction: currentFaction,
      hp: 100,
      morale: 100,
      hasMoved: false,
      hasAttacked: false,
      routed: false,
      routeTurns: 0
    };
    renderCell(cell);
    return;
  }

  // Game phase: select or act
  if (!selectedTile) {
    if (cell.unit &&
        cell.unit.faction === currentFaction &&
        !cell.unit.hasMoved &&
        !cell.unit.routed) {
      selectedTile = cell;
      cell.element.classList.add('selected');
    }
  } else {
    selectedTile.element.classList.remove('selected');
    attemptAction(selectedTile, cell);
    selectedTile = null;
  }
}

// Move or attack logic
function attemptAction(from, to) {
  const unit = from.unit;
  const dist = Math.abs(from.row - to.row) + Math.abs(from.col - to.col);
  if (dist !== 1 || unit.hasMoved) return;

  if (!to.unit) {
    // Move
    to.unit = unit;
    from.unit = null;
    unit.hasMoved = true;
    renderCell(from);
    renderCell(to);
  } else if (to.unit.faction !== currentFaction && !unit.hasAttacked) {
    // Attack
    const attack = 30 * combatMods[from.terrain];
    to.unit.hp -= attack;
    to.unit.morale -= 25;
    unit.hasAttacked = true;

    // Routing check
    if (to.unit.morale <= 30 && !to.unit.routed) {
      to.unit.routed = true;
      to.element.classList.add('routed');
    }
    // Death check
    if (to.unit.hp <= 0 || to.unit.morale <= 0) {
      to.unit = null;
    }

    renderCell(from);
    renderCell(to);
    checkWinCondition();
  }
}

// Render a single cell
function renderCell(cell) {
  const el = cell.element;
  el.className = `tile ${cell.terrain}`;
  el.textContent = '';
  if (cell.unit) {
    el.classList.add(cell.unit.faction);
    if (cell.unit.routed) el.classList.add('routed');

    const lbl = document.createElement('div');
    lbl.textContent = cell.unit.type[0].toUpperCase();
    lbl.className = 'unit-label';

    const hp = document.createElement('div');
    hp.textContent = `${Math.round(cell.unit.hp)} HP`;
    hp.className = 'hp-bar';

    const mr = document.createElement('div');
    mr.textContent = `${Math.round(cell.unit.morale)} M`;
    mr.className = 'morale-bar';

    el.append(lbl, hp, mr);
  }
}

// End turn: reset and process routed units
function endTurn() {
  grid.forEach(cell => {
    if (cell.unit && cell.unit.faction === currentFaction) {
      cell.unit.hasMoved = false;
      cell.unit.hasAttacked = false;
      if (cell.unit.routed) {
        cell.unit.routeTurns++;
        moveRouted(cell);
        if (cell.unit.routeTurns > 3) {
          cell.unit = null;
        }
      }
    }
    renderCell(cell);
  });
  currentFaction = currentFaction === 'france' ? 'russia' : 'france';
  updateTurnDisplay();
  checkWinCondition();
}

// Move a routed unit away
function moveRouted(cell) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (let [dr, dc] of dirs) {
    const nr = cell.row + dr, nc = cell.col + dc;
    const nxt = grid.find(t => t.row === nr && t.col === nc);
    if (nxt && !nxt.unit) {
      nxt.unit = cell.unit;
      nxt.element.classList.add('routed');
      nxt.unit.hasMoved = true;
      cell.unit = null;
      renderCell(nxt);
      renderCell(cell);
      break;
    }
  }
}

// Check for a winner
function checkWinCondition() {
  const franceAlive = grid.some(t => t.unit && t.unit.faction === 'france' && !t.unit.routed);
  const russiaAlive = grid.some(t => t.unit && t.unit.faction === 'russia' && !t.unit.routed);
  if (!franceAlive) { alert('Russia Wins!'); resetGame(); }
  if (!russiaAlive) { alert('France Wins!'); resetGame(); }
}

// Reset to deployment
function resetGame() {
  deploymentPhase = true;
  grid = [];
  createBattlefield();
  currentFaction = 'france';
  document.getElementById('startScreen').style.display = 'block';
  document.getElementById('gameUI').style.display = 'none';
  document.getElementById('deployFaction').textContent = 'France';
}

createBattlefield();
