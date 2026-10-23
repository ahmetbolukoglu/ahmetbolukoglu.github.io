// Dev-room 3D: models/room.glb (Blender'da Python ile üretilir).
// Köşe rengi maskeleri (R = AO, G = kir, B = kenar aşınması, A = parça tonu) shader'da okunur.
// WebGL yoksa ya da model yüklenemezse SVG oda olduğu gibi kalır.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const frame = document.getElementById("room");
const canvas = document.getElementById("room3d");
const loaderEl = document.getElementById("roomLoader");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Blender (x, y, z) -> three (x, z, -y)
const B = (x, y, z) => new THREE.Vector3(x, z, -y);

const MATS = {
  W_Wall: { color: "#2b2657", roughness: 0.95 },
  W_Floor: { color: "#7a5434", roughness: 0.7, map: "planks" },
  W_Wood: { color: "#ffffff", roughness: 0.55, map: "oak" },
  W_WoodDark: { color: "#4a2f1c", roughness: 0.65 },
  W_Rug: { color: "#3a2a6e", roughness: 1, map: "rug" },
  W_Black: { color: "#0d0c16", roughness: 0.35 },
  W_Alu: { color: "#c3c7d1", roughness: 0.32, metalness: 0.85 },
  W_Plastic: { color: "#1f1b3b", roughness: 0.5 },
  W_Glass: { color: "#cfe8ff", roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false },
  W_Tea: { color: "#c2410c", roughness: 0.15, transparent: true, opacity: 0.92 },
  W_Ceramic: { color: "#eeebf8", roughness: 0.35 },
  W_Lamp: { color: "#7c3aed", roughness: 0.45 },
  W_Duck: { color: "#facc15", roughness: 0.45 },
  W_Beak: { color: "#f97316", roughness: 0.5 },
  W_Leaf: { color: "#22a355", roughness: 0.6, side: THREE.DoubleSide },
  W_Pot: { color: "#c2410c", roughness: 0.8 },
  W_Gold: { color: "#fbbf24", roughness: 0.28, metalness: 1 },
  W_LED: { color: "#5eead4", emissive: "#5eead4", emissiveIntensity: 2.5 },
  W_Ball: { color: "#f8fafc", roughness: 0.55, map: "ball" },
  W_Book_purple: { color: "#7c3aed", roughness: 0.7 }, W_Book_blue: { color: "#2563eb", roughness: 0.7 },
  W_Book_red: { color: "#dc2626", roughness: 0.7 }, W_Book_cyan: { color: "#0891b2", roughness: 0.7 },
  W_Book_green: { color: "#059669", roughness: 0.7 }, W_Book_pink: { color: "#db2777", roughness: 0.7 },
  W_Book_yellow: { color: "#eab308", roughness: 0.7 },
  W_Folder: { color: "#e8c98a", roughness: 0.85 }, W_Folder2: { color: "#d9b56f", roughness: 0.85 },
  W_FolderRed: { color: "#c2410c", roughness: 0.8 },
  W_Pages: { color: "#efe4cb", roughness: 0.95 },
  W_Notch: { color: "#1a120b", roughness: 1 }, W_Mat: { color: "#26282e", roughness: 1 }, W_Grill: { color: "#0c0c10", roughness: 1 },
  W_Grey: { color: "#6b7280", roughness: 0.5 }, W_White: { color: "#eef0f4", roughness: 0.35 },
  W_GlassDark: { color: "#0b1220", roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false },
  W_RGB: { color: "#0b0b10", emissive: "#38bdf8", emissiveIntensity: 3.5 },
  W_Keys: { color: "#1b1c24", roughness: 0.6, emissive: "#1e3a8a", emissiveIntensity: 0.25 },
  W_KeyGlow: { color: "#0b0b10", emissive: "#38bdf8", emissiveIntensity: 1.6 },
  W_Bottle: { color: "#60a5fa", roughness: 0.1, transparent: true, opacity: 0.5, depthWrite: false },
  W_Fabric: { color: "#b9a68a", roughness: 1 }, W_WoodLight: { color: "#d9b98a", roughness: 0.8 },
  W_Paper: { color: "#f5f3ff", roughness: 0.9 },
  W_PhoneBody: { color: "#2b2a31", roughness: 0.3, metalness: 0.7 }, W_LEDGreen: { color: "#22c55e", emissive: "#22c55e", emissiveIntensity: 2.5 },
  W_Chair: { color: "#1b1b21", roughness: 0.75 }, W_ChairAccent: { color: "#dc2626", roughness: 0.6 },
  W_Gun: { color: "#6b7079", roughness: 0.35, metalness: 0.8 }, W_FanBlade: { color: "#2e323a", roughness: 0.5, emissive: "#ffffff", emissiveIntensity: 0.8 }, W_FanHub: { color: "#d6dae0", roughness: 0.4 },
  W_KbPlate: { color: "#16171c", roughness: 0.4, metalness: 0.6 }, W_OLED: { color: "#e0f2fe", emissive: "#bae6fd", emissiveIntensity: 1.4 },
  W_Graphite: { color: "#3b3e44", roughness: 0.6 }, W_DSWhite: { color: "#f1f2f4", roughness: 0.45 }, W_DSBlack: { color: "#16171b", roughness: 0.5 },
  W_DSLight: { color: "#3b82f6", emissive: "#3b82f6", emissiveIntensity: 3 }, W_LEDAmber: { color: "#f59e0b", emissive: "#f59e0b", emissiveIntensity: 2.5 },
  W_Steel: { color: "#1c1d21", roughness: 0.3, metalness: 0.85 }, W_Cushion: { color: "#121216", roughness: 1 }, W_Elastic: { color: "#22232a", roughness: 0.9 },
  W_MonBack: { color: "#2a2c31", roughness: 0.45 },
  W_Cat: { color: "#d9822b", roughness: 0.95 }, W_CatDark: { color: "#8a4a14", roughness: 0.95 }, W_CatWhite: { color: "#f5efe6", roughness: 0.95 },
};
// raftaki kitaplar: her biri bir yetenek alanı (tıklanınca masaüstünde o kategori açılır)
const BOOKS = {
  net: { title: ".NET Core & C#", sub: "10+ yıl · ana dilim", cat: "backend", color: "#5b21b6", icon: "C#" },
  micro: { title: "Mikroservis Mimarisi", sub: "gRPC · Event Bus · FastEndpoints", cat: "backend", color: "#1e40af", icon: "{ }" },
  redis: { title: "Redis & Performans", sub: "Cache · Prometheus · Grafana · k6", cat: "data", color: "#991b1b", icon: "⚡" },
  sql: { title: "SQL & Veritabanı", sub: "MSSQL · PostgreSQL · EF · Dapper", cat: "data", color: "#155e75", icon: "DB" },
  grpc: { title: "BaaS & Real-time", sub: "Supabase · WebSockets · Edge Functions", cat: "devops", color: "#065f46", icon: "RT" },
  ai: { title: "Yapay Zekâ & MCP", sub: "Agentic sistemler · Claude Code · Cursor", cat: "ai", color: "#9d174d", icon: "AI" },
  front: { title: "React & TypeScript", sub: "React · Angular · Blazor · Ionic", cat: "frontend", color: "#075985", icon: "</>" },
  devops: { title: "DevOps & CI/CD", sub: "Azure DevOps · GitHub · Jenkins", cat: "devops", color: "#9a3412", icon: "CI" },
  game: { title: "Oyun & 3D", sub: "Canvas/WebGL · Blender Python API", cat: "fun", color: "#854d0e", icon: "3D" },
};
for (const [id, b] of Object.entries(BOOKS)) MATS["W_Book_" + id] = { color: b.color, roughness: 0.55 };
const sfx = (name, ...a) => window.Sfx && window.Sfx.play(name, ...a);
const jump = y => (window.scrollToY ? window.scrollToY(y) : scrollTo({ top: y, behavior: "instant" }));
const boot = window.Boot || { progress() {}, ready() {}, entered: true };

// scroll turu durakları (Blender koordinatı) ve yazıları
const STOPS = [
  { pos: [0.15, -1.5, 1.42], look: [0.18, 1.3, 1.22] },
  { pos: [-0.95, 0.45, 1.7], look: [-1.4, 5.0, 1.75], n: "01", h: "Üsküdar'dan Boğaz'a", p: "Kız Kulesi'ne bakan bir oda. 10 yılı aşkın süredir kod burada demleniyor." },
  { pos: [0.12, 0.05, 1.12], look: [0.12, 1.3, 1.07], n: "02", h: "49 inç masaüstü", p: ".NET Core, C#, mikroservisler. Ekrana tıkla: README, yetenekler ve terminal." },
  { pos: [-0.42, 0.5, 1.02], look: [-0.35, 1.0, 0.8], n: "03", h: "Çay · kod · tekrar", p: "Performans, ölçeklenebilirlik ve sürdürülebilir kod. Bir de bol çay ve lastik ördek." },
  { pos: [0.835, 0.02, 1.08], look: [0.835, 0.72, 0.6], n: "04", h: "Projeler", p: "Çekmecede yeni projeler hazırlanıyor. Tıkla, dosyalara göz at: hepsi coming soon.", drawer: true },
  { pos: [0.6, 0.35, 1.25], look: [0.92, 1.2, 1.0], n: "05", h: "Kasa ve RGB", p: "TUF GT502, RTX 4090 Suprim, 360 sıvı soğutma ve 10 RGB fan. Derleme hızlı, ışıklar daha hızlı." },
  { pos: [0.78, 0.15, 1.62], look: [1.45, 1.5, 1.58], n: "06", h: "Kitaplık", p: "Yapay zekâ, MCP, Redis, gRPC… Yetenekler rafta dizili." },
  { pos: [-0.45, -0.6, 1.3], look: [-1.95, 0.15, 1.25], n: "07", h: "Oyun molası", p: "65 inç TV ve PS5. Kod bitince bir maç." },
  { pos: [0.15, -1.5, 1.42], look: [0.18, 1.3, 1.22] },
];
const SCREENS = ["W_Screen_iMac", "W_Screen_Left", "W_Screen_TV", "W_Screen_Phone", "W_Screen_Watch", "W_Cert"];
const CLICK = ["iMac", "Monitor2", "Phone", "Shelf", "Tea", "Duck", "Ball", "Window", "Cert", "Clock", "Neon", "Drawer", "Keyboard", "PC", "TV", "PS5", "Controllers", "Headphones", "Bottle", "Modem", "Watch", "Chair", "Cat", "Mouse"];
// imlecin yanında görünen adlar
const NAMES = { iMac: "49\" masaüstü", Monitor2: "CV · 27\"", Phone: "İletişim · S22", Shelf: "Kitaplık", Tea: "Çay", Duck: "🦆 Ördeğe sor", Ball: "Top", Window: "Boğaz manzarası",
  Cert: "Sertifika", Clock: "Saat", Neon: "Neon", Drawer: "Projeler", Keyboard: "Apex 7 · terminal", PC: "TUF GT502 · RTX 4090", TV: "65\" TV", PS5: "PS5", Controllers: "DualSense ×2",
  Headphones: "Arctis 7+ · müzik", Bottle: "Su", Modem: "Modem", Watch: "Akıllı saat", Chair: "Koltuk", Cat: "😺 Tekir", Mouse: "MX Master 3" };

function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
  catch { return false; }
}

// ---------------------------------------------------------------- canvas dokuları

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.anisotropy = 4;
  tex.redraw = (...a) => { draw(g, w, h, ...a); tex.needsUpdate = true; };
  tex.redraw();
  return tex;
}

const PATTERNS = {
  oak: () => {
    const t = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = "#a8743f"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        const y = (i * 5.7) % h, l = 38 + ((i * 37) % 17);
        g.strokeStyle = `hsla(28, 45%, ${l}%, .55)`; g.lineWidth = 1 + (i % 3);
        g.beginPath(); g.moveTo(0, y);
        for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x / 70 + i) * 4 + Math.sin(x / 23 + i * 2) * 1.5);
        g.stroke();
      }
      for (let k = 0; k < 6; k++) {
        const x = (k * 191) % w, y = (k * 311) % h;
        g.strokeStyle = "rgba(60,30,10,.35)";
        for (let r = 4; r < 26; r += 4) { g.beginPath(); g.ellipse(x, y, r * 2.4, r * 0.7, 0, 0, 7); g.stroke(); }
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.4, 1.4);
    return t;
  },
  planks: () => {
    const t = canvasTex(512, 512, (g, w, h) => {
      for (let i = 0; i < 5; i++) {
        const l = 30 + ((i * 37) % 13);
        g.fillStyle = `hsl(28, 38%, ${l}%)`; g.fillRect(i * w / 5, 0, w / 5, h);
        g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(i * w / 5, 0, 3, h);
        const cut = ((i * 211) % 400) + 50; g.fillRect(i * w / 5, cut, w / 5, 3);
        g.strokeStyle = "rgba(0,0,0,.08)";
        for (let k = 0; k < 14; k++) { g.beginPath(); const x = i * w / 5 + 6 + k * 7; g.moveTo(x, 0); g.bezierCurveTo(x + 4, h * .3, x - 4, h * .6, x + 2, h); g.stroke(); }
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  },
  rug: () => {
    const t = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(167,139,250,.55)"; g.lineWidth = 6; g.setLineDash([14, 12]);
      g.strokeRect(20, 20, w - 40, h - 40);
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.4, 0.6);
    return t;
  },
  ball: () => canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#15132e";
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
      const x = (i + (j % 2) * .5) * w / 6 * 1.0, y = 20 + j * 44;
      g.beginPath();
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; g.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11); }
      g.fill();
    }
  }),
};

// İstanbul saati ve mevsime göre yaklaşık gün doğumu / batımı (?saat=19.5 ile denenebilir)
function istTime() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  const q = parseFloat(new URLSearchParams(location.search).get("saat"));
  const h = Number.isFinite(q) ? q % 24 : d.getHours() + d.getMinutes() / 60;
  const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  const k = Math.sin((doy - 80) / 365 * Math.PI * 2);
  const half = 6.0 + 1.55 * k;  // gün uzunluğunun yarısı (41° K); öğle UTC+3 ile ~13:00
  return { h, sr: 13 - half, ss: 13 + half };
}
// gökyüzü durakları: üst, orta, ufuk, deniz, uzak siluet, karanlık (0 gündüz … 1 gece)
const PAL = {
  night: ["#050818", "#0e1338", "#241c52", "#070a20", "#120f30", 1],
  predawn: ["#0d1440", "#33306e", "#8a4f78", "#141533", "#1d1840", 0.8],
  dawn: ["#3a5aa0", "#d58fa8", "#ffc58e", "#4a5a8a", "#4a3f6a", 0.35],
  morning: ["#4a8ad6", "#8ec2ee", "#e2eef8", "#3c7ab8", "#7d8fb4", 0],
  noon: ["#3b82e0", "#78b6f0", "#d2e8f8", "#2f6fb0", "#8496ba", 0],
  afternoon: ["#4683d2", "#92bee8", "#f3dcb6", "#3a72a8", "#74789c", 0],
  golden: ["#3e5ca6", "#e8a070", "#ffd27a", "#6a6a90", "#3c3256", 0.1],
  sunset: ["#2a2d6c", "#c9587a", "#ff8a48", "#4a3a6a", "#261c40", 0.35],
  blue: ["#111a4a", "#2c3678", "#6c4f8e", "#141a40", "#161236", 0.75],
};
const mixHex = (a, b, t) => {
  const p = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)), A = p(a), B = p(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
function skyPalette() {
  const { h, sr, ss } = istTime();
  const keys = [[sr - 1.6, "night"], [sr - 0.6, "predawn"], [sr + 0.25, "dawn"], [sr + 1.6, "morning"], [(sr + ss) / 2, "noon"],
    [ss - 2.2, "afternoon"], [ss - 0.8, "golden"], [ss + 0.05, "sunset"], [ss + 0.7, "blue"], [ss + 1.6, "night"]];
  let a = keys[keys.length - 1], b = keys[0], t = 0;
  for (let i = 0; i < keys.length - 1; i++) if (h >= keys[i][0] && h < keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; }
  if (a === keys[keys.length - 1]) t = 0; else t = (h - a[0]) / (b[0] - a[0]);
  const A = PAL[a[1]], Bp = PAL[b[1]];
  const c = A.slice(0, 5).map((x, i) => mixHex(x, Bp[i], t));
  return { top: c[0], mid: c[1], hor: c[2], sea: c[3], sil: c[4], dark: A[5] + (Bp[5] - A[5]) * t, h, sr, ss };
}
const rnd1 = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function skyTexture() {
  let last = skyPalette();
  const tex = canvasTex(2048, 1024, (g, w, h, o = {}) => {
    const P = last = skyPalette(), dk = P.dark, hz = 610;
    // gökyüzü
    const sky = g.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, P.top); sky.addColorStop(0.55, P.mid); sky.addColorStop(1, P.hor);
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    if (dk > 0.3) {  // yıldızlar
      g.fillStyle = "#fff";
      for (let i = 0; i < 220; i++) { g.globalAlpha = (dk - 0.3) * (0.4 + rnd1(i) * 0.6); g.fillRect(rnd1(i + 500) * w, rnd1(i + 900) * (hz - 120), 1.5 + rnd1(i + 7) * 1.5, 1.5 + rnd1(i + 7) * 1.5); }
      g.globalAlpha = 1;
    }
    // güneş: öğleden sonra batıda, tarihi yarımadanın arkasına iner (sabah arkamızda kalır)
    const p = (P.h - P.sr) / (P.ss - P.sr);
    let sun = null;
    if (p > 0.42 && p < 1.03) {
      const q = Math.min(1, (p - 0.42) / 0.6), alt = Math.max(0, Math.sin(Math.PI * Math.min(p, 1)));
      sun = { x: 1500 - q * 560, y: hz + 6 - alt * 470, low: 1 - alt };
      const gl = g.createRadialGradient(sun.x, sun.y, 10, sun.x, sun.y, 360);
      gl.addColorStop(0, `rgba(255,226,170,${0.55 + sun.low * 0.3})`); gl.addColorStop(1, "rgba(255,200,140,0)");
      g.fillStyle = gl; g.fillRect(sun.x - 360, sun.y - 360, 720, 720);
      g.fillStyle = mixHex("#fffbe8", "#ff9a52", sun.low); g.beginPath(); g.arc(sun.x, sun.y, 36, 0, 7); g.fill();
    }
    if (dk > 0.5) {  // ay
      const mx = 560 + ((P.h + 24 - P.ss) % 24) / 12 * 900, my = 150 + Math.abs(((P.h + 24 - P.ss) % 24) - 6) * 18;
      const mg = g.createRadialGradient(mx, my, 8, mx, my, 150); mg.addColorStop(0, `rgba(255,247,214,${0.45 * dk})`); mg.addColorStop(1, "rgba(255,247,214,0)");
      g.fillStyle = mg; g.fillRect(mx - 150, my - 150, 300, 300);
      g.globalAlpha = dk; g.fillStyle = "#fff4cc"; g.beginPath(); g.arc(mx, my, 34, 0, 7); g.fill();
      g.fillStyle = P.top; g.beginPath(); g.arc(mx + 15, my - 9, 30, 0, 7); g.fill(); g.globalAlpha = 1;
      if (o.shoot) { g.strokeStyle = "#fff"; g.lineWidth = 4; g.beginPath(); g.moveTo(o.shoot.x, o.shoot.y); g.lineTo(o.shoot.x + 120, o.shoot.y - 60); g.stroke(); }
    }
    // bulutlar (yavaşça kayar), renkleri saate göre
    const drift = (Date.now() / 60000 * 3) % w;
    for (let i = 0; i < 7; i++) {
      const cx = (rnd1(i + 40) * w + drift) % (w + 400) - 200, cy = 90 + rnd1(i + 60) * 300, cw = 140 + rnd1(i + 80) * 200;
      g.fillStyle = dk > 0.6 ? `rgba(40,40,80,${0.35})` : mixHex("#ffffff", P.hor, 0.35 + dk * 0.5);
      g.globalAlpha = dk > 0.6 ? 1 : 0.55;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(cx + (k - 1.5) * cw * 0.32, cy - Math.sin(k * 1.7) * 14, cw * 0.32, 26 + k % 2 * 10, 0, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    }
    // tarihi yarımada silueti: Sarayburnu/Topkapı, Ayasofya, Sultanahmet (6 minare), Süleymaniye, Galata
    const sil = P.sil, glow = dk > 0.4;
    g.fillStyle = sil;
    g.beginPath(); g.moveTo(0, hz);
    for (let x = 0; x <= w; x += 32) g.lineTo(x, hz - 18 - Math.max(0, Math.sin((x - 300) / 380)) * 34 - Math.sin(x / 61) * 4);
    g.lineTo(w, hz); g.fill();
    const minaret = (x, base, ht, wd = 7) => {
      g.fillRect(x - wd / 2, base - ht, wd, ht); g.fillRect(x - wd / 2 - 2, base - ht * 0.72, wd + 4, 4);
      g.beginPath(); g.moveTo(x - wd / 2 - 1, base - ht); g.lineTo(x, base - ht - wd * 4.2); g.lineTo(x + wd / 2 + 1, base - ht); g.fill();
    };
    const dome = (x, base, r, hgt = 0.62) => { g.beginPath(); g.ellipse(x, base, r, r * hgt * 1.4, 0, Math.PI, 0); g.fill(); g.fillRect(x - 1.5, base - r * hgt * 1.4 - 12, 3, 12); };
    const mosque = (x, r, mins, tall) => {
      const base = hz - 30;
      g.fillRect(x - r * 1.9, base - 22, r * 3.8, 30);
      dome(x - r * 1.15, base - 20, r * 0.42); dome(x + r * 1.15, base - 20, r * 0.42);
      dome(x - r * 0.62, base - 26, r * 0.55); dome(x + r * 0.62, base - 26, r * 0.55);
      g.fillRect(x - r * 0.9, base - 40, r * 1.8, 20); dome(x, base - 40, r);
      mins.forEach(dx => minaret(x + dx * r, base + 4, tall));
    };
    // Sarayburnu ve Topkapı (alçak, ağaçlı)
    for (let k = 0; k < 14; k++) { g.beginPath(); g.arc(380 + k * 22, hz - 26 - rnd1(k) * 10, 16 + rnd1(k + 3) * 8, 0, 7); g.fill(); }
    g.fillRect(560, hz - 70, 18, 50); g.beginPath(); g.moveTo(556, hz - 70); g.lineTo(569, hz - 96); g.lineTo(582, hz - 70); g.fill();
    mosque(800, 58, [-1.85, -1.55, 1.55, 1.85], 150);                    // Ayasofya: kalın 4 minare, büyük kubbe
    mosque(990, 50, [-2.3, -1.6, -1.25, 1.25, 1.6, 2.3], 165);          // Sultanahmet: 6 ince minare
    mosque(1300, 44, [-1.9, -1.5, 1.5, 1.9], 140);                       // Süleymaniye
    g.fillRect(1640, hz - 150, 30, 120); g.fillRect(1636, hz - 160, 38, 12);   // Galata
    g.beginPath(); g.moveTo(1634, hz - 160); g.lineTo(1655, hz - 205); g.lineTo(1676, hz - 160); g.fill();
    for (let k = 0; k < 40; k++) { const x = 300 + k * 44 + rnd1(k + 20) * 20, bh = 14 + rnd1(k + 30) * 26; g.fillRect(x, hz - 28 - bh, 30, bh + 10); }
    if (glow) {  // gece: camiler ışıklandırılmış, şehir ışıkları
      const a = Math.min(1, (dk - 0.4) * 1.8);
      g.globalAlpha = a * 0.55; g.fillStyle = "#f6c56b";
      [[800, 58], [990, 50], [1300, 44]].forEach(([x, r]) => { const gr = g.createRadialGradient(x, hz - 70, 5, x, hz - 70, r * 2.6); gr.addColorStop(0, "rgba(255,200,110,.9)"); gr.addColorStop(1, "rgba(255,200,110,0)"); g.fillStyle = gr; g.fillRect(x - r * 2.6, hz - 70 - r * 2.6, r * 5.2, r * 5.2); });
      g.globalAlpha = a * 0.75; g.fillStyle = "#d9a85a";  // ışıklandırılmış kubbe ve minareler
      mosque(800, 58, [-1.85, -1.55, 1.55, 1.85], 150); mosque(990, 50, [-2.3, -1.6, -1.25, 1.25, 1.6, 2.3], 165); mosque(1300, 44, [-1.9, -1.5, 1.5, 1.9], 140);
      g.fillRect(1640, hz - 150, 30, 120);
      g.globalAlpha = a; g.fillStyle = "#ffd88a";
      for (let k = 0; k < 160; k++) { const x = 280 + rnd1(k + 100) * 1650, y = hz - 18 - rnd1(k + 200) * 40; g.fillRect(x, y, 3, 3); }
      g.globalAlpha = 1;
    }
    // deniz
    const sea = g.createLinearGradient(0, hz, 0, h);
    sea.addColorStop(0, mixHex(P.hor, P.sea, 0.45)); sea.addColorStop(0.35, P.sea); sea.addColorStop(1, mixHex(P.sea, "#000000", 0.45));
    g.fillStyle = sea; g.fillRect(0, hz, w, h - hz);
    g.lineWidth = 2;
    for (let i = 0; i < 70; i++) {
      const y = hz + 8 + Math.pow(rnd1(i + 300), 1.6) * (h - hz - 10), x = rnd1(i + 400) * w, len = 18 + (y - hz) * 0.12;
      g.strokeStyle = dk > 0.5 ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.22)";
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke();
    }
    if (sun) {  // güneşin denizdeki yolu
      for (let i = 0; i < 46; i++) {
        const y = hz + 6 + i * 9, wd = 30 + i * 4 * (0.6 + rnd1(i) * 0.8);
        g.fillStyle = `rgba(255,${Math.round(220 - sun.low * 70)},${Math.round(150 - sun.low * 60)},${(0.5 - i / 100) * (0.4 + sun.low * 0.6)})`;
        g.fillRect(sun.x - wd / 2 + Math.sin(i * 2.3) * 12, y, wd, 3);
      }
    }
    if (glow) {  // şehir ışıklarının yansıması
      g.globalAlpha = Math.min(1, (dk - 0.4) * 1.6) * 0.35;
      for (let k = 0; k < 60; k++) { const x = 300 + rnd1(k + 600) * 1600; g.fillStyle = "#ffcf7a"; for (let i = 0; i < 6; i++) g.fillRect(x + Math.sin(i + k) * 3, hz + 4 + i * 8, 3, 4); }
      g.globalAlpha = 1;
    }
    // Kız Kulesi: kayalık adacık, sur, ana kule, sekizgen üst kat, kurşun külah, fener ve bayrak
    // pencerenin orta dikmesine denk gelmesin: evden ve 01 durağından bakınca ayrı camlarda görünür
    g.save(); g.translate(665, hz + 40); g.scale(0.66, 0.66);
    const kx = 0, ky = 0;
    const lit = glow ? mixHex("#ffe2b0", P.sil, 0.15) : mixHex("#efe7d6", P.hor, 0.25 + dk * 0.4), shade = mixHex(lit, "#000000", 0.28);
    if (glow) { const gr = g.createRadialGradient(kx, ky - 80, 10, kx, ky - 80, 220); gr.addColorStop(0, `rgba(255,214,150,${0.35 * dk})`); gr.addColorStop(1, "rgba(255,214,150,0)"); g.fillStyle = gr; g.fillRect(kx - 220, ky - 300, 440, 440); }
    g.fillStyle = mixHex(P.sea, "#000000", 0.35);                                        // kayalar
    g.beginPath(); g.ellipse(kx, ky + 6, 120, 14, 0, 0, 7); g.fill();
    g.fillStyle = shade; g.fillRect(kx - 96, ky - 30, 192, 32);                          // sur
    g.fillStyle = lit; g.fillRect(kx - 96, ky - 30, 150, 32);
    for (let k = 0; k < 12; k++) g.fillRect(kx - 96 + k * 16, ky - 38, 9, 8);            // mazgallar
    g.fillStyle = lit; g.fillRect(kx - 70, ky - 56, 58, 28);                             // yan bina
    g.fillStyle = shade; g.fillRect(kx - 70, ky - 60, 58, 5);
    g.fillStyle = lit; g.fillRect(kx - 4, ky - 128, 44, 100);                            // ana kule
    g.fillStyle = shade; g.fillRect(kx + 26, ky - 128, 14, 100);
    g.fillStyle = mixHex(lit, "#ffffff", 0.1); g.fillRect(kx - 8, ky - 152, 52, 26);     // sekizgen üst kat
    g.fillStyle = shade; g.fillRect(kx + 30, ky - 152, 14, 26);
    g.fillStyle = glow ? "#ffd27a" : "#2a2f3a";                                          // pencereler
    for (let k = 0; k < 3; k++) g.fillRect(kx + 2 + k * 13, ky - 146, 6, 12);
    for (let k = 0; k < 3; k++) g.fillRect(kx + 4 + k * 12, ky - 104 + (k % 2) * 30, 5, 10);
    g.fillStyle = glow ? "#4b4f60" : mixHex("#5b6270", P.hor, 0.2);                      // kurşun külah
    g.beginPath(); g.moveTo(kx - 12, ky - 152); g.lineTo(kx + 18, ky - 210); g.lineTo(kx + 48, ky - 152); g.fill();
    g.fillStyle = glow ? "#fff1c1" : lit; g.fillRect(kx + 14, ky - 222, 8, 13);         // fener
    g.fillStyle = "#3f3f46"; g.fillRect(kx + 17.5, ky - 250, 1.5, 30);                  // gönder ve bayrak
    g.fillStyle = "#e30a17"; g.fillRect(kx + 19, ky - 250, 22, 14);
    g.fillStyle = "#fff"; g.beginPath(); g.arc(kx + 27, ky - 243, 4.2, 0, 7); g.fill();
    g.fillStyle = "#e30a17"; g.beginPath(); g.arc(kx + 28.3, ky - 243, 3.4, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(kx + 33.5, ky - 243, 1.3, 0, 7); g.fill();
    // kulenin yansıması
    g.globalAlpha = glow ? 0.35 : 0.18; g.fillStyle = glow ? "#ffd27a" : lit;
    for (let i = 0; i < 12; i++) g.fillRect(kx - 4 + Math.sin(i * 1.9) * 5, ky + 14 + i * 9, 44 - i * 2, 4);
    g.globalAlpha = 1;
    g.restore();
    // martılar (gündüz)
    if (dk < 0.5) {
      g.strokeStyle = mixHex("#ffffff", P.sil, 0.4); g.lineWidth = 2.5;
      const t = Date.now() / 4000;
      for (let k = 0; k < 6; k++) {
        const x = (rnd1(k + 700) * 900 + 380 + Math.sin(t + k) * 30), y = 180 + rnd1(k + 800) * 220, s2 = 7 + rnd1(k) * 6;
        g.beginPath(); g.moveTo(x - s2, y - s2 * 0.4); g.quadraticCurveTo(x - s2 / 2, y - s2 * 0.8, x, y); g.quadraticCurveTo(x + s2 / 2, y - s2 * 0.8, x + s2, y - s2 * 0.4); g.stroke();
      }
    }
    // Şehir Hatları vapuru (o.ferry = x)
    if (o.ferry != null) {
      const day = dk < 0.5, fx = o.ferry, fy = hz + 150, white = day ? "#f8fafc" : "#aeb6c8";
      g.strokeStyle = day ? "rgba(255,255,255,.5)" : "rgba(252,211,77,.25)"; g.lineWidth = 4;
      g.beginPath(); g.moveTo(fx - 160, fy + 4); g.lineTo(fx + 10, fy + 2); g.stroke();
      g.fillStyle = white; g.beginPath(); g.moveTo(fx, fy - 34); g.lineTo(fx + 280, fy - 34); g.lineTo(fx + 256, fy); g.lineTo(fx + 18, fy); g.fill();
      g.fillStyle = "#1e293b"; g.fillRect(fx + 16, fy - 9, 242, 9);
      g.fillStyle = white; g.fillRect(fx + 50, fy - 64, 180, 30); g.fillRect(fx + 80, fy - 86, 110, 22);
      g.fillStyle = day ? "#334155" : "#fcd34d";
      for (let k = 0; k < 9; k++) g.fillRect(fx + 60 + k * 19, fy - 56, 10, 10);
      for (let k = 0; k < 5; k++) g.fillRect(fx + 90 + k * 20, fy - 79, 9, 8);
      g.fillStyle = "#111827"; g.fillRect(fx + 150, fy - 126, 26, 40);
      g.fillStyle = "#e11d48"; g.fillRect(fx + 150, fy - 112, 26, 7);
      if (!day) { g.fillStyle = "#ef4444"; g.beginPath(); g.arc(fx + 276, fy - 40, 5, 0, 7); g.fill(); }
    }
  });
  Object.defineProperty(tex, "state", { get: () => last });
  return tex;
}

// ---------------------------------------------------------------- ekran çizimleri

const CODE = [
  { name: "Program.cs", lines: [
    [["k", "public class "], ["t", "Developer"]], [["p", "{"]],
    [["k", "  public string "], ["p", "Name => "], ["s", "\"Ahmet\""], ["p", ";"]],
    [["k", "  public int "], ["p", "Years => "], ["n", "10"], ["p", ";"]],
    [["k", "  public "], ["t", "Stack "], ["p", "Stack = "], ["k", "new"], ["p", "()"]],
    [["p", "  { "], ["s", "\".NET\""], ["p", ", "], ["s", "\"Redis\""], ["p", ", "], ["s", "\"gRPC\""], ["p", " };"]],
    [["c", "  // çay demlendi, build başlıyor"]],
    [["k", "  public async "], ["t", "Task "], ["f", "ShipAsync"], ["p", "()"]],
    [["p", "    => "], ["k", "await "], ["f", "BuildGreatThings"], ["p", "();"]], [["p", "}"]],
  ] },
  { name: "mcp-server.ts", lines: [
    [["k", "import "], ["p", "{ Server } "], ["k", "from "], ["s", "\"@mcp/sdk\""]],
    [["c", "// yapay zekâya yeni bir araç"]],
    [["k", "const "], ["p", "server = "], ["k", "new "], ["t", "Server"], ["p", "({ name: "], ["s", "\"dev-room\""], ["p", " });"]],
    [["p", "server."], ["f", "tool"], ["p", "("], ["s", "\"brew_tea\""], ["p", ", "], ["k", "async "], ["p", "() => {"]],
    [["k", "  return "], ["s", "\"🍵 hazır\""], ["p", ";"]], [["p", "});"]],
  ] },
  { name: "room.py", lines: [
    [["k", "import "], ["p", "bpy"]],
    [["c", "# bu odayı Blender'da Python kurdu"]],
    [["f", "build_wall"], ["p", "(width="], ["n", "4.0"], ["p", ", window="], ["k", "True"], ["p", ")"]],
    [["f", "desk"], ["p", "(); "], ["f", "imac"], ["p", "(); "], ["f", "tea"], ["p", "()"]],
    [["f", "export"], ["p", "("], ["s", "\"room.glb\""], ["p", ")"]],
  ] },
];
const CC = { k: "#ff7b72", t: "#79c0ff", s: "#a5d6ff", f: "#d2a8ff", c: "#8b949e", p: "#e6edf3", n: "#ffa657" };

function imacScreen() {
  let fi = 0, li = 0, ci = 0;
  const tex = canvasTex(2048, 582, (g, W, h) => {
    const w = 1024;  // sol yarı: editör; sağ yarı: tarayıcıda site
    browserPane(g, 1024, 0, 1024, h);
    g.fillStyle = "#0d1117"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#161b22"; g.fillRect(0, 0, w, 44);
    [["#ff5f57", 24], ["#febc2e", 50], ["#28c840", 76]].forEach(([c, x]) => { g.fillStyle = c; g.beginPath(); g.arc(x, 22, 8, 0, 7); g.fill(); });
    g.font = "22px JetBrains Mono, monospace"; g.fillStyle = "#8b949e"; g.textAlign = "center"; g.fillText(CODE[fi].name, w / 2, 30);
    g.textAlign = "left"; g.font = "26px JetBrains Mono, monospace";
    const f = CODE[fi];
    let budget = ci;
    for (let i = 0; i <= Math.min(li, f.lines.length - 1); i++) {
      const y = 96 + i * 46;
      g.fillStyle = "#484f58"; g.fillText(String(i + 1).padStart(2, " "), 20, y);
      let x = 80;
      for (const [k, txt] of f.lines[i]) {
        const show = i < li ? txt : txt.slice(0, Math.max(0, budget));
        budget -= txt.length;
        g.fillStyle = CC[k]; g.fillText(show, x, y); x += g.measureText(txt).width;
      }
    }
    if (Math.floor(performance.now() / 500) % 2) { g.fillStyle = "#5eead4"; g.fillRect(80, 96 + li * 46 - 22, 12, 28); }
  });
  tex.step = () => {
    const f = CODE[fi];
    if (li >= f.lines.length) { li = 0; ci = 0; fi = (fi + 1) % CODE.length; }
    else {
      const len = f.lines[li].reduce((a, [, t]) => a + t.length, 0);
      if (++ci > len) { li++; ci = 0; }
    }
    tex.redraw();
  };
  return tex;
}

function browserPane(g, x0, y0, w, h) {
  g.save(); g.translate(x0, y0);
  g.fillStyle = "#0b0a1a"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#1b1838"; g.fillRect(0, 0, w, 44);
  g.fillStyle = "#110f26"; g.beginPath(); g.roundRect(120, 9, w - 240, 26, 13); g.fill();
  g.fillStyle = "#9a96bd"; g.font = "18px JetBrains Mono, monospace"; g.textAlign = "center"; g.fillText("🔒 ahmetbolukoglu.github.io", w / 2, 28);
  g.textAlign = "left"; g.fillStyle = "#86efac"; g.font = "16px JetBrains Mono, monospace"; g.fillText("● yeni projelere açık", 48, 92);
  g.font = "700 54px Space Grotesk, sans-serif"; g.fillStyle = "#e8e6f5"; g.fillText("Merhaba, ben", 48, 158);
  const gr = g.createLinearGradient(48, 0, 560, 0); gr.addColorStop(0, "#5eead4"); gr.addColorStop(.55, "#a78bfa"); gr.addColorStop(1, "#f472b6");
  g.fillStyle = gr; g.fillText("Ahmet Bölükoğlu", 48, 218);
  g.fillStyle = "#15132e"; g.beginPath(); g.roundRect(48, 250, w - 96, h - 280, 16); g.fill();
  g.fillStyle = "#2a2650"; g.fillRect(90, 300, 160, 110); g.fillStyle = "#5eead4"; g.fillRect(330, 330, 200, 120);
  g.fillStyle = "#9a6a42"; g.fillRect(260, 470, 420, 18);
  g.restore();
}

function leftScreen() {  // 27" monitör: masaüstü duvar kâğıdı + cv.pdf penceresi
  return canvasTex(1024, 576, (g, w, h) => {
    const bg = g.createRadialGradient(w * 0.55, h * 0.55, 30, w * 0.55, h * 0.55, w * 0.7);
    bg.addColorStop(0, "#7dd3fc"); bg.addColorStop(.35, "#1d4ed8"); bg.addColorStop(1, "#0b1340");
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(191,219,254,.35)"; g.lineWidth = 3;
    for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(w * 0.55, h * 0.58, 90 + i * 34, 40 + i * 18, -0.5 + i * 0.12, 0, Math.PI * 1.4); g.stroke(); }
    g.fillStyle = "rgba(255,255,255,.96)"; g.beginPath(); g.roundRect(250, 60, 520, 440, 12); g.fill();
    g.fillStyle = "#e5e7eb"; g.fillRect(250, 60, 520, 36); g.fillStyle = "#374151"; g.font = "16px JetBrains Mono, monospace"; g.fillText("cv.pdf", 270, 84);
    g.fillStyle = "#a78bfa"; g.beginPath(); g.arc(310, 150, 34, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.font = "700 26px Space Grotesk, sans-serif"; g.textAlign = "center"; g.fillText("AB", 310, 159); g.textAlign = "left";
    g.fillStyle = "#15132e"; g.font = "700 26px Space Grotesk, sans-serif"; g.fillText("Ahmet Bölükoğlu", 360, 146);
    g.fillStyle = "#7c3aed"; g.font = "16px JetBrains Mono, monospace"; g.fillText("Kıdemli Yazılım Uzmanı", 360, 172);
    [["EnerjiSA", "2024–2025"], ["Agrio Finans", "2023–2024"], ["Ovinot", "2020–2023"], ["Akbank", "2018–2019"]].forEach(([n, d], i) => {
      const y = 228 + i * 64;
      g.fillStyle = i ? "#a78bfa" : "#14b8a6"; g.beginPath(); g.arc(300, y, 8, 0, 7); g.fill();
      g.fillStyle = "#15132e"; g.font = "700 19px Space Grotesk, sans-serif"; g.fillText(n, 322, y + 6);
      g.fillStyle = "#9ca3af"; g.font = "14px JetBrains Mono, monospace"; g.fillText(d, 560, y + 6);
      g.fillStyle = "#e5e7eb"; g.fillRect(322, y + 16, 300 - i * 30, 6);
    });
    g.fillStyle = "rgba(15,23,42,.85)"; g.fillRect(0, h - 34, w, 34);
  });
}

// 65" TV: çalıştığım yerler kayan yazı olarak geçer (alt satır ters yönde teknolojiler)
const COMPANIES = ["EnerjiSA", "Agrio Finans", "Ovinot", "INTERTECH", "Timbo ICT", "Akbank", "Mavi Bilişim", "Medipol", "Arı Bilgi", "İETT"];
const TECH_ROW = [".NET Core", "C#", "Redis", "gRPC", "Event Bus", "PostgreSQL", "MSSQL", "Blazor", "React", "MCP", "Azure DevOps", "k6"];
function tvScreen() {
  const row = (g, items, font, gap, y, x0, color) => {
    g.font = font; g.fillStyle = color;
    const widths = items.map(t => g.measureText(t).width + gap), total = widths.reduce((a, b) => a + b, 0);
    let x = ((x0 % total) + total) % total - total;
    while (x < 1024) { items.forEach((t, i) => { g.fillText(t, x, y); g.fillStyle = "#f472b6"; g.fillText("✦", x + widths[i] - gap / 2 - 10, y); g.fillStyle = color; x += widths[i]; }); }
  };
  return canvasTex(1024, 576, (g, w, h, now = 0) => {
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, "#0b1a4a"); bg.addColorStop(1, "#2e1065");
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(147,197,253,.18)"; g.lineWidth = 2;
    for (let i = 0; i < 10; i++) { g.beginPath(); g.moveTo(0, 470 + i * 9); for (let x = 0; x <= w; x += 32) g.lineTo(x, 470 + i * 9 + Math.sin(x / 120 + i * 0.4 + now / 2000) * 18); g.stroke(); }
    g.fillStyle = "#5eead4"; g.font = "20px JetBrains Mono, monospace"; g.textAlign = "left"; g.fillText("// çalıştığım yerler · 2011 → 2025", 60, 92);
    row(g, COMPANIES, "700 104px Space Grotesk, sans-serif", 90, 250, -now * 0.09, "#ffffff");
    row(g, TECH_ROW, "28px JetBrains Mono, monospace", 70, 340, now * 0.05, "#bfdbfe");
    g.fillStyle = "rgba(255,255,255,.75)"; g.font = "22px Space Grotesk, sans-serif"; g.fillText("🎮 kod bitince bir maç · PS5", 60, 430);
  });
}

function phoneScreen() {
  return canvasTex(256, 552, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, w * 0.4, h); bg.addColorStop(0, "#3b0d1a"); bg.addColorStop(0.55, "#7a1f35"); bg.addColorStop(1, "#1a0610");
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,.06)"; g.beginPath(); g.ellipse(w * 0.8, h * 0.7, 160, 260, -0.4, 0, 7); g.fill();
    g.fillStyle = "#000"; g.beginPath(); g.arc(w / 2, 16, 7, 0, 7); g.fill();                       // kamera deliği
    g.fillStyle = "#fff"; g.font = "600 12px Space Grotesk, sans-serif"; g.textAlign = "left"; g.fillText("Turkcell", 14, 20);
    g.textAlign = "right"; g.fillText("5G  87%", w - 14, 20);
    const d = new Date(), hh = String(d.getHours()).padStart(2, "0"), mm = String(d.getMinutes()).padStart(2, "0");
    g.textAlign = "center"; g.font = "300 74px Space Grotesk, sans-serif"; g.fillText(hh, w / 2, 122); g.fillText(mm, w / 2, 196);
    g.font = "16px Space Grotesk, sans-serif"; g.fillText(d.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "long" }), w / 2, 226);
    g.fillStyle = "rgba(20,8,14,.72)"; g.beginPath(); g.roundRect(16, 262, w - 32, 78, 20); g.fill();
    g.fillStyle = "#fff"; g.textAlign = "left"; g.font = "700 15px Space Grotesk, sans-serif"; g.fillText("✉️ Gmail · şimdi", 30, 290);
    g.fillStyle = "#e5d3da"; g.font = "14px Space Grotesk, sans-serif"; g.fillText("Projen için konuşalım mı?", 30, 316);
    g.fillStyle = "rgba(255,255,255,.85)"; g.textAlign = "center"; g.font = "20px Space Grotesk, sans-serif";
    g.fillText("📞", 34, h - 30); g.fillText("📷", w - 34, h - 30);
  });
}

// Galaxy Watch yüzü: yuvarlak, köşeler saydam; saat + dönen bildirimler
const WATCH_NOTES = ["✅ Build succeeded", "🍵 Çay molası", "📧 Yeni mail", "🚀 Deploy tamam", "❤️ 72 bpm"];
function watchScreen() {
  const tex = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.save(); g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 2, 0, 7); g.clip();
    g.fillStyle = "#05060a"; g.fillRect(0, 0, w, h);
    const d = new Date(), s = d.getSeconds();
    g.strokeStyle = "#1f2937"; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 14, 0, 7); g.stroke();
    g.strokeStyle = "#5eead4"; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 14, -Math.PI / 2, -Math.PI / 2 + s / 60 * Math.PI * 2); g.stroke();
    g.fillStyle = "#fff"; g.textAlign = "center"; g.font = "600 58px Space Grotesk, sans-serif";
    g.fillText(d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }), w / 2, 128);
    g.fillStyle = "#9ca3af"; g.font = "16px Space Grotesk, sans-serif"; g.fillText(d.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" }), w / 2, 154);
    g.fillStyle = "#1f2937"; g.beginPath(); g.roundRect(40, 172, w - 80, 34, 17); g.fill();
    g.fillStyle = "#e5e7eb"; g.font = "15px Space Grotesk, sans-serif"; const notes = [...(window.GHFeed || []).slice(0, 3).map(e => e.short), ...WATCH_NOTES];
    g.fillText(notes[Math.floor(Date.now() / 5000) % notes.length], w / 2, 195);
    g.restore();
  });
  return tex;
}

function soonTexture() {  // çekmecedeki A4: COMING SOON
  return canvasTex(420, 594, (g, w, h) => {
    g.fillStyle = "#fbfaf6"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#e5e1d6"; for (let y = 60; y < h; y += 28) { g.beginPath(); g.moveTo(30, y); g.lineTo(w - 30, y); g.stroke(); }
    g.fillStyle = "#15132e"; g.textAlign = "center"; g.font = "700 52px Space Grotesk, sans-serif"; g.fillText("COMING", w / 2, h / 2 - 20); g.fillText("SOON", w / 2, h / 2 + 40);
    g.fillStyle = "#c2410c"; g.font = "18px JetBrains Mono, monospace"; g.fillText("yeni projeler yolda…", w / 2, h / 2 + 86);
    g.strokeStyle = "#c2410c"; g.lineWidth = 4; g.strokeRect(w / 2 - 110, h / 2 - 82, 220, 140);
  });
}

function spineTexture(b) {
  return canvasTex(120, 600, (g, w, h) => {
    const sh = g.createLinearGradient(0, 0, w, 0);  // sırt yuvarlak görünsün
    sh.addColorStop(0, "rgba(0,0,0,.35)"); sh.addColorStop(.35, "rgba(255,255,255,.12)"); sh.addColorStop(1, "rgba(0,0,0,.4)");
    g.fillStyle = b.color; g.fillRect(0, 0, w, h); g.fillStyle = sh; g.fillRect(0, 0, w, h);
    g.fillStyle = "#e7c26a";
    [[26, 4], [36, 2], [h - 40, 2], [h - 30, 4]].forEach(([y, t]) => g.fillRect(8, y, w - 16, t));
    g.save(); g.translate(w / 2 + 9, h - 120); g.rotate(-Math.PI / 2);
    g.font = "700 30px Space Grotesk, sans-serif"; g.fillStyle = "#fbf3dc"; g.textAlign = "left";
    let t = b.title; while (g.measureText(t).width > h - 190 && t.length > 4) t = t.slice(0, -2) + "…";
    g.fillText(t, 0, 0); g.restore();
    g.font = "700 26px JetBrains Mono, monospace"; g.fillStyle = "#e7c26a"; g.textAlign = "center";
    g.fillText(b.icon, w / 2, h - 66);
    g.strokeStyle = "#e7c26a"; g.lineWidth = 2; g.beginPath(); g.arc(w / 2, h - 75, 26, 0, 7); g.stroke();
  });
}

function noteTexture(lines, bg) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,.08)"; g.fillRect(0, 0, w, 26);
    g.fillStyle = "#3b2a14"; g.font = "700 34px Space Grotesk, sans-serif"; g.textAlign = "left";
    lines.forEach((l, i) => g.fillText(l, 22, 74 + i * 48));
  });
}

function certScreen() {
  return canvasTex(512, 366, (g, w, h) => {
    g.fillStyle = "#f8f6ff"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#a78bfa"; g.lineWidth = 6; g.strokeRect(18, 18, w - 36, h - 36);
    g.fillStyle = "#15132e"; g.textAlign = "center"; g.font = "700 64px JetBrains Mono, monospace"; g.fillText("MCPD", w / 2, 150);
    g.font = "22px JetBrains Mono, monospace"; g.fillStyle = "#4b4670"; g.fillText("Microsoft Certified", w / 2, 200); g.fillText("Professional Developer", w / 2, 230);
    g.fillStyle = "#fbbf24"; g.beginPath(); g.arc(w / 2, 290, 26, 0, 7); g.fill();
  });
}

function neonTexture() {
  return canvasTex(1024, 280, (g, w, h, dim) => {
    g.clearRect(0, 0, w, h);
    g.font = "700 92px JetBrains Mono, monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = "#f472b6"; g.shadowBlur = dim ? 8 : 40;
    g.strokeStyle = dim ? "rgba(244,114,182,.35)" : "#f472b6"; g.lineWidth = 10; g.strokeRect(24, 24, w - 48, h - 48);
    g.fillStyle = dim ? "rgba(255,209,234,.35)" : "#ffd1ea";
    for (let i = 0; i < 2; i++) g.fillText("çay · kod · tekrar", w / 2, h / 2 + 4);
  });
}

// ---------------------------------------------------------------- sahne

async function init() {
  if (!canvas || !webglOK()) { frame?.classList.add("no3d"); boot.ready(); return; }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0f0d24");
  const camera = new THREE.PerspectiveCamera(40, 16 / 10, 0.03, 60);
  const HOME = { pos: B(0.15, -1.5, 1.42), look: B(0.18, 1.3, 1.22) };
  const INTRO = { pos: B(0.12, 1.0, 1.08), look: B(0.12, 1.36, 1.08) };  // açılışta ekranın içinden geri çekilir
  camera.position.copy(INTRO.pos); camera.lookAt(INTRO.look);
  const stops = STOPS.map(s => ({ ...s, pos: B(...s.pos), look: B(...s.look) }));

  // ışıklar
  const hemi = new THREE.HemisphereLight("#4a46a0", "#140f28", 1.1); scene.add(hemi);
  const moon = new THREE.DirectionalLight("#9db4ff", 1.2); moon.position.copy(B(-1.6, 6, 3.5)); moon.target.position.copy(B(0, 0.5, 0.6)); scene.add(moon, moon.target);
  const warm = new THREE.PointLight("#ffc285", 1.6, 0, 2); warm.position.copy(B(-0.3, 0.6, 1.9)); scene.add(warm);
  const pcLight = new THREE.PointLight("#38bdf8", 1.4, 0, 2); pcLight.position.copy(B(0.7, 1.2, 1.0)); scene.add(pcLight);
  const tvLight = new THREE.PointLight("#818cf8", 0.7, 0, 2); tvLight.position.copy(B(-1.6, 0.15, 1.35)); scene.add(tvLight);
  const monLight = new THREE.PointLight("#5eead4", 0.9, 0, 2); monLight.position.copy(B(0.12, 1.0, 1.15)); scene.add(monLight);
  const ledLight = new THREE.PointLight("#5eead4", 0.7, 0, 2); ledLight.position.copy(B(0.0, 0.88, 0.55)); scene.add(ledLight);
  const neonLight = new THREE.PointLight("#f472b6", 0.8, 0, 2); neonLight.position.copy(B(0.12, 1.4, 2.1)); scene.add(neonLight);

  // dış manzara (Asya yakası, Boğaz, Kız Kulesi)
  const sky = skyTexture();
  let day = sky.state.dark < 0.5;
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshBasicMaterial({ map: sky, toneMapped: false }));
  sky.flipY = true; sky.needsUpdate = true;
  outside.position.copy(B(-1.35, 9, 2.0)); scene.add(outside);
  // oda ışığı dışarıya uyar: gündüz aydınlık ve sıcak, gece mavi ay ışığı
  const outdoor = () => {
    const P = sky.state, k = 1 - P.dark;
    day = P.dark < 0.5;
    hemi.intensity = 1.1 + 0.7 * k; moon.intensity = 1.2 + 1.0 * k;
    moon.color.set(mixHex("#9db4ff", mixHex("#fff1d6", P.hor, 0.4), k));
  };
  outdoor();
  setInterval(() => { if (skyState.ferry == null) sky.redraw(skyState); outdoor(); }, 60000);

  // model
  const gltf = await new GLTFLoader().loadAsync("models/room.glb", e => {
    if (!e.total) return;
    if (loaderEl) loaderEl.querySelector("b").textContent = Math.round(e.loaded / e.total * 100) + "%";
    boot.progress(e.loaded / e.total);
  });
  const root = gltf.scene; scene.add(root);
  const parts = {};
  root.children.forEach(o => { parts[o.name] = o; });
  // çekmece: model açık konumda; kapalı = 0.33 m içeride (Blender -Y dışarı = three +Z)
  const drawerOpenZ = parts.Drawer ? parts.Drawer.position.z : 0;
  let drawerAmt = 0, drawerHold = false;
  const setDrawer = a => { drawerAmt = a; if (parts.Drawer) parts.Drawer.position.z = drawerOpenZ - 0.33 * (1 - a); };
  setDrawer(0);
  // diğer çekmeceler: model açık, kapalı = 0.33 m içeride; tıklayınca aç/kapa
  // kasa fanları: düğüm kökeni fan merkezinde; Blender ekseni z→three y, x→x, y→z
  const fans = Object.keys(parts).filter(k => k.startsWith("Fan_")).map(k => [parts[k], { z: "y", x: "x", y: "z" }[k[4]]]);
  const extraDrawers = Object.keys(parts).filter(k => k.startsWith("Drawer_")).map(k => ({ o: parts[k], z: parts[k].position.z, amt: 0 }));
  extraDrawers.forEach(d => { d.o.position.z = d.z - 0.33; });

  const screenTex = { W_Screen_iMac: imacScreen(), W_Screen_Left: leftScreen(), W_Screen_TV: tvScreen(), W_Screen_Phone: phoneScreen(), W_Screen_Watch: watchScreen(), W_Cert: certScreen() };
  // ışık alan baskılı yüzeyler: kitap sırtları ve not kâğıtları
  const printTex = { W_Note_1: noteTexture(["TODO:", "Redis TTL", "kontrol ✓"], "#fde047"), W_Note_2: noteTexture(["Çay al", "🍵 x2"], "#f9a8d4") };
  for (const [id, b] of Object.entries(BOOKS)) printTex["W_Spine_" + id] = spineTexture(b);
  printTex.W_Soon = soonTexture();
  const patterns = {};
  const partMats = {};

  root.traverse(o => {
    if (!o.isMesh) return;
    let part = o; while (part.parent && part.parent !== root) part = part.parent;
    const name = o.material.name;
    let m;
    if (SCREENS.includes(name)) {
      m = new THREE.MeshBasicMaterial({ map: screenTex[name], toneMapped: false, transparent: name === "W_Screen_Watch", alphaTest: name === "W_Screen_Watch" ? 0.5 : 0 });
    } else {
      const d = MATS[name] || { color: printTex[name] ? "#ffffff" : "#888", roughness: 0.6 };
      const { map, ...rest } = d;
      if (map && !patterns[map]) patterns[map] = PATTERNS[map]();
      m = new THREE.MeshStandardMaterial({ ...rest, map: printTex[name] || (map ? patterns[map] : null) });
      if (rest.emissive) m.emissive = new THREE.Color(rest.emissive);
      maskShader(m);
      if (name === "W_RGB" || name === "W_KeyGlow" || name === "W_FanBlade") part.name.startsWith("Fan_") ? rainbow(m, RING[part.name[4]], "ring" + part.name[4]) : rainbow(m, WAVE, "wave");
      (partMats[part.name] ||= []).push(m);
    }
    m.name = name;
    o.material = m;
  });

  // neon yazısı
  const neonTex = neonTexture(); neonTex.flipY = true; neonTex.needsUpdate = true;
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.27), new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, toneMapped: false, depthWrite: false }));
  neon.position.copy(B(0.12, 1.568, 2.12)); scene.add(neon);

  // çay buharı
  const steam = new THREE.Group(); steam.position.copy(B(-0.22, 0.97, 0.86)); scene.add(steam);
  const puffTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const puffs = Array.from({ length: 10 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData.t = i / 10; s.scale.setScalar(0.04); steam.add(s); return s;
  });

  // etiketler (HTML, 3D noktaya bağlı)
  const TAGS = [
    { text: "🖥️ masaüstü", at: B(0.12, 1.3, 1.31), cls: "c" },
    { text: "📄 cv.pdf", at: B(-0.84, 1.13, 1.25), cls: "v" },
    { text: "📱 iletişim", at: B(0.98, 1.0, 0.97), cls: "p" },
    { text: "🗂️ projeler", at: B(0.835, 0.88, 0.6), cls: "a" },
  ].map(t => { const el = document.createElement("div"); el.className = "tag3d " + t.cls; el.textContent = t.text; frame.appendChild(el); return { ...t, el }; });

  // ---------------------------------------------------------------- etkileşim
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hover = null, busy = false, teaCount = 1, qi = 0, rgbBoost = 0;
  let catCount = 0, catPoke = 0;
  const CAT = ["😺 Mırr… kod yazarken uyuyakaldım", "😼 Klavyenin üstüne yatmadım, söz", "😸 Deploy bitince uyandır", "🐟 Mama saati geçti ama…"];
  const QUACK = ["🦆 Quack! Bug'ı bana anlat…", "🦆 Satır satır anlat, bulacağız.", "🦆 Null mı geliyor yoksa?", "🦆 Cache'i temizledin mi?"];

  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    ndc.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    for (const h of ray.intersectObject(root, true)) {
      let p = h.object; while (p.parent && p.parent !== root) p = p.parent;
      if (p.name === "Room") return null;
      if (CLICK.includes(p.name) || p.name.startsWith("Book_") || p.name.startsWith("Drawer_")) return p;
      if (p.name.startsWith("Clock")) return parts.Clock;
      if (p.name.startsWith("Fan_")) return parts.PC;
    }
    return null;
  }
  // kitabın üstüne gelince başlığı imleçte
  const tip = document.createElement("div"); tip.className = "booktip"; frame.appendChild(tip);
  function setHover(p) {
    if (hover === p) return;
    if (hover) (partMats[hover.name] || []).forEach(m => m.emissive.set(m.userData.e0 ?? 0x000000));
    hover = p;
    if (hover) (partMats[hover.name] || []).forEach(m => { m.userData.e0 ??= m.emissive.getHex(); if (!m.userData.e0) m.emissive.set("#2a2550"); });
    canvas.style.cursor = hover ? "pointer" : "";
    const label = hover && (hover.name.startsWith("Book_") ? "Kitap" : hover.name.startsWith("Drawer_") ? "Çekmece" : NAMES[hover.name]);
    dispatchEvent(new CustomEvent("room:hover", { detail: label || "" }));
    const b = hover && BOOKS[hover.name.slice(5)];
    tip.classList.toggle("show", !!(hover && hover.name.startsWith("Book_") && b));
    if (b && hover.name.startsWith("Book_")) tip.innerHTML = `<b>${b.title}</b><span>${b.sub}</span>`;
  }
  function rectOf(obj) {
    const box = new THREE.Box3().setFromObject(obj), r = canvas.getBoundingClientRect();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      const v = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
      const x = r.left + (v.x + 1) / 2 * r.width, y = r.top + (1 - v.y) / 2 * r.height;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return { left: x0, top: y0, width: x1 - x0, height: y1 - y0, right: x1, bottom: y1 };
  }
  // ekranın kendi köşe noktalarından ekrandaki dikdörtgen (eğik ekranda dünya kutusu fazla büyük çıkar)
  function rectOfMesh(mesh) {
    const p = mesh.geometry.attributes.position, r = canvas.getBoundingClientRect(), v = new THREE.Vector3();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).project(camera);
      const x = r.left + (v.x + 1) / 2 * r.width, y = r.top + (1 - v.y) / 2 * r.height;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return { left: x0, top: y0, width: x1 - x0, height: y1 - y0, right: x1, bottom: y1 };
  }
  const say = (obj, msg) => window.roomSay && window.roomSay(rectOf(obj), msg);

  function tween(ms, fn) {
    return new Promise(res => {
      if (reduceMotion) { fn(1); return res(); }
      const t0 = performance.now();
      const step = now => { const t = Math.min(1, (now - t0) / ms); fn(1 - Math.pow(1 - t, 3)); t < 1 ? requestAnimationFrame(step) : res(); };
      requestAnimationFrame(step);
    });
  }
  const camLook = INTRO.look.clone();
  const base = { pos: HOME.pos.clone(), look: HOME.look.clone() };  // turun o anki durağı; paralaks bunun üstüne
  async function flyTo(pos, look, ms = 900) {
    const p0 = camera.position.clone(), l0 = camLook.clone();
    await tween(ms, t => { camera.position.lerpVectors(p0, pos, t); camLook.lerpVectors(l0, look, t); });
  }
  const lifted = {};
  async function lift(name) {
    const o = parts[name]; if (!o) return;
    lifted[name] = { pos: o.position.clone(), rot: o.rotation.clone() };
    const to = camera.position.clone().sub(o.position).multiplyScalar(0.12);
    await tween(420, t => { o.position.copy(lifted[name].pos).addScaledVector(to, t).add(new THREE.Vector3(0, 0.08 * t, 0)); o.rotation.x = lifted[name].rot.x + 0.25 * t; });
  }
  function drop() {
    for (const [name, s] of Object.entries(lifted)) {
      const o = parts[name], p0 = o.position.clone(), r0 = o.rotation.x;
      tween(420, t => { o.position.lerpVectors(p0, s.pos, t); o.rotation.x = r0 + (s.rot.x - r0) * t; });
      delete lifted[name];
    }
  }

  const DEV = { iMac: "imac", Monitor2: "tablet", Phone: "phone", Drawer: "archive", Watch: "watch" };
  Devices.setRectSource(type => {
    const name = Object.keys(DEV).find(k => DEV[k] === type);
    return frame.classList.contains("is-3d") && parts[name] ? rectOf(parts[name]) : null;
  });
  const openDrawer = async () => { if (drawerAmt < 0.99) { sfx("drawer"); const a0 = drawerAmt; await tween(600, t => setDrawer(a0 + (1 - a0) * t)); } drawerHold = true; };
  Devices.onOpen(type => { if (type === "archive") openDrawer(); });
  // telefon ve projeler: önce kamera cihaza gider (menüden açınca da), sonra arayüz açılır
  Devices.setPreOpen(async type => {
    if (!frame.classList.contains("is-3d")) return;
    const fr = frame.getBoundingClientRect();
    if (fr.top < 64 || fr.bottom > innerHeight) jump(scrollY + fr.top - Math.max(64, (innerHeight - fr.height) / 2));
    busy = true;
    if (type === "phone") {
      const c = new THREE.Box3().setFromObject(parts.Phone).getCenter(new THREE.Vector3());
      await Promise.all([flyTo(c.clone().add(new THREE.Vector3(0, 0.15, 0.9)), c, 650), lift("Phone")]);
    } else if (type === "archive") {
      await Promise.all([openDrawer(), flyTo(stops[4].pos, stops[4].look, 800)]);
    }
  });
  // masaüstü monitörün içinde açılır: kamera ekranı kadraja sığdırır, arayüz ekranın üstüne oturur
  // ekran: ölçü (m) ve izleyiciye bakan normal
  const screens = {};
  root.traverse(o => {
    if (!o.isMesh) return;
    if (o.material.name === "W_Screen_iMac") screens.imac = { mesh: o, w: 1.16, h: 0.33, normal: new THREE.Vector3(0, 0, 1), curved: true };
    if (o.material.name === "W_Screen_Left") {
      const n = new THREE.Vector3().fromBufferAttribute(o.geometry.attributes.normal, 0).transformDirection(o.matrixWorld).normalize();
      screens.tablet = { mesh: o, w: 0.6, h: 0.338, normal: n };
    }
    if (o.material.name === "W_Screen_Watch") screens.watch = { mesh: o, w: 0.035, h: 0.035, normal: new THREE.Vector3(0, 0, 1), fill: 0.62 };
  });
  Devices.setEmbedSource(async type => {
    const sc = screens[type], screenMesh = sc && sc.mesh;
    if (!screenMesh || !frame.classList.contains("is-3d") || frame.clientWidth < 640) return null;
    document.documentElement.classList.add("roomzoom");  // giriş yazısı çekilir, oda büyür, ekran daha geniş açılır
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    resize();
    const c = new THREE.Box3().setFromObject(screenMesh).getCenter(new THREE.Vector3());
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), fill = sc.fill || 0.9;
    const d = Math.max(sc.h / (2 * t * fill), sc.w / (2 * t * camera.aspect * fill));
    const eye = c.clone().addScaledVector(sc.normal, d);  // ekranın tam karşısı (çapraz monitörde de düz görünür)
    const fr = frame.getBoundingClientRect();  // oda ekranın dışına taşıyorsa önce görünür alana al (sayfa kilitlenecek)
    if (fr.top < 64 || fr.bottom > innerHeight) jump(scrollY + fr.top - Math.max(64, (innerHeight - fr.height) / 2));
    busy = true; frame.classList.add("zoomed");
    await flyTo(eye, c, 900);
    camera.position.copy(eye); camLook.copy(c); camera.lookAt(camLook);
    screenMesh.visible = false;  // arayüz ekranın yerini alır; alttaki doku arkadan sızmasın
    renderer.render(scene, camera);
    return { rect: () => rectOfMesh(screenMesh), flat: !!sc.curved };
  });
  Devices.onClose(async () => {
    drop();
    frame.classList.remove("zoomed");
    Object.values(screens).forEach(sc => { sc.mesh.visible = true; });
    document.documentElement.classList.remove("roomzoom");
    if (drawerHold) { drawerHold = false; sfx("drawer"); }
    busy = true; await flyTo(base.pos, base.look, 800); busy = false;
  });

  const skyState = { ferry: null };
  function ferry() {  // Boğaz'dan geçen vapur (düdüğüyle)
    if (skyState.ferry != null) return;
    sfx("horn");
    const t0 = performance.now(), dur = reduceMotion ? 1 : 26000;
    const id = setInterval(() => {
      const t = (performance.now() - t0) / dur;
      skyState.ferry = t >= 1 ? null : -320 + t * 2700;
      sky.redraw(skyState);
      if (t >= 1) clearInterval(id);
    }, 90);
  }
  const ferryLoop = () => setTimeout(() => { if (!document.hidden) ferry(); ferryLoop(); }, 70000 + Math.random() * 50000);
  function duckHop() {
    const p = parts.Duck; if (!p) return;
    const y0 = lifted.Duck ? p.position.y : (p.userData.y0 ??= p.position.y);
    tween(700, t => { p.position.y = y0 + Math.sin(t * Math.PI) * 0.05; p.rotation.y = t * Math.PI * 2; p.scale.set(1, 1 - Math.sin(t * Math.PI * 2) * 0.08, 1); });
    sfx("quack");
  }
  async function act(p) {
    if (!p || busy) return;
    const n = p.name;
    if (n.startsWith("Drawer_")) {
      const d = extraDrawers.find(x => x.o === p), a0 = d.amt, a1 = a0 > 0.5 ? 0 : 1;
      sfx("drawer");
      if (a1) say(p, "📄 Coming soon: yeni projeler bu çekmecede");
      await tween(600, t => { d.amt = a0 + (a1 - a0) * t; p.position.z = d.z - 0.33 * (1 - d.amt); });
      return;
    }
    if (n === "Keyboard") { await Devices.open("imac", "terminal"); window.Term?.autoplay(); return; }
    if (n.startsWith("Book_")) {
      const b = BOOKS[n.slice(5)], z0 = p.position.z;
      sfx("paper"); say(p, "📘 " + b.title + " — " + b.sub);
      await tween(320, t => { p.position.z = z0 + 0.07 * t; });
      await new Promise(r => setTimeout(r, 650));
      tween(320, t => { p.position.z = z0 + 0.07 * (1 - t); });
      Devices.open("imac", "yetenekler");
      setTimeout(() => document.querySelector('#skillFilter button[data-k="' + b.cat + '"]')?.click(), 80);
      return;
    }
    if (n === "iMac" || n === "Shelf") {
      Devices.open("imac", n === "Shelf" ? "yetenekler" : undefined);
    } else if (n === "Drawer") {
      Devices.open("archive");
    } else if (n === "Monitor2") {
      Devices.open("tablet");
    } else if (n === "Phone") {
      Devices.open("phone");
    } else if (n === "Tea") {
      sfx("spoon");
      say(p, `🍵 Çay tazelendi! (${++teaCount}. bardak)`);
      puffs.forEach(s => { s.userData.t = Math.random() * 0.3; });
    } else if (n === "Duck") {
      duckHop();
      if (window.DuckChat) window.DuckChat.open(); else say(p, QUACK[qi++ % QUACK.length]);
    } else if (n === "Cat") {
      const meow = catCount++ % 3 !== 2;
      sfx(meow ? "meow" : "purr");
      catPoke = 1;
      say(p, CAT[catCount % CAT.length]);
    } else if (n === "Ball") {
      const x0 = p.position.x;
      tween(1400, t => { const k = Math.sin(t * Math.PI); p.position.x = x0 + k * 0.5; p.rotation.z = -k * 0.5 / 0.11; });
      sfx("thump");
      say(p, "⚽ Halı saha akşam 21:00'de!");
    } else if (n === "Window") {
      if (skyState.ferry == null) ferry();
      else if (!day) { const s = { x: 1500, y: 160 }; tween(900, t => sky.redraw({ ...skyState, shoot: { x: s.x - t * 500, y: s.y + t * 250 } })); }
      say(p, day ? "☀️ Üsküdar'dan Boğaz manzarası" : "🌠 Kız Kulesi manzarası, bir dilek tut");
    } else if (n === "Cert") { sfx("paper"); say(p, "📜 MCPD — 100 puan (2013)"); }
    else if (n === "PC") { sfx("whooshIn"); rgbBoost = 1; say(p, "🖥️ TUF GT502 · RTX 4090 Suprim · 360 sıvı soğutma + 7 fan ⚡"); }
    else if (n === "Mouse") { sfx("click"); say(p, "🖱️ MX Master 3: yan tekerlek, sonsuz kaydırma"); }
    else if (n === "TV") { sfx("click"); say(p, "📺 65 inç · PS5 hazır: akşam bir maç? 🎮"); }
    else if (n === "PS5") { sfx("thump"); say(p, "🎮 Kod molası: bir maç?"); }
    else if (n === "Controllers") { sfx("thump"); say(p, "🎮 İki DualSense şarjda, rakip aranıyor"); }
    else if (n === "Headphones") { const on = Sfx.music.toggle(); say(p, on ? "🎧 Çalıyor: " + Sfx.music.name : "🎧 Müzik durdu"); }
    else if (n === "Watch") { sfx("tick"); Devices.open("watch"); }
    else if (n === "Modem") { sfx("tick"); say(p, "📶 Fiber hat: ping 4 ms, deploy hızlı"); }
    else if (n === "Chair") { sfx("thump"); say(p, "🪑 xDrive HEY 15: oyun ve kod koltuğu"); }
    else if (n === "Bottle") { sfx("spoon"); say(p, "💧 Sadece çay değil, su da içiyoruz 😄"); }
    else if (n === "Clock") { sfx("tick"); say(p, "🕐 " + new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })); }
    else if (n === "Neon") { sfx("click"); say(p, "🍵 çay · kod · tekrar"); }
  }

  let mouse = { x: 0, y: 0 };
  canvas.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect();
    mouse = { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 };
    tip.style.transform = `translate(${e.clientX - r.left + 16}px, ${e.clientY - r.top + 16}px)`;
    if (e.pointerType === "mouse") setHover(pick(e));
  });
  canvas.addEventListener("pointerleave", () => { setHover(null); mouse = { x: 0, y: 0 }; });
  canvas.addEventListener("click", e => act(pick(e)));

  // ---------------------------------------------------------------- boyut, döngü
  function resize() {
    const w = frame.clientWidth, h = frame.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // yatay görüş açısı sabit kalsın: geniş çerçevede oda taşmasın, darda kesilmesin
    const hfov = (camera.aspect < 1.4 ? 60 : 66) * Math.PI / 180;
    camera.fov = THREE.MathUtils.clamp(2 * Math.atan(Math.tan(hfov / 2) / camera.aspect) * 180 / Math.PI, 26, 62);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);  // açık cihaz varken döngü durur; arka plan boş kalmasın
  }
  new ResizeObserver(resize).observe(frame);

  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(frame);
  const stage = document.getElementById("stage");
  const tmp = new THREE.Vector3(), rgb = new THREE.Color();
  let last = 0, lastType = 0, lastWatch = 0, lastTV = 0, reel = null;

  // ---------------------------------------------------------------- scroll turu
  // #tour uzun bir kap; içindeki giriş (sticky) sabit kalır, kaydırma ilerlemesi kamerayı duraktan durağa taşır
  const tourEl = document.getElementById("tour"), heroTop = document.querySelector(".hero-top");
  const capEl = document.getElementById("tourCap");
  let tourS = 0, capIdx = -1, h0 = 0, mb0 = 0;
  const smooth = t => t * t * (3 - 2 * t);
  function measureHero() {
    heroTop.style.height = ""; heroTop.style.marginBottom = "";
    h0 = heroTop.offsetHeight; mb0 = parseFloat(getComputedStyle(heroTop).marginBottom) || 0;
  }
  measureHero(); addEventListener("resize", () => { measureHero(); tour(true); });
  function tour(force) {
    if (!tourEl) return;
    const total = tourEl.offsetHeight - tourEl.firstElementChild.offsetHeight;
    const p = total > 10 && innerWidth > 900 ? THREE.MathUtils.clamp(-tourEl.getBoundingClientRect().top / total, 0, 1) : 0;
    const k = THREE.MathUtils.clamp(p / 0.07, 0, 1);
    if (force || heroTop.dataset.k !== k.toFixed(3)) {
      heroTop.dataset.k = k.toFixed(3);
      heroTop.style.height = k ? h0 * (1 - k) + "px" : "";
      heroTop.style.marginBottom = k ? mb0 * (1 - k) + "px" : "";
      heroTop.style.opacity = 1 - Math.min(1, k * 1.6);
      heroTop.style.overflow = k ? "hidden" : "";
    }
    tourS = THREE.MathUtils.clamp((p - 0.07) / 0.93, 0, 1) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(tourS)), t = smooth(tourS - i);
    base.pos.lerpVectors(stops[i].pos, stops[i + 1].pos, t);
    base.look.lerpVectors(stops[i].look, stops[i + 1].look, t);
    const near = Math.round(tourS), st = stops[near];
    const idx = st.h && Math.abs(tourS - near) < 0.32 ? near : -1;
    if (idx !== capIdx && capEl && !reel) {
      capIdx = idx;
      capEl.classList.remove("show");
      if (idx >= 0) {
        capEl.innerHTML = `<span>${st.n} / 07</span><h3>${st.h}</h3><p>${st.p}</p>`;
        requestAnimationFrame(() => capEl.classList.add("show"));
        sfx("whooshOut");
      }
    }
    frame.classList.toggle("touring", tourS > 0.3 && tourS < stops.length - 1.3);
  }

  function frameLoop(now) {
    requestAnimationFrame(frameLoop);
    if (!visible || document.hidden || !stage.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // saat
    const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, hr = (d.getHours() % 12) + m / 60;
    if (parts.ClockSec) { parts.ClockSec.rotation.z = -s / 60 * Math.PI * 2; parts.ClockMin.rotation.z = -m / 60 * Math.PI * 2; parts.ClockHour.rotation.z = -hr / 12 * Math.PI * 2; }
    // ekranlar
    if (!reduceMotion && now - lastType > 45) { screenTex.W_Screen_iMac.step(); lastType = now; if (Math.random() < 0.3) sfx("key", 0.3); }
    tour();
    if (now % 30000 < 20) screenTex.W_Screen_Phone.redraw();
    if (now - lastWatch > 1000) { screenTex.W_Screen_Watch.redraw(); lastWatch = now; }
    if (!reduceMotion && now - lastTV > 33) { screenTex.W_Screen_TV.redraw(now); lastTV = now; }
    if (parts.Cat) {
      catPoke *= 0.94;
      const b = Math.sin(now / 900) * (reduceMotion ? 0 : 1), k = Math.sin(now / 60) * catPoke;
      parts.Cat.scale.set(1 + 0.02 * b, 1 + 0.035 * b + 0.06 * k, 1 + 0.02 * b);
    }
    // ışık nabızları
    const hue = (now / 8000) % 1;
    ledLight.color.setHSL(0.47 + hue * 0.45, 0.8, 0.6);
    rgbBoost *= 0.985;
    rgb.setHSL((now / (4000 - 3200 * rgbBoost)) % 1, 0.85, 0.55);
    RB.uTime.value += dt * (reduceMotion ? 0.05 : 0.18 + 0.8 * rgbBoost);
    pcLight.color.copy(rgb);
    const spin = dt * (reduceMotion ? 0.4 : 7 + 14 * rgbBoost);
    fans.forEach(([o, ax]) => { o.rotation[ax] += spin; });
    const flick = reduceMotion ? 1 : ((now / 1000) % 6 > 5.6 && Math.sin(now / 30) > 0 ? 0.35 : 1);
    neon.material.opacity = flick; neonLight.intensity = 0.8 * flick;
    // buhar
    puffs.forEach((p, i) => {
      p.userData.t = (p.userData.t + dt * 0.35) % 1;
      const t = p.userData.t;
      p.position.set(Math.sin(t * 6 + i) * 0.012, t * 0.16, 0);
      p.material.opacity = Math.sin(t * Math.PI) * 0.6; p.scale.setScalar(0.03 + t * 0.05);
    });
    // kamera: tur durağı + fareyle hafif paralaks (yumuşak takip = kaydırmada atalet)
    if (!busy && stage.hidden && !Object.keys(lifted).length) {
      const amp = tourS < 0.3 || tourS > stops.length - 1.3 ? 1 : 0.3;
      tmp.copy(base.pos).add(new THREE.Vector3(mouse.x * 0.18 * amp, -mouse.y * 0.1 * amp, 0));
      camera.position.lerp(tmp, 0.08);
      camLook.lerp(base.look, 0.08);
    }
    if (!drawerHold) {
      const want = stops.reduce((a, st, i) => st.drawer ? Math.max(a, 1 - Math.min(1, Math.abs(tourS - i) * 1.4)) : a, 0);
      if (Math.abs(want - drawerAmt) > 0.002) setDrawer(drawerAmt + (want - drawerAmt) * 0.12);
    }
    camera.lookAt(camLook);
    // etiketler
    const r = frame.getBoundingClientRect();
    TAGS.forEach(t => {
      const v = t.at.clone().project(camera);
      t.el.style.transform = `translate(${(v.x + 1) / 2 * r.width}px, ${(1 - v.y) / 2 * r.height}px) translate(-50%, -100%)`;
    });
    renderer.render(scene, camera);
  }

  // ---------------------------------------------------------------- showreel: odayı izle
  // duraklar arası sinematik uçuş, yazılar ve küçük olaylar; tıklama, kaydırma ya da Esc ile biter
  const reelBar = document.createElement("div"); reelBar.className = "reel-bar"; reelBar.innerHTML = "<i></i><span>▶ odayı izliyorsun · çıkmak için tıkla ya da Esc</span>"; frame.appendChild(reelBar);
  const REEL_FX = { 1: () => ferry(), 3: () => puffs.forEach(p => { p.userData.t = Math.random() * 0.3; }), 4: () => { drawerHold = true; openDrawer(); }, 5: () => { rgbBoost = 1; } };
  async function showreel() {
    if (reel || !stage.hidden || !frame.classList.contains("is-3d")) return;
    while (busy) await new Promise(r => setTimeout(r, 100));
    // giriş yazısı çekilmiş, oda ekranı dolduruyor (turun başı)
    const total = tourEl.offsetHeight - tourEl.firstElementChild.offsetHeight;
    jump(innerWidth > 900 && total > 10 ? tourEl.offsetTop + total * 0.07 + 2 : scrollY + frame.getBoundingClientRect().top - 72);
    const me = reel = { stop: false, music: false };
    busy = true; capIdx = -1;
    frame.classList.add("reeling");
    if (window.Sfx?.on && !Sfx.music.playing) { Sfx.music.toggle(); me.music = true; }
    const fly = (pos, look, ms) => {
      const p0 = camera.position.clone(), l0 = camLook.clone();
      return tween(ms, t => { if (me.stop) return; camera.position.lerpVectors(p0, pos, t); camLook.lerpVectors(l0, look, t); });
    };
    const wait = ms => new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { if (me.stop || performance.now() - t0 > ms) { clearInterval(id); r(); } }, 50); });
    const n = stops.length - 2;
    for (let i = 1; i <= n && !me.stop; i++) {
      const st = stops[i];
      reelBar.style.setProperty("--p", (i / n).toFixed(3));
      capEl.classList.remove("show");
      await fly(st.pos, st.look, reduceMotion ? 0 : 2400);
      if (me.stop) break;
      capEl.innerHTML = `<span>${st.n} / 07</span><h3>${st.h}</h3><p>${st.p}</p>`;
      capEl.classList.add("show"); sfx("whooshOut");
      REEL_FX[i]?.();
      await wait(2600);
      if (i === 4) drawerHold = false;
    }
    stopReel();
  }
  async function stopReel() {
    const me = reel; if (!me) return;
    me.stop = true; reel = null;
    drawerHold = false;
    frame.classList.remove("reeling");
    capEl.classList.remove("show"); capIdx = -1;
    if (me.music && Sfx.music.playing) Sfx.music.toggle();
    await flyTo(base.pos, base.look, 900);
    busy = false;
  }
  ["pointerdown", "wheel", "touchstart"].forEach(ev => addEventListener(ev, e => { if (reel && !e.target.closest?.("#reelBtn")) stopReel(); }, { passive: true }));
  addEventListener("keydown", e => { if (reel && e.key === "Escape") stopReel(); });
  window.Room3D = { showreel, stopReel, duckHop };

  resize();
  renderer.compile(scene, camera);
  frame.classList.remove("no3d");
  frame.classList.add("is-3d");
  loaderEl?.remove();
  busy = true;
  requestAnimationFrame(frameLoop);
  // açılış: "Sesle/Sessiz gir" seçilince kamera ekranın içinden odaya geri çekilir
  const intro = async () => { await flyTo(base.pos, base.look, reduceMotion ? 0 : 2400); busy = false; setTimeout(ferry, 15000); ferryLoop(); };
  if (boot.entered) intro(); else addEventListener("devroom:enter", intro, { once: true });
  boot.ready();
}

const RB = { uTime: { value: 0 } };
function rainbow(m, coord, key) {
  const prev = m.onBeforeCompile, k = Math.min(m.emissiveIntensity, 2.2);
  m.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    sh.uniforms.uTime = RB.uTime; sh.uniforms.uRbInt = { value: k };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRbL;\nvarying vec3 vRbW;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRbL = position;\nvRbW = (modelMatrix * vec4(position, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uRbInt;\nvarying vec3 vRbL;\nvarying vec3 vRbW;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        float hc = ${coord};
        vec3 rb = clamp(abs(mod(fract(hc - uTime) * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);  // tam doygun ton
        totalEmissiveRadiance = rb * uRbInt;`);
  };
  m.customProgramCacheKey = () => "rb-" + key;
}
// fan halkası: pervane düğümünün yerel düzleminde açı (Blender ekseni z→three y, x→x, y→-z)
const RING = { z: "atan(vRbL.z, vRbL.x) / 6.2831853", x: "atan(vRbL.z, vRbL.y) / 6.2831853", y: "atan(vRbL.y, vRbL.x) / 6.2831853" };
const WAVE = "vRbW.x * 2.2 - vRbW.y * 1.4 + vRbW.z * 0.8";

function maskShader(m) {
  m.onBeforeCompile = s => {
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec4 color;\nvarying vec4 vMask;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMask = color;");
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec4 vMask;")
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= (0.35 + 0.65 * vMask.r) * (0.9 + 0.2 * vMask.a) * (1.0 + 0.22 * vMask.b);")
      .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\nreflectedLight.indirectDiffuse *= vMask.r;");
  };
}

init().catch(err => {
  console.warn("3D oda yüklenemedi, SVG sürüm kullanılıyor:", err);
  loaderEl?.remove();
  frame.classList.remove("is-3d");
  frame.classList.add("no3d");
  boot.ready();
});
