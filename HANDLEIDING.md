# EM Services Instagram-feed

Eigen Instagram-feed voor [em-services.nl](https://www.em-services.nl), zonder Elfsight en zonder cookies van Meta.

**Hoe het werkt**
1. Elke dag om 05:17 UTC draait `.github/workflows/update-feed.yml`.
2. `fetch_feed.py` haalt de laatste 12 posts op via de Instagram-API, verkleint de foto's
   en schrijft `docs/feed.json` en `docs/img/`.
3. GitHub Pages publiceert de map `docs/` op https://feed.em-services.nl.
4. Op de website staat dit blok:

```html
<div id="ems-ig-feed"></div>
<script src="https://feed.em-services.nl/widget.js" defer></script>
```

**Geheime instellingen (Settings → Secrets and variables → Actions)**
- `IG_TOKEN`: Instagram-toegangssleutel. Wordt bij elke run automatisch verlengd.
- `GH_PAT`: fine-grained token met alleen toegang tot deze opslagplaats en het recht
  *Secrets: Read and write*. Nodig om de verlengde Instagram-sleutel op te slaan.

**Als het niet meer werkt**
- GitHub mailt je bij een mislukte run. Kijk in het tabblad *Actions* naar de foutmelding.
- Sleutel verlopen? Genereer een nieuwe in het Meta-dashboard (Instagram → API setup with
  Instagram login → Generate token) en zet die als nieuwe `IG_TOKEN`.
- `GH_PAT` verlopen? Maak een nieuwe aan met dezelfde rechten.
- Handmatig bijwerken: tabblad *Actions* → *Instagram-feed bijwerken* → *Run workflow*.

**Terug naar Elfsight**: zie `backup_elfsight_blok_2026-11-26.html`.
