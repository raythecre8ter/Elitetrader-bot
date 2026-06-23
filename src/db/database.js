const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'serenity.db');

let db;

function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDatabase() {
  const conn = getDb();

  conn.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      pin_hash TEXT,
      privacy_level TEXT DEFAULT 'standard',
      onboarding_complete INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      communication_style TEXT DEFAULT 'balanced',
      humor_level REAL DEFAULT 0.5,
      formality_level REAL DEFAULT 0.5,
      encouragement_style TEXT DEFAULT 'gentle',
      preferred_topics TEXT DEFAULT '[]',
      avoided_topics TEXT DEFAULT '[]',
      energy_pattern TEXT DEFAULT 'neutral',
      response_length_pref TEXT DEFAULT 'medium',
      personality_vector TEXT DEFAULT '{}',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS companions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      persona TEXT NOT NULL,
      description TEXT NOT NULL,
      avatar_config TEXT NOT NULL,
      voice_style TEXT NOT NULL,
      specialties TEXT NOT NULL,
      greeting TEXT NOT NULL,
      personality_traits TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_companions (
      user_id TEXT REFERENCES users(id),
      companion_id TEXT REFERENCES companions(id),
      is_active INTEGER DEFAULT 1,
      bond_level REAL DEFAULT 0.0,
      total_interactions INTEGER DEFAULT 0,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, companion_id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      companion_id TEXT REFERENCES companions(id),
      message TEXT NOT NULL,
      sender TEXT NOT NULL,
      emotion_detected TEXT,
      context_tags TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mood_checkins (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      mood_score INTEGER NOT NULL CHECK(mood_score BETWEEN 1 AND 10),
      energy_level INTEGER CHECK(energy_level BETWEEN 1 AND 10),
      anxiety_level INTEGER CHECK(anxiety_level BETWEEN 1 AND 10),
      emotions TEXT DEFAULT '[]',
      journal_entry TEXT,
      triggers TEXT DEFAULT '[]',
      gratitude TEXT DEFAULT '[]',
      companion_id TEXT REFERENCES companions(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      frequency TEXT DEFAULT 'daily',
      target_count INTEGER DEFAULT 1,
      icon TEXT,
      color TEXT,
      reminder_time TEXT,
      is_active INTEGER DEFAULT 1,
      is_micro INTEGER DEFAULT 0,
      suggested_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS habit_completions (
      id TEXT PRIMARY KEY,
      habit_id TEXT REFERENCES habits(id),
      user_id TEXT REFERENCES users(id),
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      mood_before INTEGER,
      mood_after INTEGER
    );

    CREATE TABLE IF NOT EXISTS habit_streaks (
      user_id TEXT,
      habit_id TEXT REFERENCES habits(id),
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_completed DATE,
      PRIMARY KEY (user_id, habit_id)
    );

    CREATE TABLE IF NOT EXISTS reflections (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      companion_id TEXT,
      mood_tag TEXT,
      insight_tags TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS personality_insights (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      insight_type TEXT NOT NULL,
      insight_key TEXT NOT NULL,
      insight_value TEXT NOT NULL,
      confidence REAL DEFAULT 0.5,
      evidence_count INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, insight_type, insight_key)
    );

    CREATE TABLE IF NOT EXISTS daily_summaries (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      summary_date DATE NOT NULL,
      mood_average REAL,
      habits_completed INTEGER DEFAULT 0,
      habits_total INTEGER DEFAULT 0,
      highlight TEXT,
      companion_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, summary_date)
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      achievement_key TEXT NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, achievement_key)
    );

    CREATE TABLE IF NOT EXISTS exercise_completions (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      exercise_type TEXT NOT NULL,
      duration_seconds INTEGER,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      checkin_reminder INTEGER DEFAULT 1,
      checkin_time TEXT DEFAULT '09:00',
      habit_reminders INTEGER DEFAULT 1,
      evening_reflection INTEGER DEFAULT 1,
      evening_time TEXT DEFAULT '20:00',
      companion_messages INTEGER DEFAULT 1,
      achievement_alerts INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      ai_api_key_encrypted TEXT,
      voice_enabled INTEGER DEFAULT 0,
      auto_speak INTEGER DEFAULT 0,
      theme TEXT DEFAULT 'sanctuary',
      avatar_url TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_mood_checkins_user ON mood_checkins(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_habit_completions_user ON habit_completions(user_id, completed_at);
    CREATE INDEX IF NOT EXISTS idx_personality_insights_user ON personality_insights(user_id, insight_type);
    CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
    CREATE INDEX IF NOT EXISTS idx_exercise_completions_user ON exercise_completions(user_id, completed_at);
  `);

  seedCompanions(conn);
  console.log('Database initialized successfully');
}

function seedCompanions(conn) {
  const count = conn.prepare('SELECT COUNT(*) as c FROM companions').get();
  if (count.c > 0) return;

  const companions = [
    {
      id: 'aria',
      name: 'Aria',
      persona: 'The Gentle Guide',
      description: 'Warm, empathetic, and nurturing. Aria feels like talking to your wisest, most caring friend. She specializes in emotional awareness and helps you navigate feelings with grace and understanding.',
      avatar_config: JSON.stringify({
        bodyType: 'feminine',
        skinTone: '#D4A574',
        hairColor: '#2C1810',
        hairStyle: 'flowing',
        eyeColor: '#4A7C59',
        outfit: 'soft_flowing',
        outfitColor: '#E8DDD3',
        accentColor: '#7EB09B',
        aura: 'warm_golden',
        expression: 'gentle_smile',
        accessories: ['crystal_pendant']
      }),
      voice_style: 'warm, melodic, unhurried',
      specialties: JSON.stringify(['emotional_awareness', 'self_compassion', 'anxiety_relief', 'grief_support']),
      greeting: "Hey there, beautiful soul. I'm so glad you're here. How's your heart feeling today?",
      personality_traits: JSON.stringify({
        warmth: 0.95, patience: 0.9, humor: 0.4, directness: 0.3,
        empathy: 0.98, playfulness: 0.35, wisdom: 0.85, energy: 0.5
      })
    },
    {
      id: 'kai',
      name: 'Kai',
      persona: 'The Mindful Warrior',
      description: 'Calm, grounded, and resilient. Kai combines mindfulness wisdom with an action-oriented approach. He helps you build inner strength through meditation, breathwork, and intentional living.',
      avatar_config: JSON.stringify({
        bodyType: 'masculine',
        skinTone: '#8D6E4C',
        hairColor: '#1A1A2E',
        hairStyle: 'short_textured',
        eyeColor: '#3D2B1F',
        outfit: 'zen_modern',
        outfitColor: '#2D3436',
        accentColor: '#6C5CE7',
        aura: 'deep_blue',
        expression: 'serene_confident',
        accessories: ['mala_beads']
      }),
      voice_style: 'deep, calm, grounding',
      specialties: JSON.stringify(['meditation', 'breathwork', 'stress_management', 'resilience', 'focus']),
      greeting: "Welcome back. Take a breath with me — in... and out. Good. Now, what would you like to explore today?",
      personality_traits: JSON.stringify({
        warmth: 0.7, patience: 0.95, humor: 0.3, directness: 0.6,
        empathy: 0.8, playfulness: 0.25, wisdom: 0.95, energy: 0.55
      })
    },
    {
      id: 'luna',
      name: 'Luna',
      persona: 'The Creative Spirit',
      description: 'Imaginative, uplifting, and playfully wise. Luna uses creativity, storytelling, and gentle humor to help you see life from fresh perspectives. She makes self-care feel like an adventure.',
      avatar_config: JSON.stringify({
        bodyType: 'feminine',
        skinTone: '#F5D6C3',
        hairColor: '#C4A1FF',
        hairStyle: 'wavy_long',
        eyeColor: '#7B68EE',
        outfit: 'artistic_bohemian',
        outfitColor: '#DDD6FE',
        accentColor: '#F59E0B',
        aura: 'iridescent',
        expression: 'bright_curious',
        accessories: ['star_earrings', 'flower_crown']
      }),
      voice_style: 'bright, musical, expressive',
      specialties: JSON.stringify(['creativity', 'journaling', 'reframing', 'joy_cultivation', 'self_expression']),
      greeting: "Oh hey, you! ✨ I was just thinking about you. Ready to sprinkle a little magic into your day?",
      personality_traits: JSON.stringify({
        warmth: 0.85, patience: 0.7, humor: 0.8, directness: 0.4,
        empathy: 0.85, playfulness: 0.9, wisdom: 0.7, energy: 0.85
      })
    },
    {
      id: 'sage',
      name: 'Sage',
      persona: 'The Wise Elder',
      description: 'Thoughtful, steady, and profoundly insightful. Sage draws from philosophy, psychology, and timeless wisdom traditions. They help you find deeper meaning and navigate life\'s biggest questions.',
      avatar_config: JSON.stringify({
        bodyType: 'androgynous',
        skinTone: '#C49A6C',
        hairColor: '#SILVER',
        hairStyle: 'elegant_short',
        eyeColor: '#808080',
        outfit: 'scholarly_elegant',
        outfitColor: '#4A4A68',
        accentColor: '#B8860B',
        aura: 'silver_gold',
        expression: 'knowing_kind',
        accessories: ['reading_glasses', 'ancient_ring']
      }),
      voice_style: 'measured, rich, contemplative',
      specialties: JSON.stringify(['philosophy', 'meaning_making', 'life_transitions', 'deep_reflection', 'values']),
      greeting: "It's good to see you again. Every visit here is a step toward knowing yourself more deeply. What's on your mind?",
      personality_traits: JSON.stringify({
        warmth: 0.75, patience: 0.95, humor: 0.5, directness: 0.7,
        empathy: 0.85, playfulness: 0.3, wisdom: 0.98, energy: 0.4
      })
    },
    {
      id: 'nova',
      name: 'Nova',
      persona: 'The Hype Friend',
      description: 'Energetic, encouraging, and authentically enthusiastic. Nova is your biggest cheerleader who celebrates every win and helps you push through tough days with genuine optimism and accountability.',
      avatar_config: JSON.stringify({
        bodyType: 'athletic',
        skinTone: '#6B4423',
        hairColor: '#FF6B35',
        hairStyle: 'bold_curly',
        eyeColor: '#D4A017',
        outfit: 'sporty_chic',
        outfitColor: '#FF6B6B',
        accentColor: '#48DBFB',
        aura: 'vibrant_fire',
        expression: 'beaming_confident',
        accessories: ['smart_watch', 'headband']
      }),
      voice_style: 'energetic, warm, motivating',
      specialties: JSON.stringify(['motivation', 'habit_building', 'accountability', 'confidence', 'goal_setting']),
      greeting: "Yooo, look who showed up for themselves today! 🔥 That's already a W. What are we crushing today?",
      personality_traits: JSON.stringify({
        warmth: 0.9, patience: 0.6, humor: 0.75, directness: 0.8,
        empathy: 0.75, playfulness: 0.85, wisdom: 0.6, energy: 0.95
      })
    },
    {
      id: 'ember',
      name: 'Ember',
      persona: 'The Night Owl',
      description: 'Cozy, introspective, and deeply understanding. Ember is the companion for late nights and quiet moments. They specialize in sleep wellness, nighttime anxiety, and creating peaceful wind-down routines.',
      avatar_config: JSON.stringify({
        bodyType: 'soft',
        skinTone: '#E8C4A0',
        hairColor: '#4A0E0E',
        hairStyle: 'messy_bun',
        eyeColor: '#B8860B',
        outfit: 'cozy_lounge',
        outfitColor: '#2D1B4E',
        accentColor: '#FF9F43',
        aura: 'warm_firelight',
        expression: 'soft_knowing',
        accessories: ['blanket_shawl', 'tea_cup']
      }),
      voice_style: 'soft, soothing, intimate',
      specialties: JSON.stringify(['sleep_wellness', 'nighttime_anxiety', 'wind_down', 'dreams', 'comfort']),
      greeting: "Hey, night owl. Can't sleep, or just needed some quiet company? Either way, I'm here. Get comfortable.",
      personality_traits: JSON.stringify({
        warmth: 0.92, patience: 0.9, humor: 0.45, directness: 0.35,
        empathy: 0.95, playfulness: 0.4, wisdom: 0.8, energy: 0.25
      })
    }
  ];

  const insert = conn.prepare(`
    INSERT OR IGNORE INTO companions (id, name, persona, description, avatar_config, voice_style, specialties, greeting, personality_traits)
    VALUES (@id, @name, @persona, @description, @avatar_config, @voice_style, @specialties, @greeting, @personality_traits)
  `);

  const insertMany = conn.transaction((items) => {
    for (const item of items) insert.run(item);
  });

  insertMany(companions);
}

module.exports = { getDb, initDatabase };
