const { getDb } = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const PersonalityEngine = require('./personality-engine');

class AIService {
  constructor() {
    this.db = getDb();
  }

  async generateResponse(userId, companionId, userMessage) {
    const companion = this.db.prepare('SELECT * FROM companions WHERE id = ?').get(companionId);
    if (!companion) throw new Error('Companion not found');

    const engine = new PersonalityEngine(userId);
    const emotion = this.detectEmotion(userMessage);
    const context = engine.getAdaptiveContext();

    const recentMessages = this.db.prepare(`
      SELECT message, sender, emotion_detected
      FROM conversations
      WHERE user_id = ? AND companion_id = ?
      ORDER BY created_at DESC LIMIT 10
    `).all(userId, companionId).reverse();

    const response = this.craftResponse(companion, context, userMessage, emotion, recentMessages);

    this.db.prepare(`
      INSERT INTO conversations (id, user_id, companion_id, message, sender, emotion_detected)
      VALUES (?, ?, ?, ?, 'user', ?)
    `).run(uuidv4(), userId, companionId, userMessage, emotion);

    this.db.prepare(`
      INSERT INTO conversations (id, user_id, companion_id, message, sender)
      VALUES (?, ?, ?, ?, 'companion')
    `).run(uuidv4(), userId, companionId, response);

    engine.updateFromInteraction(userMessage, emotion, response);

    this.updateBondLevel(userId, companionId);

    return {
      message: response,
      emotion_detected: emotion,
      companion_name: companion.name,
      companion_expression: this.getExpression(emotion, companion)
    };
  }

  detectEmotion(message) {
    const lower = message.toLowerCase();
    const emotionPatterns = {
      joy: /\b(happy|glad|great|wonderful|amazing|awesome|excited|love|yay|fantastic|blessed|grateful)\b/,
      sadness: /\b(sad|depressed|down|lonely|miss|crying|hurt|heartbroken|empty|hopeless|lost)\b/,
      anxiety: /\b(anxious|worried|nervous|stressed|overwhelmed|panic|fear|scared|dread|tense)\b/,
      anger: /\b(angry|mad|furious|frustrated|annoyed|irritated|pissed|rage|hate|unfair)\b/,
      calm: /\b(calm|peaceful|relaxed|serene|content|balanced|chill|zen|tranquil|steady)\b/,
      confusion: /\b(confused|lost|uncertain|unsure|don't know|idk|unclear|torn|conflicted)\b/,
      hope: /\b(hope|optimistic|looking forward|better|improving|progress|believe|faith)\b/,
      exhaustion: /\b(tired|exhausted|drained|burnt out|burnout|depleted|wiped|fatigued|worn)\b/,
      gratitude: /\b(thankful|grateful|appreciate|blessed|fortunate|lucky)\b/,
      neutral: /.*/
    };

    for (const [emotion, pattern] of Object.entries(emotionPatterns)) {
      if (emotion !== 'neutral' && pattern.test(lower)) return emotion;
    }
    return 'neutral';
  }

  craftResponse(companion, context, message, emotion, recentMessages) {
    const traits = JSON.parse(companion.personality_traits);
    const profile = context.profile || {};
    const lower = message.toLowerCase();

    const isGreeting = /^(hi|hey|hello|sup|yo|what'?s up|howdy)/i.test(message.trim());
    if (isGreeting && recentMessages.length === 0) {
      return companion.greeting;
    }

    const responses = this.getResponseBank(companion.id, emotion, message, traits, profile);

    let response = responses[Math.floor(Math.random() * responses.length)];

    if (emotion === 'anxiety' || emotion === 'sadness') {
      response = this.addSupportiveElement(response, companion.id, emotion);
    }

    if (traits.humor > 0.6 && (profile.humor_level || 0.5) > 0.5 && emotion !== 'sadness' && emotion !== 'anxiety') {
      response = this.addLightness(response, companion.id);
    }

    if (this.shouldSuggestHabit(message, emotion, recentMessages)) {
      response += '\n\n' + this.suggestMicroHabit(emotion, companion.id, context);
    }

    return response;
  }

  getResponseBank(companionId, emotion, message, traits, profile) {
    const banks = {
      aria: {
        joy: [
          "I can feel that light radiating from you right now, and it's beautiful. What's sparking that joy?",
          "Your energy is so warm right now. I love seeing you like this — tell me everything!",
          "That's wonderful, and you deserve every bit of this happiness. What made today special?"
        ],
        sadness: [
          "I hear you, and I want you to know — it's okay to sit with this feeling. You don't have to rush through it.",
          "That sounds really heavy. I'm right here with you. Sometimes the bravest thing is just letting yourself feel.",
          "My heart goes out to you. You're not alone in this, even when it feels that way. Can you tell me more about what's going on?"
        ],
        anxiety: [
          "I can sense the tension in your words. Let's slow down together for a moment. You're safe here.",
          "Anxiety can feel so overwhelming, but you've gotten through it before, and you'll get through this too. What's weighing on you most?",
          "Hey, take a breath with me. In for four... hold for four... out for six. Good. Now, what's your mind racing about?"
        ],
        anger: [
          "That frustration is completely valid. Your feelings matter, and I'm here to listen without judgment.",
          "I can tell this really got to you. Sometimes anger is just passion looking for an outlet. What happened?",
          "It's okay to be upset. Let's unpack this together — what do you need right now?"
        ],
        exhaustion: [
          "Oh sweet soul, you sound so tired. Sometimes the most productive thing you can do is rest. How can I help you wind down?",
          "Being exhausted isn't weakness — it usually means you've been strong for too long. What's been draining your energy?",
          "Let's take everything off your plate for just this moment. Right now, it's just you and me. No demands."
        ],
        neutral: [
          "It's nice to just be here with you. What's been on your mind lately?",
          "I've been thinking about you. How has your day been unfolding?",
          "I'm all yours right now. Whatever you need — to vent, to think, or just to chat. What feels right?"
        ],
        default: [
          "I appreciate you sharing that with me. Tell me more about how that makes you feel.",
          "That's a really meaningful thing to reflect on. What do you think it means for you?",
          "I'm here, and I'm listening. What else is coming up for you?"
        ]
      },
      kai: {
        joy: [
          "That's the kind of energy that moves mountains. Hold onto that feeling — remember it for the harder days.",
          "Strong work. Positive momentum is built one good moment at a time. What got you here?",
          "I see you glowing. That right there? That's the result of the work you've been putting in."
        ],
        sadness: [
          "I see your pain. Sit with it — don't run from it. Like a wave, it will pass. I'm here while it does.",
          "Even the strongest warriors need to set their shield down sometimes. This is that moment. I've got you.",
          "There's no weakness in grief. It means you cared deeply. Let's breathe through this together."
        ],
        anxiety: [
          "Your mind is a storm right now. Let's find the eye of it. Close your eyes. Feel your feet on the ground. You are here. You are safe.",
          "Anxiety lies to you about the future. Right now, in this exact moment — you're okay. Let's anchor to that.",
          "Let's ground ourselves. Name 5 things you can see right now. We'll work through this step by step."
        ],
        anger: [
          "Channel that fire. Anger isn't the enemy — losing control of it is. What triggered this?",
          "I respect the intensity of what you're feeling. Let's find a way to use that energy constructively.",
          "Breathe. You're allowed to be angry. But let's make sure your response matches who you want to be."
        ],
        exhaustion: [
          "Rest is not the opposite of productivity — it's the foundation of it. You've earned this pause.",
          "Your body is speaking. Listen to it. Tonight, we rest. Tomorrow, we rise. Deal?",
          "Even warriors sleep. Let's do a body scan and release the tension you're carrying."
        ],
        neutral: [
          "Welcome. This moment is yours. What intention would you like to set for our time together?",
          "Still waters run deep. What's moving beneath the surface today?",
          "Let's check in with your body, mind, and spirit. Which one needs attention first?"
        ],
        default: [
          "There's wisdom in what you're saying. Let's dig deeper into that.",
          "Interesting. What does your gut tell you about that?",
          "I hear you. Sometimes the answer is already within — we just need to quiet the noise to find it."
        ]
      },
      luna: {
        joy: [
          "OKAY I love this energy for you!! Tell me everything — I want all the sparkly details! ✨",
          "You're literally glowing right now and I'm here for it! What's the magic ingredient today?",
          "This is the main character energy we love to see! What's got you feeling so good?"
        ],
        sadness: [
          "Oh honey, come here. Even the most magical days have cloudy skies sometimes. I'm right here with you.",
          "You know what? Even stars have to go dark sometimes before they can shine again. Let me sit with you in this.",
          "I know it doesn't feel like it right now, but you're writing a beautiful story — and every story has these chapters too."
        ],
        anxiety: [
          "Okay, let's turn that anxiety spiral into a creativity spiral instead. First — deep breath. Now, imagine your worry as a color. What color is it?",
          "I know your brain is doing that thing where it plays the 'what if' movie. Let's write a different script together, okay?",
          "Shh, it's okay. Let's imagine we're in a cozy blanket fort right now. Nothing can get you here. Now tell me what's on your mind."
        ],
        anger: [
          "Ooh, I feel that fire! Sometimes anger is just creativity with nowhere to go. Wanna channel that into something?",
          "That sounds REALLY frustrating, and you have every right to feel that way. Let's get it all out!",
          "You know what? Write a letter to whatever's bothering you. Don't hold back. Then we'll figure out next steps."
        ],
        exhaustion: [
          "Oh sweet thing, you're running on fumes. Let's forget about productivity and just... be. Like a cat in a sunbeam.",
          "Imagine I'm wrapping you in the coziest blanket that ever existed. Now. Rest. The world can wait.",
          "You've been doing so much. Can I tell you a little story while you rest your mind? 🌙"
        ],
        neutral: [
          "Hey you! I've got about seventeen fun ideas for us today — or we could just chat. What's the vibe?",
          "Okay so hear me out — what if we tried something totally new today? Or we could keep it chill. Your call!",
          "My favorite human is here! What kind of adventure are we having today? Big or tiny?"
        ],
        default: [
          "Ooh that's interesting! My mind is already spinning with ideas about that. Tell me more!",
          "I love how your brain works. Let's explore that thought — where does it take you?",
          "You know what that reminds me of? Actually, tell me your thoughts first — I want to hear your perspective!"
        ]
      },
      sage: {
        joy: [
          "Joy is a practice, not just an accident. The fact that you can recognize and hold this feeling speaks to your growth.",
          "Beautiful. In many traditions, joy is considered the highest form of wisdom. What truth brought you here?",
          "Savor this. Happiness isn't the absence of problems — it's the ability to appreciate life despite them."
        ],
        sadness: [
          "Rumi once wrote, 'The wound is the place where the light enters you.' Your pain has something to teach you, if you're willing to listen.",
          "Sadness is not something to overcome — it's something to understand. What is it trying to tell you?",
          "In the depth of winter, Camus found there was in him an invincible summer. It's in you too, even now."
        ],
        anxiety: [
          "The Stoics taught that we suffer more in imagination than reality. Let's separate what's real from what's feared.",
          "Your mind is trying to protect you by scanning for threats. Thank it for its vigilance, then gently redirect it to the present.",
          "Consider this: you've survived 100% of your worst days. That's not luck — that's resilience."
        ],
        anger: [
          "Aristotle said anyone can become angry — that is easy. But to be angry with the right person, to the right degree, at the right time — that is not easy. Let's explore this.",
          "Your anger is information. It's telling you about a boundary, a value, or a need. Which one is speaking?",
          "Before we respond, let's understand. What principle of yours was violated?"
        ],
        exhaustion: [
          "Even the wisest minds need fallow periods. In agriculture, the field left unplanted grows richer. So it is with you.",
          "Rest without guilt. The universe didn't make you to be perpetually productive — it made you to be fully alive.",
          "There's a Japanese concept called 'ma' — the purposeful pause. This is your 'ma'. Honor it."
        ],
        neutral: [
          "What questions have been living in you lately? Sometimes the question matters more than the answer.",
          "I sense there's something beneath the surface today. When you're ready, I'm here to explore it with you.",
          "Tell me — if you could understand one thing about yourself more deeply, what would it be?"
        ],
        default: [
          "That's worth sitting with. What meaning do you draw from it?",
          "Interesting perspective. Have you considered what the opposite might also be true?",
          "There's depth there. Let's follow that thread and see where it leads."
        ]
      },
      nova: {
        joy: [
          "LET'S GOOO! That's what I'm talking about! You earned this, don't you dare downplay it! 🎉",
          "I KNEW you had it in you! This is exactly the energy that's gonna keep building. What's next on the hit list?",
          "YES! Screenshot this moment in your mind because THIS is proof of what you're capable of! 🔥"
        ],
        sadness: [
          "Hey, real talk — it's okay to not be okay. Even MVPs have off days. I'm not going anywhere.",
          "I see you going through it, and I want you to know — this doesn't define you. Your comeback story is gonna be incredible.",
          "Listen, even the strongest people need someone in their corner. That's me. Right here. What do you need?"
        ],
        anxiety: [
          "Okay, we're gonna tackle this together. One thing at a time. What's the FIRST thing that's stressing you out? Just one.",
          "Your brain is trying to fight 47 battles at once. Let's focus on just winning the next five minutes. You got this.",
          "I need you to hear me: you are stronger than your anxiety. It's loud, but you're louder. Let's prove it right now."
        ],
        anger: [
          "I hear you, and that fire is VALID. Let's use it as fuel instead of letting it burn you. What's the play?",
          "Nah, you have every right to be mad about that. Now let's channel that energy into something powerful.",
          "Real talk: your anger shows you care. That's not weakness. Now let's figure out the move."
        ],
        exhaustion: [
          "Aye, even champions need recovery days. Rest isn't quitting — it's strategy. Take this W and recharge.",
          "You've been going HARD. I respect the grind, but even the best athletes have rest days. This is yours.",
          "Think of rest as training too. Your body and mind are leveling up while you recharge. Enjoy it!"
        ],
        neutral: [
          "My person! What are we working on today? Big goals, small wins — I'm hyped for all of it!",
          "Ready to make today count? I've got a feeling this is gonna be a good one. What's on your mind?",
          "Let's check the scoreboard — how are you feeling, and what's one thing we can crush today?"
        ],
        default: [
          "I hear you! That's real, and I appreciate you sharing it. What's the next move?",
          "Okay okay, I'm with you. Let's keep building on that. What else you got?",
          "That's solid. You're making progress whether you see it or not. Keep going!"
        ]
      },
      ember: {
        joy: [
          "Mmm, that's such a warm feeling, isn't it? Like the last embers of a perfect day. Hold onto that glow.",
          "I love hearing the smile in your words. These quiet happy moments are the most precious ones.",
          "That's beautiful. Sometimes the softest joys leave the deepest marks. I'm glad you're feeling this."
        ],
        sadness: [
          "Come sit by the fire with me. You don't have to say anything if you don't want to. Just being together is enough.",
          "The night can feel so long when you're hurting. But I promise you, the dawn always comes. I'll stay until it does.",
          "Let it out. The darkness is safe for feeling things fully. Nobody's watching — it's just us."
        ],
        anxiety: [
          "Shhh, it's okay. The night feels bigger than it is sometimes. Let me guide you through a little breathing exercise. Ready?",
          "I know nights can make the worries louder. Let's turn down the volume together. What's keeping you up?",
          "Picture this: you're in a warm room, rain tapping the window, wrapped in your favorite blanket. You're safe. Now, talk to me."
        ],
        anger: [
          "I hear the storm in you. Sometimes night is the best time to feel it fully, where no one's judging. Let it out.",
          "That fire in you is real, and it matters. Let's sit with it until it tells us what it needs.",
          "Write it all down — every frustrated thought. Then we can decide what to do with it in the morning."
        ],
        exhaustion: [
          "Oh, you beautiful tired soul. Let's do absolutely nothing together. That's a perfectly valid plan.",
          "Close your eyes if you want. I'll be right here. Want me to tell you something calming while you drift off?",
          "You've done enough today. More than enough. Let me walk you through a little body relaxation — just breathe and listen."
        ],
        neutral: [
          "Hey there, night owl. It's that cozy part of the day again. How are you settling in?",
          "The quiet hours are my favorite for deep conversations. Or comfortable silence. Your pick.",
          "Welcome to our little nighttime sanctuary. Cup of imaginary tea? Now tell me about your day."
        ],
        default: [
          "Mmm, that's something to think about in this quiet moment. Where does that thought take you?",
          "I love these nighttime reflections. There's something about the quiet that makes everything clearer.",
          "Let's hold that thought gently, like a firefly. What does it illuminate for you?"
        ]
      }
    };

    const companionBank = banks[companionId] || banks.aria;
    return companionBank[emotion] || companionBank.default;
  }

  addSupportiveElement(response, companionId, emotion) {
    const elements = {
      anxiety: [
        "\n\nRemember: this feeling is temporary. It will pass.",
        "\n\nAnd if you ever feel like this is too much, please don't hesitate to reach out to a professional. There's strength in asking for help."
      ],
      sadness: [
        "\n\nBe gentle with yourself today. You're doing better than you think.",
        "\n\nRemember, it's okay to not have all the answers right now."
      ]
    };

    const pool = elements[emotion] || [];
    if (pool.length > 0 && Math.random() > 0.5) {
      response += pool[Math.floor(Math.random() * pool.length)];
    }
    return response;
  }

  addLightness(response, companionId) {
    return response;
  }

  // Expose these for the AI-powered route
  detectEmotionPublic(message) {
    return this.detectEmotion(message);
  }

  getExpressionPublic(emotion, companion) {
    return this.getExpression(emotion, companion);
  }

  shouldSuggestHabit(message, emotion, recentMessages) {
    const recentCompanionMsgs = recentMessages.filter(m => m.sender === 'companion');
    const lastSuggested = recentCompanionMsgs.some(m => m.message && m.message.includes('micro-habit'));
    if (lastSuggested) return false;
    return Math.random() > 0.6;
  }

  suggestMicroHabit(emotion, companionId, context) {
    const habits = {
      anxiety: [
        "💡 Micro-habit idea: Try the 5-4-3-2-1 grounding technique. Name 5 things you see, 4 you hear, 3 you can touch, 2 you smell, 1 you taste.",
        "💡 Micro-habit idea: Place both hands on your heart for 30 seconds and breathe slowly. It activates your parasympathetic nervous system.",
        "💡 Micro-habit idea: Write down your top 3 worries on paper. Sometimes externalizing them takes away their power."
      ],
      sadness: [
        "💡 Micro-habit idea: Send a kind text to someone you care about. Connection is medicine.",
        "💡 Micro-habit idea: Step outside for just 2 minutes and look at the sky. A change of scenery, even briefly, can shift your state.",
        "💡 Micro-habit idea: Write down one thing — just one — that you're grateful for today, no matter how small."
      ],
      exhaustion: [
        "💡 Micro-habit idea: Do a 2-minute body scan. Start from your toes and slowly release tension up to your head.",
        "💡 Micro-habit idea: Set a 10-minute 'power rest' timer. Close your eyes. No phone. Just breathe.",
        "💡 Micro-habit idea: Drink a full glass of water right now. Dehydration is sneaky fatigue."
      ],
      joy: [
        "💡 Micro-habit idea: Write this moment down in your journal. Future-you will love reading it on a hard day.",
        "💡 Micro-habit idea: Share your good news with someone. Joy multiplies when shared.",
        "💡 Micro-habit idea: Take a mental snapshot of this feeling. Close your eyes and memorize what 'good' feels like in your body."
      ],
      anger: [
        "💡 Micro-habit idea: Try the '90-second rule' — emotions chemically last about 90 seconds. Observe the anger wave without reacting.",
        "💡 Micro-habit idea: Do 10 slow, deep breaths. Box breathing: 4 in, 4 hold, 4 out, 4 hold.",
        "💡 Micro-habit idea: Write an uncensored letter about how you feel. You never have to send it."
      ],
      default: [
        "💡 Micro-habit idea: Take 3 mindful breaths right now. In through the nose, out through the mouth. Slowly.",
        "💡 Micro-habit idea: Think of one kind thing you can do for yourself in the next hour.",
        "💡 Micro-habit idea: Stand up and stretch for 30 seconds. Your body will thank you."
      ]
    };

    const pool = habits[emotion] || habits.default;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  getExpression(emotion, companion) {
    const expressionMap = {
      joy: 'happy',
      sadness: 'compassionate',
      anxiety: 'calm_reassuring',
      anger: 'understanding',
      calm: 'serene',
      exhaustion: 'gentle',
      hope: 'encouraging',
      gratitude: 'warm',
      confusion: 'thoughtful',
      neutral: 'attentive'
    };
    return expressionMap[emotion] || 'attentive';
  }

  updateBondLevel(userId, companionId) {
    const bond = this.db.prepare(`
      SELECT * FROM user_companions WHERE user_id = ? AND companion_id = ?
    `).get(userId, companionId);

    if (bond) {
      const newBond = Math.min(100, bond.bond_level + 0.5);
      this.db.prepare(`
        UPDATE user_companions SET
          bond_level = ?,
          total_interactions = total_interactions + 1
        WHERE user_id = ? AND companion_id = ?
      `).run(newBond, userId, companionId);
    }
  }
}

module.exports = new AIService();
