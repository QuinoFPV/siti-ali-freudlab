# Siti ALI Milano e Laboratorio freudiano

Un unico progetto per i due siti, senza WordPress:

- **ALI Milano** – Associazione lacaniana internazionale Milano (`siti/ali-milano`)
- **Laboratorio freudiano Milano** – Freudlab (`siti/freudlab`)

Le pagine sono generate con [Astro](https://astro.build) a partire da semplici file di testo.
Entrambi i siti si modificano da **un solo pannello** ([Sveltia CMS](https://github.com/sveltia/sveltia-cms)) all'indirizzo `/admin/`.

> È una **demo**: i contenuti sono stati importati da ali-milano.it e freudlab.it il 29 ottobre 2026.
> Durante l'importazione sono stati esclusi i link pubblicitari nascosti (spam) trovati su freudlab.it.
> Le anteprime non vengono indicizzate da Google (`noindex`).

## Contenuti condivisi

Appuntamenti, pubblicazioni e documenti stanno in un archivio comune (`contenuti/`).
Ognuno ha il campo **Pubblica su**: ALI Milano, Freudlab o entrambi.
Un seminario comune si inserisce quindi una volta sola e compare su tutti e due i siti.

Pagine fisse e impostazioni (home, contatti, soci, docenti, video) sono invece di ciascun sito.

## Come si modificano i contenuti

### Dal pannello (consigliato)

1. Apri `/admin/` su uno dei due siti: il pannello è lo stesso.
2. Accedi:
   - **Accedi con Token di Accesso**: incolla un token personale di GitHub (vedi sotto).
   - **Lavora con Repository Locale** (solo Chrome o Edge, sul tuo computer): scegli la cartella `siti-ali-freudlab`.
3. Scegli la sezione:
   - **Appuntamenti**, **Pubblicazioni**, **Documenti**: comuni ai due siti;
   - **ALI Milano · Pagine / Impostazioni**;
   - **Freudlab · Pagine / Impostazioni**.
4. Compila il modulo e premi **Salva**. Dopo 1–2 minuti i siti si aggiornano da soli.

**Token personale (una volta sola):** su GitHub vai in *Settings → Developer settings → Personal access tokens → Fine-grained tokens*.
Come repository scegli solo `siti-ali-freudlab`. In *Permissions → Contents* scegli **Read and write**.
I collaboratori invitati sul repository usano invece un token "classico" con il permesso `public_repo`.

### Chiedendo a Claude

Apri questa cartella con Claude Code e chiedi, per esempio: *"aggiungi il seminario del 14 febbraio alle 10 in sede, su tutti e due i siti, locandina allegata"*.

## Dove stanno i file

| Cartella | Cosa contiene |
|---|---|
| `contenuti/eventi/` | Un file per ogni appuntamento (comune) |
| `contenuti/pubblicazioni/` | Libri, articoli, seminari, dossier, editoriali (comune) |
| `contenuti/documenti/` | PDF da scaricare, con la loro descrizione (comune) |
| `contenuti/ali-milano/` | Pagine e impostazioni di ALI Milano |
| `contenuti/freudlab/` | Pagine e impostazioni del Laboratorio freudiano |
| `pubblico/uploads/` | Immagini e PDF (`uploads/freudlab/` per quelli di Freudlab) |
| `pubblico/admin/config.yml` | Configurazione del pannello: sezioni e campi |
| `siti/ali-milano/`, `siti/freudlab/` | Grafica e pagine di ciascun sito |
| `condiviso/` | Parti comuni: calendario, elenchi degli eventi, modulo contatti, stili di base |

## Lavorare sul computer

Serve [Node.js](https://nodejs.org) 22 o più recente.

```bash
npm install
npm run dev            # ALI Milano su http://localhost:4321
npm run dev:freudlab   # Freudlab su http://localhost:4322
```

In locale il pannello è su `http://localhost:4321/admin/index.html`.

```bash
npm run build
```

Questo comando genera i due siti in `dist/ali-milano/` e `dist/freudlab/`, pronti da caricare su qualsiasi hosting.

## Pubblicazione

- **Anteprima:** a ogni modifica sul ramo `main`, GitHub Actions ricostruisce i due siti e li pubblica su GitHub Pages (`.github/workflows/anteprima.yml`), in `…/ali-milano/` e `…/freudlab/`. Lo fa anche ogni notte, così gli appuntamenti passati escono da soli dalle home.
- **Siti veri (in futuro):** `dist/ali-milano/` va via FTP su ali-milano.it e `dist/freudlab/` su freudlab.it, con un passaggio in più nello stesso workflow. Sull'hosting non si installa nulla.

## Importare di nuovo da WordPress

```bash
npm run importa -- https://ali-milano.it ali-milano
npm run importa -- https://freudlab.it freudlab
```

Lo script scarica pubblicazioni, eventi e immagini dall'API pubblica di WordPress.
Se un contenuto esiste già (stesso titolo e stessa data) non lo duplica: gli aggiunge solo il sito.
Scarta i link pubblicitari nascosti. Le pagine fisse finiscono in `contenuti/<sito>/pagine-importate` e vanno riviste a mano.

## Manutenzione

- 1–2 volte l'anno aggiornare le dipendenze (`npm outdated`, poi `npm update`) e controllare che `npm run build` funzioni.
- La versione del pannello è fissata in `pubblico/admin/index.html` (`@sveltia/cms@…`): si aggiorna cambiando quel numero.
