let grid = [],
  selectedUnitType = "infantry";
let deploymentPhase = true,
  gameStarted = false;
let currentFaction = "france";
let selectedTile = null;

const battlefieldSize = 20;
const moraleThreshold = 30;
const terrainModifiers = {
  plain: { attack: 0, defense: 0 },
  forest: { attack: -0.1, defense: 0.2 },
  hill: { attack: 0.1, defense: 0.2 },
  river: { attack: -0.3, defense: -0.3 },
  bridge: { attack: 0, defense: 0 },
};

document.getElementById("unitType").onchange = (e) =>
  (selectedUnitType = e.target.value);
document.getElementById("deployBtn").onclick = () => {
  if (currentFaction === "france") {
    currentFaction = "russia";
    document.getElementById("deployFaction").textContent = "Russia";
  } else {
    deploymentPhase = false;
    gameStarted = true;
    document.getElementById("startScreen").style.display = "none";
    document.getElementById("turnDisplay").style.display = "block";
    document.getElementById("endTurnBtn").style.display = "inline-block";
    updateTurnDisplay();
  }
};

document.getElementById("endTurnBtn").onclick = () => {
  currentFaction = currentFaction === "france" ? "russia" : "france";
  grid.forEach((g) => {
    if (g.unit) {
      g.unit.hasMoved = false;
      if (g.unit.routed) g.unit.routeTurns++;
    }
  });
  removeExpiredRoutedUnits();
  updateTurnDisplay();
};

function updateTurnDisplay() {
  document.getElementById("turnDisplay").textContent =
    "Turn: " + capitalize(currentFaction);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function createBattlefield(rows = battlefieldSize, cols = battlefieldSize) {
  const container = document.getElementById("battlefield");
  container.innerHTML = "";
  grid = [];

  let map = Array(rows)
    .fill()
    .map(() => Array(cols).fill("plain"));
  createPatch(map, rows, cols, "forest", 5, 25);
  createPatch(map, rows, cols, "hill", 4, 20);
  const mid = Math.floor(cols / 2);
  for (let r = 0; r < rows; r++) {
    const wave = Math.floor(2 * Math.sin(r / 2));
    const c1 = mid + wave;
    if (c1 >= 0 && c1 < cols) {
      map[r][c1] = "river";
      if (Math.random() > 0.7 && c1 + 1 < cols) map[r][c1 + 1] = "river";
    }
  }
  const topR = 1,
    botR = rows - 2;
  const topC = mid + Math.floor(2 * Math.sin(topR / 2));
  const botC = mid + Math.floor(2 * Math.sin(botR / 2));
  map[topR][topC] = map[botR][botC] = "bridge";

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const div = document.createElement("div");
      const terrain = map[r][c];
      div.className = "tile " + terrain;
      div.dataset.row = r;
      div.dataset.col = c;
      div.dataset.terrain = terrain;
      div.onclick = handleTileClick;
      container.appendChild(div);
      grid.push({ row: r, col: c, terrain, unit: null, element: div });
    }
  }
}

function createPatch(map, rows, cols, type, size, count) {
  for (let i = 0; i < count; i++) {
    const r = ~~(Math.random() * rows),
      c = ~~(Math.random() * cols);
    for (let dr = -size; dr <= size; dr++) {
      for (let dc = -size; dc <= size; dc++) {
        const nr = r + dr,
          nc = c + dc;
        if (
          nr >= 0 &&
          nr < rows &&
          nc >= 0 &&
          nc < cols &&
          Math.random() > 0.5
        )
          map[nr][nc] = type;
      }
    }
  }
}

function handleTileClick(ev) {
  const t = ev.currentTarget;
  const row = +t.dataset.row,
    col = +t.dataset.col;
  const tile = grid.find((g) => g.row === row && g.col === col);

  if (deploymentPhase) {
    if ((currentFaction === "france" && row >= 10) || (currentFaction === "russia" && row < 10))
      return;
    if (tile.unit) return;
    const unit = {
      type: selectedUnitType,
      faction: currentFaction,
      hp: 100,
      morale: 100,
      hasMoved: false,
      routed: false,
      routeTurns: 0,
    };
    tile.unit = unit;
    updateTileDisplay(tile);
    return;
  }

  if (!gameStarted) return;

  if (
    !selectedTile &&
    tile.unit &&
    tile.unit.faction === currentFaction &&
    !tile.unit.hasMoved &&
    !tile.unit.routed
  ) {
    selectedTile = tile;
    tile.element.classList.add("selected");
  } else if (selectedTile) {
    if (tile === selectedTile) {
      tile.element.classList.remove("selected");
      selectedTile = null;
    } else {
      attemptMoveOrAttack(selectedTile, tile);
      selectedTile.element.classList.remove("selected");
      selectedTile = null;
    }
  }
}

function attemptMoveOrAttack(fromTile, toTile) {
  const unit = fromTile.unit;
  const dist =
    Math.abs(fromTile.row - toTile.row) + Math.abs(fromTile.col - toTile.col);
  if (dist > 1) return;

  if (!toTile.unit) {
    toTile.unit = unit;
    fromTile.unit = null;
    unit.hasMoved = true;
    updateTileDisplay(fromTile);
    updateTileDisplay(toTile);
    playSound("moveSound");
  } else if (toTile.unit.faction !== unit.faction) {
    const attackerBonus = terrainModifiers[fromTile.terrain]?.attack || 0;
    const defenderBonus = terrainModifiers[toTile.terrain]?.defense || 0;
    const damage = 30 + attackerBonus * 100 - defenderBonus * 100;
    toTile.unit.hp -= damage;
    unit.morale -= 10;
    toTile.unit.morale -= 20;
    unit.hasMoved = true;

    toTile.element.classList.add("attack-hit");
    setTimeout(() => toTile.element.classList.remove("attack-hit"), 500);
    playSound("attackSound");

    if (toTile.unit.morale < moraleThreshold && !toTile.unit.routed) {
      toTile.unit.routed = true;
      toTile.unit.routeTurns = 0;
      toTile.element.classList.add("routed");
      playSound("routingSound");
    }

    if (toTile.unit.hp <= 0) {
      toTile.unit = null;
    }

    updateTileDisplay(toTile);
    updateTileDisplay(fromTile);
    checkWinCondition();
  }
}

function updateTileDisplay(tile) {
  const { unit, element } = tile;
  element.className = "tile " + tile.terrain;
  element.textContent = "";

  if (unit) {
    element.classList.add(unit.faction);
    if (unit.routed) element.classList.add("routed");
    const u = document.createElement("div");
    u.className = "unit-label";
    u.textContent = unit.type[0].toUpperCase();
    const hp = document.createElement("div");
    hp.className = "hp-bar";
    hp.textContent = `HP: ${Math.max(0, Math.round(unit.hp))}`;
    const morale = document.createElement("div");
    morale.className = "morale-bar";
    morale.textContent = `Morale: ${Math.round(unit.morale)}`;
    element.appendChild(u);
    element.appendChild(hp);
    element.appendChild(morale);
  }
}

function removeExpiredRoutedUnits() {
  grid.forEach((tile) => {
    if (tile.unit && tile.unit.routed && tile.unit.routeTurns >= 3) {
      tile.unit = null;
      updateTileDisplay(tile);
    }
  });
}

function checkWinCondition() {
  const france = grid.some(
    (tile) => tile.unit && tile.unit.faction === "france" && !tile.unit.routed
  );
  const russia = grid.some(
    (tile) => tile.unit && tile.unit.faction === "russia" && !tile.unit.routed
  );
  if (!france) alert("Russia Wins!");
  else if (!russia) alert("France Wins!");
}

function playSound(id) {
  const sound = document.getElementById(id);
  if (sound) {
    sound.currentTime = 0;
    sound.play();
  }
}

createBattlefield();

