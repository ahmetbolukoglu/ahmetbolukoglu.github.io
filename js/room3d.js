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
  W_Wood: { color: "#9a6a42", roughness: 0.6 },
  W_WoodDark: { color: "#4a2f1c", roughness: 0.65 },
  W_Rug: { color: "#3a2a6e", roughness: 1, map: "rug" },
  W_Black: { color: "#0d0c16", roughness: 0.35 },
  W_Alu: { color: "#c3c7d1", roughness: 0.32, metalness: 0.85 },
  W_Plastic: { color: "#1f1b3b", roughness: 0.5 },
  W_Glass: { color: "#cfe8ff", roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false },
  W_Tea: { color: "#c2410c", roughness: 0.15, transparent: true, opacity: 0.92 },
  W_Ceramic: { color: "#eeebf8", roughness: 0.35 },
  W_Lamp: { color: "#7c3aed", roughness: 0.45 },
  W_Bulb: { color: "#fff3c4", emissive: "#fde68a", emissiveIntensity: 3 },
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
};
const SCREENS = ["W_Screen_iMac", "W_Screen_Tablet", "W_Screen_Phone", "W_Cert"];
const CLICK = ["iMac", "Tablet", "Phone", "Shelf", "Lamp", "Tea", "Duck", "Ball", "Window", "Cert", "Plant", "Clock", "Neon"];

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

function skyTexture(day) {
  return canvasTex(2048, 1024, (g, w, h, shoot) => {
    const sky = g.createLinearGradient(0, 0, 0, h * .62);
    if (day) { sky.addColorStop(0, "#5aa7e8"); sky.addColorStop(1, "#f6c99a"); }
    else { sky.addColorStop(0, "#060a24"); sky.addColorStop(.7, "#1d1650"); sky.addColorStop(1, "#5b2a68"); }
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    if (!day) {
      g.fillStyle = "#fff";
      for (let i = 0; i < 160; i++) { const x = (i * 733) % w, y = (i * 389) % (h * .5); g.globalAlpha = .3 + (i % 5) / 7; g.fillRect(x, y, 2, 2); }
      g.globalAlpha = 1;
      const mg = g.createRadialGradient(1300, 200, 10, 1300, 200, 160); mg.addColorStop(0, "rgba(255,247,214,.5)"); mg.addColorStop(1, "rgba(255,247,214,0)");
      g.fillStyle = mg; g.fillRect(1100, 0, 400, 400);
      g.fillStyle = "#fff4cc"; g.beginPath(); g.arc(1300, 200, 46, 0, 7); g.fill();
      g.fillStyle = "#14103c"; g.beginPath(); g.arc(1324, 186, 40, 0, 7); g.fill();
      if (shoot) { g.strokeStyle = "#fff"; g.lineWidth = 4; g.beginPath(); g.moveTo(shoot.x, shoot.y); g.lineTo(shoot.x + 120, shoot.y - 60); g.stroke(); }
    } else {
      g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(1300, 200, 60, 0, 7); g.fill();
    }
    // Asya yakası tepeleri ve camiler
    const hz = h * .62;
    g.fillStyle = day ? "#6b7aa6" : "#2a1f52";
    g.beginPath(); g.moveTo(0, hz);
    for (let x = 0; x <= w; x += 64) g.lineTo(x, hz - 40 - Math.sin(x / 210) * 28 - Math.sin(x / 77) * 8);
    g.lineTo(w, hz); g.fill();
    const sil = day ? "#4a5785" : "#1b1540";
    const lights = day ? null : "#fcd34d";
    const mosque = (x, s) => {
      g.fillStyle = sil;
      g.beginPath(); g.ellipse(x, hz - 40 * s, 60 * s, 52 * s, 0, Math.PI, 0); g.fill();
      g.fillRect(x - 70 * s, hz - 42 * s, 140 * s, 42 * s);
      for (const dx of [-95, 95]) { g.fillRect(x + dx * s - 5 * s, hz - 170 * s, 10 * s, 170 * s); g.beginPath(); g.moveTo(x + dx * s - 6 * s, hz - 170 * s); g.lineTo(x + dx * s, hz - 205 * s); g.lineTo(x + dx * s + 6 * s, hz - 170 * s); g.fill(); }
    };
    mosque(420, 1.1); mosque(1650, .8);
    g.fillStyle = sil;
    for (let i = 0; i < 26; i++) { const x = 60 + i * 78, bh = 30 + (i * 53) % 60; g.fillRect(x, hz - bh, 50, bh); if (lights) { g.fillStyle = lights; for (let k = 0; k < 3; k++) if ((i + k) % 2) g.fillRect(x + 8 + k * 14, hz - bh + 10, 6, 6); g.fillStyle = sil; } }
    // Galata
    g.fillRect(1080, hz - 160, 44, 160); g.beginPath(); g.moveTo(1072, hz - 158); g.lineTo(1102, hz - 230); g.lineTo(1132, hz - 158); g.fill();
    // Boğaz
    const sea = g.createLinearGradient(0, hz, 0, h);
    sea.addColorStop(0, day ? "#3d78b5" : "#2a1d55"); sea.addColorStop(1, day ? "#1e4a7a" : "#0b0a26");
    g.fillStyle = sea; g.fillRect(0, hz, w, h - hz);
    g.strokeStyle = day ? "rgba(255,255,255,.35)" : "rgba(252,211,77,.4)"; g.lineWidth = 3;
    for (let i = 0; i < 40; i++) { const x = (i * 397) % w, y = hz + 20 + (i * 131) % (h - hz - 40); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30 + (i % 4) * 10, y); g.stroke(); }
    // Kız Kulesi
    const kx = 760, ky = hz + 110;
    g.fillStyle = day ? "#d9d2c3" : "#3a2d70";
    g.fillRect(kx - 70, ky - 34, 140, 34); g.fillRect(kx - 24, ky - 110, 48, 80); g.fillRect(kx - 30, ky - 118, 60, 10);
    g.beginPath(); g.moveTo(kx - 18, ky - 118); g.lineTo(kx, ky - 175); g.lineTo(kx + 18, ky - 118); g.fill();
    if (!day) { g.fillStyle = "#fcd34d"; g.fillRect(kx - 8, ky - 90, 16, 20); g.fillRect(kx - 50, ky - 24, 12, 12); g.fillRect(kx + 38, ky - 24, 12, 12); g.beginPath(); g.arc(kx, ky - 182, 7, 0, 7); g.fill(); }
  });
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
  const tex = canvasTex(1024, 620, (g, w, h) => {
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

function tabletScreen() {
  return canvasTex(512, 744, (g, w, h) => {
    g.fillStyle = "#f5f3ff"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#a78bfa"; g.beginPath(); g.arc(80, 90, 46, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.font = "700 36px Space Grotesk, sans-serif"; g.textAlign = "center"; g.fillText("AB", 80, 103);
    g.textAlign = "left"; g.fillStyle = "#15132e"; g.font = "700 30px Space Grotesk, sans-serif"; g.fillText("Ahmet Bölükoğlu", 146, 84);
    g.fillStyle = "#7c3aed"; g.font = "20px JetBrains Mono, monospace"; g.fillText("Kıdemli Yazılım Uzmanı", 146, 116);
    g.fillStyle = "#ddd8f5"; g.fillRect(36, 160, w - 72, 3);
    const jobs = [["EnerjiSA", "2024–2025"], ["Agrio Finans", "2023–2024"], ["Ovinot · Takım Lideri", "2020–2023"], ["Akbank", "2018–2019"], ["Medipol Üniv.", "2014–2016"]];
    g.fillStyle = "#ddd8f5"; g.fillRect(52, 200, 3, 470);
    jobs.forEach(([n, d], i) => {
      const y = 210 + i * 94;
      g.fillStyle = i ? "#a78bfa" : "#14b8a6"; g.beginPath(); g.arc(53, y, 12, 0, 7); g.fill();
      g.fillStyle = "#15132e"; g.font = "700 24px Space Grotesk, sans-serif"; g.fillText(n, 84, y + 8);
      g.fillStyle = "#8b86a8"; g.font = "18px JetBrains Mono, monospace"; g.fillText(d, 84, y + 36);
      g.fillStyle = "#e4e0f5"; g.fillRect(84, y + 48, 300 - i * 24, 8);
    });
  });
}

function phoneScreen() {
  return canvasTex(256, 552, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, "#7c3aed"); bg.addColorStop(1, "#db2777");
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = "#000"; g.beginPath(); g.roundRect(88, 14, 80, 22, 11); g.fill();
    const t = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    g.fillStyle = "#fff"; g.textAlign = "center"; g.font = "700 64px Space Grotesk, sans-serif"; g.fillText(t, w / 2, 140);
    g.font = "18px Space Grotesk, sans-serif"; g.fillText(new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" }), w / 2, 172);
    g.fillStyle = "rgba(255,255,255,.92)"; g.beginPath(); g.roundRect(18, 240, w - 36, 84, 18); g.fill();
    g.fillStyle = "#15132e"; g.textAlign = "left"; g.font = "700 18px Space Grotesk, sans-serif"; g.fillText("✉️ Yeni mesaj", 34, 274);
    g.fillStyle = "#4b4670"; g.font = "16px Space Grotesk, sans-serif"; g.fillText("Projen için konuşalım mı?", 34, 302);
    g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.roundRect(w / 2 - 50, h - 22, 100, 6, 3); g.fill();
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
  if (!canvas || !webglOK()) { frame?.classList.add("no3d"); return; }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0f0d24");
  const camera = new THREE.PerspectiveCamera(40, 16 / 10, 0.03, 60);
  const HOME = { pos: B(0.15, -1.5, 1.42), look: B(0.18, 1.3, 1.22) };
  camera.position.copy(HOME.pos); camera.lookAt(HOME.look);

  // ışıklar
  const hemi = new THREE.HemisphereLight("#4a46a0", "#140f28", 1.1); scene.add(hemi);
  const moon = new THREE.DirectionalLight("#9db4ff", 1.2); moon.position.copy(B(-1.6, 6, 3.5)); moon.target.position.copy(B(0, 0.5, 0.6)); scene.add(moon, moon.target);
  const lampLight = new THREE.PointLight("#ffb35c", 2.2, 0, 2); lampLight.position.copy(B(-0.27, 1.22, 1.1)); scene.add(lampLight);
  const monLight = new THREE.PointLight("#5eead4", 0.9, 0, 2); monLight.position.copy(B(0.12, 1.15, 1.1)); scene.add(monLight);
  const ledLight = new THREE.PointLight("#5eead4", 0.7, 0, 2); ledLight.position.copy(B(0.0, 0.88, 0.55)); scene.add(ledLight);
  const neonLight = new THREE.PointLight("#f472b6", 0.8, 0, 2); neonLight.position.copy(B(0.12, 1.4, 2.1)); scene.add(neonLight);

  // dış manzara (Asya yakası, Boğaz, Kız Kulesi)
  const hourIst = +new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul", hour: "numeric", hour12: false });
  const day = hourIst >= 7 && hourIst < 18;
  const sky = skyTexture(day);
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshBasicMaterial({ map: sky, toneMapped: false }));
  sky.flipY = true; sky.needsUpdate = true;
  outside.position.copy(B(-1.0, 9, 1.9)); scene.add(outside);
  if (day) { hemi.intensity = 1.8; moon.color.set("#fff1d6"); moon.intensity = 2.2; }

  // model
  const gltf = await new GLTFLoader().loadAsync("models/room.glb", e => {
    if (loaderEl && e.total) loaderEl.querySelector("b").textContent = Math.round(e.loaded / e.total * 100) + "%";
  });
  const root = gltf.scene; scene.add(root);
  const parts = {};
  root.children.forEach(o => { parts[o.name] = o; });

  const screenTex = { W_Screen_iMac: imacScreen(), W_Screen_Tablet: tabletScreen(), W_Screen_Phone: phoneScreen(), W_Cert: certScreen() };
  const patterns = {};
  const partMats = {};

  root.traverse(o => {
    if (!o.isMesh) return;
    let part = o; while (part.parent && part.parent !== root) part = part.parent;
    const name = o.material.name;
    let m;
    if (SCREENS.includes(name)) {
      m = new THREE.MeshBasicMaterial({ map: screenTex[name], toneMapped: false });
    } else {
      const d = MATS[name] || { color: "#888" };
      const { map, ...rest } = d;
      if (map && !patterns[map]) patterns[map] = PATTERNS[map]();
      m = new THREE.MeshStandardMaterial({ ...rest, map: map ? patterns[map] : null });
      if (rest.emissive) m.emissive = new THREE.Color(rest.emissive);
      maskShader(m);
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
  const steam = new THREE.Group(); steam.position.copy(B(-0.2, 1.0, 0.86)); scene.add(steam);
  const puffTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const puffs = Array.from({ length: 10 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData.t = i / 10; s.scale.setScalar(0.04); steam.add(s); return s;
  });

  // etiketler (HTML, 3D noktaya bağlı)
  const TAGS = [
    { text: "🖥️ masaüstü", at: B(0.12, 1.36, 1.36), cls: "c" },
    { text: "📲 cv.pdf", at: B(0.72, 1.3, 1.12), cls: "v" },
    { text: "📱 iletişim", at: B(0.52, 1.07, 0.96), cls: "p" },
  ].map(t => { const el = document.createElement("div"); el.className = "tag3d " + t.cls; el.textContent = t.text; frame.appendChild(el); return { ...t, el }; });

  // ---------------------------------------------------------------- etkileşim
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hover = null, busy = false, lampOn = true, teaCount = 1, qi = 0;
  const QUACK = ["🦆 Quack! Bug'ı bana anlat…", "🦆 Satır satır anlat, bulacağız.", "🦆 Null mı geliyor yoksa?", "🦆 Cache'i temizledin mi?"];

  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    ndc.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    for (const h of ray.intersectObject(root, true)) {
      let p = h.object; while (p.parent && p.parent !== root) p = p.parent;
      if (p.name === "Room") return null;
      if (CLICK.includes(p.name) || p.name.startsWith("Clock")) return p.name.startsWith("Clock") ? parts.Clock : p;
    }
    return null;
  }
  function setHover(p) {
    if (hover === p) return;
    if (hover) (partMats[hover.name] || []).forEach(m => m.emissive.set(m.userData.e0 ?? 0x000000));
    hover = p;
    if (hover) (partMats[hover.name] || []).forEach(m => { m.userData.e0 ??= m.emissive.getHex(); if (!m.userData.e0) m.emissive.set("#2a2550"); });
    canvas.style.cursor = hover ? "pointer" : "";
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
  const say = (obj, msg) => window.roomSay && window.roomSay(rectOf(obj), msg);

  function tween(ms, fn) {
    return new Promise(res => {
      if (reduceMotion) { fn(1); return res(); }
      const t0 = performance.now();
      const step = now => { const t = Math.min(1, (now - t0) / ms); fn(1 - Math.pow(1 - t, 3)); t < 1 ? requestAnimationFrame(step) : res(); };
      requestAnimationFrame(step);
    });
  }
  const camLook = HOME.look.clone();
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

  const DEV = { iMac: "imac", Tablet: "tablet", Phone: "phone" };
  Devices.setRectSource(type => {
    const name = Object.keys(DEV).find(k => DEV[k] === type);
    return frame.classList.contains("is-3d") && parts[name] ? rectOf(parts[name]) : null;
  });
  Devices.onClose(async () => { drop(); busy = true; await flyTo(HOME.pos, HOME.look, 800); busy = false; });

  async function act(p) {
    if (!p || busy) return;
    const n = p.name;
    if (n === "iMac" || n === "Shelf") {
      busy = true;
      await flyTo(B(0.12, 0.55, 1.12), B(0.12, 1.36, 1.1));
      busy = false;
      Devices.open("imac", n === "Shelf" ? "yetenekler" : undefined);
    } else if (n === "Tablet" || n === "Phone") {
      busy = true;
      const o = parts[n], c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
      await Promise.all([flyTo(c.clone().add(new THREE.Vector3(0, 0.15, 0.9)), c, 650), lift(n)]);
      busy = false;
      Devices.open(DEV[n]);
    } else if (n === "Lamp") {
      lampOn = !lampOn;
      lampLight.intensity = lampOn ? 2.2 : 0;
      (partMats.Lamp || []).filter(m => m.name === "W_Bulb").forEach(m => { m.emissiveIntensity = lampOn ? 3 : 0; });
      hemi.intensity = (day ? 1.8 : 1.1) * (lampOn ? 1 : 0.6);
      say(p, lampOn ? "💡 Işıklar açık" : "🌙 Gece modu: sadece monitör");
    } else if (n === "Tea") {
      say(p, `🍵 Çay tazelendi! (${++teaCount}. bardak)`);
      puffs.forEach(s => { s.userData.t = Math.random() * 0.3; });
    } else if (n === "Duck") {
      const y0 = p.position.y;
      tween(500, t => { p.position.y = y0 + Math.sin(t * Math.PI) * 0.06; p.rotation.y = Math.sin(t * Math.PI * 2) * 0.4; });
      say(p, QUACK[qi++ % QUACK.length]);
    } else if (n === "Ball") {
      const x0 = p.position.x;
      tween(1400, t => { const k = Math.sin(t * Math.PI); p.position.x = x0 + k * 0.5; p.rotation.z = -k * 0.5 / 0.11; });
      say(p, "⚽ Halı saha akşam 21:00'de!");
    } else if (n === "Window") {
      if (!day) { const s = { x: 1500, y: 160 }; tween(900, t => sky.redraw({ x: s.x - t * 500, y: s.y + t * 250 })).then(() => sky.redraw()); }
      say(p, day ? "☀️ Üsküdar'dan Boğaz manzarası" : "🌠 Kız Kulesi manzarası, bir dilek tut");
    } else if (n === "Cert") say(p, "📜 MCPD — 100 puan (2013)");
    else if (n === "Plant") say(p, "🌿 Su verildi, teşekkürler!");
    else if (n === "Clock") say(p, "🕐 " + new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }));
    else if (n === "Neon") say(p, "🍵 çay · kod · tekrar");
  }

  let mouse = { x: 0, y: 0 };
  canvas.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect();
    mouse = { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 };
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
  }
  new ResizeObserver(resize).observe(frame);

  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(frame);
  const stage = document.getElementById("stage");
  const tmp = new THREE.Vector3();
  let last = 0, lastType = 0;

  function frameLoop(now) {
    requestAnimationFrame(frameLoop);
    if (!visible || document.hidden || !stage.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // saat
    const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, hr = (d.getHours() % 12) + m / 60;
    if (parts.ClockSec) { parts.ClockSec.rotation.z = -s / 60 * Math.PI * 2; parts.ClockMin.rotation.z = -m / 60 * Math.PI * 2; parts.ClockHour.rotation.z = -hr / 12 * Math.PI * 2; }
    // ekranlar
    if (!reduceMotion && now - lastType > 45) { screenTex.W_Screen_iMac.step(); lastType = now; }
    if (now % 30000 < 20) screenTex.W_Screen_Phone.redraw();
    // ışık nabızları
    const hue = (now / 8000) % 1;
    ledLight.color.setHSL(0.47 + hue * 0.45, 0.8, 0.6);
    (partMats.Desk || []).filter(x => x.name === "W_LED").forEach(x => x.emissive.copy(ledLight.color));
    const flick = reduceMotion ? 1 : ((now / 1000) % 6 > 5.6 && Math.sin(now / 30) > 0 ? 0.35 : 1);
    neon.material.opacity = flick; neonLight.intensity = 0.8 * flick;
    // buhar
    puffs.forEach((p, i) => {
      p.userData.t = (p.userData.t + dt * 0.35) % 1;
      const t = p.userData.t;
      p.position.set(Math.sin(t * 6 + i) * 0.012, t * 0.16, 0);
      p.material.opacity = Math.sin(t * Math.PI) * 0.6; p.scale.setScalar(0.03 + t * 0.05);
    });
    // kamera: fareyle hafif paralaks
    if (!busy && stage.hidden && !Object.keys(lifted).length) {
      tmp.copy(HOME.pos).add(new THREE.Vector3(mouse.x * 0.18, -mouse.y * 0.1, 0));
      camera.position.lerp(tmp, 0.05);
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

  resize();
  renderer.compile(scene, camera);
  frame.classList.remove("no3d");
  frame.classList.add("is-3d");
  loaderEl?.remove();
  requestAnimationFrame(frameLoop);
}

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
});
