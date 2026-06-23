class NotificationManager {
  constructor() {
    this.permission = Notification.permission || 'default';
    this.scheduledTimers = {};
    this.swRegistration = null;
  }

  async init() {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return false;
    }

    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'navigate') {
            window.showView?.(event.data.view);
          }
        });
      } catch (e) {
        console.log('SW registration failed:', e);
      }
    }

    return true;
  }

  async requestPermission() {
    if (!('Notification' in window)) return 'denied';

    const result = await Notification.requestPermission();
    this.permission = result;
    return result;
  }

  isEnabled() {
    return this.permission === 'granted';
  }

  async scheduleReminders(prefs) {
    this.clearAll();

    if (!this.isEnabled()) return;

    if (prefs.checkin_reminder) {
      this.scheduleDaily('checkin', prefs.checkin_time || '09:00', {
        title: 'Morning Check-in',
        body: 'How are you feeling today? Take a moment to check in with yourself.',
        action: 'checkin',
        tag: 'morning-checkin'
      });
    }

    if (prefs.habit_reminders) {
      this.scheduleDaily('habits', '12:00', {
        title: 'Habit Reminder',
        body: "Don't forget your daily habits! Small steps add up to big changes.",
        action: 'habits',
        tag: 'habit-reminder'
      });
    }

    if (prefs.evening_reflection) {
      this.scheduleDaily('reflect', prefs.evening_time || '20:00', {
        title: 'Evening Reflection',
        body: "Wind down with a moment of reflection. Your future self will thank you.",
        action: 'reflect',
        tag: 'evening-reflection'
      });
    }

    if (prefs.companion_messages) {
      this.scheduleDaily('companion', '14:00', {
        title: 'Your Companion Misses You',
        body: 'Your AI companion has been thinking of you. Come say hi!',
        action: 'companion',
        tag: 'companion-message'
      });
    }
  }

  scheduleDaily(id, timeStr, notificationData) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    const delay = target.getTime() - now.getTime();

    this.scheduledTimers[id] = setTimeout(() => {
      this.showNotification(notificationData);
      this.scheduleDaily(id, timeStr, notificationData);
    }, delay);
  }

  async showNotification(data) {
    if (!this.isEnabled()) return;

    if (this.swRegistration) {
      try {
        await this.swRegistration.showNotification(data.title, {
          body: data.body,
          icon: '/assets/icon-192.png',
          badge: '/assets/icon-192.png',
          vibrate: [100, 50, 100],
          data: { action: data.action },
          tag: data.tag || 'serenity',
          renotify: true
        });
        return;
      } catch (e) {}
    }

    new Notification(data.title, {
      body: data.body,
      icon: '/assets/icon-192.png',
      tag: data.tag
    });
  }

  showInstant(title, body, action) {
    this.showNotification({ title, body, action, tag: 'instant-' + Date.now() });
  }

  clearAll() {
    Object.values(this.scheduledTimers).forEach(t => clearTimeout(t));
    this.scheduledTimers = {};
  }

  async loadAndSchedule(userId) {
    try {
      const res = await fetch(`/api/users/${userId}/notifications`);
      const prefs = await res.json();
      await this.scheduleReminders(prefs);
      return prefs;
    } catch (e) {
      return null;
    }
  }

  createPreferencesUI(prefs, onSave) {
    const html = `
      <div class="notification-prefs">
        <div class="pref-item">
          <div class="pref-info">
            <h4>Morning Check-in</h4>
            <p>Gentle reminder to check in with yourself</p>
          </div>
          <div class="pref-controls">
            <input type="time" id="pref-checkin-time" value="${prefs?.checkin_time || '09:00'}" class="sanctuary-input time-input">
            <label class="switch">
              <input type="checkbox" id="pref-checkin" ${prefs?.checkin_reminder ? 'checked' : ''}>
              <span class="switch-slider"></span>
            </label>
          </div>
        </div>
        <div class="pref-item">
          <div class="pref-info">
            <h4>Habit Reminders</h4>
            <p>Nudge to complete your daily habits</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="pref-habits" ${prefs?.habit_reminders ? 'checked' : ''}>
            <span class="switch-slider"></span>
          </label>
        </div>
        <div class="pref-item">
          <div class="pref-info">
            <h4>Evening Reflection</h4>
            <p>Wind-down prompt for nightly journaling</p>
          </div>
          <div class="pref-controls">
            <input type="time" id="pref-evening-time" value="${prefs?.evening_time || '20:00'}" class="sanctuary-input time-input">
            <label class="switch">
              <input type="checkbox" id="pref-evening" ${prefs?.evening_reflection ? 'checked' : ''}>
              <span class="switch-slider"></span>
            </label>
          </div>
        </div>
        <div class="pref-item">
          <div class="pref-info">
            <h4>Companion Messages</h4>
            <p>Your companion wants to say hi</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="pref-companion" ${prefs?.companion_messages ? 'checked' : ''}>
            <span class="switch-slider"></span>
          </label>
        </div>
        <div class="pref-item">
          <div class="pref-info">
            <h4>Achievement Alerts</h4>
            <p>Celebrate your milestones</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="pref-achievements" ${prefs?.achievement_alerts !== 0 ? 'checked' : ''}>
            <span class="switch-slider"></span>
          </label>
        </div>
        <button class="btn-primary btn-large" id="save-notification-prefs" onclick="(${onSave.toString()})()">
          <i class="fas fa-bell"></i>
          <span>Save Preferences</span>
        </button>
      </div>
    `;
    return html;
  }
}

window.NotificationManager = NotificationManager;
