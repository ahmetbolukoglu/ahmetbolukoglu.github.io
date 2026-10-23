// Dev-room sesleri: hepsi Web Audio ile kodda üretilir (dosya yok).
// Varsayılan kapalı; açılış ekranında "Sesle gir" ya da üst menüdeki düğme açar.
window.Sfx = (function () {
  let ctx = null, master = null, on = false;

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

  // kod yazmalık çalma listesi: 5 parça, hepsi burada notadan üretilir (kayıt yok, telif yok)
  // her parça: tempo, 4 ölçülük akor dizisi ve tarz (davul kalıbı, bas, arpej, melodi, ses rengi)
  const TRACKS = [
    { name: "Gece mesaisi", style: "lo-fi hip hop", bpm: 74, swing: 0.2, crackle: 0.35,
      chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],
      kick: [0, 7, 10], snare: [4, 12], hat: 2, bass: [0, 6, 10], pad: "keys", lead: 0.35 },
    { name: "Boğaz'da gece", style: "chill ambient", bpm: 64, swing: 0, crackle: 0.15,
      chords: [[57, 60, 64, 71], [53, 57, 60, 64], [48, 52, 55, 62], [55, 59, 62, 66]],
      kick: [0, 10], snare: [], rim: [12], hat: 0, bass: [0], pad: "warm", arp: 4, lead: 0.15 },
    { name: "Deploy günü", style: "synthwave", bpm: 96, swing: 0, crackle: 0,
      chords: [[50, 53, 57, 62], [46, 50, 53, 58], [53, 57, 60, 65], [48, 52, 55, 60]],
      kick: [0, 4, 8, 12], snare: [4, 12], hat: 1, bass: [0, 2, 4, 6, 8, 10, 12, 14], bassType: "sawtooth", pad: "saw", arp: 2, lead: 0.25 },
    { name: "Çay molası", style: "jazzy lo-fi", bpm: 82, swing: 0.28, crackle: 0.3,
      chords: [[50, 53, 57, 60, 64], [55, 59, 62, 65, 69], [48, 52, 55, 59, 62], [57, 61, 64, 67, 70]],
      kick: [0, 9], snare: [4, 12], hat: 2, bass: [0, 3, 8, 11], pad: "keys", lead: 0.45 },
    { name: "Derin odak", style: "deep focus", bpm: 70, swing: 0, crackle: 0.1,
      chords: [[48, 51, 55, 62], [44, 48, 51, 55], [51, 55, 58, 62], [46, 50, 53, 58]],
      kick: [0, 8], snare: [], hat: 0, bass: [0, 8], pad: "warm", arp: 2, lead: 0 },
  ];
  const BARS_PER_TRACK = 40;  // sonra sıradaki parçaya geçer
  const music = { playing: false, track: 0, timer: 0, step: 0, next: 0, bus: null, crackle: null };
  const musicListeners = [];
  const emit = () => musicListeners.forEach(fn => { try { fn(); } catch {} });
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  function musicBus() {
    if (music.bus) return music.bus;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 5200;
    const g = ctx.createGain(); g.gain.value = 0.5;
    const dly = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();  // hafif yankı: parçalar daha geniş duyulur
    dly.delayTime.value = 0.32; fb.gain.value = 0.28; wet.gain.value = 0.22;
    lp.connect(g); g.connect(ctx.destination);
    lp.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(g);
    return (music.bus = lp);
  }
  function mNote(f, t, dur, { type = "triangle", gain = 0.05, cut = 1400, attack = 0.03 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 10;
    lp.type = "lowpass"; lp.frequency.value = cut;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(musicBus()); o.start(t); o.stop(t + dur + 0.05);
  }
  function mNoise(t, dur, type, f, gain) {
    white ||= noiseBuf(1);
    const s = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = white; flt.type = type; flt.frequency.value = f;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(flt); flt.connect(g); g.connect(musicBus()); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function kick(t, gain = 0.3) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(musicBus()); o.start(t); o.stop(t + 0.32);
  }
  // akor sesi: tarza göre elektrik piyano, sıcak pad ya da synthwave testeresi
  function pad(tr, ch, t, len) {
    if (tr.pad === "keys") ch.forEach((n, i) => { mNote(midi(n), t + i * 0.014, len, { gain: 0.04 }); mNote(midi(n + 12), t + i * 0.014, len * 0.4, { type: "sine", gain: 0.012, cut: 3000 }); });
    else if (tr.pad === "warm") ch.forEach(n => { mNote(midi(n), t, len * 1.1, { type: "sine", gain: 0.035, attack: 0.6 }); mNote(midi(n) * 1.005, t, len * 1.1, { type: "triangle", gain: 0.015, cut: 900, attack: 0.8 }); });
    else ch.forEach(n => mNote(midi(n), t, len, { type: "sawtooth", gain: 0.014, cut: 1100, attack: 0.25 }));
  }
  // tekrar eden melodi: her parçanın kendi tohumu, 4 ölçüde bir aynı motif (pentatonik, akora uygun)
  const rnd = (seed) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
  function scheduleMusic() {
    const tr = TRACKS[music.track], s16 = 60 / tr.bpm / 4;
    if (music.next < now() - 0.1) music.next = now() + 0.05;  // sekme arka planda kaldıysa kaçan notaları topluca çalma
    while (music.next < now() + 0.25) {
      const t = music.next, st = music.step % 16, barN = Math.floor(music.step / 16), bar = barN % tr.chords.length, ch = tr.chords[bar];
      if (barN >= BARS_PER_TRACK) { music.track = (music.track + 1) % TRACKS.length; music.step = 0; if (music.crackle) music.crackle.g.gain.value = TRACKS[music.track].crackle; emit(); return scheduleMusic(); }
      const sw = st % 2 ? s16 * tr.swing : 0, intro = barN < 2;  // ilk iki ölçü sadece akor: yumuşak giriş
      if (st === 0) pad(tr, ch, t, s16 * 16);
      if (tr.arp && st % tr.arp === 0) { const n = ch[(st / tr.arp) % ch.length] + 12; mNote(midi(n), t + sw, s16 * tr.arp * 1.6, { gain: 0.016, cut: 2600 }); }
      if (!intro) {
        if (tr.bass.includes(st)) mNote(midi(ch[0] - 12), t + sw, s16 * (tr.bassType ? 1.6 : 3), { type: tr.bassType || "sine", gain: tr.bassType ? 0.05 : 0.11, cut: tr.bassType ? 700 : 500 });
        if (tr.kick.includes(st)) kick(t, tr.pad === "warm" ? 0.2 : 0.3);
        if (tr.snare.includes(st)) mNoise(t, 0.16, "bandpass", 1800, 0.1);
        if (tr.rim?.includes(st)) mNoise(t, 0.05, "bandpass", 3200, 0.06);
        if (tr.hat && st % tr.hat === 0) mNoise(t + sw, 0.04, "highpass", 7000, st % 4 ? 0.02 : 0.034);
        const seed = music.track * 1000 + (barN % 4) * 16 + st;
        if (tr.lead && st % 2 === 0 && rnd(seed) < tr.lead) {
          const root = ch[0] + 12, n = root + PENTA[Math.floor(rnd(seed + 7) * PENTA.length)];
          mNote(midi(n), t + sw, s16 * (rnd(seed + 3) < 0.3 ? 4 : 2), { type: tr.pad === "saw" ? "square" : "sine", gain: tr.pad === "saw" ? 0.012 : 0.03, cut: 2400 });
        }
      }
      music.step++; music.next += s16;
    }
  }
  function startMusic() {
    init(); if (!ctx) return;
    ctx.resume();
    music.playing = true; music.step = 0; music.next = now() + 0.08;
    if (!music.crackle) {  // plak cızırtısı (parçaya göre miktar)
      const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() < 0.0008 ? (Math.random() * 2 - 1) * 0.8 : (Math.random() * 2 - 1) * 0.012;
      const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
      const g = ctx.createGain(); g.gain.value = 0; s.connect(g); g.connect(musicBus()); s.start();
      music.crackle = { s, g };
    }
    music.crackle.g.gain.value = TRACKS[music.track].crackle;
    clearInterval(music.timer); music.timer = setInterval(scheduleMusic, 60); scheduleMusic();
    emit();
  }
  function stopMusic() {
    if (!music.playing) return;
    music.playing = false; clearInterval(music.timer);
    if (music.crackle) music.crackle.g.gain.value = 0;
    emit();
  }


  const listeners = [];
  const api = {
    get on() { return on; },
    set(v) {
      on = !!v;
      try { localStorage.setItem("devroom-sound", on ? "1" : "0"); } catch {}
      if (on) { init(); if (!ctx) { on = false; return; } ctx.resume(); } else if (ctx) stopMusic();
      listeners.forEach(fn => fn(on));
    },
    onChange(fn) { listeners.push(fn); },
    play(name, ...a) { if (on && ctx && S[name]) S[name](...a); },
    preferred() { try { return localStorage.getItem("devroom-sound") === "1"; } catch { return false; } },
    music: {
      get playing() { return music.playing; },
      get name() { return TRACKS[music.track].name; },
      get index() { return music.track; },
      get tracks() { return TRACKS.map(t => ({ name: t.name, style: t.style, bpm: t.bpm })); },
      toggle() { music.playing ? stopMusic() : startMusic(); return music.playing; },
      play(i) { music.track = (i + TRACKS.length) % TRACKS.length; startMusic(); return TRACKS[music.track].name; },
      skip(d) { music.track = (music.track + d + TRACKS.length) % TRACKS.length; if (music.playing) startMusic(); else emit(); return TRACKS[music.track].name; },
      onChange(fn) { musicListeners.push(fn); },
    },
  };
  return api;
})();
