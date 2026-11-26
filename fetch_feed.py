"""
Haalt de laatste Instagram-posts van EM Services op en zet ze klaar voor de website.

Draait dagelijks via GitHub Actions (.github/workflows/update-feed.yml).
- Leest de Instagram-toegangssleutel uit de geheime instelling IG_TOKEN.
- Verlengt de sleutel elke run (hij is 60 dagen geldig) en slaat de nieuwe
  sleutel weer op als geheime instelling, via GH_PAT.
- Downloadt de foto's (bij reels de stilstaande thumbnail), verkleint ze en
  schrijft docs/feed.json. De website laadt daarna alles vanaf
  feed.em-services.nl, dus bezoekers maken geen contact met Instagram.
"""

import base64
import io
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from PIL import Image

API = "https://graph.instagram.com"
API_VERSION = "v26.0"
MAX_POSTS = 12          # aantal posts dat de website bewaart
IMG_SIZE = 640          # breedte/hoogte van de vierkante thumbnails in px

ROOT = Path(__file__).resolve().parent
DOCS = ROOT / "docs"
IMG_DIR = DOCS / "img"


def log(msg: str) -> None:
    print(msg, flush=True)


def refresh_token(token: str) -> str:
    """Verleng de sleutel met 60 dagen. Mislukt dat, ga door met de oude."""
    try:
        r = requests.get(
            f"{API}/refresh_access_token",
            params={"grant_type": "ig_refresh_token", "access_token": token},
            timeout=30,
        )
        r.raise_for_status()
        new = r.json().get("access_token")
        if new:
            days = int(r.json().get("expires_in", 0)) // 86400
            log(f"Sleutel verlengd, nog {days} dagen geldig.")
            return new
    except requests.RequestException as e:
        log(f"Let op: sleutel verlengen mislukt ({e}). Ik gebruik de huidige sleutel.")
    return token


def save_token_to_github(token: str) -> None:
    """Sla de verlengde sleutel op als geheime instelling IG_TOKEN."""
    pat = os.environ.get("GH_PAT")
    repo = os.environ.get("GITHUB_REPOSITORY")
    if not pat or not repo:
        log("Let op: GH_PAT ontbreekt, de verlengde sleutel wordt niet opgeslagen.")
        return
    from nacl import encoding, public

    headers = {
        "Authorization": f"Bearer {pat}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    key = requests.get(
        f"https://api.github.com/repos/{repo}/actions/secrets/public-key",
        headers=headers, timeout=30,
    )
    key.raise_for_status()
    k = key.json()
    sealed = public.SealedBox(public.PublicKey(k["key"].encode(), encoding.Base64Encoder()))
    encrypted = base64.b64encode(sealed.encrypt(token.encode())).decode()
    r = requests.put(
        f"https://api.github.com/repos/{repo}/actions/secrets/IG_TOKEN",
        headers=headers,
        json={"encrypted_value": encrypted, "key_id": k["key_id"]},
        timeout=30,
    )
    r.raise_for_status()
    log("Verlengde sleutel opgeslagen in GitHub.")


def get(path: str, token: str, **params) -> dict:
    params["access_token"] = token
    r = requests.get(f"{API}/{API_VERSION}/{path}", params=params, timeout=30)
    if r.status_code != 200:
        # Toon de foutmelding van Meta, maar nooit de sleutel zelf.
        raise SystemExit(f"Instagram-API gaf fout {r.status_code}: {r.text[:500]}")
    return r.json()


def image_url_for(post: dict, token: str) -> str | None:
    """Kies het beste stilstaande beeld voor een post."""
    if post.get("media_type") == "VIDEO":
        return post.get("thumbnail_url") or post.get("media_url")
    if post.get("media_type") == "CAROUSEL_ALBUM" and not post.get("media_url"):
        children = get(f"{post['id']}/children", token,
                       fields="media_type,media_url,thumbnail_url").get("data", [])
        for c in children:
            url = c.get("thumbnail_url") if c.get("media_type") == "VIDEO" else c.get("media_url")
            if url:
                return url
        return None
    return post.get("media_url") or post.get("thumbnail_url")


def save_square_jpeg(data: bytes, dest: Path, size: int) -> None:
    img = Image.open(io.BytesIO(data)).convert("RGB")
    w, h = img.size
    s = min(w, h)
    img = img.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2))
    img = img.resize((size, size), Image.LANCZOS)
    img.save(dest, "JPEG", quality=82, optimize=True, progressive=True)


def download(url: str) -> bytes:
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    return r.content


def main() -> None:
    token = os.environ.get("IG_TOKEN", "").strip()
    if not token:
        sys.exit("IG_TOKEN ontbreekt. Zet de Instagram-sleutel als geheime instelling in GitHub.")

    new_token = refresh_token(token)
    if new_token != token:
        save_token_to_github(new_token)
        token = new_token

    IMG_DIR.mkdir(parents=True, exist_ok=True)

    profile = get("me", token, fields="username,name,profile_picture_url,followers_count,follows_count,media_count")
    media = get("me/media", token, limit=MAX_POSTS,
                fields="id,caption,media_type,media_url,thumbnail_url,permalink,timestamp").get("data", [])

    posts, keep = [], set()
    for p in media[:MAX_POSTS]:
        url = image_url_for(p, token)
        if not url or not p.get("permalink"):
            log(f"Post {p.get('id')} overgeslagen: geen beeld of link.")
            continue
        name = f"{p['id']}.jpg"
        dest = IMG_DIR / name
        if not dest.exists():
            try:
                save_square_jpeg(download(url), dest, IMG_SIZE)
                log(f"Nieuw beeld opgeslagen: {name}")
            except Exception as e:  # één kapotte foto mag de rest niet tegenhouden
                log(f"Beeld voor post {p['id']} mislukt: {e}")
                continue
        keep.add(name)
        caption = (p.get("caption") or "").strip()
        posts.append({
            "id": p["id"],
            "type": p.get("media_type", "IMAGE"),
            "link": p["permalink"],
            "image": f"img/{name}",
            "caption": caption[:220],
            "timestamp": p.get("timestamp"),
        })

    avatar = None
    if profile.get("profile_picture_url"):
        try:
            save_square_jpeg(download(profile["profile_picture_url"]), IMG_DIR / "profiel.jpg", 160)
            avatar = "img/profiel.jpg"
            keep.add("profiel.jpg")
        except Exception as e:
            log(f"Profielfoto mislukt: {e}")

    # Oude foto's opruimen die niet meer in de feed staan.
    for f in IMG_DIR.glob("*.jpg"):
        if f.name not in keep:
            f.unlink()
            log(f"Oud beeld verwijderd: {f.name}")

    if not posts:
        sys.exit("Geen posts opgehaald; de bestaande feed blijft ongewijzigd staan.")

    feed = {
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "profile": {
            "username": profile.get("username"),
            "name": profile.get("name") or profile.get("username"),
            "avatar": avatar,
            "posts": profile.get("media_count"),
            "followers": profile.get("followers_count"),
            "following": profile.get("follows_count"),
            "url": f"https://www.instagram.com/{profile.get('username')}/",
        },
        "posts": posts,
    }
    (DOCS / "feed.json").write_text(json.dumps(feed, ensure_ascii=False, indent=1), encoding="utf-8")
    log(f"feed.json bijgewerkt met {len(posts)} posts.")


if __name__ == "__main__":
    main()
