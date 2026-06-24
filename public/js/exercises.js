// ============================================
// SERENITY — Guided Wellness Exercises Module
// ============================================
// Pure vanilla JS. No frameworks. No dependencies.
// Renders full-screen overlay exercises with animations.

(function () {
  'use strict';

  // ==================== STATE ====================

  let activeExercise = null;
  let animationFrameId = null;
  let exerciseTimers = [];
  let audioCtx = null;

  // ==================== STYLE INJECTION ====================

  const STYLE_ID = 'serenity-exercise-styles';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #exercise-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        background: rgba(15, 15, 26, 0.92);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: var(--font-primary, 'Inter', sans-serif);
        color: var(--text-primary, #F0EDE8);
        overflow-y: auto;
      }
      #exercise-overlay.visible {
        opacity: 1;
      }

      .exercise-close-btn {
        position: fixed;
        top: 20px;
        right: 24px;
        width: 44px;
        height: 44px;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 50%;
        background: rgba(255,255,255,0.06);
        color: var(--text-primary, #F0EDE8);
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.25s, border-color 0.25s;
        z-index: 10001;
        line-height: 1;
      }
      .exercise-close-btn:hover {
        background: rgba(255,255,255,0.12);
        border-color: rgba(255,255,255,0.25);
      }

      .exercise-container {
        max-width: 560px;
        width: 90%;
        padding: 40px 0 60px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        min-height: 0;
      }

      .exercise-title {
        font-family: var(--font-display, 'Playfair Display', serif);
        font-size: 28px;
        font-weight: 500;
        margin: 0 0 8px;
        background: linear-gradient(135deg, #7EB09B, #9B8EC4);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .exercise-subtitle {
        font-size: 14px;
        color: var(--text-secondary, rgba(240,237,232,0.65));
        margin: 0 0 36px;
      }

      /* Breathing circle */
      .breathing-visual {
        position: relative;
        width: 220px;
        height: 220px;
        margin: 0 auto 32px;
      }
      .breathing-circle {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(126,176,155,0.35) 0%, rgba(126,176,155,0.05) 70%, transparent 100%);
        transform: scale(0.5);
        transition: none;
      }
      .breathing-progress-ring {
        position: absolute;
        inset: 0;
        width: 220px;
        height: 220px;
      }
      .breathing-progress-ring circle {
        fill: none;
        stroke-width: 3;
        transform: rotate(-90deg);
        transform-origin: 50% 50%;
      }
      .breathing-progress-ring .ring-bg {
        stroke: rgba(255,255,255,0.08);
      }
      .breathing-progress-ring .ring-fill {
        stroke: var(--accent-primary, #7EB09B);
        stroke-linecap: round;
        transition: none;
      }
      .breathing-instruction {
        font-size: 22px;
        font-weight: 500;
        margin: 0 0 8px;
        min-height: 34px;
      }
      .breathing-timer {
        font-size: 48px;
        font-weight: 300;
        font-variant-numeric: tabular-nums;
        color: var(--accent-primary, #7EB09B);
        margin: 0 0 8px;
      }
      .breathing-cycle-info {
        font-size: 13px;
        color: var(--text-muted, rgba(240,237,232,0.4));
        margin: 0;
      }

      /* Grounding exercise */
      .grounding-step {
        animation: fadeSlideIn 0.4s ease;
      }
      .grounding-prompt {
        font-family: var(--font-display, 'Playfair Display', serif);
        font-size: 22px;
        font-weight: 400;
        margin: 0 0 24px;
        line-height: 1.5;
      }
      .grounding-sense-label {
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: var(--accent-primary, #7EB09B);
        margin: 0 0 16px;
      }
      .grounding-items {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        max-width: 380px;
        margin: 0 auto 24px;
      }
      .grounding-input {
        width: 100%;
        padding: 12px 16px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        color: var(--text-primary, #F0EDE8);
        font-family: var(--font-primary, 'Inter', sans-serif);
        font-size: 15px;
        outline: none;
        transition: border-color 0.25s;
        box-sizing: border-box;
      }
      .grounding-input:focus {
        border-color: var(--accent-primary, #7EB09B);
      }
      .grounding-input::placeholder {
        color: var(--text-muted, rgba(240,237,232,0.4));
      }

      /* Body scan */
      .bodyscan-zone {
        animation: fadeSlideIn 0.5s ease;
      }
      .bodyscan-zone-name {
        font-family: var(--font-display, 'Playfair Display', serif);
        font-size: 32px;
        font-weight: 500;
        color: var(--accent-primary, #7EB09B);
        margin: 0 0 16px;
      }
      .bodyscan-instruction {
        font-size: 17px;
        line-height: 1.7;
        color: var(--text-secondary, rgba(240,237,232,0.65));
        max-width: 420px;
        margin: 0 auto 24px;
      }
      .bodyscan-progress {
        display: flex;
        gap: 6px;
        justify-content: center;
        margin: 0 0 16px;
      }
      .bodyscan-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255,255,255,0.12);
        transition: background 0.3s;
      }
      .bodyscan-dot.active {
        background: var(--accent-primary, #7EB09B);
      }
      .bodyscan-dot.done {
        background: rgba(126,176,155,0.5);
      }
      .bodyscan-timer-bar {
        width: 100%;
        max-width: 300px;
        height: 4px;
        background: rgba(255,255,255,0.08);
        border-radius: 2px;
        margin: 0 auto;
        overflow: hidden;
      }
      .bodyscan-timer-fill {
        height: 100%;
        background: var(--accent-primary, #7EB09B);
        border-radius: 2px;
        width: 0%;
        transition: none;
      }

      /* Meditation timer */
      .meditation-canvas-wrap {
        position: relative;
        width: 240px;
        height: 240px;
        margin: 0 auto 32px;
      }
      .meditation-canvas-wrap canvas {
        width: 240px;
        height: 240px;
      }
      .meditation-time-display {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .meditation-elapsed {
        font-size: 42px;
        font-weight: 300;
        font-variant-numeric: tabular-nums;
      }
      .meditation-total {
        font-size: 13px;
        color: var(--text-muted, rgba(240,237,232,0.4));
        margin-top: 4px;
      }
      .meditation-presets {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
        margin: 0 0 28px;
      }
      .meditation-preset-btn {
        padding: 8px 18px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.04);
        color: var(--text-primary, #F0EDE8);
        font-family: var(--font-primary, 'Inter', sans-serif);
        font-size: 14px;
        cursor: pointer;
        transition: background 0.25s, border-color 0.25s;
      }
      .meditation-preset-btn:hover,
      .meditation-preset-btn.selected {
        background: rgba(126,176,155,0.18);
        border-color: var(--accent-primary, #7EB09B);
      }

      /* PMR */
      .pmr-visual {
        position: relative;
        width: 180px;
        height: 180px;
        margin: 0 auto 28px;
      }
      .pmr-circle {
        width: 180px;
        height: 180px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48px;
        font-weight: 300;
        transition: background 0.5s, box-shadow 0.5s;
      }
      .pmr-circle.tense {
        background: rgba(232,124,124,0.2);
        box-shadow: 0 0 40px rgba(232,124,124,0.2);
      }
      .pmr-circle.release {
        background: rgba(126,176,155,0.2);
        box-shadow: 0 0 40px rgba(126,176,155,0.2);
      }
      .pmr-group-name {
        font-family: var(--font-display, 'Playfair Display', serif);
        font-size: 24px;
        font-weight: 500;
        margin: 0 0 8px;
      }
      .pmr-action {
        font-size: 18px;
        font-weight: 500;
        margin: 0 0 8px;
      }
      .pmr-action.tense {
        color: #E8A87C;
      }
      .pmr-action.release {
        color: var(--accent-primary, #7EB09B);
      }
      .pmr-progress-text {
        font-size: 13px;
        color: var(--text-muted, rgba(240,237,232,0.4));
        margin: 0;
      }

      /* Sleep stories */
      .story-container {
        max-width: 480px;
        text-align: left;
        margin: 0 auto;
        max-height: 55vh;
        overflow-y: auto;
        padding-right: 8px;
        scroll-behavior: smooth;
      }
      .story-container::-webkit-scrollbar {
        width: 4px;
      }
      .story-container::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
      }
      .story-line {
        font-size: 17px;
        line-height: 1.8;
        color: var(--text-secondary, rgba(240,237,232,0.65));
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 0.8s ease, transform 0.8s ease;
        margin: 0 0 6px;
      }
      .story-line.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .story-selector {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
        max-width: 400px;
        margin: 0 auto;
      }
      .story-option {
        padding: 16px 20px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 14px;
        color: var(--text-primary, #F0EDE8);
        font-family: var(--font-primary, 'Inter', sans-serif);
        font-size: 15px;
        cursor: pointer;
        text-align: left;
        transition: background 0.25s, border-color 0.25s;
      }
      .story-option:hover {
        background: rgba(126,176,155,0.1);
        border-color: rgba(126,176,155,0.3);
      }
      .story-option-title {
        font-weight: 500;
        margin-bottom: 4px;
      }
      .story-option-desc {
        font-size: 13px;
        color: var(--text-muted, rgba(240,237,232,0.4));
      }

      /* Shared buttons */
      .exercise-btn {
        padding: 12px 32px;
        border-radius: 24px;
        border: none;
        background: linear-gradient(135deg, #7EB09B, #9B8EC4);
        color: #fff;
        font-family: var(--font-primary, 'Inter', sans-serif);
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
        transition: opacity 0.25s, transform 0.15s;
        margin-top: 8px;
      }
      .exercise-btn:hover {
        opacity: 0.9;
        transform: scale(1.02);
      }
      .exercise-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
      }
      .exercise-btn-secondary {
        padding: 10px 24px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.15);
        background: rgba(255,255,255,0.06);
        color: var(--text-primary, #F0EDE8);
        font-family: var(--font-primary, 'Inter', sans-serif);
        font-size: 14px;
        cursor: pointer;
        transition: background 0.25s;
        margin-top: 8px;
      }
      .exercise-btn-secondary:hover {
        background: rgba(255,255,255,0.1);
      }

      /* Completion state */
      .exercise-complete {
        animation: fadeSlideIn 0.5s ease;
      }
      .exercise-complete-icon {
        font-size: 56px;
        margin-bottom: 20px;
        display: inline-block;
        animation: gentlePulse 2s ease-in-out infinite;
      }
      .exercise-complete-heading {
        font-family: var(--font-display, 'Playfair Display', serif);
        font-size: 26px;
        font-weight: 500;
        margin: 0 0 12px;
      }
      .exercise-complete-message {
        font-size: 16px;
        line-height: 1.6;
        color: var(--text-secondary, rgba(240,237,232,0.65));
        margin: 0 0 28px;
        max-width: 380px;
      }

      @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes gentlePulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
    `;
    document.head.appendChild(style);
  }

  // ==================== UTILITY ====================

  function clearTimers() {
    exerciseTimers.forEach(id => clearTimeout(id));
    exerciseTimers = [];
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function addTimer(fn, ms) {
    const id = setTimeout(fn, ms);
    exerciseTimers.push(id);
    return id;
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ==================== AUDIO ====================

  function playBell() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(528, now);
      // Gentle harmonic — layer a second slightly detuned oscillator
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(528 * 2, now); // octave above, soft

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.8);
      gain.gain.linearRampToValueAtTime(0, now + 2.0);

      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.06, now + 0.6);
      gain2.gain.linearRampToValueAtTime(0, now + 1.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 2.2);

      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now);
      osc2.stop(now + 2.0);
    } catch (e) {
      // Audio not available — fail silently
    }
  }

  // ==================== OVERLAY MANAGEMENT ====================

  function createOverlay() {
    let overlay = document.getElementById('exercise-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'exercise-overlay';
    overlay.innerHTML = `
      <button class="exercise-close-btn" aria-label="Close exercise" onclick="closeExercise()">&times;</button>
      <div class="exercise-container" id="exercise-content"></div>
    `;
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('visible');
      });
    });

    // Close on Escape
    overlay._escHandler = (e) => {
      if (e.key === 'Escape') window.closeExercise();
    };
    document.addEventListener('keydown', overlay._escHandler);

    return document.getElementById('exercise-content');
  }

  function removeOverlay() {
    const overlay = document.getElementById('exercise-overlay');
    if (!overlay) return;
    if (overlay._escHandler) {
      document.removeEventListener('keydown', overlay._escHandler);
    }
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 400);
  }

  function showComplete(container, message) {
    const encouragements = [
      'You did something beautiful for yourself today.',
      'Every moment of calm is a step toward peace.',
      'You showed up for yourself. That matters.',
      'Your mind and body thank you.',
      'Stillness is strength. Well done.'
    ];
    const msg = message || encouragements[Math.floor(Math.random() * encouragements.length)];

    container.innerHTML = `
      <div class="exercise-complete">
        <div class="exercise-complete-icon">&#10024;</div>
        <h2 class="exercise-complete-heading">Exercise Complete</h2>
        <p class="exercise-complete-message">${msg}</p>
        <button class="exercise-btn" onclick="closeExercise()">Return to Reverie</button>
      </div>
    `;
    playBell();
  }

  // ==================== BREATHING EXERCISES ====================

  function buildBreathingSVG() {
    return `
      <svg class="breathing-progress-ring" viewBox="0 0 220 220">
        <circle class="ring-bg" cx="110" cy="110" r="100" />
        <circle class="ring-fill" cx="110" cy="110" r="100"
          stroke-dasharray="${2 * Math.PI * 100}"
          stroke-dashoffset="${2 * Math.PI * 100}" />
      </svg>
    `;
  }

  function startBreathingExercise(container, phases, cycleDuration, totalCycles, title, subtitle) {
    container.innerHTML = `
      <h2 class="exercise-title">${title}</h2>
      <p class="exercise-subtitle">${subtitle}</p>
      <div class="breathing-visual">
        <div class="breathing-circle" id="breath-circle"></div>
        ${buildBreathingSVG()}
      </div>
      <p class="breathing-instruction" id="breath-instruction">Get ready...</p>
      <p class="breathing-timer" id="breath-timer"></p>
      <p class="breathing-cycle-info" id="breath-cycle-info">Cycle 1 of ${totalCycles}</p>
    `;

    const circle = document.getElementById('breath-circle');
    const instructionEl = document.getElementById('breath-instruction');
    const timerEl = document.getElementById('breath-timer');
    const cycleInfoEl = document.getElementById('breath-cycle-info');
    const ringFill = container.querySelector('.ring-fill');
    const ringCircumference = 2 * Math.PI * 100;

    let currentCycle = 0;
    let phaseIndex = 0;
    let phaseStart = 0;
    let running = false;
    let exerciseStart = 0;
    const totalDuration = cycleDuration * totalCycles;

    const phaseLabels = {
      inhale: 'Breathe In',
      hold: 'Hold',
      exhale: 'Breathe Out'
    };

    function getCircleScale(phase, progress) {
      if (phase === 'inhale') return 0.5 + 0.5 * progress;
      if (phase === 'exhale') return 1.0 - 0.5 * progress;
      return phase === 'hold' && phaseIndex <= 1 ? 1.0 : 0.5;
    }

    function tick(now) {
      if (!running) return;

      if (!exerciseStart) exerciseStart = now;
      if (!phaseStart) phaseStart = now;

      const elapsed = (now - phaseStart) / 1000;
      const currentPhase = phases[phaseIndex];
      const phaseDuration = currentPhase.duration;
      const phaseProgress = Math.min(elapsed / phaseDuration, 1);

      // Update instruction
      instructionEl.textContent = phaseLabels[currentPhase.type] || currentPhase.type;
      timerEl.textContent = Math.ceil(phaseDuration - elapsed);

      // Update circle scale
      const scale = getCircleScale(currentPhase.type, phaseProgress);
      circle.style.transform = `scale(${scale})`;

      // Update progress ring — overall progress
      const overallElapsed = (now - exerciseStart) / 1000;
      const overallProgress = Math.min(overallElapsed / totalDuration, 1);
      const offset = ringCircumference * (1 - overallProgress);
      ringFill.setAttribute('stroke-dashoffset', offset);

      // Phase complete?
      if (elapsed >= phaseDuration) {
        phaseIndex++;
        if (phaseIndex >= phases.length) {
          phaseIndex = 0;
          currentCycle++;
          if (currentCycle >= totalCycles) {
            running = false;
            showComplete(container);
            return;
          }
          cycleInfoEl.textContent = `Cycle ${currentCycle + 1} of ${totalCycles}`;
        }
        phaseStart = now;
      }

      animationFrameId = requestAnimationFrame(tick);
    }

    // Start after brief pause
    addTimer(() => {
      running = true;
      animationFrameId = requestAnimationFrame(tick);
    }, 1500);
  }

  function exerciseBoxBreathing(container, cycles) {
    const n = cycles || 4;
    const phases = [
      { type: 'inhale', duration: 4 },
      { type: 'hold', duration: 4 },
      { type: 'exhale', duration: 4 },
      { type: 'hold', duration: 4 }
    ];
    startBreathingExercise(container, phases, 16, n, 'Box Breathing', '4-4-4-4 pattern for calm focus');
  }

  function exercise478Breathing(container, cycles) {
    const n = cycles || 4;
    const phases = [
      { type: 'inhale', duration: 4 },
      { type: 'hold', duration: 7 },
      { type: 'exhale', duration: 8 }
    ];
    startBreathingExercise(container, phases, 19, n, '4-7-8 Breathing', 'A natural tranquilizer for the nervous system');
  }

  // ==================== 5-4-3-2-1 GROUNDING ====================

  function exerciseGrounding(container) {
    const steps = [
      { count: 5, sense: 'See', prompt: 'Name 5 things you can see', icon: '&#128065;' },
      { count: 4, sense: 'Touch', prompt: 'Name 4 things you can touch', icon: '&#9995;' },
      { count: 3, sense: 'Hear', prompt: 'Name 3 things you can hear', icon: '&#128066;' },
      { count: 2, sense: 'Smell', prompt: 'Name 2 things you can smell', icon: '&#127802;' },
      { count: 1, sense: 'Taste', prompt: 'Name 1 thing you can taste', icon: '&#128067;' }
    ];

    let currentStep = 0;

    function renderStep() {
      if (currentStep >= steps.length) {
        showComplete(container, 'You are here. You are present. You are safe.');
        return;
      }

      const step = steps[currentStep];
      let inputsHTML = '';
      for (let i = 0; i < step.count; i++) {
        inputsHTML += `<input class="grounding-input" type="text" placeholder="${step.sense} #${i + 1}..." data-idx="${i}">`;
      }

      container.innerHTML = `
        <h2 class="exercise-title">5-4-3-2-1 Grounding</h2>
        <p class="exercise-subtitle">Bring yourself to the present moment</p>
        <div class="grounding-step">
          <p class="grounding-sense-label">${step.icon} ${step.sense}</p>
          <p class="grounding-prompt">${step.prompt}</p>
          <div class="grounding-items" id="grounding-items">
            ${inputsHTML}
          </div>
          <button class="exercise-btn" id="grounding-next-btn" disabled>Continue</button>
          <p class="breathing-cycle-info" style="margin-top:12px;">Step ${currentStep + 1} of ${steps.length}</p>
        </div>
      `;

      const nextBtn = document.getElementById('grounding-next-btn');
      const itemsContainer = document.getElementById('grounding-items');

      function checkFilled() {
        const inputs = itemsContainer.querySelectorAll('.grounding-input');
        const allFilled = Array.from(inputs).every(inp => inp.value.trim().length > 0);
        nextBtn.disabled = !allFilled;
      }

      itemsContainer.addEventListener('input', checkFilled);
      itemsContainer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !nextBtn.disabled) {
          currentStep++;
          renderStep();
        }
      });

      nextBtn.addEventListener('click', () => {
        currentStep++;
        renderStep();
      });

      // Auto-focus first input
      const firstInput = itemsContainer.querySelector('.grounding-input');
      if (firstInput) addTimer(() => firstInput.focus(), 100);
    }

    renderStep();
  }

  // ==================== BODY SCAN MEDITATION ====================

  function exerciseBodyScan(container) {
    const zones = [
      { name: 'Feet', instruction: 'Bring your attention to the soles of your feet. Notice any warmth, tingling, or pressure. Let them soften and relax into the surface beneath them.' },
      { name: 'Legs', instruction: 'Move your awareness up through your calves and thighs. Feel the weight of your legs resting. Release any tightness you find there.' },
      { name: 'Hips', instruction: 'Notice your hips and pelvis. This area often holds tension we do not realize. Let gravity gently pull any stress away.' },
      { name: 'Belly', instruction: 'Bring awareness to your belly. Feel it rise and fall with each breath. Let your breathing be natural and easy. No need to change it.' },
      { name: 'Chest', instruction: 'Shift attention to your chest and ribcage. Notice the gentle expansion with each inhale. Allow your heart space to feel open and soft.' },
      { name: 'Arms', instruction: 'Let your awareness flow down both arms simultaneously. From shoulders to fingertips, let them grow heavy and warm.' },
      { name: 'Hands', instruction: 'Focus on your hands. Notice the palms, each finger. You might feel a gentle pulse or warmth. Let your hands be completely still.' },
      { name: 'Neck', instruction: 'Gently bring attention to your neck and throat. This area carries so much. Imagine warm light softening every muscle fiber here.' },
      { name: 'Face', instruction: 'Relax the muscles around your jaw, cheeks, and eyes. Unclench your jaw. Let your tongue rest softly. Smooth your forehead.' },
      { name: 'Head', instruction: 'Finally, rest your attention at the crown of your head. Imagine a warm, gentle light radiating from above, washing through your entire body.' }
    ];

    const zoneDuration = 15; // seconds per zone
    let currentZone = 0;
    let zoneStartTime = 0;
    let running = false;

    function renderZone() {
      if (currentZone >= zones.length) {
        showComplete(container, 'Your whole body has been acknowledged and soothed. Carry this calm with you.');
        return;
      }

      const zone = zones[currentZone];
      let dotsHTML = zones.map((_, i) => {
        let cls = 'bodyscan-dot';
        if (i < currentZone) cls += ' done';
        if (i === currentZone) cls += ' active';
        return `<div class="${cls}"></div>`;
      }).join('');

      container.innerHTML = `
        <h2 class="exercise-title">Body Scan</h2>
        <p class="exercise-subtitle">A guided journey through your body</p>
        <div class="bodyscan-zone">
          <p class="bodyscan-zone-name">${zone.name}</p>
          <p class="bodyscan-instruction">${zone.instruction}</p>
          <div class="bodyscan-progress">${dotsHTML}</div>
          <div class="bodyscan-timer-bar">
            <div class="bodyscan-timer-fill" id="bodyscan-fill"></div>
          </div>
          <p class="breathing-cycle-info" style="margin-top:16px;">Zone ${currentZone + 1} of ${zones.length}</p>
        </div>
      `;

      const fill = document.getElementById('bodyscan-fill');
      zoneStartTime = 0;
      running = true;

      function tick(now) {
        if (!running) return;
        if (!zoneStartTime) zoneStartTime = now;
        const elapsed = (now - zoneStartTime) / 1000;
        const progress = Math.min(elapsed / zoneDuration, 1);
        fill.style.width = `${progress * 100}%`;

        if (elapsed >= zoneDuration) {
          running = false;
          currentZone++;
          renderZone();
          return;
        }
        animationFrameId = requestAnimationFrame(tick);
      }

      animationFrameId = requestAnimationFrame(tick);
    }

    renderZone();
  }

  // ==================== MEDITATION TIMER ====================

  function exerciseMeditationTimer(container) {
    const presets = [2, 5, 10, 15, 20];
    let selectedMinutes = null;
    let running = false;
    let startTime = 0;
    let totalSeconds = 0;
    let canvas, ctx;

    function renderPresetSelection() {
      container.innerHTML = `
        <h2 class="exercise-title">Meditation Timer</h2>
        <p class="exercise-subtitle">Choose your duration and settle into stillness</p>
        <div class="meditation-presets" id="med-presets">
          ${presets.map(m => `<button class="meditation-preset-btn" data-min="${m}">${m} min</button>`).join('')}
        </div>
        <button class="exercise-btn" id="med-start-btn" disabled>Begin Meditation</button>
      `;

      const presetsContainer = document.getElementById('med-presets');
      const startBtn = document.getElementById('med-start-btn');

      presetsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.meditation-preset-btn');
        if (!btn) return;
        presetsContainer.querySelectorAll('.meditation-preset-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedMinutes = parseInt(btn.dataset.min, 10);
        startBtn.disabled = false;
      });

      startBtn.addEventListener('click', () => {
        if (selectedMinutes) startMeditation();
      });
    }

    function startMeditation() {
      totalSeconds = selectedMinutes * 60;

      container.innerHTML = `
        <h2 class="exercise-title">Meditation</h2>
        <p class="exercise-subtitle">${selectedMinutes} minutes of stillness</p>
        <div class="meditation-canvas-wrap">
          <canvas id="med-canvas" width="480" height="480"></canvas>
          <div class="meditation-time-display">
            <span class="meditation-elapsed" id="med-elapsed">0:00</span>
            <span class="meditation-total">of ${selectedMinutes}:00</span>
          </div>
        </div>
        <button class="exercise-btn-secondary" id="med-stop-btn">End Early</button>
      `;

      canvas = document.getElementById('med-canvas');
      ctx = canvas.getContext('2d');
      const elapsedEl = document.getElementById('med-elapsed');
      const stopBtn = document.getElementById('med-stop-btn');

      running = true;
      startTime = 0;
      playBell(); // start bell

      stopBtn.addEventListener('click', () => {
        running = false;
        finishMeditation();
      });

      function drawProgress(progress) {
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const r = (w / 2) - 20;

        ctx.clearRect(0, 0, w, h);

        // Background ring
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 6;
        ctx.stroke();

        // Progress arc
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (Math.PI * 2 * progress);
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.strokeStyle = '#7EB09B';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Glowing dot at end
        const dotX = cx + r * Math.cos(endAngle);
        const dotY = cy + r * Math.sin(endAngle);
        ctx.beginPath();
        ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(126,176,155,0.5)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#7EB09B';
        ctx.fill();
      }

      function tick(now) {
        if (!running) return;
        if (!startTime) startTime = now;

        const elapsed = (now - startTime) / 1000;
        const progress = Math.min(elapsed / totalSeconds, 1);

        elapsedEl.textContent = formatTime(elapsed);
        drawProgress(progress);

        if (elapsed >= totalSeconds) {
          running = false;
          finishMeditation();
          return;
        }

        animationFrameId = requestAnimationFrame(tick);
      }

      animationFrameId = requestAnimationFrame(tick);
    }

    function finishMeditation() {
      playBell();
      addTimer(() => {
        showComplete(container, 'In stillness you found strength. Carry this peace with you.');
      }, 2200);
    }

    renderPresetSelection();
  }

  // ==================== PROGRESSIVE MUSCLE RELAXATION ====================

  function exercisePMR(container) {
    const groups = [
      { name: 'Hands', tenseInstruction: 'Make tight fists with both hands', releaseInstruction: 'Let your hands fall open and limp' },
      { name: 'Forearms', tenseInstruction: 'Bend your wrists and tense your forearms', releaseInstruction: 'Let your forearms go completely loose' },
      { name: 'Upper Arms', tenseInstruction: 'Flex your biceps tightly', releaseInstruction: 'Let your arms hang heavy at your sides' },
      { name: 'Shoulders', tenseInstruction: 'Raise your shoulders up toward your ears', releaseInstruction: 'Drop your shoulders and let them melt down' },
      { name: 'Neck', tenseInstruction: 'Gently press the back of your head against an imaginary wall', releaseInstruction: 'Let your neck find its natural, easy position' },
      { name: 'Face', tenseInstruction: 'Scrunch up all the muscles in your face', releaseInstruction: 'Let your face go smooth and soft' },
      { name: 'Chest', tenseInstruction: 'Take a deep breath and hold it, tightening your chest', releaseInstruction: 'Exhale slowly and let your chest relax completely' },
      { name: 'Abdomen', tenseInstruction: 'Tighten your abdominal muscles firmly', releaseInstruction: 'Release and let your belly be soft' },
      { name: 'Thighs', tenseInstruction: 'Press your knees together and squeeze your thigh muscles', releaseInstruction: 'Let your legs fall apart naturally and relax' },
      { name: 'Calves', tenseInstruction: 'Point your toes and tighten your calf muscles', releaseInstruction: 'Flex your feet back to neutral and let go' },
      { name: 'Feet', tenseInstruction: 'Curl your toes tightly', releaseInstruction: 'Spread your toes and release all tension' }
    ];

    const tenseDuration = 5;
    const releaseDuration = 10;
    let currentGroup = 0;
    let phase = 'tense'; // 'tense' or 'release'
    let phaseStartTime = 0;
    let running = false;

    function renderGroup() {
      if (currentGroup >= groups.length) {
        showComplete(container, 'Every muscle group has been released. Your body is deeply relaxed.');
        return;
      }

      const group = groups[currentGroup];
      phase = 'tense';
      phaseStartTime = 0;
      running = true;

      function updateDisplay() {
        const isTense = phase === 'tense';
        const instruction = isTense ? group.tenseInstruction : group.releaseInstruction;
        const actionLabel = isTense ? 'Tense...' : 'Release...';
        const phaseDur = isTense ? tenseDuration : releaseDuration;

        container.innerHTML = `
          <h2 class="exercise-title">Progressive Muscle Relaxation</h2>
          <p class="exercise-subtitle">Tense and release each muscle group</p>
          <div class="pmr-visual">
            <div class="pmr-circle ${phase}" id="pmr-circle">
              <span id="pmr-countdown">${phaseDur}</span>
            </div>
          </div>
          <p class="pmr-group-name">${group.name}</p>
          <p class="pmr-action ${phase}">${actionLabel}</p>
          <p class="bodyscan-instruction" style="margin-top:4px;">${instruction}</p>
          <p class="pmr-progress-text">Group ${currentGroup + 1} of ${groups.length}</p>
        `;
      }

      updateDisplay();

      const countdownEl = () => document.getElementById('pmr-countdown');
      const circleEl = () => document.getElementById('pmr-circle');

      function tick(now) {
        if (!running) return;
        if (!phaseStartTime) phaseStartTime = now;

        const elapsed = (now - phaseStartTime) / 1000;
        const phaseDur = phase === 'tense' ? tenseDuration : releaseDuration;
        const remaining = Math.ceil(phaseDur - elapsed);
        const el = countdownEl();
        if (el) el.textContent = Math.max(remaining, 0);

        if (elapsed >= phaseDur) {
          if (phase === 'tense') {
            phase = 'release';
            phaseStartTime = 0;
            updateDisplay();
          } else {
            currentGroup++;
            renderGroup();
            return;
          }
        }

        animationFrameId = requestAnimationFrame(tick);
      }

      animationFrameId = requestAnimationFrame(tick);
    }

    renderGroup();
  }

  // ==================== SLEEP STORIES ====================

  const STORIES = {
    forest: {
      title: 'A Walk Through the Quiet Forest',
      description: 'Tall pines, soft earth, and dappled sunlight',
      lines: [
        'You find yourself at the edge of a forest, where the world grows quieter with each step you take.',
        'The path ahead is soft, carpeted in a thick layer of fallen pine needles that cushion every footfall.',
        'Tall trees rise around you, their trunks straight and steady, reaching up toward a canopy of deep green.',
        'Sunlight filters through the branches in long, golden shafts, painting warm circles on the forest floor.',
        'You breathe in deeply. The air is cool and carries the scent of pine resin, damp earth, and something sweet you cannot name.',
        'A bird calls softly from somewhere above — a clear, unhurried melody that drifts and fades.',
        'You continue walking, and the path curves gently around a moss-covered boulder.',
        'The moss is impossibly green, thick and plush, and tiny droplets of water catch the light like scattered diamonds.',
        'As you walk further, the trees grow closer together, and the light takes on a softer, more amber hue.',
        'You notice a small stream running alongside the path, its water so clear you can see every smooth stone beneath the surface.',
        'The stream makes a quiet, constant sound — a gentle murmur that blends with the breeze in the leaves.',
        'A butterfly crosses your path, its wings a pale blue, floating on the air without effort.',
        'You come to a small clearing where the grass is soft and inviting.',
        'You sit down slowly, feeling the earth solid and warm beneath you.',
        'Above, the sky is a deep, peaceful blue, framed by the dark silhouettes of treetops.',
        'You close your eyes for a moment and listen. The forest holds you in its gentle, endless calm.',
        'There is nowhere else you need to be. Nothing else you need to do.',
        'You are here. The forest welcomes you. And slowly, softly, you rest.'
      ]
    },
    beach: {
      title: 'A Beach at Sunset',
      description: 'Warm sand, gentle waves, and fading golden light',
      lines: [
        'The sun has begun its slow descent toward the horizon, painting the sky in shades of amber, rose, and lavender.',
        'You walk barefoot along the shore, and the sand is warm beneath your feet — the kind of warmth that has been collecting all day.',
        'Each step leaves a soft impression that the water gently erases with its next arrival.',
        'The waves come in slow, rhythmic intervals, folding over themselves with a sound like a long, peaceful exhale.',
        'You pause and look out across the water. The surface shimmers with reflected light, a thousand tiny mirrors catching the fading sun.',
        'A warm breeze moves across your skin, carrying the salt-sweet smell of the ocean.',
        'Far down the beach, the sand curves away and disappears into a soft haze where sky and sea blend together.',
        'You sit down at the water\'s edge, letting the foam curl around your ankles before pulling gently back.',
        'The water is warmer than you expected. It feels like a kind embrace.',
        'Seashells lie scattered at the tide line — pale whites, soft pinks, spirals worn smooth by patient years of water.',
        'You pick one up and turn it in your fingers. It fits perfectly in your palm, as if it had been waiting for you.',
        'The sky deepens. The amber fades to rose, the rose to a violet so rich it seems to hum.',
        'A single star appears, faint at first, then steady — the first light of evening.',
        'The sound of the waves becomes the only sound. Steady. Reliable. Endless.',
        'You lie back on the warm sand, cradling your head in your hands.',
        'The sky above is infinite and turning slowly toward a darkness filled with light.',
        'The tide whispers its ancient lullaby, and you feel your breathing slow to match its rhythm.',
        'You are held between the earth and sky. Safe. Warm. Perfectly at peace.'
      ]
    },
    cabin: {
      title: 'A Cozy Cabin in the Rain',
      description: 'Warm firelight, soft blankets, and the sound of rain',
      lines: [
        'Rain taps gently against the windows of the cabin, a soft, irregular percussion that fills the room with its quiet music.',
        'You are inside, wrapped in a thick, soft blanket that smells faintly of cedar and wool.',
        'A fire crackles in the stone fireplace, its flames casting dancing shadows across the wooden walls.',
        'The room is small and warm, filled with the golden glow of firelight and the amber light of a single lamp.',
        'Outside, the rain falls steadily over the meadow and the trees, turning the world soft and grey and gentle.',
        'You can hear the rain on the roof — a thousand tiny fingers drumming a lullaby just for you.',
        'A cup of something warm sits on the table beside you, its steam rising in lazy, curling wisps.',
        'You take a sip. The warmth travels through you slowly, from your lips to your chest to the tips of your fingers.',
        'The fire pops softly, sending a small shower of sparks up the chimney.',
        'Through the window, you can see the rain beading on the glass, each droplet catching and holding a tiny reflection of the fire.',
        'The trees outside sway gently in the wind, their branches heavy with rain, their leaves whispering to one another.',
        'A book lies open on your lap, but you are not reading. You are simply being here, in this moment.',
        'The blanket is impossibly soft against your skin. You pull it a little closer.',
        'The rain intensifies for a moment, then eases, then finds its steady rhythm again.',
        'There is nothing urgent in this world. No messages to answer. No tasks left undone.',
        'Only the rain. Only the fire. Only the warmth of this small, perfect shelter.',
        'Your eyelids grow heavy, and the sounds of the cabin — the crackle, the rain, the wind — become a single, soothing chord.',
        'You let your eyes close. The cabin holds you. The rain sings you to sleep.'
      ]
    }
  };

  function exerciseSleepStories(container) {
    // Show story selection
    container.innerHTML = `
      <h2 class="exercise-title">Sleep Stories</h2>
      <p class="exercise-subtitle">Choose a calming narrative to ease into rest</p>
      <div class="story-selector">
        ${Object.entries(STORIES).map(([key, story]) => `
          <button class="story-option" data-story="${key}">
            <div class="story-option-title">${story.title}</div>
            <div class="story-option-desc">${story.description}</div>
          </button>
        `).join('')}
      </div>
    `;

    container.querySelector('.story-selector').addEventListener('click', (e) => {
      const btn = e.target.closest('.story-option');
      if (!btn) return;
      const key = btn.dataset.story;
      if (STORIES[key]) startStory(container, STORIES[key]);
    });
  }

  function startStory(container, story) {
    container.innerHTML = `
      <h2 class="exercise-title">${story.title}</h2>
      <p class="exercise-subtitle" style="margin-bottom:24px;">Relax and let the words carry you</p>
      <div class="story-container" id="story-scroll">
        ${story.lines.map((line, i) => `<p class="story-line" data-idx="${i}">${line}</p>`).join('')}
      </div>
    `;

    const scrollContainer = document.getElementById('story-scroll');
    const lines = scrollContainer.querySelectorAll('.story-line');
    const lineDelay = 4000; // ms between each line appearing

    lines.forEach((line, i) => {
      addTimer(() => {
        line.classList.add('visible');
        // Auto-scroll to keep current line visible
        line.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, i * lineDelay + 500);
    });

    // After all lines shown, offer completion
    addTimer(() => {
      const doneBtn = document.createElement('button');
      doneBtn.className = 'exercise-btn';
      doneBtn.textContent = 'Drift Off...';
      doneBtn.style.marginTop = '28px';
      doneBtn.style.opacity = '0';
      doneBtn.style.transition = 'opacity 1s ease';
      scrollContainer.appendChild(doneBtn);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { doneBtn.style.opacity = '1'; });
      });
      doneBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      doneBtn.addEventListener('click', () => {
        showComplete(container, 'Sweet dreams. Tomorrow is a new beginning.');
      });
    }, story.lines.length * lineDelay + 2000);
  }

  // ==================== EXERCISE REGISTRY ====================

  const EXERCISES = {
    'box-breathing': exerciseBoxBreathing,
    '478-breathing': exercise478Breathing,
    'grounding': exerciseGrounding,
    'body-scan': exerciseBodyScan,
    'meditation-timer': exerciseMeditationTimer,
    'pmr': exercisePMR,
    'sleep-stories': exerciseSleepStories
  };

  // ==================== PUBLIC API ====================

  window.openExercise = function (type, options) {
    // Close any existing exercise
    if (activeExercise) {
      window.closeExercise();
    }

    const exerciseFn = EXERCISES[type];
    if (!exerciseFn) {
      console.warn(`[Reverie] Unknown exercise type: "${type}". Available: ${Object.keys(EXERCISES).join(', ')}`);
      return;
    }

    injectStyles();
    const container = createOverlay();
    activeExercise = type;

    // Pass options (e.g., cycles) if the exercise supports them
    exerciseFn(container, options);
  };

  window.closeExercise = function () {
    clearTimers();
    removeOverlay();
    activeExercise = null;
  };

})();
