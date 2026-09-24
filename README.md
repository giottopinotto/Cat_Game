# 🐾 Zampe in Giro

Un gioco per il telefono in stile Pokémon Go, ma **con i cani e i gatti veri**: vai in giro, e quando
incontri un animale lo "catturi" scattandogli una foto. L'intelligenza artificiale capisce se è un cane
o un gatto, propone la razza (o il mantello, per i gatti) e l'animale diventa una **carta** della tua
collezione.

Tutto è **gratuito**: niente server, niente chiavi a pagamento. Il riconoscimento avviene sul telefono
e i dati restano sul telefono.

## Cosa c'è nel gioco

- 🗺️ **Mappa reale** (OpenStreetMap) con la tua posizione GPS, gli animali che hai trovato e le zone
  esplorate (esagoni colorati).
- 📸 **Cattura con la fotocamera**: il mirino aggancia il cane o il gatto in tempo reale. Non si
  possono usare foto dalla galleria e serve la posizione GPS.
- 🤖 **Riconoscimento sul telefono**: cane o gatto, più di 100 razze canine, 10 mantelli di gatto
  europeo e 19 razze feline. Puoi sempre correggere quello che propone.
- 🃏 **Carte** con rarità (Comune → Leggendario), Punti Zampa (PZ) e statistiche. Gli animali con gli
  occhi di due colori salgono di rarità.
- 📖 **Album** con 139 voci per i cani (138 razze più il meticcio) e 29 per i gatti (10 mantelli e 19
  razze), ognuna con una curiosità.
- 💞 **Amicizia**: rivedere lo stesso animale in giorni diversi fa crescere l'amicizia e i suoi PZ.
  L'app ti avvisa quando passi vicino a un animale che conosci già.
- 🎯 **3 sfide al giorno** (catture, passi, esplorazione, parchi...) con bonus se le completi tutte.
- 🏅 **11 medaglie** in bronzo, argento e oro, **50 livelli** con titoli e punti esperienza.
- 👟 **Km a piedi e zone esplorate**: gli spostamenti in auto o in bus non valgono.
- 💾 **Backup** su file e ripristino (utile se cambi telefono), **condivisione** della carta come
  immagine.
- 📱 **Installabile** sulla schermata Home (Android e iPhone). Dopo il primo utilizzo si può catturare
  anche senza connessione (la mappa mostra solo le zone già viste).

## Regole d'oro

Il gioco lo ricorda subito: non disturbare né inseguire gli animali, chiedi al padrone prima di
fotografare il suo cane, guarda la strada e non lo schermo, non entrare in proprietà private.

## Metterlo online (gratis)

L'app è un sito statico: basta pubblicare la cartella `dist/`. La fotocamera e il GPS funzionano solo su
**https**.

### Con Netlify (gratis, anche con repository privato)

1. Crea un account gratuito su [netlify.com](https://www.netlify.com) scegliendo **Sign up with GitHub**.
2. **Add new project → Import an existing project → GitHub**, autorizza Netlify e scegli `Cat_Game`
   (se non compare, usa *Configure the Netlify app on GitHub* e dagli accesso al repository).
3. Le impostazioni di build vengono lette da `netlify.toml`: premi **Deploy**.
4. Ogni volta che il ramo `main` cambia, Netlify ripubblica il sito da solo.

In alternativa vanno bene anche Vercel o Cloudflare Pages: comando `npm run build`, cartella `dist`.

Il workflow `.github/workflows/test.yml` esegue test e build a ogni modifica.

## Sviluppo

Serve Node.js 22.

```bash
npm install       # installa le dipendenze e copia il runtime della AI in public/mediapipe
npm run dev       # server di sviluppo su http://localhost:5173
npm test          # test automatici (logica di gioco, dati, mantelli)
npm run build     # versione di produzione in dist/
```

Per provare dal telefono durante lo sviluppo serve https (per esempio `npx vite --host` con un tunnel
https), perché i browser danno accesso a fotocamera e GPS solo su connessioni sicure.

### Struttura

| Cartella | Contenuto |
| --- | --- |
| `src/data` | Razze di cani, razze e mantelli dei gatti, rarità, curiosità, nomi |
| `src/vision` | Riconoscimento: rilevatore cani/gatti, classificatore razze, analisi del mantello |
| `src/game` | Regole del gioco: salvataggio (IndexedDB), XP e livelli, sfide, medaglie, GPS |
| `src/map` | Mappa MapLibre, HUD e sfide |
| `src/capture` | Fotocamera, conferma e rivelazione della carta |
| `src/screens` | Collezione, album, scheda animale, profilo, benvenuto |
| `public/models` | Modelli AI (EfficientDet-Lite0 e EfficientNet-Lite0, formato TFLite int8) |
| `eval` | Strumento per misurare la precisione del riconoscimento su immagini di esempio |

### Come funziona il riconoscimento

1. **EfficientDet-Lite0** trova cani e gatti nell'inquadratura (anche dal vivo, per il mirino).
2. **EfficientNet-Lite0** (ImageNet) classifica il ritaglio dell'animale fra 118 razze canine e 5 tipi di
   gatto. Le probabilità vengono pesate per quanto ogni razza è comune per strada in Italia, così nel
   dubbio vince la razza più probabile (un Labrador, non un raro Flat-coated retriever).
3. Se la razza è incerta si propone **Meticcio**. Per i gatti europei il **mantello** si stima dai
   colori dei pixel al centro dell'animale.

Su 123 immagini di esempio (una per razza) la specie è giusta nel 99% dei casi, la razza proposta nel
78% e la razza giusta compare tra i suggerimenti nel 92%.

## Crediti e licenze

- Mappa: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, stile
  [OpenFreeMap](https://openfreemap.org). Nomi dei luoghi: Nominatim.
- Riconoscimento: [MediaPipe](https://developers.google.com/mediapipe) Tasks Vision e modelli
  EfficientDet-Lite0 / EfficientNet-Lite0 (Apache 2.0).
- Mappa interattiva: [MapLibre GL JS](https://maplibre.org) (BSD-3-Clause).
- Carattere: Fredoka (SIL Open Font License). Icone: Lucide (ISC).
