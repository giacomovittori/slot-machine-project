# TROPICAL REELS — VOLTO ANIMATO (VERSIONE 2)

Questa è una demo HTML/CSS/JavaScript. Non usa denaro reale.

## 1. AVVIA LA SLOT

**Il modo più veloce:** scarica `Tropical_Reels_Volto_Animato_v2.html` e aprilo con doppio clic.
Ha già tutte le immagini incorporate: NON serve Internet, NON devi installare niente.

**Per modificare il codice:** estrai `Tropical_Reels_Volto_Animato_v2_codice.zip`.
Nella cartella `tropical-reels-volto-v2`, apri `index.html` nel browser.
Apri la stessa cartella in Visual Studio Code per cambiare i file.

## 2. COSA È CAMBIATO

- **Dezoom automatico:** ogni simbolo con `kind: "image"` usa `object-fit: contain`, per vedere TUTTA la foto senza ritagliarla.
- **Faccia animata:** il ritratto sbatte le palpebre tramite un fotogramma con occhi chiusi.
- **Espressione vincente:** quando il volto partecipa a una linea vincente, cambia espressione della bocca (fotogramma dedicato), oscilla leggermente e si illumina.
- Pulsante **ANIMA VOLTO**: anteprima grande delle animazioni del viso.
- Pulsante **PROVA VINCITA VOLTO**: crea 4 volti consecutivi sulla prima riga.
- Il BONUS con 3 regali e 5 giri gratuiti è rimasto invariato.

## 3. CAMBIA IL DEZOOM DI DEFAULT PER TUTTE LE FOTO

Apri `game.js` e cerca `IMAGE_DEFAULTS`:

```js
const IMAGE_DEFAULTS = Object.freeze({
  fit: "contain",  // non ritaglia: mostra tutta l'immagine
  zoom: 0.88,     // 0.75 = più piccola, 1 = dimensione piena
  x: 0, y: 0,     // spostamento rispetto al centro, in percentuale
  background: "#213947", // colore dei margini
  idleSeconds: 4.4,
  blinkSeconds: 5.2,
  winSeconds: 1.65
});
```

Da ora in poi tutte le foto che inserisci seguono gli stessi valori.

## 4. CAMBIA SOLO IL RITRATTO

Nell'array `SYMBOLS` di `game.js` trova `RITRATTO`.

```js
{ id: "RITRATTO", label: "VIP", kind: "image", frequency: 4, payout: 2.3,
  image: {
    src: "assets/ritratto.webp",
    blink: "assets/ritratto-blink.webp",
    win: "assets/ritratto-smile.webp",
    zoom: 0.92
  }
},
```

Puoi cambiare `zoom` per questo solo simbolo (per esempio `0.78`),
`x` e `y` per centrarlo e `label` per rinominare il simbolo.
Per il volto ti consiglio `zoom: 0.88` oppure `0.92`.

## 5. AGGIUNGI UNA NUOVA IMMAGINE (SENZA TAGLIARE LA TESTA)

1. Copia la foto nella cartella `assets`, ad esempio `mia-foto.webp`.
2. In `SYMBOLS` sostituisci un simbolo esistente, ad esempio la TIGRE, con:

```js
{ id: "TIGRE", label: "NUOVO", kind: "image", frequency: 4, payout: 2,
  image: { src: "assets/mia-foto.webp" }
},
```

Non devi impostare nessun dezoom: **l'immagine userà IMAGE_DEFAULTS**.
Puoi anche usare PNG e JPG (per esempio `mia-foto.png`).

Se vuoi che il NUOVO volto sbatta gli occhi e sorrida, prepara anche **due fotografie con la stessa inquadratura**:
`mia-foto-occhi-chiusi.webp` e `mia-foto-sorriso.webp`, poi aggiungi:

```js
image: {
  src: "assets/mia-foto.webp",
  blink: "assets/mia-foto-occhi-chiusi.webp",
  win: "assets/mia-foto-sorriso.webp"
}
```

La funzione di inquadratura è universale; **i fotogrammi espressivi non sono creati automaticamente per qualsiasi persona**.
Servono foto coerenti o un sistema di animazione facciale specifico.

## 6. MODIFICA IL BONUS

Sempre in `game.js`, nell'oggetto `CONFIG`:

```js
bonusSymbolsNeeded: 3,   // 3 regali attivano bonus
freeSpinsAward: 5,       // 5 giri gratis
bonusRetriggerSpins: 3,  // +3 giri se ritrovi 3 regali
bonusWinMultiplier: 2    // paga il doppio nei giri gratis
```

## 7. COSA CAMBIARE IN OGNI FILE

- `index.html`: struttura della slot e dei pulsanti.
- `style.css`: colori, layout, animazioni, effetti e CSS delle immagini.
- `game.js`: simboli, immagini, impostazioni, spin e bonus.
- `assets`: foto originale, normale, con occhi chiusi e con sorriso.

Per vedere una modifica salva il file e ricarica la pagina (Ctrl+R / Cmd+R).

## NOTE

- L'animazione del volto è realizzata alternando fotografie manipolate della **stessa immagine**, non con un modello 3D.
- La versione HTML singola incorpora già le foto. Se vuoi sostituirle facilmente, lavora con il progetto ZIP, non con il singolo file.
- Nessuna raccolta dati, connessione o conto in denaro reale.
