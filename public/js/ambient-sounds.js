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

  // Create an LFO that modulates a target AudioParam
  function createLFO(rate, min, max, targetParam) {
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = rate;
    const depth = (max - min) / 2;
    const center = min + depth;
    const lfoGain = makeGain(depth);
    lfo.connect(lfoGain);
    lfoGain.connect(targetParam);
    targetParam.value = center;
    lfo.start();
    return { lfo: lfo, gain: lfoGain };
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

  // ---------- RAIN ----------
  // Multiple layered noise bands for realistic rain, plus distant thunder
  function profileRain() {
    const h = createProfileHandle();

    // Layer 1: Brown noise base — gives the heavy body of rain
    const rainBase = noiseSource(brownNoiseBuf);
    const rainBaseLp = makeFilter('lowpass', 1200, 0.7);
    const rainBaseGain = makeGain(0.12);
    rainBase.connect(rainBaseLp);
    rainBaseLp.connect(rainBaseGain);
    rainBaseGain.connect(h.output);
    [rainBase, rainBaseLp, rainBaseGain].forEach(n => h.addNode(n));
    rainBase.start();

    // Layer 2: Mid-frequency rain patter (bandpass on white noise)
    const rainMid = noiseSource(whiteNoiseBuf);
    const rainMidBp = makeFilter('bandpass', 2200, 1.0);
    const rainMidGain = makeGain(0.07);
    rainMid.connect(rainMidBp);
    rainMidBp.connect(rainMidGain);
    rainMidGain.connect(h.output);
    [rainMid, rainMidBp, rainMidGain].forEach(n => h.addNode(n));
    rainMid.start();

    // Layer 3: High-frequency rain detail — sparkle of individual drops
    const rainHigh = noiseSource(whiteNoiseBuf);
    const rainHighBp = makeFilter('bandpass', 5500, 1.4);
    const rainHighGain = makeGain(0.035);
    rainHigh.connect(rainHighBp);
    rainHighBp.connect(rainHighGain);
    rainHighGain.connect(h.output);
    [rainHigh, rainHighBp, rainHighGain].forEach(n => h.addNode(n));
    rainHigh.start();

    // Layer 4: Very low sub rumble — gives weight
    const subRumble = noiseSource(brownNoiseBuf);
    const subLp = makeFilter('lowpass', 80, 0.5);
    const subGain = makeGain(0.06);
    subRumble.connect(subLp);
    subLp.connect(subGain);
    subGain.connect(h.output);
    [subRumble, subLp, subGain].forEach(n => h.addNode(n));
    subRumble.start();

    // Slow overall volume modulation for natural rain intensity variation
    function rainIntensitySweep() {
      if (!h.alive) return;
      const now = ctx.currentTime;
      const dur = randBetween(8, 15);
      const peakVol = randBetween(0.06, 0.10);
      const lowVol = randBetween(0.03, 0.06);
      rainMidGain.gain.setValueAtTime(rainMidGain.gain.value, now);
      rainMidGain.gain.linearRampToValueAtTime(peakVol, now + dur * 0.4);
      rainMidGain.gain.linearRampToValueAtTime(lowVol, now + dur);
      rainHighGain.gain.setValueAtTime(rainHighGain.gain.value, now);
      rainHighGain.gain.linearRampToValueAtTime(peakVol * 0.5, now + dur * 0.4);
      rainHighGain.gain.linearRampToValueAtTime(lowVol * 0.5, now + dur);
      h.addTimer(setTimeout(rainIntensitySweep, dur * 1000));
    }
    rainIntensitySweep();

    // Distant thunder — multi-stage rumble with realistic envelope
    function thunder() {
      if (!h.alive) return;
      const now = ctx.currentTime;
      // Main rumble
      const rumble = noiseSource(brownNoiseBuf);
      const rumbleLp = makeFilter('lowpass', 100, 0.8);
      const rumbleGain = makeGain(0);
      rumble.connect(rumbleLp);
      rumbleLp.connect(rumbleGain);
      rumbleGain.connect(h.output);
      [rumble, rumbleLp, rumbleGain].forEach(n => h.addNode(n));

      const intensity = randBetween(0.12, 0.28);
      // Thunder has an initial crack, sustain rumble, then slow decay
      rumbleGain.gain.setValueAtTime(0, now);
      rumbleGain.gain.linearRampToValueAtTime(intensity * 0.7, now + 0.15);
      rumbleGain.gain.linearRampToValueAtTime(intensity, now + 0.6);
      rumbleGain.gain.linearRampToValueAtTime(intensity * 0.5, now + 1.8);
      // Secondary rumble peak (distant echo)
      rumbleGain.gain.linearRampToValueAtTime(intensity * 0.35, now + 2.5);
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 5.5);
      // Sweep filter up during crack, then back down
      rumbleLp.frequency.setValueAtTime(60, now);
      rumbleLp.frequency.linearRampToValueAtTime(180, now + 0.3);
      rumbleLp.frequency.linearRampToValueAtTime(70, now + 3.0);

      rumble.start(now);
      rumble.stop(now + 5.6);

      // Slightly brighter mid-thunder crack layered on top
      const crack = noiseSource(pinkNoiseBuf);
      const crackBp = makeFilter('bandpass', 250, 0.6);
      const crackGain = makeGain(0);
      crack.connect(crackBp);
      crackBp.connect(crackGain);
      crackGain.connect(h.output);
      [crack, crackBp, crackGain].forEach(n => h.addNode(n));
      crackGain.gain.setValueAtTime(0, now);
      crackGain.gain.linearRampToValueAtTime(intensity * 0.15, now + 0.05);
      crackGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      crack.start(now);
      crack.stop(now + 1.6);

      h.addTimer(setTimeout(thunder, randBetween(18000, 40000)));
    }
    h.addTimer(setTimeout(thunder, randBetween(6000, 15000)));

    return h;
  }

  // ---------- OCEAN ----------
  // Layered wave simulation with sub-bass drone and slow rhythmic modulation
  function profileOcean() {
    const h = createProfileHandle();

    // Layer 1: Deep sub-bass drone — the pressure of the ocean
    const subOsc1 = ctx.createOscillator();
    subOsc1.type = 'sine';
    subOsc1.frequency.value = 55;
    const subOsc2 = ctx.createOscillator();
    subOsc2.type = 'sine';
    subOsc2.frequency.value = 57; // slight detuning for warmth
    const subGain = makeGain(0.06);
    subOsc1.connect(subGain);
    subOsc2.connect(subGain);
    subGain.connect(h.output);
    [subOsc1, subOsc2, subGain].forEach(n => h.addNode(n));
    subOsc1.start();
    subOsc2.start();

    // Sub LFO to gently pulse the drone
    const subLfo = createLFO(0.08, 0.03, 0.07, subGain.gain);
    [subLfo.lfo, subLfo.gain].forEach(n => h.addNode(n));

    // Layer 2: Primary wave — pink noise with slow filter + volume sweep
    const wave1 = noiseSource(pinkNoiseBuf);
    const wave1Lp = makeFilter('lowpass', 600, 0.5);
    const wave1Gain = makeGain(0.01);
    wave1.connect(wave1Lp);
    wave1Lp.connect(wave1Gain);
    wave1Gain.connect(h.output);
    [wave1, wave1Lp, wave1Gain].forEach(n => h.addNode(n));
    wave1.start();

    // Layer 3: Foam/wash — higher frequency noise for the top of the wave
    const foam = noiseSource(whiteNoiseBuf);
    const foamBp = makeFilter('bandpass', 3000, 0.8);
    const foamGain = makeGain(0.001);
    foam.connect(foamBp);
    foamBp.connect(foamGain);
    foamGain.connect(h.output);
    [foam, foamBp, foamGain].forEach(n => h.addNode(n));
    foam.start();

    // Layer 4: Brown noise undertow
    const undertow = noiseSource(brownNoiseBuf);
    const undertowLp = makeFilter('lowpass', 300, 0.6);
    const undertowGain = makeGain(0.08);
    undertow.connect(undertowLp);
    undertowLp.connect(undertowGain);
    undertowGain.connect(h.output);
    [undertow, undertowLp, undertowGain].forEach(n => h.addNode(n));
    undertow.start();

    // Wave cycle — coordinates volume and filter of multiple layers
    function waveCycle() {
      if (!h.alive) return;
      const cycleDur = randBetween(7, 12);
      const buildPhase = cycleDur * 0.4;
      const crashPhase = cycleDur * 0.15;
      const recedePhase = cycleDur * 0.45;
      const now = ctx.currentTime;

      // Main wave: build up
      wave1Gain.gain.setValueAtTime(0.02, now);
      wave1Gain.gain.linearRampToValueAtTime(0.16, now + buildPhase);
      wave1Lp.frequency.setValueAtTime(300, now);
      wave1Lp.frequency.linearRampToValueAtTime(900, now + buildPhase);

      // Crash — brief brightness peak
      wave1Gain.gain.linearRampToValueAtTime(0.20, now + buildPhase + crashPhase * 0.5);
      wave1Lp.frequency.linearRampToValueAtTime(1200, now + buildPhase + crashPhase);

      // Foam peaks at crash
      foamGain.gain.setValueAtTime(0.001, now);
      foamGain.gain.linearRampToValueAtTime(0.01, now + buildPhase);
      foamGain.gain.linearRampToValueAtTime(0.04, now + buildPhase + crashPhase);
      foamGain.gain.exponentialRampToValueAtTime(0.001, now + cycleDur);

      // Recede
      wave1Gain.gain.linearRampToValueAtTime(0.02, now + cycleDur);
      wave1Lp.frequency.linearRampToValueAtTime(300, now + cycleDur);

      // Undertow swells opposite to main wave
      undertowGain.gain.setValueAtTime(0.08, now);
      undertowGain.gain.linearRampToValueAtTime(0.04, now + buildPhase);
      undertowGain.gain.linearRampToValueAtTime(0.10, now + cycleDur);

      h.addTimer(setTimeout(waveCycle, cycleDur * 1000));
    }
    waveCycle();

    // Secondary wave with offset timing for complexity
    function secondaryWave() {
      if (!h.alive) return;
      const dur = randBetween(5, 9);
      const now = ctx.currentTime;
      const sw = noiseSource(pinkNoiseBuf);
      const swFilt = makeFilter('bandpass', 500, 0.6);
      const swGain = makeGain(0);
      sw.connect(swFilt);
      swFilt.connect(swGain);
      swGain.connect(h.output);
      [sw, swFilt, swGain].forEach(n => h.addNode(n));

      swGain.gain.setValueAtTime(0, now);
      swGain.gain.linearRampToValueAtTime(0.06, now + dur * 0.35);
      swGain.gain.linearRampToValueAtTime(0.08, now + dur * 0.5);
      swGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      swFilt.frequency.setValueAtTime(350, now);
      swFilt.frequency.linearRampToValueAtTime(700, now + dur * 0.5);
      swFilt.frequency.linearRampToValueAtTime(350, now + dur);

      sw.start(now);
      sw.stop(now + dur + 0.1);
      h.addTimer(setTimeout(secondaryWave, dur * 1000 + randBetween(1000, 4000)));
    }
    h.addTimer(setTimeout(secondaryWave, randBetween(3000, 6000)));

    return h;
  }

  // ---------- NATURE / FOREST ----------
  // Gentle wind, soft rustling, layered bird chirps
  function profileNature() {
    const h = createProfileHandle();

    // Layer 1: Wind base — pink noise shaped for a gentle breeze
    const wind = noiseSource(pinkNoiseBuf);
    const windBp = makeFilter('bandpass', 700, 0.5);
    const windGain = makeGain(0.06);
    wind.connect(windBp);
    windBp.connect(windGain);
    windGain.connect(h.output);
    [wind, windBp, windGain].forEach(n => h.addNode(n));
    wind.start();

    // Slow wind filter sweep for natural variation
    function windSweep() {
      if (!h.alive) return;
      const dur = randBetween(5, 10);
      const now = ctx.currentTime;
      const targetFreq = randBetween(400, 1100);
      const targetVol = randBetween(0.04, 0.08);
      windBp.frequency.setValueAtTime(windBp.frequency.value, now);
      windBp.frequency.linearRampToValueAtTime(targetFreq, now + dur);
      windGain.gain.setValueAtTime(windGain.gain.value, now);
      windGain.gain.linearRampToValueAtTime(targetVol, now + dur);
      h.addTimer(setTimeout(windSweep, dur * 1000));
    }
    windSweep();

    // Layer 2: High-frequency leaf rustling
    const rustle = noiseSource(whiteNoiseBuf);
    const rustleBp = makeFilter('bandpass', 4000, 1.5);
    const rustleGain = makeGain(0.015);
    rustle.connect(rustleBp);
    rustleBp.connect(rustleGain);
    rustleGain.connect(h.output);
    [rustle, rustleBp, rustleGain].forEach(n => h.addNode(n));
    rustle.start();

    // LFO on rustle for intermittent gusts
    const rustleLfo = createLFO(0.25, 0.005, 0.025, rustleGain.gain);
    [rustleLfo.lfo, rustleLfo.gain].forEach(n => h.addNode(n));

    // Layer 3: Very gentle stream / water trickle
    const stream = noiseSource(pinkNoiseBuf);
    const streamBp = makeFilter('bandpass', 2500, 2.0);
    const streamGain = makeGain(0.02);
    stream.connect(streamBp);
    streamBp.connect(streamGain);
    streamGain.connect(h.output);
    [stream, streamBp, streamGain].forEach(n => h.addNode(n));
    stream.start();

    // Layer 4: Deep ambient warmth underneath
    const ambOsc = ctx.createOscillator();
    ambOsc.type = 'sine';
    ambOsc.frequency.value = 120;
    const ambGain = makeGain(0.025);
    ambOsc.connect(ambGain);
    ambGain.connect(h.output);
    [ambOsc, ambGain].forEach(n => h.addNode(n));
    ambOsc.start();

    // Birdsong — more natural with multiple types
    // Type A: Quick warbling chirp (like a robin)
    function birdTypeA() {
      if (!h.alive) return;
      const now = ctx.currentTime;
      const noteCount = Math.floor(randBetween(3, 7));
      const totalDur = noteCount * 0.12 + 0.2;

      const o = ctx.createOscillator();
      o.type = 'sine';
      const g = makeGain(0);
      const filt = makeFilter('bandpass', 3000, 2.0);
      o.connect(filt);
      filt.connect(g);
      g.connect(h.output);
      [o, filt, g].forEach(n => h.addNode(n));

      for (let i = 0; i < noteCount; i++) {
        const t = now + i * 0.12;
        const baseFreq = randBetween(2200, 3600);
        o.frequency.setValueAtTime(baseFreq, t);
        o.frequency.linearRampToValueAtTime(baseFreq * randBetween(1.1, 1.5), t + 0.04);
        o.frequency.linearRampToValueAtTime(baseFreq * randBetween(0.85, 1.0), t + 0.08);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(randBetween(0.02, 0.045), t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      }
      o.start(now);
      o.stop(now + totalDur);
      h.addTimer(setTimeout(birdTypeA, randBetween(4000, 12000)));
    }

    // Type B: Two-note call (like a cuckoo / wood pigeon)
    function birdTypeB() {
      if (!h.alive) return;
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      const g = makeGain(0);
      o.connect(g);
      g.connect(h.output);
      [o, g].forEach(n => h.addNode(n));

      const highNote = randBetween(1800, 2400);
      const lowNote = highNote * 0.75;
      // First note — higher
      o.frequency.setValueAtTime(highNote, now);
      o.frequency.linearRampToValueAtTime(highNote * 0.97, now + 0.2);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.03, now + 0.02);
      g.gain.setValueAtTime(0.03, now + 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      // Second note — lower
      o.frequency.setValueAtTime(lowNote, now + 0.35);
      o.frequency.linearRampToValueAtTime(lowNote * 0.95, now + 0.65);
      g.gain.setValueAtTime(0, now + 0.34);
      g.gain.linearRampToValueAtTime(0.025, now + 0.36);
      g.gain.setValueAtTime(0.025, now + 0.55);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      o.start(now);
      o.stop(now + 0.8);
      h.addTimer(setTimeout(birdTypeB, randBetween(8000, 20000)));
    }

    // Type C: Trill — rapid oscillation between two close pitches
    function birdTypeC() {
      if (!h.alive) return;
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      const g = makeGain(0);
      o.connect(g);
      g.connect(h.output);
      [o, g].forEach(n => h.addNode(n));

      const base = randBetween(3000, 4500);
      const trillCount = Math.floor(randBetween(6, 14));
      const trillRate = 0.04;
      const totalDur = trillCount * trillRate + 0.1;

      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.025, now + 0.02);
      g.gain.setValueAtTime(0.025, now + totalDur - 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + totalDur);

      for (let i = 0; i < trillCount; i++) {
        const t = now + i * trillRate;
        o.frequency.setValueAtTime(base, t);
        o.frequency.setValueAtTime(base * 1.08, t + trillRate * 0.5);
      }
      o.start(now);
      o.stop(now + totalDur + 0.05);
      h.addTimer(setTimeout(birdTypeC, randBetween(6000, 16000)));
    }

    // Stagger bird start times
    h.addTimer(setTimeout(birdTypeA, randBetween(1000, 3000)));
    h.addTimer(setTimeout(birdTypeB, randBetween(3000, 7000)));
    h.addTimer(setTimeout(birdTypeC, randBetween(5000, 10000)));

    return h;
  }

  // ---------- FIREPLACE ----------
  // Warm drone, layered crackle system with varied textures
  function profileFireplace() {
    const h = createProfileHandle();

    // Layer 1: Warm harmonic drone — two detuned low sines
    const drone1 = ctx.createOscillator();
    drone1.type = 'sine';
    drone1.frequency.value = 75;
    const drone2 = ctx.createOscillator();
    drone2.type = 'sine';
    drone2.frequency.value = 113; // ~fifth above, gives warmth
    const droneFilt = makeFilter('lowpass', 200, 0.7);
    const droneGain = makeGain(0.07);
    drone1.connect(droneFilt);
    drone2.connect(droneFilt);
    droneFilt.connect(droneGain);
    droneGain.connect(h.output);
    [drone1, drone2, droneFilt, droneGain].forEach(n => h.addNode(n));
    drone1.start();
    drone2.start();

    // Slow LFO on drone for breathing warmth
    const droneLfo = createLFO(0.06, 0.04, 0.08, droneGain.gain);
    [droneLfo.lfo, droneLfo.gain].forEach(n => h.addNode(n));

    // Layer 2: Low rumble/roar of the fire — brown noise, low-passed
    const roar = noiseSource(brownNoiseBuf);
    const roarLp = makeFilter('lowpass', 250, 0.5);
    const roarGain = makeGain(0.06);
    roar.connect(roarLp);
    roarLp.connect(roarGain);
    roarGain.connect(h.output);
    [roar, roarLp, roarGain].forEach(n => h.addNode(n));
    roar.start();

    // Slow modulation on roar
    const roarLfo = createLFO(0.1, 0.03, 0.08, roarGain.gain);
    [roarLfo.lfo, roarLfo.gain].forEach(n => h.addNode(n));

    // Layer 3: Continuous gentle crackle texture — high-passed pink noise
    const crackleBase = noiseSource(pinkNoiseBuf);
    const crackleHp = makeFilter('highpass', 2000, 0.8);
    const crackleBaseGain = makeGain(0.02);
    crackleBase.connect(crackleHp);
    crackleHp.connect(crackleBaseGain);
    crackleBaseGain.connect(h.output);
    [crackleBase, crackleHp, crackleBaseGain].forEach(n => h.addNode(n));
    crackleBase.start();

    // Layer 4: Random individual crackle bursts
    function crackle() {
      if (!h.alive) return;
      const now = ctx.currentTime;
      const burstLen = randBetween(0.01, 0.04);
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * burstLen), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        // Shaped noise — multiply by decaying envelope for snap
        const env = 1 - (i / data.length);
        data[i] = (Math.random() * 2 - 1) * env * env;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = makeFilter('bandpass', randBetween(1500, 5000), randBetween(1, 3));
      const g = makeGain(0);
      src.connect(filt);
      filt.connect(g);
      g.connect(h.output);
      [src, filt, g].forEach(n => h.addNode(n));

      const vol = randBetween(0.03, 0.10);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(vol, now + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, now + burstLen + 0.05);

      src.start(now);
      h.addTimer(setTimeout(crackle, randBetween(60, 250)));
    }
    crackle();

    // Layer 5: Occasional deep pops — wood shifting
    function deepPop() {
      if (!h.alive) return;
      const now = ctx.currentTime;
      const popLen = randBetween(0.04, 0.10);
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * popLen), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const env = Math.exp(-i / (data.length * 0.15));
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = makeFilter('lowpass', randBetween(300, 800), 1.0);
      const g = makeGain(0);
      src.connect(filt);
      filt.connect(g);
      g.connect(h.output);
      [src, filt, g].forEach(n => h.addNode(n));

      const vol = randBetween(0.08, 0.18);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(vol, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, now + popLen + 0.15);

      src.start(now);
      h.addTimer(setTimeout(deepPop, randBetween(1500, 5000)));
    }
    h.addTimer(setTimeout(deepPop, randBetween(800, 2000)));

    // Occasional hiss — steam or sap
    function hiss() {
      if (!h.alive) return;
      const now = ctx.currentTime;
      const dur = randBetween(0.3, 0.8);
      const hissSrc = noiseSource(whiteNoiseBuf);
      const hissBp = makeFilter('bandpass', randBetween(3000, 7000), 2.5);
      const hissGain = makeGain(0);
      hissSrc.connect(hissBp);
      hissBp.connect(hissGain);
      hissGain.connect(h.output);
      [hissSrc, hissBp, hissGain].forEach(n => h.addNode(n));

      hissGain.gain.setValueAtTime(0, now);
      hissGain.gain.linearRampToValueAtTime(randBetween(0.02, 0.05), now + 0.05);
      hissGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      hissSrc.start(now);
      hissSrc.stop(now + dur + 0.1);

      h.addTimer(setTimeout(hiss, randBetween(4000, 12000)));
    }
    h.addTimer(setTimeout(hiss, randBetween(2000, 5000)));

    return h;
  }

  // ---------- NIGHT ----------
  // Crickets with tremolo, deep ambient pad, gentle wind, occasional owl
  function profileNight() {
    const h = createProfileHandle();

    // Layer 1: Deep ambient pad — two sine waves with slow beating
    const pad1 = ctx.createOscillator();
    pad1.type = 'sine';
    pad1.frequency.value = 85;
    const pad2 = ctx.createOscillator();
    pad2.type = 'sine';
    pad2.frequency.value = 127.5; // ~fifth
    const padFilt = makeFilter('lowpass', 200, 0.7);
    const padGain = makeGain(0.05);
    pad1.connect(padFilt);
    pad2.connect(padFilt);
    padFilt.connect(padGain);
    padGain.connect(h.output);
    [pad1, pad2, padFilt, padGain].forEach(n => h.addNode(n));
    pad1.start();
    pad2.start();

    // LFO on pad for gentle movement
    const padLfo = createLFO(0.04, 0.03, 0.06, padGain.gain);
    [padLfo.lfo, padLfo.gain].forEach(n => h.addNode(n));

    // Layer 2: Night wind — very gentle, lower than daytime
    const wind = noiseSource(brownNoiseBuf);
    const windBp = makeFilter('bandpass', 400, 0.4);
    const windGain = makeGain(0.04);
    wind.connect(windBp);
    windBp.connect(windGain);
    windGain.connect(h.output);
    [wind, windBp, windGain].forEach(n => h.addNode(n));
    wind.start();

    function windDrift() {
      if (!h.alive) return;
      const dur = randBetween(6, 14);
      const now = ctx.currentTime;
      windBp.frequency.setValueAtTime(windBp.frequency.value, now);
      windBp.frequency.linearRampToValueAtTime(randBetween(250, 600), now + dur);
      windGain.gain.setValueAtTime(windGain.gain.value, now);
      windGain.gain.linearRampToValueAtTime(randBetween(0.02, 0.05), now + dur);
      h.addTimer(setTimeout(windDrift, dur * 1000));
    }
    windDrift();

    // Layer 3: Crickets — high-frequency oscillators with tremolo (amplitude modulation)
    function makeCricket(baseFreq, chirpOnMs, chirpOffMs, volume) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = baseFreq;
      // Tremolo LFO for the characteristic cricket pulsing
      const tremolo = ctx.createOscillator();
      tremolo.type = 'sine';
      tremolo.frequency.value = randBetween(30, 50); // rapid tremolo
      const tremoloGain = makeGain(volume * 0.5);
      const cricketGain = makeGain(0);
      tremolo.connect(tremoloGain);
      tremoloGain.connect(cricketGain.gain);
      cricketGain.gain.value = volume * 0.5;
      o.connect(cricketGain);
      cricketGain.connect(h.output);
      [o, tremolo, tremoloGain, cricketGain].forEach(n => h.addNode(n));
      o.start();
      tremolo.start();

      function chirp() {
        if (!h.alive) return;
        const now = ctx.currentTime;
        const jitteredOn = chirpOnMs + randBetween(-10, 10);
        const jitteredOff = chirpOffMs + randBetween(-30, 30);
        // Chirp burst
        cricketGain.gain.setValueAtTime(0, now);
        cricketGain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.005);
        cricketGain.gain.setValueAtTime(volume * 0.5, now + jitteredOn / 1000);
        cricketGain.gain.linearRampToValueAtTime(0, now + jitteredOn / 1000 + 0.005);
        h.addTimer(setTimeout(chirp, jitteredOn + jitteredOff));
      }
      chirp();
    }
    // Multiple crickets at different pitches and rhythms
    makeCricket(4200, 40, randBetween(100, 160), 0.025);
    makeCricket(4600, 30, randBetween(130, 200), 0.020);
    makeCricket(3900, 45, randBetween(110, 180), 0.018);
    if (Math.random() > 0.3) {
      makeCricket(5000, 25, randBetween(150, 250), 0.012);
    }

    // Layer 4: Occasional frog-like low tone
    function frog() {
      if (!h.alive) return;
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      const g = makeGain(0);
      o.connect(g);
      g.connect(h.output);
      [o, g].forEach(n => h.addNode(n));

      const baseFreq = randBetween(180, 350);
      const ribbitCount = Math.floor(randBetween(1, 4));
      for (let i = 0; i < ribbitCount; i++) {
        const t = now + i * 0.4;
        o.frequency.setValueAtTime(baseFreq, t);
        o.frequency.linearRampToValueAtTime(baseFreq * 0.7, t + 0.15);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.03, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      }
      const totalDur = ribbitCount * 0.4 + 0.1;
      o.start(now);
      o.stop(now + totalDur);
      h.addTimer(setTimeout(frog, randBetween(8000, 25000)));
    }
    h.addTimer(setTimeout(frog, randBetween(3000, 8000)));

    // Layer 5: Occasional owl — two-tone hoot
    function owl() {
      if (!h.alive) return;
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      const g = makeGain(0);
      const filt = makeFilter('lowpass', 800, 1.0);
      o.connect(filt);
      filt.connect(g);
      g.connect(h.output);
      [o, filt, g].forEach(n => h.addNode(n));

      const highNote = randBetween(380, 480);
      const lowNote = highNote * 0.75;

      // "Hoo" — first note
      o.frequency.setValueAtTime(highNote, now);
      o.frequency.linearRampToValueAtTime(highNote * 0.95, now + 0.4);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.04, now + 0.05);
      g.gain.setValueAtTime(0.04, now + 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      // "Hooo" — second note, longer
      o.frequency.setValueAtTime(lowNote, now + 0.7);
      o.frequency.linearRampToValueAtTime(lowNote * 0.92, now + 1.5);
      g.gain.setValueAtTime(0, now + 0.69);
      g.gain.linearRampToValueAtTime(0.035, now + 0.75);
      g.gain.setValueAtTime(0.035, now + 1.2);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

      o.start(now);
      o.stop(now + 1.7);
      h.addTimer(setTimeout(owl, randBetween(20000, 50000)));
    }
    h.addTimer(setTimeout(owl, randBetween(8000, 18000)));

    return h;
  }

  // ---------- CALM ----------
  // Layered harmonic sine drones with ethereal pad quality
  function profileCalm() {
    const h = createProfileHandle();

    // Layer 1: Root drone — fundamental tone with slow volume swell
    const root = ctx.createOscillator();
    root.type = 'sine';
    root.frequency.value = 110; // A2
    const rootGain = makeGain(0.0);
    root.connect(rootGain);
    rootGain.connect(h.output);
    [root, rootGain].forEach(n => h.addNode(n));
    root.start();
    const rootLfo = createLFO(0.07, 0.04, 0.10, rootGain.gain);
    [rootLfo.lfo, rootLfo.gain].forEach(n => h.addNode(n));

    // Layer 2: Fifth — harmonious interval
    const fifth = ctx.createOscillator();
    fifth.type = 'sine';
    fifth.frequency.value = 165; // E3 (perfect fifth)
    const fifthGain = makeGain(0.0);
    fifth.connect(fifthGain);
    fifthGain.connect(h.output);
    [fifth, fifthGain].forEach(n => h.addNode(n));
    fifth.start();
    const fifthLfo = createLFO(0.05, 0.025, 0.065, fifthGain.gain);
    [fifthLfo.lfo, fifthLfo.gain].forEach(n => h.addNode(n));

    // Layer 3: Octave — airy upper register
    const octave = ctx.createOscillator();
    octave.type = 'sine';
    octave.frequency.value = 220; // A3 (octave)
    const octaveGain = makeGain(0.0);
    octave.connect(octaveGain);
    octaveGain.connect(h.output);
    [octave, octaveGain].forEach(n => h.addNode(n));
    octave.start();
    const octaveLfo = createLFO(0.03, 0.015, 0.045, octaveGain.gain);
    [octaveLfo.lfo, octaveLfo.gain].forEach(n => h.addNode(n));

    // Layer 4: High harmonic — adds shimmer (major third in upper register)
    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = 277.2; // C#4 (major third)
    const shimmerGain = makeGain(0.0);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(h.output);
    [shimmer, shimmerGain].forEach(n => h.addNode(n));
    shimmer.start();
    const shimmerLfo = createLFO(0.04, 0.008, 0.025, shimmerGain.gain);
    [shimmerLfo.lfo, shimmerLfo.gain].forEach(n => h.addNode(n));

    // Layer 5: Gentle air/breath — very soft filtered noise
    const air = noiseSource(pinkNoiseBuf);
    const airBp = makeFilter('bandpass', 500, 0.3);
    const airGain = makeGain(0.015);
    air.connect(airBp);
    airBp.connect(airGain);
    airGain.connect(h.output);
    [air, airBp, airGain].forEach(n => h.addNode(n));
    air.start();

    // Slow filter sweep on the air layer
    function airSweep() {
      if (!h.alive) return;
      const dur = randBetween(8, 16);
      const now = ctx.currentTime;
      airBp.frequency.setValueAtTime(airBp.frequency.value, now);
      airBp.frequency.linearRampToValueAtTime(randBetween(300, 800), now + dur);
      h.addTimer(setTimeout(airSweep, dur * 1000));
    }
    airSweep();

    // Occasional gentle chime — glass bell tone
    function chime() {
      if (!h.alive) return;
      const now = ctx.currentTime;
      // Use a sine + soft overtone for bell-like quality
      const freq = [528, 396, 440, 330, 264][Math.floor(Math.random() * 5)];
      const o1 = ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.value = freq;
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = freq * 2.01; // slight inharmonicity for bell quality
      const g1 = makeGain(0);
      const g2 = makeGain(0);
      o1.connect(g1);
      o2.connect(g2);
      g1.connect(h.output);
      g2.connect(h.output);
      [o1, o2, g1, g2].forEach(n => h.addNode(n));

      const vol = randBetween(0.03, 0.06);
      g1.gain.setValueAtTime(0, now);
      g1.gain.linearRampToValueAtTime(vol, now + 0.02);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
      g2.gain.setValueAtTime(0, now);
      g2.gain.linearRampToValueAtTime(vol * 0.3, now + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      o1.start(now);
      o1.stop(now + 3.6);
      o2.start(now);
      o2.stop(now + 2.1);
      h.addTimer(setTimeout(chime, randBetween(6000, 15000)));
    }
    h.addTimer(setTimeout(chime, randBetween(2000, 5000)));

    // Slowly shifting chord — every 30-60s, subtly retune the oscillators
    function harmonyShift() {
      if (!h.alive) return;
      const now = ctx.currentTime;
      const dur = 10; // 10-second glide
      const roots = [110, 104, 98, 116.5, 110]; // A2, Ab2, G2, Bb2, A2
      const newRoot = roots[Math.floor(Math.random() * roots.length)];
      root.frequency.setValueAtTime(root.frequency.value, now);
      root.frequency.linearRampToValueAtTime(newRoot, now + dur);
      fifth.frequency.setValueAtTime(fifth.frequency.value, now);
      fifth.frequency.linearRampToValueAtTime(newRoot * 1.5, now + dur);
      octave.frequency.setValueAtTime(octave.frequency.value, now);
      octave.frequency.linearRampToValueAtTime(newRoot * 2, now + dur);
      shimmer.frequency.setValueAtTime(shimmer.frequency.value, now);
      shimmer.frequency.linearRampToValueAtTime(newRoot * 2.52, now + dur);
      h.addTimer(setTimeout(harmonyShift, randBetween(30000, 60000)));
    }
    h.addTimer(setTimeout(harmonyShift, randBetween(20000, 40000)));

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
