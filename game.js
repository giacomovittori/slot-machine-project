/* ===============================================================
   TROPICAL REELS — LOGICA DEL GIOCO
   Tutti i crediti sono fittizi. Non è un gioco d'azzardo reale.

   PERSONALIZZA QUI (CONFIG):
   - puntata / crediti iniziali
   - quanti simboli BONUS per attivare la funzione
   - giri gratuiti e moltiplicatore del bonus
   - velocità dei rulli
   =============================================================== */

const CONFIG = {
  columns: 6,
  rows: 4,
  startingCredits: 30,
  bet: 0.10,
  bonusSymbolsNeeded: 3,
  freeSpinsAward: 5,
  bonusRetriggerSpins: 3,
  bonusWinMultiplier: 2,
  spinDurationMs: 1300,
  staggerMs: 180,
  // Il ritratto è un simbolo ordinario: può formare combinazioni e vincere.
  portraitSymbolId: "RITRATTO",
  // Premio di una linea di 3, 4, 5 o 6 simboli, in multipli della puntata.
  lineMultipliers: { 3: 2, 4: 5, 5: 12, 6: 30 }
};

/*
  DEFAULT UNIVERSALE DELLE IMMAGINI
  Vale per OGNI nuovo simbolo con kind: "image".
  fit: "contain" mostra SEMPRE tutta la foto (non taglia la testa).
  zoom sotto 1 = dezoom: 0.84 lascia un margine del 16%.
  x/y spostano la foto in percentuale rispetto al riquadro.
  Per un singolo simbolo puoi sovrascrivere i valori con image: {...}.
*/
const IMAGE_DEFAULTS = Object.freeze({
  fit: "contain",
  zoom: 0.88,
  x: 0,
  y: 0,
  background: "#213947",
  idleSeconds: 4.4,
  blinkSeconds: 5.2,
  winSeconds: 1.65
});

/*
  frequency: più alto = simbolo più frequente.
  payout: moltiplica il valore della combinazione.
  icon: emoji/testo oppure percorso dell'immagine per kind: 'portrait'.
  Il simbolo BONUS si può trovare in qualunque rullo/riga.
*/
const SYMBOLS = [
  { id: "K",      icon: "K",    label: "KING",      kind: "letter",   frequency: 7, payout: 1 },
  { id: "Q",      icon: "Q",    label: "QUEEN",     kind: "letter",   frequency: 7, payout: 1 },
  { id: "J",      icon: "J",    label: "JACK",      kind: "letter",   frequency: 7, payout: 1 },
  { id: "A",      icon: "A",    label: "ACE",       kind: "letter",   frequency: 7, payout: 1 },
  { id: "10",     icon: "10",   label: "TEN",       kind: "letter",   frequency: 7, payout: 1 },
  { id: "TIGRE",  icon: "🐯",   label: "TIGRE",     kind: "animal",   frequency: 4, payout: 2 },
  // ESEMPIO: simbolo fotografico con VERO battito delle palpebre e sorriso.
  // Tutte le altre immagini future useranno automaticamente IMAGE_DEFAULTS.
  { id: "RITRATTO", label: "VIP", kind: "image", frequency: 4, payout: 2.3,
    image: {
      src: "assets/ritratto.webp",             // foto normale, testa intera
      blink: "assets/ritratto-blink.webp",     // occhi chiusi
      win: "assets/ritratto-smile.webp",       // espressione di vincita
      zoom: 0.92                             // < 1 = dezoom, senza crop
    }
  },
  { id: "PAPPAGALLO",icon:"🦜",label:"PAPPAGALLO",kind: "animal",   frequency: 4, payout: 2 },
  { id: "TORO",   icon: "🐂",   label: "TORO",      kind: "animal",   frequency: 4, payout: 2.3 },
  { id: "ANANAS", icon: "🍍",   label: "ANANAS",    kind: "treasure", frequency: 4, payout: 1.6 },
  { id: "GEMMA",  icon: "💎",   label: "GEMMA",     kind: "treasure", frequency: 3, payout: 3 },
  { id: "WILD",   icon: "WILD", label: "JOLLY",     kind: "wild",     frequency: 2, payout: 0 },
  { id: "BONUS",  icon: "🎁",   label: "BONUS",     kind: "bonus",    frequency: 3, payout: 0 }
];

const SPECIAL = { WILD: "WILD", BONUS: "BONUS" };
const byId = Object.fromEntries(SYMBOLS.map(symbol => [symbol.id, symbol]));
const weightedPool = SYMBOLS.flatMap(symbol => Array(symbol.frequency).fill(symbol.id));
const $ = id => document.getElementById(id);
const ui = {
  grid: $("reelGrid"), frame: $("machineFrame"), credits: $("credits"),
  win: $("lastWin"), freeSpins: $("freeSpins"), bonusIndicator: $("bonusIndicator"),
  spin: $("spinBtn"), test: $("testBonusBtn"), testPortrait: $("testPortraitBtn"), reset: $("resetBtn"),
  status: $("status"), modal: $("bonusModal"), modalIcon: $("modalIcon"),
  modalEyebrow: $("modalEyebrow"), modalTitle: $("modalTitle"),
  modalDescription: $("modalDescription"), modalButton: $("modalButton"),
  confetti: $("confetti"), portraitPreview: $("portraitPreview"),
  portraitPreviewTarget: $("portraitPreviewTarget"), previewPortrait: $("previewPortraitBtn"),
  closePortraitPreview: $("closePortraitPreview")
};

const state = {
  credits: CONFIG.startingCredits,
  lastWin: 0,
  freeSpins: 0,
  bonusMode: false,
  busy: false,
  grid: [],
  reelElements: []
};

function money(amount) {
  return amount.toFixed(2).replace(".", ",");
}
function randomSymbol() {
  return weightedPool[Math.floor(Math.random() * weightedPool.length)];
}
function randomGrid() {
  return Array.from({ length: CONFIG.columns }, () =>
    Array.from({ length: CONFIG.rows }, randomSymbol)
  );
}

// Escape per percorsi, etichette e nomi modificati dall'utente.
function htmlEsc(value) {
  return String(value).replace(/[&<>"']/g, char =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  );
}

function imageSymbolHtml(symbol) {
  // Restano attivi tutti i default anche quando si sostituisce un'immagine.
  const photo = { ...IMAGE_DEFAULTS, ...(symbol.image || {}) };
  const fit = photo.fit === "cover" ? "cover" : "contain";
  const zoom = Math.min(2, Math.max(0.35, Number(photo.zoom) || IMAGE_DEFAULTS.zoom));
  const x = Math.min(50, Math.max(-50, Number(photo.x) || 0));
  const y = Math.min(50, Math.max(-50, Number(photo.y) || 0));
  const idle = Math.max(1, Number(photo.idleSeconds) || IMAGE_DEFAULTS.idleSeconds);
  const blink = Math.max(2, Number(photo.blinkSeconds) || IMAGE_DEFAULTS.blinkSeconds);
  const win = Math.max(0.7, Number(photo.winSeconds) || IMAGE_DEFAULTS.winSeconds);
  const bg = /^#[0-9a-fA-F]{3,8}$/.test(photo.background) ? photo.background : IMAGE_DEFAULTS.background;
  const style = `--image-fit:${fit};--image-zoom:${zoom};--image-offset-x:${x}%;--image-offset-y:${y}%;--image-bg:${bg};--image-idle:${idle}s;--image-blink:${blink}s;--image-win:${win}s`;
  const frame = (src,extra) => src
    ? `<img class="image-symbol__frame ${extra}" src="${htmlEsc(src)}" alt="" draggable="false">`
    : "";
  return `<span class="image-symbol" style="${style}" aria-hidden="true">
    <span class="image-symbol__art">
      ${frame(photo.src || symbol.icon,"image-symbol__frame--base")}
      ${frame(photo.win,"image-symbol__frame--win")}
      ${frame(photo.blink,"image-symbol__frame--blink")}
    </span>
    <span class="image-symbol__glint"></span>
  </span>`;
}

function symbolHtml(id) {
  const symbol = byId[id];
  // kind: image vale per volti, animali, oggetti e qualsiasi futura fotografia.
  const visual = symbol.kind === "image" || symbol.kind === "portrait"
    ? imageSymbolHtml(symbol)
    : `<span class="symbol__icon">${htmlEsc(symbol.icon)}</span>`;
  return `<div class="symbol symbol--${htmlEsc(symbol.kind)}" data-symbol="${htmlEsc(symbol.id)}">
    ${visual}
    <span class="symbol__label">${htmlEsc(symbol.label)}</span>
  </div>`;
}

function makeReels() {
  ui.grid.innerHTML = "";
  state.reelElements = [];
  state.grid.forEach(column => {
    const windowElement = document.createElement("div");
    windowElement.className = "reel-window";
    const track = document.createElement("div");
    track.className = "reel-track";
    track.innerHTML = column.map(symbolHtml).join("");
    windowElement.append(track);
    ui.grid.append(windowElement);
    state.reelElements.push({ windowElement, track });
  });
}

function updateUi() {
  ui.credits.textContent = money(state.credits);
  ui.win.textContent = money(state.lastWin);
  ui.freeSpins.textContent = state.freeSpins;
  ui.bonusIndicator.classList.toggle("is-active", state.bonusMode);
  ui.bonusIndicator.textContent = state.bonusMode
    ? `🎁 BONUS ATTIVO · VINCITE ×${CONFIG.bonusWinMultiplier}`
    : `${CONFIG.bonusSymbolsNeeded} 🎁 = ${CONFIG.freeSpinsAward} FREE SPINS`;
  ui.spin.textContent = state.busy ? "GIRANDO…" : state.freeSpins > 0 ? "↻ GIRO GRATIS" : "↻ GIRA";
  ui.spin.disabled = state.busy;
  ui.test.disabled = state.busy || state.bonusMode;
  ui.testPortrait.disabled = state.busy || state.bonusMode;
  ui.previewPortrait.disabled = state.busy;
  ui.reset.disabled = state.busy;
}

function showStatus(text, highlight = false) {
  ui.status.textContent = text;
  ui.status.classList.toggle("is-big", highlight);
}

function showModal({ icon, eyebrow, title, description, button }) {
  ui.modalIcon.textContent = icon;
  ui.modalEyebrow.textContent = eyebrow;
  ui.modalTitle.textContent = title;
  ui.modalDescription.textContent = description;
  ui.modalButton.textContent = button;
  ui.modal.classList.remove("is-hidden");
  ui.modal.setAttribute("aria-hidden", "false");
  ui.modalButton.focus();
}
function closeModal() {
  ui.modal.classList.add("is-hidden");
  ui.modal.setAttribute("aria-hidden", "true");
  ui.spin.focus();
}

function addConfetti(amount = 40) {
  ui.confetti.replaceChildren();
  const colors = ["#ffda70", "#80ffd6", "#fd87a0", "#a2d9ff", "#ffffff"];
  for (let i = 0; i < amount; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-bit";
    piece.style.left = (30 + Math.random() * 40) + "%";
    piece.style.top = (30 + Math.random() * 30) + "%";
    piece.style.backgroundColor = colors[i % colors.length];
    piece.style.setProperty("--dx", (Math.random() * 700 - 350) + "px");
    piece.style.setProperty("--dy", (Math.random() * 600 - 300) + "px");
    piece.style.setProperty("--rotate", (Math.random() * 1000 - 500) + "deg");
    piece.style.setProperty("--duration", (1 + Math.random()) + "s");
    ui.confetti.append(piece);
  }
  ui.frame.classList.add("is-celebrating");
  setTimeout(() => {
    ui.confetti.replaceChildren();
    ui.frame.classList.remove("is-celebrating");
  }, 2100);
}

/*
  Regole di vincita del prototipo:
  - Ci sono 4 linee ORIZZONTALI (una per ciascuna riga).
  - Su una linea servono 3+ simboli uguali DA SINISTRA A DESTRA.
  - WILD sostituisce qualsiasi simbolo normale, ma non BONUS.
  - BONUS è uno scatter: ne bastano 3 ovunque nella griglia.
*/
function evaluateWins(grid, isFreeSpin) {
  const winningCells = new Set();
  const bonusCells = [];
  let amount = 0;

  for (let col = 0; col < CONFIG.columns; col++) {
    for (let row = 0; row < CONFIG.rows; row++) {
      if (grid[col][row] === SPECIAL.BONUS) bonusCells.push([col, row]);
    }
  }

  for (let row = 0; row < CONFIG.rows; row++) {
    let best = null;
    for (const symbol of SYMBOLS) {
      if (symbol.id === SPECIAL.WILD || symbol.id === SPECIAL.BONUS) continue;
      let consecutive = 0;
      for (let col = 0; col < CONFIG.columns; col++) {
        const cell = grid[col][row];
        if (cell === symbol.id || cell === SPECIAL.WILD) consecutive++;
        else break;
      }
      if (consecutive < 3) continue;
      const credits = CONFIG.bet * CONFIG.lineMultipliers[consecutive] * symbol.payout;
      if (!best || credits > best.credits) {
        best = { consecutive, credits };
      }
    }
    if (best) {
      amount += best.credits;
      for (let col = 0; col < best.consecutive; col++) winningCells.add(`${col}-${row}`);
    }
  }

  if (isFreeSpin) amount *= CONFIG.bonusWinMultiplier;
  return {
    amount: Math.round(amount * 100) / 100,
    bonusCells,
    winningCells
  };
}

function highlightResults(result) {
  for (const coordinate of result.winningCells) {
    const [col, row] = coordinate.split("-").map(Number);
    state.reelElements[col].track.children[row]?.classList.add("is-winning");
  }
  if (result.bonusCells.length >= CONFIG.bonusSymbolsNeeded) {
    for (const [col, row] of result.bonusCells) {
      state.reelElements[col].track.children[row]?.classList.add("is-bonus-hit");
    }
  }
}

/*
  Ogni rullo passa realmente attraverso vari simboli in un elemento più alto
  della finestra. Una transizione CSS lo sposta fino ai 4 simboli finali.
*/
function animateReel(columnIndex, finalColumn) {
  const { windowElement, track } = state.reelElements[columnIndex];
  const filler = Array.from({ length: 18 + columnIndex * 2 }, randomSymbol);
  const sequence = [...state.grid[columnIndex], ...filler, ...finalColumn];
  const cellHeight = windowElement.clientHeight / CONFIG.rows;
  const distance = (CONFIG.rows + filler.length) * cellHeight;
  const delay = columnIndex * CONFIG.staggerMs;
  const duration = CONFIG.spinDurationMs + columnIndex * 190;

  windowElement.classList.add("is-spinning");
  track.style.transition = "none";
  track.style.transform = "translateY(0px)";
  track.innerHTML = sequence.map(symbolHtml).join("");

  return new Promise(resolve => {
    setTimeout(() => {
      track.style.transition = `transform ${duration}ms cubic-bezier(.15,.68,.18,1)`;
      track.style.transform = `translateY(-${distance}px)`;
    }, 65 + delay);
    setTimeout(() => {
      windowElement.classList.remove("is-spinning");
      track.style.transition = "none";
      track.style.transform = "translateY(0px)";
      track.innerHTML = finalColumn.map(symbolHtml).join("");
      resolve();
    }, 65 + delay + duration + 90);
  });
}

function forceThreeBonus(grid) {
  // Pulsante di test: posiziona 3 BONUS in 3 colonne diverse.
  // Serve solo per verificare l'animazione: non altera le altre probabilità.
  for (const col of [0, 2, 4]) {
    const row = Math.floor(Math.random() * CONFIG.rows);
    grid[col][row] = SPECIAL.BONUS;
  }
}

// Test del volto: 4 simboli consecutivi sulla prima riga.
// Permette di vedere subito l'animazione di vincita, senza aspettare la fortuna.
function forcePortraitWin(grid) {
  for (let col = 0; col < 4; col++) grid[col][0] = CONFIG.portraitSymbolId;
  grid[4][0] = "A"; // blocca la combinazione a 4 simboli
}

async function spin(testBonus = false, testPortrait = false) {
  if (state.busy || !ui.modal.classList.contains("is-hidden") || !ui.portraitPreview.classList.contains("is-hidden")) return;

  const isFreeSpin = state.freeSpins > 0;
  if (!isFreeSpin && state.credits < CONFIG.bet) {
    showStatus("Crediti virtuali esauriti. Premi RICOMINCIA.");
    return;
  }

  state.busy = true;
  state.lastWin = 0;
  if (isFreeSpin) state.freeSpins--;
  else state.credits = Math.round((state.credits - CONFIG.bet) * 100) / 100;
  updateUi();
  showStatus(isFreeSpin ? "🎁 Giro gratuito in corso…" : "🎰 I sei rulli stanno girando…");

  const nextGrid = randomGrid();
  if (testBonus && !isFreeSpin) forceThreeBonus(nextGrid);
  if (testPortrait && !isFreeSpin) forcePortraitWin(nextGrid);

  await Promise.all(nextGrid.map((column, index) => animateReel(index, column)));
  state.grid = nextGrid;

  const result = evaluateWins(nextGrid, isFreeSpin);
  state.lastWin = result.amount;
  state.credits = Math.round((state.credits + result.amount) * 100) / 100;
  highlightResults(result);

  const hasBonus = result.bonusCells.length >= CONFIG.bonusSymbolsNeeded;
  if (hasBonus) {
    const extraSpins = isFreeSpin ? CONFIG.bonusRetriggerSpins : CONFIG.freeSpinsAward;
    state.freeSpins += extraSpins;
    state.bonusMode = true;
    showStatus(`🎁 ${result.bonusCells.length} BONUS! Hai ottenuto ${extraSpins} giri gratuiti!`, true);
    addConfetti(70);
    if (!isFreeSpin) {
      showModal({
        icon: "🎁",
        eyebrow: "BONUS ATTIVATO",
        title: `${extraSpins} GIRI GRATIS!`,
        description: `Hai trovato ${result.bonusCells.length} BONUS! Le vincite delle linee durante i giri gratuiti saranno moltiplicate ×${CONFIG.bonusWinMultiplier}.`,
        button: "INIZIA BONUS"
      });
    }
  } else if (result.amount > 0) {
    showStatus(`✨ VINCITA! +${money(result.amount)} crediti${isFreeSpin ? " (moltiplicatore bonus attivo)" : ""}`, true);
    addConfetti(30);
  } else {
    showStatus(isFreeSpin ? "Giro gratuito terminato. Premi per il prossimo giro." : "Nessuna linea vincente. Riprova!");
  }

  if (isFreeSpin && state.freeSpins === 0) {
    state.bonusMode = false;
    showModal({
      icon: "🏆",
      eyebrow: "BONUS TERMINATO",
      title: "GIRI COMPLETATI!",
      description: `Hai terminato i giri gratuiti. Il tuo saldo attuale è di ${money(state.credits)} crediti virtuali.`,
      button: "TORNA AL GIOCO"
    });
  }

  state.busy = false;
  updateUi();
}

function resetGame() {
  if (state.busy) return;
  state.credits = CONFIG.startingCredits;
  state.lastWin = 0;
  state.freeSpins = 0;
  state.bonusMode = false;
  state.grid = randomGrid();
  ui.confetti.replaceChildren();
  ui.frame.classList.remove("is-celebrating");
  closeModal();
  makeReels();
  updateUi();
  showStatus("Nuova partita demo pronta! Raccogli 3 BONUS per 5 giri gratis.");
}

ui.spin.addEventListener("click", () => spin(false));
ui.test.addEventListener("click", () => spin(true));
ui.testPortrait.addEventListener("click", () => spin(false, true));
ui.reset.addEventListener("click", resetGame);
ui.modalButton.addEventListener("click", closeModal);

// ANTEPRIMA FACCE: mostra i fotogrammi più grandi, anche senza un giro.
function openPortraitPreview() {
  if (state.busy || !ui.modal.classList.contains("is-hidden")) return;
  ui.portraitPreviewTarget.innerHTML = symbolHtml(CONFIG.portraitSymbolId);
  ui.portraitPreviewTarget.querySelector(".symbol")?.classList.add("is-winning");
  ui.portraitPreview.classList.remove("is-hidden");
  ui.portraitPreview.setAttribute("aria-hidden", "false");
  ui.closePortraitPreview.focus();
}
function closePortraitPreview() {
  ui.portraitPreview.classList.add("is-hidden");
  ui.portraitPreview.setAttribute("aria-hidden", "true");
  ui.portraitPreviewTarget.replaceChildren();
  ui.previewPortrait.focus();
}
ui.previewPortrait.addEventListener("click", openPortraitPreview);
ui.closePortraitPreview.addEventListener("click", closePortraitPreview);
ui.portraitPreview.addEventListener("click", event => {
  if (event.target === ui.portraitPreview) closePortraitPreview();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !ui.portraitPreview.classList.contains("is-hidden")) closePortraitPreview();
});

// Avvio della demo
state.grid = randomGrid();
makeReels();
updateUi();
