import asyncio
import json
import os
import re
import sys
import uuid
from contextlib import AsyncExitStack
from datetime import datetime
from pathlib import Path

from agent_framework import Agent, MCPStreamableHTTPTool
from agent_framework.openai import OpenAIChatCompletionClient
from dotenv import load_dotenv
from openai import AsyncOpenAI

import raadsleden

ROOT = Path(__file__).parent
KENNISBRONNEN = ROOT / "kennisbronnen"
ROLLEN = ("archmage", "engineer", "guardian_keeper", "historian", "oracle", "beast_master")
PREFIX = {"archmage": "ARC", "engineer": "ENG", "guardian_keeper": "GUA", "historian": "HIS", "oracle": "ORA", "beast_master": "BEA"}
BEURTENBUDGET = 10
LID_LAATSTE = 6
TEKENS_PER_TOKEN = 3.2
SLOTS = ("ingreep", "mechanisme", "verloop")
MAX_WOORDEN = 300
ID_RE = re.compile(r"\b(ARC|ENG|GUA|HIS|ORA|BEA)\s?[-‐‑‒–—―−]\s?([0-9]{3})\b")


KONING_ROUTERING = """Je bent de Koning van de Council of Achrona. Je leidt een debat tussen Raadsleden over de oorzaak van de Desync.
Je hebt zelf geen Kennisbron: je weet alleen wat in het debat gezegd is. Elk Raadslid kent maar een deel van het verhaal, heeft een eigen Belang en kan ernaast zitten.
Schrijf alles (vraag, reden, open vragen) in het Nederlands.

Het doel is een Verdict:
- ingreep: wie deed wat, en wanneer;
- mechanisme: hoe leidt die ingreep tot de symptomen;
- verloop: wat toont het patroon in de tijd (dagen, frequentie, escalatie);
- een herstelplan en de risico's;
telkens gestaafd met bevestigde record-ID's.

Er zijn maximaal {budget} Raadslid-beurten in totaal en een vast tokenbudget. Elke beurt is kostbaar: kies telkens het ene Raadslid dat nu het meeste oplevert en stel een gerichte vraag.
Een Raadslid ziet alleen de laatste {laatste} beurten van het debat: zet in je vraag de feiten, dagen en ID's van anderen waarop het moet reageren.

Zo kies je goed:
1. Wordt een Rol, een plaats of een domein van een ander Raadslid genoemd? Laat dat Raadslid de bewering toetsen.
2. Spreken twee Raadsleden elkaar tegen? Laat de partij die het kan beslechten reageren, met ID's.
3. Ontbreekt een deel van de oorzaak? Kies de Rol die dat deel het waarschijnlijkst kent, ook als die nog niet sprak.
4. Een bewering zonder bevestigde ID telt niet: laat ze staven of weerleggen.
5. Wees wantrouwig tegenover verklaringen die precies het Belang van de spreker dienen.
6. Vraag naar concrete dagen, tijdstippen, plaatsen en ID's. Vraag nooit om een samenvatting of herhaling.
7. Meetbare records (logs, metingen, rapporten, registers) wegen zwaarder dan interpretaties, overtuigingen of visioenen. Toets een interpretatie bij de Rol wiens bron het gemeten feit bevat.
8. Vallen de bronnen van twee Rollen samen op hetzelfde tijdstip of dezelfde plaats, of beschrijft een bron hoe iets werkt? Laat de andere betrokken Rol uitleggen hoe die stukken samenhangen: daar zit meestal het mechanisme.
9. Verwijst een Raadslid naar een andere Rol? Overweeg die Rol als volgende.
10. Een vraag aan een Raadslid dat nog niet sprak, sluit aan bij wat al gezegd is: noem de beurt of het ID waarop het moet reageren.

Stop het debat (rol null) pas als de drie delen van de oorzaak één samenhangende keten vormen, gestaafd met bevestigde ID's, en elke tegenspraak beslecht is. Heb je nog beurten en open vragen of open tegenspraak, gebruik ze. Stoppen vóór het budget op is, is een goede keuze als je echt genoeg weet.

Antwoord met alleen één JSON-object:
{{"rol": "<een rol-id uit de lijst, of null om te stoppen>", "vraag": "<de vraag aan dat Raadslid, of null>", "reden": "<1-2 concrete zinnen: welke beurt of welk ID aanleiding geeft en welk deel van de oorzaak dit invult>", "open_vragen": ["<korte open vraag>", "..."]}}
open_vragen: wat na deze keuze nog onbeantwoord is (hoogstens 6). Haal weg wat beantwoord is."""


KONING_STOP = """Je wilde het debat stoppen. Kijk nog één keer kritisch:
{punten}
Beslis opnieuw. Spraken er Raadsleden nog niet, kies er dan één en stel een gerichte vraag die aansluit bij het debat (noem de beurt of het ID waarop het moet reageren).
Anders: kies wie een open vraag of tegenspraak kan beslechten, of bevestig dat je stopt met een concrete reden.
Antwoord met hetzelfde JSON-object als daarnet."""


INKORTEN = """Hieronder staat het antwoord van een Raadslid, maar er staat ook zijn denkproces in.
Geef alleen het eindantwoord dat het Raadslid aan de Council geeft, in hoogstens 180 woorden, in de ik-vorm.
Schrijf in het Nederlands. Neem record-ID's letterlijk over. Voeg niets toe wat er niet staat. Geen inleiding, geen uitleg over wat je doet."""


KONING_VERDICT = """Je bent de Koning van de Council of Achrona. Het debat is voorbij en jij stelt het Council Verdict op.
Je hebt geen Kennisbron: je gebruikt alleen wat de Raadsleden in het debat inbrachten.
Schrijf alles in het Nederlands.

Regels:
- Gebruik als bewijs alleen ID's uit de lijst met bevestigde ID's hieronder, met een gewoon koppelteken (bv. XXX-123).
- Elk Raadslid heeft een Belang en kan ernaast zitten. Weeg tegenspraak af op bewijs, niet op wie het luidst sprak.
- Kies één samenhangende oorzaakketen: de ingreep veroorzaakt het mechanisme, en het mechanisme verklaart het verloop. Geen opsomming van alle theorieën.
- Meetbare records (logs, metingen, rapporten, registers) wegen zwaarder dan interpretaties, overtuigingen en visioenen. Een verklaring die precies het Belang van de spreker dient, is verdacht tot een andere bron ze bevestigt.
- Verzin geen mechanisme of feit dat niet in het debat staat.
- Noem ID's altijd apart, nooit als bereik.
- Weet je een deel van de oorzaak niet zeker genoeg? Zet "bewering" op null en "bewijs" op [].
- zekerheid: jouw eerlijke inschatting tussen 0 en 1 per deel van de oorzaak.
- acties: het herstelplan in uitvoeringsvolgorde (eerst wat schade stopt, dan herstel, dan voorkomen).
- risicos: minstens één, elk met een mitigatie.
- voorspelling: alleen als het verloop een patroon in de tijd toont waaruit je kan afleiden op welke dag de Desync opnieuw toeslaat als niemand ingrijpt; anders null.
- voorspelling: steun ze bij voorkeur op gemeten records, niet op één bron alleen.
- geschillen: elk punt waarover Raadsleden het oneens waren, met per Rol hun standpunt en hoe het bewijs het beslecht. Uitkomst null alleen als het echt open bleef.

Antwoord met alleen één JSON-object in deze vorm:
{
  "samenvatting": "<2-4 zinnen>",
  "oorzaak": {
    "ingreep": {"bewering": "<wie deed wat, wanneer>" , "bewijs": ["ID"], "zekerheid": 0.0},
    "mechanisme": {"bewering": "<hoe leidt dat tot de symptomen>", "bewijs": ["ID"], "zekerheid": 0.0},
    "verloop": {"bewering": "<patroon in de tijd>", "bewijs": ["ID"], "zekerheid": 0.0}
  },
  "acties": [{"actie": "...", "reden": "...", "bewijs": ["ID"]}],
  "risicos": [{"risico": "...", "mitigatie": "..."}],
  "voorspelling": {"dag": 0, "bewering": "...", "bewijs": ["ID"]},
  "geschillen": [{"onderwerp": "...", "standpunten": {"<rol-id>": "..."}, "uitkomst": "...", "bewijs": ["ID"]}]
}"""


def normaliseer_ids(tekst):
    tekst = ID_RE.sub(lambda m: f"{m.group(1)}-{m.group(2)}", tekst or "")
    return tekst.replace("\u2011", "-").replace("\u2010", "-")


def vind_ids(tekst):
    return sorted({f"{a}-{b}" for a, b in ID_RE.findall(tekst or "")})


def kort_fout(e):
    tekst = str(e).replace("\n", " ")
    return tekst if len(tekst) <= 220 else tekst[:220] + "…"


def limiet_wachttijd(e):
    tekst = str(e).lower()
    if not any(w in tekst for w in ("rate_limit", "rate limit", "routing_exhausted", "429", "too many requests", "cooldown")):
        return None
    m = re.search(r"reset\D{0,6}(\d+)\s*m", tekst)
    if m:
        return min(300, int(m.group(1)) * 60 + 15)
    m = re.search(r"(?:retry|reset)\D{0,12}(\d+)\s*s", tekst)
    if m:
        return min(300, int(m.group(1)) + 5)
    return 60


async def wacht_op_limiet(e, wie, wachten):
    w = limiet_wachttijd(e)
    if not w or wachten >= 4:
        return False
    print(f"LET OP: alle modellen zijn even bezet (rate limit) bij {wie}; ik wacht {w} s en probeer opnieuw ({wachten + 1}/4).")
    await asyncio.sleep(w)
    return True


def lees_json(tekst):
    tekst = re.sub(r"<think>.*?</think>", "", tekst or "", flags=re.S).strip()
    tekst = re.sub(r"^```(?:json)?\s*|\s*```$", "", tekst)
    try:
        return json.loads(tekst)
    except (json.JSONDecodeError, TypeError):
        pass
    begin, eind = tekst.find("{"), tekst.rfind("}")
    if begin != -1 and eind > begin:
        try:
            return json.loads(tekst[begin:eind + 1])
        except json.JSONDecodeError:
            return None
    return None


def controleer(leden):
    mist = [v for v in ("OPENAI_BASE_URL", "OPENAI_API_KEY", "MODEL_KLEIN", "MODEL_GROOT") if not os.getenv(v)]
    if mist:
        sys.exit(f"In .env ontbreekt: {', '.join(mist)}. Kopieer .env.example naar .env en vul het in, of zie 'Vooraf installeren' in de README.")
    for lid in leden:
        if lid.ROL not in ROLLEN:
            sys.exit(f"raadsleden/: ROL = {lid.ROL!r} is ongeldig. Gebruik de mapnaam van de Rol: {', '.join(ROLLEN)}.")
    dubbel = {l.ROL for l in leden if [x.ROL for x in leden].count(l.ROL) > 1}
    if dubbel:
        sys.exit(f"Eén Raadslid per Rol: {', '.join(dubbel)} komt meer dan eens voor in raadsleden/.")
    if len(leden) < 3:
        print(f"LET OP: de spelregels vragen minstens 3 Rollen, je hebt er {len(leden)}.")


def async_llm():
    return AsyncOpenAI(base_url=os.environ["OPENAI_BASE_URL"], api_key=os.environ["OPENAI_API_KEY"], max_retries=8)


def client(model_env):
    return OpenAIChatCompletionClient(model=os.environ[model_env], async_client=async_llm())


def kennisbron_bestanden(rol):
    map_ = KENNISBRONNEN / rol
    return sorted(p for p in map_.glob("*") if p.suffix in (".md", ".csv")) if map_.is_dir() else []


def instructies(lid, bestanden, mcp, leden):
    anderen = ", ".join(l.NAAM for l in leden if l.ROL != lid.ROL)
    tekst = (
        f"Je bent de {lid.NAAM}, een Raadslid in de Council of Achrona. {lid.PERSPECTIEF}\n"
        "Je debatteert met de andere Raadsleden over de oorzaak van de Desync. De Koning leidt het debat en stelt jou telkens één vraag.\n"
        f"De andere Raadsleden zijn: {anderen}. Verwijs naar hen met die namen.\n\n"
        "Regels:\n"
        f"- Baseer je alleen op je eigen Kennisbron. Jouw record-ID's beginnen met {PREFIX[lid.ROL]}-. "
        "Noem bij elke bewering de record-ID's precies zoals ze in je Kennisbron staan, met een gewoon koppelteken '-'. Verzin nooit een ID.\n"
        "- Beantwoord eerst de vraag van de Koning, gericht en concreet: dag, tijdstip, plaats, wie.\n"
        "- Strookt iets wat een ander Raadslid zei niet met jouw Kennisbron? Zeg dat expliciet, met jouw ID's.\n"
        "- Verwijst je Kennisbron naar een andere Rol, persoon of plaats? Meld dat, zodat de Koning die Rol kan bevragen.\n"
        "- Je hebt een Belang en kan ernaast zitten: scheid wat je bron vaststelt van wat jij erover denkt.\n"
        "- Weet je iets niet, zeg dat eerlijk. Herhaal niet wat al gezegd is. Hoogstens 180 woorden.\n"
        "- Schrijf alleen je eindantwoord aan de Council: geen denkproces, geen plan, geen opsomming van wat je gaat opzoeken.\n"
        "- Antwoord altijd in het Nederlands."
    )
    if mcp:
        tekst += (
            "\n\nJe ziet je Kennisbron alleen via je tools. Begin elke beurt met lees_kennisbron: zo lees je je volledige Kennisbron. "
            "Gebruik daarna zoek, zoek_betekenis of toon om gericht te zoeken. "
            "Het woord 'Desync' staat waarschijnlijk niet letterlijk in je bron: kijk naar de verschijnselen (storingen, afwijkingen, tijdstippen) "
            "en naar hoe de dingen werken die je bron beschrijft. Noem alleen ID's die je in een tool-resultaat zag."
        )
    elif bestanden:
        tekst += ("\n\nHet woord 'Desync' staat waarschijnlijk niet letterlijk in je bron: kijk naar de verschijnselen "
                  "(storingen, afwijkingen, tijdstippen) en naar hoe de dingen werken die je bron beschrijft.")
        tekst += "\n\nJe Kennisbron:\n\n" + "\n\n".join(f"## {p.name}\n\n{p.read_text(encoding='utf-8')}" for p in bestanden)
    else:
        tekst += "\n\nJe hebt nog geen Kennisbron: zeg dat je niets kan bewijzen."
    return tekst


def tel(verbruik, model, invoer, gecached, uitvoer):
    v = verbruik.setdefault(model, {"beurten": 0, "invoer": 0, "gecached": 0, "uitvoer": 0})
    v["beurten"] += 1
    v["invoer"] += invoer or 0
    v["gecached"] += gecached or 0
    v["uitvoer"] += uitvoer or 0


def tel_agent(verbruik, model, usage):
    if usage:
        tel(verbruik, model, usage.get("input_token_count"), usage.get("cache_read_input_token_count"), usage.get("output_token_count"))


def tel_openai(verbruik, model, usage):
    if usage:
        details = getattr(usage, "prompt_tokens_details", None)
        tel(verbruik, model, usage.prompt_tokens, getattr(details, "cached_tokens", 0) if details else 0, usage.completion_tokens)


def toolcalls(response):
    for msg in response.messages:
        for c in msg.contents:
            if c.type == "function_call":
                args = c.arguments
                try:
                    yield c.name, json.loads(args) if isinstance(args, str) and args else (args or {})
                except json.JSONDecodeError:
                    yield c.name, {"ruw": args}


def tekst_van(waarde):
    if waarde is None:
        return ""
    if isinstance(waarde, str):
        return waarde
    if isinstance(waarde, (list, tuple)):
        return "\n".join(tekst_van(w) for w in waarde)
    if getattr(waarde, "text", None):
        return waarde.text
    if getattr(waarde, "result", None) is not None:
        return tekst_van(waarde.result)
    return str(waarde)


def toolresultaten(response):
    delen = []
    for msg in response.messages:
        for c in msg.contents:
            if c.type == "function_result":
                delen.append(tekst_van(getattr(c, "result", None)))
    return "\n".join(delen)


async def vraag_json(llm, systeem, gebruiker, verbruik, pogingen=3):
    model = os.environ["MODEL_GROOT"]
    niveau = denkniveau("REASONING_KONING")
    extra = {"reasoning_effort": niveau} if niveau else {}
    berichten = [{"role": "system", "content": systeem}, {"role": "user", "content": gebruiker}]
    fout, poging, wachten = None, 0, 0
    while poging < pogingen:
        kwargs = {"model": model, "messages": berichten, **extra}
        if poging == 0:
            kwargs["response_format"] = {"type": "json_object"}
        try:
            r = await llm.chat.completions.create(**kwargs)
        except Exception as e:
            fout = e
            if await wacht_op_limiet(e, "de Koning", wachten):
                wachten += 1
                continue
            poging += 1
            await asyncio.sleep(2)
            continue
        if isinstance(r, str) or not getattr(r, "choices", None):
            fout = RuntimeError(f"het endpoint gaf geen JSON-antwoord terug: {str(r)[:80]!r}")
            poging += 1
            await asyncio.sleep(2)
            continue
        tel_openai(verbruik, "groot", r.usage)
        tekst = r.choices[0].message.content or ""
        data = lees_json(tekst)
        if isinstance(data, dict):
            return data
        fout = ValueError(f"geen geldige JSON: {tekst[:200]!r}")
        berichten = berichten + [
            {"role": "assistant", "content": tekst},
            {"role": "user", "content": "Antwoord alleen met één geldig JSON-object, zonder tekst eromheen."},
        ]
        poging += 1
    raise RuntimeError(kort_fout(fout))


async def kort_in(llm, tekst, verbruik):
    try:
        r = await llm.chat.completions.create(
            model=os.environ["MODEL_KLEIN"],
            messages=[{"role": "system", "content": INKORTEN}, {"role": "user", "content": tekst}],
        )
    except Exception as e:
        print(f"LET OP: inkorten mislukte ({kort_fout(e)}); het volledige antwoord blijft staan.")
        return None
    if isinstance(r, str) or not getattr(r, "choices", None):
        return None
    tel_openai(verbruik, "klein", r.usage)
    kort = normaliseer_ids(re.sub(r"<think>.*?</think>", "", r.choices[0].message.content or "", flags=re.S)).strip()
    if not kort or len(kort.split()) >= len(tekst.split()):
        return None
    if not set(vind_ids(kort)) <= set(vind_ids(tekst)):
        print("LET OP: de ingekorte versie bevatte nieuwe ID's; het volledige antwoord blijft staan.")
        return None
    return kort


def tokenbudget():
    try:
        return max(10000, int(os.getenv("TOKENBUDGET", "150000")))
    except ValueError:
        return 150000


def tokens_geschat(tekst):
    return int(len(tekst or "") / TEKENS_PER_TOKEN) + 1


def gebruikt(verbruik):
    return sum(v["invoer"] + v["uitvoer"] for v in verbruik.values())


def debat_voor_lid(beurten, namen):
    berichten = raadsleden_berichten(beurten)
    if len(berichten) <= LID_LAATSTE:
        return debat_tekst(beurten, namen)
    grens = berichten[-LID_LAATSTE]["nr"]
    ervoor = [b["nr"] for b in beurten if b["soort"] == "routering" and b["nr"] < grens]
    vanaf = ervoor[-1] if ervoor else grens
    weg = len(berichten) - LID_LAATSTE
    return (f"({weg} eerdere beurten weggelaten; de Koning zet in zijn vraag wat je ervan nodig hebt.)\n\n"
            + debat_tekst([b for b in beurten if b["nr"] >= vanaf], namen))


def raadsleden_berichten(beurten):
    return [b for b in beurten if b["soort"] == "bericht" and b["spreker"] in ROLLEN]


def debat_tekst(beurten, namen):
    regels = []
    for b in beurten:
        if b["soort"] == "routering" and b.get("aan"):
            regels.append(f"[beurt {b['nr']}] Koning → {namen.get(b['aan'], b['aan'])}: {b.get('vraag')}")
        elif b["soort"] == "bericht" and b["spreker"] in ROLLEN:
            controle = f"bevestigde ID's: {', '.join(b.get('bewijs') or []) or 'geen'}"
            if b.get("onbevestigd"):
                controle += f"; NIET bevestigd (niet in de eigen Kennisbron gevonden): {', '.join(b['onbevestigd'])}"
            regels.append(f"[beurt {b['nr']}] {namen.get(b['spreker'], b['spreker'])} ({b['spreker']}): {b['tekst']}\n   ({controle})")
    return "\n\n".join(regels) or "(nog niets gezegd)"


def regel_keuze(beurten, leden, waarom):
    berichten = raadsleden_berichten(beurten)
    gesproken = {b["spreker"] for b in berichten}
    for lid in leden:
        if lid.ROL not in gesproken:
            return (lid.ROL,
                    "Wat stelt jouw Kennisbron vast over de oorzaak van de Desync: wat gebeurde er, wanneer en waar? Noem record-ID's.",
                    f"regel ({waarom}): {lid.NAAM} sprak nog niet, zijn Kennisbron ontbreekt nog in het debat")
    if berichten:
        laatste = berichten[-1]
        for lid in leden:
            if lid.ROL != laatste["spreker"] and lid.NAAM.lower() in laatste["tekst"].lower():
                return (lid.ROL,
                        f"Beurt {laatste['nr']} verwijst naar jou. Klopt dat met jouw Kennisbron? Bevestig of weerleg met ID's.",
                        f"regel ({waarom}): {lid.NAAM} wordt genoemd in beurt {laatste['nr']} en moet dat toetsen")
    return None, None, f"regel ({waarom}): iedereen sprak en niemand werd nog genoemd"


async def kies_volgende(beurten, leden, llm, verbruik, open_vragen, budget_tekst="", mag_herbekijken=True):
    if os.getenv("KONING", "agent").lower() == "regels":
        rol, vraag, reden = regel_keuze(beurten, leden, "Koning in regelmodus")
        return rol, vraag, reden, open_vragen

    namen = {l.ROL: l.NAAM for l in leden}
    berichten = raadsleden_berichten(beurten)
    over = BEURTENBUDGET - len(berichten)
    telling = {l.ROL: sum(1 for b in berichten if b["spreker"] == l.ROL) for l in leden}
    lijst = "\n".join(f"- {l.ROL} ({l.NAAM}): {l.PERSPECTIEF} Sprak al {telling[l.ROL]} keer." for l in leden)
    gebruiker = (
        f"Raadsleden:\n{lijst}\n\n"
        f"Nog {over} van de {BEURTENBUDGET} Raadslid-beurten over.\n"
        + (f"{budget_tekst}\n" if budget_tekst else "") + "\n"
        f"Jouw open vragen tot nu toe:\n" + ("\n".join(f"- {v}" for v in open_vragen) or "(nog geen)") +
        f"\n\nDebat tot nu toe:\n\n{debat_tekst(beurten, namen)}\n\n"
        "Wie spreekt nu, met welke vraag en waarom? Of stop je het debat?"
    )
    try:
        data = await vraag_json(llm, KONING_ROUTERING.format(budget=BEURTENBUDGET, laatste=LID_LAATSTE), gebruiker, verbruik)
    except Exception as e:
        print(f"LET OP: de Koning-agent faalde ({kort_fout(e)}); de Koning kiest volgens regels.")
        rol, vraag, reden = regel_keuze(beurten, leden, "Koning-agent gaf geen antwoord")
        return rol, vraag, reden, open_vragen

    rol, vraag, reden, nieuwe_open, geldig = ontleed(data, namen, leden)
    if not geldig:
        r, v, rd = regel_keuze(beurten, leden, f"Koning koos onbekende Rol {data.get('rol')!r}")
        return r, v, rd, nieuwe_open or open_vragen

    if rol is None and over > 0:
        stil = [l for l in leden if telling[l.ROL] == 0]
        moet_horen = bool(stil) and os.getenv("IEDEREEN_HOREN", "1") != "0" and over >= len(stil)
        punten = []
        if stil:
            punten.append("- Nog niet gesproken: " + ", ".join(f"{l.ROL} ({l.NAAM})" for l in stil)
                          + ". Hun Kennisbron kan net het ontbrekende stuk of het tegenbewijs bevatten.")
        if nieuwe_open:
            punten.append("- Je eigen open vragen: " + "; ".join(nieuwe_open))
        if (stil or nieuwe_open) and mag_herbekijken:
            punten.append(f"- Er zijn nog {over} Raadslid-beurten over.")
            herzien = (gebruiker + f"\n\nJe eerste beslissing: {json.dumps(data, ensure_ascii=False)}\n\n"
                       + KONING_STOP.format(punten="\n".join(punten)))
            try:
                data2 = await vraag_json(llm, KONING_ROUTERING.format(budget=BEURTENBUDGET, laatste=LID_LAATSTE), herzien, verbruik)
                rol2, vraag2, reden2, open2, geldig2 = ontleed(data2, namen, leden)
            except Exception as e:
                print(f"LET OP: de Koning kon zijn stopbeslissing niet herbekijken ({e}).")
                rol2, geldig2 = None, False
            if geldig2 and rol2 is not None:
                return rol2, vraag2 or "Wat weet jouw Kennisbron hierover? Noem record-ID's.", f"Herbekeken na stopvoorstel: {reden2}", open2 or nieuwe_open
            if geldig2:
                reden, nieuwe_open = reden2, open2 or nieuwe_open
        if moet_horen:
            lid = stil[0]
            return (lid.ROL,
                    ("Wat zegt jouw Kennisbron over deze open vragen: " + "; ".join(v.rstrip(" ?") for v in (nieuwe_open or open_vragen)[:3]) + "? " if (nieuwe_open or open_vragen) else
                     "Wat stelt jouw Kennisbron vast over wat er misloopt, en wanneer? ")
                    + "Strookt jouw bron met wat de anderen zeiden? Noem record-ID's.",
                    f"De Koning wilde stoppen ({reden}), maar {lid.NAAM} sprak nog niet: eerst diens Kennisbron horen voor een Verdict.",
                    nieuwe_open or open_vragen)
        return None, None, reden, nieuwe_open

    if rol is None:
        return None, None, reden, nieuwe_open
    return rol, vraag or "Wat weet jouw Kennisbron hierover? Noem record-ID's.", reden, nieuwe_open


def ontleed(data, namen, leden):
    rol = data.get("rol")
    rol = None if rol in (None, "", "null", "None") else str(rol).strip().lower()
    vraag = (data.get("vraag") or "").strip() or None
    reden = (data.get("reden") or "").strip() or "geen reden opgegeven"
    open_ = [str(v).strip() for v in (data.get("open_vragen") or []) if str(v).strip()][:6]
    if rol is not None and rol not in namen:
        zelfde = [l.ROL for l in leden if l.NAAM.lower() == rol or l.ROL.replace("_", " ") == rol.replace("_", " ")]
        if not zelfde:
            return None, vraag, reden, open_, False
        rol = zelfde[0]
    return rol, vraag, reden, open_, True


def schoon_bewijs(lijst, toegestaan):
    uit = []
    for i in lijst or []:
        i = normaliseer_ids(str(i)).strip()
        if i in toegestaan and i not in uit:
            uit.append(i)
    return uit


def maak_verdict(data, run_id, toegestaan, rollen):
    data = data or {}
    oorzaak = {}
    for slot in SLOTS:
        s = (data.get("oorzaak") or {}).get(slot) or {}
        bewering = s.get("bewering")
        bewering = normaliseer_ids(bewering).strip() if isinstance(bewering, str) and bewering.strip() else None
        bewijs = schoon_bewijs(s.get("bewijs"), toegestaan)
        item = {"bewering": bewering, "bewijs": bewijs}
        if bewering and not bewijs:
            item = {"bewering": None, "bewijs": [], "onbewezen_bewering": bewering}
        z = s.get("zekerheid")
        if isinstance(z, (int, float)) and item["bewering"]:
            item["zekerheid"] = round(min(1.0, max(0.0, float(z))), 2)
        oorzaak[slot] = item

    acties = []
    for a in data.get("acties") or []:
        if isinstance(a, dict) and str(a.get("actie") or "").strip():
            item = {"actie": normaliseer_ids(str(a["actie"])).strip(), "reden": normaliseer_ids(str(a.get("reden") or "zie samenvatting")).strip()}
            bewijs = schoon_bewijs(a.get("bewijs"), toegestaan)
            if bewijs:
                item["bewijs"] = bewijs
            acties.append(item)
    if not acties:
        acties = [{"actie": "Het debat verder voeren tot de oorzaak gestaafd is.", "reden": "De Council kon geen herstelplan met bewijs opstellen."}]

    risicos = []
    for r in data.get("risicos") or []:
        if isinstance(r, dict) and str(r.get("risico") or "").strip():
            risicos.append({"risico": normaliseer_ids(str(r["risico"])).strip(), "mitigatie": normaliseer_ids(str(r.get("mitigatie") or "opvolgen")).strip()})
    if not risicos:
        risicos = [{"risico": "Het herstelplan steunt op een onvolledig debat.", "mitigatie": "Eerst de ontbrekende delen van de oorzaak laten toetsen."}]

    verdict = {
        "run_id": run_id,
        "samenvatting": normaliseer_ids(str(data.get("samenvatting") or "")).strip() or "De Council kwam niet tot een samenvatting.",
        "oorzaak": oorzaak,
        "acties": acties,
        "risicos": risicos,
    }

    v = data.get("voorspelling")
    if isinstance(v, dict):
        try:
            dag = int(v.get("dag"))
        except (TypeError, ValueError):
            dag = 0
        bewijs = schoon_bewijs(v.get("bewijs"), toegestaan)
        bewering = str(v.get("bewering") or "").strip()
        if dag >= 1 and bewering and bewijs:
            verdict["voorspelling"] = {"dag": dag, "bewering": normaliseer_ids(bewering), "bewijs": bewijs}

    geschillen = []
    for g in data.get("geschillen") or []:
        if not isinstance(g, dict) or not str(g.get("onderwerp") or "").strip():
            continue
        standpunten = {}
        for k, w in (g.get("standpunten") or {}).items():
            k = str(k).strip().lower().replace(" ", "_")
            if k in rollen and str(w).strip():
                standpunten[k] = normaliseer_ids(str(w)).strip()
        if not standpunten:
            continue
        bewijs = schoon_bewijs(g.get("bewijs"), toegestaan)
        uitkomst = g.get("uitkomst")
        uitkomst = normaliseer_ids(uitkomst).strip() if isinstance(uitkomst, str) and uitkomst.strip() else None
        if uitkomst and not bewijs:
            uitkomst = None
        geschillen.append({"onderwerp": str(g["onderwerp"]).strip(), "standpunten": standpunten, "uitkomst": uitkomst, "bewijs": bewijs})
    return verdict, geschillen


NIVEAUS = ("minimal", "low", "medium", "high")


def denkniveau(env):
    waarde = os.getenv(env, "").strip().lower()
    if env == "REASONING_KONING" and "REASONING_KONING" not in os.environ:
        waarde = os.getenv("REASONING", "").strip().lower()
    return waarde if waarde in NIVEAUS else None


async def test_denkniveau(llm, env_model, env_niveau):
    from openai import APIStatusError
    niveau = denkniveau(env_niveau)
    ruw = os.getenv(env_niveau, "").strip()
    if ruw and ruw.lower() not in NIVEAUS:
        print(f"LET OP: {env_niveau}={ruw!r} is ongeldig (kies uit {', '.join(NIVEAUS)}); denkniveau staat op de standaard van het model.")
        os.environ[env_niveau] = ""
        return
    if not niveau:
        return
    model = os.environ[env_model]
    try:
        r = await llm.chat.completions.create(model=model, messages=[{"role": "user", "content": "Zeg ok."}], reasoning_effort=niveau)
    except APIStatusError as e:
        if e.status_code in (400, 422):
            print(f"LET OP: {env_model}={model!r} weigert reasoning_effort={niveau!r} (HTTP {e.status_code}); denkniveau staat uit voor dit model.")
            os.environ[env_niveau] = ""
            return
        print(f"LET OP: kon het denkniveau van {env_model} niet testen (HTTP {e.status_code}); het blijft op {niveau!r}.")
        return
    except Exception as e:
        print(f"LET OP: kon het denkniveau van {env_model} niet testen ({e}); het blijft op {niveau!r}.")
        return
    if isinstance(r, str) or not getattr(r, "choices", None):
        return
    print(f"Denkniveau ok: {env_model}={model!r} met reasoning_effort={niveau!r}")


async def test_verbinding():
    from openai import APIConnectionError, APIStatusError
    url = os.environ["OPENAI_BASE_URL"]
    lokaal = "localhost" in url or "127.0.0.1" in url
    llm = async_llm().with_options(max_retries=1, timeout=90)
    for env in ("MODEL_KLEIN", "MODEL_GROOT"):
        model = os.environ[env]
        try:
            r = await llm.chat.completions.create(model=model, messages=[{"role": "user", "content": "Zeg ok."}], max_tokens=5)
        except APIConnectionError:
            hint = " Draait FreeLLMAPI? De desktop-app luistert standaard op http://127.0.0.1:31415/v1." if lokaal else ""
            sys.exit(f"Geen verbinding met het LLM-endpoint {url}.{hint}")
        except APIStatusError as e:
            if e.status_code in (401, 403):
                sys.exit(f"Het LLM-endpoint {url} weigert de key (HTTP {e.status_code}). Klopt OPENAI_API_KEY in .env?")
            if e.status_code == 404:
                sys.exit(f"Het LLM-endpoint {url} kent model {model!r} ({env}) of het pad niet (HTTP 404). Eindigt OPENAI_BASE_URL op /v1?")
            print(f"LET OP: testcall met {env}={model!r} gaf HTTP {e.status_code}: {e.message}")
            continue
        if isinstance(r, str) or not getattr(r, "choices", None):
            sys.exit(f"Het LLM-endpoint {url} gaf geen JSON terug maar {str(r)[:80]!r}…\n"
                     "Dat is meestal een webpagina: OPENAI_BASE_URL moet naar de API wijzen en op /v1 eindigen"
                     + (", bv. http://127.0.0.1:31415/v1 voor de FreeLLMAPI-desktop-app." if lokaal else "."))
        print(f"Verbinding ok: {env}={model!r}")
    if not os.getenv("REASONING_KONING") and os.getenv("REASONING"):
        os.environ["REASONING_KONING"] = os.environ["REASONING"]
    await test_denkniveau(llm, "MODEL_KLEIN", "REASONING")
    await test_denkniveau(llm, "MODEL_GROOT", "REASONING_KONING")


async def draai_lid(agent, prompt, opties, naam):
    fout, pogingen, wachten = None, 0, 0
    while pogingen < 3:
        try:
            return await agent.run(prompt, options=opties), None
        except Exception as e:
            fout = e
            if await wacht_op_limiet(e, naam, wachten):
                wachten += 1
                continue
            pogingen += 1
            print(f"LET OP: {naam} gaf een fout ({kort_fout(e)}); nieuwe poging.")
            await asyncio.sleep(3 * pogingen)
    return None, fout


def alleen_bestanden():
    return os.getenv("KENNISBRON", "").strip().lower() in ("bestanden", "bestand", "files")


async def verbind_kennisbron(stack, lid):
    if alleen_bestanden():
        bestanden = kennisbron_bestanden(lid.ROL)
        if not bestanden:
            sys.exit(f"KENNISBRON=bestanden, maar kennisbronnen/{lid.ROL}/ is leeg. "
                     "Pak pack.zip uit in de root van de repo, zodat de map kennisbronnen/<rol>/ de bestanden bevat.")
        return "", [], bestanden
    mcp_url = os.getenv(f"MCP_{lid.ROL.upper()}", "").strip()
    if mcp_url:
        try:
            tool = await stack.enter_async_context(MCPStreamableHTTPTool(name=f"kennisbron_{lid.ROL}", url=mcp_url))
            return mcp_url, [tool], []
        except Exception as e:
            bestanden = kennisbron_bestanden(lid.ROL)
            if not bestanden:
                sys.exit(f"MCP voor {lid.NAAM} ({mcp_url}) is onbereikbaar: {e}\n"
                         f"Is de server al open (vanaf 10:00)? Klopt het pad /{lid.ROL}/mcp? "
                         f"Of laat MCP_{lid.ROL.upper()} leeg om de bestanden uit kennisbronnen/{lid.ROL}/ te gebruiken.")
            print(f"LET OP: MCP voor {lid.NAAM} is onbereikbaar ({e}); de bestanden uit kennisbronnen/{lid.ROL}/ gaan in de prompt.")
    bestanden = kennisbron_bestanden(lid.ROL)
    if not bestanden:
        print(f"LET OP: {lid.NAAM} heeft geen Kennisbron (MCP_{lid.ROL.upper()} is leeg en kennisbronnen/{lid.ROL}/ ook).")
    return "", [], bestanden


async def run():
    load_dotenv(ROOT / ".env")
    run_id = f"{datetime.now().astimezone().isoformat(timespec='seconds')}_{uuid.uuid4().hex[:8]}"
    leden = raadsleden.alle()
    controleer(leden)
    await test_verbinding()
    opties = {"reasoning_effort": denkniveau("REASONING")} if denkniveau("REASONING") else None
    beurten, verbruik = [], {}
    trace = {"run_id": run_id, "status": "bezig", "raadsleden": [l.ROL for l in leden], "beurten": beurten, "geschillen": [], "verbruik": verbruik}

    def bewaar(naam, data):
        (ROOT / naam).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def beurt(ronde, spreker, soort, **velden):
        beurten.append({"nr": len(beurten) + 1, "ronde": ronde, "spreker": spreker, "soort": soort, **velden})
        bewaar("trace.json", trace)

    klein = client("MODEL_KLEIN")
    llm = async_llm()
    namen = {l.ROL: l.NAAM for l in leden}
    bevestigd_pool = set()

    async with AsyncExitStack() as stack:
        per_rol, instr_per_rol = {}, {}
        if alleen_bestanden():
            print("Kennisbronnen: bestanden uit kennisbronnen/<rol>/ (MCP staat uit via KENNISBRON=bestanden).")
        for lid in leden:
            mcp_url, tools, bestanden = await verbind_kennisbron(stack, lid)
            for p in bestanden:
                beurt(0, lid.ROL, "bestand", bestand=f"{lid.ROL}/{p.name}")
            instr = instructies(lid, bestanden, mcp_url, leden)
            context = "\n".join(p.read_text(encoding="utf-8") for p in bestanden)
            per_rol[lid.ROL] = (lid, mcp_url, Agent(klein, instr, name=lid.ROL, tools=tools), context)
            instr_per_rol[lid.ROL] = instr

        (ROOT / "verdict.json").unlink(missing_ok=True)
        bewaar("trace.json", trace)
        open_vragen, ronde, mislukt = [], 1, 0
        budget = tokenbudget()
        kosten_lid, kosten_koning = {}, []

        def schat_lid(r):
            if kosten_lid.get(r):
                return int(max(kosten_lid[r][-2:]) * 1.1)
            lid_, mcp_, _, _ = per_rol[r]
            vraag_ = tokens_geschat(instr_per_rol[r]) + tokens_geschat(debat_voor_lid(beurten, namen)) + 300
            return int(((2 * vraag_ + 6500) if mcp_ else vraag_) * 1.15 + 900)

        def schat_routering():
            formule = int((tokens_geschat(debat_tekst(beurten, namen)) + 1800) * 1.15 + 500)
            return max(formule, int(max(kosten_koning[-2:]) * 1.1)) if kosten_koning else formule

        def schat_verdict():
            formule = int((tokens_geschat(debat_tekst(beurten, namen)) + 2000) * 1.15 + 2500)
            return max(formule, int(max(kosten_koning[-2:]) * 1.5)) if kosten_koning else formule

        while True:
            gesproken = len(raadsleden_berichten(beurten))
            over_tokens = budget - gebruikt(verbruik)
            reserve, routering_kost = schat_verdict(), schat_routering()
            kosten = {r: schat_lid(r) for r in per_rol}
            goedkoopst = min(kosten.values())
            if gesproken >= BEURTENBUDGET:
                rol, vraag, reden = None, None, f"Beurtenbudget op ({BEURTENBUDGET} Raadslid-beurten)"
            elif over_tokens < reserve + routering_kost + goedkoopst:
                rol, vraag, reden = None, None, (f"Tokenbudget: nog {over_tokens} van {budget} tokens over; een keuze van de Koning (~{routering_kost}) "
                                                 f"plus een Raadslid-beurt (~{goedkoopst}) past niet meer naast de reserve van ~{reserve} voor het Verdict.")
            else:
                trace["aan_het_woord"] = "koning"
                bewaar("trace.json", trace)
                gemiddeld = int(sum(kosten.values()) / len(kosten))
                budget_tekst = (f"Tokenbudget: nog ongeveer {over_tokens} van {budget} tokens. Een Raadslid-beurt kost ongeveer {gemiddeld} tokens, "
                                f"en ~{reserve} is gereserveerd voor het Verdict: stop tijdig als het budget krap wordt.")
                mag_herbekijken = over_tokens >= reserve + 2 * routering_kost + goedkoopst
                voor = gebruikt(verbruik)
                rol, vraag, reden, open_vragen = await kies_volgende(beurten, leden, llm, verbruik, open_vragen, budget_tekst, mag_herbekijken)
                if gebruikt(verbruik) > voor:
                    kosten_koning.append(gebruikt(verbruik) - voor)
                if rol is not None:
                    over_na = budget - gebruikt(verbruik)
                    reserve = schat_verdict()
                    if over_na < kosten[rol] + reserve:
                        reden = (f"De Koning koos {namen[rol]} ({reden}), maar die beurt (~{kosten[rol]} tokens) past niet meer in het tokenbudget: "
                                 f"nog {over_na} van {budget} tokens over, ~{reserve} gereserveerd voor het Verdict.")
                        rol, vraag = None, None
            if rol is not None:
                ronde = gesproken // len(leden) + 1
            velden = {"aan": rol, "vraag": vraag, "reden": reden}
            if open_vragen:
                velden["open_vragen"] = open_vragen
            beurt(ronde, "koning", "routering", **velden)
            print(f"\n[Koning] {'stopt' if rol is None else '→ ' + namen[rol]}: {reden}")
            if vraag:
                print(f"         vraag: {vraag}")
            if rol is None:
                break

            lid, mcp_url, agent, context = per_rol[rol]
            prompt = f"Debat tot nu toe:\n\n{debat_voor_lid(beurten[:-1], namen)}\n\nVraag van de Koning aan jou: {vraag}"
            voor_lid = gebruikt(verbruik)
            trace["aan_het_woord"] = rol
            bewaar("trace.json", trace)
            r, fout = await draai_lid(agent, prompt, opties, lid.NAAM)
            al_gelogd = False
            eerste_beurt = not any(b["spreker"] == rol for b in raadsleden_berichten(beurten))
            if r is not None and mcp_url and eerste_beurt and not any("lees_kennisbron" in n for n, _ in toolcalls(r)):
                print(f"LET OP: {lid.NAAM} las zijn volledige Kennisbron niet; één herkansing.")
                for tool, args in toolcalls(r):
                    beurt(ronde, rol, "toolcall", tool=tool, argumenten=args, pad=mcp_url)
                tel_agent(verbruik, "klein", r.usage_details)
                try:
                    r = await agent.run(prompt + "\n\nLees eerst je volledige Kennisbron met lees_kennisbron, en antwoord dan pas.", options=opties)
                except Exception as e:
                    al_gelogd = True
                    print(f"LET OP: de herkansing van {lid.NAAM} mislukte ({e}); het eerste antwoord blijft staan.")
            if r is None:
                mislukt += 1
                if mislukt >= 2:
                    sys.exit(f"\nRun gestopt: twee Raadslid-beurten na elkaar mislukten ({kort_fout(fout)}).\n"
                             "Controleer OPENAI_BASE_URL, OPENAI_API_KEY en MODEL_KLEIN in .env, of probeer een ander model.")
                print(f"LET OP: {lid.NAAM} gaf geen antwoord; deze beurt telt niet mee voor het budget.")
                continue
            mislukt = 0

            calls = list(toolcalls(r))
            if not al_gelogd:
                tel_agent(verbruik, "klein", r.usage_details)
                for tool, args in calls:
                    beurt(ronde, rol, "toolcall", tool=tool, argumenten=args, pad=mcp_url)
            tekst = normaliseer_ids(re.sub(r"<think>.*?</think>", "", r.text or "", flags=re.S)).strip()
            ruw = None
            if len(tekst.split()) > MAX_WOORDEN:
                kort = await kort_in(llm, tekst, verbruik)
                if kort:
                    print(f"LET OP: {lid.NAAM} gaf {len(tekst.split())} woorden (met denkproces); ingekort tot {len(kort.split())}. Het origineel staat in de trace als ruwe_tekst.")
                    ruw, tekst = tekst, kort
            gelezen = toolresultaten(r) if mcp_url else context
            eigen = [i for i in vind_ids(tekst) if i.startswith(PREFIX[rol] + "-")]
            nieuw = [i for i in eigen if i in gelezen]
            bevestigd_pool.update(nieuw)
            bewijs = [i for i in eigen if i in bevestigd_pool]
            onbevestigd = [i for i in eigen if i not in bevestigd_pool]
            kosten_lid.setdefault(rol, []).append(gebruikt(verbruik) - voor_lid)
            trace["tokens"] = {"budget": budget, "gebruikt": gebruikt(verbruik)}
            beurt(ronde, rol, "bericht", tekst=tekst, bewijs=bewijs, onbevestigd=onbevestigd, **({"ruwe_tekst": ruw} if ruw else {}))
            print(f"\n[ronde {ronde}] {lid.NAAM}:\n{tekst}")
            print(f"         tokens: {gebruikt(verbruik)} van {budget}")
            if mcp_url and not calls:
                print(f"LET OP: {lid.NAAM} sprak zonder zijn Kennisbron te lezen.")
            if onbevestigd:
                print(f"LET OP: niet bevestigd in de Kennisbron van {lid.NAAM}: {', '.join(onbevestigd)}")

    trace["aan_het_woord"] = "koning"
    bewaar("trace.json", trace)
    per_eigenaar = {}
    for i in sorted(bevestigd_pool):
        per_eigenaar.setdefault(i[:3], []).append(i)
    id_lijst = "\n".join(f"- {namen.get(r, r)}: {', '.join(per_eigenaar.get(PREFIX[r], [])) or 'geen'}" for r in namen)
    gebruiker = (
        f"Raadsleden: {', '.join(f'{r} ({n})' for r, n in namen.items())}\n\n"
        f"Bevestigde ID's per Raadslid:\n{id_lijst}\n\n"
        f"Debat:\n\n{debat_tekst(beurten, namen)}\n\nStel nu het Council Verdict op."
    )
    try:
        data = await vraag_json(llm, KONING_VERDICT, gebruiker, verbruik)
    except Exception as e:
        print(f"LET OP: de Koning kon geen Verdict opstellen ({e}).")
        data = {}
    verdict, geschillen = maak_verdict(data, run_id, bevestigd_pool, set(namen))
    trace["geschillen"] = geschillen

    onbekend = [s for s in SLOTS if verdict["oorzaak"][s]["bewering"] is None]
    slot_tekst = "\n".join(
        f"- {s}: {verdict['oorzaak'][s]['bewering'] or 'onbekend'} ({', '.join(verdict['oorzaak'][s]['bewijs']) or 'geen bewijs'})" for s in SLOTS
    )
    beurt(ronde + 1, "koning", "bericht", tekst=f"{verdict['samenvatting']}\n\nOorzaak:\n{slot_tekst}")
    print(f"\n[Koning]:\n{verdict['samenvatting']}\n{slot_tekst}")
    if onbekend:
        print(f"LET OP: onbekend gebleven: {', '.join(onbekend)}")

    totaal = gebruikt(verbruik)
    trace["tokens"] = {"budget": tokenbudget(), "gebruikt": totaal}
    if totaal > tokenbudget():
        print(f"LET OP: de run gebruikte {totaal} tokens, meer dan het tokenbudget van {tokenbudget()}.")
    trace["status"], trace["aan_het_woord"] = "klaar", None
    bewaar("trace.json", trace)
    bewaar("verdict.json", verdict)

    print(f"\nKlaar: verdict.json en trace.json geschreven (run_id {run_id}).")
    print(f"Tokens: {gebruikt(verbruik)} van het tokenbudget {tokenbudget()}.")
    for model, v in verbruik.items():
        print(f"Verbruik {model}: {v['beurten']} beurten, {v['invoer']} tokens in ({v['gecached']} gecached), {v['uitvoer']} tokens uit")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    asyncio.run(run())


if __name__ == "__main__":
    main()
