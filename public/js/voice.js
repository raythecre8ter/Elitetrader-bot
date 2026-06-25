// ============================================
// SERENITY — Voice Interaction Module
// ============================================
// Speech-to-Text, Text-to-Speech, and Voice UI
// for companion-based wellness conversations.
// ============================================

(function () {
  'use strict';

  // ==================== CSS INJECTION ====================

  var styleId = 'serenity-voice-styles';
  if (!document.getElementById(styleId)) {
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = [
      '@keyframes serenity-pulse {',
      '  0%   { box-shadow: 0 0 0 0 var(--accent-glow, rgba(126, 176, 155, 0.3)); }',
      '  70%  { box-shadow: 0 0 0 16px transparent; }',
      '  100% { box-shadow: 0 0 0 0 transparent; }',
      '}',
      '@keyframes serenity-ripple {',
      '  0%   { transform: scale(1); opacity: 0.6; }',
      '  100% { transform: scale(2.2); opacity: 0; }',
      '}',
      '',
      '.serenity-mic-btn {',
      '  width: 48px;',
      '  height: 48px;',
      '  border-radius: 50%;',
      '  border: 2px solid var(--accent-primary, #7EB09B);',
      '  background: transparent;',
      '  color: var(--accent-primary, #7EB09B);',
      '  cursor: pointer;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  position: relative;',
      '  transition: background 0.25s ease, color 0.25s ease, box-shadow 0.25s ease;',
      '  outline: none;',
      '  font-size: 20px;',
      '  line-height: 1;',
      '}',
      '.serenity-mic-btn:hover {',
      '  background: var(--accent-glow, rgba(126, 176, 155, 0.3));',
      '}',
      '.serenity-mic-btn.listening {',
      '  background: var(--accent-primary, #7EB09B);',
      '  color: #fff;',
      '  animation: serenity-pulse 1.4s infinite;',
      '}',
      '',
      '.serenity-speaker-toggle {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  cursor: pointer;',
      '  user-select: none;',
      '  font-size: 14px;',
      '  color: var(--accent-primary, #7EB09B);',
      '}',
      '.serenity-speaker-toggle input[type="checkbox"] {',
      '  appearance: none;',
      '  -webkit-appearance: none;',
      '  width: 36px;',
      '  height: 20px;',
      '  border-radius: 10px;',
      '  background: rgba(255,255,255,0.15);',
      '  position: relative;',
      '  cursor: pointer;',
      '  transition: background 0.25s ease;',
      '  outline: none;',
      '  border: none;',
      '}',
      '.serenity-speaker-toggle input[type="checkbox"]::after {',
      '  content: "";',
      '  position: absolute;',
      '  top: 2px;',
      '  left: 2px;',
      '  width: 16px;',
      '  height: 16px;',
      '  border-radius: 50%;',
      '  background: #fff;',
      '  transition: transform 0.25s ease;',
      '}',
      '.serenity-speaker-toggle input[type="checkbox"]:checked {',
      '  background: var(--accent-primary, #7EB09B);',
      '}',
      '.serenity-speaker-toggle input[type="checkbox"]:checked::after {',
      '  transform: translateX(16px);',
      '}',
      '',
      '.serenity-listening-overlay {',
      '  position: fixed;',
      '  inset: 0;',
      '  z-index: 9999;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  background: rgba(0, 0, 0, 0.45);',
      '  opacity: 0;',
      '  pointer-events: none;',
      '  transition: opacity 0.3s ease;',
      '}',
      '.serenity-listening-overlay.active {',
      '  opacity: 1;',
      '  pointer-events: auto;',
      '}',
      '.serenity-listening-overlay__inner {',
      '  display: flex;',
      '  flex-direction: column;',
      '  align-items: center;',
      '  gap: 18px;',
      '}',
      '.serenity-listening-overlay__circle {',
      '  width: 80px;',
      '  height: 80px;',
      '  border-radius: 50%;',
      '  background: var(--accent-primary, #7EB09B);',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  position: relative;',
      '  font-size: 32px;',
      '  color: #fff;',
      '}',
      '.serenity-listening-overlay__circle::before,',
      '.serenity-listening-overlay__circle::after {',
      '  content: "";',
      '  position: absolute;',
      '  inset: 0;',
      '  border-radius: 50%;',
      '  border: 2px solid var(--accent-primary, #7EB09B);',
      '  animation: serenity-ripple 1.6s infinite;',
      '}',
      '.serenity-listening-overlay__circle::after {',
      '  animation-delay: 0.8s;',
      '}',
      '.serenity-listening-overlay__label {',
      '  color: #fff;',
      '  font-size: 16px;',
      '  letter-spacing: 0.5px;',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ==================== VOICE INPUT (Speech-to-Text) ====================

  var SpeechRecognitionAPI =
    window.SpeechRecognition || window.webkitSpeechRecognition || null;

  /**
   * VoiceInput — wraps the Web Speech Recognition API for continuous
   * speech-to-text input.
   */
  function VoiceInput() {
    this._recognition = null;
    this._listening = false;
    this._onResult = null;
    this._onStart = null;
    this._onEnd = null;
    this._onError = null;

    if (SpeechRecognitionAPI) {
      this._recognition = new SpeechRecognitionAPI();
      this._recognition.continuous = true;
      this._recognition.interimResults = false;
      this._recognition.lang = 'en-US';
      this._bindEvents();
    }
  }

  VoiceInput.prototype._bindEvents = function () {
    var self = this;
    var rec = this._recognition;

    rec.onresult = function (event) {
      if (!self._onResult) return;
      var last = event.results[event.results.length - 1];
      if (last.isFinal) {
        self._onResult(last[0].transcript.trim());
      }
    };

    rec.onstart = function () {
      self._listening = true;
      if (self._onStart) self._onStart();
    };

    rec.onend = function () {
      self._listening = false;
      if (self._onEnd) self._onEnd();
    };

    rec.onerror = function (event) {
      self._listening = false;
      if (self._onError) self._onError(event.error);
    };
  };

  VoiceInput.prototype.isSupported = function () {
    return !!SpeechRecognitionAPI;
  };

  VoiceInput.prototype.isListening = function () {
    return this._listening;
  };

  VoiceInput.prototype.start = function () {
    if (!this._recognition) {
      if (this._onError) this._onError('not-supported');
      return;
    }
    if (this._listening) return;
    try {
      this._recognition.start();
    } catch (e) {
      // already started — ignore
    }
  };

  VoiceInput.prototype.stop = function () {
    if (!this._recognition) return;
    if (!this._listening) return;
    try {
      this._recognition.stop();
    } catch (e) {
      // already stopped — ignore
    }
  };

  VoiceInput.prototype.onResult = function (cb) {
    this._onResult = cb;
    return this;
  };

  VoiceInput.prototype.onStart = function (cb) {
    this._onStart = cb;
    return this;
  };

  VoiceInput.prototype.onEnd = function (cb) {
    this._onEnd = cb;
    return this;
  };

  VoiceInput.prototype.onError = function (cb) {
    this._onError = cb;
    return this;
  };

  // ==================== VOICE SPEAKER (Text-to-Speech) ====================

  var synth = window.speechSynthesis || null;

  // ---------- Companion speech parameters ----------
  // Tuned per companion personality for natural-sounding delivery
  var COMPANION_VOICES = {
    aria:  { rate: 0.9,  pitch: 1.05, volume: 1, gender: 'female' },
    kai:   { rate: 0.85, pitch: 0.85, volume: 1, gender: 'male'   },
    luna:  { rate: 1.05, pitch: 1.15, volume: 1, gender: 'female' },
    sage:  { rate: 0.8,  pitch: 0.9,  volume: 1, gender: 'neutral'},
    nova:  { rate: 1.1,  pitch: 1.0,  volume: 1, gender: 'female' },
    ember: { rate: 0.78, pitch: 0.95, volume: 1, gender: 'female' }
  };

  // ---------- Ranked voice preference lists per companion ----------
  // Each list is tried in order; first match wins. These target the
  // highest-quality voices available across Chrome, Edge, Safari, etc.
  var COMPANION_VOICE_PREFS = {
    aria: [
      'Google UK English Female',
      'Samantha',                     // macOS / iOS
      'Microsoft Zira',               // Windows
      'Microsoft Libby Online',       // Edge
      'Karen',                        // macOS Australian
      'Moira',                        // macOS Irish
      'Victoria',                     // macOS
      'Google US English'
    ],
    kai: [
      'Google UK English Male',
      'Daniel',                       // macOS
      'Microsoft David',              // Windows
      'Microsoft Guy Online',         // Edge
      'Alex',                         // macOS
      'Fred',                         // macOS fallback
      'Thomas',                       // macOS French-English
      'Google US English'
    ],
    luna: [
      'Google US English',
      'Samantha',
      'Microsoft Aria Online',        // Edge — bright, youthful
      'Microsoft Zira',
      'Karen',
      'Tessa',                        // macOS South African
      'Google UK English Female',
      'Victoria'
    ],
    sage: [
      'Google UK English Male',
      'Daniel',
      'Microsoft Mark',               // Windows — measured
      'Microsoft David',
      'Moira',                        // Irish — measured cadence
      'Alex',
      'Google US English',
      'Samantha'
    ],
    nova: [
      'Google US English',
      'Microsoft Aria Online',
      'Samantha',
      'Karen',
      'Microsoft Zira',
      'Google UK English Female',
      'Victoria',
      'Tessa'
    ],
    ember: [
      'Samantha',                     // macOS — soft, clear
      'Google UK English Female',
      'Microsoft Jenny Online',       // Edge — soft
      'Microsoft Zira',
      'Moira',
      'Karen',
      'Google US English',
      'Victoria'
    ]
  };

  // ---------- Gender fallback keywords ----------
  var FEMALE_VOICE_HINTS = [
    'female', 'zira', 'samantha', 'victoria', 'karen', 'moira',
    'tessa', 'fiona', 'veena', 'alice', 'ellen', 'ioana',
    'mariska', 'milena', 'laura', 'alva', 'jenny', 'aria',
    'libby', 'google uk english female', 'google us english'
  ];
  var MALE_VOICE_HINTS = [
    'male', 'david', 'daniel', 'mark', 'alex', 'fred',
    'thomas', 'guy', 'google uk english male'
  ];

  // ---------- Emoji regex for stripping before speech ----------
  // Matches most emoji ranges (supplementary plane + variation selectors)
  var EMOJI_RE = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

  /**
   * VoiceSpeaker — wraps the Web Speech Synthesis API for text-to-speech
   * with companion-specific voice configurations and natural speech
   * improvements (sentence-level pacing, pause handling, text processing).
   */
  function VoiceSpeaker() {
    this._onEnd = null;
    this._voicesLoaded = false;
    this._voices = [];
    this._speakingQueue = [];   // queue of { text, config } segments
    this._queueTimer = null;    // timeout handle for inter-sentence gaps
    this._isSpeakingQueue = false;

    if (synth) {
      this._loadVoices();
      // Chrome loads voices asynchronously
      if (synth.onvoiceschanged !== undefined) {
        var self = this;
        synth.onvoiceschanged = function () {
          self._loadVoices();
        };
      }
    }
  }

  VoiceSpeaker.prototype._loadVoices = function () {
    if (!synth) return;
    this._voices = synth.getVoices();
    this._voicesLoaded = this._voices.length > 0;
  };

  VoiceSpeaker.prototype.isSupported = function () {
    return !!synth;
  };

  VoiceSpeaker.prototype.isSpeaking = function () {
    if (!synth) return false;
    return synth.speaking || this._isSpeakingQueue;
  };

  VoiceSpeaker.prototype.getVoices = function () {
    if (!synth) return [];
    return synth.getVoices();
  };

  // ---------- Text pre-processing for natural speech ----------

  /**
   * Clean and prepare text for speech synthesis.
   * - Strips emojis (they get read aloud literally)
   * - Converts markdown-style emphasis to plain text
   * - Normalises whitespace
   * @param {string} text
   * @returns {string}
   */
  VoiceSpeaker.prototype._processText = function (text) {
    if (!text) return '';

    var cleaned = text;

    // Remove emojis
    cleaned = cleaned.replace(EMOJI_RE, '');

    // Strip markdown bold / italic markers
    cleaned = cleaned.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
    cleaned = cleaned.replace(/_{1,3}([^_]+)_{1,3}/g, '$1');

    // Remove markdown links — keep the link text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Replace common symbols that sound awkward when read
    cleaned = cleaned.replace(/&/g, ' and ');
    cleaned = cleaned.replace(/@/g, ' at ');
    cleaned = cleaned.replace(/#/g, ' number ');

    // Collapse multiple spaces / newlines into single space
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  };

  /**
   * Split text into speakable segments with pause metadata.
   * Returns an array of { text: string, pauseAfter: number } objects.
   *
   * Strategy:
   *   - Split on sentence boundaries (. ! ?)
   *   - Detect parenthetical phrases for volume reduction
   *   - Assign inter-segment pauses (longer for periods, shorter for commas
   *     that end up at segment boundaries)
   *
   * @param {string} text — already processed text
   * @returns {Array<{text: string, pauseAfter: number, volume: number|null}>}
   */
  VoiceSpeaker.prototype._splitIntoSegments = function (text) {
    if (!text) return [];

    // Replace ellipses with a sentence-ending marker so they produce a pause
    var normalized = text.replace(/\.{3,}/g, '.');

    // Split on sentence-ending punctuation, keeping the punctuation
    // This regex splits after . ! ? followed by a space or end-of-string
    var rawParts = normalized.split(/(?<=[.!?])\s+/);
    var segments = [];

    for (var i = 0; i < rawParts.length; i++) {
      var part = rawParts[i].trim();
      if (!part) continue;

      // Detect parenthetical content for softer delivery
      var parenMatch = part.match(/^(.*?)\(([^)]+)\)(.*)$/);
      if (parenMatch && parenMatch[2].length > 0) {
        // Before parenthetical
        var before = parenMatch[1].trim();
        if (before) {
          segments.push({ text: before, pauseAfter: 150, volume: null });
        }
        // Parenthetical — lower volume
        segments.push({ text: parenMatch[2].trim(), pauseAfter: 150, volume: 0.7 });
        // After parenthetical
        var after = parenMatch[3].trim();
        if (after) {
          segments.push({ text: after, pauseAfter: 300, volume: null });
        }
      } else {
        // Determine pause based on ending punctuation
        var pauseMs = 300; // default inter-sentence gap
        if (part.charAt(part.length - 1) === '!') {
          pauseMs = 350;
        } else if (part.charAt(part.length - 1) === '?') {
          pauseMs = 400; // slightly longer after questions — feels contemplative
        }
        segments.push({ text: part, pauseAfter: pauseMs, volume: null });
      }
    }

    return segments;
  };

  /**
   * Speak the given text using the provided voice configuration.
   * Text is automatically processed (emoji removal, etc.) and spoken
   * sentence-by-sentence with natural pauses.
   *
   * @param {string} text
   * @param {object} [voiceConfig] — { rate, pitch, volume, voiceName, gender, preferredVoices }
   */
  VoiceSpeaker.prototype.speak = function (text, voiceConfig) {
    if (!synth) return;

    // Cancel any current speech and queued segments
    this.stop();

    var cfg = voiceConfig || {};
    var processed = this._processText(text);
    var segments = this._splitIntoSegments(processed);

    if (segments.length === 0) return;

    // Resolve the voice once for the entire utterance sequence
    var resolvedVoice = this._resolveVoice(cfg);

    // Build the queue
    this._speakingQueue = [];
    for (var i = 0; i < segments.length; i++) {
      this._speakingQueue.push({
        text: segments[i].text,
        pauseAfter: segments[i].pauseAfter,
        rate: typeof cfg.rate === 'number' ? cfg.rate : 1,
        pitch: typeof cfg.pitch === 'number' ? cfg.pitch : 1,
        volume: segments[i].volume !== null
          ? (typeof cfg.volume === 'number' ? cfg.volume : 1) * segments[i].volume
          : (typeof cfg.volume === 'number' ? cfg.volume : 1),
        voice: resolvedVoice
      });
    }

    this._isSpeakingQueue = true;
    this._speakNext();
  };

  /**
   * Speak the next segment in the queue, then schedule the following
   * segment after the inter-sentence pause.
   * @private
   */
  VoiceSpeaker.prototype._speakNext = function () {
    if (this._speakingQueue.length === 0) {
      this._isSpeakingQueue = false;
      if (this._onEnd) this._onEnd();
      return;
    }

    var segment = this._speakingQueue.shift();
    var utter = new SpeechSynthesisUtterance(segment.text);
    utter.rate = segment.rate;
    utter.pitch = segment.pitch;
    utter.volume = segment.volume;
    utter.lang = 'en-US';

    if (segment.voice) {
      utter.voice = segment.voice;
    }

    var self = this;
    var isLast = this._speakingQueue.length === 0;

    utter.onend = function () {
      if (isLast) {
        self._isSpeakingQueue = false;
        if (self._onEnd) self._onEnd();
      } else {
        // Natural pause between sentences
        self._queueTimer = setTimeout(function () {
          self._queueTimer = null;
          self._speakNext();
        }, segment.pauseAfter);
      }
    };

    utter.onerror = function () {
      // On error, try to continue with the next segment
      if (isLast) {
        self._isSpeakingQueue = false;
        if (self._onEnd) self._onEnd();
      } else {
        self._queueTimer = setTimeout(function () {
          self._queueTimer = null;
          self._speakNext();
        }, segment.pauseAfter);
      }
    };

    synth.speak(utter);
  };

  /**
   * Stop any current speech and clear the sentence queue.
   */
  VoiceSpeaker.prototype.stop = function () {
    if (this._queueTimer) {
      clearTimeout(this._queueTimer);
      this._queueTimer = null;
    }
    this._speakingQueue = [];
    this._isSpeakingQueue = false;
    if (synth) synth.cancel();
  };

  /**
   * Return a voice config for the given companion id.
   * @param {string} companionId — e.g. 'aria', 'kai', 'luna'
   * @returns {object} voice config with rate, pitch, volume, gender, preferredVoices
   */
  VoiceSpeaker.prototype.getCompanionVoice = function (companionId) {
    var key = (companionId || '').toLowerCase();
    var base = COMPANION_VOICES[key] || { rate: 1, pitch: 1, volume: 1, gender: 'neutral' };
    var prefs = COMPANION_VOICE_PREFS[key] || [];
    return {
      rate: base.rate,
      pitch: base.pitch,
      volume: base.volume,
      gender: base.gender,
      preferredVoices: prefs
    };
  };

  VoiceSpeaker.prototype.onEnd = function (cb) {
    this._onEnd = cb;
    return this;
  };

  // ---------- Voice resolution ----------

  /**
   * Resolve the best available SpeechSynthesisVoice for a config.
   *
   * Resolution order:
   *   1. Walk the preferredVoices list (companion-specific ranked names)
   *   2. Fall back to voiceName (exact match)
   *   3. Fall back to gender-based heuristic matching
   *   4. Fall back to the first English voice
   *
   * @param {object} cfg — voice config
   * @returns {SpeechSynthesisVoice|null}
   * @private
   */
  VoiceSpeaker.prototype._resolveVoice = function (cfg) {
    var voices = this.getVoices();
    if (voices.length === 0) return null;

    var matched = null;
    var i, v;

    // 1. Try the ranked preference list (partial, case-insensitive match)
    if (cfg.preferredVoices && cfg.preferredVoices.length > 0) {
      for (i = 0; i < cfg.preferredVoices.length; i++) {
        var pref = cfg.preferredVoices[i].toLowerCase();
        for (v = 0; v < voices.length; v++) {
          if (voices[v].name.toLowerCase().indexOf(pref.toLowerCase()) !== -1) {
            return voices[v];
          }
        }
      }
    }

    // 2. Exact voiceName match
    if (cfg.voiceName) {
      for (i = 0; i < voices.length; i++) {
        if (voices[i].name.toLowerCase() === cfg.voiceName.toLowerCase()) {
          return voices[i];
        }
      }
    }

    // 3. Gender-based heuristic
    if (cfg.gender) {
      matched = this._findVoiceByGender(voices, cfg.gender);
      if (matched) return matched;
    }

    // 4. First English voice, or first voice overall
    for (i = 0; i < voices.length; i++) {
      if (voices[i].lang && voices[i].lang.indexOf('en') === 0) {
        return voices[i];
      }
    }
    return voices[0] || null;
  };

  /**
   * Heuristic voice matching by gender.
   * Falls back to the first English voice if no gendered match is found.
   * @private
   */
  VoiceSpeaker.prototype._findVoiceByGender = function (voices, gender) {
    var hints = gender === 'female' ? FEMALE_VOICE_HINTS :
                gender === 'male'   ? MALE_VOICE_HINTS   : [];

    // English voices only
    var english = [];
    for (var i = 0; i < voices.length; i++) {
      if (voices[i].lang && voices[i].lang.indexOf('en') === 0) {
        english.push(voices[i]);
      }
    }

    var pool = english.length > 0 ? english : voices;

    // Try to match by hint keywords
    for (var h = 0; h < hints.length; h++) {
      for (var v = 0; v < pool.length; v++) {
        if (pool[v].name.toLowerCase().indexOf(hints[h]) !== -1) {
          return pool[v];
        }
      }
    }

    // Fallback: return the first English voice, or the first available voice
    return pool.length > 0 ? pool[0] : null;
  };

  // ==================== VOICE UI HELPER ====================

  var VoiceUI = {};

  /**
   * Create a microphone button for toggling voice input.
   * @returns {HTMLButtonElement}
   */
  VoiceUI.createMicButton = function () {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'serenity-mic-btn';
    btn.setAttribute('aria-label', 'Toggle voice input');
    btn.title = 'Voice input';
    // Microphone SVG icon
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round">' +
      '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>' +
      '<path d="M19 10v2a7 7 0 0 1-14 0v-2"/>' +
      '<line x1="12" y1="19" x2="12" y2="23"/>' +
      '<line x1="8" y1="23" x2="16" y2="23"/>' +
      '</svg>';

    if (!SpeechRecognitionAPI) {
      btn.disabled = true;
      btn.title = 'Voice input is not supported in this browser';
      btn.style.opacity = '0.4';
      btn.style.cursor = 'not-allowed';
    }

    return btn;
  };

  /**
   * Create a toggle control for auto-speaking companion responses.
   * @returns {HTMLLabelElement}
   */
  VoiceUI.createSpeakerToggle = function () {
    var label = document.createElement('label');
    label.className = 'serenity-speaker-toggle';

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = false;

    var span = document.createElement('span');
    span.textContent = 'Auto-speak responses';

    if (!synth) {
      checkbox.disabled = true;
      span.textContent = 'Speech not supported';
      label.style.opacity = '0.4';
      label.style.cursor = 'not-allowed';
    }

    label.appendChild(checkbox);
    label.appendChild(span);

    return label;
  };

  // Overlay element — created lazily and reused
  var _overlay = null;

  function _ensureOverlay() {
    if (_overlay) return _overlay;

    _overlay = document.createElement('div');
    _overlay.className = 'serenity-listening-overlay';
    _overlay.innerHTML =
      '<div class="serenity-listening-overlay__inner">' +
      '  <div class="serenity-listening-overlay__circle">' +
      '    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" ' +
      '    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      '    stroke-linejoin="round">' +
      '    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>' +
      '    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>' +
      '    <line x1="12" y1="19" x2="12" y2="23"/>' +
      '    <line x1="8" y1="23" x2="16" y2="23"/>' +
      '    </svg>' +
      '  </div>' +
      '  <div class="serenity-listening-overlay__label">Listening&hellip;</div>' +
      '</div>';

    document.body.appendChild(_overlay);
    return _overlay;
  }

  /**
   * Show the full-screen listening indicator with pulse animation.
   */
  VoiceUI.showListeningIndicator = function () {
    var el = _ensureOverlay();
    // Force reflow so the transition fires even if called rapidly
    el.classList.remove('active');
    void el.offsetWidth;
    el.classList.add('active');
  };

  /**
   * Hide the listening indicator overlay.
   */
  VoiceUI.hideListeningIndicator = function () {
    if (_overlay) {
      _overlay.classList.remove('active');
    }
  };

  // ==================== EXPORT TO WINDOW ====================

  window.VoiceInput   = VoiceInput;
  window.VoiceSpeaker = VoiceSpeaker;
  window.VoiceUI      = VoiceUI;

})();
