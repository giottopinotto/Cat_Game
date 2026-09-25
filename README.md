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
- 📍 **Posizione solo per le foto** (attiva di base): il GPS si accende solo nella fotocamera e si spegne
  uscendo, quindi i tuoi spostamenti non vengono seguiti, e la mappa non mostra animali né zone. Attivando il
  GPS dal profilo si vedono animali e zone e contano km e zone esplorate.
- 🏠 **Zona privata di casa**: vicino a casa le catture non salvano la posizione precisa, solo una zona
  con il centro spostato a caso. Anche le zone esplorate lì non vengono segnate.
- 🤝 **Amici senza server**: ci si aggiunge di persona con un QR code; poi gli aggiornamenti (livello,
  medaglie, collezione) si mandano con un link in chat. I dati stanno dopo il `#` del link, che il browser
  non invia a nessun sito, e sono firmati dal telefono (ECDSA): nessuno può spacciarsi per un amico.
  Mai posizioni, foto, date od orari. Classifica e confronto dell'album.
- 🎉 **Eventi a tempo** (Giornata degli animali, Halloween, Natale, domeniche al parco...) con XP extra.
- 📅 **Diario** delle uscite: calendario con animali visti e km fatti ogni giorno.
- ✨ **Grafica**: carte con effetti per rarità (onde, stelle, brillantini d'oro), mirino a zampette,
  mappa con stagioni, ora del giorno ed eventi (foglie, neve, lucciole, pipistrelli ad Halloween),
  album a figurine, fuochi d'artificio a zampetta, **un premio per ogni livello** (33 avatar, cornici,
  sfondi e pacchetti delle carte) e
  **8 colori a scelta** (lilla di base). Gli effetti si spengono dal profilo o con "riduci animazioni".
- 🌙 **Tema scuro** la sera (o sempre), **suoni** e vibrazioni disattivabili, **promemoria del backup**.
- 📱 **Installabile** sulla schermata Home (Android e iPhone). Dopo il primo utilizzo si può catturare
  anche senza connessione (la mappa mostra solo le zone già viste).

## Regole d'oro

Il gioco lo ricorda subito: non disturbare né inseguire gli animali, chiedi al padrone prima di
fotografare il suo cane, guarda la strada e non lo schermo, non entrare in proprietà private.

## Metterlo online (gratis)

L'app è un sito statico: basta pubblicare la cartella `dist/`. La fotocamera e il GPS funzionano solo su
**https**.

### Con GitHub Pages (repository pubblico)

1. *Settings → General → Danger Zone → Change visibility → Make public*.
2. *Settings → Pages*, alla voce **Source** scegli **GitHub Actions**.
3. A ogni modifica del ramo `main` il workflow `.github/workflows/deploy.yml` esegue i test, compila e
   pubblica il sito su `https://<utente>.github.io/Cat_Game/`.

### Con Netlify (gratis, anche con repository privato)

1. Crea un account gratuito su [netlify.com](https://www.netlify.com) scegliendo **Sign up with GitHub**.
2. **Add new project → Import an existing project → GitHub**, autorizza Netlify e scegli `Cat_Game`
   (se non compare, usa *Configure the Netlify app on GitHub* e dagli accesso al repository).
3. Le impostazioni di build vengono lette da `netlify.toml`: premi **Deploy**.
4. Ogni volta che il ramo `main` cambia, Netlify ripubblica il sito da solo.

In alternativa vanno bene anche Vercel o Cloudflare Pages: comando `npm run build`, cartella `dist`.

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
| `public/models` | Modelli AI (EfficientDet-Lite0, EfficientNet-Lite0, DeepLab v3, formato TFLite) |
| `eval` | Strumento per misurare la precisione del riconoscimento su immagini di esempio |

### Come funziona il riconoscimento

1. **Allo scatto** si prendono 3 fotogrammi in rapida successione e si tiene il più nitido; se la foto è
   comunque mossa, o l'animale è piccolo, l'app lo segnala (e propone lo zoom, se il telefono lo ha).
2. **EfficientDet-Lite0** trova cani e gatti nell'inquadratura (anche dal vivo, per il mirino).
3. **EfficientNet-Lite0** (ImageNet, precisione piena) classifica l'animale guardandolo in tre modi
   (ritaglio stretto, largo e specchiato) e fa la media. Le probabilità vengono pesate per quanto ogni
   razza è comune per strada in Italia, così nel dubbio vince la razza più probabile.
4. Se la razza è incerta si propone **Meticcio**. Per i gatti europei **DeepLab v3** ritaglia la sagoma
   esatta del gatto e il **mantello** si stima solo dai colori del pelo, senza lo sfondo.

Su 123 immagini di esempio (una per razza) la specie è giusta nel 99% dei casi, la razza proposta nell'83%
e la razza giusta compare tra i suggerimenti nel 96%. La prima volta l'app scarica circa 35 MB di modelli,
poi restano sul telefono.

## Crediti e licenze

- Mappa: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, stile
  [OpenFreeMap](https://openfreemap.org).
- Riconoscimento: [MediaPipe](https://developers.google.com/mediapipe) Tasks Vision e modelli
  EfficientDet-Lite0 / EfficientNet-Lite0 / DeepLab v3 (Apache 2.0).
- Mappa interattiva: [MapLibre GL JS](https://maplibre.org) (BSD-3-Clause).
- Carattere: Fredoka (SIL Open Font License). Icone: Lucide (ISC).
- QR code: [uqr](https://github.com/unjs/uqr) (MIT) e [jsQR](https://github.com/cozmo/jsQR) (Apache 2.0).
