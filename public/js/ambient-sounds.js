// ============================================
// SERENITY — Mood-Adaptive Ambient Soundscape
// Procedural audio via Web Audio API — no external files
// ============================================

window.AmbientSounds = (function () {
  'use strict';

  let ctx = null;
  let masterGain = null;
  let currentProfile = null;
  let currentProfileName = 'calm';
  let playing = false;
  let masterVolume = 0.3;

  // Pre-generated noise buffers (created once on init)
  let whiteNoiseBuf = null;
  let pinkNoiseBuf = null;
  let brownNoiseBuf = null;

  function generateWhiteNoise(duration) {
    const length = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function generatePinkNoise(duration) {
    const length = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buf;
  }

  function generateBrownNoise(duration) {
    const length = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * white) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    }
    return buf;
  }

  function noiseSource(buffer) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    return src;
  }

  function makeGain(value) {
    const g = ctx.createGain();
    g.gain.value = value;
    return g;
  }

  function makeFilter(type, freq, q) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (q !== undefined) f.Q.value = q;
    return f;
  }

  function randBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function createProfileHandle() {
    const handle = {
      nodes: [],
      timers: [],
      alive: true,
      output: makeGain(1),
      addNode(n) { this.nodes.push(n); return n; },
      addTimer(t) { this.timers.push(t); return t; },
      start() {},
      stop() {
        this.alive = false;
        this.timers.forEach(clearTimeout);
        this.timers = [];
        this.nodes.forEach(n => { try { n.stop?.(); n.disconnect(); } catch (_) {} });
        this.nodes = [];
        try { this.output.disconnect(); } catch (_) {}
      }
    };
    handle.output.connect(masterGain);
    return handle;
  }

  // ==================== SOUND PROFILES ====================

  function profileCalm() { // default — soft drone, wind, chimes
    const h = createProfileHandle();

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine'; osc1.frequency.value = 100;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine'; osc2.frequency.value = 150;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 0.15;
    const lfoGain = makeGain(0.15);
    const padGain = makeGain(0.25);
    lfo.connect(lfoGain); lfoGain.connect(padGain.gain);
    osc1.connect(padGain); osc2.connect(padGain); padGain.connect(h.output);
    [osc1, osc2, lfo, lfoGain, padGain].forEach(n => h.addNode(n));
    osc1.start(); osc2.start(); lfo.start();

    // Wind — filtered white noise with slow bandpass sweep
    const wind = noiseSource(whiteNoiseBuf);
    const windFilter = makeFilter('bandpass', 800, 0.8);
    const windGain = makeGain(0.06);
    wind.connect(windFilter); windFilter.connect(windGain); windGain.connect(h.output);
    [wind, windFilter, windGain].forEach(n => h.addNode(n));
    wind.start();
    function sweepWind() {
      if (!h.alive) return;
      const target = randBetween(400, 1200);
      windFilter.frequency.linearRampToValueAtTime(target, ctx.currentTime + 4);
      h.addTimer(setTimeout(sweepWind, randBetween(3000, 6000)));
    }
    sweepWind();
    // Chime at 528Hz with 2s decay
    function chime() {
      if (!h.alive) return;
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = 528;
      const g = makeGain(0.08);
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
      o.connect(g); g.connect(h.output);
      h.addNode(o); h.addNode(g);
      o.start();
      o.stop(ctx.currentTime + 2.1);
      h.addTimer(setTimeout(chime, randBetween(5000, 12000)));
    }
    h.addTimer(setTimeout(chime, randBetween(2000, 5000)));

    return h;
  }

  function profileRain() {
    const h = createProfileHandle();

    const rain = noiseSource(whiteNoiseBuf);
    const rainFilter = makeFilter('bandpass', 2000, 1.2);
    const rainGain = makeGain(0.18);
    rain.connect(rainFilter); rainFilter.connect(rainGain); rainGain.connect(h.output);
    [rain, rainFilter, rainGain].forEach(n => h.addNode(n));
    rain.start();
    // Soft pad underneath
    const pad = ctx.createOscillator();
    pad.type = 'sine'; pad.frequency.value = 110;
    const padGain = makeGain(0.08);
    pad.connect(padGain); padGain.connect(h.output);
    [pad, padGain].forEach(n => h.addNode(n));
    pad.start();
    // Distant thunder every 15-30s
    function thunder() {
      if (!h.alive) return;
      const burst = noiseSource(brownNoiseBuf);
      const filt = makeFilter('lowpass', 120, 1);
      const g = makeGain(0);
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.5);
      g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 1.5);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4);
      burst.connect(filt); filt.connect(g); g.connect(h.output);
      [burst, filt, g].forEach(n => h.addNode(n));
      burst.start();
      burst.stop(ctx.currentTime + 4.1);
      h.addTimer(setTimeout(thunder, randBetween(15000, 30000)));
    }
    h.addTimer(setTimeout(thunder, randBetween(5000, 15000)));

    return h;
  }

  function profileNature() {
    const h = createProfileHandle();

    const stream = noiseSource(pinkNoiseBuf);
    const streamFilt = makeFilter('bandpass', 600, 0.6);
    const streamGain = makeGain(0.1);
    stream.connect(streamFilt); streamFilt.connect(streamGain); streamGain.connect(h.output);
    [stream, streamFilt, streamGain].forEach(n => h.addNode(n));
    stream.start();
    // Light breeze
    const breeze = noiseSource(whiteNoiseBuf);
    const breezeFilt = makeFilter('bandpass', 1000, 0.4);
    const breezeGain = makeGain(0.03);
    breeze.connect(breezeFilt); breezeFilt.connect(breezeGain); breezeGain.connect(h.output);
    [breeze, breezeFilt, breezeGain].forEach(n => h.addNode(n));
    breeze.start();
    // Birdsong — randomized sine chirps
    function bird() {
      if (!h.alive) return;
      const o = ctx.createOscillator();
      o.type = 'sine';
      const startFreq = randBetween(2000, 3200);
      const endFreq = randBetween(2800, 4000);
      const dur = randBetween(0.08, 0.2);
      const chirpCount = Math.floor(randBetween(2, 5));
      const g = makeGain(0.06);
      o.connect(g); g.connect(h.output);
      h.addNode(o); h.addNode(g);
      o.frequency.value = startFreq;
      const now = ctx.currentTime;
      // Rapid chirp pattern
      for (let i = 0; i < chirpCount; i++) {
        const t = now + i * dur * 1.5;
        o.frequency.setValueAtTime(startFreq, t);
        o.frequency.linearRampToValueAtTime(endFreq, t + dur);
        g.gain.setValueAtTime(0.06, t);
        g.gain.setValueAtTime(0.001, t + dur);
      }
      const totalDur = chirpCount * dur * 1.5 + 0.1;
      o.start(now);
      o.stop(now + totalDur);
      h.addTimer(setTimeout(bird, randBetween(2000, 8000)));
    }
    h.addTimer(setTimeout(bird, randBetween(500, 2000)));

    return h;
  }

  function profileFireplace() {
    const h = createProfileHandle();

    const drone = ctx.createOscillator();
    drone.type = 'sine'; drone.frequency.value = 80;
    const droneGain = makeGain(0.12);
    drone.connect(droneGain); droneGain.connect(h.output);
    [drone, droneGain].forEach(n => h.addNode(n));
    drone.start();
    // Crackling fire — rapid short noise bursts
    let crackleRunning = true;
    function crackle() {
      if (!h.alive || !crackleRunning) return;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.02), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = makeFilter('bandpass', randBetween(1000, 4000), 2);
      const g = makeGain(randBetween(0.03, 0.12));
      src.connect(filt); filt.connect(g); g.connect(h.output);
      h.addNode(src); h.addNode(filt); h.addNode(g);
      src.start();
      // 3-8 crackles per second → 125-333ms interval
      h.addTimer(setTimeout(crackle, randBetween(125, 333)));
    }
    crackle();
    // Occasional deeper crackle
    function deepCrackle() {
      if (!h.alive) return;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = makeFilter('lowpass', 600, 1);
      const g = makeGain(0.15);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      src.connect(filt); filt.connect(g); g.connect(h.output);
      h.addNode(src); h.addNode(filt); h.addNode(g);
      src.start();
      h.addTimer(setTimeout(deepCrackle, randBetween(2000, 6000)));
    }
    h.addTimer(setTimeout(deepCrackle, randBetween(1000, 3000)));

    h._crackleStop = () => { crackleRunning = false; };
    return h;
  }

  function profileNight() {
    const h = createProfileHandle();

    const pad = ctx.createOscillator();
    pad.type = 'sine'; pad.frequency.value = 90;
    const padGain = makeGain(0.06);
    pad.connect(padGain); padGain.connect(h.output);
    [pad, padGain].forEach(n => h.addNode(n));
    pad.start();
    // Gentle wind
    const wind = noiseSource(whiteNoiseBuf);
    const windFilt = makeFilter('bandpass', 600, 0.5);
    const windGain = makeGain(0.04);
    wind.connect(windFilt); windFilt.connect(windGain); windGain.connect(h.output);
    [wind, windFilt, windGain].forEach(n => h.addNode(n));
    wind.start();
    // Cricket chirps — 2-3 crickets at different rates
    function makeCricket(freq, onMs, offMs) {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = freq;
      const g = makeGain(0);
      o.connect(g); g.connect(h.output);
      h.addNode(o); h.addNode(g);
      o.start();
      function tick() {
        if (!h.alive) return;
        const now = ctx.currentTime;
        g.gain.setValueAtTime(0.04, now);
        g.gain.setValueAtTime(0, now + onMs / 1000);
        h.addTimer(setTimeout(tick, onMs + offMs));
      }
      tick();
    }
    makeCricket(4000, 30, randBetween(100, 180));
    makeCricket(4200, 25, randBetween(140, 220));
    if (Math.random() > 0.3) makeCricket(3800, 35, randBetween(120, 200));

    return h;
  }

  function profileOcean() {
    const h = createProfileHandle();

    const pad = ctx.createOscillator();
    pad.type = 'sine'; pad.frequency.value = 65;
    const padGain = makeGain(0.1);
    pad.connect(padGain); padGain.connect(h.output);
    [pad, padGain].forEach(n => h.addNode(n));
    pad.start();
    // Wave simulation — pink noise with slow volume + filter cycling
    const wave = noiseSource(pinkNoiseBuf);
    const waveFilt = makeFilter('bandpass', 400, 0.7);
    const waveGain = makeGain(0.001);
    wave.connect(waveFilt); waveFilt.connect(waveGain); waveGain.connect(h.output);
    [wave, waveFilt, waveGain].forEach(n => h.addNode(n));
    wave.start();
    function waveCycle() {
      if (!h.alive) return;
      const cycleDur = randBetween(6, 10);
      const half = cycleDur / 2;
      const now = ctx.currentTime;
      // Swell up
      waveGain.gain.setValueAtTime(0.02, now);
      waveGain.gain.linearRampToValueAtTime(0.18, now + half);
      waveFilt.frequency.setValueAtTime(300, now);
      waveFilt.frequency.linearRampToValueAtTime(800, now + half);
      // Recede
      waveGain.gain.linearRampToValueAtTime(0.02, now + cycleDur);
      waveFilt.frequency.linearRampToValueAtTime(300, now + cycleDur);
      h.addTimer(setTimeout(waveCycle, cycleDur * 1000));
    }
    waveCycle();
    // Distant seagull-like tone every 20-40s
    function seagull() {
      if (!h.alive) return;
      const o = ctx.createOscillator();
      o.type = 'sine';
      const g = makeGain(0.03);
      o.connect(g); g.connect(h.output);
      h.addNode(o); h.addNode(g);
      const now = ctx.currentTime;
      // Rising then falling cry
      o.frequency.setValueAtTime(1800, now);
      o.frequency.linearRampToValueAtTime(2400, now + 0.3);
      o.frequency.linearRampToValueAtTime(1600, now + 0.8);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.03, now + 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      o.start(now);
      o.stop(now + 1);
      h.addTimer(setTimeout(seagull, randBetween(20000, 40000)));
    }
    h.addTimer(setTimeout(seagull, randBetween(8000, 20000)));

    return h;
  }

  const profiles = {
    calm: profileCalm,
    rain: profileRain,
    nature: profileNature,
    fireplace: profileFireplace,
    night: profileNight,
    ocean: profileOcean
  };

  const moodMap = {
    happy: 'nature', grateful: 'nature', proud: 'nature',
    anxious: 'rain', stressed: 'rain', overwhelmed: 'rain',
    sad: 'fireplace', lonely: 'fireplace',
    tired: 'night', exhaustion: 'night',
    calm: 'ocean', peaceful: 'ocean'
  };

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(ctx.destination);

    whiteNoiseBuf = generateWhiteNoise(4);
    pinkNoiseBuf = generatePinkNoise(4);
    brownNoiseBuf = generateBrownNoise(4);
    if (ctx.state === 'suspended') ctx.resume();
  }

  function fadeToProfile(profileName, durationMs) {
    if (!ctx) init();
    durationMs = durationMs || 3000;
    const fadeSec = durationMs / 1000;
    const targetFactory = profiles[profileName];
    if (!targetFactory) return;
    const incoming = targetFactory();
    incoming.output.gain.setValueAtTime(0, ctx.currentTime);
    incoming.output.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeSec);
    if (currentProfile) {
      const outgoing = currentProfile;
      outgoing.output.gain.setValueAtTime(outgoing.output.gain.value, ctx.currentTime);
      outgoing.output.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeSec);
      setTimeout(() => outgoing.stop(), durationMs + 100);
    }

    currentProfile = incoming;
    currentProfileName = profileName;
    playing = true;
  }

  function setMood(mood) {
    const profileName = moodMap[mood] || 'calm';
    fadeToProfile(profileName, 3000);
  }

  function setVolume(v) {
    masterVolume = Math.max(0, Math.min(1, v));
    if (masterGain) {
      masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(masterVolume, ctx.currentTime + 0.1);
    }
  }

  function stop() {
    if (!currentProfile) return;
    const fadeSec = 1.5;
    const outgoing = currentProfile;
    outgoing.output.gain.setValueAtTime(outgoing.output.gain.value, ctx.currentTime);
    outgoing.output.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeSec);
    setTimeout(() => {
      outgoing.stop();
      if (currentProfile === outgoing) {
        currentProfile = null;
        playing = false;
      }
    }, fadeSec * 1000 + 100);
    playing = false;
  }

  function isPlaying() {
    return playing;
  }

  function toggle() {
    if (playing) {
      stop();
    } else {
      if (!ctx) init();
      fadeToProfile(currentProfileName, 2000);
    }
  }

  function getCurrentProfile() {
    return currentProfileName;
  }

  return {
    init: init,
    setMood: setMood,
    setVolume: setVolume,
    fadeToProfile: fadeToProfile,
    stop: stop,
    isPlaying: isPlaying,
    toggle: toggle,
    getCurrentProfile: getCurrentProfile
  };
})();
