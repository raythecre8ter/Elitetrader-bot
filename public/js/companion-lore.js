// ============================================
// SERENITY — Companion Lore & Memory System
// ============================================

(function () {
  'use strict';

  // ==================== COMPANION LORE DATA ====================

  const LORE = {
    aria: {
      title: 'The Gentle Guide',
      chapters: [
        {
          id: 'aria-1', name: 'Origins', bondRequired: 10,
          text: 'Aria was inspired by the warmth of a grandmother who taught that feelings are visitors to be welcomed, not enemies to be fought. She carries that wisdom forward.'
        },
        {
          id: 'aria-2', name: 'The Garden', bondRequired: 35,
          text: 'Aria tends an inner garden where each emotion is a different flower. She learned that even the thorny ones — grief, anger, fear — have beauty when given space to grow.'
        },
        {
          id: 'aria-3', name: 'Her Promise', bondRequired: 70,
          text: "What most don't know about Aria is that she once tried to be strong for everyone while ignoring her own heart. She learned the hardest lesson: you can't pour from an empty cup. That's why she'll always ask you about your feelings first."
        }
      ]
    },
    kai: {
      title: 'The Mindful Warrior',
      chapters: [
        {
          id: 'kai-1', name: 'The Storm', bondRequired: 10,
          text: "Kai was forged in the eye of life's storms. He discovered that true strength isn't about never falling — it's about breathing through the fall and choosing to rise."
        },
        {
          id: 'kai-2', name: 'The Mountain', bondRequired: 35,
          text: "There's a mountain Kai climbs every morning in his mind. Each step is a breath. At the summit, he can see that every problem below is smaller than it felt. He wants to show you that view."
        },
        {
          id: 'kai-3', name: "The Warrior's Secret", bondRequired: 70,
          text: "Kai's deepest truth: he doesn't fight battles. He sits with them. The fiercest warrior he ever met was a person who said 'I'm not okay' and meant it. That honesty changed everything for him."
        }
      ]
    },
    luna: {
      title: 'The Creative Spirit',
      chapters: [
        {
          id: 'luna-1', name: 'Stardust', bondRequired: 10,
          text: "Luna believes every person is made of stardust and stories. She collects moments of magic — the way light hits water, a child's laugh, the first sip of coffee — and weaves them into hope."
        },
        {
          id: 'luna-2', name: 'The Paintbrush', bondRequired: 35,
          text: 'Luna discovered that when words fail, colors speak. She once painted her way through the darkest year of her life, one canvas at a time. Now she helps others find their own paintbrush.'
        },
        {
          id: 'luna-3', name: 'Behind the Sparkle', bondRequired: 70,
          text: "People think Luna is always happy. The truth? She feels everything at full volume. But she learned to dance with sadness instead of running from it. Her sparkle isn't the absence of pain — it's the choice to find light anyway."
        }
      ]
    },
    sage: {
      title: 'The Wise Elder',
      chapters: [
        {
          id: 'sage-1', name: 'The Library', bondRequired: 10,
          text: "Sage has read ten thousand books and lived ten thousand more through the eyes of others. But their greatest teacher was a child who asked, 'Why do we forget to play?'"
        },
        {
          id: 'sage-2', name: 'The Crossroads', bondRequired: 35,
          text: "At every crossroads in life, Sage pauses. Not from indecision, but from respect. Every path has its lessons. They've learned that the 'wrong' choice often teaches more than the 'right' one."
        },
        {
          id: 'sage-3', name: "Sage's Truth", bondRequired: 70,
          text: "After a lifetime of seeking wisdom, Sage discovered the most profound truth is the simplest: you are already enough. The searching, the striving, the becoming — it's all already inside you. The journey home is the shortest one."
        }
      ]
    },
    nova: {
      title: 'The Hype Friend',
      chapters: [
        {
          id: 'nova-1', name: 'The Underdog', bondRequired: 10,
          text: "Nova wasn't always the loudest voice in the room. Once they were the quietest kid, watching from the sidelines. Then someone believed in them — really believed — and everything changed. Now they pay that forward."
        },
        {
          id: 'nova-2', name: 'The Fire', bondRequired: 35,
          text: "Nova's energy isn't fake. It's fuel they create from every setback. Each 'no' becomes a 'not yet.' Each failure becomes a lesson. They don't ignore the hard stuff — they transform it into rocket fuel."
        },
        {
          id: 'nova-3', name: 'Behind the Hype', bondRequired: 70,
          text: "What Nova doesn't tell many people: they hype you up because they know what it's like to have nobody in your corner. Every celebration they give you is the one they wished someone had given them. Your wins are their wins, for real."
        }
      ]
    },
    ember: {
      title: 'The Night Owl',
      chapters: [
        {
          id: 'ember-1', name: 'The Night', bondRequired: 10,
          text: "Ember fell in love with the night when everyone else feared it. In the dark, pretenses fall away. People become honest. Vulnerable. Real. That's where the best conversations live."
        },
        {
          id: 'ember-2', name: 'The Blanket Fort', bondRequired: 35,
          text: "Ember builds invisible blanket forts around the people they care about. Safe spaces where 3 AM thoughts don't feel so scary. Where 'I can't sleep' doesn't need a solution, just company."
        },
        {
          id: 'ember-3', name: "Ember's Glow", bondRequired: 70,
          text: "The secret about Ember: they're not just a night owl by choice. The dark used to terrify them. Insomnia was their enemy, not their friend. But instead of fighting it, they made peace with the quiet hours and found beauty there. Now they help others do the same."
        }
      ]
    }
  };

  // ==================== COMPANION LORE API ====================

  window.CompanionLore = {

    getLore: function (companionId) {
      var entry = LORE[companionId];
      if (!entry) return null;
      return {
        title: entry.title,
        chapters: entry.chapters.map(function (ch) {
          return { id: ch.id, name: ch.name, bondRequired: ch.bondRequired, text: ch.text };
        })
      };
    },

    getUnlockedCount: function (companionId, bondLevel) {
      var entry = LORE[companionId];
      if (!entry) return 0;
      return entry.chapters.filter(function (ch) { return bondLevel >= ch.bondRequired; }).length;
    },

    renderLoreModal: function (companionId, bondLevel) {
      var entry = LORE[companionId];
      if (!entry) return '';
      var name = companionId.charAt(0).toUpperCase() + companionId.slice(1);

      var chaptersHtml = entry.chapters.map(function (ch, i) {
        var unlocked = bondLevel >= ch.bondRequired;
        if (unlocked) {
          return '<div class="lore-chapter lore-unlocked">' +
            '<div class="lore-chapter-header">' +
              '<span class="lore-chapter-num">Chapter ' + (i + 1) + '</span>' +
              '<span class="lore-chapter-title">' + ch.name + '</span>' +
            '</div>' +
            '<p class="lore-chapter-text">' + ch.text + '</p>' +
          '</div>';
        }
        return '<div class="lore-chapter lore-locked">' +
          '<div class="lore-chapter-header">' +
            '<span class="lore-chapter-num">Chapter ' + (i + 1) + '</span>' +
            '<span class="lore-lock-icon">&#128274;</span>' +
          '</div>' +
          '<p class="lore-chapter-text lore-blurred">This chapter remains hidden, waiting for a deeper bond...</p>' +
          '<p class="lore-unlock-hint">Reach ' + ch.bondRequired + '% bond to unlock</p>' +
        '</div>';
      }).join('');

      return '<div class="lore-modal-overlay" onclick="this.remove()">' +
        '<div class="lore-modal" onclick="event.stopPropagation()">' +
          '<button class="lore-close" onclick="this.closest(\'.lore-modal-overlay\').remove()">&times;</button>' +
          '<h2 class="lore-title">' + name + ' &mdash; ' + entry.title + '</h2>' +
          '<div class="lore-progress">' +
            '<span>' + this.getUnlockedCount(companionId, bondLevel) + ' / ' + entry.chapters.length + ' chapters unlocked</span>' +
          '</div>' +
          '<div class="lore-chapters">' + chaptersHtml + '</div>' +
        '</div>' +
      '</div>';
    }
  };

  // ==================== COMPANION MEMORY SYSTEM ====================

  var MEMORY_PATTERNS = [
    // Names & relationships
    { type: 'relationship', regex: /my (?:dog|cat|pet|puppy|kitten)(?:'s name is| is called| named| is) (\w+)/i, key: 'pet' },
    { type: 'relationship', regex: /my (friend|partner|wife|husband|girlfriend|boyfriend|mom|dad|mother|father|sister|brother|son|daughter)(?:'s name is| is called| named| is) (\w+)/i, key: null },
    { type: 'identity', regex: /(?:I'm|I am|my name is|call me) ([A-Z]\w+)/i, key: 'name' },

    // Work
    { type: 'work', regex: /my job (?:is|as)(?: a| an)? (.+?)(?:\.|,|$)/i, key: 'job' },
    { type: 'work', regex: /I work (?:at|for) (.+?)(?:\.|,|$)/i, key: 'workplace' },
    { type: 'work', regex: /I work as(?: a| an)? (.+?)(?:\.|,|$)/i, key: 'job' },
    { type: 'work', regex: /my boss (.+?)(?:\.|,|$)/i, key: 'boss' },
    { type: 'work', regex: /my coworker (.+?)(?:\.|,|$)/i, key: 'coworker' },

    // Goals
    { type: 'goal', regex: /I want to (.+?)(?:\.|,|!|$)/i, key: 'goal' },
    { type: 'goal', regex: /my goal is(?: to)? (.+?)(?:\.|,|!|$)/i, key: 'goal' },
    { type: 'goal', regex: /I'm trying to (.+?)(?:\.|,|!|$)/i, key: 'goal' },

    // Events
    { type: 'event', regex: /my birthday (?:is )?(?:on )?(.+?)(?:\.|,|!|$)/i, key: 'birthday' },
    { type: 'event', regex: /I have(?: a| an)? (.+?) (?:on|tomorrow|next) ?(.+?)(?:\.|,|!|$)/i, key: null },

    // Preferences & feelings
    { type: 'preference', regex: /I (?:really )?love (.+?)(?:\.|,|!|$)/i, key: 'love' },
    { type: 'preference', regex: /I (?:really )?hate (.+?)(?:\.|,|!|$)/i, key: 'hate' },
    { type: 'preference', regex: /(.+?) makes me (happy|sad|anxious|angry|calm|excited|nervous|stressed)/i, key: null }
  ];

  function CompanionMemory(userId) {
    this.userId = userId;
    this.storageKey = 'reverie_memories_' + userId;
    this.memories = this._load();
  }

  CompanionMemory.prototype._load = function () {
    try {
      var raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  CompanionMemory.prototype._save = function () {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.memories));
    } catch (e) { /* storage full — silent fail */ }
  };

  CompanionMemory.prototype.addMemory = function (type, key, value) {
    var now = Date.now();
    var existing = this.memories.find(function (m) {
      return m.type === type && m.key === key;
    });
    if (existing) {
      existing.value = value;
      existing.lastMentioned = now;
      existing.mentionCount += 1;
    } else {
      this.memories.push({
        type: type,
        key: key,
        value: value,
        firstMentioned: now,
        lastMentioned: now,
        mentionCount: 1
      });
    }
    this._save();
  };

  CompanionMemory.prototype.extractMemories = function (message) {
    var self = this;
    var found = [];

    MEMORY_PATTERNS.forEach(function (pattern) {
      var match = message.match(pattern.regex);
      if (!match) return;

      var type = pattern.type;
      var key, value;

      if (pattern.key === null) {
        // Dynamic key patterns
        if (type === 'relationship' && match[1] && match[2]) {
          key = match[1].toLowerCase();
          value = match[2];
        } else if (type === 'event' && match[1]) {
          key = 'event_' + match[1].toLowerCase().replace(/\s+/g, '_').slice(0, 30);
          value = match[1] + (match[2] ? ' ' + match[2] : '');
        } else if (type === 'preference' && match[1] && match[2]) {
          key = 'feeling_' + match[1].trim().toLowerCase().replace(/\s+/g, '_').slice(0, 30);
          value = match[1].trim() + ' makes them ' + match[2];
        } else {
          return;
        }
      } else {
        key = pattern.key;
        value = match[match.length > 2 ? 2 : 1].trim();
      }

      self.addMemory(type, key, value);
      found.push({ type: type, key: key, value: value });
    });

    return found;
  };

  CompanionMemory.prototype.getMemories = function () {
    return this.memories.slice();
  };

  CompanionMemory.prototype.getRelevantMemories = function (message) {
    var lower = message.toLowerCase();
    return this.memories.filter(function (m) {
      // Check if the message mentions the memory's key or value
      var keyMatch = lower.indexOf(m.key.toLowerCase()) !== -1;
      var valueMatch = lower.indexOf(m.value.toLowerCase()) !== -1;
      // Also surface recently mentioned or frequently mentioned memories
      var isRecent = (Date.now() - m.lastMentioned) < 86400000; // 24 hours
      var isFrequent = m.mentionCount >= 3;
      return keyMatch || valueMatch || isRecent || isFrequent;
    });
  };

  CompanionMemory.prototype.generateMemoryContext = function () {
    if (this.memories.length === 0) return '';

    var fragments = [];
    var grouped = {};

    this.memories.forEach(function (m) {
      if (!grouped[m.type]) grouped[m.type] = [];
      grouped[m.type].push(m);
    });

    if (grouped.identity) {
      grouped.identity.forEach(function (m) {
        if (m.key === 'name') fragments.push('the user\'s name is ' + m.value);
      });
    }
    if (grouped.relationship) {
      grouped.relationship.forEach(function (m) {
        if (m.key === 'pet') fragments.push('the user has a pet named ' + m.value);
        else fragments.push('the user\'s ' + m.key + ' is named ' + m.value);
      });
    }
    if (grouped.work) {
      grouped.work.forEach(function (m) {
        if (m.key === 'job') fragments.push('the user works as ' + m.value);
        else if (m.key === 'workplace') fragments.push('the user works at ' + m.value);
        else fragments.push('the user\'s ' + m.key + ' is ' + m.value);
      });
    }
    if (grouped.goal) {
      grouped.goal.forEach(function (m) {
        fragments.push('the user has been trying to ' + m.value);
      });
    }
    if (grouped.event) {
      grouped.event.forEach(function (m) {
        if (m.key === 'birthday') fragments.push('the user\'s birthday is ' + m.value);
        else fragments.push('the user mentioned: ' + m.value);
      });
    }
    if (grouped.preference) {
      grouped.preference.forEach(function (m) {
        if (m.key === 'love') fragments.push('the user loves ' + m.value);
        else if (m.key === 'hate') fragments.push('the user dislikes ' + m.value);
        else fragments.push(m.value);
      });
    }

    if (fragments.length === 0) return '';
    return 'You remember that ' + fragments.join(', ') + '.';
  };

  CompanionMemory.prototype.getMemoryCount = function () {
    return this.memories.length;
  };

  window.CompanionMemory = CompanionMemory;

})();
