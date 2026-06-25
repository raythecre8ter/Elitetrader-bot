(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────────
   *  AvatarPortraits  –  Pixar/Disney-quality 3D-style SVG
   *  character bust portraits for the six AI wellness companions.
   *
   *  200 x 280 viewBox.  Modular expression system with 6 states.
   *  Image-override support with localStorage persistence.
   * ────────────────────────────────────────────────────────────── */

  var COMPANION_IDS = ['aria', 'kai', 'luna', 'sage', 'nova', 'ember'];
  var EXPRESSION_NAMES = ['calm', 'happy', 'surprised', 'sad', 'angry', 'worried'];
  var STORAGE_KEY = 'reverie_avatar_images';
  var currentExpressions = {};
  var imageOverrides = {};

  // Load saved image overrides
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) imageOverrides = JSON.parse(saved);
  } catch (e) { /* ignore */ }

  // Initialize default expressions
  for (var i = 0; i < COMPANION_IDS.length; i++) {
    currentExpressions[COMPANION_IDS[i]] = 'calm';
  }

  /* ─── CSS injection ──────────────────────────────────────────── */
  var styleInjected = false;
  function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    var css = document.createElement('style');
    css.textContent =
      '@keyframes portrait-glow-pulse {' +
        '0%, 100% { opacity: 0.5; transform: scale(1); }' +
        '50% { opacity: 0.85; transform: scale(1.05); }' +
      '}' +
      '@keyframes portrait-float {' +
        '0%, 100% { transform: translateY(0); }' +
        '50% { transform: translateY(-4px); }' +
      '}' +
      '.avatar-portrait { display: block; width: 100%; height: 100%; }' +
      '.avatar-portrait .portrait-glow { animation: portrait-glow-pulse 4s ease-in-out infinite; transform-origin: center center; }' +
      '.portrait-svg-wrapper { animation: portrait-float 5s ease-in-out infinite; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }' +
      '.portrait-svg-wrapper img { width: 100%; height: 100%; object-fit: contain; border-radius: 12px; }' +
      '.avatar-portrait .expr-eyes, .avatar-portrait .expr-brows, .avatar-portrait .expr-mouth {' +
        'transition: all 0.3s ease;' +
      '}';
    document.head.appendChild(css);
  }

  /* ─── Shared SVG helpers ─────────────────────────────────────── */

  function uid(base, companionId) {
    return base + '-' + companionId;
  }

  function skinGradients(id, skinLight, skinBase, skinMid, skinShadow, skinDeep) {
    return '' +
      '<radialGradient id="' + uid('skin', id) + '" cx="48%" cy="38%" r="55%">' +
        '<stop offset="0%" stop-color="' + skinLight + '"/>' +
        '<stop offset="40%" stop-color="' + skinBase + '"/>' +
        '<stop offset="75%" stop-color="' + skinMid + '"/>' +
        '<stop offset="100%" stop-color="' + skinShadow + '"/>' +
      '</radialGradient>' +
      '<radialGradient id="' + uid('skinhi', id) + '" cx="45%" cy="30%" r="40%">' +
        '<stop offset="0%" stop-color="' + skinLight + '" stop-opacity="0.6"/>' +
        '<stop offset="100%" stop-color="' + skinLight + '" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<radialGradient id="' + uid('chinshadow', id) + '" cx="50%" cy="0%" r="70%">' +
        '<stop offset="0%" stop-color="' + skinDeep + '" stop-opacity="0.35"/>' +
        '<stop offset="100%" stop-color="' + skinDeep + '" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<radialGradient id="' + uid('noseshadow', id) + '" cx="60%" cy="50%" r="50%">' +
        '<stop offset="0%" stop-color="' + skinShadow + '" stop-opacity="0.25"/>' +
        '<stop offset="100%" stop-color="' + skinShadow + '" stop-opacity="0"/>' +
      '</radialGradient>';
  }

  function glowGradient(id, color) {
    return '<radialGradient id="' + uid('glow', id) + '" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.3"/>' +
      '<stop offset="60%" stop-color="' + color + '" stop-opacity="0.1"/>' +
      '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>' +
    '</radialGradient>';
  }

  function eyeSVG(cx, cy, irisColor, irisOuter, pupilColor, size, lidColor) {
    var s = size || 1;
    var lc = lidColor || '#00000015';
    return '' +
      /* sclera with subtle gradient */
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (12 * s) + '" ry="' + (8.5 * s) + '" fill="#FEFEFE"/>' +
      '<ellipse cx="' + cx + '" cy="' + (cy + 1) + '" rx="' + (11.5 * s) + '" ry="' + (7.5 * s) + '" fill="#FAFAF8"/>' +
      /* upper lid shadow */
      '<ellipse cx="' + cx + '" cy="' + (cy - 2 * s) + '" rx="' + (12 * s) + '" ry="' + (5 * s) + '" fill="' + lc + '"/>' +
      /* iris outer ring */
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (6 * s) + '" fill="' + irisOuter + '"/>' +
      /* iris main */
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (5.2 * s) + '" fill="' + irisColor + '"/>' +
      /* iris radial detail */
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (5.2 * s) + '" fill="none" stroke="' + irisOuter + '" stroke-width="0.5" opacity="0.4"/>' +
      /* pupil */
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (2.8 * s) + '" fill="' + (pupilColor || '#0a0a0a') + '"/>' +
      /* main specular highlight */
      '<ellipse cx="' + (cx - 2.2 * s) + '" cy="' + (cy - 2 * s) + '" rx="' + (1.8 * s) + '" ry="' + (1.4 * s) + '" fill="#fff" opacity="0.9"/>' +
      /* secondary highlight */
      '<circle cx="' + (cx + 1.8 * s) + '" cy="' + (cy + 1.2 * s) + '" r="' + (0.8 * s) + '" fill="#fff" opacity="0.45"/>' +
      /* sclera clip edge */
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (12 * s) + '" ry="' + (8.5 * s) + '" fill="none" stroke="#D8D0C8" stroke-width="0.4"/>';
  }

  function neckSVG(cx, cy, skinGrad, w) {
    var hw = w || 22;
    return '' +
      '<path d="M' + (cx - hw) + ' ' + cy +
        ' Q' + (cx - hw + 3) + ' ' + (cy + 18) + ' ' + (cx - hw + 2) + ' ' + (cy + 38) +
        ' L' + (cx + hw - 2) + ' ' + (cy + 38) +
        ' Q' + (cx + hw - 3) + ' ' + (cy + 18) + ' ' + (cx + hw) + ' ' + cy + ' Z" ' +
        'fill="' + skinGrad + '"/>' +
      /* neck shadow */
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (hw + 2) + '" ry="5" fill="rgba(0,0,0,0.08)"/>';
  }

  function shouldersSVG(cx, cy, color, shadowColor, style) {
    var shadow = shadowColor || 'rgba(0,0,0,0.1)';
    if (style === 'wide') {
      return '' +
        '<path d="M' + (cx - 90) + ' ' + (cy + 55) +
          ' Q' + (cx - 72) + ' ' + cy + ' ' + (cx - 26) + ' ' + (cy - 6) +
          ' L' + (cx + 26) + ' ' + (cy - 6) +
          ' Q' + (cx + 72) + ' ' + cy + ' ' + (cx + 90) + ' ' + (cy + 55) +
          ' L' + (cx + 105) + ' ' + (cy + 70) +
          ' L' + (cx - 105) + ' ' + (cy + 70) + ' Z" fill="' + color + '"/>' +
        '<path d="M' + (cx - 90) + ' ' + (cy + 55) +
          ' Q' + (cx - 72) + ' ' + cy + ' ' + (cx - 26) + ' ' + (cy - 6) +
          ' L' + (cx + 26) + ' ' + (cy - 6) +
          ' Q' + (cx + 72) + ' ' + cy + ' ' + (cx + 90) + ' ' + (cy + 55) + '" ' +
          'fill="none" stroke="' + shadow + '" stroke-width="1"/>';
    }
    return '' +
      '<path d="M' + (cx - 85) + ' ' + (cy + 55) +
        ' Q' + (cx - 62) + ' ' + (cy - 6) + ' ' + (cx - 24) + ' ' + (cy - 10) +
        ' Q' + cx + ' ' + (cy - 14) + ' ' + (cx + 24) + ' ' + (cy - 10) +
        ' Q' + (cx + 62) + ' ' + (cy - 6) + ' ' + (cx + 85) + ' ' + (cy + 55) +
        ' L' + (cx + 105) + ' ' + (cy + 70) +
        ' L' + (cx - 105) + ' ' + (cy + 70) + ' Z" fill="' + color + '"/>' +
      '<path d="M' + (cx - 85) + ' ' + (cy + 55) +
        ' Q' + (cx - 62) + ' ' + (cy - 6) + ' ' + (cx - 24) + ' ' + (cy - 10) +
        ' Q' + cx + ' ' + (cy - 14) + ' ' + (cx + 24) + ' ' + (cy - 10) +
        ' Q' + (cx + 62) + ' ' + (cy - 6) + ' ' + (cx + 85) + ' ' + (cy + 55) + '" ' +
        'fill="none" stroke="' + shadow + '" stroke-width="1"/>';
  }

  function noseSVG(cx, cy, shadowColor) {
    var sc = shadowColor || 'rgba(0,0,0,0.08)';
    return '' +
      '<path d="M' + cx + ' ' + (cy - 10) +
        ' Q' + (cx + 5) + ' ' + (cy - 2) + ' ' + (cx + 7) + ' ' + (cy + 2) +
        ' Q' + (cx + 3) + ' ' + (cy + 6) + ' ' + cx + ' ' + (cy + 5) +
        ' Q' + (cx - 3) + ' ' + (cy + 6) + ' ' + (cx - 7) + ' ' + (cy + 2) +
        ' Q' + (cx - 5) + ' ' + (cy - 2) + ' ' + cx + ' ' + (cy - 10) + ' Z" ' +
        'fill="none" stroke="' + sc + '" stroke-width="1"/>' +
      /* nostrils */
      '<ellipse cx="' + (cx - 3.5) + '" cy="' + (cy + 2.5) + '" rx="2.2" ry="1.5" fill="rgba(0,0,0,0.06)"/>' +
      '<ellipse cx="' + (cx + 3.5) + '" cy="' + (cy + 2.5) + '" rx="2.2" ry="1.5" fill="rgba(0,0,0,0.06)"/>' +
      /* nose side shadow (left lit, right shadow) */
      '<ellipse cx="' + (cx + 6) + '" cy="' + (cy - 2) + '" rx="3" ry="6" fill="rgba(0,0,0,0.04)"/>';
  }

  function blushSVG(cx, cy, color, opacity) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="10" ry="5.5" fill="' + (color || '#E8A090') + '" opacity="' + (opacity || 0.22) + '"/>';
  }

  /* ─── Expression parts builder ──────────────────────────────── */

  function buildExpressionParts(id, cfg) {
    /*
     * cfg = {
     *   eyeLX, eyeLY, eyeRX, eyeRY   – eye centers
     *   browLX, browLY, browRX, browRY – brow centers
     *   mouthCX, mouthCY              – mouth center
     *   browColor, lipColor, lipDark, teethColor
     *   browWidth
     * }
     */
    var parts = {};

    var elx = cfg.eyeLX, ely = cfg.eyeLY;
    var erx = cfg.eyeRX, ery = cfg.eyeRY;
    var blx = cfg.browLX, bly = cfg.browLY;
    var brx = cfg.browRX, bry = cfg.browRY;
    var mcx = cfg.mouthCX, mcy = cfg.mouthCY;
    var bc = cfg.browColor || '#3D2518';
    var lc = cfg.lipColor || '#C27070';
    var ld = cfg.lipDark || '#A05555';
    var tc = cfg.teethColor || '#F8F4F0';
    var bw = cfg.browWidth || 20;

    /* ── calm (default) ─────────────── */
    parts.calm = {
      brows:
        '<path d="M' + (blx - bw/2) + ' ' + bly + ' Q' + blx + ' ' + (bly - 4) + ' ' + (blx + bw/2) + ' ' + bly + '" ' +
          'stroke="' + bc + '" stroke-width="2.2" fill="none" stroke-linecap="round" transform="rotate(-3 ' + blx + ' ' + bly + ')"/>' +
        '<path d="M' + (brx - bw/2) + ' ' + bry + ' Q' + brx + ' ' + (bry - 4) + ' ' + (brx + bw/2) + ' ' + bry + '" ' +
          'stroke="' + bc + '" stroke-width="2.2" fill="none" stroke-linecap="round" transform="rotate(3 ' + brx + ' ' + bry + ')"/>',
      eyes:
        /* normal open eyes: thin upper lid line */
        '<path d="M' + (elx - 12) + ' ' + ely + ' Q' + elx + ' ' + (ely - 5) + ' ' + (elx + 12) + ' ' + ely + '" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="1.2"/>' +
        '<path d="M' + (erx - 12) + ' ' + ery + ' Q' + erx + ' ' + (ery - 5) + ' ' + (erx + 12) + ' ' + ery + '" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="1.2"/>',
      mouth:
        /* gentle closed smile */
        '<path d="M' + (mcx - 13) + ' ' + mcy +
          ' Q' + (mcx - 7) + ' ' + (mcy - 3) + ' ' + mcx + ' ' + (mcy - 1) +
          ' Q' + (mcx + 7) + ' ' + (mcy - 3) + ' ' + (mcx + 13) + ' ' + mcy + '" ' +
          'fill="' + lc + '" stroke="' + ld + '" stroke-width="0.4"/>' +
        '<path d="M' + (mcx - 13) + ' ' + mcy +
          ' Q' + (mcx - 5) + ' ' + (mcy + 6) + ' ' + mcx + ' ' + (mcy + 7) +
          ' Q' + (mcx + 5) + ' ' + (mcy + 6) + ' ' + (mcx + 13) + ' ' + mcy + '" ' +
          'fill="' + lc + '" stroke="' + ld + '" stroke-width="0.4"/>' +
        '<path d="M' + (mcx - 12) + ' ' + mcy + ' Q' + mcx + ' ' + (mcy + 1.5) + ' ' + (mcx + 12) + ' ' + mcy + '" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="0.5"/>'
    };

    /* ── happy ──────────────────────── */
    parts.happy = {
      brows:
        '<path d="M' + (blx - bw/2) + ' ' + (bly + 1) + ' Q' + blx + ' ' + (bly - 6) + ' ' + (blx + bw/2) + ' ' + (bly + 1) + '" ' +
          'stroke="' + bc + '" stroke-width="2.2" fill="none" stroke-linecap="round" transform="rotate(-4 ' + blx + ' ' + bly + ')"/>' +
        '<path d="M' + (brx - bw/2) + ' ' + (bry + 1) + ' Q' + brx + ' ' + (bry - 6) + ' ' + (brx + bw/2) + ' ' + (bry + 1) + '" ' +
          'stroke="' + bc + '" stroke-width="2.2" fill="none" stroke-linecap="round" transform="rotate(4 ' + brx + ' ' + bry + ')"/>',
      eyes:
        /* squinted happy eyes - smile lines */
        '<path d="M' + (elx - 11) + ' ' + (ely + 1) + ' Q' + elx + ' ' + (ely - 6) + ' ' + (elx + 11) + ' ' + (ely + 1) + '" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="M' + (elx - 9) + ' ' + (ely + 3) + ' Q' + elx + ' ' + (ely - 2) + ' ' + (elx + 9) + ' ' + (ely + 3) + '" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="0.8"/>' +
        '<path d="M' + (erx - 11) + ' ' + (ery + 1) + ' Q' + erx + ' ' + (ery - 6) + ' ' + (erx + 11) + ' ' + (ery + 1) + '" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="M' + (erx - 9) + ' ' + (ery + 3) + ' Q' + erx + ' ' + (ery - 2) + ' ' + (erx + 9) + ' ' + (ery + 3) + '" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="0.8"/>',
      mouth:
        /* wide open smile with teeth */
        '<path d="M' + (mcx - 16) + ' ' + (mcy - 1) +
          ' Q' + (mcx - 8) + ' ' + (mcy - 5) + ' ' + mcx + ' ' + (mcy - 3) +
          ' Q' + (mcx + 8) + ' ' + (mcy - 5) + ' ' + (mcx + 16) + ' ' + (mcy - 1) + '" ' +
          'fill="' + lc + '" stroke="' + ld + '" stroke-width="0.4"/>' +
        '<path d="M' + (mcx - 16) + ' ' + (mcy - 1) +
          ' Q' + (mcx - 5) + ' ' + (mcy + 9) + ' ' + mcx + ' ' + (mcy + 10) +
          ' Q' + (mcx + 5) + ' ' + (mcy + 9) + ' ' + (mcx + 16) + ' ' + (mcy - 1) + '" ' +
          'fill="' + lc + '" stroke="' + ld + '" stroke-width="0.4"/>' +
        /* teeth */
        '<path d="M' + (mcx - 12) + ' ' + (mcy - 1) +
          ' Q' + mcx + ' ' + mcy + ' ' + (mcx + 12) + ' ' + (mcy - 1) +
          ' L' + (mcx + 12) + ' ' + (mcy + 3) +
          ' Q' + mcx + ' ' + (mcy + 4) + ' ' + (mcx - 12) + ' ' + (mcy + 3) + ' Z" ' +
          'fill="' + tc + '" opacity="0.85"/>' +
        '<path d="M' + (mcx - 11) + ' ' + (mcy - 1) + ' Q' + mcx + ' ' + (mcy + 1) + ' ' + (mcx + 11) + ' ' + (mcy - 1) + '" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="0.5"/>'
    };

    /* ── surprised ─────────────────── */
    parts.surprised = {
      brows:
        '<path d="M' + (blx - bw/2) + ' ' + (bly - 2) + ' Q' + blx + ' ' + (bly - 9) + ' ' + (blx + bw/2) + ' ' + (bly - 2) + '" ' +
          'stroke="' + bc + '" stroke-width="2.4" fill="none" stroke-linecap="round" transform="rotate(-2 ' + blx + ' ' + bly + ')"/>' +
        '<path d="M' + (brx - bw/2) + ' ' + (bry - 2) + ' Q' + brx + ' ' + (bry - 9) + ' ' + (brx + bw/2) + ' ' + (bry - 2) + '" ' +
          'stroke="' + bc + '" stroke-width="2.4" fill="none" stroke-linecap="round" transform="rotate(2 ' + brx + ' ' + bry + ')"/>',
      eyes:
        /* wide open eyes, larger pupils */
        '<path d="M' + (elx - 12) + ' ' + ely + ' Q' + elx + ' ' + (ely - 10) + ' ' + (elx + 12) + ' ' + ely + '" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1.2"/>' +
        '<path d="M' + (elx - 12) + ' ' + ely + ' Q' + elx + ' ' + (ely + 7) + ' ' + (elx + 12) + ' ' + ely + '" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="0.6"/>' +
        '<path d="M' + (erx - 12) + ' ' + ery + ' Q' + erx + ' ' + (ery - 10) + ' ' + (erx + 12) + ' ' + ery + '" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1.2"/>' +
        '<path d="M' + (erx - 12) + ' ' + ery + ' Q' + erx + ' ' + (ery + 7) + ' ' + (erx + 12) + ' ' + ery + '" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="0.6"/>',
      mouth:
        /* open O shape */
        '<ellipse cx="' + mcx + '" cy="' + (mcy + 3) + '" rx="8" ry="10" fill="' + ld + '"/>' +
        '<ellipse cx="' + mcx + '" cy="' + (mcy + 3) + '" rx="7" ry="9" fill="#3a1515"/>' +
        '<ellipse cx="' + mcx + '" cy="' + (mcy + 3) + '" rx="8" ry="10" fill="none" stroke="' + lc + '" stroke-width="1.5"/>' +
        /* teeth hint at top */
        '<path d="M' + (mcx - 6) + ' ' + (mcy - 4) + ' Q' + mcx + ' ' + (mcy - 3) + ' ' + (mcx + 6) + ' ' + (mcy - 4) + ' L' + (mcx + 5) + ' ' + (mcy - 1) + ' Q' + mcx + ' ' + mcy + ' ' + (mcx - 5) + ' ' + (mcy - 1) + ' Z" fill="' + tc + '" opacity="0.7"/>'
    };

    /* ── sad ────────────────────────── */
    parts.sad = {
      brows:
        /* inner brows raised */
        '<path d="M' + (blx - bw/2) + ' ' + (bly - 1) + ' Q' + blx + ' ' + (bly - 3) + ' ' + (blx + bw/2) + ' ' + (bly - 4) + '" ' +
          'stroke="' + bc + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
        '<path d="M' + (brx - bw/2) + ' ' + (bry - 4) + ' Q' + brx + ' ' + (bry - 3) + ' ' + (brx + bw/2) + ' ' + (bry - 1) + '" ' +
          'stroke="' + bc + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
      eyes:
        /* droopy, half-closed */
        '<path d="M' + (elx - 11) + ' ' + (ely - 1) + ' Q' + elx + ' ' + (ely - 3) + ' ' + (elx + 11) + ' ' + (ely - 1) + '" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="1.5"/>' +
        '<path d="M' + (elx - 10) + ' ' + (ely + 2) + ' Q' + elx + ' ' + (ely + 5) + ' ' + (elx + 10) + ' ' + (ely + 2) + '" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="0.6"/>' +
        '<path d="M' + (erx - 11) + ' ' + (ery - 1) + ' Q' + erx + ' ' + (ery - 3) + ' ' + (erx + 11) + ' ' + (ery - 1) + '" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="1.5"/>' +
        '<path d="M' + (erx - 10) + ' ' + (ery + 2) + ' Q' + erx + ' ' + (ery + 5) + ' ' + (erx + 10) + ' ' + (ery + 2) + '" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="0.6"/>',
      mouth:
        /* downturned */
        '<path d="M' + (mcx - 12) + ' ' + mcy +
          ' Q' + (mcx - 6) + ' ' + (mcy - 2) + ' ' + mcx + ' ' + (mcy - 1) +
          ' Q' + (mcx + 6) + ' ' + (mcy - 2) + ' ' + (mcx + 12) + ' ' + mcy + '" ' +
          'fill="' + lc + '" stroke="' + ld + '" stroke-width="0.4"/>' +
        '<path d="M' + (mcx - 12) + ' ' + mcy +
          ' Q' + (mcx - 5) + ' ' + (mcy + 3) + ' ' + mcx + ' ' + (mcy + 3) +
          ' Q' + (mcx + 5) + ' ' + (mcy + 3) + ' ' + (mcx + 12) + ' ' + mcy + '" ' +
          'fill="' + lc + '" stroke="' + ld + '" stroke-width="0.4"/>' +
        /* downward curves at corners */
        '<path d="M' + (mcx - 14) + ' ' + (mcy - 1) + ' Q' + (mcx - 12) + ' ' + (mcy + 2) + ' ' + (mcx - 12) + ' ' + mcy + '" fill="none" stroke="' + ld + '" stroke-width="0.8"/>' +
        '<path d="M' + (mcx + 14) + ' ' + (mcy - 1) + ' Q' + (mcx + 12) + ' ' + (mcy + 2) + ' ' + (mcx + 12) + ' ' + mcy + '" fill="none" stroke="' + ld + '" stroke-width="0.8"/>'
    };

    /* ── angry ──────────────────────── */
    parts.angry = {
      brows:
        /* furrowed V-shape */
        '<path d="M' + (blx - bw/2) + ' ' + (bly - 4) + ' Q' + blx + ' ' + (bly - 2) + ' ' + (blx + bw/2) + ' ' + (bly + 2) + '" ' +
          'stroke="' + bc + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
        '<path d="M' + (brx - bw/2) + ' ' + (bry + 2) + ' Q' + brx + ' ' + (bry - 2) + ' ' + (brx + bw/2) + ' ' + (bry - 4) + '" ' +
          'stroke="' + bc + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
      eyes:
        /* narrowed */
        '<path d="M' + (elx - 11) + ' ' + ely + ' Q' + elx + ' ' + (ely - 4) + ' ' + (elx + 11) + ' ' + (ely - 1) + '" fill="none" stroke="rgba(0,0,0,0.22)" stroke-width="1.8"/>' +
        '<path d="M' + (elx - 10) + ' ' + (ely + 2) + ' Q' + elx + ' ' + (ely + 4) + ' ' + (elx + 10) + ' ' + (ely + 1) + '" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="0.6"/>' +
        '<path d="M' + (erx - 11) + ' ' + (ery - 1) + ' Q' + erx + ' ' + (ery - 4) + ' ' + (erx + 11) + ' ' + ery + '" fill="none" stroke="rgba(0,0,0,0.22)" stroke-width="1.8"/>' +
        '<path d="M' + (erx - 10) + ' ' + (ery + 1) + ' Q' + erx + ' ' + (ery + 4) + ' ' + (erx + 10) + ' ' + (ery + 2) + '" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="0.6"/>',
      mouth:
        /* tight pressed lips */
        '<path d="M' + (mcx - 14) + ' ' + mcy +
          ' Q' + (mcx - 7) + ' ' + (mcy - 1) + ' ' + mcx + ' ' + mcy +
          ' Q' + (mcx + 7) + ' ' + (mcy - 1) + ' ' + (mcx + 14) + ' ' + mcy + '" ' +
          'fill="' + lc + '" stroke="' + ld + '" stroke-width="0.6"/>' +
        '<path d="M' + (mcx - 14) + ' ' + mcy +
          ' Q' + (mcx - 5) + ' ' + (mcy + 2) + ' ' + mcx + ' ' + (mcy + 2) +
          ' Q' + (mcx + 5) + ' ' + (mcy + 2) + ' ' + (mcx + 14) + ' ' + mcy + '" ' +
          'fill="' + lc + '" stroke="' + ld + '" stroke-width="0.5"/>' +
        '<path d="M' + (mcx - 13) + ' ' + mcy + ' L' + (mcx + 13) + ' ' + mcy + '" stroke="rgba(0,0,0,0.18)" stroke-width="0.7"/>'
    };

    /* ── worried ───────────────────── */
    parts.worried = {
      brows:
        /* inner brows raised, like sad but less droopy */
        '<path d="M' + (blx - bw/2) + ' ' + bly + ' Q' + blx + ' ' + (bly - 4) + ' ' + (blx + bw/2) + ' ' + (bly - 5) + '" ' +
          'stroke="' + bc + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
        '<path d="M' + (brx - bw/2) + ' ' + (bry - 5) + ' Q' + brx + ' ' + (bry - 4) + ' ' + (brx + bw/2) + ' ' + bry + '" ' +
          'stroke="' + bc + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
      eyes:
        /* slightly widened */
        '<path d="M' + (elx - 12) + ' ' + ely + ' Q' + elx + ' ' + (ely - 7) + ' ' + (elx + 12) + ' ' + ely + '" fill="none" stroke="rgba(0,0,0,0.14)" stroke-width="1.2"/>' +
        '<path d="M' + (elx - 11) + ' ' + (ely + 2) + ' Q' + elx + ' ' + (ely + 6) + ' ' + (elx + 11) + ' ' + (ely + 2) + '" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="0.5"/>' +
        '<path d="M' + (erx - 12) + ' ' + ery + ' Q' + erx + ' ' + (ery - 7) + ' ' + (erx + 12) + ' ' + ery + '" fill="none" stroke="rgba(0,0,0,0.14)" stroke-width="1.2"/>' +
        '<path d="M' + (erx - 11) + ' ' + (ery + 2) + ' Q' + erx + ' ' + (ery + 6) + ' ' + (erx + 11) + ' ' + (ery + 2) + '" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="0.5"/>',
      mouth:
        /* slightly parted, curved down */
        '<path d="M' + (mcx - 10) + ' ' + mcy +
          ' Q' + (mcx - 5) + ' ' + (mcy - 1) + ' ' + mcx + ' ' + mcy +
          ' Q' + (mcx + 5) + ' ' + (mcy - 1) + ' ' + (mcx + 10) + ' ' + mcy + '" ' +
          'fill="' + lc + '" stroke="' + ld + '" stroke-width="0.4"/>' +
        '<path d="M' + (mcx - 10) + ' ' + mcy +
          ' Q' + (mcx - 4) + ' ' + (mcy + 5) + ' ' + mcx + ' ' + (mcy + 5) +
          ' Q' + (mcx + 4) + ' ' + (mcy + 5) + ' ' + (mcx + 10) + ' ' + mcy + '" ' +
          'fill="' + lc + '" stroke="' + ld + '" stroke-width="0.4"/>' +
        /* slight downward curve */
        '<path d="M' + (mcx - 11) + ' ' + (mcy - 1) + ' Q' + (mcx - 10) + ' ' + (mcy + 1) + ' ' + (mcx - 10) + ' ' + mcy + '" fill="none" stroke="' + ld + '" stroke-width="0.6"/>' +
        '<path d="M' + (mcx + 11) + ' ' + (mcy - 1) + ' Q' + (mcx + 10) + ' ' + (mcy + 1) + ' ' + (mcx + 10) + ' ' + mcy + '" fill="none" stroke="' + ld + '" stroke-width="0.6"/>' +
        /* open mouth dark interior */
        '<ellipse cx="' + mcx + '" cy="' + (mcy + 2) + '" rx="5" ry="2.5" fill="rgba(60,20,20,0.3)"/>'
    };

    return parts;
  }

  /* ─── Portrait Builders ─────────────────────────────────────── */
  /* Each returns { base: SVG string (no expression parts), defs: defs string, exprParts: object } */

  var PORTRAITS = {};

  /* ── ARIA ─────────────────────────────────────────────────────── */
  PORTRAITS.aria = function () {
    var id = 'aria';
    var exprParts = buildExpressionParts(id, {
      eyeLX: 82, eyeLY: 108, eyeRX: 118, eyeRY: 108,
      browLX: 82, browLY: 97, browRX: 118, browRY: 97,
      mouthCX: 100, mouthCY: 140,
      browColor: '#3D2518', lipColor: '#C27070', lipDark: '#A05555',
      browWidth: 20
    });

    var defsStr = '<defs>' +
      skinGradients(id, '#EDCFA0', '#D4A574', '#C49060', '#B8875A', '#956840') +
      glowGradient(id, '#FFD700') +
      '<linearGradient id="' + uid('hair', id) + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" stop-color="#4A2A1C"/>' +
        '<stop offset="40%" stop-color="#2C1810"/>' +
        '<stop offset="100%" stop-color="#1A0E08"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + uid('hairhi', id) + '" x1="20%" y1="0%" x2="80%" y2="100%">' +
        '<stop offset="0%" stop-color="#8B4C30" stop-opacity="0.4"/>' +
        '<stop offset="100%" stop-color="#8B4C30" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + uid('outfit', id) + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" stop-color="#C8B0D8"/>' +
        '<stop offset="50%" stop-color="#B49AC8"/>' +
        '<stop offset="100%" stop-color="#9A82B0"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + uid('outfithi', id) + '" x1="30%" y1="0%" x2="70%" y2="100%">' +
        '<stop offset="0%" stop-color="#D8C8E8" stop-opacity="0.5"/>' +
        '<stop offset="100%" stop-color="#D8C8E8" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<radialGradient id="' + uid('iris', id) + '" cx="40%" cy="35%" r="55%">' +
        '<stop offset="0%" stop-color="#7DA87A"/>' +
        '<stop offset="50%" stop-color="#5A8858"/>' +
        '<stop offset="100%" stop-color="#3A6838"/>' +
      '</radialGradient>' +
      '<linearGradient id="' + uid('crystal', id) + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
        '<stop offset="0%" stop-color="#B8E0FF"/>' +
        '<stop offset="30%" stop-color="#88C8FF"/>' +
        '<stop offset="70%" stop-color="#A0D0FF"/>' +
        '<stop offset="100%" stop-color="#70B0E0"/>' +
      '</linearGradient>' +
    '</defs>';

    var base =
      /* ambient glow */
      '<ellipse cx="100" cy="110" rx="95" ry="100" fill="url(#' + uid('glow', id) + ')" class="portrait-glow"/>' +
      /* hair back – long flowing behind shoulders */
      '<path d="M50 80 Q38 110 36 150 Q34 185 48 210 Q52 218 60 215 Q48 190 48 155 Q49 115 58 85 Z" fill="url(#' + uid('hair', id) + ')"/>' +
      '<path d="M150 80 Q162 110 164 150 Q166 185 152 210 Q148 218 140 215 Q152 190 152 155 Q151 115 142 85 Z" fill="url(#' + uid('hair', id) + ')"/>' +
      /* extra flowing strands */
      '<path d="M42 85 Q28 120 30 165 Q32 200 44 220 L54 215 Q42 190 42 160 Q42 120 50 90 Z" fill="#2C1810" opacity="0.7"/>' +
      '<path d="M158 85 Q172 120 170 165 Q168 200 156 220 L146 215 Q158 190 158 160 Q158 120 150 90 Z" fill="#2C1810" opacity="0.7"/>' +
      /* auburn highlights on back hair */
      '<path d="M44 100 Q36 130 38 170" stroke="#8B4C30" stroke-width="2" fill="none" opacity="0.25"/>' +
      '<path d="M156 100 Q164 130 162 170" stroke="#8B4C30" stroke-width="2" fill="none" opacity="0.25"/>' +
      /* neck */
      neckSVG(100, 155, 'url(#' + uid('skin', id) + ')') +
      /* shoulders & outfit – soft lavender top */
      shouldersSVG(100, 188, 'url(#' + uid('outfit', id) + ')', 'rgba(100,70,130,0.15)') +
      /* outfit highlight */
      '<path d="M40 230 Q70 200 100 195 Q130 200 160 230" fill="url(#' + uid('outfithi', id) + ')"/>' +
      /* V-neckline */
      '<path d="M80 185 L100 210 L120 185" fill="url(#' + uid('skin', id) + ')" stroke="none"/>' +
      /* crystal pendant */
      '<line x1="100" y1="205" x2="100" y2="222" stroke="#88C8FF" stroke-width="0.8" opacity="0.7"/>' +
      '<polygon points="100,218 94,228 100,240 106,228" fill="url(#' + uid('crystal', id) + ')" opacity="0.85"/>' +
      '<polygon points="100,218 94,228 100,240 106,228" fill="none" stroke="#fff" stroke-width="0.4" opacity="0.5"/>' +
      '<polygon points="100,221 97,228 100,234 103,228" fill="#fff" opacity="0.25"/>' +
      /* face */
      '<ellipse cx="100" cy="115" rx="44" ry="54" fill="url(#' + uid('skin', id) + ')"/>' +
      /* face highlight */
      '<ellipse cx="93" cy="103" rx="28" ry="30" fill="url(#' + uid('skinhi', id) + ')"/>' +
      /* chin shadow */
      '<ellipse cx="100" cy="165" rx="30" ry="8" fill="url(#' + uid('chinshadow', id) + ')"/>' +
      /* ears */
      '<ellipse cx="55" cy="115" rx="7" ry="11" fill="url(#' + uid('skin', id) + ')"/>' +
      '<ellipse cx="55" cy="115" rx="4" ry="7" fill="rgba(0,0,0,0.05)"/>' +
      '<ellipse cx="145" cy="115" rx="7" ry="11" fill="url(#' + uid('skin', id) + ')"/>' +
      '<ellipse cx="145" cy="115" rx="4" ry="7" fill="rgba(0,0,0,0.05)"/>' +
      /* hair top */
      '<path d="M56 82 Q58 52 80 42 Q100 34 120 42 Q142 52 144 82 Q132 66 100 60 Q68 66 56 82 Z" fill="url(#' + uid('hair', id) + ')"/>' +
      /* hair highlight overlay */
      '<path d="M68 55 Q80 42 100 38 Q120 42 132 55 Q120 48 100 46 Q80 48 68 55 Z" fill="url(#' + uid('hairhi', id) + ')"/>' +
      /* hair side framing */
      '<path d="M56 82 Q53 95 54 115 Q57 100 63 88 Q67 72 56 82 Z" fill="url(#' + uid('hair', id) + ')"/>' +
      '<path d="M144 82 Q147 95 146 115 Q143 100 137 88 Q133 72 144 82 Z" fill="url(#' + uid('hair', id) + ')"/>' +
      /* auburn highlight strands */
      '<path d="M62 58 Q58 72 57 90" stroke="#8B4C30" stroke-width="1.5" fill="none" opacity="0.3"/>' +
      '<path d="M138 58 Q142 72 143 90" stroke="#8B4C30" stroke-width="1.5" fill="none" opacity="0.3"/>' +
      '<path d="M75 46 Q72 55 70 68" stroke="#8B4C30" stroke-width="1" fill="none" opacity="0.2"/>' +
      /* eyes (base – always visible under expressions) */
      eyeSVG(82, 108, 'url(#' + uid('iris', id) + ')', '#3A6838', '#1a2e1a', 1, 'rgba(60,40,20,0.08)') +
      eyeSVG(118, 108, 'url(#' + uid('iris', id) + ')', '#3A6838', '#1a2e1a', 1, 'rgba(60,40,20,0.08)') +
      /* eyelashes */
      '<path d="M70 104 L66 99" stroke="#2C1810" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M73 102 L70 97" stroke="#2C1810" stroke-width="0.8" stroke-linecap="round"/>' +
      '<path d="M94 104 L97 99" stroke="#2C1810" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M106 104 L103 99" stroke="#2C1810" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M127 102 L130 97" stroke="#2C1810" stroke-width="0.8" stroke-linecap="round"/>' +
      '<path d="M130 104 L134 99" stroke="#2C1810" stroke-width="1" stroke-linecap="round"/>' +
      /* nose */
      noseSVG(100, 124) +
      /* cheek blush */
      blushSVG(74, 126, '#E8A090', 0.22) +
      blushSVG(126, 126, '#E8A090', 0.22);

    return { defs: defsStr, base: base, exprParts: exprParts };
  };

  /* ── KAI ──────────────────────────────────────────────────────── */
  PORTRAITS.kai = function () {
    var id = 'kai';
    var exprParts = buildExpressionParts(id, {
      eyeLX: 82, eyeLY: 106, eyeRX: 118, eyeRY: 106,
      browLX: 82, browLY: 94, browRX: 118, browRY: 94,
      mouthCX: 100, mouthCY: 138,
      browColor: '#1A1A2E', lipColor: '#8B6060', lipDark: '#6B4040',
      browWidth: 22
    });

    var defsStr = '<defs>' +
      skinGradients(id, '#A68B6B', '#8D6E4C', '#7A5C3A', '#6B5035', '#4D3520') +
      glowGradient(id, '#4A7A6A') +
      '<linearGradient id="' + uid('outfit', id) + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" stop-color="#3A5A40"/>' +
        '<stop offset="50%" stop-color="#2D4832"/>' +
        '<stop offset="100%" stop-color="#1E3522"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + uid('outfithi', id) + '" x1="30%" y1="0%" x2="70%" y2="100%">' +
        '<stop offset="0%" stop-color="#4A7A50" stop-opacity="0.3"/>' +
        '<stop offset="100%" stop-color="#4A7A50" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<radialGradient id="' + uid('iris', id) + '" cx="40%" cy="35%" r="55%">' +
        '<stop offset="0%" stop-color="#4A3A2A"/>' +
        '<stop offset="50%" stop-color="#3D2B1F"/>' +
        '<stop offset="100%" stop-color="#2A1A10"/>' +
      '</radialGradient>' +
    '</defs>';

    var base =
      '<ellipse cx="100" cy="110" rx="95" ry="100" fill="url(#' + uid('glow', id) + ')" class="portrait-glow"/>' +
      /* neck – wider, masculine */
      neckSVG(100, 152, 'url(#' + uid('skin', id) + ')', 26) +
      /* shoulders – wide */
      shouldersSVG(100, 186, 'url(#' + uid('outfit', id) + ')', 'rgba(20,50,25,0.15)', 'wide') +
      /* outfit highlight */
      '<path d="M35 240 Q70 210 100 205 Q130 210 165 240" fill="url(#' + uid('outfithi', id) + ')"/>' +
      /* henley collar & buttons */
      '<path d="M84 186 Q92 178 100 176 Q108 178 116 186" fill="url(#' + uid('skin', id) + ')"/>' +
      '<line x1="100" y1="185" x2="100" y2="206" stroke="#1E3522" stroke-width="0.8"/>' +
      '<circle cx="100" cy="192" r="1.5" fill="#1E3522" opacity="0.5"/>' +
      '<circle cx="100" cy="200" r="1.5" fill="#1E3522" opacity="0.5"/>' +
      /* face – angular jaw */
      '<path d="M56 92 Q56 62 100 55 Q144 62 144 92 L144 118 Q142 155 100 164 Q58 155 56 118 Z" fill="url(#' + uid('skin', id) + ')"/>' +
      /* face highlight */
      '<ellipse cx="92" cy="100" rx="30" ry="32" fill="url(#' + uid('skinhi', id) + ')"/>' +
      /* jawline shadow */
      '<path d="M60 125 Q58 155 100 164 Q142 155 140 125" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1.2"/>' +
      /* chin shadow */
      '<ellipse cx="100" cy="160" rx="28" ry="6" fill="url(#' + uid('chinshadow', id) + ')"/>' +
      /* ears */
      '<ellipse cx="55" cy="112" rx="7" ry="11" fill="url(#' + uid('skin', id) + ')"/>' +
      '<ellipse cx="145" cy="112" rx="7" ry="11" fill="url(#' + uid('skin', id) + ')"/>' +
      /* hair – short cropped with fade */
      '<path d="M56 90 Q56 50 100 42 Q144 50 144 90 Q132 72 100 66 Q68 72 56 90 Z" fill="#1A1A2E"/>' +
      /* fade effect - lighter sides */
      '<path d="M56 90 Q55 78 60 68" stroke="#2A2A40" stroke-width="3" fill="none" opacity="0.4"/>' +
      '<path d="M144 90 Q145 78 140 68" stroke="#2A2A40" stroke-width="3" fill="none" opacity="0.4"/>' +
      /* hair texture */
      '<circle cx="80" cy="55" r="2.5" fill="#252540" opacity="0.6"/>' +
      '<circle cx="100" cy="50" r="3" fill="#252540" opacity="0.6"/>' +
      '<circle cx="120" cy="55" r="2.5" fill="#252540" opacity="0.6"/>' +
      '<circle cx="90" cy="60" r="2" fill="#1A1A2E" opacity="0.4"/>' +
      '<circle cx="110" cy="60" r="2" fill="#1A1A2E" opacity="0.4"/>' +
      /* eyes */
      eyeSVG(82, 106, 'url(#' + uid('iris', id) + ')', '#2A1A10', '#0D0D0D', 0.95, 'rgba(0,0,0,0.1)') +
      eyeSVG(118, 106, 'url(#' + uid('iris', id) + ')', '#2A1A10', '#0D0D0D', 0.95, 'rgba(0,0,0,0.1)') +
      /* nose – slightly wider bridge */
      '<path d="M100 96 Q95 108 92 118 Q96 123 100 124 Q104 123 108 118 Q105 108 100 96" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="1.2"/>' +
      '<ellipse cx="96" cy="120" rx="2.8" ry="1.8" fill="rgba(0,0,0,0.06)"/>' +
      '<ellipse cx="104" cy="120" rx="2.8" ry="1.8" fill="rgba(0,0,0,0.06)"/>' +
      /* nose side shadow */
      '<ellipse cx="107" cy="112" rx="3" ry="6" fill="rgba(0,0,0,0.04)"/>' +
      /* cheek highlight */
      '<ellipse cx="74" cy="122" rx="8" ry="4" fill="rgba(166,139,107,0.25)"/>' +
      '<ellipse cx="126" cy="122" rx="8" ry="4" fill="rgba(166,139,107,0.25)"/>' +
      /* stubble */
      '<rect x="78" y="145" width="44" height="16" rx="10" fill="rgba(0,0,0,0.04)"/>';

    return { defs: defsStr, base: base, exprParts: exprParts };
  };

  /* ── LUNA ─────────────────────────────────────────────────────── */
  PORTRAITS.luna = function () {
    var id = 'luna';
    var exprParts = buildExpressionParts(id, {
      eyeLX: 82, eyeLY: 107, eyeRX: 118, eyeRY: 107,
      browLX: 82, browLY: 95, browRX: 118, browRY: 95,
      mouthCX: 100, mouthCY: 138,
      browColor: '#7A90B0', lipColor: '#D4868A', lipDark: '#B06668',
      browWidth: 19
    });

    var defsStr = '<defs>' +
      skinGradients(id, '#FDE8DA', '#F5D6C3', '#EECAB5', '#E0BCA8', '#C8A490') +
      glowGradient(id, '#DA70D6') +
      '<linearGradient id="' + uid('hair', id) + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
        '<stop offset="0%" stop-color="#D4D8F0"/>' +
        '<stop offset="30%" stop-color="#A8B8D8"/>' +
        '<stop offset="60%" stop-color="#8AA0C8"/>' +
        '<stop offset="100%" stop-color="#6A80A8"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + uid('hairhi', id) + '" x1="0%" y1="0%" x2="50%" y2="50%">' +
        '<stop offset="0%" stop-color="#E8ECF8" stop-opacity="0.5"/>' +
        '<stop offset="100%" stop-color="#E8ECF8" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + uid('outfit', id) + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" stop-color="#E8E0D0"/>' +
        '<stop offset="100%" stop-color="#D0C8B8"/>' +
      '</linearGradient>' +
      '<radialGradient id="' + uid('iris', id) + '" cx="40%" cy="35%" r="55%">' +
        '<stop offset="0%" stop-color="#60D0C0"/>' +
        '<stop offset="40%" stop-color="#40B0B0"/>' +
        '<stop offset="100%" stop-color="#2080A0"/>' +
      '</radialGradient>' +
    '</defs>';

    var base =
      '<ellipse cx="100" cy="110" rx="95" ry="100" fill="url(#' + uid('glow', id) + ')" class="portrait-glow"/>' +
      /* hair back – shoulder length wavy */
      '<path d="M42 75 Q28 110 30 155 Q32 190 48 210 L58 205 Q42 180 42 150 Q42 110 52 80 Z" fill="url(#' + uid('hair', id) + ')"/>' +
      '<path d="M158 75 Q172 110 170 155 Q168 190 152 210 L142 205 Q158 180 158 150 Q158 110 148 80 Z" fill="url(#' + uid('hair', id) + ')"/>' +
      /* wavy strands behind */
      '<path d="M35 85 Q22 120 26 170 Q28 200 40 218 L50 212 Q38 188 36 158 Q34 118 44 88 Z" fill="#8AA0C8" opacity="0.6"/>' +
      '<path d="M165 85 Q178 120 174 170 Q172 200 160 218 L150 212 Q162 188 164 158 Q166 118 156 88 Z" fill="#8AA0C8" opacity="0.6"/>' +
      /* wave curl details */
      '<path d="M36 130 Q30 140 34 155" stroke="#D4D8F0" stroke-width="1.5" fill="none" opacity="0.4"/>' +
      '<path d="M164 130 Q170 140 166 155" stroke="#D4D8F0" stroke-width="1.5" fill="none" opacity="0.4"/>' +
      /* neck */
      neckSVG(100, 155, 'url(#' + uid('skin', id) + ')') +
      /* shoulders – paint-splattered top */
      shouldersSVG(100, 188, 'url(#' + uid('outfit', id) + ')', 'rgba(100,80,60,0.1)') +
      '<path d="M82 186 Q92 178 100 176 Q108 178 118 186" fill="url(#' + uid('skin', id) + ')"/>' +
      /* paint splatters */
      '<circle cx="68" cy="215" r="3" fill="#FF6B6B" opacity="0.5"/>' +
      '<circle cx="75" cy="225" r="2" fill="#4FC3F7" opacity="0.45"/>' +
      '<circle cx="130" cy="218" r="2.5" fill="#FFD54F" opacity="0.5"/>' +
      '<circle cx="120" cy="228" r="1.8" fill="#81C784" opacity="0.45"/>' +
      '<circle cx="90" cy="230" r="1.5" fill="#CE93D8" opacity="0.4"/>' +
      '<circle cx="110" cy="222" r="2" fill="#FF8A65" opacity="0.45"/>' +
      /* face */
      '<ellipse cx="100" cy="115" rx="44" ry="52" fill="url(#' + uid('skin', id) + ')"/>' +
      /* face highlight */
      '<ellipse cx="93" cy="103" rx="28" ry="30" fill="url(#' + uid('skinhi', id) + ')"/>' +
      /* chin shadow */
      '<ellipse cx="100" cy="163" rx="28" ry="7" fill="url(#' + uid('chinshadow', id) + ')"/>' +
      /* ears */
      '<ellipse cx="55" cy="115" rx="6" ry="10" fill="url(#' + uid('skin', id) + ')"/>' +
      '<ellipse cx="145" cy="115" rx="6" ry="10" fill="url(#' + uid('skin', id) + ')"/>' +
      /* hair top – wavy, voluminous */
      '<path d="M52 78 Q52 38 75 26 Q100 16 125 26 Q148 38 148 78 Q136 58 100 52 Q64 58 52 78 Z" fill="url(#' + uid('hair', id) + ')"/>' +
      /* hair highlight */
      '<path d="M66 42 Q80 28 100 24 Q120 28 134 42 Q120 32 100 30 Q80 32 66 42 Z" fill="url(#' + uid('hairhi', id) + ')"/>' +
      /* hair side framing – wavy */
      '<path d="M52 78 Q48 95 50 118 Q54 102 60 90 Q64 76 52 78 Z" fill="url(#' + uid('hair', id) + ')"/>' +
      '<path d="M148 78 Q152 95 150 118 Q146 102 140 90 Q136 76 148 78 Z" fill="url(#' + uid('hair', id) + ')"/>' +
      /* wave strand details */
      '<path d="M58 60 Q54 72 52 88" stroke="#D4D8F0" stroke-width="1.5" fill="none" opacity="0.35"/>' +
      '<path d="M142 60 Q146 72 148 88" stroke="#D4D8F0" stroke-width="1.5" fill="none" opacity="0.35"/>' +
      /* eyes – large, bright */
      eyeSVG(82, 107, 'url(#' + uid('iris', id) + ')', '#2080A0', '#1A3040', 1.12, 'rgba(100,80,120,0.06)') +
      eyeSVG(118, 107, 'url(#' + uid('iris', id) + ')', '#2080A0', '#1A3040', 1.12, 'rgba(100,80,120,0.06)') +
      /* lashes */
      '<path d="M69 103 L65 97" stroke="#7A90B0" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M72 101 L69 96" stroke="#7A90B0" stroke-width="0.8" stroke-linecap="round"/>' +
      '<path d="M95 103 L99 97" stroke="#7A90B0" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M105 103 L101 97" stroke="#7A90B0" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M128 101 L131 96" stroke="#7A90B0" stroke-width="0.8" stroke-linecap="round"/>' +
      '<path d="M131 103 L135 97" stroke="#7A90B0" stroke-width="1" stroke-linecap="round"/>' +
      /* nose */
      noseSVG(100, 122) +
      /* freckles */
      '<circle cx="78" cy="120" r="0.9" fill="#D0A090" opacity="0.35"/>' +
      '<circle cx="82" cy="122" r="0.7" fill="#D0A090" opacity="0.3"/>' +
      '<circle cx="75" cy="123" r="0.8" fill="#D0A090" opacity="0.3"/>' +
      '<circle cx="85" cy="118" r="0.6" fill="#D0A090" opacity="0.25"/>' +
      '<circle cx="73" cy="118" r="0.7" fill="#D0A090" opacity="0.28"/>' +
      '<circle cx="122" cy="120" r="0.9" fill="#D0A090" opacity="0.35"/>' +
      '<circle cx="118" cy="122" r="0.7" fill="#D0A090" opacity="0.3"/>' +
      '<circle cx="125" cy="123" r="0.8" fill="#D0A090" opacity="0.3"/>' +
      '<circle cx="115" cy="118" r="0.6" fill="#D0A090" opacity="0.25"/>' +
      '<circle cx="127" cy="118" r="0.7" fill="#D0A090" opacity="0.28"/>' +
      /* cheek blush */
      blushSVG(73, 124, '#F0A0A0', 0.2) +
      blushSVG(127, 124, '#F0A0A0', 0.2);

    return { defs: defsStr, base: base, exprParts: exprParts };
  };

  /* ── SAGE ─────────────────────────────────────────────────────── */
  PORTRAITS.sage = function () {
    var id = 'sage';
    var exprParts = buildExpressionParts(id, {
      eyeLX: 82, eyeLY: 107, eyeRX: 118, eyeRY: 107,
      browLX: 82, browLY: 93, browRX: 118, browRY: 93,
      mouthCX: 100, mouthCY: 140,
      browColor: '#888890', lipColor: '#A07070', lipDark: '#805050',
      browWidth: 20
    });

    var defsStr = '<defs>' +
      skinGradients(id, '#D8B48A', '#C49A6C', '#B08858', '#A8804E', '#886838') +
      glowGradient(id, '#B0B8C0') +
      '<linearGradient id="' + uid('hair', id) + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
        '<stop offset="0%" stop-color="#C8C8D0"/>' +
        '<stop offset="40%" stop-color="#A0A0A8"/>' +
        '<stop offset="100%" stop-color="#808088"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + uid('outfit', id) + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" stop-color="#4A4A50"/>' +
        '<stop offset="50%" stop-color="#3A3A40"/>' +
        '<stop offset="100%" stop-color="#2A2A30"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + uid('outfithi', id) + '" x1="35%" y1="0%" x2="65%" y2="100%">' +
        '<stop offset="0%" stop-color="#5A5A62" stop-opacity="0.4"/>' +
        '<stop offset="100%" stop-color="#5A5A62" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<radialGradient id="' + uid('iris', id) + '" cx="40%" cy="35%" r="55%">' +
        '<stop offset="0%" stop-color="#A8A060"/>' +
        '<stop offset="40%" stop-color="#888060"/>' +
        '<stop offset="100%" stop-color="#605840"/>' +
      '</radialGradient>' +
    '</defs>';

    var base =
      '<ellipse cx="100" cy="110" rx="95" ry="100" fill="url(#' + uid('glow', id) + ')" class="portrait-glow"/>' +
      /* neck */
      neckSVG(100, 153, 'url(#' + uid('skin', id) + ')', 24) +
      /* shoulders – charcoal turtleneck */
      shouldersSVG(100, 186, 'url(#' + uid('outfit', id) + ')', 'rgba(0,0,0,0.12)', 'wide') +
      /* outfit highlight */
      '<path d="M40 240 Q70 210 100 205 Q130 210 160 240" fill="url(#' + uid('outfithi', id) + ')"/>' +
      /* turtleneck collar */
      '<path d="M78 182 Q78 174 100 170 Q122 174 122 182 L122 192 Q110 188 100 186 Q90 188 78 192 Z" fill="url(#' + uid('outfit', id) + ')"/>' +
      '<path d="M78 182 Q78 174 100 170 Q122 174 122 182" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.8"/>' +
      /* knit lines */
      '<path d="M82 178 Q100 174 118 178" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>' +
      '<path d="M80 184 Q100 180 120 184" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>' +
      /* face – slightly longer */
      '<path d="M56 92 Q56 58 100 50 Q144 58 144 92 L144 122 Q142 158 100 168 Q58 158 56 122 Z" fill="url(#' + uid('skin', id) + ')"/>' +
      /* face highlight */
      '<ellipse cx="92" cy="100" rx="28" ry="32" fill="url(#' + uid('skinhi', id) + ')"/>' +
      /* chin shadow */
      '<ellipse cx="100" cy="164" rx="28" ry="6" fill="url(#' + uid('chinshadow', id) + ')"/>' +
      /* ears */
      '<ellipse cx="55" cy="112" rx="7" ry="11" fill="url(#' + uid('skin', id) + ')"/>' +
      '<ellipse cx="145" cy="112" rx="7" ry="11" fill="url(#' + uid('skin', id) + ')"/>' +
      /* hair – silver-gray, neatly styled */
      '<path d="M56 88 Q56 46 80 36 Q100 28 120 36 Q144 46 144 88 Q132 68 100 62 Q68 68 56 88 Z" fill="url(#' + uid('hair', id) + ')"/>' +
      /* part line */
      '<path d="M88 34 Q92 50 96 66" stroke="#808088" stroke-width="1" fill="none" opacity="0.4"/>' +
      /* sideburns */
      '<path d="M56 88 Q54 98 55 110" stroke="#A0A0A8" stroke-width="4" fill="none" opacity="0.5" stroke-linecap="round"/>' +
      '<path d="M144 88 Q146 98 145 110" stroke="#A0A0A8" stroke-width="4" fill="none" opacity="0.5" stroke-linecap="round"/>' +
      /* reading glasses */
      '<ellipse cx="82" cy="106" rx="15" ry="13" fill="none" stroke="#707078" stroke-width="1.6"/>' +
      '<ellipse cx="118" cy="106" rx="15" ry="13" fill="none" stroke="#707078" stroke-width="1.6"/>' +
      '<path d="M97 105 Q100 102 103 105" fill="none" stroke="#707078" stroke-width="1.4"/>' +
      '<path d="M67 103 L55 100" stroke="#707078" stroke-width="1.3"/>' +
      '<path d="M133 103 L145 100" stroke="#707078" stroke-width="1.3"/>' +
      /* glasses shine */
      '<path d="M72 98 Q78 95 86 98" fill="none" stroke="#fff" stroke-width="0.7" opacity="0.25"/>' +
      '<path d="M108 98 Q114 95 122 98" fill="none" stroke="#fff" stroke-width="0.7" opacity="0.25"/>' +
      /* eyes behind glasses */
      eyeSVG(82, 107, 'url(#' + uid('iris', id) + ')', '#605840', '#333', 0.9, 'rgba(0,0,0,0.08)') +
      eyeSVG(118, 107, 'url(#' + uid('iris', id) + ')', '#605840', '#333', 0.9, 'rgba(0,0,0,0.08)') +
      /* nose */
      noseSVG(100, 124) +
      /* smile lines */
      '<path d="M68 126 Q66 134 70 142" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="0.8"/>' +
      '<path d="M132 126 Q134 134 130 142" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="0.8"/>' +
      /* cheek highlight */
      blushSVG(74, 124, 'rgba(196,154,108,0.3)', 0.25) +
      blushSVG(126, 124, 'rgba(196,154,108,0.3)', 0.25);

    return { defs: defsStr, base: base, exprParts: exprParts };
  };

  /* ── NOVA ─────────────────────────────────────────────────────── */
  PORTRAITS.nova = function () {
    var id = 'nova';
    var exprParts = buildExpressionParts(id, {
      eyeLX: 82, eyeLY: 107, eyeRX: 118, eyeRY: 107,
      browLX: 82, browLY: 95, browRX: 118, browRY: 95,
      mouthCX: 100, mouthCY: 138,
      browColor: '#2A1808', lipColor: '#9B5555', lipDark: '#7A3535',
      browWidth: 22
    });

    var defsStr = '<defs>' +
      skinGradients(id, '#8B6040', '#6B4423', '#5A3618', '#4D2F15', '#3A200C') +
      glowGradient(id, '#FF6347') +
      '<radialGradient id="' + uid('hair', id) + '" cx="50%" cy="40%" r="60%">' +
        '<stop offset="0%" stop-color="#2A1808"/>' +
        '<stop offset="50%" stop-color="#1A0E04"/>' +
        '<stop offset="100%" stop-color="#0E0802"/>' +
      '</radialGradient>' +
      '<linearGradient id="' + uid('outfit', id) + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" stop-color="#FF7F50"/>' +
        '<stop offset="50%" stop-color="#E86840"/>' +
        '<stop offset="100%" stop-color="#CC5030"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + uid('outfithi', id) + '" x1="30%" y1="0%" x2="70%" y2="100%">' +
        '<stop offset="0%" stop-color="#FFA070" stop-opacity="0.4"/>' +
        '<stop offset="100%" stop-color="#FFA070" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<radialGradient id="' + uid('iris', id) + '" cx="40%" cy="35%" r="55%">' +
        '<stop offset="0%" stop-color="#E8C050"/>' +
        '<stop offset="50%" stop-color="#D4A020"/>' +
        '<stop offset="100%" stop-color="#A07010"/>' +
      '</radialGradient>' +
    '</defs>';

    /* Build curly/coily afro hair */
    var curlPositions = [
      [48, 65, 10], [42, 80, 10], [40, 98, 10], [44, 115, 9],
      [152, 65, 10], [158, 80, 10], [160, 98, 10], [156, 115, 9],
      [55, 42, 9], [70, 32, 10], [85, 26, 10], [100, 24, 11],
      [115, 26, 10], [130, 32, 10], [145, 42, 9],
      [50, 52, 9], [150, 52, 9],
      [60, 30, 7], [140, 30, 7]
    ];
    var curlsStr = '';
    for (var ci = 0; ci < curlPositions.length; ci++) {
      var cp = curlPositions[ci];
      curlsStr += '<circle cx="' + cp[0] + '" cy="' + cp[1] + '" r="' + cp[2] + '" fill="url(#' + uid('hair', id) + ')"/>';
      /* add a subtle highlight arc on each curl */
      curlsStr += '<circle cx="' + (cp[0] - 2) + '" cy="' + (cp[1] - 2) + '" r="' + (cp[2] * 0.5) + '" fill="rgba(60,40,20,0.15)"/>';
    }

    var base =
      '<ellipse cx="100" cy="110" rx="95" ry="100" fill="url(#' + uid('glow', id) + ')" class="portrait-glow"/>' +
      /* hair base - voluminous afro shape */
      '<ellipse cx="100" cy="85" rx="65" ry="58" fill="url(#' + uid('hair', id) + ')"/>' +
      /* individual curls for texture */
      curlsStr +
      /* neck */
      neckSVG(100, 154, 'url(#' + uid('skin', id) + ')', 22) +
      /* shoulders – bright orange/coral top */
      shouldersSVG(100, 188, 'url(#' + uid('outfit', id) + ')', 'rgba(150,50,20,0.12)') +
      /* outfit highlight */
      '<path d="M40 240 Q70 210 100 205 Q130 210 160 240" fill="url(#' + uid('outfithi', id) + ')"/>' +
      /* scoop neck */
      '<path d="M78 186 Q90 178 100 176 Q110 178 122 186" fill="url(#' + uid('skin', id) + ')"/>' +
      /* face */
      '<ellipse cx="100" cy="115" rx="42" ry="52" fill="url(#' + uid('skin', id) + ')"/>' +
      /* face highlight */
      '<ellipse cx="93" cy="103" rx="26" ry="28" fill="url(#' + uid('skinhi', id) + ')"/>' +
      /* chin shadow */
      '<ellipse cx="100" cy="163" rx="28" ry="6" fill="url(#' + uid('chinshadow', id) + ')"/>' +
      /* ears */
      '<ellipse cx="57" cy="115" rx="6" ry="10" fill="url(#' + uid('skin', id) + ')"/>' +
      '<ellipse cx="143" cy="115" rx="6" ry="10" fill="url(#' + uid('skin', id) + ')"/>' +
      /* gold hoop earrings */
      '<circle cx="55" cy="122" r="6" fill="none" stroke="#FFD700" stroke-width="1.8"/>' +
      '<circle cx="55" cy="122" r="6" fill="none" stroke="#FFF0A0" stroke-width="0.5" opacity="0.5"/>' +
      '<circle cx="145" cy="122" r="6" fill="none" stroke="#FFD700" stroke-width="1.8"/>' +
      '<circle cx="145" cy="122" r="6" fill="none" stroke="#FFF0A0" stroke-width="0.5" opacity="0.5"/>' +
      /* hair front curls over forehead */
      '<circle cx="68" cy="72" r="8" fill="url(#' + uid('hair', id) + ')"/>' +
      '<circle cx="80" cy="64" r="9" fill="url(#' + uid('hair', id) + ')"/>' +
      '<circle cx="95" cy="60" r="8.5" fill="url(#' + uid('hair', id) + ')"/>' +
      '<circle cx="110" cy="62" r="8" fill="url(#' + uid('hair', id) + ')"/>' +
      '<circle cx="124" cy="66" r="8.5" fill="url(#' + uid('hair', id) + ')"/>' +
      '<circle cx="136" cy="74" r="7" fill="url(#' + uid('hair', id) + ')"/>' +
      /* eyes – bright, confident */
      eyeSVG(82, 107, 'url(#' + uid('iris', id) + ')', '#A07010', '#1a1500', 1.05, 'rgba(0,0,0,0.1)') +
      eyeSVG(118, 107, 'url(#' + uid('iris', id) + ')', '#A07010', '#1a1500', 1.05, 'rgba(0,0,0,0.1)') +
      /* eyelashes */
      '<path d="M70 103 L66 98" stroke="#2A1808" stroke-width="1.1" stroke-linecap="round"/>' +
      '<path d="M94 103 L97 98" stroke="#2A1808" stroke-width="1.1" stroke-linecap="round"/>' +
      '<path d="M106 103 L103 98" stroke="#2A1808" stroke-width="1.1" stroke-linecap="round"/>' +
      '<path d="M130 103 L134 98" stroke="#2A1808" stroke-width="1.1" stroke-linecap="round"/>' +
      /* nose */
      '<path d="M100 98 Q95 110 92 120 Q96 125 100 126 Q104 125 108 120 Q105 110 100 98" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="1.2"/>' +
      '<ellipse cx="96" cy="122" rx="2.8" ry="1.8" fill="rgba(0,0,0,0.05)"/>' +
      '<ellipse cx="104" cy="122" rx="2.8" ry="1.8" fill="rgba(0,0,0,0.05)"/>' +
      '<ellipse cx="107" cy="114" rx="3" ry="6" fill="rgba(0,0,0,0.03)"/>' +
      /* cheek highlights */
      blushSVG(74, 124, 'rgba(139,96,64,0.3)', 0.3) +
      blushSVG(126, 124, 'rgba(139,96,64,0.3)', 0.3);

    return { defs: defsStr, base: base, exprParts: exprParts };
  };

  /* ── EMBER ────────────────────────────────────────────────────── */
  PORTRAITS.ember = function () {
    var id = 'ember';
    var exprParts = buildExpressionParts(id, {
      eyeLX: 82, eyeLY: 108, eyeRX: 118, eyeRY: 108,
      browLX: 82, browLY: 97, browRX: 118, browRY: 97,
      mouthCX: 100, mouthCY: 140,
      browColor: '#5A2020', lipColor: '#C08080', lipDark: '#A06060',
      browWidth: 18
    });

    var defsStr = '<defs>' +
      skinGradients(id, '#F8E0CC', '#E8C4A0', '#DEBA94', '#D0A880', '#B89070') +
      glowGradient(id, '#FF8C55') +
      '<linearGradient id="' + uid('hair', id) + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" stop-color="#9A3A2A"/>' +
        '<stop offset="40%" stop-color="#7A2818"/>' +
        '<stop offset="100%" stop-color="#5A1A10"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + uid('hairhi', id) + '" x1="20%" y1="0%" x2="80%" y2="50%">' +
        '<stop offset="0%" stop-color="#C05030" stop-opacity="0.35"/>' +
        '<stop offset="100%" stop-color="#C05030" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + uid('outfit', id) + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" stop-color="#F5EDE5"/>' +
        '<stop offset="50%" stop-color="#E8E0D5"/>' +
        '<stop offset="100%" stop-color="#D8D0C5"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + uid('outfithi', id) + '" x1="30%" y1="0%" x2="70%" y2="100%">' +
        '<stop offset="0%" stop-color="#FFF8F0" stop-opacity="0.4"/>' +
        '<stop offset="100%" stop-color="#FFF8F0" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<radialGradient id="' + uid('iris', id) + '" cx="40%" cy="35%" r="55%">' +
        '<stop offset="0%" stop-color="#80C880"/>' +
        '<stop offset="40%" stop-color="#508050"/>' +
        '<stop offset="100%" stop-color="#306030"/>' +
      '</radialGradient>' +
    '</defs>';

    var base =
      '<ellipse cx="100" cy="110" rx="95" ry="100" fill="url(#' + uid('glow', id) + ')" class="portrait-glow"/>' +
      /* hair back wisps */
      '<path d="M52 78 Q46 95 48 118 Q52 102 58 88 Z" fill="url(#' + uid('hair', id) + ')"/>' +
      '<path d="M148 78 Q154 95 152 118 Q148 102 142 88 Z" fill="url(#' + uid('hair', id) + ')"/>' +
      '<path d="M56 85 Q48 100 50 125 L56 118 Q54 98 60 88 Z" fill="#7A2818" opacity="0.5"/>' +
      '<path d="M144 85 Q152 100 150 125 L144 118 Q146 98 140 88 Z" fill="#7A2818" opacity="0.5"/>' +
      /* neck */
      neckSVG(100, 155, 'url(#' + uid('skin', id) + ')') +
      /* shoulders – cream cozy sweater */
      shouldersSVG(100, 188, 'url(#' + uid('outfit', id) + ')', 'rgba(180,160,140,0.12)') +
      /* sweater highlight */
      '<path d="M40 240 Q70 210 100 205 Q130 210 160 240" fill="url(#' + uid('outfithi', id) + ')"/>' +
      /* loose cozy collar */
      '<path d="M72 186 Q78 176 100 172 Q122 176 128 186" fill="url(#' + uid('outfit', id) + ')"/>' +
      '<path d="M72 186 Q78 176 100 172 Q122 176 128 186" fill="none" stroke="rgba(180,170,155,0.4)" stroke-width="0.8"/>' +
      '<ellipse cx="100" cy="180" rx="22" ry="12" fill="url(#' + uid('skin', id) + ')"/>' +
      /* knit texture hints */
      '<path d="M70 200 Q71 197 72 200" stroke="rgba(180,170,155,0.3)" stroke-width="0.5" fill="none"/>' +
      '<path d="M80 208 Q81 205 82 208" stroke="rgba(180,170,155,0.3)" stroke-width="0.5" fill="none"/>' +
      '<path d="M118 208 Q119 205 120 208" stroke="rgba(180,170,155,0.3)" stroke-width="0.5" fill="none"/>' +
      '<path d="M128 200 Q129 197 130 200" stroke="rgba(180,170,155,0.3)" stroke-width="0.5" fill="none"/>' +
      /* face – soft, round */
      '<ellipse cx="100" cy="115" rx="44" ry="52" fill="url(#' + uid('skin', id) + ')"/>' +
      /* face highlight */
      '<ellipse cx="93" cy="103" rx="28" ry="30" fill="url(#' + uid('skinhi', id) + ')"/>' +
      /* chin shadow */
      '<ellipse cx="100" cy="163" rx="28" ry="7" fill="url(#' + uid('chinshadow', id) + ')"/>' +
      /* ears */
      '<ellipse cx="55" cy="115" rx="6.5" ry="10" fill="url(#' + uid('skin', id) + ')"/>' +
      '<ellipse cx="145" cy="115" rx="6.5" ry="10" fill="url(#' + uid('skin', id) + ')"/>' +
      /* hair base on head */
      '<path d="M56 82 Q58 48 80 38 Q100 30 120 38 Q142 48 144 82 Q132 64 100 58 Q68 64 56 82 Z" fill="url(#' + uid('hair', id) + ')"/>' +
      /* hair highlight */
      '<path d="M68 52 Q82 38 100 34 Q118 38 132 52 Q118 44 100 42 Q82 44 68 52 Z" fill="url(#' + uid('hairhi', id) + ')"/>' +
      /* messy bun on top */
      '<ellipse cx="107" cy="38" rx="20" ry="18" fill="url(#' + uid('hair', id) + ')"/>' +
      /* bun texture/detail */
      '<path d="M92 28 Q98 18 108 16 Q118 18 122 28" fill="none" stroke="#9A3A2A" stroke-width="1.5" opacity="0.35"/>' +
      '<path d="M96 22 Q107 16 118 22" fill="none" stroke="#9A3A2A" stroke-width="1" opacity="0.25"/>' +
      '<ellipse cx="107" cy="30" rx="12" ry="8" fill="none" stroke="#C05030" stroke-width="0.8" opacity="0.15"/>' +
      /* bun pin */
      '<line x1="90" y1="26" x2="122" y2="44" stroke="#C8B098" stroke-width="1.5" stroke-linecap="round"/>' +
      '<circle cx="90" cy="26" r="2.2" fill="#D4A840" opacity="0.8"/>' +
      /* wispy loose strands – messy intentional */
      '<path d="M63 72 Q56 85 54 102" stroke="#7A2818" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.65"/>' +
      '<path d="M66 66 Q58 78 56 95" stroke="#7A2818" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.45"/>' +
      '<path d="M137 72 Q144 85 146 102" stroke="#7A2818" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.65"/>' +
      '<path d="M134 66 Q142 78 144 95" stroke="#7A2818" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.45"/>' +
      /* flower behind ear */
      '<circle cx="148" cy="96" r="5.5" fill="#F0A0A0" opacity="0.85"/>' +
      '<circle cx="144" cy="92" r="4.5" fill="#F0B0B0" opacity="0.8"/>' +
      '<circle cx="152" cy="92" r="4.5" fill="#E8A0A0" opacity="0.75"/>' +
      '<circle cx="148" cy="88" r="4" fill="#F0C0C0" opacity="0.7"/>' +
      '<circle cx="148" cy="94" r="2.5" fill="#FFE0A0" opacity="0.8"/>' +
      /* tiny leaf */
      '<ellipse cx="155" cy="98" rx="4" ry="1.8" fill="#6A9A60" opacity="0.5" transform="rotate(30 155 98)"/>' +
      /* eyes – soft green, gentle/dreamy */
      eyeSVG(82, 108, 'url(#' + uid('iris', id) + ')', '#306030', '#1A3018', 1, 'rgba(60,30,20,0.07)') +
      eyeSVG(118, 108, 'url(#' + uid('iris', id) + ')', '#306030', '#1A3018', 1, 'rgba(60,30,20,0.07)') +
      /* soft upper lid lines */
      '<path d="M70 103 Q82 98 94 103" fill="none" stroke="#5A2020" stroke-width="1" opacity="0.35"/>' +
      '<path d="M106 103 Q118 98 130 103" fill="none" stroke="#5A2020" stroke-width="1" opacity="0.35"/>' +
      /* nose */
      noseSVG(100, 124) +
      /* cheek blush */
      blushSVG(74, 126, '#E8A090', 0.22) +
      blushSVG(126, 126, '#E8A090', 0.22);

    return { defs: defsStr, base: base, exprParts: exprParts };
  };

  /* ─── SVG assembly ───────────────────────────────────────────── */

  function buildFullSVG(companionId, expression) {
    var key = (companionId || '').toLowerCase();
    var fn = PORTRAITS[key];
    if (!fn) return '';

    var data = fn();
    var expr = expression || currentExpressions[key] || 'calm';
    var parts = data.exprParts[expr] || data.exprParts.calm;

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" class="avatar-portrait" data-companion="' + key + '" data-expression="' + expr + '">' +
      data.defs +
      data.base +
      /* expression layers – wrapped in groups with class names */
      '<g class="expr-brows">' + parts.brows + '</g>' +
      '<g class="expr-eyes">' + parts.eyes + '</g>' +
      '<g class="expr-mouth">' + parts.mouth + '</g>' +
    '</svg>';
  }

  function getImageHTML(companionId, expression) {
    var key = (companionId || '').toLowerCase();
    var override = imageOverrides[key];
    if (!override) return null;

    var url;
    if (typeof override === 'string') {
      url = override;
    } else {
      var expr = expression || currentExpressions[key] || 'calm';
      url = override[expr] || override.calm || override[Object.keys(override)[0]];
    }
    if (!url) return null;

    return '<img src="' + url + '" alt="' + key + ' avatar" class="avatar-portrait-img" data-companion="' + key + '"/>';
  }

  function getPortraitHTML(companionId, expression) {
    var imgHTML = getImageHTML(companionId, expression);
    if (imgHTML) return '<div class="portrait-svg-wrapper">' + imgHTML + '</div>';
    var svg = buildFullSVG(companionId, expression);
    if (!svg) return '';
    return '<div class="portrait-svg-wrapper">' + svg + '</div>';
  }

  function saveImageOverrides() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(imageOverrides));
    } catch (e) { /* ignore */ }
  }

  /* ─── Expression update (DOM patching) ──────────────────────── */

  function updateExpressionInDOM(companionId, expression) {
    var key = (companionId || '').toLowerCase();
    var fn = PORTRAITS[key];
    if (!fn) return;

    var data = fn();
    var parts = data.exprParts[expression] || data.exprParts.calm;

    /* Find all rendered SVGs for this companion */
    var svgs = document.querySelectorAll('.avatar-portrait[data-companion="' + key + '"]');
    for (var i = 0; i < svgs.length; i++) {
      var svg = svgs[i];
      svg.setAttribute('data-expression', expression);

      var browsEl = svg.querySelector('.expr-brows');
      var eyesEl = svg.querySelector('.expr-eyes');
      var mouthEl = svg.querySelector('.expr-mouth');

      if (browsEl) browsEl.innerHTML = parts.brows;
      if (eyesEl) eyesEl.innerHTML = parts.eyes;
      if (mouthEl) mouthEl.innerHTML = parts.mouth;
    }

    /* Also handle image overrides – swap src if per-expression URLs */
    var imgs = document.querySelectorAll('.avatar-portrait-img[data-companion="' + key + '"]');
    for (var j = 0; j < imgs.length; j++) {
      var override = imageOverrides[key];
      if (override && typeof override === 'object') {
        var url = override[expression] || override.calm || override[Object.keys(override)[0]];
        if (url) imgs[j].src = url;
      }
    }
  }

  /* ─── Public API ─────────────────────────────────────────────── */

  window.AvatarPortraits = {
    /**
     * Return an HTML string for the given companion's portrait.
     * Returns SVG markup or <img> if image override is set.
     * @param {string} companionId  e.g. 'aria', 'kai', 'luna', 'sage', 'nova', 'ember'
     * @returns {string} HTML markup or empty string for unknown id
     */
    getPortraitSVG: function (companionId) {
      injectStyles();
      return getPortraitHTML(companionId);
    },

    /**
     * Render a portrait into a container element.
     * @param {HTMLElement} container
     * @param {string} companionId
     * @returns {boolean}
     */
    render: function (container, companionId) {
      injectStyles();
      var html = getPortraitHTML(companionId);
      if (html && container) {
        container.innerHTML = html;
        return true;
      }
      return false;
    },

    /**
     * Update the facial expression on all rendered instances of a companion.
     * Changes only the expression SVG groups (.expr-eyes, .expr-brows, .expr-mouth)
     * without re-rendering the entire portrait.
     * @param {string} companionId
     * @param {string} expression  one of: calm, happy, surprised, sad, angry, worried
     */
    setExpression: function (companionId, expression) {
      var key = (companionId || '').toLowerCase();
      var expr = (expression || '').toLowerCase();
      if (EXPRESSION_NAMES.indexOf(expr) === -1) expr = 'calm';
      currentExpressions[key] = expr;
      updateExpressionInDOM(key, expr);
    },

    /**
     * Override a companion's portrait with image URL(s).
     * @param {string} companionId
     * @param {string|Object} urls  Single URL string, or object mapping expression names to URLs
     */
    setImage: function (companionId, urls) {
      var key = (companionId || '').toLowerCase();
      if (!urls) return;
      imageOverrides[key] = urls;
      saveImageOverrides();
    },

    /**
     * Remove image override for a companion, reverting to SVG portrait.
     * @param {string} companionId
     */
    clearImage: function (companionId) {
      var key = (companionId || '').toLowerCase();
      delete imageOverrides[key];
      saveImageOverrides();
    },

    /**
     * List available companion IDs.
     * @returns {string[]}
     */
    ids: function () {
      return COMPANION_IDS.slice();
    },

    /**
     * List available expression names.
     * @returns {string[]}
     */
    expressions: function () {
      return EXPRESSION_NAMES.slice();
    }
  };
})();
