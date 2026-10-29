# ALI Milano – sito demo

Nuova versione del sito dell'Associazione Lacaniana Internazionale Milano, senza WordPress.
Le pagine sono generate con [Astro](https://astro.build) a partire da semplici file di testo.
I contenuti si modificano dal pannello [Sveltia CMS](https://github.com/sveltia/sveltia-cms) all'indirizzo `/admin/`.

> È una **demo**: i contenuti sono stati importati da ali-milano.it il 29 ottobre 2026.
> Google non la indicizza (`noindex`).

## Come si modificano i contenuti

### Dal pannello (consigliato)

1. Apri `https://<indirizzo-del-sito>/admin/`.
2. Accedi:
   - **Sign in Using Access Token**: incolla un token personale di GitHub (vedi sotto). Il token si inserisce una volta sola per ogni browser.
   - **Work with Local Repository** (solo Chrome o Edge, sul tuo computer): scegli la cartella `ali-milano-demo`. Le modifiche finiscono direttamente nei file, senza internet.
3. Scegli la sezione (Appuntamenti, Pubblicazioni, Documenti, Pagine, Impostazioni), compila il modulo e premi **Salva**.
4. Dopo 1–2 minuti il sito si aggiorna da solo.

**Creare il token (una volta sola):** su GitHub vai in *Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token*.
Come *Repository access* scegli solo `ali-milano-demo`. In *Permissions → Contents* scegli **Read and write**.

### Chiedendo a Claude

Apri questa cartella con Claude Code e chiedi, per esempio: *"aggiungi il seminario del 14 febbraio alle 10 in sede, locandina allegata"*.

## Dove stanno i contenuti

| Cartella | Cosa contiene |
|---|---|
| `src/content/eventi/` | Un file per ogni appuntamento |
| `src/content/pubblicazioni/` | Libri, articoli, seminari, dossier |
| `src/content/documenti/` | PDF da scaricare, con la loro descrizione |
| `src/content/pagine/` | Testi delle pagine fisse (chi siamo, statuto…) |
| `src/content/impostazioni/` | Home, contatti, soci, locandine (file JSON) |
| `public/uploads/` | Immagini e PDF |
| `public/admin/config.yml` | Configurazione del pannello: sezioni e campi |

Gli appuntamenti hanno il campo **Pubblica su** (ALI Milano / Freudlab): in futuro lo stesso archivio potrà alimentare entrambi i siti.

## Lavorare sul computer

Serve [Node.js](https://nodejs.org) 22 o più recente.

```bash
npm install
npm run dev
```

Il sito si apre su http://localhost:4321. In locale il pannello è su http://localhost:4321/admin/index.html.

```bash
npm run build
```

Questo comando genera il sito definitivo nella cartella `dist/`, pronta da caricare su qualsiasi hosting.

## Pubblicazione

- **Anteprima:** a ogni modifica sul ramo `main`, GitHub Actions ricostruisce il sito e lo pubblica su GitHub Pages (`.github/workflows/anteprima.yml`). Lo fa anche ogni notte, così gli appuntamenti passati escono da soli dalla home.
- **Sito vero (in futuro):** lo stesso `dist/` si può caricare via FTP sull'hosting attuale, con un passaggio in più nello stesso workflow.

## Importare di nuovo da WordPress

```bash
npm run importa -- https://ali-milano.it ali-milano
```

Lo script scarica pubblicazioni, eventi e immagini dall'API pubblica di WordPress e riscrive i file in `src/content/`.
Funziona anche con Freudlab (`https://freudlab.it freudlab`). Le pagine fisse vanno poi riviste a mano.

## Manutenzione

- 1–2 volte l'anno aggiornare le dipendenze (`npm outdated`, poi `npm update`) e controllare che `npm run build` funzioni.
- La versione del pannello è fissata in `public/admin/index.html` (`@sveltia/cms@…`): si aggiorna cambiando quel numero.
