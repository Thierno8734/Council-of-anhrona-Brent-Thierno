# Council of Achrona: Starter kit

Starter kit voor challenge 113 van Hack The Future 2026, aangeboden door Roboest.

De Desync heeft de herinneringen en systemen van Achrona versnipperd. Jullie bouwen een **Council**: een zwerm van samenwerkende AI-agenten (Raadsleden) die elk één Rol vertolken, debatteren, verspreide kennis analyseren en samen tot een **Council Verdict** komen: wat is de oorzaak, wat is het herstelplan, welke risico's zijn er.

Deze kit geeft jullie binnen het eerste halfuur een draaiende mini-Council die je live in je browser ziet debatteren. Het echte werk is aan jullie: een **Orchestrator** ontwerpen, het deel van de Council dat beslist welk Raadslid spreekt, met welke vraag en waarom.

## Wat je krijgt op de dag

| Wat | Wanneer | Waar |
|---|---|---|
| Deze repo (GitHub-template) | vooraf | GitHub |
| Teamkaartje: QR-code naar een kant-en-klare `.env` (LLM-toegang tot 18:00, met de MCP-paden van Oracle en Beast Master) | 9:30 | briefing |
| Challenge pack: Rolkaarten + Kennisbronnen (bestanden) | 10:00 | `https://<mcp-host>/pack.zip` |
| MCP-server: één pad per Rol, `https://<mcp-host>/<rol>/mcp` | antwoordt vanaf 10:00 (daarvoor geeft `uv run council` een MCP-fout) | in je `.env` |
| Coaches | de hele dag | in de zaal |

## Vooraf installeren

- Python 3.12 of hoger
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- git en een GitHub-account
- een code-editor

Maak thuis al je repo aan (stap 1–2 hieronder) en draai daarin `uv sync` (en `uv sync --extra devui` als je de DevUI wil). Dan staat alles al geïnstalleerd en verlies je op de dag geen tijd op de wifi.

## Snel starten

1. Klik op **Use this template** en maak een eigen repo aan. Zet die **openbaar**: zo lever je in (zie onderaan).
2. Clone je repo en ga erin staan.
3. Maak je `.env`: gebruik de `.env` van je Teamkaartje, of kopieer het voorbeeld (`copy .env.example .env` op Windows, `cp .env.example .env` op macOS/Linux) en vul `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `MODEL_KLEIN`, `MODEL_GROOT` en de `MCP_<ROL>`-regels in.
4. Open de debatviewer in een tweede terminal:
   ```
   uv run viewer
   ```
5. Start de Council:
   ```
   uv run council
   ```
   In de viewer zie je live wie de Orchestrator aan het woord laat en waarom, wat elk Raadslid zegt, welke Kennisbron het leest en hoeveel tokens het kost.
6. Controleer de uitvoer:
   ```
   uv run validate
   ```
   Groen = `verdict.json` en `trace.json` volgen het schema en komen uit dezelfde run. Groen betekent geldig, nog niet goed: het Verdict van de kit is nog leeg (TODO).

Geen uv? Maak een venv (`python -m venv .venv`, activeer met `.venv\Scripts\activate` op Windows of `source .venv/bin/activate`), dan `pip install -e .` en `python viewer.py`, `python council.py`, `python validate.py`.

Viewer op een andere poort: zet `VIEWER_PORT=8101` als omgevingsvariabele. Een andere map bekijken, bv. het voorbeeld: `uv run viewer voorbeeld`.

## Hoe de kit werkt

```
             ┌────────────── jouw laptop ──────────────┐
 Teamkaartje │  council.py ── Orchestrator             │
   (.env) ──►│      │      ── Raadslid (Oracle) ───────┼──► MCP  /oracle/mcp
             │      │      ── Raadslid (Beast Master) ─┼──► MCP  /beast_master/mcp
             │      │      ── Voorzitter (geen bron)   │
             │      ▼                                   │
             │  trace.json + verdict.json ──► viewer    │──► LLM via Roboest-endpoint
             └──────────────────────────────────────────┘
```

| Bestand | Wat |
|---|---|
| `council.py` | De Orchestrator (`kies_volgende()`, nu een vaste volgorde), het debat en de Voorzitter. Schrijft `trace.json` na elke beurt en `verdict.json` aan het einde. |
| `raadsleden/<rol>.py` | Eén bestand per Raadslid: Rol, naam en publiek perspectief. |
| `viewer.py` + `viewer.html` | De debatviewer (`uv run viewer`). Leest alleen `trace.json` en `verdict.json`, dus werkt ook als je een ander platform kiest. |
| `voorbeelden/devui_debat.py` | Dezelfde Raadsleden als MAF-group chat in de DevUI van Microsoft (zie "Volgende stappen"). |
| `kennisbronnen/` | Leeg (op een LEESMIJ na). Pak `pack.zip` uit in de root van de repo; dan staan de bronnen in `kennisbronnen/<rol>/`. Staat in `.gitignore`. |
| `schema/` | De JSON-schema's van het Council Verdict en de Debat-trace. |
| `voorbeeld/` | Een ingevuld voorbeeld over een verzonnen zaak (een dorpsmolen), om de vorm te zien. Het valideert bewust niet tegen het Achrona-schema. |
| `validate.py` | Toetst je uitvoer aan de schema's. |

## Wat stel je zelf in?

- **Welke Rollen** meedoen: kopieer `raadsleden/oracle.py` naar bv. `raadsleden/engineer.py` en pas aan: `ROL` = de mapnaam van de Rol in kleine letters (`archmage`, `engineer`, `guardian_keeper`, `historian`, `oracle`, `beast_master`); `NAAM` en `PERSPECTIEF` haal je van de Rolkaart. Het nieuwe bestand doet vanzelf mee; de volgorde in het debat is alfabetisch op bestandsnaam. Voeg in `.env` een regel `MCP_<ROL>=https://<mcp-host>/<rol>/mcp` toe.
- **Kennisbronnen**: standaard leest elk Raadslid via MCP. Laat je `MCP_<ROL>` leeg, dan plakt de kit de bestanden uit `kennisbronnen/<rol>/` (uit `pack.zip`) in de prompt van dat Raadslid. Heeft een Raadslid geen van beide, dan meldt de kit dat bij de start.
- **Modellen**: `MODEL_KLEIN` voor de Raadsleden, `MODEL_GROOT` voor de Voorzitter, `REASONING` voor het denkwerk. Een andere provider kies je alleen via `.env` (blokken voor het Roboest-endpoint, OpenRouter en Ollama). Eigen modellen mogen, maar support geven we alleen op het Roboest-endpoint.
- **Rondes**: `RONDES` in `.env` geldt alleen voor de vaste volgorde van de kit. Het Beurtenbudget (10 Raadslid-beurten) geldt altijd.
- **Het debat zelf**: de instructies, wie wie aan het woord laat (`kies_volgende()`), wat elk Raadslid van het debat ziet, en hoe de Voorzitter het Verdict invult. Dat staat allemaal in `council.py`.

**Verbruik**: je Teamkaartje heeft een limiet. De viewer en de terminal tonen per run hoeveel tokens het kleine en het grote model gebruikten; het staat ook in `trace.json` onder `verbruik`. Bij een rate limit (429) wacht de kit en probeert opnieuw.

## De Orchestrator

`kies_volgende(beurten, leden)` in `council.py` beslist voor elke beurt wie spreekt. De functie krijgt het debat tot nu toe (dezelfde `beurten` als in `trace.json`) en de Raadsleden, en geeft `(rol, vraag, reden)` terug, of `(None, None, reden)` om te stoppen. De kit schrijft elke keuze als `routering`-beurt in de trace (`aan`, `vraag`, `reden`) en stopt zelf na 10 Raadslid-beurten.

Standaard is het een vaste volgorde met `reden: "vaste volgorde"`. Vervang die door jullie eigen Orchestrator: een agent (bv. de Voorzitter), regels in code, of een mix. Vragen om mee te starten: wie moet een bewering toetsen? Welke Rol ontbreekt nog? Wanneer weet je genoeg? Wat moet elk Raadslid van het debat zien?

## Spelregels

- Eén Raadslid per Rol. Elk Raadslid leest alleen de Kennisbron van zijn eigen Rol. De viewer en de jury kijken dat na in de trace.
- Een Voorzitter mag het debat leiden en het Verdict opstellen, maar leest zelf geen Kennisbron.
- Maximaal 10 Raadslid-beurten per run (het **Beurtenbudget**). Alleen berichten van Raadsleden tellen; toolcalls, Routeringen en berichten van de Voorzitter niet.
- Vóór elke Raadslid-beurt staat een `routering` in de trace: aan wie, welke vraag en waarom. `spreker` is `orchestrator` (code), `voorzitter`, een Rol (handoff) of `mens`.
- Prompts en code bevatten geen inhoud uit de Kennisbronnen (geen record-ID's of feiten). Wat de Council weet, komt uit het debat.
- Menselijke tussenkomst mag, maar staat in de trace als `spreker: "mens"`. Een Routering door een mens telt niet mee voor de Council-score.
- `trace.json` is de ongewijzigde uitvoer van de run die het Verdict maakte. Niet achteraf bewerken.
- Elke Rol heeft een Belang en kan ernaast zitten.

## Wat moet je zelf bouwen?

- Een eigen **Orchestrator** in plaats van de vaste volgorde, met een reden bij elke keuze.
- Meer Raadsleden (minstens 3 Rollen). Meer Rollen geven meer kennis, maar elke beurt telt. De Kennisbronnen verwijzen soms naar andere Rollen: dat zegt je welke Rol je nog mist.
- Een Voorzitter die het `verdict.json` echt invult: de oorzaak in drie delen (`ingreep`, `mechanisme`, `verloop`), elk met een bewering en record-ID's als bewijs, een geordend herstelplan (`acties`) en minstens één risico. Weet je een deel niet, laat dan `bewering: null`.
- `geschillen` in de trace: waarover waren de Raadsleden het oneens, en hoe werd het beslecht?
- Let op: modellen schrijven ID's soms met een speciaal koppelteken (`ORA‑101`). `uv run validate` meldt dat; vervang het door een gewoon `-`.

## Jurering

Drie criteria, elk 0–10: **Verdict** (40%), **Council** (40%: hoe goed orchestreert jullie Council, zichtbaar in de Routeringen van de trace) en **Presentatie** (20%, met de vraag: waarom werkt jullie Council hier beter dan één agent?). Zonder Extra uitdaging haal je per criterium hoogstens 8 op 10. Voor wie sneller klaar is:

- **Verdict**: voorspel wanneer de Desync opnieuw toeslaat als niemand ingrijpt (optioneel veld `voorspelling {dag, bewering, bewijs[]}`) · geef je zekerheid per deel van de oorzaak (optioneel veld `zekerheid`, 0–1, per slot).
- **Council**: laat je Orchestrator zelf beslissen wanneer het debat klaar is, en waarom (een `routering` met `aan: null` vóór het budget op is) · laat je Orchestrator een lijst open vragen bijhouden en na elke beurt bijwerken (optioneel veld `open_vragen` in de `routering`).
- **Presentatie**: draai de Council live tijdens de pitch · bouw een eigen, rijkere visualisatie van het debat (bovenop of in plaats van de viewer) of geef de Rollen avatars.

## Volgende stappen

- **DevUI**: `uv run --extra devui python voorbeelden/devui_debat.py` opent de DevUI van [Microsoft Agent Framework](https://github.com/microsoft/agent-framework) met dezelfde Raadsleden als group chat. Het gebruikt de bestanden uit `kennisbronnen/<rol>/` (geen MCP: pak eerst `pack.zip` uit) en schrijft geen trace. Handig om orchestratie te verkennen.
- MAF heeft patronen voor orchestratie: een group chat met een manager die de spreker kiest, Handoff (een agent geeft het woord door) en Magentic (een manager met een plan en open vragen). Gebruik ze, of kies een eigen platform: zolang je `verdict.json` en `trace.json` in dit formaat oplevert, met een `routering` vóór elke Raadslid-beurt, mag alles.
- Bouw RAG op de Kennisbronnen: het Roboest-endpoint biedt ook een embeddingmodel aan.

## Inleveren (om 16:00)

- Je repo is **openbaar** en je deelt de link met ons via het inleverformulier (link bij de briefing).
- Commit en push `verdict.json` en `trace.json` (in de root, uit dezelfde run) vóór 16:00. Alleen de laatste commit vóór 16:00 telt.
- Kleine correcties aan `verdict.json` (bv. koppeltekens) mogen; `trace.json` laat je ongewijzigd.

## Licentie

MIT, zie `LICENSE`.
