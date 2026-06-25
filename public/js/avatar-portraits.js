(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────────
   *  AvatarPortraits  –  inline SVG character portraits for the
   *  six AI wellness companions.  Each SVG is a stylised bust /
   *  head-and-shoulders illustration at a 200 x 240 viewBox.
   * ────────────────────────────────────────────────────────────── */

  var PORTRAITS = {};

  // ─── shared helpers ──────────────────────────────────────────
  function defs(id, skinLight, skinBase, skinShadow, extras) {
    return '<defs>' +
      '<radialGradient id="skin-' + id + '" cx="50%" cy="40%" r="55%">' +
        '<stop offset="0%" stop-color="' + skinLight + '"/>' +
        '<stop offset="70%" stop-color="' + skinBase + '"/>' +
        '<stop offset="100%" stop-color="' + skinShadow + '"/>' +
      '</radialGradient>' +
      '<radialGradient id="glow-' + id + '" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0%" stop-color="' + (extras.glowColor || '#fff') + '" stop-opacity="0.25"/>' +
        '<stop offset="100%" stop-color="' + (extras.glowColor || '#fff') + '" stop-opacity="0"/>' +
      '</radialGradient>' +
      (extras.defs || '') +
    '</defs>';
  }

  function eye(cx, cy, irisColor, pupilColor, size) {
    var s = size || 1;
    return '' +
      // eye white
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (11 * s) + '" ry="' + (8 * s) + '" fill="#FAFAFA" stroke="#E0D8D0" stroke-width="0.5"/>' +
      // iris
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (5.5 * s) + '" fill="' + irisColor + '"/>' +
      // iris ring
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (5.5 * s) + '" fill="none" stroke="' + (pupilColor || '#1a1a1a') + '" stroke-width="0.7" opacity="0.3"/>' +
      // pupil
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (2.8 * s) + '" fill="' + (pupilColor || '#111') + '"/>' +
      // highlight
      '<circle cx="' + (cx - 2 * s) + '" cy="' + (cy - 2 * s) + '" r="' + (1.5 * s) + '" fill="#fff" opacity="0.85"/>' +
      '<circle cx="' + (cx + 1.5 * s) + '" cy="' + (cy + 1 * s) + '" r="' + (0.7 * s) + '" fill="#fff" opacity="0.4"/>';
  }

  function eyebrow(cx, cy, w, angle, color) {
    var x1 = cx - w / 2;
    var x2 = cx + w / 2;
    var cp = cy - 3;
    return '<path d="M' + x1 + ' ' + cy + ' Q' + cx + ' ' + cp + ' ' + x2 + ' ' + cy + '" ' +
      'stroke="' + color + '" stroke-width="2.2" fill="none" stroke-linecap="round" ' +
      'transform="rotate(' + (angle || 0) + ' ' + cx + ' ' + cy + ')"/>';
  }

  function nose(cx, cy) {
    return '<path d="M' + cx + ' ' + (cy - 8) + ' Q' + (cx + 4) + ' ' + cy + ' ' + (cx + 6) + ' ' + (cy + 2) +
      ' Q' + cx + ' ' + (cy + 5) + ' ' + (cx - 6) + ' ' + (cy + 2) +
      ' Q' + (cx - 4) + ' ' + cy + ' ' + cx + ' ' + (cy - 8) + ' Z" ' +
      'fill="none" stroke="#00000020" stroke-width="1"/>' +
      '<ellipse cx="' + (cx - 3) + '" cy="' + (cy + 2) + '" rx="2" ry="1.5" fill="#00000015"/>' +
      '<ellipse cx="' + (cx + 3) + '" cy="' + (cy + 2) + '" rx="2" ry="1.5" fill="#00000015"/>';
  }

  function lips(cx, cy, color, smileAmount) {
    var sa = smileAmount || 0;
    return '' +
      // upper lip
      '<path d="M' + (cx - 12) + ' ' + cy +
        ' Q' + (cx - 6) + ' ' + (cy - 3 - sa) + ' ' + cx + ' ' + (cy - 1) +
        ' Q' + (cx + 6) + ' ' + (cy - 3 - sa) + ' ' + (cx + 12) + ' ' + cy + '" ' +
        'fill="' + color + '" stroke="' + color + '" stroke-width="0.5"/>' +
      // lower lip
      '<path d="M' + (cx - 12) + ' ' + cy +
        ' Q' + (cx - 4) + ' ' + (cy + 6 + sa) + ' ' + cx + ' ' + (cy + 7 + sa) +
        ' Q' + (cx + 4) + ' ' + (cy + 6 + sa) + ' ' + (cx + 12) + ' ' + cy + '" ' +
        'fill="' + color + '" stroke="' + color + '" stroke-width="0.5"/>' +
      // lip line
      '<path d="M' + (cx - 11) + ' ' + cy +
        ' Q' + cx + ' ' + (cy + 1) + ' ' + (cx + 11) + ' ' + cy + '" ' +
        'fill="none" stroke="#00000025" stroke-width="0.6"/>';
  }

  function neck(cx, cy, skinGrad, w) {
    var hw = (w || 22);
    return '<path d="M' + (cx - hw) + ' ' + cy +
      ' L' + (cx - hw + 2) + ' ' + (cy + 35) +
      ' L' + (cx + hw - 2) + ' ' + (cy + 35) +
      ' L' + (cx + hw) + ' ' + cy + ' Z" ' +
      'fill="' + skinGrad + '"/>';
  }

  function shoulders(cx, cy, color, style) {
    if (style === 'wide') {
      return '<path d="M' + (cx - 85) + ' ' + (cy + 50) +
        ' Q' + (cx - 70) + ' ' + cy + ' ' + (cx - 25) + ' ' + (cy - 5) +
        ' L' + (cx + 25) + ' ' + (cy - 5) +
        ' Q' + (cx + 70) + ' ' + cy + ' ' + (cx + 85) + ' ' + (cy + 50) +
        ' L' + (cx + 100) + ' ' + (cy + 60) +
        ' L' + (cx - 100) + ' ' + (cy + 60) + ' Z" fill="' + color + '"/>';
    }
    return '<path d="M' + (cx - 80) + ' ' + (cy + 50) +
      ' Q' + (cx - 60) + ' ' + (cy - 5) + ' ' + (cx - 22) + ' ' + (cy - 8) +
      ' Q' + cx + ' ' + (cy - 12) + ' ' + (cx + 22) + ' ' + (cy - 8) +
      ' Q' + (cx + 60) + ' ' + (cy - 5) + ' ' + (cx + 80) + ' ' + (cy + 50) +
      ' L' + (cx + 100) + ' ' + (cy + 60) +
      ' L' + (cx - 100) + ' ' + (cy + 60) + ' Z" fill="' + color + '"/>';
  }

  function collarV(cx, cy, skinGrad) {
    return '<path d="M' + (cx - 20) + ' ' + cy +
      ' L' + cx + ' ' + (cy + 25) +
      ' L' + (cx + 20) + ' ' + cy + '" ' +
      'fill="' + skinGrad + '" stroke="none"/>';
  }

  function collarRound(cx, cy, skinGrad) {
    return '<ellipse cx="' + cx + '" cy="' + (cy + 2) + '" rx="20" ry="12" fill="' + skinGrad + '"/>';
  }

  // ─── ARIA ────────────────────────────────────────────────────
  PORTRAITS.aria = function () {
    var id = 'aria';
    var skinBase = '#D4A574';
    var skinLight = '#E8C49A';
    var skinShadow = '#B8875A';
    var hairColor = '#2C1810';
    var eyeColor = '#4A7C59';
    var outfitColor = '#E8DDD3';
    var accentColor = '#7EB09B';
    var lipColor = '#C27070';

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" class="avatar-portrait" data-companion="aria">' +
      defs(id, skinLight, skinBase, skinShadow, {
        glowColor: '#FFD700',
        defs:
          '<linearGradient id="hair-' + id + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" stop-color="#3D2518"/>' +
            '<stop offset="100%" stop-color="' + hairColor + '"/>' +
          '</linearGradient>' +
          '<linearGradient id="outfit-' + id + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" stop-color="' + outfitColor + '"/>' +
            '<stop offset="100%" stop-color="#D5C8B8"/>' +
          '</linearGradient>'
      }) +
      // glow
      '<ellipse cx="100" cy="90" rx="90" ry="95" fill="url(#glow-' + id + ')" class="portrait-glow"/>' +
      // hair back (flowing, behind head)
      '<path d="M55 70 Q40 90 38 130 Q36 160 50 180 L60 175 Q50 150 52 120 Q54 95 65 75 Z" fill="url(#hair-' + id + ')"/>' +
      '<path d="M145 70 Q160 90 162 130 Q164 160 150 180 L140 175 Q150 150 148 120 Q146 95 135 75 Z" fill="url(#hair-' + id + ')"/>' +
      // more flowing strands behind
      '<path d="M48 75 Q35 100 34 140 Q33 170 45 190 L55 185 Q45 160 46 130 Q48 100 58 80 Z" fill="' + hairColor + '" opacity="0.7"/>' +
      '<path d="M152 75 Q165 100 166 140 Q167 170 155 190 L145 185 Q155 160 154 130 Q152 100 142 80 Z" fill="' + hairColor + '" opacity="0.7"/>' +
      // neck
      neck(100, 140, 'url(#skin-' + id + ')') +
      // shoulders & outfit
      shoulders(100, 170, 'url(#outfit-' + id + ')') +
      collarV(100, 168, 'url(#skin-' + id + ')') +
      // crystal pendant
      '<line x1="100" y1="170" x2="100" y2="190" stroke="' + accentColor + '" stroke-width="0.8" opacity="0.6"/>' +
      '<polygon points="100,185 94,195 100,205 106,195" fill="' + accentColor + '" opacity="0.75"/>' +
      '<polygon points="100,185 94,195 100,205 106,195" fill="none" stroke="#fff" stroke-width="0.3" opacity="0.5"/>' +
      // face shape
      '<ellipse cx="100" cy="100" rx="42" ry="52" fill="url(#skin-' + id + ')"/>' +
      // ears
      '<ellipse cx="57" cy="100" rx="6" ry="10" fill="url(#skin-' + id + ')"/>' +
      '<ellipse cx="143" cy="100" rx="6" ry="10" fill="url(#skin-' + id + ')"/>' +
      // hair top
      '<path d="M58 68 Q60 42 80 32 Q100 25 120 32 Q140 42 142 68 Q130 55 100 50 Q70 55 58 68 Z" fill="url(#hair-' + id + ')"/>' +
      // hair side framing
      '<path d="M58 68 Q55 80 56 100 Q58 90 65 78 Q70 60 58 68 Z" fill="url(#hair-' + id + ')"/>' +
      '<path d="M142 68 Q145 80 144 100 Q142 90 135 78 Q130 60 142 68 Z" fill="url(#hair-' + id + ')"/>' +
      // hair wave strands
      '<path d="M65 50 Q62 60 60 75" stroke="' + hairColor + '" stroke-width="2" fill="none" opacity="0.4"/>' +
      '<path d="M135 50 Q138 60 140 75" stroke="' + hairColor + '" stroke-width="2" fill="none" opacity="0.4"/>' +
      // eyebrows
      eyebrow(82, 82, 20, -3, '#3D2518') +
      eyebrow(118, 82, 20, 3, '#3D2518') +
      // eyes
      eye(82, 92, eyeColor, '#1a2e1a') +
      eye(118, 92, eyeColor, '#1a2e1a') +
      // eyelashes
      '<path d="M71 89 L68 85" stroke="#2C1810" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M93 89 L96 85" stroke="#2C1810" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M107 89 L104 85" stroke="#2C1810" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M129 89 L132 85" stroke="#2C1810" stroke-width="1" stroke-linecap="round"/>' +
      // nose
      nose(100, 108) +
      // cheek blush
      '<ellipse cx="75" cy="110" rx="8" ry="5" fill="#E8A090" opacity="0.25"/>' +
      '<ellipse cx="125" cy="110" rx="8" ry="5" fill="#E8A090" opacity="0.25"/>' +
      // lips (gentle smile)
      lips(100, 122, lipColor, 2) +
    '</svg>';
  };

  // ─── KAI ─────────────────────────────────────────────────────
  PORTRAITS.kai = function () {
    var id = 'kai';
    var skinBase = '#8D6E4C';
    var skinLight = '#A68B6B';
    var skinShadow = '#6B5035';
    var hairColor = '#1A1A2E';
    var eyeColor = '#3D2B1F';
    var outfitColor = '#4A5568';
    var accentColor = '#8B7355';
    var lipColor = '#8B6060';

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" class="avatar-portrait" data-companion="kai">' +
      defs(id, skinLight, skinBase, skinShadow, {
        glowColor: '#4169E1',
        defs:
          '<linearGradient id="outfit-' + id + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" stop-color="#5A6A7A"/>' +
            '<stop offset="100%" stop-color="' + outfitColor + '"/>' +
          '</linearGradient>'
      }) +
      // glow
      '<ellipse cx="100" cy="90" rx="90" ry="95" fill="url(#glow-' + id + ')" class="portrait-glow"/>' +
      // neck
      neck(100, 138, 'url(#skin-' + id + ')', 24) +
      // shoulders (wider, masculine)
      shoulders(100, 168, 'url(#outfit-' + id + ')', 'wide') +
      // collar - zen/mandarin style
      '<path d="M80 170 L80 185 Q90 190 100 185 Q110 190 120 185 L120 170" fill="url(#outfit-' + id + ')" stroke="#3A4558" stroke-width="0.8"/>' +
      collarRound(100, 168, 'url(#skin-' + id + ')') +
      // mala beads
      '<g opacity="0.8">' +
        (function() {
          var beads = '';
          for (var i = 0; i < 14; i++) {
            var angle = (i / 14) * Math.PI * 0.9 + Math.PI * 0.05;
            var bx = 100 + Math.sin(angle) * 28;
            var by = 178 + Math.cos(angle) * 15;
            beads += '<circle cx="' + bx + '" cy="' + by + '" r="2.5" fill="' + accentColor + '" stroke="#6B5535" stroke-width="0.3"/>';
          }
          return beads;
        })() +
      '</g>' +
      // face shape (slightly more angular/square jaw)
      '<path d="M58 80 Q58 55 100 48 Q142 55 142 80 L142 105 Q140 140 100 148 Q60 140 58 105 Z" fill="url(#skin-' + id + ')"/>' +
      // jawline emphasis
      '<path d="M62 110 Q60 140 100 148 Q140 140 138 110" fill="none" stroke="#00000010" stroke-width="1"/>' +
      // ears
      '<ellipse cx="57" cy="98" rx="6" ry="10" fill="url(#skin-' + id + ')"/>' +
      '<ellipse cx="143" cy="98" rx="6" ry="10" fill="url(#skin-' + id + ')"/>' +
      // hair (short textured)
      '<path d="M58 78 Q58 42 100 35 Q142 42 142 78 Q130 65 100 60 Q70 65 58 78 Z" fill="' + hairColor + '"/>' +
      // hair texture dots
      '<circle cx="80" cy="50" r="3" fill="' + hairColor + '" opacity="0.8"/>' +
      '<circle cx="100" cy="45" r="3.5" fill="' + hairColor + '" opacity="0.8"/>' +
      '<circle cx="120" cy="50" r="3" fill="' + hairColor + '" opacity="0.8"/>' +
      '<circle cx="90" cy="55" r="2.5" fill="#252540" opacity="0.5"/>' +
      '<circle cx="110" cy="55" r="2.5" fill="#252540" opacity="0.5"/>' +
      // eyebrows (strong, slightly thicker)
      eyebrow(82, 80, 22, -2, hairColor) +
      eyebrow(118, 80, 22, 2, hairColor) +
      // eyes (calm, slightly narrower)
      eye(82, 90, eyeColor, '#0D0D0D', 0.95) +
      eye(118, 90, eyeColor, '#0D0D0D', 0.95) +
      // nose (slightly wider bridge)
      '<path d="M100 82 Q96 95 93 104 Q97 108 100 109 Q103 108 107 104 Q104 95 100 82" fill="none" stroke="#00000018" stroke-width="1.2"/>' +
      '<ellipse cx="96" cy="106" rx="2.5" ry="1.8" fill="#00000012"/>' +
      '<ellipse cx="104" cy="106" rx="2.5" ry="1.8" fill="#00000012"/>' +
      // lips (serene, subtle smile)
      lips(100, 120, lipColor, 1) +
      // light stubble suggestion
      '<rect x="80" y="128" width="40" height="15" rx="8" fill="#00000008"/>' +
    '</svg>';
  };

  // ─── LUNA ────────────────────────────────────────────────────
  PORTRAITS.luna = function () {
    var id = 'luna';
    var skinBase = '#F5D6C3';
    var skinLight = '#FDE8DA';
    var skinShadow = '#E0BCA8';
    var hairColor = '#C4A1FF';
    var eyeColor = '#7B68EE';
    var outfitColor = '#B8A9D4';
    var lipColor = '#D4868A';

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" class="avatar-portrait" data-companion="luna">' +
      defs(id, skinLight, skinBase, skinShadow, {
        glowColor: '#DA70D6',
        defs:
          '<linearGradient id="hair-' + id + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#D4B8FF"/>' +
            '<stop offset="50%" stop-color="' + hairColor + '"/>' +
            '<stop offset="100%" stop-color="#9B7FD4"/>' +
          '</linearGradient>' +
          '<linearGradient id="outfit-' + id + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" stop-color="#C8B8E8"/>' +
            '<stop offset="100%" stop-color="' + outfitColor + '"/>' +
          '</linearGradient>'
      }) +
      // glow
      '<ellipse cx="100" cy="90" rx="90" ry="95" fill="url(#glow-' + id + ')" class="portrait-glow"/>' +
      // hair back (long wavy, behind head)
      '<path d="M45 60 Q30 100 32 150 Q34 185 50 200 L60 195 Q44 170 45 140 Q46 100 55 70 Z" fill="url(#hair-' + id + ')"/>' +
      '<path d="M155 60 Q170 100 168 150 Q166 185 150 200 L140 195 Q156 170 155 140 Q154 100 145 70 Z" fill="url(#hair-' + id + ')"/>' +
      // more wavy hair strands
      '<path d="M38 70 Q25 110 28 155 Q30 190 42 205 L52 200 Q40 175 40 145 Q40 105 48 75 Z" fill="' + hairColor + '" opacity="0.6"/>' +
      '<path d="M162 70 Q175 110 172 155 Q170 190 158 205 L148 200 Q160 175 160 145 Q160 105 152 75 Z" fill="' + hairColor + '" opacity="0.6"/>' +
      // neck
      neck(100, 140, 'url(#skin-' + id + ')') +
      // shoulders & outfit (bohemian style)
      shoulders(100, 170, 'url(#outfit-' + id + ')') +
      collarRound(100, 167, 'url(#skin-' + id + ')') +
      // outfit pattern - small dots
      '<circle cx="75" cy="195" r="1" fill="#fff" opacity="0.3"/>' +
      '<circle cx="85" cy="200" r="1" fill="#fff" opacity="0.3"/>' +
      '<circle cx="115" cy="200" r="1" fill="#fff" opacity="0.3"/>' +
      '<circle cx="125" cy="195" r="1" fill="#fff" opacity="0.3"/>' +
      // face shape
      '<ellipse cx="100" cy="100" rx="42" ry="50" fill="url(#skin-' + id + ')"/>' +
      // ears
      '<ellipse cx="57" cy="100" rx="6" ry="9" fill="url(#skin-' + id + ')"/>' +
      '<ellipse cx="143" cy="100" rx="6" ry="9" fill="url(#skin-' + id + ')"/>' +
      // star earrings
      '<polygon points="55,108 56.5,112 60,112.5 57,115 58,119 55,116.5 52,119 53,115 50,112.5 53.5,112" fill="#FFD700"/>' +
      '<polygon points="145,108 146.5,112 150,112.5 147,115 148,119 145,116.5 142,119 143,115 140,112.5 143.5,112" fill="#FFD700"/>' +
      // hair top (wavy, voluminous)
      '<path d="M55 65 Q55 32 75 22 Q100 12 125 22 Q145 32 145 65 Q135 50 100 45 Q65 50 55 65 Z" fill="url(#hair-' + id + ')"/>' +
      // hair wave details
      '<path d="M60 55 Q55 40 70 30" stroke="#D4B8FF" stroke-width="2" fill="none" opacity="0.5"/>' +
      '<path d="M140 55 Q145 40 130 30" stroke="#D4B8FF" stroke-width="2" fill="none" opacity="0.5"/>' +
      '<path d="M80 45 Q85 35 100 30" stroke="#D4B8FF" stroke-width="1.5" fill="none" opacity="0.4"/>' +
      // flower crown
      '<circle cx="72" cy="40" r="5" fill="#FF69B4" opacity="0.85"/>' +
      '<circle cx="72" cy="40" r="2" fill="#FFE4E1" opacity="0.6"/>' +
      '<circle cx="85" cy="32" r="5.5" fill="#FFB347" opacity="0.85"/>' +
      '<circle cx="85" cy="32" r="2.5" fill="#FFECD2" opacity="0.6"/>' +
      '<circle cx="100" cy="28" r="5" fill="#FF6B6B" opacity="0.85"/>' +
      '<circle cx="100" cy="28" r="2" fill="#FFE0E0" opacity="0.6"/>' +
      '<circle cx="115" cy="32" r="5.5" fill="#DDA0DD" opacity="0.85"/>' +
      '<circle cx="115" cy="32" r="2.5" fill="#F0E0F0" opacity="0.6"/>' +
      '<circle cx="128" cy="40" r="5" fill="#FFA07A" opacity="0.85"/>' +
      '<circle cx="128" cy="40" r="2" fill="#FFE4D0" opacity="0.6"/>' +
      // tiny leaves
      '<ellipse cx="78" cy="36" rx="3" ry="1.5" fill="#5A9E5A" opacity="0.6" transform="rotate(-30 78 36)"/>' +
      '<ellipse cx="107" cy="30" rx="3" ry="1.5" fill="#5A9E5A" opacity="0.6" transform="rotate(20 107 30)"/>' +
      '<ellipse cx="122" cy="36" rx="3" ry="1.5" fill="#5A9E5A" opacity="0.6" transform="rotate(40 122 36)"/>' +
      // eyebrows (soft arched)
      eyebrow(82, 80, 18, -4, '#9B80D0') +
      eyebrow(118, 80, 18, 4, '#9B80D0') +
      // eyes (large, curious - bigger)
      eye(82, 91, eyeColor, '#2D2470', 1.1) +
      eye(118, 91, eyeColor, '#2D2470', 1.1) +
      // long lashes
      '<path d="M70 87 L66 82" stroke="#9B80D0" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M73 85 L70 80" stroke="#9B80D0" stroke-width="0.8" stroke-linecap="round"/>' +
      '<path d="M94 87 L98 82" stroke="#9B80D0" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M91 85 L94 80" stroke="#9B80D0" stroke-width="0.8" stroke-linecap="round"/>' +
      '<path d="M106 87 L102 82" stroke="#9B80D0" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M109 85 L106 80" stroke="#9B80D0" stroke-width="0.8" stroke-linecap="round"/>' +
      '<path d="M130 87 L134 82" stroke="#9B80D0" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M127 85 L130 80" stroke="#9B80D0" stroke-width="0.8" stroke-linecap="round"/>' +
      // nose
      nose(100, 106) +
      // cheek blush (more visible on fair skin)
      '<ellipse cx="73" cy="108" rx="9" ry="5" fill="#F0A0A0" opacity="0.2"/>' +
      '<ellipse cx="127" cy="108" rx="9" ry="5" fill="#F0A0A0" opacity="0.2"/>' +
      // freckles
      '<circle cx="78" cy="105" r="0.8" fill="#D0A090" opacity="0.3"/>' +
      '<circle cx="82" cy="107" r="0.6" fill="#D0A090" opacity="0.3"/>' +
      '<circle cx="76" cy="108" r="0.7" fill="#D0A090" opacity="0.3"/>' +
      '<circle cx="122" cy="105" r="0.8" fill="#D0A090" opacity="0.3"/>' +
      '<circle cx="118" cy="107" r="0.6" fill="#D0A090" opacity="0.3"/>' +
      '<circle cx="124" cy="108" r="0.7" fill="#D0A090" opacity="0.3"/>' +
      // lips (bright, curious smile)
      lips(100, 120, lipColor, 3) +
    '</svg>';
  };

  // ─── SAGE ────────────────────────────────────────────────────
  PORTRAITS.sage = function () {
    var id = 'sage';
    var skinBase = '#C49A6C';
    var skinLight = '#D8B48A';
    var skinShadow = '#A8804E';
    var hairColor = '#A0A0A8';
    var eyeColor = '#808080';
    var outfitColor = '#5B6B5B';
    var lipColor = '#A07070';

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" class="avatar-portrait" data-companion="sage">' +
      defs(id, skinLight, skinBase, skinShadow, {
        glowColor: '#C0C0C0',
        defs:
          '<linearGradient id="hair-' + id + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#B8B8C0"/>' +
            '<stop offset="50%" stop-color="' + hairColor + '"/>' +
            '<stop offset="100%" stop-color="#888890"/>' +
          '</linearGradient>' +
          '<linearGradient id="outfit-' + id + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" stop-color="#6B7B6B"/>' +
            '<stop offset="100%" stop-color="' + outfitColor + '"/>' +
          '</linearGradient>'
      }) +
      // glow
      '<ellipse cx="100" cy="90" rx="90" ry="95" fill="url(#glow-' + id + ')" class="portrait-glow"/>' +
      // neck
      neck(100, 138, 'url(#skin-' + id + ')', 23) +
      // shoulders & outfit (scholarly, cardigan/jacket)
      shoulders(100, 168, 'url(#outfit-' + id + ')', 'wide') +
      // lapels
      '<path d="M80 172 L92 200 L80 210 L72 195 Z" fill="#4B5B4B"/>' +
      '<path d="M120 172 L108 200 L120 210 L128 195 Z" fill="#4B5B4B"/>' +
      // shirt collar underneath
      collarV(100, 168, 'url(#skin-' + id + ')') +
      '<path d="M88 173 L100 190 L112 173" fill="none" stroke="#D8D0C0" stroke-width="1"/>' +
      // face (slightly longer, mature)
      '<path d="M58 78 Q58 50 100 45 Q142 50 142 78 L142 108 Q140 145 100 152 Q60 145 58 108 Z" fill="url(#skin-' + id + ')"/>' +
      // ears
      '<ellipse cx="57" cy="98" rx="6" ry="10" fill="url(#skin-' + id + ')"/>' +
      '<ellipse cx="143" cy="98" rx="6" ry="10" fill="url(#skin-' + id + ')"/>' +
      // hair (elegant silver-gray, slightly swept)
      '<path d="M58 76 Q58 40 80 30 Q100 22 120 30 Q142 40 142 76 Q130 60 100 55 Q70 60 58 76 Z" fill="url(#hair-' + id + ')"/>' +
      // part line
      '<path d="M90 30 Q95 45 98 60" stroke="#888890" stroke-width="1" fill="none" opacity="0.4"/>' +
      // slight sideburns
      '<path d="M58 76 Q56 85 57 95" stroke="' + hairColor + '" stroke-width="4" fill="none" opacity="0.5" stroke-linecap="round"/>' +
      '<path d="M142 76 Q144 85 143 95" stroke="' + hairColor + '" stroke-width="4" fill="none" opacity="0.5" stroke-linecap="round"/>' +
      // eyebrows (distinguished, slightly raised)
      eyebrow(82, 78, 20, -2, '#888890') +
      eyebrow(118, 78, 20, 2, '#888890') +
      // reading glasses
      '<ellipse cx="82" cy="90" rx="14" ry="12" fill="none" stroke="#888888" stroke-width="1.5"/>' +
      '<ellipse cx="118" cy="90" rx="14" ry="12" fill="none" stroke="#888888" stroke-width="1.5"/>' +
      // glasses bridge
      '<path d="M96 90 Q100 87 104 90" fill="none" stroke="#888888" stroke-width="1.3"/>' +
      // glasses temples
      '<path d="M68 88 L57 86" stroke="#888888" stroke-width="1.3"/>' +
      '<path d="M132 88 L143 86" stroke="#888888" stroke-width="1.3"/>' +
      // glasses shine
      '<path d="M73 83 Q78 80 85 83" fill="none" stroke="#fff" stroke-width="0.6" opacity="0.3"/>' +
      '<path d="M109 83 Q114 80 121 83" fill="none" stroke="#fff" stroke-width="0.6" opacity="0.3"/>' +
      // eyes behind glasses
      eye(82, 91, eyeColor, '#333', 0.9) +
      eye(118, 91, eyeColor, '#333', 0.9) +
      // nose
      nose(100, 108) +
      // subtle smile lines (maturity)
      '<path d="M70 112 Q68 118 72 124" fill="none" stroke="#00000010" stroke-width="0.8"/>' +
      '<path d="M130 112 Q132 118 128 124" fill="none" stroke="#00000010" stroke-width="0.8"/>' +
      // lips (knowing, kind half-smile)
      lips(100, 122, lipColor, 1.5) +
    '</svg>';
  };

  // ─── NOVA ────────────────────────────────────────────────────
  PORTRAITS.nova = function () {
    var id = 'nova';
    var skinBase = '#6B4423';
    var skinLight = '#8B6040';
    var skinShadow = '#4D2F15';
    var hairColor = '#FF6B35';
    var eyeColor = '#D4A017';
    var outfitColor = '#2D3748';
    var accentColor = '#FF6B35';
    var lipColor = '#9B5555';

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" class="avatar-portrait" data-companion="nova">' +
      defs(id, skinLight, skinBase, skinShadow, {
        glowColor: '#FF6347',
        defs:
          '<radialGradient id="hair-' + id + '" cx="50%" cy="40%" r="60%">' +
            '<stop offset="0%" stop-color="#FF8F60"/>' +
            '<stop offset="50%" stop-color="' + hairColor + '"/>' +
            '<stop offset="100%" stop-color="#CC4A1A"/>' +
          '</radialGradient>' +
          '<linearGradient id="outfit-' + id + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" stop-color="#3D4858"/>' +
            '<stop offset="100%" stop-color="' + outfitColor + '"/>' +
          '</linearGradient>'
      }) +
      // glow
      '<ellipse cx="100" cy="90" rx="90" ry="95" fill="url(#glow-' + id + ')" class="portrait-glow"/>' +
      // curly hair back (big volume!)
      '<ellipse cx="100" cy="75" rx="62" ry="55" fill="url(#hair-' + id + ')"/>' +
      // extra curly volume
      (function () {
        var curls = '';
        var positions = [
          [48, 55, 10], [42, 70, 9], [40, 88, 10], [45, 105, 9],
          [152, 55, 10], [158, 70, 9], [160, 88, 10], [155, 105, 9],
          [55, 35, 8], [75, 25, 9], [100, 22, 10], [125, 25, 9], [145, 35, 8],
          [50, 115, 8], [150, 115, 8]
        ];
        for (var i = 0; i < positions.length; i++) {
          var p = positions[i];
          curls += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '" fill="url(#hair-' + id + ')"/>';
        }
        return curls;
      })() +
      // neck
      neck(100, 138, 'url(#skin-' + id + ')', 22) +
      // shoulders & outfit (sporty/athletic)
      shoulders(100, 168, 'url(#outfit-' + id + ')') +
      // sporty collar
      collarRound(100, 167, 'url(#skin-' + id + ')') +
      // outfit stripes
      '<path d="M72 175 Q60 180 50 195" stroke="' + accentColor + '" stroke-width="2.5" fill="none" opacity="0.7"/>' +
      '<path d="M128 175 Q140 180 150 195" stroke="' + accentColor + '" stroke-width="2.5" fill="none" opacity="0.7"/>' +
      // face shape (athletic, defined)
      '<ellipse cx="100" cy="100" rx="40" ry="50" fill="url(#skin-' + id + ')"/>' +
      // ears
      '<ellipse cx="59" cy="100" rx="6" ry="9" fill="url(#skin-' + id + ')"/>' +
      '<ellipse cx="141" cy="100" rx="6" ry="9" fill="url(#skin-' + id + ')"/>' +
      // headband
      '<path d="M58 68 Q60 62 80 55 Q100 50 120 55 Q140 62 142 68" ' +
        'stroke="' + accentColor + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M58 68 Q60 62 80 55 Q100 50 120 55 Q140 62 142 68" ' +
        'stroke="#FF8F60" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/>' +
      // hair in front of headband (curly bangs)
      '<circle cx="70" cy="58" r="7" fill="url(#hair-' + id + ')"/>' +
      '<circle cx="82" cy="52" r="8" fill="url(#hair-' + id + ')"/>' +
      '<circle cx="96" cy="48" r="7.5" fill="url(#hair-' + id + ')"/>' +
      '<circle cx="110" cy="50" r="7" fill="url(#hair-' + id + ')"/>' +
      '<circle cx="125" cy="55" r="7.5" fill="url(#hair-' + id + ')"/>' +
      '<circle cx="135" cy="62" r="6" fill="url(#hair-' + id + ')"/>' +
      // eyebrows (strong, confident)
      eyebrow(82, 80, 22, -5, '#3D2010') +
      eyebrow(118, 80, 22, 5, '#3D2010') +
      // eyes (golden, bright, confident)
      eye(82, 91, eyeColor, '#1a1500', 1.05) +
      eye(118, 91, eyeColor, '#1a1500', 1.05) +
      // eyelashes
      '<path d="M71 88 L68 84" stroke="#3D2010" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M93 88 L96 84" stroke="#3D2010" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M107 88 L104 84" stroke="#3D2010" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M129 88 L132 84" stroke="#3D2010" stroke-width="1" stroke-linecap="round"/>' +
      // nose
      '<path d="M100 82 Q96 95 93 104 Q97 108 100 109 Q103 108 107 104 Q104 95 100 82" fill="none" stroke="#00000015" stroke-width="1.2"/>' +
      '<ellipse cx="96" cy="106" rx="2.5" ry="1.8" fill="#00000010"/>' +
      '<ellipse cx="104" cy="106" rx="2.5" ry="1.8" fill="#00000010"/>' +
      // cheek highlights
      '<ellipse cx="75" cy="108" rx="7" ry="4" fill="#8B6040" opacity="0.3"/>' +
      '<ellipse cx="125" cy="108" rx="7" ry="4" fill="#8B6040" opacity="0.3"/>' +
      // lips (beaming smile, wider)
      '<path d="M85 120 Q90 115 100 117 Q110 115 115 120" fill="' + lipColor + '" stroke="' + lipColor + '" stroke-width="0.5"/>' +
      '<path d="M85 120 Q93 130 100 131 Q107 130 115 120" fill="' + lipColor + '" stroke="' + lipColor + '" stroke-width="0.5"/>' +
      '<path d="M86 120 Q100 122 114 120" fill="none" stroke="#00000020" stroke-width="0.6"/>' +
      // teeth hint (big smile)
      '<path d="M90 120 Q100 121 110 120 L110 124 Q100 125 90 124 Z" fill="#F8F4F0" opacity="0.6"/>' +
      // smart watch on visible wrist/arm area is implied by outfit
    '</svg>';
  };

  // ─── EMBER ───────────────────────────────────────────────────
  PORTRAITS.ember = function () {
    var id = 'ember';
    var skinBase = '#E8C4A0';
    var skinLight = '#F5DBC5';
    var skinShadow = '#D0A880';
    var hairColor = '#4A0E0E';
    var eyeColor = '#B8860B';
    var outfitColor = '#8B7B6B';
    var lipColor = '#C08080';

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" class="avatar-portrait" data-companion="ember">' +
      defs(id, skinLight, skinBase, skinShadow, {
        glowColor: '#FF8C00',
        defs:
          '<linearGradient id="hair-' + id + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" stop-color="#6B1E1E"/>' +
            '<stop offset="100%" stop-color="' + hairColor + '"/>' +
          '</linearGradient>' +
          '<linearGradient id="outfit-' + id + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" stop-color="#9B8B7B"/>' +
            '<stop offset="100%" stop-color="' + outfitColor + '"/>' +
          '</linearGradient>'
      }) +
      // glow
      '<ellipse cx="100" cy="90" rx="90" ry="95" fill="url(#glow-' + id + ')" class="portrait-glow"/>' +
      // hair back (base)
      '<path d="M55 65 Q50 80 52 100 Q54 85 62 72 Z" fill="url(#hair-' + id + ')"/>' +
      '<path d="M145 65 Q150 80 148 100 Q146 85 138 72 Z" fill="url(#hair-' + id + ')"/>' +
      // wispy strands behind (messy style)
      '<path d="M58 75 Q52 85 55 105 L60 100 Q58 88 62 78 Z" fill="' + hairColor + '" opacity="0.6"/>' +
      '<path d="M142 75 Q148 85 145 105 L140 100 Q142 88 138 78 Z" fill="' + hairColor + '" opacity="0.6"/>' +
      // neck
      neck(100, 140, 'url(#skin-' + id + ')') +
      // shoulders & outfit (cozy, soft sweater)
      shoulders(100, 170, 'url(#outfit-' + id + ')') +
      // sweater collar (cozy, loose)
      '<path d="M75 170 Q80 162 100 160 Q120 162 125 170" fill="url(#outfit-' + id + ')" stroke="none"/>' +
      '<path d="M75 170 Q80 162 100 160 Q120 162 125 170" fill="none" stroke="#7B6B5B" stroke-width="0.8"/>' +
      // sweater knit texture hints
      '<path d="M72 185 Q73 182 74 185" stroke="#7B6B5B" stroke-width="0.6" fill="none" opacity="0.4"/>' +
      '<path d="M82 190 Q83 187 84 190" stroke="#7B6B5B" stroke-width="0.6" fill="none" opacity="0.4"/>' +
      '<path d="M116 190 Q117 187 118 190" stroke="#7B6B5B" stroke-width="0.6" fill="none" opacity="0.4"/>' +
      '<path d="M126 185 Q127 182 128 185" stroke="#7B6B5B" stroke-width="0.6" fill="none" opacity="0.4"/>' +
      collarRound(100, 165, 'url(#skin-' + id + ')') +
      // face shape (soft, round)
      '<ellipse cx="100" cy="100" rx="42" ry="50" fill="url(#skin-' + id + ')"/>' +
      // ears
      '<ellipse cx="57" cy="100" rx="6" ry="9" fill="url(#skin-' + id + ')"/>' +
      '<ellipse cx="143" cy="100" rx="6" ry="9" fill="url(#skin-' + id + ')"/>' +
      // hair base on head
      '<path d="M58 68 Q60 42 80 34 Q100 28 120 34 Q140 42 142 68 Q130 55 100 50 Q70 55 58 68 Z" fill="url(#hair-' + id + ')"/>' +
      // messy bun on top
      '<ellipse cx="105" cy="32" rx="18" ry="16" fill="url(#hair-' + id + ')"/>' +
      // bun detail strands
      '<path d="M92 25 Q95 18 105 16 Q115 18 118 25" fill="none" stroke="#6B1E1E" stroke-width="1.5" opacity="0.4"/>' +
      '<path d="M95 20 Q105 15 115 20" fill="none" stroke="#6B1E1E" stroke-width="1" opacity="0.3"/>' +
      // wispy front pieces (messy, intentional)
      '<path d="M65 62 Q60 72 58 85" stroke="' + hairColor + '" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>' +
      '<path d="M68 58 Q62 68 60 80" stroke="' + hairColor + '" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/>' +
      '<path d="M135 62 Q140 72 142 85" stroke="' + hairColor + '" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>' +
      '<path d="M132 58 Q138 68 140 80" stroke="' + hairColor + '" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/>' +
      // bun stick/pin
      '<line x1="90" y1="22" x2="120" y2="38" stroke="#C0A080" stroke-width="1.5" stroke-linecap="round"/>' +
      '<circle cx="90" cy="22" r="2" fill="#D4A017" opacity="0.8"/>' +
      // eyebrows (soft, relaxed)
      eyebrow(82, 82, 18, -2, '#5A2020') +
      eyebrow(118, 82, 18, 2, '#5A2020') +
      // eyes (warm amber, soft/slightly droopy = cozy)
      eye(82, 92, eyeColor, '#3D2B00', 1) +
      eye(118, 92, eyeColor, '#3D2B00', 1) +
      // soft upper eyelid line
      '<path d="M71 87 Q82 83 93 87" fill="none" stroke="#5A2020" stroke-width="1" opacity="0.4"/>' +
      '<path d="M107 87 Q118 83 129 87" fill="none" stroke="#5A2020" stroke-width="1" opacity="0.4"/>' +
      // nose
      nose(100, 108) +
      // cheek blush
      '<ellipse cx="75" cy="110" rx="8" ry="5" fill="#E8A090" opacity="0.2"/>' +
      '<ellipse cx="125" cy="110" rx="8" ry="5" fill="#E8A090" opacity="0.2"/>' +
      // lips (soft, knowing, gentle smile)
      lips(100, 122, lipColor, 1.5) +
    '</svg>';
  };

  // ─── CSS animations injected once ────────────────────────────
  var styleInjected = false;
  function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    var css = document.createElement('style');
    css.textContent =
      '@keyframes portrait-glow-pulse {' +
        '0%, 100% { opacity: 0.55; transform: scale(1); }' +
        '50% { opacity: 0.85; transform: scale(1.04); }' +
      '}' +
      '@keyframes portrait-float {' +
        '0%, 100% { transform: translateY(0); }' +
        '50% { transform: translateY(-3px); }' +
      '}' +
      '.avatar-portrait { display: block; width: 100%; height: 100%; }' +
      '.avatar-portrait .portrait-glow { animation: portrait-glow-pulse 4s ease-in-out infinite; transform-origin: center center; }' +
      '.portrait-svg-wrapper { animation: portrait-float 5s ease-in-out infinite; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }';
    document.head.appendChild(css);
  }

  // ─── public API ──────────────────────────────────────────────
  window.AvatarPortraits = {
    /**
     * Return an SVG string for the given companion.
     * @param {string} companionId  e.g. 'aria', 'kai', 'luna', 'sage', 'nova', 'ember'
     * @returns {string} SVG markup or empty string for unknown id
     */
    getPortraitSVG: function (companionId) {
      injectStyles();
      var key = (companionId || '').toLowerCase();
      var fn = PORTRAITS[key];
      if (!fn) return '';
      return '<div class="portrait-svg-wrapper">' + fn() + '</div>';
    },

    /** Convenience: list available ids */
    ids: function () { return Object.keys(PORTRAITS); },

    /**
     * Render a portrait into a container element.
     * @param {HTMLElement} container
     * @param {string} companionId
     */
    render: function (container, companionId) {
      var svg = this.getPortraitSVG(companionId);
      if (svg && container) {
        container.innerHTML = svg;
        return true;
      }
      return false;
    }
  };
})();
