// Emergency SOS Mode - Reverie Mental Wellness App
(function () {
  'use strict';

  var overlay = null;
  var stylesInjected = false;
  var groundingTimer = null;

  var GROUNDING_STEPS = [
    { num: 5, sense: 'SEE', prompt: 'Name 5 things you can see around you.' },
    { num: 4, sense: 'TOUCH', prompt: 'Name 4 things you can physically touch.' },
    { num: 3, sense: 'HEAR', prompt: 'Name 3 things you can hear right now.' },
    { num: 2, sense: 'SMELL', prompt: 'Name 2 things you can smell.' },
    { num: 1, sense: 'TASTE', prompt: 'Name 1 thing you can taste.' }
  ];

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var style = document.createElement('style');
    style.textContent =
      '@keyframes sos-breathe{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(1.15);opacity:.6}}' +
      '@keyframes sos-circle{0%{transform:scale(.6);opacity:.5}25%{transform:scale(1);opacity:1}50%{transform:scale(1);opacity:1}75%{transform:scale(.6);opacity:.5}100%{transform:scale(.6);opacity:.5}}' +
      '@keyframes sos-pulse-btn{0%,100%{box-shadow:0 0 8px rgba(232,124,124,.4)}50%{box-shadow:0 0 20px rgba(232,124,124,.8)}}' +
      '@keyframes sos-fade-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}' +
      '@keyframes sos-glow{0%,100%{background:radial-gradient(circle,rgba(232,168,124,.08) 0%,transparent 70%)}50%{background:radial-gradient(circle,rgba(232,168,124,.15) 0%,transparent 70%)}}' +
      '.sos-overlay{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'background:var(--bg-primary,#0F0F1A);color:var(--text-primary,#F0EDE8);font-family:inherit;overflow-y:auto;padding:24px}' +
      '.sos-overlay::before{content:"";position:absolute;inset:0;animation:sos-glow 6s ease-in-out infinite;pointer-events:none}' +
      '.sos-close{position:fixed;top:16px;right:20px;background:none;border:1px solid rgba(240,237,232,.2);color:var(--text-primary,#F0EDE8);' +
        'font-size:20px;width:40px;height:40px;border-radius:50%;cursor:pointer;z-index:10000;display:flex;align-items:center;justify-content:center}' +
      '.sos-close:hover{background:rgba(240,237,232,.1)}' +
      '.sos-hero{font-size:clamp(1.4rem,4vw,2rem);font-weight:600;text-align:center;margin-bottom:28px;animation:sos-fade-in .8s ease}' +
      '.sos-breath-wrap{display:flex;flex-direction:column;align-items:center;margin-bottom:28px;animation:sos-fade-in 1s ease}' +
      '.sos-breath-circle{width:90px;height:90px;border-radius:50%;border:3px solid var(--accent-warm,#E8A87C);animation:sos-circle 12s ease-in-out infinite;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--accent-warm,#E8A87C)}' +
      '.sos-breath-label{margin-top:8px;font-size:13px;opacity:.7}' +
      '.sos-grounding{text-align:center;min-height:80px;margin-bottom:28px;animation:sos-fade-in 1.2s ease}' +
      '.sos-grounding-step{font-size:clamp(1rem,3vw,1.3rem);opacity:0;transition:opacity .6s ease}' +
      '.sos-grounding-step.active{opacity:1}' +
      '.sos-grounding-num{font-size:2.2rem;font-weight:700;color:var(--accent-warm,#E8A87C);display:block;margin-bottom:4px}' +
      '.sos-hotlines{text-align:center;margin-bottom:24px;animation:sos-fade-in 1.4s ease}' +
      '.sos-hotlines p{margin:6px 0;font-size:14px;opacity:.85}' +
      '.sos-hotlines strong{color:var(--accent-warm,#E8A87C)}' +
      '.sos-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;animation:sos-fade-in 1.6s ease}' +
      '.sos-actions a{display:inline-block;padding:14px 28px;border-radius:30px;font-size:15px;font-weight:600;text-decoration:none;cursor:pointer;transition:transform .2s}' +
      '.sos-actions a:hover{transform:scale(1.04)}' +
      '.sos-call{background:var(--accent-danger,#E87C7C);color:#fff}' +
      '.sos-text{background:transparent;border:2px solid var(--accent-warm,#E8A87C);color:var(--accent-warm,#E8A87C)}' +
      '.sos-float{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:var(--accent-danger,#E87C7C);color:#fff;' +
        'font-weight:700;font-size:14px;border:none;cursor:pointer;z-index:9998;display:flex;align-items:center;justify-content:center;' +
        'animation:sos-pulse-btn 2s ease-in-out infinite;box-shadow:0 2px 12px rgba(232,124,124,.4)}' +
      '.sos-float:hover{transform:scale(1.08)}';
    document.head.appendChild(style);
  }

  function buildBreathLabel() {
    var el = document.createElement('span');
    el.className = 'sos-breath-label';
    var phases = ['Inhale... 4s', 'Hold... 4s', 'Exhale... 4s'];
    var i = 0;
    function tick() {
      el.textContent = phases[i % 3];
      i++;
    }
    tick();
    var id = setInterval(tick, 4000);
    el._interval = id;
    return el;
  }

  function startGrounding(container) {
    var idx = 0;
    function showStep() {
      if (idx >= GROUNDING_STEPS.length) { idx = 0; }
      var s = GROUNDING_STEPS[idx];
      container.innerHTML =
        '<div class="sos-grounding-step active">' +
        '<span class="sos-grounding-num">' + s.num + '</span>' +
        s.prompt + '</div>';
      idx++;
    }
    showStep();
    groundingTimer = setInterval(showStep, 8000);
  }

  function onKey(e) {
    if (e.key === 'Escape') { SOSMode.deactivate(); }
  }

  var SOSMode = {
    activate: function () {
      if (overlay) return;
      injectStyles();

      overlay = document.createElement('div');
      overlay.className = 'sos-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-label', 'Emergency SOS support');

      // Close button
      var close = document.createElement('button');
      close.className = 'sos-close';
      close.setAttribute('aria-label', 'Close SOS mode');
      close.innerHTML = '&#10005;';
      close.addEventListener('click', SOSMode.deactivate);
      overlay.appendChild(close);

      // Hero text
      var hero = document.createElement('div');
      hero.className = 'sos-hero';
      hero.textContent = 'You are safe. You are not alone.';
      overlay.appendChild(hero);

      // Breathing animation
      var breathWrap = document.createElement('div');
      breathWrap.className = 'sos-breath-wrap';
      var circle = document.createElement('div');
      circle.className = 'sos-breath-circle';
      circle.textContent = 'Breathe';
      breathWrap.appendChild(circle);
      breathWrap.appendChild(buildBreathLabel());
      overlay.appendChild(breathWrap);

      // Grounding exercise
      var grounding = document.createElement('div');
      grounding.className = 'sos-grounding';
      overlay.appendChild(grounding);
      startGrounding(grounding);

      // Hotlines
      var hotlines = document.createElement('div');
      hotlines.className = 'sos-hotlines';
      hotlines.innerHTML =
        '<p><strong>988 Suicide &amp; Crisis Lifeline</strong><br>Call or text 988</p>' +
        '<p><strong>Crisis Text Line</strong><br>Text HOME to 741741</p>' +
        '<p><strong>Emergency</strong><br>Call 911</p>';
      overlay.appendChild(hotlines);

      // Action buttons
      var actions = document.createElement('div');
      actions.className = 'sos-actions';
      actions.innerHTML =
        '<a href="tel:988" class="sos-call">Call 988 Now</a>' +
        '<a href="sms:741741?body=HOME" class="sos-text">Text HOME to 741741</a>';
      overlay.appendChild(actions);

      document.body.appendChild(overlay);
      document.addEventListener('keydown', onKey);
    },

    deactivate: function () {
      if (!overlay) return;
      if (groundingTimer) { clearInterval(groundingTimer); groundingTimer = null; }
      var label = overlay.querySelector('.sos-breath-label');
      if (label && label._interval) { clearInterval(label._interval); }
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      overlay = null;
    },

    renderSOSButton: function () {
      return '<button class="sos-float" onclick="SOSMode.activate()" aria-label="Emergency SOS">SOS</button>';
    }
  };

  window.SOSMode = SOSMode;
})();
