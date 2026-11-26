/*
 * EM Services Instagram-feed
 * Gebruik op de website:
 *   <div id="ems-ig-feed"></div>
 *   <script src="https://feed.em-services.nl/widget.js" defer></script>
 * Alle beelden komen van feed.em-services.nl; er wordt niets van Instagram geladen
 * en er worden geen cookies geplaatst.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  var BASE = script ? script.src.replace(/widget\.js(\?.*)?$/, "") : "https://feed.em-services.nl/";
  var SHOW_FIRST = 8;

  var CSS = [
    ".ems-ig{--ems-accent:#003977;--ems-text:#323f4b;--ems-muted:#6b7280;font-family:inherit;color:var(--ems-text);max-width:1240px;margin:0 auto}",
    ".ems-ig *{box-sizing:border-box}",
    ".ems-ig__head{display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap;margin:0 0 24px}",
    ".ems-ig__who{display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit}",
    ".ems-ig__avatar{width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid #e1306c}",
    ".ems-ig__name{font-family:montserrat-bold,inherit;font-weight:700;font-size:18px;line-height:1.2}",
    ".ems-ig__handle{font-size:13px;color:var(--ems-muted)}",
    ".ems-ig__stats{display:flex;gap:20px;text-align:center;font-size:12px;color:var(--ems-muted)}",
    ".ems-ig__stats b{display:block;font-size:16px;color:var(--ems-text)}",
    ".ems-ig__btn{display:inline-block;padding:12px 22px;border-radius:2px;background:var(--ems-accent);color:#fff!important;text-decoration:none;font-family:montserrat-bold,inherit;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border:2px solid var(--ems-accent);cursor:pointer}",
    ".ems-ig__btn:hover,.ems-ig__btn:focus-visible{filter:brightness(1.15)}",
    ".ems-ig__grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}",
    "@media (max-width:900px){.ems-ig__grid{grid-template-columns:repeat(3,1fr)}}",
    "@media (max-width:560px){.ems-ig__grid{grid-template-columns:repeat(2,1fr)}.ems-ig__head{gap:14px}}",
    ".ems-ig__item{position:relative;display:block;aspect-ratio:1/1;overflow:hidden;background:#eee}",
    ".ems-ig__item[hidden]{display:none}",
    ".ems-ig__item img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s ease}",
    ".ems-ig__item:hover img,.ems-ig__item:focus-visible img{transform:scale(1.05)}",
    ".ems-ig__icon{position:absolute;top:10px;right:10px;width:22px;height:22px;color:#fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}",
    ".ems-ig__cap{position:absolute;inset:0;display:flex;align-items:flex-end;padding:14px;background:linear-gradient(transparent 40%,rgba(0,0,0,.75));color:#fff;font-size:13px;line-height:1.35;opacity:0;transition:opacity .25s ease}",
    ".ems-ig__item:hover .ems-ig__cap,.ems-ig__item:focus-visible .ems-ig__cap{opacity:1}",
    ".ems-ig__cap span{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}",
    ".ems-ig__foot{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:24px}",
    ".ems-ig__btn--ghost{background:transparent;color:var(--ems-accent)!important;border:2px solid var(--ems-accent)}",
    ".ems-ig__error{text-align:center;color:var(--ems-muted)}"
  ].join("");

  var ICON_VIDEO = '<svg class="ems-ig__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
  var ICON_ALBUM = '<svg class="ems-ig__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 3h11a3 3 0 0 1 3 3v11h-2V6a1 1 0 0 0-1-1H7z"/><rect x="3" y="7" width="14" height="14" rx="2"/></svg>';

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function num(n) {
    if (n == null) return "";
    return n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(".", ",") + "k" : String(n);
  }

  function render(el, data) {
    var p = data.profile || {};
    var posts = data.posts || [];
    var html = '<div class="ems-ig">';

    html += '<div class="ems-ig__head">';
    html += '<a class="ems-ig__who" href="' + esc(p.url) + '" target="_blank" rel="noopener">';
    if (p.avatar) html += '<img class="ems-ig__avatar" src="' + esc(BASE + p.avatar) + '" alt="" width="56" height="56">';
    html += '<span><span class="ems-ig__name">' + esc(p.name) + '</span><br><span class="ems-ig__handle">@' + esc(p.username) + "</span></span></a>";
    html += '<div class="ems-ig__stats">';
    if (p.posts != null) html += "<div><b>" + num(p.posts) + "</b>berichten</div>";
    if (p.followers != null) html += "<div><b>" + num(p.followers) + "</b>volgers</div>";
    if (p.following != null) html += "<div><b>" + num(p.following) + "</b>volgend</div>";
    html += "</div>";
    html += '<a class="ems-ig__btn" href="' + esc(p.url) + '" target="_blank" rel="noopener">Volgen op Instagram</a>';
    html += "</div>";

    html += '<div class="ems-ig__grid">';
    posts.forEach(function (post, i) {
      var label = post.caption ? post.caption.split("\n")[0] : "Instagram-post van " + (p.name || "EM Services");
      var icon = post.type === "VIDEO" ? ICON_VIDEO : post.type === "CAROUSEL_ALBUM" ? ICON_ALBUM : "";
      html += '<a class="ems-ig__item" href="' + esc(post.link) + '" target="_blank" rel="noopener"' +
        (i >= SHOW_FIRST ? " hidden" : "") + ' aria-label="' + esc(label.slice(0, 120)) + ' (opent Instagram)">';
      html += '<img src="' + esc(BASE + post.image) + '" alt="' + esc(label.slice(0, 120)) + '" loading="lazy" width="640" height="640">';
      html += icon;
      if (post.caption) html += '<span class="ems-ig__cap"><span>' + esc(post.caption) + "</span></span>";
      html += "</a>";
    });
    html += "</div>";

    html += '<div class="ems-ig__foot">';
    if (posts.length > SHOW_FIRST) html += '<button type="button" class="ems-ig__btn ems-ig__btn--ghost" data-ems-more>Meer laden</button>';
    html += '<a class="ems-ig__btn" href="' + esc(p.url) + '" target="_blank" rel="noopener">Bekijk alles op Instagram</a>';
    html += "</div></div>";

    el.innerHTML = html;

    var more = el.querySelector("[data-ems-more]");
    if (more) more.addEventListener("click", function () {
      el.querySelectorAll(".ems-ig__item[hidden]").forEach(function (a) { a.hidden = false; });
      more.remove();
    });
  }

  function init() {
    var el = document.getElementById("ems-ig-feed");
    if (!el) return;
    if (!document.getElementById("ems-ig-style")) {
      var st = document.createElement("style");
      st.id = "ems-ig-style";
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    fetch(BASE + "feed.json", { cache: "no-cache", credentials: "omit" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) { render(el, data); })
      .catch(function () {
        el.innerHTML = '<div class="ems-ig"><p class="ems-ig__error">Bekijk ons werk op <a href="https://www.instagram.com/emservices/" target="_blank" rel="noopener">Instagram</a>.</p></div>';
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
