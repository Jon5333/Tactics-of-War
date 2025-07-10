document.getElementById("startButton").onclick = () => {
  document.getElementById("startScreen").style.display = "none";
  document.getElementById("gameUI").style.display = "block";
  generateBattlefield();
};

document.getElementById("endTurn").onclick = () => {
  alert("Turn ended!");
};

function generateBattlefield() {
  const battlefield = document.getElementById("battlefield");
  for (let i = 0; i < 400; i++) {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.textContent = ".";
    battlefield.appendChild(tile);
  }
}
