const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const aiService = require('../services/ai-service');
const PersonalityEngine = require('../services/personality-engine');
const ClaudeService = require('../services/claude-service');

// ==================== USER ROUTES ====================

router.post('/users', (req, res) => {
  const db = getDb();
  const { display_name, pin } = req.body;
  const id = uuidv4();

  try {
    db.prepare('INSERT INTO users (id, display_name) VALUES (?, ?)').run(id, display_name || 'Friend');
    db.prepare(`INSERT INTO user_profiles (user_id) VALUES (?)`).run(id);
    db.prepare('INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)').run(id);
    db.prepare('INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)').run(id);

    const companions = db.prepare('SELECT id FROM companions').all();
    const insertCompanion = db.prepare('INSERT INTO user_companions (user_id, companion_id) VALUES (?, ?)');
    for (const c of companions) {
      insertCompanion.run(id, c.id);
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json({ user, message: 'Welcome to your sanctuary.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(user.id);
  res.json({ user, profile });
});

router.put('/users/:id/onboarding', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE users SET onboarding_complete = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== COMPANION ROUTES ====================

router.get('/companions', (req, res) => {
  const db = getDb();
  const companions = db.prepare('SELECT * FROM companions').all();
  res.json(companions.map(c => ({
    ...c,
    avatar_config: JSON.parse(c.avatar_config),
    specialties: JSON.parse(c.specialties),
    personality_traits: JSON.parse(c.personality_traits)
  })));
});

router.get('/companions/:id', (req, res) => {
  const db = getDb();
  const companion = db.prepare('SELECT * FROM companions WHERE id = ?').get(req.params.id);
  if (!companion) return res.status(404).json({ error: 'Companion not found' });

  res.json({
    ...companion,
    avatar_config: JSON.parse(companion.avatar_config),
    specialties: JSON.parse(companion.specialties),
    personality_traits: JSON.parse(companion.personality_traits)
  });
});

router.get('/users/:userId/companions', (req, res) => {
  const db = getDb();
  const companions = db.prepare(`
    SELECT c.*, uc.bond_level, uc.total_interactions, uc.is_active
    FROM companions c
    JOIN user_companions uc ON c.id = uc.companion_id
    WHERE uc.user_id = ?
    ORDER BY uc.is_active DESC, uc.bond_level DESC
  `).all(req.params.userId);

  res.json(companions.map(c => ({
    ...c,
    avatar_config: JSON.parse(c.avatar_config),
    specialties: JSON.parse(c.specialties),
    personality_traits: JSON.parse(c.personality_traits)
  })));
});

router.put('/users/:userId/companions/:companionId/activate', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE user_companions SET is_active = 0 WHERE user_id = ?').run(req.params.userId);
  db.prepare('UPDATE user_companions SET is_active = 1 WHERE user_id = ? AND companion_id = ?')
    .run(req.params.userId, req.params.companionId);
  res.json({ success: true });
});

// ==================== CHAT ROUTES ====================

router.post('/chat', async (req, res) => {
  const { user_id, companion_id, message } = req.body;
  if (!user_id || !companion_id || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const response = await aiService.generateResponse(user_id, companion_id, message);
    res.json(response);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'I had a moment — please try again.' });
  }
});

router.get('/chat/history/:userId/:companionId', (req, res) => {
  const db = getDb();
  const { limit = 50, offset = 0 } = req.query;
  const messages = db.prepare(`
    SELECT * FROM conversations
    WHERE user_id = ? AND companion_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.params.userId, req.params.companionId, parseInt(limit), parseInt(offset));

  res.json(messages.reverse());
});

// ==================== MOOD CHECK-IN ROUTES ====================

router.post('/checkins', (req, res) => {
  const db = getDb();
  const { user_id, mood_score, energy_level, anxiety_level, emotions, journal_entry, triggers, gratitude, companion_id } = req.body;
  const id = uuidv4();

  try {
    db.prepare(`
      INSERT INTO mood_checkins (id, user_id, mood_score, energy_level, anxiety_level, emotions, journal_entry, triggers, gratitude, companion_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, user_id, mood_score, energy_level || null, anxiety_level || null,
      JSON.stringify(emotions || []), journal_entry || null,
      JSON.stringify(triggers || []), JSON.stringify(gratitude || []), companion_id || null);

    const engine = new PersonalityEngine(user_id);
    if (emotions && emotions.length > 0) {
      emotions.forEach(e => engine.trackEmotionalPatterns(e));
    }

    res.json({ id, message: 'Check-in recorded. Thank you for being honest with yourself.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/checkins/:userId', (req, res) => {
  const db = getDb();
  const { days = 30 } = req.query;
  const checkins = db.prepare(`
    SELECT * FROM mood_checkins
    WHERE user_id = ? AND created_at >= datetime('now', ?)
    ORDER BY created_at DESC
  `).all(req.params.userId, `-${parseInt(days)} days`);

  res.json(checkins.map(c => ({
    ...c,
    emotions: JSON.parse(c.emotions),
    triggers: JSON.parse(c.triggers),
    gratitude: JSON.parse(c.gratitude)
  })));
});

router.get('/checkins/:userId/trends', (req, res) => {
  const db = getDb();
  const checkins = db.prepare(`
    SELECT mood_score, energy_level, anxiety_level, emotions, created_at
    FROM mood_checkins WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 30
  `).all(req.params.userId);

  const avgMood = checkins.reduce((s, c) => s + c.mood_score, 0) / (checkins.length || 1);
  const avgEnergy = checkins.filter(c => c.energy_level).reduce((s, c) => s + c.energy_level, 0) / (checkins.filter(c => c.energy_level).length || 1);
  const avgAnxiety = checkins.filter(c => c.anxiety_level).reduce((s, c) => s + c.anxiety_level, 0) / (checkins.filter(c => c.anxiety_level).length || 1);

  const allEmotions = checkins.flatMap(c => JSON.parse(c.emotions));
  const emotionCounts = {};
  allEmotions.forEach(e => { emotionCounts[e] = (emotionCounts[e] || 0) + 1; });

  res.json({
    period: `${checkins.length} check-ins`,
    averages: { mood: avgMood.toFixed(1), energy: avgEnergy.toFixed(1), anxiety: avgAnxiety.toFixed(1) },
    top_emotions: Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    trend: checkins.length >= 7
      ? (checkins.slice(0, 7).reduce((s, c) => s + c.mood_score, 0) / 7 >
         checkins.slice(-7).reduce((s, c) => s + c.mood_score, 0) / Math.min(7, checkins.length)
        ? 'improving' : 'declining')
      : 'not_enough_data'
  });
});

// ==================== HABIT ROUTES ====================

router.post('/habits', (req, res) => {
  const db = getDb();
  const { user_id, title, description, category, frequency, target_count, icon, color, is_micro, suggested_by } = req.body;
  const id = uuidv4();

  try {
    db.prepare(`
      INSERT INTO habits (id, user_id, title, description, category, frequency, target_count, icon, color, is_micro, suggested_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, user_id, title, description || '', category || 'wellness',
      frequency || 'daily', target_count || 1, icon || '✨', color || '#7EB09B',
      is_micro ? 1 : 0, suggested_by || null);

    db.prepare('INSERT INTO habit_streaks (user_id, habit_id) VALUES (?, ?)').run(user_id, id);
    res.json({ id, message: 'New habit created!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/habits/:userId', (req, res) => {
  const db = getDb();
  const habits = db.prepare(`
    SELECT h.*, hs.current_streak, hs.longest_streak, hs.last_completed
    FROM habits h
    LEFT JOIN habit_streaks hs ON h.id = hs.habit_id AND h.user_id = hs.user_id
    WHERE h.user_id = ? AND h.is_active = 1
    ORDER BY h.created_at ASC
  `).all(req.params.userId);

  const today = new Date().toISOString().split('T')[0];
  const completions = db.prepare(`
    SELECT habit_id FROM habit_completions
    WHERE user_id = ? AND date(completed_at) = ?
  `).all(req.params.userId, today);

  const completedIds = new Set(completions.map(c => c.habit_id));

  res.json(habits.map(h => ({
    ...h,
    completed_today: completedIds.has(h.id)
  })));
});

router.post('/habits/:habitId/complete', (req, res) => {
  const db = getDb();
  const { user_id, notes, mood_before, mood_after } = req.body;
  const id = uuidv4();
  const today = new Date().toISOString().split('T')[0];

  try {
    const existing = db.prepare(`
      SELECT id FROM habit_completions
      WHERE habit_id = ? AND user_id = ? AND date(completed_at) = ?
    `).get(req.params.habitId, user_id, today);

    if (existing) {
      return res.json({ message: 'Already completed today!', already_done: true });
    }

    db.prepare(`
      INSERT INTO habit_completions (id, habit_id, user_id, notes, mood_before, mood_after)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.params.habitId, user_id, notes || null, mood_before || null, mood_after || null);

    const streak = db.prepare('SELECT * FROM habit_streaks WHERE user_id = ? AND habit_id = ?')
      .get(user_id, req.params.habitId);

    if (streak) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const newStreak = streak.last_completed === yesterday ? streak.current_streak + 1 : 1;
      const longestStreak = Math.max(newStreak, streak.longest_streak);

      db.prepare(`
        UPDATE habit_streaks SET current_streak = ?, longest_streak = ?, last_completed = ?
        WHERE user_id = ? AND habit_id = ?
      `).run(newStreak, longestStreak, today, user_id, req.params.habitId);
    }

    res.json({ id, message: 'Habit completed! Keep going!', streak: streak?.current_streak + 1 || 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/habits/:habitId', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE habits SET is_active = 0 WHERE id = ?').run(req.params.habitId);
  res.json({ success: true });
});

// ==================== REFLECTION ROUTES ====================

router.get('/reflections/prompt', (req, res) => {
  const prompts = [
    "What's one thing you're proud of yourself for today?",
    "If your current emotion had a color, what would it be and why?",
    "What's something you'd tell your best friend if they were feeling the way you feel right now?",
    "Describe your ideal tomorrow in three sentences.",
    "What boundary do you need to set or reinforce this week?",
    "What's one small thing that brought you comfort recently?",
    "If you could let go of one worry right now, which would it be?",
    "Write a permission slip to yourself. What do you give yourself permission to do or feel?",
    "What does 'enough' look like for you today?",
    "Name three sounds you can hear right now. How do they make you feel?",
    "What's something you've been avoiding? What would happen if you gently faced it?",
    "Who made you feel seen this week? How can you do that for someone else?",
    "What would you do today if you weren't afraid?",
    "Describe your safe place — real or imagined. What makes it feel safe?",
    "What's one lesson you've learned from a difficult time that you're grateful for now?"
  ];

  res.json({
    prompt: prompts[Math.floor(Math.random() * prompts.length)],
    date: new Date().toISOString()
  });
});

router.post('/reflections', (req, res) => {
  const db = getDb();
  const { user_id, prompt, response, companion_id, mood_tag } = req.body;
  const id = uuidv4();

  try {
    db.prepare(`
      INSERT INTO reflections (id, user_id, prompt, response, companion_id, mood_tag)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, user_id, prompt, response, companion_id || null, mood_tag || null);

    res.json({ id, message: 'Reflection saved. Thank you for being honest with yourself.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reflections/:userId', (req, res) => {
  const db = getDb();
  const reflections = db.prepare(`
    SELECT * FROM reflections WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 30
  `).all(req.params.userId);

  res.json(reflections);
});

// ==================== DASHBOARD / INSIGHTS ====================

router.get('/dashboard/:userId', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const todayCheckin = db.prepare(`
    SELECT * FROM mood_checkins WHERE user_id = ? AND date(created_at) = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(req.params.userId, today);

  const habits = db.prepare(`
    SELECT h.*, hs.current_streak, hs.longest_streak
    FROM habits h
    LEFT JOIN habit_streaks hs ON h.id = hs.habit_id
    WHERE h.user_id = ? AND h.is_active = 1
  `).all(req.params.userId);

  const completedToday = db.prepare(`
    SELECT habit_id FROM habit_completions
    WHERE user_id = ? AND date(completed_at) = ?
  `).all(req.params.userId, today);

  const completedIds = new Set(completedToday.map(c => c.habit_id));

  const weekMoods = db.prepare(`
    SELECT mood_score, date(created_at) as date
    FROM mood_checkins WHERE user_id = ? AND created_at >= datetime('now', '-7 days')
    ORDER BY created_at
  `).all(req.params.userId);

  const activeCompanion = db.prepare(`
    SELECT c.* FROM companions c
    JOIN user_companions uc ON c.id = uc.companion_id
    WHERE uc.user_id = ? AND uc.is_active = 1
    LIMIT 1
  `).get(req.params.userId);

  const totalConversations = db.prepare(`
    SELECT COUNT(*) as count FROM conversations WHERE user_id = ? AND sender = 'user'
  `).get(req.params.userId);

  res.json({
    today_checkin: todayCheckin ? {
      ...todayCheckin,
      emotions: JSON.parse(todayCheckin.emotions || '[]')
    } : null,
    habits: habits.map(h => ({
      ...h,
      completed_today: completedIds.has(h.id)
    })),
    habits_completed: completedIds.size,
    habits_total: habits.length,
    week_moods: weekMoods,
    active_companion: activeCompanion ? {
      ...activeCompanion,
      avatar_config: JSON.parse(activeCompanion.avatar_config),
      personality_traits: JSON.parse(activeCompanion.personality_traits)
    } : null,
    total_conversations: totalConversations.count,
    streak_days: calculateStreak(db, req.params.userId)
  });
});

function calculateStreak(db, userId) {
  const checkins = db.prepare(`
    SELECT DISTINCT date(created_at) as date FROM mood_checkins
    WHERE user_id = ? ORDER BY date DESC
  `).all(userId);

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < checkins.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedDate = expected.toISOString().split('T')[0];
    if (checkins[i].date === expectedDate) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ==================== PRIVACY ====================

router.delete('/users/:id/data', (req, res) => {
  const db = getDb();
  const userId = req.params.id;

  const deleteAll = db.transaction(() => {
    db.prepare('DELETE FROM conversations WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM mood_checkins WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM habit_completions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM habit_streaks WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM habits WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM reflections WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM personality_insights WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM daily_summaries WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM achievements WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM exercise_completions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM dreams WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM community_posts WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM daily_challenge_completions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM notification_preferences WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM user_companions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM user_profiles WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });

  deleteAll();
  res.json({ message: 'All your data has been permanently deleted. Take care.' });
});

router.get('/users/:id/export', (req, res) => {
  const db = getDb();
  const userId = req.params.id;

  const data = {
    user: db.prepare('SELECT * FROM users WHERE id = ?').get(userId),
    profile: db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId),
    checkins: db.prepare('SELECT * FROM mood_checkins WHERE user_id = ?').all(userId),
    habits: db.prepare('SELECT * FROM habits WHERE user_id = ?').all(userId),
    reflections: db.prepare('SELECT * FROM reflections WHERE user_id = ?').all(userId),
    exported_at: new Date().toISOString()
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="reverie-export-${new Date().toISOString().split('T')[0]}.json"`);
  res.json(data);
});

// ==================== AI-POWERED CHAT ====================

const claudeService = new ClaudeService();

router.post('/chat/ai', async (req, res) => {
  const { user_id, companion_id, message } = req.body;
  if (!user_id || !companion_id || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const db = getDb();

  try {
    const companion = db.prepare('SELECT * FROM companions WHERE id = ?').get(companion_id);
    if (!companion) return res.status(404).json({ error: 'Companion not found' });

    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(user_id);

    if (settings && settings.ai_api_key_encrypted) {
      claudeService.setApiKey(settings.ai_api_key_encrypted);
    }

    if (claudeService.isConfigured()) {
      const engine = new PersonalityEngine(user_id);
      const systemPrompt = engine.generateSystemPrompt(companion);
      const emotion = aiService.detectEmotion(message);

      const recentMessages = db.prepare(`
        SELECT message, sender FROM conversations
        WHERE user_id = ? AND companion_id = ?
        ORDER BY created_at DESC LIMIT 20
      `).all(user_id, companion_id).reverse();

      const formattedHistory = recentMessages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.message
      }));

      const aiResponse = await claudeService.chat(systemPrompt, formattedHistory, message);

      if (aiResponse) {
        db.prepare(`
          INSERT INTO conversations (id, user_id, companion_id, message, sender, emotion_detected)
          VALUES (?, ?, ?, ?, 'user', ?)
        `).run(uuidv4(), user_id, companion_id, message, emotion);

        db.prepare(`
          INSERT INTO conversations (id, user_id, companion_id, message, sender)
          VALUES (?, ?, ?, ?, 'companion')
        `).run(uuidv4(), user_id, companion_id, aiResponse);

        engine.updateFromInteraction(message, emotion, aiResponse);
        aiService.updateBondLevel(user_id, companion_id);

        return res.json({
          message: aiResponse,
          emotion_detected: emotion,
          companion_name: companion.name,
          companion_expression: aiService.getExpression(emotion, companion),
          ai_powered: true
        });
      }
    }

    const response = await aiService.generateResponse(user_id, companion_id, message);
    res.json({ ...response, ai_powered: false });

  } catch (err) {
    console.error('AI Chat error:', err);
    try {
      const response = await aiService.generateResponse(user_id, companion_id, message);
      res.json({ ...response, ai_powered: false });
    } catch (fallbackErr) {
      res.status(500).json({ error: 'I had a moment — please try again.' });
    }
  }
});

// ==================== AI SETTINGS ====================

router.put('/users/:id/settings', (req, res) => {
  const db = getDb();
  const { ai_api_key, voice_enabled, auto_speak, theme, avatar_url } = req.body;

  try {
    const existing = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.params.id);

    if (existing) {
      db.prepare(`
        UPDATE user_settings SET
          ai_api_key_encrypted = COALESCE(?, ai_api_key_encrypted),
          voice_enabled = COALESCE(?, voice_enabled),
          auto_speak = COALESCE(?, auto_speak),
          theme = COALESCE(?, theme),
          avatar_url = COALESCE(?, avatar_url),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(ai_api_key || null, voice_enabled ?? null, auto_speak ?? null,
        theme || null, avatar_url || null, req.params.id);
    } else {
      db.prepare(`
        INSERT INTO user_settings (user_id, ai_api_key_encrypted, voice_enabled, auto_speak, theme, avatar_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(req.params.id, ai_api_key || null, voice_enabled || 0,
        auto_speak || 0, theme || 'sanctuary', avatar_url || null);
    }

    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id/settings', (req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.params.id);
  if (settings) {
    settings.has_api_key = !!settings.ai_api_key_encrypted;
    delete settings.ai_api_key_encrypted;
  }
  res.json(settings || { has_api_key: false, voice_enabled: 0, auto_speak: 0, theme: 'sanctuary' });
});

// ==================== EXERCISES ====================

router.post('/exercises/complete', (req, res) => {
  const db = getDb();
  const { user_id, exercise_type, duration_seconds } = req.body;
  const id = uuidv4();

  try {
    db.prepare(`
      INSERT INTO exercise_completions (id, user_id, exercise_type, duration_seconds)
      VALUES (?, ?, ?, ?)
    `).run(id, user_id, exercise_type, duration_seconds || 0);

    res.json({ id, message: 'Exercise completed! Your mind and body thank you.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/exercises/:userId/stats', (req, res) => {
  const db = getDb();
  const stats = db.prepare(`
    SELECT exercise_type, COUNT(*) as count, SUM(duration_seconds) as total_seconds
    FROM exercise_completions WHERE user_id = ?
    GROUP BY exercise_type
  `).all(req.params.userId);

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM exercise_completions WHERE user_id = ?
  `).get(req.params.userId);

  res.json({ exercises: stats, total: total.count });
});

// ==================== ACHIEVEMENTS ====================

router.get('/achievements/:userId', (req, res) => {
  const db = getDb();
  const earned = db.prepare('SELECT * FROM achievements WHERE user_id = ?').all(req.params.userId);
  res.json(earned);
});

router.post('/achievements', (req, res) => {
  const db = getDb();
  const { user_id, achievement_key } = req.body;
  const id = uuidv4();

  try {
    db.prepare(`INSERT OR IGNORE INTO achievements (id, user_id, achievement_key) VALUES (?, ?, ?)`)
      .run(id, user_id, achievement_key);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/achievements/:userId/stats', (req, res) => {
  const db = getDb();
  const userId = req.params.userId;

  const totalCheckins = db.prepare('SELECT COUNT(*) as c FROM mood_checkins WHERE user_id = ?').get(userId).c;
  const totalConversations = db.prepare("SELECT COUNT(*) as c FROM conversations WHERE user_id = ? AND sender = 'user'").get(userId).c;
  const totalHabits = db.prepare('SELECT COUNT(*) as c FROM habit_completions WHERE user_id = ?').get(userId).c;
  const totalReflections = db.prepare('SELECT COUNT(*) as c FROM reflections WHERE user_id = ?').get(userId).c;
  const totalExercises = db.prepare('SELECT COUNT(*) as c FROM exercise_completions WHERE user_id = ?').get(userId).c;

  const exerciseTypes = db.prepare('SELECT DISTINCT exercise_type FROM exercise_completions WHERE user_id = ?')
    .all(userId).map(e => e.exercise_type);

  const companionConvos = {};
  db.prepare("SELECT companion_id, COUNT(*) as c FROM conversations WHERE user_id = ? AND sender = 'user' GROUP BY companion_id")
    .all(userId).forEach(r => { companionConvos[r.companion_id] = r.c; });

  const bondLevels = {};
  db.prepare('SELECT companion_id, bond_level FROM user_companions WHERE user_id = ?')
    .all(userId).forEach(r => { bondLevels[r.companion_id] = r.bond_level; });

  const habitStreaks = db.prepare('SELECT MAX(current_streak) as max_streak FROM habit_streaks WHERE user_id = ?')
    .get(userId).max_streak || 0;

  const daysActive = db.prepare("SELECT COUNT(DISTINCT date(created_at)) as c FROM mood_checkins WHERE user_id = ?")
    .get(userId).c;

  const streak = calculateStreak(db, userId);

  res.json({
    streak,
    totalCheckins,
    totalConversations,
    totalHabits,
    totalReflections,
    totalExercises,
    exerciseTypes,
    companionConversations: companionConvos,
    bondLevels,
    habitStreaks,
    daysActive
  });
});

// ==================== NOTIFICATION PREFERENCES ====================

router.get('/users/:id/notifications', (req, res) => {
  const db = getDb();
  let prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(req.params.id);
  if (!prefs) {
    db.prepare('INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)').run(req.params.id);
    prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(req.params.id);
  }
  res.json(prefs);
});

router.put('/users/:id/notifications', (req, res) => {
  const db = getDb();
  const { checkin_reminder, checkin_time, habit_reminders, evening_reflection, evening_time, companion_messages, achievement_alerts } = req.body;

  try {
    db.prepare('INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)').run(req.params.id);

    db.prepare(`
      UPDATE notification_preferences SET
        checkin_reminder = COALESCE(?, checkin_reminder),
        checkin_time = COALESCE(?, checkin_time),
        habit_reminders = COALESCE(?, habit_reminders),
        evening_reflection = COALESCE(?, evening_reflection),
        evening_time = COALESCE(?, evening_time),
        companion_messages = COALESCE(?, companion_messages),
        achievement_alerts = COALESCE(?, achievement_alerts)
      WHERE user_id = ?
    `).run(checkin_reminder ?? null, checkin_time || null, habit_reminders ?? null,
      evening_reflection ?? null, evening_time || null, companion_messages ?? null,
      achievement_alerts ?? null, req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ENHANCED DASHBOARD ====================

router.get('/dashboard/:userId/full', (req, res) => {
  const db = getDb();
  const userId = req.params.userId;
  const today = new Date().toISOString().split('T')[0];

  try {
    const todayCheckin = db.prepare(`
      SELECT * FROM mood_checkins WHERE user_id = ? AND date(created_at) = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(userId, today);

    const habits = db.prepare(`
      SELECT h.*, hs.current_streak, hs.longest_streak
      FROM habits h LEFT JOIN habit_streaks hs ON h.id = hs.habit_id
      WHERE h.user_id = ? AND h.is_active = 1
    `).all(userId);

    const completedToday = db.prepare(`
      SELECT habit_id FROM habit_completions WHERE user_id = ? AND date(completed_at) = ?
    `).all(userId, today);
    const completedIds = new Set(completedToday.map(c => c.habit_id));

    const weekMoods = db.prepare(`
      SELECT mood_score, date(created_at) as date FROM mood_checkins
      WHERE user_id = ? AND created_at >= datetime('now', '-7 days') ORDER BY created_at
    `).all(userId);

    const activeCompanion = db.prepare(`
      SELECT c.*, uc.bond_level, uc.total_interactions FROM companions c
      JOIN user_companions uc ON c.id = uc.companion_id
      WHERE uc.user_id = ? AND uc.is_active = 1 LIMIT 1
    `).get(userId);

    const totalConversations = db.prepare("SELECT COUNT(*) as count FROM conversations WHERE user_id = ? AND sender = 'user'").get(userId);
    const totalExercises = db.prepare('SELECT COUNT(*) as count FROM exercise_completions WHERE user_id = ?').get(userId);
    const achievements = db.prepare('SELECT COUNT(*) as count FROM achievements WHERE user_id = ?').get(userId);
    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);

    res.json({
      today_checkin: todayCheckin ? { ...todayCheckin, emotions: JSON.parse(todayCheckin.emotions || '[]') } : null,
      habits: habits.map(h => ({ ...h, completed_today: completedIds.has(h.id) })),
      habits_completed: completedIds.size,
      habits_total: habits.length,
      week_moods: weekMoods,
      active_companion: activeCompanion ? {
        ...activeCompanion,
        avatar_config: JSON.parse(activeCompanion.avatar_config),
        personality_traits: JSON.parse(activeCompanion.personality_traits)
      } : null,
      total_conversations: totalConversations.count,
      total_exercises: totalExercises.count,
      total_achievements: achievements.count,
      streak_days: calculateStreak(db, userId),
      has_ai: !!(settings && settings.ai_api_key_encrypted),
      settings: settings ? {
        voice_enabled: settings.voice_enabled,
        auto_speak: settings.auto_speak,
        theme: settings.theme,
        avatar_url: settings.avatar_url
      } : null
    });
  } catch (err) {
    console.error('Full dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== DREAM JOURNAL ====================

router.post('/dreams', (req, res) => {
  const db = getDb();
  const { user_id, title, content, mood, themes, lucid } = req.body;
  const id = uuidv4();
  try {
    db.prepare(`INSERT INTO dreams (id, user_id, title, content, mood, themes, lucid) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, user_id, title, content, mood || null, JSON.stringify(themes || []), lucid ? 1 : 0);
    res.json({ id, message: 'Dream captured.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/dreams/:userId', (req, res) => {
  const db = getDb();
  const dreams = db.prepare('SELECT * FROM dreams WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.params.userId);
  res.json(dreams.map(d => ({ ...d, themes: JSON.parse(d.themes || '[]') })));
});

router.delete('/dreams/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM dreams WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== COMMUNITY WALL ====================

router.get('/community', (req, res) => {
  const db = getDb();
  const { category, limit = 30, offset = 0 } = req.query;
  let query = 'SELECT * FROM community_posts';
  const params = [];
  if (category) {
    query += ' WHERE category = ?';
    params.push(category);
  }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  const posts = db.prepare(query).all(...params);
  res.json(posts);
});

router.post('/community', (req, res) => {
  const db = getDb();
  const { user_id, content, category, emoji } = req.body;
  const id = uuidv4();
  try {
    db.prepare('INSERT INTO community_posts (id, user_id, content, category, emoji) VALUES (?, ?, ?, ?, ?)')
      .run(id, user_id || null, content, category || 'reflection', emoji || null);
    res.json({ id, message: 'Post shared anonymously.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/community/:id/like', (req, res) => {
  const db = getDb();
  try {
    db.prepare('UPDATE community_posts SET likes = likes + 1 WHERE id = ?').run(req.params.id);
    const post = db.prepare('SELECT likes FROM community_posts WHERE id = ?').get(req.params.id);
    res.json({ likes: post ? post.likes : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== DAILY CHALLENGES ====================

router.post('/challenges/complete', (req, res) => {
  const db = getDb();
  const { user_id, challenge_id, challenge_title } = req.body;
  const id = uuidv4();
  try {
    db.prepare('INSERT OR IGNORE INTO daily_challenge_completions (id, user_id, challenge_id, challenge_title) VALUES (?, ?, ?, ?)')
      .run(id, user_id, challenge_id, challenge_title || '');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
