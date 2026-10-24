# Manuale del Loudness Target Calculator

Il Loudness Target Calculator ti dice il **gain in dB** necessario per portare un file a un target di loudness, con un **controllo del true peak**. È una web app (PWA) gratuita di OnAir Garage che funziona offline dopo la prima visita e misura i file nel tuo browser: non si carica nulla.

## Aprire e installare

Apri il calcolatore su `https://onairgarage.com/apps/loudness-calculator/` (la pagina dello strumento è `https://onairgarage.com/tools/loudness-calculator/`). Per usarlo non si installa nulla. Puoi anche installarlo come app:

- **Chrome, Edge e altri browser Chromium**: premi il pulsante *Installa app* in alto.
- **iPhone e iPad (Safari)**: tocca il pulsante Condividi, poi «Aggiungi alla schermata Home».
- **Safari su Mac**: menu File, poi «Aggiungi al Dock».

Una volta installato funziona offline. L'app si apre sempre in inglese; cambia lingua nell'intestazione (English, Italiano, Español) e la scelta viene ricordata sul dispositivo. Il tema può essere chiaro, scuro o seguire il sistema.

## Usare il calcolatore

1. Inserisci il **Loudness integrato** del file in LUFS, misurato da un qualsiasi misuratore ITU-R BS.1770 (un valore tra −70 e 0). Da telefono puoi scriverlo senza il segno meno: `18.4` vale −18,4, perché il loudness non è mai positivo.
2. Facoltativamente inserisci il **True peak** in dBTP (tra −70 e +12). Usa il pulsante ± per cambiare segno.
3. Scegli lo **Standard di destinazione** dall'elenco (Broadcast, Streaming, Podcast, Altro), oppure **Personalizzato…** per dare un tuo **Target personalizzato** e un tuo **Limite true peak personalizzato** (lascia vuoto il limite per nessun limite).
4. Leggi il risultato. La cifra grande è il **Gain da applicare** = target − loudness misurato, in dB. Sotto vedi l'**Ingresso**, il **Target**, il loudness **Risultato** e il **True peak risultante** (il true peak misurato più il gain).

Se il gain porta il true peak oltre il limite dello standard, compare un **avviso** («True peak oltre il limite») insieme al gain massimo che puoi applicare senza un limiter. Se il file è già entro la tolleranza dello standard, il gain è facoltativo, e se non hai inserito il true peak il controllo del clipping viene saltato.

## La scala

La scala mostra **IN** (misurato), **TARGET** con la sua fascia di tolleranza, **OUT** (risultato dopo il gain) e **MAX** (il loudness massimo raggiungibile sotto il limite di picco). È centrata sul target e funziona come una rotella: trascinala a sinistra o a destra (funzionano anche la rotella del mouse e le frecce) per cambiare il target. Resta bloccata finché è selezionato uno standard predefinito; l'interruttore del lucchetto la sblocca e passa a Personalizzato, e scegliere Personalizzato la sblocca automaticamente. I segnalini fuori dall'intervallo visibile si attaccano al bordo con una freccia e il loro valore.

## Misura da un file

Se non conosci i valori, premi **Misura da un file** e scegli un file audio. Il loudness e il true peak vengono misurati **nel tuo browser** (il file non lascia mai il tuo computer) e copiati nei campi. La misura è il loudness dell'intero programma (ITU-R BS.1770) senza gating sul dialogo; i limiti sono 800 MB e 90 minuti, e *Metodo, fonti e limiti* ne spiega i dettagli.

## Standard e valori

La tabella elenca i target incorporati. «Ufficiale» significa letto dal documento primario; «Consigliato» significa che non è stata trovata documentazione ufficiale, solo un suggerimento di uso comune, e l'app lo dice. Verificato a settembre 2026.

| Standard | Target | Tolleranza | Limite true peak | Stato |
|---|---|---|---|---|
| EBU R 128 | −23,0 LUFS | ±1,0 LU dove il target non è raggiungibile in pratica (per esempio dirette); ±0,2 LU nel QC | −1 dBTP in produzione | Ufficiale |
| ATSC A/85 | −24 LKFS (senza metadati, senza altri accordi) | circa ±2 dB | sotto −2 dBTP, misurato prima della codifica | Ufficiale |
| Spotify | −14 LUFS | — | −1 dBTP (lossy); −2 dBTP se più forte di −14 LUFS | Ufficiale |
| Apple Podcasts | −16 LKFS | ±1 dB | −1 dB FS (true peak) | Ufficiale |
| BBC | −23 LUFS | ±1 LU | −1 dBTP | Consigliato |
| YouTube | −14 LUFS | — | −1 dBTP | Consigliato |
| Apple Music | −16 LUFS | — | −1 dBTP | Consigliato |
| Amazon Music | −14 LUFS | — | −2 dBTP | Consigliato |

La **Riproduzione sulla piattaforma** mostra il gain che una piattaforma di streaming applicherebbe al tuo file così com'è; dove il comportamento non è documentato ufficialmente l'app lo dice. Un target personalizzato è un tuo valore: nulla viene confrontato con un documento pubblicato.

## Lingua e privacy

Le scelte (lingua, tema) sono conservate solo sul dispositivo. Nessun dato lascia il browser e i font sono serviti in locale. Un piccolo riquadro mancia in fondo alla pagina ha il salvadanaio del sito e un pulsante che apre in una nuova scheda la pagina di sostegno di onairgarage.com nella tua lingua; è l'unico posto, e dentro il calcolatore non viene mai chiesto nulla.

## Aggiornamenti

L'app si aggiorna da sola: quando una nuova versione è pronta, un avviso offre di ricaricare. Ignorarlo lascia semplicemente in funzione la versione attuale.

## Limiti

- Non è un misuratore né uno strumento certificato: la misura da un file è un loudness dell'intero programma senza gating sul dialogo, quindi conferma sempre le consegne importanti con il tuo misuratore BS.1770.
- Il valore del true peak di un file che misuri qui è calcolato nel browser; per una consegna usa le cifre del tuo misuratore.
- I valori degli standard «Consigliati» sono suggerimenti di uso comune, non requisiti pubblicati.

## Risoluzione dei problemi

| Problema | Cosa fare |
|---|---|
| «Inserisci un valore tra −70 e 0 LUFS.» | Il loudness integrato non è mai positivo: controlla il valore (un `18.4` da solo vale −18,4). |
| La misura è fallita | Prova con un file più corto (fino a 90 minuti, 800 MB) o un altro browser; servono Web Audio e Web Worker. |
| Il pulsante *Installa app* non c'è | Il browser potrebbe non offrirlo: su iPhone, iPad e Safari per Mac usa i passi del capitolo Aprire e installare. |
| La scala non si muove | Uno standard predefinito la blocca: sbloccala con l'interruttore del lucchetto, che passa a Personalizzato. |

## Contatti

Graziano Melzi · OnAir Garage — `https://onairgarage.com` — `hello@onairgarage.com`. Pagina dello strumento: `https://onairgarage.com/tools/loudness-calculator/`. Codice sorgente e release: `https://github.com/djgragra/loudness-calculator`. Licenza: MIT © 2026 Graziano Melzi.
