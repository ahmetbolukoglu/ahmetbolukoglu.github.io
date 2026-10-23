// Dev-room sesleri: hepsi Web Audio ile kodda üretilir (dosya yok).
// Varsayılan kapalı; açılış ekranında "Sesle gir" ya da üst menüdeki düğme açar.
window.Sfx = (function () {
  let ctx = null, master = null, on = false, ambient = null, hornTimer = 0;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.7;
    // küçük oda yankısı: geri beslemeli gecikme
    const dly = ctx.createDelay(); dly.delayTime.value = 0.09;
    const fb = ctx.createGain(); fb.gain.value = 0.18;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
    master.connect(ctx.destination);
    master.connect(dly); dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(ctx.destination);
  }

  const now = () => ctx.currentTime;
  function noiseBuf(sec = 1, brown = false) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  }
  let white = null;
  function noise(dur, { type = "bandpass", f = 3000, q = 1, gain = 0.3, attack = 0.002, f2 = null } = {}) {
    white ||= noiseBuf(1);
    const s = ctx.createBufferSource(); s.buffer = white;
    const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q;
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, now() + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now()); g.gain.linearRampToValueAtTime(gain, now() + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now() + dur);
    s.connect(flt); flt.connect(g); g.connect(master);
    s.start(now(), Math.random() * 0.5); s.stop(now() + dur + 0.05);
  }
  function tone(freq, dur, { type = "sine", gain = 0.2, attack = 0.005, to = null, delay = 0 } = {}) {
    const t0 = now() + delay;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
    return o;
  }

  const S = {
    key(v = 1) { noise(0.035, { f: 2600 + Math.random() * 1800, q: 2, gain: 0.08 * v }); noise(0.02, { type: "lowpass", f: 400, gain: 0.05 * v }); },
    tick() { tone(1800, 0.04, { type: "square", gain: 0.03 }); },
    click() { noise(0.02, { f: 4000, q: 4, gain: 0.25 }); tone(140, 0.05, { type: "triangle", gain: 0.12, delay: 0.015 }); },
    spoon() { [2100, 3380, 5150, 6900].forEach((f, i) => tone(f * (0.99 + Math.random() * 0.02), 0.5 - i * 0.08, { gain: 0.06 / (i + 1), delay: 0.0 })); setTimeout(() => ctx && [2300, 3600].forEach(f => tone(f, 0.3, { gain: 0.03 })), 140); },
    quack() { [0, 0.17].forEach(d => { tone(620, 0.13, { type: "sawtooth", gain: 0.08, to: 360, delay: d }); tone(1250, 0.1, { type: "square", gain: 0.025, to: 700, delay: d }); }); },
    thump() { tone(120, 0.25, { type: "sine", gain: 0.35, to: 55 }); noise(0.08, { type: "lowpass", f: 700, gain: 0.15 }); },
    whooshIn() { noise(0.45, { f: 300, f2: 2400, q: 0.8, gain: 0.18, attack: 0.15 }); },
    whooshOut() { noise(0.4, { f: 2200, f2: 260, q: 0.8, gain: 0.14, attack: 0.08 }); },
    drawer() { noise(0.55, { type: "lowpass", f: 900, f2: 350, gain: 0.22, attack: 0.05 }); tone(70, 0.2, { gain: 0.12, delay: 0.5 }); },
    paper() { noise(0.18, { f: 5000, q: 0.6, gain: 0.08, attack: 0.03 }); },
    rustle() { for (let i = 0; i < 4; i++) setTimeout(() => ctx && noise(0.12, { f: 6000, q: 0.5, gain: 0.05 }), i * 70); },
    chime() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 1.2, { gain: 0.07, delay: i * 0.09, attack: 0.01 })); },
    success() { tone(880, 0.12, { type: "triangle", gain: 0.06 }); tone(1320, 0.25, { type: "triangle", gain: 0.06, delay: 0.1 }); },
    horn() {  // uzaktan vapur düdüğü: iki ses, kalın, Boğaz'dan yankılı
      const t0 = now();
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.16, t0 + 0.35);
      g.gain.setValueAtTime(0.16, t0 + 1.7); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
      [110, 110.8, 164.8].forEach(f => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(lp); o.start(t0); o.stop(t0 + 3.3); });
      lp.connect(g); g.connect(master);
    },
  };

  function startAmbient() {
    if (ambient) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf(4, true); s.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380;
    const g = ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.06, now() + 2.5);
    s.connect(lp); lp.connect(g); g.connect(master); s.start();
    ambient = { s, g };
    const schedule = () => { hornTimer = setTimeout(() => { if (on) S.horn(); schedule(); }, 70000 + Math.random() * 60000); };
    schedule();
  }
  function stopAmbient() {
    if (!ambient) return;
    ambient.g.gain.linearRampToValueAtTime(0, now() + 0.6);
    const a = ambient; setTimeout(() => a.s.stop(), 700);
    ambient = null; clearTimeout(hornTimer);
  }

  const listeners = [];
  const api = {
    get on() { return on; },
    set(v) {
      on = !!v;
      try { localStorage.setItem("devroom-sound", on ? "1" : "0"); } catch {}
      if (on) { init(); if (!ctx) { on = false; return; } ctx.resume(); startAmbient(); } else if (ctx) stopAmbient();
      listeners.forEach(fn => fn(on));
    },
    onChange(fn) { listeners.push(fn); },
    play(name, ...a) { if (on && ctx && S[name]) S[name](...a); },
    preferred() { try { return localStorage.getItem("devroom-sound") === "1"; } catch { return false; } },
  };
  return api;
})();
