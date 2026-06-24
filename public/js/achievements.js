// ============================================
// SERENITY — Achievement / Badge System
// ============================================

(function () {
  'use strict';

  const STORAGE_KEY = 'reverie_achievements';

  // ==================== ACHIEVEMENT DEFINITIONS ====================

  const ACHIEVEMENTS = {
    // --- Streaks ---
    first_step: {
      id: 'first_step',
      name: 'First Step',
      description: 'Complete your first check-in',
      icon: '\u{1F331}',
      category: 'streaks',
      check: (stats) => stats.totalCheckins >= 1
    },
    three_peat: {
      id: 'three_peat',
      name: 'Three-peat',
      description: '3-day check-in streak',
      icon: '\u{1F33F}',
      category: 'streaks',
      check: (stats) => stats.streak >= 3
    },
    week_warrior: {
      id: 'week_warrior',
      name: 'Week Warrior',
      description: '7-day check-in streak',
      icon: '\u{1F333}',
      category: 'streaks',
      check: (stats) => stats.streak >= 7
    },
    fortnight_force: {
      id: 'fortnight_force',
      name: 'Fortnight Force',
      description: '14-day check-in streak',
      icon: '\u{1F3D4}️',
      category: 'streaks',
      check: (stats) => stats.streak >= 14
    },
    monthly_master: {
      id: 'monthly_master',
      name: 'Monthly Master',
      description: '30-day check-in streak',
      icon: '⭐',
      category: 'streaks',
      check: (stats) => stats.streak >= 30
    },
    century_club: {
      id: 'century_club',
      name: 'Century Club',
      description: '100-day check-in streak',
      icon: '\u{1F451}',
      category: 'streaks',
      check: (stats) => stats.streak >= 100
    },

    // --- Conversations ---
    ice_breaker: {
      id: 'ice_breaker',
      name: 'Ice Breaker',
      description: 'First conversation with a companion',
      icon: '\u{1F4AC}',
      category: 'conversations',
      check: (stats) => stats.totalConversations >= 1
    },
    deep_diver: {
      id: 'deep_diver',
      name: 'Deep Diver',
      description: '25 conversations total',
      icon: '\u{1F40B}',
      category: 'conversations',
      check: (stats) => stats.totalConversations >= 25
    },
    soulmate: {
      id: 'soulmate',
      name: 'Soulmate',
      description: '100 conversations with same companion',
      icon: '\u{1F495}',
      category: 'conversations',
      check: (stats) => {
        if (!stats.companionConversations) return false;
        return Object.values(stats.companionConversations).some((count) => count >= 100);
      }
    },
    social_butterfly: {
      id: 'social_butterfly',
      name: 'Social Butterfly',
      description: 'Chat with all 6 companions',
      icon: '\u{1F98B}',
      category: 'conversations',
      check: (stats) => {
        if (!stats.companionConversations) return false;
        const active = Object.values(stats.companionConversations).filter((c) => c > 0);
        return active.length >= 6;
      }
    },

    // --- Habits ---
    seed_planter: {
      id: 'seed_planter',
      name: 'Seed Planter',
      description: 'Create your first habit',
      icon: '\u{1F331}',
      category: 'habits',
      check: (stats) => stats.totalHabits >= 1
    },
    habit_hero: {
      id: 'habit_hero',
      name: 'Habit Hero',
      description: 'Complete 10 habits',
      icon: '\u{1F9B8}',
      category: 'habits',
      check: (stats) => stats.totalHabits >= 10
    },
    streak_machine: {
      id: 'streak_machine',
      name: 'Streak Machine',
      description: '7-day habit streak',
      icon: '\u{1F525}',
      category: 'habits',
      check: (stats) => stats.habitStreaks >= 7
    },
    unstoppable: {
      id: 'unstoppable',
      name: 'Unstoppable',
      description: '30-day habit streak',
      icon: '⚡',
      category: 'habits',
      check: (stats) => stats.habitStreaks >= 30
    },

    // --- Reflections ---
    mirror_mirror: {
      id: 'mirror_mirror',
      name: 'Mirror Mirror',
      description: 'Write your first reflection',
      icon: '\u{1FA9E}',
      category: 'reflections',
      check: (stats) => stats.totalReflections >= 1
    },
    deep_thinker: {
      id: 'deep_thinker',
      name: 'Deep Thinker',
      description: '10 reflections',
      icon: '\u{1F9E0}',
      category: 'reflections',
      check: (stats) => stats.totalReflections >= 10
    },
    journaler: {
      id: 'journaler',
      name: 'Journaler',
      description: '30 reflections',
      icon: '\u{1F4D6}',
      category: 'reflections',
      check: (stats) => stats.totalReflections >= 30
    },

    // --- Exercises ---
    deep_breath: {
      id: 'deep_breath',
      name: 'Deep Breath',
      description: 'Complete first breathing exercise',
      icon: '\u{1F32C}️',
      category: 'exercises',
      check: (stats) => {
        if (!stats.exerciseTypes) return false;
        return stats.exerciseTypes.includes('breathing') || stats.totalExercises >= 1;
      }
    },
    zen_master: {
      id: 'zen_master',
      name: 'Zen Master',
      description: 'Complete 10 exercises',
      icon: '\u{1F9D8}',
      category: 'exercises',
      check: (stats) => stats.totalExercises >= 10
    },
    night_owl: {
      id: 'night_owl',
      name: 'Night Owl',
      description: 'Complete a sleep story',
      icon: '\u{1F989}',
      category: 'exercises',
      check: (stats) => {
        if (!stats.exerciseTypes) return false;
        return stats.exerciseTypes.includes('sleep_story');
      }
    },
    body_aware: {
      id: 'body_aware',
      name: 'Body Aware',
      description: 'Complete a body scan',
      icon: '\u{1FAC0}',
      category: 'exercises',
      check: (stats) => {
        if (!stats.exerciseTypes) return false;
        return stats.exerciseTypes.includes('body_scan');
      }
    },

    // --- Milestones ---
    one_week_in: {
      id: 'one_week_in',
      name: 'One Week In',
      description: 'Use app for 7 days',
      icon: '\u{1F4C5}',
      category: 'milestones',
      check: (stats) => stats.daysActive >= 7
    },
    month_of_growth: {
      id: 'month_of_growth',
      name: 'Month of Growth',
      description: 'Use app for 30 days',
      icon: '\u{1F338}',
      category: 'milestones',
      check: (stats) => stats.daysActive >= 30
    },
    true_companion: {
      id: 'true_companion',
      name: 'True Companion',
      description: 'Reach 50% bond with any companion',
      icon: '\u{1F91D}',
      category: 'milestones',
      check: (stats) => {
        if (!stats.bondLevels) return false;
        return Object.values(stats.bondLevels).some((level) => level >= 50);
      }
    },
    best_friends: {
      id: 'best_friends',
      name: 'Best Friends',
      description: 'Reach 100% bond with a companion',
      icon: '\u{1F496}',
      category: 'milestones',
      check: (stats) => {
        if (!stats.bondLevels) return false;
        return Object.values(stats.bondLevels).some((level) => level >= 100);
      }
    }
  };

  // ==================== NOTIFICATION STYLES ====================

  function injectStyles() {
    if (document.getElementById('achievement-styles')) return;

    const style = document.createElement('style');
    style.id = 'achievement-styles';
    style.textContent = `
      @keyframes achievement-slide-in {
        0% {
          opacity: 0;
          transform: translateX(100%) scale(0.8);
        }
        60% {
          opacity: 1;
          transform: translateX(-8px) scale(1.02);
        }
        100% {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }

      @keyframes achievement-slide-out {
        0% {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
        100% {
          opacity: 0;
          transform: translateX(100%) scale(0.8);
        }
      }

      @keyframes achievement-shimmer {
        0% {
          background-position: -200% center;
        }
        100% {
          background-position: 200% center;
        }
      }

      @keyframes achievement-glow-pulse {
        0%, 100% {
          box-shadow: var(--shadow-md),
                      0 0 20px var(--accent-glow),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        50% {
          box-shadow: var(--shadow-lg),
                      0 0 40px var(--accent-glow),
                      0 0 60px rgba(126, 176, 155, 0.15),
                      inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }
      }

      @keyframes achievement-icon-bounce {
        0%, 100% { transform: scale(1); }
        30% { transform: scale(1.2); }
        50% { transform: scale(0.95); }
        70% { transform: scale(1.08); }
      }

      #achievement-notification-stack {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
        max-height: 100vh;
        overflow: visible;
      }

      .achievement-notification {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        min-width: 320px;
        max-width: 400px;
        background: var(--bg-secondary);
        border: 1px solid var(--bg-glass-border);
        border-radius: var(--radius-lg);
        animation: achievement-slide-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                   achievement-glow-pulse 2s ease-in-out infinite 0.6s;
        cursor: pointer;
        position: relative;
        overflow: hidden;
      }

      .achievement-notification::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(126, 176, 155, 0.08) 25%,
          rgba(155, 142, 196, 0.12) 50%,
          rgba(126, 176, 155, 0.08) 75%,
          transparent 100%
        );
        background-size: 200% 100%;
        animation: achievement-shimmer 3s ease-in-out infinite;
        pointer-events: none;
      }

      .achievement-notification::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--gradient-primary);
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      }

      .achievement-notification.dismissing {
        animation: achievement-slide-out 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }

      .achievement-notification-icon {
        font-size: 36px;
        line-height: 1;
        flex-shrink: 0;
        animation: achievement-icon-bounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s;
        filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
      }

      .achievement-notification-content {
        flex: 1;
        min-width: 0;
        position: relative;
        z-index: 1;
      }

      .achievement-notification-header {
        font-family: var(--font-primary);
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: var(--accent-primary);
        margin-bottom: 4px;
      }

      .achievement-notification-name {
        font-family: var(--font-display);
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .achievement-notification-desc {
        font-family: var(--font-primary);
        font-size: 13px;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      @media (max-width: 480px) {
        #achievement-notification-stack {
          top: 12px;
          right: 12px;
          left: 12px;
        }

        .achievement-notification {
          min-width: unset;
          max-width: unset;
          width: 100%;
          padding: 14px 16px;
          gap: 12px;
        }

        .achievement-notification-icon {
          font-size: 30px;
        }

        .achievement-notification-name {
          font-size: 15px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ==================== NOTIFICATION CONTAINER ====================

  function getNotificationStack() {
    let stack = document.getElementById('achievement-notification-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'achievement-notification-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }

  // ==================== ACHIEVEMENT SYSTEM CLASS ====================

  class AchievementSystem {
    constructor() {
      this.earned = {};
      this._load();
      injectStyles();
    }

    // ---------- Persistence ----------

    _load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.earned = JSON.parse(raw);
        }
      } catch (_) {
        this.earned = {};
      }
    }

    _save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.earned));
      } catch (_) {
        // Storage full or unavailable — silently ignore
      }
    }

    // ---------- Core API ----------

    /**
     * Check all achievements against the current stats.
     * Returns an array of newly earned achievements.
     *
     * @param {Object} stats
     *   {
     *     streak, totalCheckins, totalConversations,
     *     companionConversations: {id: count},
     *     totalHabits, habitStreaks,
     *     totalReflections, totalExercises,
     *     exerciseTypes: [],
     *     daysActive,
     *     bondLevels: {id: level}
     *   }
     * @returns {Array} Newly earned achievement objects
     */
    checkAll(stats) {
      const newlyEarned = [];

      for (const key in ACHIEVEMENTS) {
        if (this.earned[key]) continue;

        const achievement = ACHIEVEMENTS[key];
        try {
          if (achievement.check(stats)) {
            this.earned[key] = {
              earnedAt: new Date().toISOString()
            };
            newlyEarned.push({ ...achievement });
          }
        } catch (_) {
          // Skip achievements that fail to evaluate
        }
      }

      if (newlyEarned.length > 0) {
        this._save();
      }

      return newlyEarned;
    }

    /**
     * Returns all achievements with their earned status.
     * @returns {Array}
     */
    getAll() {
      const results = [];
      for (const key in ACHIEVEMENTS) {
        const achievement = ACHIEVEMENTS[key];
        const earned = this.earned[key] || null;
        results.push({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          category: achievement.category,
          earned: !!earned,
          earnedAt: earned ? earned.earnedAt : null
        });
      }
      return results;
    }

    /**
     * Returns only earned achievements.
     * @returns {Array}
     */
    getEarned() {
      return this.getAll().filter((a) => a.earned);
    }

    /**
     * Returns overall progress as a percentage (0-100).
     * @returns {number}
     */
    getProgress() {
      const total = Object.keys(ACHIEVEMENTS).length;
      if (total === 0) return 0;
      const earned = Object.keys(this.earned).length;
      return Math.round((earned / total) * 100);
    }

    /**
     * Show a beautiful floating unlock notification for an achievement.
     * Multiple notifications stack vertically.
     *
     * @param {Object} achievement — must have { icon, name, description }
     */
    showUnlockNotification(achievement) {
      const stack = getNotificationStack();

      const card = document.createElement('div');
      card.className = 'achievement-notification';
      card.setAttribute('role', 'alert');
      card.setAttribute('aria-live', 'polite');

      card.innerHTML =
        '<div class="achievement-notification-icon">' + achievement.icon + '</div>' +
        '<div class="achievement-notification-content">' +
          '<div class="achievement-notification-header">Achievement Unlocked!</div>' +
          '<div class="achievement-notification-name">' + escapeText(achievement.name) + '</div>' +
          '<div class="achievement-notification-desc">' + escapeText(achievement.description) + '</div>' +
        '</div>';

      stack.appendChild(card);

      // Click to dismiss early
      card.addEventListener('click', function () {
        dismiss(card);
      });

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(function () {
        dismiss(card);
      }, 5000);

      function dismiss(el) {
        clearTimeout(timer);
        if (el.classList.contains('dismissing')) return;
        el.classList.add('dismissing');
        el.addEventListener('animationend', function () {
          el.remove();
        }, { once: true });
      }
    }
  }

  // ==================== UTILITIES ====================

  function escapeText(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==================== EXPORT ====================

  window.AchievementSystem = AchievementSystem;

})();
