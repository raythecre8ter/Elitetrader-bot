// ============================================
// SERENITY — Main Application Logic
// ============================================

const API = '/api';
let currentUser = null;
let currentCompanion = null;
let companions = [];
let avatarRenderer = null;
let mainAvatarId = null;
let currentView = 'dashboard';
let currentReflectionPrompt = '';
let voiceInput = null;
let voiceSpeaker = null;
let notifManager = null;
let achievementSystem = null;
let userSettings = {};
let deferredInstallPrompt = null;
let companionMemory = null;
let currentCommunityFilter = 'all';

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  avatarRenderer = new AvatarRenderer();
  initParticles();

  // Initialize subsystems
  if (window.VoiceInput) voiceInput = new VoiceInput();
  if (window.VoiceSpeaker) voiceSpeaker = new VoiceSpeaker();
  if (window.NotificationManager) {
    notifManager = new NotificationManager();
    notifManager.init();
  }
  if (window.AchievementSystem) achievementSystem = new AchievementSystem();

  // Initialize SOS button
  if (window.SOSMode) {
    const sosContainer = document.getElementById('sos-floating-btn');
    if (sosContainer) sosContainer.innerHTML = SOSMode.renderSOSButton();
  }

  const savedUser = localStorage.getItem('reverie_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    initApp();
  }

  const savedTheme = localStorage.getItem('reverie_theme');
  if (savedTheme) setTheme(savedTheme, false);

  // PWA install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const btn = document.getElementById('install-pwa-btn');
    if (btn) btn.style.display = 'inline-flex';
  });
});

async function initApp() {
  document.getElementById('onboarding-screen').classList.remove('active');
  document.getElementById('onboarding-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  document.getElementById('main-app').classList.add('active');

  await loadCompanions();
  updateGreeting();
  loadDashboard();
  loadUserSettings();
  initVoiceControls();

  // Initialize companion memory
  if (window.CompanionMemory && currentUser) {
    companionMemory = new CompanionMemory(currentUser.id);
  }

  if (notifManager && currentUser) {
    notifManager.loadAndSchedule(currentUser.id);
  }

  // Check achievements periodically
  checkAchievements();
}

async function loadUserSettings() {
  if (!currentUser) return;
  try {
    const res = await fetch(`${API}/users/${currentUser.id}/settings`);
    userSettings = await res.json();

    if (userSettings.has_api_key) {
      const status = document.getElementById('api-key-status');
      if (status) status.textContent = 'API key configured — AI-powered responses active';
      if (status) status.style.color = 'var(--accent-primary)';
    }

    const voiceToggle = document.getElementById('setting-voice-enabled');
    if (voiceToggle) voiceToggle.checked = !!userSettings.voice_enabled;
    const speakToggle = document.getElementById('setting-auto-speak');
    if (speakToggle) speakToggle.checked = !!userSettings.auto_speak;

  } catch (e) {}
}

function initVoiceControls() {
  if (!window.VoiceUI) return;

  const micContainer = document.getElementById('voice-mic-container');
  if (micContainer) {
    const micBtn = VoiceUI.createMicButton();
    micContainer.appendChild(micBtn);

    micBtn.addEventListener('click', () => {
      if (!voiceInput || !voiceInput.isSupported()) {
        showToast('Voice input not supported in this browser', 'info');
        return;
      }

      if (voiceInput.isListening()) {
        voiceInput.stop();
        micBtn.classList.remove('listening');
        VoiceUI.hideListeningIndicator();
      } else {
        voiceInput.start();
        micBtn.classList.add('listening');
        VoiceUI.showListeningIndicator();
      }
    });

    if (voiceInput) {
      voiceInput.onResult((text) => {
        document.getElementById('chat-input').value = text;
      });
      voiceInput.onEnd(() => {
        micBtn.classList.remove('listening');
        VoiceUI.hideListeningIndicator();
        const input = document.getElementById('chat-input');
        if (input.value.trim()) sendMessage();
      });
    }
  }

  const speakerContainer = document.getElementById('voice-speaker-container');
  if (speakerContainer && window.VoiceUI) {
    const toggle = VoiceUI.createSpeakerToggle();
    speakerContainer.appendChild(toggle);
  }
}

// ==================== ONBOARDING ====================

async function submitName() {
  const name = document.getElementById('user-name-input').value.trim();
  if (!name) {
    showToast('Please enter your name', 'error');
    return;
  }

  try {
    const res = await fetch(`${API}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: name })
    });
    const data = await res.json();
    currentUser = data.user;
    localStorage.setItem('reverie_user', JSON.stringify(currentUser));

    document.getElementById('step-name').classList.add('hidden');
    document.getElementById('step-companion').classList.remove('hidden');

    await loadCompanionSelect();
  } catch (err) {
    showToast('Something went wrong. Please try again.', 'error');
  }
}

async function loadCompanionSelect() {
  const res = await fetch(`${API}/companions`);
  companions = await res.json();

  const grid = document.getElementById('companion-select-grid');
  grid.innerHTML = companions.map(c => `
    <div class="companion-card" onclick="selectCompanion('${c.id}', this)" data-id="${c.id}">
      <div class="companion-card-avatar">
        <div class="companion-avatar-placeholder" style="background: ${getAvatarGradient(c.avatar_config)}">
          ${c.name[0]}
        </div>
      </div>
      <h4>${c.name}</h4>
      <div class="persona">${c.persona}</div>
      <p>${truncate(c.description, 100)}</p>
      <div class="specialties-tags">
        ${c.specialties.slice(0, 3).map(s => `<span class="specialty-tag">${formatSpecialty(s)}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

async function selectCompanion(companionId, el) {
  document.querySelectorAll('.companion-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');

  try {
    await fetch(`${API}/users/${currentUser.id}/companions/${companionId}/activate`, { method: 'PUT' });
    currentCompanion = companions.find(c => c.id === companionId);

    await fetch(`${API}/users/${currentUser.id}/onboarding`, { method: 'PUT' });

    showToast(`${currentCompanion.name} is excited to meet you!`, 'success');

    setTimeout(() => initApp(), 800);
  } catch (err) {
    showToast('Something went wrong. Please try again.', 'error');
  }
}

// ==================== NAVIGATION ====================

function showView(viewName) {
  currentView = viewName;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-link, .mobile-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  switch (viewName) {
    case 'dashboard': loadDashboard(); break;
    case 'companion': initCompanionView(); break;
    case 'checkin': break;
    case 'habits': loadHabits(); break;
    case 'reflect': loadReflections(); break;
    case 'insights': loadInsights(); break;
    case 'exercises': loadExerciseStats(); break;
    case 'achievements': loadAchievementsView(); break;
    case 'companions-gallery': loadCompanionGallery(); break;
    case 'settings': loadSettingsState(); break;
    case 'community': loadCommunityView(); break;
    case 'dreams': loadDreamsView(); break;
    case 'weekly-report': loadWeeklyReport(); break;
    case 'challenges': loadChallengesView(); break;
  }
}

// ==================== DASHBOARD ====================

function updateGreeting() {
  const hour = new Date().getHours();
  let greeting;
  if (hour < 5) greeting = 'Still awake';
  else if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  else if (hour < 21) greeting = 'Good evening';
  else greeting = 'Good night';

  const name = currentUser?.display_name || 'Friend';
  document.getElementById('greeting-text').textContent = `${greeting}, ${name}`;

  const subs = [
    "How are you feeling today?",
    "Take a moment for yourself.",
    "Your sanctuary awaits.",
    "Let's make today a good one.",
    "You showed up — that matters."
  ];
  document.getElementById('greeting-sub').textContent = subs[Math.floor(Math.random() * subs.length)];
}

async function loadDashboard() {
  if (!currentUser) return;

  try {
    const res = await fetch(`${API}/dashboard/${currentUser.id}`);
    const data = await res.json();

    document.getElementById('streak-count').textContent = data.streak_days;

    if (data.today_checkin) {
      const card = document.getElementById('mood-quick-card');
      const btn = card.querySelector(`[data-mood="${Math.round(data.today_checkin.mood_score / 2) * 2}"]`);
      if (btn) btn.classList.add('selected');
    }

    if (data.active_companion) {
      currentCompanion = data.active_companion;
      document.getElementById('dashboard-companion-name').textContent = data.active_companion.name;
      document.getElementById('dashboard-companion-greeting').textContent = data.active_companion.greeting;

      const avatarContainer = document.getElementById('dashboard-companion-avatar');
      avatarContainer.innerHTML = `<div class="companion-avatar-placeholder" style="background: ${getAvatarGradient(data.active_companion.avatar_config)}; width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #fff;">${data.active_companion.name[0]}</div>`;
    }

    renderDashboardHabits(data.habits);
    document.getElementById('dashboard-habit-progress').textContent = `${data.habits_completed}/${data.habits_total}`;

    drawMoodChart('mood-chart', data.week_moods);

    // Daily challenge card
    if (window.DailyChallenges) {
      const challengeContent = document.getElementById('dashboard-challenge-content');
      if (challengeContent) {
        const ch = DailyChallenges.getTodaysChallenge();
        const done = DailyChallenges.isCompletedToday();
        challengeContent.innerHTML = `
          <div class="dashboard-challenge">
            <span class="challenge-icon">${ch.icon}</span>
            <div class="challenge-info">
              <p class="challenge-title">${ch.title}</p>
              <span class="challenge-category">${ch.category}</span>
            </div>
            ${done
              ? '<span class="challenge-done"><i class="fas fa-check"></i></span>'
              : `<button class="btn-secondary" onclick="completeDashboardChallenge(${ch.id})">Do it!</button>`
            }
          </div>
        `;
      }
    }

  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function renderDashboardHabits(habits) {
  const container = document.getElementById('dashboard-habits-list');
  if (!habits || habits.length === 0) {
    container.innerHTML = '<p class="empty-state">Add your first habit to get started!</p>';
    return;
  }

  container.innerHTML = habits.slice(0, 5).map(h => `
    <div class="dashboard-habit-item">
      <button class="habit-check ${h.completed_today ? 'completed' : ''}"
              onclick="toggleHabit('${h.id}', this)"
              ${h.completed_today ? 'disabled' : ''}>
        ${h.completed_today ? '<i class="fas fa-check"></i>' : ''}
      </button>
      <span class="habit-name ${h.completed_today ? 'completed' : ''}">${h.icon || '✨'} ${h.title}</span>
      ${h.current_streak > 0 ? `<span class="habit-streak-badge"><i class="fas fa-fire"></i> ${h.current_streak}</span>` : ''}
    </div>
  `).join('');
}

async function quickMood(score) {
  document.querySelectorAll('.mood-face').forEach(f => f.classList.remove('selected'));
  event.currentTarget.classList.add('selected');

  try {
    await fetch(`${API}/checkins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id,
        mood_score: score,
        companion_id: currentCompanion?.id
      })
    });
    showToast('Mood logged! Keep checking in.', 'success');
  } catch (err) {
    showToast('Could not save mood.', 'error');
  }
}

// ==================== COMPANION CHAT ====================

let chatHistory = [];

async function initCompanionView() {
  if (!currentCompanion) {
    showToast('Please select a companion first', 'info');
    showView('companions-gallery');
    return;
  }

  document.getElementById('chat-companion-name').textContent = currentCompanion.name;
  document.getElementById('chat-companion-persona').textContent = currentCompanion.persona;

  // Load bond level
  try {
    const res = await fetch(`${API}/users/${currentUser.id}/companions`);
    const userCompanions = await res.json();
    const active = userCompanions.find(c => c.id === currentCompanion.id);
    if (active) {
      document.getElementById('bond-fill').style.width = `${active.bond_level}%`;
    }
  } catch (e) {}

  // Render 3D avatar
  const config = typeof currentCompanion.avatar_config === 'string'
    ? JSON.parse(currentCompanion.avatar_config)
    : currentCompanion.avatar_config;

  if (mainAvatarId) avatarRenderer.destroy(mainAvatarId);

  const container = document.getElementById('avatar-container');
  const canvas = document.getElementById('avatar-canvas');

  const isMobile = window.innerWidth <= 768;
  const w = isMobile ? 80 : 280;
  const h = isMobile ? 80 : 320;

  mainAvatarId = avatarRenderer.createAvatar(canvas, config, {
    id: 'main-avatar',
    width: w,
    height: h
  });

  // Load chat history
  try {
    const res = await fetch(`${API}/chat/history/${currentUser.id}/${currentCompanion.id}?limit=30`);
    chatHistory = await res.json();
    renderChat();
  } catch (e) {
    chatHistory = [];
    renderChat();
  }
}

function renderChat() {
  const container = document.getElementById('chat-messages');

  if (chatHistory.length === 0) {
    container.innerHTML = `
      <div class="chat-welcome">
        <p>Start a conversation with ${currentCompanion?.name || 'your companion'}...</p>
      </div>
    `;
    return;
  }

  container.innerHTML = chatHistory.map(msg => `
    <div class="chat-message ${msg.sender}">
      ${msg.message}
      <div class="message-meta">${formatTime(msg.created_at)}</div>
    </div>
  `).join('');

  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message || !currentCompanion) return;

  input.value = '';
  input.style.height = 'auto';
  document.getElementById('chat-send-btn').disabled = true;

  // Extract memories from user message
  if (companionMemory) {
    companionMemory.extractMemories(message);
  }

  // Add user message
  addChatMessage(message, 'user');

  // Show typing indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'typing-indicator';
  typingEl.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  document.getElementById('chat-messages').appendChild(typingEl);
  scrollChat();

  try {
    // Simulate slight delay for natural feeling
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

    // Use AI-powered endpoint if API key is configured
    const chatEndpoint = userSettings.has_api_key ? `${API}/chat/ai` : `${API}/chat`;

    const res = await fetch(chatEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id,
        companion_id: currentCompanion.id,
        message
      })
    });

    const data = await res.json();
    typingEl.remove();

    addChatMessage(data.message, 'companion');

    // Show AI badge if powered by Claude
    if (data.ai_powered) {
      const msgs = document.getElementById('chat-messages');
      const lastMsg = msgs.lastElementChild;
      if (lastMsg) {
        const badge = document.createElement('span');
        badge.className = 'ai-badge';
        badge.textContent = 'AI';
        badge.title = 'Powered by Claude AI';
        lastMsg.appendChild(badge);
      }
    }

    if (data.companion_expression && mainAvatarId) {
      avatarRenderer.setExpression(mainAvatarId, data.companion_expression);
    }

    // Auto-speak response if enabled
    if (userSettings.auto_speak && voiceSpeaker && voiceSpeaker.isSupported()) {
      const voiceConfig = voiceSpeaker.getCompanionVoice(currentCompanion.id);
      voiceSpeaker.speak(data.message, voiceConfig);
    }

    // Update bond meter
    const bondFill = document.getElementById('bond-fill');
    const currentWidth = parseFloat(bondFill.style.width) || 0;
    bondFill.style.width = `${Math.min(100, currentWidth + 0.5)}%`;

    // Hide suggestions after first message
    document.getElementById('chat-suggestions').style.display = 'none';

  } catch (err) {
    typingEl.remove();
    addChatMessage("I had a brief moment — could you say that again?", 'companion');
  }

  document.getElementById('chat-send-btn').disabled = false;
  input.focus();
}

function addChatMessage(text, sender) {
  const container = document.getElementById('chat-messages');
  const welcome = container.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  const msgEl = document.createElement('div');
  msgEl.className = `chat-message ${sender}`;
  msgEl.innerHTML = `${escapeHtml(text).replace(/\n/g, '<br>')}<div class="message-meta">${formatTime(new Date().toISOString())}</div>`;
  container.appendChild(msgEl);
  scrollChat();
}

function scrollChat() {
  const container = document.getElementById('chat-messages');
  container.scrollTop = container.scrollHeight;
}

function handleChatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function useSuggestion(text) {
  document.getElementById('chat-input').value = text;
  sendMessage();
}

// ==================== CHECK-IN ====================

let selectedEmotions = new Set();

function updateMoodDisplay(value) {
  document.getElementById('mood-value-display').textContent = value;
}

function toggleEmotion(el) {
  const emotion = el.dataset.emotion;
  if (selectedEmotions.has(emotion)) {
    selectedEmotions.delete(emotion);
    el.classList.remove('selected');
  } else {
    selectedEmotions.add(emotion);
    el.classList.add('selected');
  }
}

async function submitCheckin() {
  const mood_score = parseInt(document.getElementById('mood-slider').value);
  const energy_level = parseInt(document.getElementById('energy-slider').value);
  const anxiety_level = parseInt(document.getElementById('anxiety-slider').value);
  const journal_entry = document.getElementById('journal-entry').value.trim();
  const gratitudeText = document.getElementById('gratitude-input').value.trim();

  try {
    await fetch(`${API}/checkins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id,
        mood_score,
        energy_level,
        anxiety_level,
        emotions: Array.from(selectedEmotions),
        journal_entry: journal_entry || null,
        gratitude: gratitudeText ? [gratitudeText] : [],
        companion_id: currentCompanion?.id
      })
    });

    showToast('Check-in saved. Thank you for being honest with yourself.', 'success');

    // Reset form
    document.getElementById('mood-slider').value = 5;
    document.getElementById('energy-slider').value = 5;
    document.getElementById('anxiety-slider').value = 3;
    document.getElementById('journal-entry').value = '';
    document.getElementById('gratitude-input').value = '';
    document.getElementById('mood-value-display').textContent = '5';
    selectedEmotions.clear();
    document.querySelectorAll('.emotion-chip').forEach(c => c.classList.remove('selected'));

    showView('dashboard');
    loadDashboard();
  } catch (err) {
    showToast('Could not save check-in. Please try again.', 'error');
  }
}

// ==================== HABITS ====================

let selectedCategory = 'mindfulness';

async function loadHabits() {
  if (!currentUser) return;

  try {
    const res = await fetch(`${API}/habits/${currentUser.id}`);
    const habits = await res.json();

    const container = document.getElementById('habits-list');
    if (habits.length === 0) {
      container.innerHTML = `
        <p class="empty-state">
          <i class="fas fa-leaf"></i>
          <span>No habits yet. Start small — even one tiny habit can change everything.</span>
        </p>
      `;
      return;
    }

    container.innerHTML = habits.map(h => `
      <div class="habit-item">
        <span class="habit-icon">${h.icon || '✨'}</span>
        <div class="habit-info">
          <h4>${escapeHtml(h.title)}</h4>
          <p>${h.frequency} ${h.is_micro ? '· micro-habit' : ''}</p>
        </div>
        <div class="habit-streak-info">
          <span class="streak-num">${h.current_streak || 0}</span>
          <span class="streak-text">streak</span>
        </div>
        <button class="habit-complete-btn ${h.completed_today ? 'done' : ''}"
                onclick="toggleHabit('${h.id}', this)"
                ${h.completed_today ? 'disabled' : ''}>
          <i class="fas ${h.completed_today ? 'fa-check' : 'fa-plus'}"></i>
        </button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Load habits error:', err);
  }
}

function showAddHabit() {
  document.getElementById('add-habit-modal').classList.remove('hidden');
}

function closeAddHabit() {
  document.getElementById('add-habit-modal').classList.add('hidden');
}

function selectCategory(el) {
  document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  selectedCategory = el.dataset.category;
}

const categoryIcons = {
  mindfulness: '🧘',
  movement: '🏃',
  sleep: '😴',
  nutrition: '🥗',
  social: '💬',
  creativity: '🎨',
  growth: '📚',
  'self-care': '🧖'
};

async function addHabit() {
  const title = document.getElementById('habit-title').value.trim();
  if (!title) {
    showToast('Please give your habit a name', 'error');
    return;
  }

  const description = document.getElementById('habit-description').value.trim();
  const frequency = document.getElementById('habit-frequency').value;
  const is_micro = document.getElementById('habit-micro').checked;

  try {
    await fetch(`${API}/habits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id,
        title,
        description,
        category: selectedCategory,
        frequency,
        is_micro,
        icon: categoryIcons[selectedCategory] || '✨'
      })
    });

    showToast('New habit planted! Small steps, big changes.', 'success');
    closeAddHabit();
    document.getElementById('habit-title').value = '';
    document.getElementById('habit-description').value = '';
    loadHabits();
    loadDashboard();
  } catch (err) {
    showToast('Could not create habit.', 'error');
  }
}

async function toggleHabit(habitId, el) {
  try {
    const res = await fetch(`${API}/habits/${habitId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id })
    });

    const data = await res.json();

    if (data.already_done) {
      showToast('Already completed today!', 'info');
      return;
    }

    el.classList.add('done', 'completed');
    el.disabled = true;
    el.innerHTML = '<i class="fas fa-check"></i>';

    const nameEl = el.closest('.dashboard-habit-item, .habit-item')?.querySelector('.habit-name');
    if (nameEl) nameEl.classList.add('completed');

    showToast(`Done! ${data.streak > 1 ? `${data.streak} day streak!` : 'Great start!'}`, 'success');
    loadDashboard();
  } catch (err) {
    showToast('Could not complete habit.', 'error');
  }
}

// ==================== REFLECTIONS ====================

async function loadReflections() {
  await getNewPrompt();

  try {
    const res = await fetch(`${API}/reflections/${currentUser.id}`);
    const reflections = await res.json();

    const container = document.getElementById('reflections-list');
    if (reflections.length === 0) {
      container.innerHTML = '<p class="empty-state">Your reflections will appear here.</p>';
      return;
    }

    container.innerHTML = reflections.slice(0, 10).map(r => `
      <div class="reflection-item">
        <div class="reflection-q">${escapeHtml(r.prompt)}</div>
        <div class="reflection-a">${escapeHtml(r.response)}</div>
        <div class="reflection-date">${formatDate(r.created_at)}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Load reflections error:', err);
  }
}

async function getNewPrompt() {
  try {
    const res = await fetch(`${API}/reflections/prompt`);
    const data = await res.json();
    currentReflectionPrompt = data.prompt;
    document.getElementById('reflection-prompt').textContent = data.prompt;
  } catch (err) {
    document.getElementById('reflection-prompt').textContent = "What's on your mind right now?";
    currentReflectionPrompt = "What's on your mind right now?";
  }
}

async function submitReflection() {
  const response = document.getElementById('reflection-response').value.trim();
  if (!response) {
    showToast('Take a moment to write something — even one sentence counts.', 'info');
    return;
  }

  try {
    await fetch(`${API}/reflections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id,
        prompt: currentReflectionPrompt,
        response,
        companion_id: currentCompanion?.id
      })
    });

    showToast('Reflection saved. Your future self will thank you.', 'success');
    document.getElementById('reflection-response').value = '';
    loadReflections();
  } catch (err) {
    showToast('Could not save reflection.', 'error');
  }
}

// ==================== INSIGHTS ====================

async function loadInsights() {
  if (!currentUser) return;

  try {
    const [dashRes, trendsRes] = await Promise.all([
      fetch(`${API}/dashboard/${currentUser.id}`),
      fetch(`${API}/checkins/${currentUser.id}/trends`)
    ]);

    const dash = await dashRes.json();
    const trends = await trendsRes.json();

    document.getElementById('insight-streak').textContent = dash.streak_days;
    document.getElementById('insight-avg-mood').textContent = trends.averages?.mood || '--';
    document.getElementById('insight-conversations').textContent = dash.total_conversations;
    document.getElementById('insight-habits-done').textContent = dash.habits_completed;

    // Top emotions
    const emotionsContainer = document.getElementById('top-emotions-display');
    if (trends.top_emotions && trends.top_emotions.length > 0) {
      const maxCount = trends.top_emotions[0][1];
      emotionsContainer.innerHTML = trends.top_emotions.map(([emotion, count]) => `
        <div class="emotion-bar">
          <span class="emotion-bar-label">${emotion}</span>
          <div class="emotion-bar-track">
            <div class="emotion-bar-fill" style="width: ${(count / maxCount) * 100}%"></div>
          </div>
          <span class="emotion-bar-count">${count}</span>
        </div>
      `).join('');
    } else {
      emotionsContainer.innerHTML = '<p class="empty-state">Check in to see your emotional patterns.</p>';
    }

    // Mood trend
    const trendContainer = document.getElementById('mood-trend-display');
    const trendIcons = {
      improving: { icon: '📈', text: "Your mood has been improving! Keep it up!" },
      declining: { icon: '📉', text: "It's been a tough stretch. Remember to be gentle with yourself." },
      not_enough_data: { icon: '📊', text: "Keep checking in to reveal your patterns." }
    };
    const trend = trendIcons[trends.trend] || trendIcons.not_enough_data;
    trendContainer.innerHTML = `
      <div class="trend-icon">${trend.icon}</div>
      <div class="trend-text">${trend.text}</div>
    `;

    // Draw chart
    const checkins = await (await fetch(`${API}/checkins/${currentUser.id}?days=30`)).json();
    drawMoodChart('insights-mood-chart', checkins.map(c => ({
      mood_score: c.mood_score,
      date: c.created_at.split('T')[0]
    })), true);

  } catch (err) {
    console.error('Load insights error:', err);
  }
}

// ==================== COMPANION GALLERY ====================

async function loadCompanionGallery() {
  if (!currentUser) return;
  try {
    const res = await fetch(`${API}/users/${currentUser.id}/companions`);
    const userCompanions = await res.json();

    const grid = document.getElementById('companions-gallery-grid');
    grid.innerHTML = userCompanions.map(c => {
      const config = typeof c.avatar_config === 'string' ? JSON.parse(c.avatar_config) : c.avatar_config;
      return `
        <div class="gallery-companion-card ${c.is_active ? 'active-companion' : ''}">
          <div class="gallery-avatar-container" id="gallery-avatar-${c.id}"></div>
          <div class="gallery-companion-info">
            <h3>${c.name}</h3>
            <div class="persona">${c.persona}</div>
            <p>${c.description}</p>
            <div class="gallery-bond-info">
              <span>Bond: ${Math.round(c.bond_level || 0)}%</span>
              <span>${c.total_interactions || 0} conversations</span>
            </div>
            <button class="gallery-select-btn ${c.is_active ? 'active' : ''}"
                    onclick="${c.is_active ? '' : `switchCompanion('${c.id}')`}">
              ${c.is_active ? 'Active Companion' : 'Choose ' + c.name}
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Render mini avatars
    userCompanions.forEach(c => {
      const config = typeof c.avatar_config === 'string' ? JSON.parse(c.avatar_config) : c.avatar_config;
      const container = document.getElementById(`gallery-avatar-${c.id}`);
      if (container) {
        try {
          avatarRenderer.createAvatar(container, config, {
            id: `gallery-${c.id}`,
            width: 120,
            height: 140
          });
        } catch (e) {
          container.innerHTML = `<div class="companion-avatar-placeholder" style="background: ${getAvatarGradient(config)}; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #fff; border-radius: 12px;">${c.name[0]}</div>`;
        }
      }
    });

  } catch (err) {
    console.error('Load gallery error:', err);
  }
}

async function switchCompanion(companionId) {
  try {
    await fetch(`${API}/users/${currentUser.id}/companions/${companionId}/activate`, { method: 'PUT' });
    const companion = companions.find(c => c.id === companionId);
    if (companion) {
      currentCompanion = companion;
      showToast(`${companion.name} is ready to chat!`, 'success');
      loadCompanionGallery();
      loadDashboard();
    }
  } catch (err) {
    showToast('Could not switch companion.', 'error');
  }
}

// ==================== SETTINGS ====================

function setTheme(theme, save = true) {
  document.body.dataset.theme = theme === 'sanctuary' ? '' : theme;
  if (theme === 'sanctuary') document.body.removeAttribute('data-theme');
  else document.body.setAttribute('data-theme', theme);

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });

  if (save) {
    localStorage.setItem('reverie_theme', theme);
    showToast('Theme updated', 'success');
  }
}

async function exportData() {
  if (!currentUser) return;
  try {
    const res = await fetch(`${API}/users/${currentUser.id}/export`);
    const data = await res.json();

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reverie-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Data exported successfully', 'success');
  } catch (err) {
    showToast('Export failed', 'error');
  }
}

function confirmDeleteData() {
  if (confirm('Are you sure you want to delete ALL your data? This cannot be undone.')) {
    if (confirm('Really sure? This will permanently erase everything.')) {
      deleteAllData();
    }
  }
}

async function deleteAllData() {
  try {
    await fetch(`${API}/users/${currentUser.id}/data`, { method: 'DELETE' });
    localStorage.removeItem('reverie_user');
    localStorage.removeItem('reverie_theme');
    currentUser = null;
    currentCompanion = null;
    window.location.reload();
  } catch (err) {
    showToast('Could not delete data.', 'error');
  }
}

// ==================== CHARTS ====================

function drawMoodChart(canvasId, data, large = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !data || data.length === 0) return;

  const ctx = canvas.getContext('2d');
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = (large ? 250 : 160) * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = (large ? 250 : 160) + 'px';
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = large ? 250 : 160;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  ctx.clearRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i += 2) {
    const y = padding.top + chartH - (i / 10) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(i, padding.left - 8, y + 4);
  }

  if (data.length < 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Keep checking in to see trends', w / 2, h / 2);
    return;
  }

  // Data points
  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.mood_score || d.mood) / 10) * chartH
  }));

  // Gradient fill
  const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
  gradient.addColorStop(0, 'rgba(126, 176, 155, 0.3)');
  gradient.addColorStop(1, 'rgba(126, 176, 155, 0)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, h - padding.bottom);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, h - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const xc = (points[i].x + points[i - 1].x) / 2;
    const yc = (points[i].y + points[i - 1].y) / 2;
    ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.strokeStyle = '#7EB09B';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Dots
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#7EB09B';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });

  // Date labels
  if (large && data.length > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(data.length / 6));
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        const date = d.date || d.created_at?.split('T')[0];
        if (date) {
          const short = date.slice(5);
          ctx.fillText(short, points[i].x, h - 8);
        }
      }
    });
  }
}

// ==================== PARTICLES ====================

function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animFrame;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    const count = Math.min(60, Math.floor(window.innerWidth / 25));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.3 + 0.1
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(126, 176, 155, ${p.opacity})`;
      ctx.fill();
    });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(126, 176, 155, ${0.06 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    animFrame = requestAnimationFrame(draw);
  }

  resize();
  createParticles();
  draw();

  window.addEventListener('resize', () => {
    resize();
    createParticles();
  });
}

// ==================== UTILITIES ====================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(text, len) {
  return text.length > len ? text.slice(0, len) + '...' : text;
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSpecialty(s) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getAvatarGradient(config) {
  const c = typeof config === 'string' ? JSON.parse(config) : config;
  return `linear-gradient(135deg, ${c.accentColor || '#7EB09B'}, ${c.outfitColor || '#E8DDD3'})`;
}

// ==================== EXERCISES ====================

async function loadExerciseStats() {
  if (!currentUser) return;
  try {
    const res = await fetch(`${API}/exercises/${currentUser.id}/stats`);
    const data = await res.json();

    const container = document.getElementById('exercise-stats-content');
    if (!data.exercises || data.exercises.length === 0) {
      container.innerHTML = '<p class="empty-state">Complete your first exercise to see stats here!</p>';
      return;
    }

    const exerciseNames = {
      'box-breathing': 'Box Breathing',
      '478-breathing': '4-7-8 Breathing',
      'grounding': '5-4-3-2-1 Grounding',
      'body-scan': 'Body Scan',
      'meditation-timer': 'Meditation',
      'pmr': 'Muscle Relaxation',
      'sleep-stories': 'Sleep Stories'
    };

    container.innerHTML = `
      <div class="exercise-stats-summary">
        <div class="stat-item"><strong>${data.total}</strong> exercises completed</div>
      </div>
      ${data.exercises.map(e => `
        <div class="exercise-stat-row">
          <span class="exercise-stat-name">${exerciseNames[e.exercise_type] || e.exercise_type}</span>
          <span class="exercise-stat-count">${e.count}x</span>
          <span class="exercise-stat-time">${Math.round((e.total_seconds || 0) / 60)} min total</span>
        </div>
      `).join('')}
    `;
  } catch (e) {}
}

// Override exercise completion to log to backend
const _origCloseExercise = window.closeExercise;
window.addEventListener('exerciseComplete', async (e) => {
  if (!currentUser) return;
  const { type, duration } = e.detail || {};
  try {
    await fetch(`${API}/exercises/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id,
        exercise_type: type || 'unknown',
        duration_seconds: duration || 0
      })
    });
    checkAchievements();
  } catch (e) {}
});

// ==================== ACHIEVEMENTS ====================

async function loadAchievementsView() {
  if (!achievementSystem || !currentUser) return;

  await checkAchievements();

  const all = achievementSystem.getAll();
  const progress = achievementSystem.getProgress();

  const progressFill = document.getElementById('achievement-progress-fill');
  if (progressFill) progressFill.style.width = `${progress}%`;
  const progressText = document.getElementById('achievement-progress-text');
  if (progressText) progressText.textContent = `${Math.round(progress)}% Complete (${achievementSystem.getEarned().length}/${all.length})`;

  const grid = document.getElementById('achievements-grid');
  if (!grid) return;

  const categories = {};
  all.forEach(a => {
    if (!categories[a.category]) categories[a.category] = [];
    categories[a.category].push(a);
  });

  grid.innerHTML = Object.entries(categories).map(([cat, achievements]) => `
    <div class="achievement-category">
      <h3 class="achievement-cat-title">${cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
      <div class="achievement-cat-grid">
        ${achievements.map(a => `
          <div class="achievement-item ${a.earned ? 'earned' : 'locked'}">
            <div class="achievement-icon-wrap">
              <span class="achievement-icon">${a.icon}</span>
            </div>
            <div class="achievement-info">
              <h4>${a.name}</h4>
              <p>${a.description}</p>
            </div>
            ${a.earned ? '<i class="fas fa-check-circle achievement-check"></i>' : '<i class="fas fa-lock achievement-lock-icon"></i>'}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

async function checkAchievements() {
  if (!achievementSystem || !currentUser) return;

  try {
    const res = await fetch(`${API}/achievements/${currentUser.id}/stats`);
    const stats = await res.json();
    const newlyEarned = achievementSystem.checkAll(stats);

    for (const achievement of newlyEarned) {
      achievementSystem.showUnlockNotification(achievement);

      await fetch(`${API}/achievements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          achievement_key: achievement.key
        })
      });
    }
  } catch (e) {}
}

// ==================== SETTINGS FEATURES ====================

async function saveApiKey() {
  const input = document.getElementById('api-key-input');
  const key = input.value.trim();
  if (!key) {
    showToast('Please enter an API key', 'error');
    return;
  }

  try {
    await fetch(`${API}/users/${currentUser.id}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_api_key: key })
    });

    userSettings.has_api_key = true;
    input.value = '';
    const status = document.getElementById('api-key-status');
    status.textContent = 'API key configured — AI-powered responses active';
    status.style.color = 'var(--accent-primary)';
    showToast('API key saved! Your companions are now AI-powered.', 'success');
  } catch (e) {
    showToast('Could not save API key', 'error');
  }
}

async function toggleVoice(enabled) {
  if (!currentUser) return;
  userSettings.voice_enabled = enabled ? 1 : 0;
  try {
    await fetch(`${API}/users/${currentUser.id}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_enabled: enabled ? 1 : 0 })
    });
    showToast(enabled ? 'Voice input enabled' : 'Voice input disabled', 'success');
  } catch (e) {}
}

async function toggleAutoSpeak(enabled) {
  if (!currentUser) return;
  userSettings.auto_speak = enabled ? 1 : 0;
  try {
    await fetch(`${API}/users/${currentUser.id}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto_speak: enabled ? 1 : 0 })
    });
    showToast(enabled ? 'Companions will now speak responses' : 'Auto-speak disabled', 'success');
  } catch (e) {}
}

async function enableNotifications() {
  if (!notifManager) {
    showToast('Notifications not supported in this browser', 'info');
    return;
  }

  const result = await notifManager.requestPermission();
  if (result === 'granted') {
    showToast('Notifications enabled!', 'success');
    loadNotificationPrefs();
  } else {
    showToast('Notification permission denied', 'info');
  }
}

async function loadNotificationPrefs() {
  if (!currentUser || !notifManager) return;

  try {
    const res = await fetch(`${API}/users/${currentUser.id}/notifications`);
    const prefs = await res.json();

    const container = document.getElementById('notification-prefs-container');
    container.innerHTML = notifManager.createPreferencesUI(prefs, saveNotificationPrefs);
  } catch (e) {}
}

async function saveNotificationPrefs() {
  if (!currentUser) return;

  const prefs = {
    checkin_reminder: document.getElementById('pref-checkin')?.checked ? 1 : 0,
    checkin_time: document.getElementById('pref-checkin-time')?.value || '09:00',
    habit_reminders: document.getElementById('pref-habits')?.checked ? 1 : 0,
    evening_reflection: document.getElementById('pref-evening')?.checked ? 1 : 0,
    evening_time: document.getElementById('pref-evening-time')?.value || '20:00',
    companion_messages: document.getElementById('pref-companion')?.checked ? 1 : 0,
    achievement_alerts: document.getElementById('pref-achievements')?.checked ? 1 : 0
  };

  try {
    await fetch(`${API}/users/${currentUser.id}/notifications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    });

    notifManager.scheduleReminders(prefs);
    showToast('Notification preferences saved!', 'success');
  } catch (e) {
    showToast('Could not save preferences', 'error');
  }
}

function loadSettingsState() {
  loadUserSettings();
  if (notifManager && notifManager.isEnabled()) {
    loadNotificationPrefs();
  }
}

async function installPWA() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  if (result.outcome === 'accepted') {
    showToast('Reverie installed! Find it on your home screen.', 'success');
  }
  deferredInstallPrompt = null;
  document.getElementById('install-pwa-btn').style.display = 'none';
}

// ==================== AMBIENT SOUNDS ====================

function toggleAmbientSounds() {
  if (!window.AmbientSounds) return;
  AmbientSounds.toggle();
  const btn = document.getElementById('ambient-toggle-btn');
  if (btn) {
    btn.classList.toggle('playing', AmbientSounds.isPlaying());
    btn.innerHTML = AmbientSounds.isPlaying()
      ? '<i class="fas fa-pause"></i>'
      : '<i class="fas fa-play"></i>';
  }
}

function switchAmbientProfile(profile, el) {
  if (!window.AmbientSounds) return;
  document.querySelectorAll('.ambient-profile-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  AmbientSounds.fadeToProfile(profile, 2000);
  const btn = document.getElementById('ambient-toggle-btn');
  if (btn) {
    btn.classList.add('playing');
    btn.innerHTML = '<i class="fas fa-pause"></i>';
  }
}

function setAmbientVolume(value) {
  if (!window.AmbientSounds) return;
  AmbientSounds.setVolume(parseInt(value) / 100);
}

// ==================== COMPANION LORE ====================

function openCompanionLore() {
  if (!window.CompanionLore || !currentCompanion) return;
  const bondFill = document.getElementById('bond-fill');
  const bondLevel = parseFloat(bondFill?.style.width) || 0;
  const html = CompanionLore.renderLoreModal(currentCompanion.id, bondLevel);
  if (html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstElementChild);
  }
}

// ==================== COMMUNITY WALL ====================

function loadCommunityView() {
  if (!window.CommunityWall) return;

  const shareForm = document.getElementById('community-share-form');
  if (shareForm) shareForm.innerHTML = CommunityWall.renderShareForm();

  renderCommunityFeed();
}

function renderCommunityFeed() {
  if (!window.CommunityWall) return;
  const feed = document.getElementById('community-feed');
  if (feed) feed.innerHTML = CommunityWall.renderFeed(20);
}

function filterCommunity(category, el) {
  currentCommunityFilter = category;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderCommunityFeed();
}

// ==================== DREAM JOURNAL ====================

function loadDreamsView() {
  if (!window.DreamJournal) return;

  const recordTab = document.getElementById('dream-tab-record');
  if (recordTab) recordTab.innerHTML = DreamJournal.renderDreamForm();

  loadDreamHistory();
  loadDreamInsights();
}

function showDreamTab(tab, el) {
  document.querySelectorAll('.dreams-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.dream-tab-content').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const content = document.getElementById(`dream-tab-${tab}`);
  if (content) content.classList.add('active');

  if (tab === 'history') loadDreamHistory();
  if (tab === 'insights') loadDreamInsights();
}

function loadDreamHistory() {
  if (!window.DreamJournal) return;
  const container = document.getElementById('dream-tab-history');
  if (!container) return;
  const dreams = DreamJournal.getDreams(30);
  container.innerHTML = DreamJournal.renderDreamList(dreams);
}

function loadDreamInsights() {
  if (!window.DreamJournal) return;
  const container = document.getElementById('dream-tab-insights');
  if (!container) return;
  const stats = DreamJournal.getDreamStats();
  container.innerHTML = DreamJournal.renderDreamInsights(stats);
}

// ==================== WEEKLY REPORT ====================

function loadWeeklyReport() {
  if (!window.WeeklyReport || !currentUser) return;
  const container = document.getElementById('weekly-report-container');
  if (!container) return;
  container.innerHTML = '';
  container.appendChild(WeeklyReport.renderReportView(currentUser.id));
}

// ==================== DAILY CHALLENGES ====================

function loadChallengesView() {
  if (!window.DailyChallenges) return;

  const cardContainer = document.getElementById('challenge-card-container');
  if (cardContainer) cardContainer.innerHTML = DailyChallenges.renderChallengeCard();

  const historyContainer = document.getElementById('challenge-history-container');
  if (historyContainer) historyContainer.innerHTML = DailyChallenges.renderHistoryList();
}

function completeDashboardChallenge(challengeId) {
  if (!window.DailyChallenges) return;
  DailyChallenges.completeChallenge(challengeId);
  loadDashboard();
  showToast('Challenge completed! Nice work!', 'success');
}

// Auto-resize chat input
document.addEventListener('input', (e) => {
  if (e.target.id === 'chat-input') {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }
});
