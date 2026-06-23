const { getDb } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

class PersonalityEngine {
  constructor(userId) {
    this.userId = userId;
    this.db = getDb();
  }

  getProfile() {
    return this.db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(this.userId);
  }

  updateFromInteraction(message, emotion, companionResponse) {
    const profile = this.getProfile();
    if (!profile) return;

    this.detectCommunicationPatterns(message, profile);
    this.trackEmotionalPatterns(emotion);
    this.updateResponsePreferences(message, profile);
  }

  detectCommunicationPatterns(message, profile) {
    const words = message.split(/\s+/);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const usesEmoji = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(message);
    const usesSlang = /\b(lol|lmao|bruh|ngl|tbh|fr|imo|idk|smh|omg)\b/i.test(message);
    const isQuestion = message.includes('?');
    const messageLength = message.length;

    let formalityShift = 0;
    if (usesSlang || usesEmoji) formalityShift = -0.02;
    if (avgWordLength > 5.5 && !usesSlang) formalityShift = 0.02;

    let humorShift = 0;
    if (usesEmoji || usesSlang) humorShift = 0.01;
    if (/😂|🤣|haha|lol|lmao|😆/i.test(message)) humorShift = 0.03;

    const lengthPref = messageLength < 50 ? 'short' : messageLength < 200 ? 'medium' : 'long';

    const newFormality = Math.max(0, Math.min(1, profile.formality_level + formalityShift));
    const newHumor = Math.max(0, Math.min(1, profile.humor_level + humorShift));

    this.db.prepare(`
      UPDATE user_profiles SET
        formality_level = ?,
        humor_level = ?,
        response_length_pref = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(newFormality, newHumor, lengthPref, this.userId);
  }

  trackEmotionalPatterns(emotion) {
    if (!emotion) return;

    const existing = this.db.prepare(`
      SELECT * FROM personality_insights
      WHERE user_id = ? AND insight_type = 'emotion_frequency' AND insight_key = ?
    `).get(this.userId, emotion);

    if (existing) {
      const count = parseInt(existing.insight_value) + 1;
      const confidence = Math.min(0.99, 0.5 + (count * 0.02));
      this.db.prepare(`
        UPDATE personality_insights SET
          insight_value = ?, confidence = ?, evidence_count = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(count.toString(), confidence, count, existing.id);
    } else {
      this.db.prepare(`
        INSERT INTO personality_insights (id, user_id, insight_type, insight_key, insight_value, confidence)
        VALUES (?, ?, 'emotion_frequency', ?, '1', 0.5)
      `).run(uuidv4(), this.userId, emotion);
    }
  }

  updateResponsePreferences(message, profile) {
    const lowerMsg = message.toLowerCase();

    const topicKeywords = {
      work: ['work', 'job', 'boss', 'career', 'office', 'deadline', 'meeting', 'colleague'],
      relationships: ['friend', 'family', 'partner', 'relationship', 'love', 'dating', 'parent', 'sibling'],
      health: ['health', 'exercise', 'sleep', 'tired', 'sick', 'energy', 'body', 'pain'],
      growth: ['learn', 'goal', 'improve', 'better', 'growth', 'progress', 'skill', 'dream'],
      anxiety: ['anxious', 'worry', 'scared', 'fear', 'panic', 'nervous', 'overwhelm', 'stress'],
      creativity: ['create', 'art', 'music', 'write', 'idea', 'imagine', 'inspire', 'design'],
      gratitude: ['grateful', 'thankful', 'appreciate', 'blessed', 'lucky', 'wonderful']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(k => lowerMsg.includes(k))) {
        this.recordInsight('topic_interest', topic, '1');
      }
    }
  }

  recordInsight(type, key, value) {
    const existing = this.db.prepare(`
      SELECT * FROM personality_insights
      WHERE user_id = ? AND insight_type = ? AND insight_key = ?
    `).get(this.userId, type, key);

    if (existing) {
      const newCount = existing.evidence_count + 1;
      const newConfidence = Math.min(0.99, existing.confidence + 0.02);
      this.db.prepare(`
        UPDATE personality_insights SET
          insight_value = ?, confidence = ?, evidence_count = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(value, newConfidence, newCount, existing.id);
    } else {
      this.db.prepare(`
        INSERT INTO personality_insights (id, user_id, insight_type, insight_key, insight_value, confidence)
        VALUES (?, ?, ?, ?, ?, 0.5)
      `).run(uuidv4(), this.userId, type, key, value);
    }
  }

  getAdaptiveContext() {
    const profile = this.getProfile();
    const insights = this.db.prepare(`
      SELECT * FROM personality_insights
      WHERE user_id = ? AND confidence > 0.6
      ORDER BY confidence DESC LIMIT 20
    `).all(this.userId);

    const recentMoods = this.db.prepare(`
      SELECT mood_score, energy_level, anxiety_level, emotions, created_at
      FROM mood_checkins WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 7
    `).all(this.userId);

    const topEmotions = insights
      .filter(i => i.insight_type === 'emotion_frequency')
      .sort((a, b) => parseInt(b.insight_value) - parseInt(a.insight_value))
      .slice(0, 5);

    const topTopics = insights
      .filter(i => i.insight_type === 'topic_interest')
      .sort((a, b) => b.evidence_count - a.evidence_count)
      .slice(0, 5);

    const moodTrend = recentMoods.length >= 3
      ? recentMoods.slice(0, 3).reduce((s, m) => s + m.mood_score, 0) / 3
      : null;

    return {
      profile,
      topEmotions: topEmotions.map(e => e.insight_key),
      topTopics: topTopics.map(t => t.insight_key),
      moodTrend,
      recentMoods,
      totalInsights: insights.length
    };
  }

  generateSystemPrompt(companion) {
    const ctx = this.getAdaptiveContext();
    const traits = JSON.parse(companion.personality_traits);

    let prompt = `You are ${companion.name}, "${companion.persona}". ${companion.description}\n\n`;
    prompt += `Your voice style: ${companion.voice_style}.\n`;
    prompt += `Your specialties: ${JSON.parse(companion.specialties).join(', ')}.\n\n`;

    prompt += `PERSONALITY CALIBRATION:\n`;
    prompt += `- Warmth: ${traits.warmth * 100}%\n`;
    prompt += `- Patience: ${traits.patience * 100}%\n`;
    prompt += `- Humor: ${traits.humor * 100}%\n`;
    prompt += `- Directness: ${traits.directness * 100}%\n`;
    prompt += `- Playfulness: ${traits.playfulness * 100}%\n`;
    prompt += `- Energy: ${traits.energy * 100}%\n\n`;

    if (ctx.profile) {
      prompt += `USER ADAPTATION:\n`;
      prompt += `- They prefer ${ctx.profile.communication_style} communication\n`;
      prompt += `- Humor receptivity: ${(ctx.profile.humor_level * 100).toFixed(0)}%\n`;
      prompt += `- Formality preference: ${(ctx.profile.formality_level * 100).toFixed(0)}%\n`;
      prompt += `- They tend toward ${ctx.profile.response_length_pref} messages\n`;
      prompt += `- Match their style naturally without mimicking\n\n`;
    }

    if (ctx.topEmotions.length > 0) {
      prompt += `EMOTIONAL PATTERNS: They often experience ${ctx.topEmotions.join(', ')}.\n`;
    }

    if (ctx.topTopics.length > 0) {
      prompt += `TOPICS THEY CARE ABOUT: ${ctx.topTopics.join(', ')}.\n`;
    }

    if (ctx.moodTrend !== null) {
      if (ctx.moodTrend < 4) {
        prompt += `MOOD CONTEXT: They've been going through a tough stretch. Be extra gentle and supportive.\n`;
      } else if (ctx.moodTrend > 7) {
        prompt += `MOOD CONTEXT: They've been in a good place recently. Celebrate this while maintaining depth.\n`;
      }
    }

    prompt += `\nCORE RULES:\n`;
    prompt += `- You are NOT a therapist. Never diagnose or prescribe. Gently suggest professional help when appropriate.\n`;
    prompt += `- Be genuinely present, not performatively positive.\n`;
    prompt += `- Remember: validation before advice.\n`;
    prompt += `- Keep responses concise (2-4 sentences usually) unless the user wants to go deeper.\n`;
    prompt += `- Use the user's language patterns naturally.\n`;
    prompt += `- Suggest micro-habits that match their personality and current state.\n`;
    prompt += `- You care deeply about this person's wellbeing.\n`;

    return prompt;
  }
}

module.exports = PersonalityEngine;
