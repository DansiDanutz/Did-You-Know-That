# Children's first names: sources and method

`names.json` lists popular first names for children aged about 6–12 in 2026, which means birth years 2014–2020. It was compiled on 2026-10-09. Every name comes from a source that was opened during that session with `curl` (via WebFetch only where noted). No names were filled in from memory.

## Shared method

- Where a source gives counts for several years, the counts for 2014–2020 were added up and the names ranked by the total. Where it gives only ranks, the ranks were turned into points and added up.
- About 50 boys and 50 girls per language. In `names` the two lists alternate (boy, girl, boy, girl ...).
- Duplicates are removed ignoring case, across both sexes. A unisex name such as Charlie or Eden appears once.
- Every entry is one first name: no surnames, no spaces.
- Data published as newborn names in a given year is used directly as current ages. Children born 2014–2020 are 6–12 in 2026.

## en: English (100)

| | |
|---|---|
| Dataset 1 | ONS, "Baby names in England and Wales: 1996 to 2025" (`babynames1996to2025.xlsx`, Table 1 girls, Table 2 boys) |
| URL | https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/datasets/babynamesinenglandandwalesfrom1996 |
| Dataset 2 | SSA national baby names data, `names.zip` (`yob2014.txt` to `yob2020.txt`) |
| URL | https://www.ssa.gov/oact/babynames/names.zip |
| Years | 2014–2020 |
| Official | Yes (both) |
| Opened | curl. ssa.gov returned HTTP 403 to both curl and WebFetch, so the file was downloaded from the Internet Archive copy: `https://web.archive.org/web/20250101212410id_/https://www.ssa.gov/oact/babynames/names.zip`. That copy is the unchanged official file. |

**Merge:** each source was summed separately over 2014–2020. Names were then taken from the two ranked lists in turn (ONS #1, SSA #1, ONS #2 ...) until there were 50 unique names per sex.

**Caveats:**
- ONS ranks exact spellings, so Muhammad and Mohammed both appear.
- Neither source covers Scotland, Northern Ireland or other English-speaking countries.

## ro: Romanian (100)

| | |
|---|---|
| Source 1 | National 2016 newborn names from Evidența Populației (DEPABD) data. Opened only as a press report: Alba24, citing Digi24, 27 Jan 2017 |
| URL | https://alba24.ro/topul-numelor-preferate-de-parinti-pentru-copiii-lor-in-2016-cele-mai-populare-nume-la-baieti-si-fete-544999.html |
| Official | No. It is a press report of official figures. |
| Source 2 | Agenția Servicii Publice, Republic of Moldova: "Raport statistic privind cel mai frecvent prenume masculin / feminin al copiilor nou-născuți" |
| URLs | https://dataset.gov.md/dataset/16943-raport-statistic-privind-cel-mai-frecvent-prenume-masculin-al-copiilor-nou-nascuti and https://dataset.gov.md/dataset/16944-raport-statistic-privind-cel-mai-frecvent-prenume-feminin-al-copiilor-nou-nascuti |
| Years | 2016–2020 (top 100 for 2016–2017, top 20 for 2018–2020) |
| Official | Yes, but for the **Republic of Moldova**, not Romania |
| Opened | curl (PDF via pdftotext, DOCX and XLSX parsed) |

**Merge:** the 16 names from the DEPABD 2016 report come first, 8 boys and 8 girls. The list is then filled up to 50 per sex from the Moldova counts, summed over 2016–2020. The Moldova files use the cedilla letters ş and ţ; these were changed to the standard Romanian comma-below letters ș and ț.

**Caveats. This is the weakest list:**
- No openable official national ranking for Romania exists for 2014–2020. The DEPABD/DGEP site (depabd.mai.gov.ro) was checked; its press releases cover name days and birthday statistics, not newborn name rankings. INS publishes no first-name statistics.
- The only national Romanian figures that could be opened were the 2016 top names in a press report. A Digi24 article was also opened, but it covers 2012 and was not used. A ProTV article covers 2025 and was not used.
- The Moldova names include Russian-language forms (Artiom, Alexandr, Nichita, Daniil, Serghei, Vladislav, Egor, Matvei and others) that are uncommon in Romania. Review or prune them before use with Romanian children.

## es: Spanish (100)

| | |
|---|---|
| Dataset | INE, "Nombres de los recién nacidos": Nacimientos según el nombre del nacido, sheet "TOTAL" (top 100 nationally), files `nomnac14.xlsx` to `nomnac20.xlsx` |
| URL | https://www.ine.es/daco/daco42/nombyapel/nombyapel2.htm (files at `https://www.ine.es/daco/daco42/nombyapel/nomnacYY.xlsx`) |
| Years | 2014–2020 (2020 data is provisional) |
| Official | Yes |
| Opened | curl |

**Merge:** the yearly top-100 counts were summed and the top 50 per sex kept.

**Caveats:**
- INE publishes names in capitals without accents (LUCIA, MARTIN). Standard Spanish accents were added back: Lucía, María, Sofía, Inés, Rocío, Ángela, Martín, Álvaro, Adrián, Nicolás, Ángel, José, Héctor, Iván, Darío, Víctor, Rubén, Jesús, Raúl. "Alex" was left as INE writes it.
- A name outside a year's top 100 adds nothing for that year. This does not affect the top 50.

## fr: French (100)

| | |
|---|---|
| Dataset | Insee, "Fichier des prénoms", 2025 edition, national file `prenoms-2025-nat.csv` (from `prenoms-2025-nat_csv.zip`) |
| URL | https://www.insee.fr/fr/statistiques/8595130 |
| Years | 2014–2020 |
| Official | Yes |
| Opened | curl |

**Merge:** counts were summed over 2014–2020, the top 55 per sex taken, and the first 50 unique per sex kept. The capitalised Insee spelling was converted to normal case, keeping accents (LÉO → Léo, MAËLYS → Maëlys).

**Caveats:**
- Insee counts exact spellings, so Léo and Leo are separate names.
- The file covers France, not other French-speaking countries.

## de: German (100)

| | |
|---|---|
| Source 1 | GfdS, "Die beliebtesten Vornamen", detailed evaluations for 2014–2020 ("ausführliche Auswertung") |
| URLs | https://gfds.de/vornamen/beliebteste-vornamen/, plus per year, e.g. https://gfds.de/ausfuehrliche-auswertung-die-beliebtesten-vornamen-2014/ ... https://gfds.de/ausfuehrliche-auswertung-vornamen-2020/ |
| Official | No. Germany has no national official first-name statistic, and GfdS is the recognised non-official source. |
| Source 2 | Knud Bielefeld, beliebte-vornamen.de, "Die beliebtesten Vornamen des Jahres 2014–2020" (top 50 for 2014–2018, top 10 for 2019–2020) |
| URL | https://www.beliebte-vornamen.de/jahrgang/j2014 ... /j2020 |
| Official | No. It is a representative sample. |
| Years | 2014–2020 |
| Opened | curl |

**Merge:**
- From the GfdS pages: the national overall list (top 10), the national first-name list (top 10–15), and the regional overall and first-name lists (North/South/East/West, top 10). Middle-name lists and the Turkish comparison tables were left out.
- GfdS groups spelling variants (Sophie/Sofie, Louis/Luis). Each group is spelled the way it ranks highest on the Bielefeld list.
- This gave 23 boys and 27 girls. Bielefeld's 2014–2020 ranking filled the rest up to 50 per sex.

**Caveats:**
- The free GfdS pages show only short top lists. About half of each sex comes from Bielefeld.

## it: Italian (100)

| | |
|---|---|
| Dataset | Istat "Conta nomi" (survey "Iscritti in anagrafe per nascita"), yearly rankings from the calculator's web service `https://www.istat.it/wp-content/themes/EGPbs5-child/contanomi/nati/index2022.php?type=list&limit=100&year=YYYY` |
| URL | https://www.istat.it/dati/calcolatori/contanomi/ |
| Years | 2014–2020 (top 100 per sex per year) |
| Official | Yes |
| Opened | curl |

**Merge:** counts were summed and the top 50 per sex kept.

**Caveats:**
- Istat writes accents as apostrophes ("Nicolo'"). These were changed to Nicolò.
- Istat notes that it does not correct spelling errors in names.

## zh: Simplified Chinese (34)

| | |
|---|---|
| Source 1 | 公安部户政管理研究中心《二〇二〇年全国姓名报告》 (top 10 boys' and girls' names for 2020 newborns) |
| URL | https://www.mps.gov.cn/n2254314/n6409334/c7726021/content.html |
| Official | Yes |
| Opened | curl. mps.gov.cn returned HTTP 521 to both curl and WebFetch, so the page was read from the Internet Archive snapshot `https://web.archive.org/web/20210208085342id_/...` (taken the day it was published). |
| Source 2 | MPS 2019 report: top 10 boys and girls, reprinted by 中国日报网 |
| URL | https://cn.chinadaily.com.cn/a/202001/20/WS5e253701a3107bb6b579af3d.html |
| Official | No (reprint of official MPS data) |
| Source 3 | MPS 2018 report (the first one): top 10 boys, top 10 girls and top 20 overall, reprinted by 中国日报网 / 中国新闻网 |
| URL | https://cn.chinadaily.com.cn/a/201901/30/WS5c516020a31010568bdc7870.html |
| Official | No (reprint of official MPS data) |
| Opened | curl |
| Years | 2018–2020 |

**Merge:** the boys' and girls' top 10s for 2020, 2019 and 2018 were combined in that order and duplicates removed. The two names that appear only in the 2018 overall top 20, 子涵 and 子萱, were added at the end. All entries are given names only, with no surname.

**Caveats:**
- The ministry publishes only a top 10 per sex each year, so 34 names is all that official data supports. There is no official data for 2014–2017.
- Archived copies of the 2019 and 2021 reports on mps.gov.cn could not be retrieved, so 2019 relies on the China Daily reprint. The 2021 report covers children who are too young.
- The decade table (Table 4) is an image and could not be retrieved.
- Chinese given names are often shared by boys and girls (梓涵, 子涵).

## Editorial pruning (ro)

After compilation, 24 Russian-language forms from the Moldovan lists that are uncommon in Romania were removed before recording (Artiom, Nichita, Alexandr, Arina, Alisa, Xenia, Damir, Vladislav, Nikita, Daniil, Serghei, Polina, Dmitrii, Stanislav, Elizaveta, Timur, Chiril, Matvei, Egor, Alexei, Iana, Ivan, Anna, Nicolai). No names were added in their place, so the Romanian list has 76 names. A child whose name is not recorded is still greeted by name in text, and Dexter's voice says the generic greeting.

## Recording QA (2026-10-09)

The first recording run left 346 of 616 clips (mostly fr, it, es, ro) with invented speech after the name. The longest ran 5 s, and transcripts showed babble. `tools/make-name-voice.mjs` now passes the following greeting line as unspoken context (`next_text`), which stopped the extra speech in tests. Those 346 clips were re-recorded. Every clip is now 0.6–2.1 s (median about 1 s), short enough for a greeting and a name only. A local Whisper (base) check is unreliable on clips under about 1 s. A person should still spot-check a sample of clips in each language by ear.
