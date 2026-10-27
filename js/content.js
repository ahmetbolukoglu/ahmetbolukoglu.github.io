// Oda içeriği (docs/room-config.md): theyvoice.com panelinden yönetilir, deploy gerekmez.
// Sıra: localStorage'daki son kopya (anında) → theyvoice.com/api/portfolio (canlı) → content/room.json (varsayılan).
// GitHub kaynaklı projelerin sürümü GitHub API'sinden okunur. Değişince abonelere yeni içerik gider.
window.RoomContent = (function () {
  const API = "https://theyvoice.com/api/portfolio", LOCAL = "content/room.json";
  const KEY = "devroom-content", GH_KEY = "devroom-gh", GH_TTL = 30 * 60e3, POLL = 3 * 60e3;
  const listeners = [];
  let raw = null, gh = {}, data = null, lastJson = "";

  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  gh = store.get(GH_KEY) || {};

  // güvenli adresler: https, mailto ya da bu sitedeki göreli yol
  const safeImg = u => typeof u === "string" && (/^https:\/\//.test(u) || /^(assets|content)\//.test(u)) ? u : "";
  const safeLink = u => typeof u === "string" && /^(https:\/\/|mailto:)/.test(u) ? u : "";
  const str = (v, d = "") => typeof v === "string" ? v : d;
  const arr = v => Array.isArray(v) ? v : [];
  const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const trDate = d => { const t = new Date(d); return isNaN(t) ? "" : `${t.getDate()} ${MONTHS[t.getMonth()]} ${t.getFullYear()}`; };
  const recent = d => d && Date.now() - new Date(d) < 7 * 864e5;
  const PLATFORM = { web: "Web", android: "Android", ios: "iOS", windows: "Windows", mac: "macOS", linux: "Linux", steam: "Steam" };
  const LINK = { web: "▶ Web'de oyna", android: "Google Play", ios: "App Store", steam: "Steam", website: "Web sitesi", discord: "Discord" };
  const STATUS = { released: "Yayında", beta: "Beta", coming_soon: "Yakında" };

  // TheyVoice projesi → çekmece dosyası
  function fromTheyVoice(p) {
    const v = p.latest && p.latest.version ? " · v" + String(p.latest.version).replace(/^v/i, "") : "";
    const links = Object.entries(p.links || {}).map(([k, u]) => [LINK[k] || k, safeLink(u)]).filter(l => l[1]);
    if (safeLink(p.url)) links.push(["TheyVoice sayfası", p.url]);
    return {
      name: str(p.title), status: (STATUS[p.status] || "Yayında") + v, type: str(p.tagline),
      release: trDate(p.released_at), platforms: arr(p.platforms).map(x => PLATFORM[x] || x).join(" · "),
      desc: str(p.description) || str(p.tagline), cover: safeImg(p.cover_url), icon: safeImg(p.icon_url),
      shots: arr(p.screenshots).map(safeImg).filter(Boolean), links, accent: str(p.accent),
      version: p.latest ? str(p.latest.version) : "", isNew: recent(p.latest && p.latest.published_at),
      update: p.latest ? str(p.latest.title) : "",
    };
  }
  // GitHub deposu → çekmece dosyası (son sürüm etiketi ya da son push)
  function fromGitHub(r) {
    if (!r) return {};
    const tag = r.release ? " · " + r.release : "";
    return {
      name: str(r.name), status: (r.release ? "Güncel" : "Son güncelleme " + trDate(r.pushed_at)) + tag,
      desc: str(r.description), release: trDate(r.created_at), tech: [r.language, ...arr(r.topics)].filter(Boolean),
      links: [["GitHub", safeLink(r.html_url)], ...(safeLink(r.homepage) ? [["Siteyi aç", r.homepage]] : [])].filter(l => l[1]),
      isNew: recent(r.pushed_at), version: str(r.release),
    };
  }
  // elle yazılmış alanlar (canlı veri yoksa) ve override (her zaman)
  function manual(o) {
    const out = {};
    for (const k of ["name", "status", "type", "release", "platforms", "desc", "accent"]) if (typeof o[k] === "string") out[k] = o[k];
    if (o.cover) out.cover = safeImg(o.cover);
    if (o.icon) out.icon = safeImg(o.icon);
    if (o.logo) out.logo = true;
    if (Array.isArray(o.tech)) out.tech = o.tech.map(String);
    if (Array.isArray(o.shots)) out.shots = o.shots.map(safeImg).filter(Boolean);
    if (Array.isArray(o.links)) out.links = o.links.map(l => [String(l[0]), safeLink(l[1])]).filter(l => l[1]);
    return out;
  }
  const EMPTY = { name: "", status: "", type: "", release: "", platforms: "", desc: "", tech: [], cover: "", icon: "", shots: [], links: [] };

  function normalize(room, tvProjects) {
    const tvBySlug = Object.fromEntries(arr(tvProjects).map(p => [p.slug, p]));
    const projects = arr(room.projects).slice(0, 24).map((o, i) => {
      if (!o || o.soon) return { id: "soon-" + i, soon: true, name: str(o && o.name, "Proje " + String(i + 1).padStart(2, "0")) };
      const ref = str(o.ref), [src, key] = ref.split(":");
      let live = null;
      if (src === "theyvoice" && tvBySlug[key]) live = fromTheyVoice(tvBySlug[key]);
      if (src === "github" && gh[key] && gh[key].data) live = fromGitHub(gh[key].data);
      const p = { ...EMPTY, ...manual(o) };
      // TheyVoice paneli asıl kaynak: canlı her alanı yazar. GitHub yalnız sürüm/durum verir, boş alanları doldurur
      const always = src === "github" ? ["status", "version", "isNew", "release"] : null;
      if (live) for (const [k, v] of Object.entries(live)) {
        if (!v || (Array.isArray(v) && !v.length)) continue;
        if (!always || always.includes(k) || !p[k] || (Array.isArray(p[k]) && !p[k].length)) p[k] = v;
        else if (k === "links") p.links = [...p.links, ...v.filter(l => !p.links.some(x => x[1] === l[1]))];
      }
      if (o.override) Object.assign(p, manual(o.override));
      if (!p.name) p.name = key || "Proje";
      return { ...p, id: ref || "p-" + i };
    });
    const tile = t => !t || t.soon ? { soon: true } : { image: safeImg(t.image), title: str(t.title), project: str(t.project), link: safeLink(t.link) };
    const f = room.featured || {};
    const tv = room.tv || {};
    let slides = arr(tv.slides).map(s => ({ image: safeImg(s && s.image), caption: str(s && s.caption) })).filter(s => s.image);
    if (!slides.length) {
      const pr = projects.find(p => p.id === tv.project) || projects.find(p => !p.soon && p.shots.length);
      if (pr) slides = pr.shots.map(image => ({ image, caption: pr.name }));
    }
    return {
      status: str(room.status, "yeni projelere açık"), neon: str(room.neon, "çay · kod · tekrar"),
      projects,
      featured: { center: tile(f.center), left: tile(f.left), right: tile(f.right) },
      gallery: Array.from({ length: 9 }, (_, i) => tile(arr(room.gallery)[i])),
      drawers: { projects: str(room.drawers && room.drawers.projects, "Drawer"), items: (room.drawers && room.drawers.items) || {} },
      screens: room.screens || {},
      customApps: arr(room.customApps).filter(a => a && /^[a-z0-9_-]{1,30}$/.test(a.key)).map(a => ({
        key: a.key, label: str(a.label, a.key), icon: str(a.icon, "📄"), color: /^#[0-9a-f]{6}$/i.test(a.color) ? a.color : "#7c3aed",
        title: str(a.title, a.label), text: str(a.text), image: safeImg(a.image), link: safeLink(a.link) })),
      tv: { mode: tv.mode === "marquee" ? "marquee" : "gameplay", title: str(tv.title), slides },
      news: arr(raw && raw.news).slice(0, 5).map(n => ({ title: str(n.title), url: safeLink(n.url), at: str(n.published_at) })).filter(n => n.title),
    };
  }

  function emit() {
    if (!raw) return;
    const next = normalize(raw.room || {}, raw.projects);
    const json = JSON.stringify(next);
    if (json === lastJson) return;
    lastJson = json; data = next;
    listeners.forEach(fn => { try { fn(data); } catch (e) { console.warn("RoomContent:", e); } });
  }

  async function getJSON(url, ms = 4500) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
    try { const r = await fetch(url, { signal: ctl.signal, cache: "no-cache" }); if (!r.ok) throw new Error(r.status); return await r.json(); }
    finally { clearTimeout(t); }
  }
  async function refresh() {
    let live = null, local = null;
    try { live = await getJSON(API); } catch {}
    if (!live || !live.room) { try { local = await getJSON(LOCAL); } catch {} }
    if (!live && !local) return;
    raw = { room: (live && live.room) || local, projects: (live && live.projects) || [], news: (live && live.news) || [], updatedAt: live && live.updatedAt };
    store.set(KEY, raw);
    emit();
    refreshGitHub();
  }
  // GitHub kaynaklı projeler: 30 dakikada bir (istek sınırı için önbellekli)
  async function refreshGitHub() {
    const repos = arr(raw && raw.room && raw.room.projects).map(o => str(o && o.ref)).filter(r => r.startsWith("github:")).map(r => r.slice(7));
    let changed = false;
    for (const repo of repos) {
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || (gh[repo] && Date.now() - gh[repo].at < GH_TTL)) continue;
      try {
        const r = await getJSON("https://api.github.com/repos/" + repo);
        let release = "";
        try { const rel = await getJSON("https://api.github.com/repos/" + repo + "/releases/latest"); release = str(rel.tag_name); } catch {}
        gh[repo] = { at: Date.now(), data: { name: r.name, description: r.description, html_url: r.html_url, homepage: r.homepage, language: r.language,
          topics: r.topics, pushed_at: r.pushed_at, created_at: r.created_at, release } };
        changed = true;
      } catch { gh[repo] = { at: Date.now(), data: gh[repo] && gh[repo].data }; }
    }
    if (changed) { store.set(GH_KEY, gh); emit(); }
  }

  raw = store.get(KEY);
  if (raw) emit();
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, POLL);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });

  return {
    get: () => data,
    on(fn) { listeners.push(fn); if (data) try { fn(data); } catch (e) { console.warn("RoomContent:", e); } },
    refresh,
    // önizleme: kaydetmeden bir oda ayarını uygular (panel önizlemesi ve deneme için)
    preview(room) { if (room && typeof room === "object") { raw = { ...(raw || {}), room }; emit(); } },
  };
})();
