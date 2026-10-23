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
    horn() { HORNS[Math.floor(Math.random() * HORNS.length)](); },  // uzaktan, rastgele: vapur ya da gemi
    meow() { tone(720, 0.45, { type: "triangle", gain: 0.06, to: 480, attack: 0.06 }); tone(1440, 0.4, { type: "sine", gain: 0.02, to: 960, attack: 0.06 }); },
    purr() { for (let i = 0; i < 6; i++) tone(28, 0.12, { type: "sawtooth", gain: 0.05, delay: i * 0.14, attack: 0.03 }); },
  };

  // Boğaz'dan gelen düdükler: yumuşak (sinüs + az harmonik), alçak geçiren süzgeç ve uzak yankı; sert "börrt" yok
  let far = null;
  function farBus() {
    if (far) return far;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 650;
    const dly = ctx.createDelay(1); dly.delayTime.value = 0.38;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    lp.connect(master); lp.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(master);
    return (far = lp);
  }
  function blast(f, t0, dur, gain) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.18);
    g.gain.setValueAtTime(gain, t0 + dur - 0.25); g.gain.linearRampToValueAtTime(0, t0 + dur);
    g.connect(farBus());
    [[f, 1], [f * 2, 0.22], [f * 3, 0.07]].forEach(([fr, a]) => {
      const o = ctx.createOscillator(), og = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.frequency.value = fr; og.gain.value = a;
      lfo.frequency.value = 4.5; lg.gain.value = fr * 0.004; lfo.connect(lg); lg.connect(o.frequency);  // hafif titreme
      o.connect(og); og.connect(g); o.start(t0); lfo.start(t0); o.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05);
    });
  }
  const HORNS = [
    () => { const t = now(); blast(147, t, 0.75, 0.09); blast(147, t + 1.1, 1.6, 0.09); },   // Şehir Hatları vapuru: kısa + uzun
    () => { const t = now(); blast(98, t, 2.8, 0.11); },                                      // büyük gemi: tek, derin, uzun
    () => { const t = now(); blast(175, t, 0.5, 0.06); blast(175, t + 0.75, 0.5, 0.06); blast(175, t + 1.5, 1.2, 0.06); },  // motor: üç kısa
  ];

  // lo-fi müzik (akıllı saatteki Müzik uygulaması): akorlar + bas + davul + plak cızırtısı, hepsi kodla
  const TRACKS = [
    { name: "Lo-fi beats for coding", bpm: 76, chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]] },
    { name: "Boğaz'da gece", bpm: 68, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]] },
    { name: "Deploy günü", bpm: 86, chords: [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [57, 60, 64, 67]] },
  ];
  const music = { playing: false, track: 0, timer: 0, step: 0, next: 0, bus: null, crackle: null };
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  function musicBus() {
    if (music.bus) return music.bus;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200;
    const g = ctx.createGain(); g.gain.value = 0.55;
    lp.connect(g); g.connect(ctx.destination);
    return (music.bus = lp);
  }
  function mNote(f, t, dur, { type = "triangle", gain = 0.05, cut = 1400 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 12;
    lp.type = "lowpass"; lp.frequency.value = cut;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(musicBus()); o.start(t); o.stop(t + dur + 0.05);
  }
  function mNoise(t, dur, type, f, gain) {
    white ||= noiseBuf(1);
    const s = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = white; flt.type = type; flt.frequency.value = f;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(flt); flt.connect(g); g.connect(musicBus()); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(musicBus()); o.start(t); o.stop(t + 0.32);
  }
  function scheduleMusic() {
    const tr = TRACKS[music.track], s16 = 60 / tr.bpm / 4;
    while (music.next < now() + 0.25) {
      const t = music.next, st = music.step % 16, bar = Math.floor(music.step / 16) % tr.chords.length, ch = tr.chords[bar];
      const swing = st % 2 ? s16 * 0.18 : 0;
      if (st === 0) ch.forEach((n, i) => mNote(midi(n), t + i * 0.012, s16 * 15, { gain: 0.045 }));       // yumuşak akor
      if (st === 8) ch.slice(1).forEach(n => mNote(midi(n + 12), t + swing, s16 * 3, { gain: 0.018, cut: 2200 }));
      if (st === 0 || st === 6 || st === 10) mNote(midi(ch[0] - 12), t, s16 * 3, { type: "sine", gain: 0.12, cut: 500 });  // bas
      if (st === 0 || st === 7 || st === 10) kick(t);
      if (st === 4 || st === 12) mNoise(t, 0.16, "bandpass", 1800, 0.12);                                // trampet
      if (st % 2 === 0) mNoise(t + swing, 0.04, "highpass", 7000, st % 4 ? 0.025 : 0.04);                // hi-hat
      music.step++; music.next += s16;
    }
  }
  function startMusic() {
    init(); if (!ctx) return;
    ctx.resume();
    music.playing = true; music.step = 0; music.next = now() + 0.08;
    if (!music.crackle) {  // plak cızırtısı
      const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() < 0.0008 ? (Math.random() * 2 - 1) * 0.8 : (Math.random() * 2 - 1) * 0.012;
      const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
      const g = ctx.createGain(); g.gain.value = 0.35; s.connect(g); g.connect(musicBus()); s.start();
      music.crackle = { s, g };
    }
    music.crackle.g.gain.value = 0.35;
    clearInterval(music.timer); music.timer = setInterval(scheduleMusic, 60); scheduleMusic();
  }
  function stopMusic() {
    music.playing = false; clearInterval(music.timer);
    if (music.crackle) music.crackle.g.gain.value = 0;
  }

  function startAmbient() {
    if (ambient) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf(4, true); s.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380;
    const g = ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.06, now() + 2.5);
    s.connect(lp); lp.connect(g); g.connect(master); s.start();
    ambient = { s, g };  // vapur düdüğünü 3D oda çalar (vapur geçerken)
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
      if (on) { init(); if (!ctx) { on = false; return; } ctx.resume(); startAmbient(); } else if (ctx) { stopAmbient(); stopMusic(); }
      listeners.forEach(fn => fn(on));
    },
    onChange(fn) { listeners.push(fn); },
    play(name, ...a) { if (on && ctx && S[name]) S[name](...a); },
    preferred() { try { return localStorage.getItem("devroom-sound") === "1"; } catch { return false; } },
    music: {
      get playing() { return music.playing; },
      get name() { return TRACKS[music.track].name; },
      toggle() { music.playing ? stopMusic() : startMusic(); return music.playing; },
      skip(d) { music.track = (music.track + d + TRACKS.length) % TRACKS.length; if (music.playing) startMusic(); return TRACKS[music.track].name; },
    },
  };
  return api;
})();
