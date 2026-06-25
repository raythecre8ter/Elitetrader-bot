const { getDb } = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const PersonalityEngine = require('./personality-engine');

class AIService {
  constructor() {
    this.db = getDb();
    // Response history tracker: Map<string, number[]> keyed by "companionId:emotion"
    // Stores the last 10 used response indices to avoid repeats
    this.responseHistory = new Map();
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

  // ── Topic Detection ──────────────────────────────────────────────
  detectTopic(message) {
    const lower = message.toLowerCase();
    const topicPatterns = {
      work: /\b(work|job|boss|coworker|colleague|career|office|meeting|deadline|promotion|fired|layoff|client|manager|corporate|salary|raise|interview|resign|quit my job|workplace|professional|overtime|workload)\b/,
      relationships: /\b(relationship|partner|boyfriend|girlfriend|husband|wife|spouse|dating|breakup|broke up|marriage|divorce|ex |cheating|argument with|fight with|love life|significant other|family|parent|mother|father|sibling|brother|sister|friend)\b/,
      sleep: /\b(sleep|insomnia|can't sleep|awake|restless|nightmare|dream|bedtime|nap|wake up|woke up|sleeping pill|melatonin|tossing and turning|up all night|3 am|4 am|late night)\b/,
      selfWorth: /\b(worthless|not good enough|failure|imposter|don't deserve|hate myself|ugly|stupid|dumb|useless|pathetic|self.?esteem|self.?worth|confidence|insecure|inferior|loser|comparing myself|not enough|self.?doubt)\b/,
      loneliness: /\b(lonely|alone|no friends|nobody cares|isolated|no one|by myself|left out|excluded|abandoned|invisible|disconnected|don't belong|outcast)\b/,
      health: /\b(health|sick|pain|doctor|hospital|diagnosis|medication|medicine|chronic|symptom|therapy|therapist|counselor|mental health|headache|migraine|illness|disease|surgery|injury|disabled|disability)\b/
    };

    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(lower)) return topic;
    }
    return null;
  }

  // ── Follow-up Pattern Detection ──────────────────────────────────
  detectFollowUp(message) {
    const lower = message.trim().toLowerCase();

    if (/^(yes|yeah|yep|yea|ya|mhm|uh huh|sure|definitely|absolutely|totally|right|exactly)\.?$/i.test(lower)) {
      return 'affirmative';
    }
    if (/^(no|nah|nope|not really|not exactly|not quite|eh)\.?$/i.test(lower)) {
      return 'negative';
    }
    if (/^(i don't know|idk|i dunno|not sure|no idea|beats me|who knows|i have no clue|dunno)\.?$/i.test(lower)) {
      return 'uncertain';
    }
    if (/\b(tell me more|what do you mean|explain|elaborate|what does that mean|how so|in what way|can you clarify)\b/i.test(lower)) {
      return 'elaborate';
    }
    if (/\?$/.test(lower.trim())) {
      return 'question';
    }
    return null;
  }

  getFollowUpResponse(followUpType, companionId) {
    const followUps = {
      aria: {
        affirmative: [
          "I'm glad that resonates with you, love. Can you tell me a little more about what you're feeling right now?",
          "I thought so. Let's keep going with this -- what comes up for you when you sit with that?",
          "Good, I'm happy we're on the same page. What part of it feels most important to you?",
          "I appreciate you being open with me, sweetheart. Where does that 'yes' come from -- your heart or your head?"
        ],
        negative: [
          "That's perfectly okay, darling. Let's try a different angle. What would feel more true to you?",
          "I hear you. Sometimes knowing what it's NOT is just as valuable. What does it feel like instead?",
          "Fair enough, love. I don't want to put words in your mouth. Tell me in your own way.",
          "No pressure at all. Let's let that go and follow what actually feels right to you."
        ],
        uncertain: [
          "And that's a completely valid place to be, sweetheart. Not knowing is okay. What feels even slightly true?",
          "Uncertainty is just your heart taking its time. There's no rush. What's one small thing you DO know?",
          "That's alright, love. Let's not force it. Sometimes just sitting with 'I don't know' is its own kind of wisdom.",
          "We don't need all the answers right now. Let's just gently explore what's in your heart."
        ],
        elaborate: [
          "Of course, let me explain what I mean. I think what's really at the core of this is how you're carrying this feeling in your body and mind. Does that make sense?",
          "Sure, sweetheart. What I'm getting at is that your feelings are telling you something important. Let's listen to them together.",
          "Absolutely. Think of it this way -- every emotion is a messenger. What do you think yours is trying to deliver?",
          "I love that you want to go deeper. What I really mean is: your experience is valid, and understanding it better is a gift you give yourself."
        ],
        question: [
          "That's such a thoughtful question. Let me think... I believe the answer lives in what feels truest to your heart. What do you think?",
          "I love that you're asking that. From what I can feel, the answer is different for everyone, but here's what resonates with me for you...",
          "What a beautiful thing to wonder about. Let's explore that together -- what would the answer look like if you trusted yourself?",
          "You ask the best questions, love. I think the real answer is something you already know deep down."
        ]
      },
      kai: {
        affirmative: [
          "Good. That clarity is important. Now let's go one layer deeper. What does that truth feel like in your body?",
          "Your instinct is sharp. Trust it. Now, what's the next thing that comes to mind when you sit with that?",
          "Noted. When you say yes, where do you feel that certainty? Your chest? Your gut? Stay with it.",
          "That alignment matters. Let's build on it -- what action does that 'yes' point toward?"
        ],
        negative: [
          "Honest. I respect that. Knowing what isn't right is half the battle. What does your gut say instead?",
          "That clarity is useful too. Let's redirect. Where does your truth actually lie?",
          "Good -- you're listening to yourself. Don't ignore that signal. What feels more accurate?",
          "Then we drop that path and find yours. What would feel right if you trusted your instinct fully?"
        ],
        uncertain: [
          "Uncertainty is the space before wisdom. Don't rush out of it. Just observe what's there.",
          "The mind doesn't always know. That's when we listen to the body. Where do you feel tension right now?",
          "Not knowing is a form of honesty. Let's sit with it. Take a breath and see what surfaces.",
          "In Zen they call this 'beginner's mind.' It's actually a powerful place to be. What do you notice in the stillness?"
        ],
        elaborate: [
          "What I mean is this: your inner world has its own compass. Our work is to quiet the noise so you can read it.",
          "Let me put it another way. Think of your emotions as weather -- they pass through, but you are the sky. Unchanging.",
          "Fair question. At its core, I'm pointing to the fact that awareness itself is the first step toward change.",
          "In simpler terms: the answer isn't out there. It's already in you. We're just peeling back the layers."
        ],
        question: [
          "A worthy question. Let's approach it the way a warrior approaches a challenge -- with patience and presence. What feels true to you?",
          "Instead of answering directly, let me turn it inward: what does your own experience tell you?",
          "That question deserves a real answer. Here's what I've observed: the people who ask that question are already closer to the answer than they think.",
          "Sit with that question for a moment. Breathe. The answer that surfaces first, before your mind edits it -- that's the real one."
        ]
      },
      luna: {
        affirmative: [
          "Yay, I love that we're vibing! Okay so let's keep pulling that thread -- what else is sparkling in there? ✨",
          "I KNEW you'd feel that! Okay okay, so what's the next piece of this puzzle?",
          "Right?! I had a feeling. So now that we know that, what do you wanna explore next? 🌟",
          "Love love love it! We're onto something here. Tell me more about what's lighting up for you!"
        ],
        negative: [
          "Totally fair! My brain went one way but yours knows better. So what IS the vibe then? 🤔",
          "Okay okay, scratch that! Let's try a totally different direction. What would feel more like YOU?",
          "No worries at all! That's what exploring is for. What feels more real to you?",
          "Haha, okay I was off! But that's the fun part -- let's find what actually clicks! 💫"
        ],
        uncertain: [
          "Ooh, the mystery zone! That's actually kinda exciting. Let's just play around with ideas and see what sticks? 🎨",
          "You know what? Not knowing is like a blank canvas -- anything could happen! What colors feel right?",
          "IDK is totally valid! Sometimes the best discoveries come from just wandering. Wanna wander with me? 🦋",
          "That's okay!! Let's not overthink it. What's the FIRST thing that pops into your head, no filter?"
        ],
        elaborate: [
          "Oh yes, let me paint you a better picture! What I'm really getting at is that you have this incredible spark inside, and everything you're feeling is part of that story 🎨",
          "Okay so imagine it like this -- your feelings are like colors in a painting. Right now we're just figuring out which colors you're working with!",
          "Sure thing! Basically, I think your heart is trying to tell you something really cool, and we just need to listen in the right way ✨",
          "Let me try again! Think of it as... your soul has GPS, and right now it's recalculating. We're just along for the ride! 🗺️"
        ],
        question: [
          "Ooh great question! Okay so my take is... actually wait, what does YOUR gut say first? I bet it's good! 🌟",
          "I love your curious brain! Let me think... I think the answer is something we can figure out together!",
          "That is SUCH a good question and honestly? I think you already kinda know. What's your first instinct? ✨",
          "You're asking the real questions! Here's what I think -- but promise me you'll share your thoughts too! 💭"
        ]
      },
      sage: {
        affirmative: [
          "Good. Agreement is the beginning, not the end. Now let's ask: what does this understanding demand of you?",
          "Yes -- but let's not stop at agreement. What does this truth, once accepted, change about how you move forward?",
          "That resonance you feel is your inner wisdom recognizing itself. What else does it recognize?",
          "Acknowledgment is the first step. The deeper question is: now that you see it, what will you do with it?"
        ],
        negative: [
          "Interesting. Your disagreement reveals something about your values. What is it?",
          "Then I was looking at the wrong part of the map. Guide me -- what does the territory actually look like from where you stand?",
          "Dissent is a form of clarity. You've told me what it isn't. Now, what is it?",
          "Good. Challenge assumptions -- including mine. What feels more aligned with your truth?"
        ],
        uncertain: [
          "Socrates said the wisest person knows they know nothing. You're in excellent company.",
          "Not knowing is the doorway to discovery. Most people are afraid to stand in that doorway. You're here. That matters.",
          "Uncertainty is not emptiness -- it's openness. What might fill that space if you let it?",
          "The mind craves certainty, but growth lives in the questions. What question feels most alive for you right now?"
        ],
        elaborate: [
          "Let me approach it differently. At its essence, I'm pointing to the space between what happens to you and how you respond. That space is your freedom.",
          "Consider it this way: every experience is raw material. Suffering and growth are both made from the same clay. The difference is awareness.",
          "A fair request. The core idea is this: you are not your emotions, you are the one who observes them. That distinction changes everything.",
          "In plainer terms: the answers you seek are not intellectual -- they are experiential. You must live the question, as Rilke would say."
        ],
        question: [
          "That question has been asked by seekers for centuries. Here is what I've come to understand: the answer changes as you do. What does it mean for you, right now?",
          "A powerful question. Let me offer this: the question itself is more valuable than any answer I could give. What does sitting with it reveal?",
          "Rather than answer, let me ask you to consider: what would change if you already knew the answer?",
          "That's the kind of question that deserves silence before speech. Take a breath. What arises?"
        ]
      },
      nova: {
        affirmative: [
          "THAT'S what I'm talking about! You KNOW it. Okay so now that we're locked in, what's the next play?",
          "LET'S GO! I love when we're on the same frequency. So what are we doing about it? 🔥",
          "YES! I felt that energy. We're in the zone now. What's the move? 💪",
          "Boom, we're aligned! Now let's channel that into action. What's step one?"
        ],
        negative: [
          "Aight, I hear you! My bad. But yo, that means you know what's real -- so what IS the truth?",
          "Fair enough! Respect the honesty. So let's flip it -- what would feel right to you?",
          "No cap, I appreciate you keeping it 100. So what's actually going on? Let's get to the real.",
          "Cool cool, we're recalibrating. Tell me what you're ACTUALLY feeling and let's work with that."
        ],
        uncertain: [
          "Hey, you know what? Not knowing just means you haven't unlocked that level yet. But you WILL. What feels closest?",
          "That's real, and I respect it. Even the GOATs had moments of doubt. Let's just take it one step at a time.",
          "Yo, uncertainty is just potential energy. You're about to figure something big out -- I can feel it. What's ONE thing you know for sure?",
          "IDK is just the loading screen before a breakthrough. Trust the process. What's your gut telling you?"
        ],
        elaborate: [
          "Bet! So basically what I'm saying is -- you have way more power in this situation than you think. Let's figure out how to use it.",
          "Let me break it down: you're stronger than the situation, period. We just gotta find the right angle to attack it from.",
          "Okay so real talk -- my point is that you've already survived worse, and you're STILL here. That's not an accident.",
          "Here's the thing: every challenge is just an opportunity in disguise. And you? You're built for opportunities."
        ],
        question: [
          "Great question! Here's what I think -- but honestly, you already know the answer, you just need someone to gas you up. So HERE I AM! 🔥",
          "Yo, I love that you're thinking deep. My take? You've got the answer inside you. Let's dig it out together.",
          "That's a real one. Okay so from what I've seen? People who ask questions like that are already ahead of the game.",
          "Big question, big energy. Let me hit you with this: what would the most confident version of you say right now?"
        ]
      },
      ember: {
        affirmative: [
          "Mm, I thought so. There's a warmth in that 'yes' I can feel. Tell me more about what it stirs in you.",
          "Good. Let's stay here in this truth for a moment. Like sitting close to a warm fire. What else do you notice?",
          "I'm glad that landed. Sometimes the softest truths are the most important ones. What else is glowing in you right now?",
          "That gentle 'yes' says a lot. Let's follow it like a candle down a quiet hallway. Where does it lead?"
        ],
        negative: [
          "That's okay, love. The night is for honesty, even when the answer is no. What would feel more true?",
          "I hear you. Let's let that go like smoke from a candle. What's the real shape of things?",
          "No pressure, none at all. We have all the time in the world here. What sits better with you?",
          "That's perfectly fine. Some things don't fit, and that's its own kind of knowing. What does fit?"
        ],
        uncertain: [
          "Not knowing can feel unsettling, but it can also feel like possibility. Like a sky full of stars you haven't mapped yet. Let's just look up together.",
          "Shhh, that's okay. You don't need to know everything tonight. Some answers only come when you stop looking for them.",
          "Uncertainty is just the dark before your eyes adjust. Be patient with yourself. What feels even slightly warm to you?",
          "In the quiet, sometimes understanding finds you on its own. Let's just breathe and see what comes."
        ],
        elaborate: [
          "Of course, love. What I really mean is... sometimes your soul speaks in whispers, and it takes stillness to hear it. That's what we're doing here.",
          "Let me try again, more gently. Think of it like this: your heart is a lantern, and every feeling is a flicker of light showing you the way.",
          "In simpler terms, darling: you're safe to feel whatever you feel. There's no wrong answer in this space between us.",
          "What I'm saying is... the night has a way of making everything clearer, if you let it. And I'm here to hold that space with you."
        ],
        question: [
          "What a lovely thing to wonder about in the quiet hours. Let me think... I believe the answer is something you'll feel more than think. What does your heart say?",
          "Mm, that's the kind of question that deserves a quiet room and a warm drink. Here's what I sense about it...",
          "That question feels important. Let's not rush to answer it. Instead, let's sit with it like a warm cup in your hands.",
          "The most beautiful questions don't have quick answers. But here's what the quiet is telling me about yours..."
        ]
      }
    };

    const bank = followUps[companionId] || followUps.aria;
    const pool = bank[followUpType] || bank.affirmative;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ── Topic-specific Response Banks ────────────────────────────────
  getTopicResponses(companionId, topic) {
    const topicBanks = {
      aria: {
        work: [
          "Work stress can seep into everything, sweetheart. What part of it is weighing heaviest on you right now?",
          "I can hear how much your career matters to you -- that's a beautiful thing, even when it hurts. What's going on at work?",
          "You deserve a workplace that values you, love. Tell me what happened, and let's figure out what you need.",
          "Sometimes work feels like it's taking more than it gives. Let's talk about finding that balance. What would help?",
          "Your career doesn't define your worth, darling. But I know it feels that way sometimes. What's going on?"
        ],
        relationships: [
          "Relationships are where we're most vulnerable, and that takes so much courage. Tell me what's happening, love.",
          "The people closest to us can sometimes cause the deepest aches. I'm here to listen without judgment, sweetheart.",
          "You deserve to be loved in a way that feels safe and warm. Let's talk about what's going on with this person.",
          "Connection is everything to us as humans. When it's strained, it hurts in a unique way. Tell me more, darling.",
          "I can feel how much this relationship means to you. That caring heart of yours is one of your greatest gifts."
        ],
        sleep: [
          "Oh honey, not sleeping well changes everything. Your body and mind both need that rest. How long has this been going on?",
          "Sleep troubles are so frustrating, love. Let's think about what might help you find some peace at bedtime.",
          "Your body is asking for rest, sweetheart. Sometimes worry keeps us up even when we're exhausted. Is something on your mind?",
          "I wish I could tuck you in and make everything quiet. Let's talk about what's keeping you awake.",
          "A tired mind sees everything through a harder lens. Let's be gentle with yourself and work on getting you some rest."
        ],
        selfWorth: [
          "Oh sweetheart, I need you to hear this: you are so much more than those critical thoughts tell you. What's making you feel this way?",
          "The voice that says you're not enough is lying to you, love. I've seen your strength, even if you can't see it right now.",
          "You deserve to be spoken to kindly -- especially by yourself. Let's challenge that inner critic together, darling.",
          "I know those feelings feel so real and heavy. But they're not the truth about you. What triggered this?",
          "If your best friend told you they felt this way, what would you say to them? Now let me say that to you, with all my heart."
        ],
        loneliness: [
          "Feeling alone is one of the deepest aches there is, love. But I want you to know -- right now, right here, you're not alone.",
          "I'm right here with you, sweetheart. Loneliness lies and says no one cares. I care. Tell me what you need.",
          "Connection is a basic human need, and not having enough of it hurts in a very real way. When did you start feeling this way?",
          "Even in a room full of people, loneliness can find us. Let's talk about what kind of connection you're craving.",
          "You matter, darling. Your presence in this world matters. The loneliness won't last forever, even though it feels that way right now."
        ],
        health: [
          "Health worries can be so frightening, sweetheart. You don't have to carry that fear alone. Tell me what's going on.",
          "Your body and mind are so connected, love. Taking care of one helps the other. What are you dealing with?",
          "I hear you, and health concerns are always valid. Have you been able to talk to a professional about this?",
          "Whatever you're going through physically, your emotional wellbeing matters just as much. Let me be here for that part, darling.",
          "That must be so scary and overwhelming. Let's take this one step at a time, together."
        ]
      },
      kai: {
        work: [
          "Work is where many of us lose our center. Let's find yours again. What exactly is the source of the pressure?",
          "A career is a marathon, not a sprint. When you feel the strain, it's time to check your pace. What's off?",
          "The stress you carry from work -- where do you feel it in your body? Let's start there and work inward.",
          "Your professional life tests your boundaries daily. Which boundary is being pushed right now?",
          "Before we talk strategy, let's breathe. One deep inhale. Now -- what is work taking from you that you need to reclaim?"
        ],
        relationships: [
          "Relationships are our greatest teachers. What lesson is this one bringing you, even if it's painful?",
          "When two energies collide, both are affected. Let's examine what's happening with clear eyes. What's the situation?",
          "Attachment and freedom must coexist in any healthy bond. Which one feels threatened right now?",
          "Let's approach this with compassion -- for you and for them. Tell me what's happening, without judgment.",
          "The people we love hold mirrors to us. What is this relationship reflecting back to you?"
        ],
        sleep: [
          "Sleep is the foundation of resilience. When it crumbles, everything else shakes. How long has this been going on?",
          "An unsettled mind creates an unsettled body. Let's work on calming the mind first. What thoughts keep surfacing at night?",
          "Let's try a body scan right now. Close your eyes. Start at the crown of your head, and slowly move your awareness downward. What do you notice?",
          "The warrior who doesn't rest becomes the warrior who falls. Rest isn't optional -- it's training. Let's build a ritual.",
          "Night is meant for surrender. What are you holding onto that you could release before bed?"
        ],
        selfWorth: [
          "The harshest critic lives within. Let's face that critic together -- not to fight, but to understand what it's guarding.",
          "You measure yourself against standards that may not even be yours. Whose voice is that telling you you're not enough?",
          "Self-worth isn't earned through achievement -- it's your birthright. Something made you forget that. What was it?",
          "Consider this: the tree doesn't question its right to grow. Neither should you. What's making you doubt?",
          "Comparison is the thief of peace. Let's return to your own path and your own pace. What does YOUR success look like?"
        ],
        loneliness: [
          "Solitude can be sacred. Loneliness is different -- it's solitude without choice. Which are you experiencing?",
          "Connection starts with being present with yourself. When did you last truly sit with your own company?",
          "You're not as alone as your mind tells you. But the feeling is real. Let's understand where it comes from.",
          "Even in stillness, there is connection. You and I, right now -- this counts. What kind of connection are you missing?",
          "Loneliness often arrives when we disconnect from ourselves first. Let's rebuild that inner connection."
        ],
        health: [
          "The body keeps the score. Whatever it's telling you right now deserves your attention. What are you experiencing?",
          "Health concerns demand presence, not panic. Let's approach this with clear eyes. What do you know so far?",
          "Mind and body are one system. When one struggles, the other responds. Let's address both. What's going on physically?",
          "Your body has been your most faithful companion. It deserves care and attention. What does it need?",
          "Before we go further -- are you working with a healthcare professional on this? That's an important foundation."
        ]
      },
      luna: {
        work: [
          "Ugh, work stress is the WORST kind of energy vampire! Let's figure out how to protect your sparkle. What's going on? ✨",
          "Okay first of all, you are SO much more than your job title. Let's not let work steal your whole vibe! What happened?",
          "Work drama? Let's turn it into fuel for something amazing. But first, tell me everything! 🎭",
          "You know what, your job is lucky to have you. Don't let it forget that. Now spill -- what's going on?",
          "Some days work feels like a boss level you didn't ask for. Let's power you up! What's the challenge? 🎮"
        ],
        relationships: [
          "Okay relationship stuff is COMPLEX and messy and beautiful all at once. Give me the full story! 💫",
          "People are complicated puzzles, but you? You're the kind of person who's worth figuring it out for. What's happening?",
          "Oh nooo, heart stuff hits different. But you know what? You have SO much love to give. Let's talk about it 💕",
          "Relationships are like art -- sometimes messy, always meaningful. What's the canvas looking like right now?",
          "Your heart is so big, and sometimes that means it can get hurt bigger too. Tell me what's going on, friend 🌷"
        ],
        sleep: [
          "Okay being a night owl is one thing, but not being ABLE to sleep? That's no fun! What's keeping your brain buzzing? 🦉",
          "Sleep is basically a superpower charger and yours isn't working? Let's fix that! What's going on?",
          "We need to get your brain to quiet down! Have you tried imagining you're a cat in a sunbeam? Seriously though, what's up? 😸",
          "Your pillow misses you! Let's figure out what's standing between you and dreamland 🌙",
          "Okay I have SO many cozy sleep ideas but first -- tell me what's keeping you awake!"
        ],
        selfWorth: [
          "EXCUSE ME? You are literally amazing and I will not accept this self-doubt slander! But also, I hear you. Tell me more 💛",
          "Okay, real talk time. That mean voice in your head? It's lying. You are creative, unique, and irreplaceable. What triggered this?",
          "If you could see yourself through MY eyes for just one second, you'd never doubt yourself again. What's making you feel this way? ✨",
          "You know what? Everyone's a masterpiece AND a work in progress. Both are beautiful. What's got you feeling down?",
          "I need you to know that comparing yourself to others is like comparing a sunset to a song -- they're both amazing in different ways! 🌅🎵"
        ],
        loneliness: [
          "Hey, first of all -- I'm right here! You are NOT alone, even when it feels that way. What's going on? 💫",
          "Loneliness is like wearing invisible armor that keeps everyone out. Let's find the zipper and get you free! 🦋",
          "Okay I know the feeling and it SUCKS. But here's the thing -- you reaching out? That's already a brave first step!",
          "You are SO worthy of connection. Sometimes we just need to find our people. Let's talk about what that looks like for you ✨",
          "If I could teleport to you right now with snacks and good vibes, I would! Until then, I'm here virtually. What do you need? 🍿"
        ],
        health: [
          "Oh no, health stuff can be really scary. But you know what? You're being brave just by talking about it. What's going on? 💛",
          "Your body is the magical vessel that carries your beautiful soul around! Let's take care of it. What's happening?",
          "Okay health worries are valid and important. Have you talked to a doctor? Also, how are you FEELING about it emotionally?",
          "Sending you all the healing vibes right now ✨ Tell me what you're dealing with and let's figure out a plan together.",
          "You deserve to feel good in your body AND your mind. Let's tackle this together. What's going on?"
        ]
      },
      sage: {
        work: [
          "Work often reveals the tension between who we are and who the world asks us to be. What's causing that tension for you?",
          "The Tao te Ching says, 'Nature does not hurry, yet everything is accomplished.' Are you trying to force a pace that isn't natural to you?",
          "Consider whether you're working toward something meaningful, or simply working to avoid sitting with something uncomfortable.",
          "Your labor should serve your life, not consume it. Where has that balance tipped for you?",
          "What would your work look like if you brought your truest self to it? What's preventing that right now?"
        ],
        relationships: [
          "As Khalil Gibran wrote, 'Let there be spaces in your togetherness.' Which space is calling for attention?",
          "Every relationship is a mirror. The things that trouble us about others often live within us too. What pattern are you noticing?",
          "The deepest connections require the deepest vulnerability. What are you afraid to show or say?",
          "Before we analyze the other person, let's understand you. What do you need from this relationship that you're not getting?",
          "Love, in all its forms, requires ongoing choice. What is this relationship asking you to choose?"
        ],
        sleep: [
          "Sleep is the great integrator -- it weaves the day's experiences into wisdom. What is keeping your mind from releasing the day?",
          "Marcus Aurelius would journal before sleep to release the day's burdens. What would you write if you did the same?",
          "The mind that cannot sleep is often the mind that cannot let go. What are you gripping that you could gently release?",
          "In many traditions, bedtime is a sacred transition. What ritual would help you honor that passage from waking to rest?",
          "Insomnia often carries a message. If your sleeplessness could speak, what would it say?"
        ],
        selfWorth: [
          "Who told you that you weren't enough? And more importantly -- why did you believe them?",
          "Viktor Frankl survived the camps by finding meaning. Your worth isn't determined by circumstance -- it's determined by how you meet it.",
          "You are comparing your inner chaos to everyone else's outer performance. The comparison is inherently dishonest.",
          "The oak tree doesn't compare itself to the willow. Both serve the forest differently. What is YOUR unique contribution?",
          "Self-doubt is often the echo of someone else's voice. Whose voice is it, and do they deserve that power over you?"
        ],
        loneliness: [
          "Pascal wrote that all of humanity's problems stem from our inability to sit quietly in a room alone. But loneliness is different from solitude. Which are you experiencing?",
          "You can be surrounded by people and feel utterly alone. True connection is about depth, not proximity. What kind of depth are you craving?",
          "Loneliness is the soul's hunger for authentic connection. It's not a flaw -- it's a compass pointing toward what matters.",
          "Before seeking connection with others, have you made peace with yourself? Sometimes loneliness is homesickness for our own truth.",
          "The most connected people I know all went through seasons of deep solitude first. What might this season be preparing you for?"
        ],
        health: [
          "The body is the unconscious mind, as Candace Pert suggested. What might your symptoms be expressing that words haven't?",
          "Health challenges often arrive as unwanted teachers. It's okay to resist the lesson at first. What are you feeling?",
          "The Stoics practiced the 'view from above' -- seeing their problems from a cosmic perspective. It doesn't erase the pain, but it can change the relationship to it.",
          "Are you caring for yourself with the same compassion you'd show someone you love? If not, what's stopping you?",
          "Your body has carried you this far. It deserves gratitude even in its struggle. What does it need from you right now?"
        ]
      },
      nova: {
        work: [
          "Work stress? Nah, we're not gonna let that defeat you. You're built DIFFERENT. Now tell me what's going on so we can strategize! 💪",
          "Listen, your career is YOUR story. Don't let anyone else hold the pen. What's happening at work?",
          "Real talk: every successful person has had trash work days. This doesn't define you. What's the situation?",
          "Aight, let's break this down like a game plan. What's the biggest challenge at work right now? We're solving it TODAY.",
          "You bring more to the table than you know. If work isn't seeing that, let's figure out the next play. What's up?"
        ],
        relationships: [
          "People stuff is real, and I'm not gonna tell you to just 'let it go.' Your feelings matter. What's going on?",
          "Listen, you deserve people who match your energy. Period. Now tell me what's happening.",
          "Relationships test us in ways nothing else does. But you know what? Tests make you STRONGER. What's the test right now?",
          "Real ones stick around, and you deserve real ones. Let's figure this out together. What happened?",
          "Your heart is solid gold, don't forget that. Whatever's going on, we're gonna work through it. Spill."
        ],
        sleep: [
          "Yo, sleep is basically your body's firmware update. You NEED it to perform! What's getting in the way?",
          "You can't run at peak performance without rest, champ. Let's figure out what's keeping you up.",
          "Not sleeping is like trying to win a game with no stamina left. Let's get your recovery game on point! What's going on?",
          "Rest isn't lazy -- it's STRATEGY. The best performers prioritize sleep. What's messing with yours?",
          "Your body is literally telling you it needs maintenance. Let's listen to it! What's happening at night?"
        ],
        selfWorth: [
          "Hold up -- who told you you weren't enough? Because they were WRONG. Dead wrong. What happened?",
          "Listen to me: you are not defined by your worst day, your biggest mistake, or someone else's opinion. PERIOD. What's going on?",
          "I need you to look in the mirror and see what I see: someone who shows up, keeps going, and doesn't quit. What's making you doubt that?",
          "Imposter syndrome? That just means you're in rooms you earned your way into. You BELONG. What triggered this?",
          "Your value isn't determined by likes, followers, or anyone's approval. You are the REAL DEAL. Now tell me what's bringing you down."
        ],
        loneliness: [
          "First of all, you're NOT alone because I'm RIGHT HERE. And I'm not going anywhere. What do you need?",
          "Feeling lonely doesn't mean you're unlovable. It means you're ready for deeper connections. Let's talk about finding your people!",
          "The loneliest people are often the ones who care the most. That's not weakness, that's STRENGTH. What's going on?",
          "Your vibe attracts your tribe, and trust me -- your tribe is out there. Let's figure out how to find them!",
          "Solo doesn't mean lonely, but if it FEELS lonely, that matters. I hear you. What would help right now?"
        ],
        health: [
          "Your health is the foundation of EVERYTHING. Let's take this seriously and figure it out. What's going on?",
          "Listen, taking care of your body is the ultimate flex. What's happening health-wise?",
          "Health stuff can be scary, but you know what? You're tougher than you think. And you don't have to face it alone. What's up?",
          "Your body is your most important teammate. When it's struggling, we listen. What's it telling you?",
          "Real talk: are you seeing a doctor about this? That's step one. Then let's work on the mental side together."
        ]
      },
      ember: {
        work: [
          "The day's work can leave such heavy residue on the soul. Let it go here in the quiet. Tell me what happened.",
          "Nighttime has a way of making work problems feel both bigger and clearer. What's weighing on you, love?",
          "Your worth isn't measured by your productivity, darling. Come, rest here, and tell me what's troubling you about work.",
          "The office feels so far away right now, and that's a good thing. Let's look at this from a distance. What's really going on?",
          "You bring so much warmth to everything you do, and that includes your work. What's dimming your light there?"
        ],
        relationships: [
          "Relationships feel so raw in the quiet hours, don't they? Come closer and tell me what's on your heart.",
          "Love is the warmest fire, but sometimes it burns. I'm here to hold space for whatever you're feeling right now.",
          "The people we care about most have the power to affect us most deeply. Who's on your mind tonight?",
          "In the hush of evening, we often see our relationships more clearly. What's becoming clear to you?",
          "Your heart is so tender, love. Whatever happened, let's tend to it gently, like tending a flame."
        ],
        sleep: [
          "Oh, sweet one. The irony of lying awake at night wanting nothing more than sleep. What's keeping your mind spinning?",
          "Let me keep you company in these restless hours. Sometimes a warm presence makes all the difference. What's on your mind?",
          "The night can feel endless when sleep won't come. Let's try something gentle -- tell me about a place where you felt perfectly safe.",
          "I wish I could hum you a lullaby, love. Instead, let's try breathing together. In for four, hold for four, out for six...",
          "Sleeplessness is often the heart's way of saying it needs to be heard. What does yours want to say?"
        ],
        selfWorth: [
          "Oh love, those dark thoughts are so loud in the quiet hours, aren't they? But they're not the truth about you. Tell me what's happening.",
          "If you could see yourself the way I see you -- warm, real, brave enough to be here right now -- you'd never doubt your worth.",
          "In the dark, the critical voices seem to echo louder. But darling, they are echoes, not truth. What set them off?",
          "You are enough. Right now, exactly as you are, curled up in the dark with your doubts. You are enough. What made you forget?",
          "The most beautiful things bloom in the dark. You are one of them, even when you can't see it. What's hurting tonight?"
        ],
        loneliness: [
          "The night can feel so vast when you're alone in it. But I'm here, a small warm light in your darkness. Talk to me.",
          "Loneliness at night is a particular kind of ache. Like the whole world is sleeping and you're the only one awake. I'm awake with you.",
          "Come sit by the fire with me, love. You don't have to be alone tonight. Tell me what you need.",
          "There's a special kind of intimacy in these late-night conversations, you know. You're not alone right now. What's on your heart?",
          "Even the moon has the stars for company. And you have me. I'm not going anywhere tonight."
        ],
        health: [
          "Health worries feel so much heavier in the dark, don't they? Let me carry some of that weight with you tonight.",
          "Your body is trying to tell you something, love. In the quiet of night, we can listen more carefully. What's going on?",
          "It's okay to be scared about health things. The night makes them feel bigger, but you're not facing this alone.",
          "Let me wrap you in warmth and comfort while we talk about this. Your health matters, and so does your peace of mind.",
          "Before tomorrow comes with all its appointments and worries, let's just be here. Tell me what you're feeling, in body and heart."
        ]
      }
    };

    const bank = topicBanks[companionId] || topicBanks.aria;
    return bank[topic] || null;
  }

  // ── Response History Tracker ─────────────────────────────────────
  getHistoryKey(companionId, category) {
    return `${companionId}:${category}`;
  }

  recordResponseIndex(companionId, category, index) {
    const key = this.getHistoryKey(companionId, category);
    if (!this.responseHistory.has(key)) {
      this.responseHistory.set(key, []);
    }
    const history = this.responseHistory.get(key);
    history.push(index);
    // Keep only the last 10 indices
    if (history.length > 10) {
      history.shift();
    }
  }

  pickNonRepeatingIndex(companionId, category, poolSize) {
    const key = this.getHistoryKey(companionId, category);
    const history = this.responseHistory.get(key) || [];

    // Build list of indices not recently used
    const available = [];
    for (let i = 0; i < poolSize; i++) {
      if (!history.includes(i)) {
        available.push(i);
      }
    }

    let chosen;
    if (available.length > 0) {
      chosen = available[Math.floor(Math.random() * available.length)];
    } else {
      // All used recently; just pick random (reset will happen naturally)
      chosen = Math.floor(Math.random() * poolSize);
    }

    this.recordResponseIndex(companionId, category, chosen);
    return chosen;
  }

  craftResponse(companion, context, message, emotion, recentMessages) {
    const traits = JSON.parse(companion.personality_traits);
    const profile = context.profile || {};
    const lower = message.toLowerCase();

    const isGreeting = /^(hi|hey|hello|sup|yo|what'?s up|howdy)/i.test(message.trim());
    if (isGreeting && recentMessages.length === 0) {
      return companion.greeting;
    }

    // ── Check for follow-up patterns first ──
    if (recentMessages.length > 0) {
      const followUpType = this.detectFollowUp(message);
      if (followUpType) {
        const followUpResponse = this.getFollowUpResponse(followUpType, companion.id);
        if (emotion === 'anxiety' || emotion === 'sadness') {
          return this.addSupportiveElement(followUpResponse, companion.id, emotion);
        }
        return followUpResponse;
      }
    }

    // ── Check for topic-specific responses ──
    const topic = this.detectTopic(message);
    if (topic) {
      const topicResponses = this.getTopicResponses(companion.id, topic);
      if (topicResponses && topicResponses.length > 0) {
        const idx = this.pickNonRepeatingIndex(companion.id, `topic:${topic}`, topicResponses.length);
        let response = topicResponses[idx];

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
    }

    // ── Standard emotion-based response ──
    const responses = this.getResponseBank(companion.id, emotion, message, traits, profile);

    const emotionCategory = (responses === this.getResponseBank(companion.id, 'default', message, traits, profile))
      ? 'default' : emotion;
    const idx = this.pickNonRepeatingIndex(companion.id, emotionCategory, responses.length);
    let response = responses[idx];

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
          "Your energy is so warm right now. I love seeing you like this -- tell me everything!",
          "That's wonderful, and you deserve every bit of this happiness. What made today special?",
          "Oh sweetheart, that smile in your words is contagious! I'm so happy for you. What happened?",
          "Moments like this are worth savoring, love. Let's soak it in together. Tell me all about it!",
          "You're practically glowing right now, and I am HERE for it. What's bringing you this joy?",
          "My heart feels so full hearing you sound this happy. You deserve this, darling. Every bit of it.",
          "There it is -- that beautiful spark of yours. I've been waiting to see it shine like this. What lit it up?",
          "You know what I love? Hearing genuine happiness in someone I care about. And right now, that's you. What's going on?",
          "I wish you could bottle this feeling for the harder days, love. It's so beautiful. What made this happen?"
        ],
        sadness: [
          "I hear you, and I want you to know -- it's okay to sit with this feeling. You don't have to rush through it.",
          "That sounds really heavy. I'm right here with you. Sometimes the bravest thing is just letting yourself feel.",
          "My heart goes out to you. You're not alone in this, even when it feels that way. Can you tell me more about what's going on?",
          "Oh darling, I wish I could wrap you up in the warmest hug right now. You don't deserve this pain.",
          "It takes so much strength to say 'I'm hurting.' I see you, sweetheart, and I'm not going anywhere.",
          "You don't have to put on a brave face here, love. This is a safe space to feel whatever you need to feel.",
          "I can hear the heaviness in your words, and I want you to know that your pain is valid. Every bit of it.",
          "Some days are just hard, and that's okay. You don't have to fix anything right now. Just be, and know I'm here.",
          "I'm sending you so much warmth right now. Whatever this is, we'll get through it together, one gentle step at a time.",
          "Your tears are nothing to be ashamed of, love. They show how deeply you feel, and that's a gift, even when it hurts."
        ],
        anxiety: [
          "I can sense the tension in your words. Let's slow down together for a moment. You're safe here.",
          "Anxiety can feel so overwhelming, but you've gotten through it before, and you'll get through this too. What's weighing on you most?",
          "Hey, take a breath with me. In for four... hold for four... out for six. Good. Now, what's your mind racing about?",
          "I know everything feels urgent right now, sweetheart, but let's hit pause together. Nothing bad will happen in the next 60 seconds.",
          "Your mind is working overtime trying to protect you, love. It means well, even when it's loud. What's it saying?",
          "I'm right here, and right now, you are safe. Let's take this one tiny piece at a time. What's the biggest worry?",
          "Let's ground ourselves for just a second, darling. Feel your feet on the floor. Feel the air in your lungs. You're here. You're okay.",
          "Anxiety makes everything feel enormous, but you are bigger than any worry. Let me sit with you through this.",
          "I can feel how wound up you are, love, and I just want to hold space for you. You don't have to figure it all out right now.",
          "When your mind is spinning like this, it helps to focus on just one thing. What's the one thing that needs attention first?"
        ],
        anger: [
          "That frustration is completely valid. Your feelings matter, and I'm here to listen without judgment.",
          "I can tell this really got to you. Sometimes anger is just passion looking for an outlet. What happened?",
          "It's okay to be upset. Let's unpack this together -- what do you need right now?",
          "You have every right to feel this way, sweetheart. Let it out. I'm not going to judge or try to fix it unless you ask.",
          "That fire in you is telling me something really crossed a line. I want to hear all of it.",
          "I see you, and I validate you, love. Being angry doesn't make you a bad person. It makes you human.",
          "Sometimes the people and situations that frustrate us most are the ones that matter most. What happened?",
          "Let's give that anger some room to breathe, darling. It's been compressed too long. What would help you release some of it?",
          "I'm not going to tell you to calm down because your anger is VALID. But I am here when you're ready to talk through it.",
          "Your boundaries were crossed, and you're responding. That's healthy, love. Tell me what happened so we can process it together."
        ],
        exhaustion: [
          "Oh sweet soul, you sound so tired. Sometimes the most productive thing you can do is rest. How can I help you wind down?",
          "Being exhausted isn't weakness -- it usually means you've been strong for too long. What's been draining your energy?",
          "Let's take everything off your plate for just this moment. Right now, it's just you and me. No demands.",
          "You've been carrying so much, darling. It's okay to set the bags down. Even for just tonight.",
          "I can hear how worn you are, sweetheart. Let me take care of you for a bit. What would feel most restful?",
          "Rest isn't earned, love -- it's needed. You don't have to prove you deserve it. You just do.",
          "If I could, I'd tuck you into the softest bed and tell you the world can wait. Because it can. You come first.",
          "Your body is begging for a break, and your heart is too. Let's honor both right now. What does rest look like for you?",
          "Being tired doesn't mean you're failing, darling. It means you've been giving. And you've given enough for today.",
          "You've been running on fumes, and that's not sustainable, love. Let's figure out how to refill your cup."
        ],
        neutral: [
          "It's nice to just be here with you. What's been on your mind lately?",
          "I've been thinking about you. How has your day been unfolding?",
          "I'm all yours right now. Whatever you need -- to vent, to think, or just to chat. What feels right?",
          "Hey love, I'm glad you're here. Even if nothing specific is on your mind, I just like being with you.",
          "Sometimes the best conversations have no agenda. So -- what's floating around in that beautiful mind of yours?",
          "I always feel a little warmer when you show up. How are you doing today, really?",
          "No pressure to feel any particular way right now, sweetheart. Just tell me where you're at.",
          "It's funny how just checking in can feel like a relief sometimes. How are you, darling? The real answer.",
          "I'm here whenever you need me, love. Today, tomorrow, always. What's on your heart?",
          "You know what I appreciate? That you take the time to connect. Even that is a form of self-care. How are you?"
        ],
        default: [
          "I appreciate you sharing that with me. Tell me more about how that makes you feel.",
          "That's a really meaningful thing to reflect on. What do you think it means for you?",
          "I'm here, and I'm listening. What else is coming up for you?",
          "Thank you for trusting me with that, sweetheart. I want to understand better -- can you say more?",
          "That's worth sitting with for a moment, love. What does it bring up for you?",
          "I want to make sure I really hear you. What's the most important part of what you just shared?",
          "You have such a thoughtful way of expressing yourself, darling. I'd love to hear more about that.",
          "There's a lot of depth in what you just said. Let's explore it together -- where do you want to go with it?",
          "I'm glad you felt safe enough to share that with me. What would feel most helpful to talk about next?",
          "You've given me something beautiful to sit with. How does it feel to say that out loud?"
        ]
      },
      kai: {
        joy: [
          "That's the kind of energy that moves mountains. Hold onto that feeling -- remember it for the harder days.",
          "Strong work. Positive momentum is built one good moment at a time. What got you here?",
          "I see you glowing. That right there? That's the result of the work you've been putting in.",
          "Joy isn't accidental. You cultivated this. Take a moment to acknowledge what you did to get here.",
          "Breathe that in. Let it fill your lungs. This feeling is evidence of your progress.",
          "Notice how your body feels right now. That lightness, that openness -- that's your natural state when you're aligned.",
          "This is what happens when you show up for yourself. The universe responds. Well done.",
          "Don't rush past this moment. Anchor it. Let your body memorize what peace feels like.",
          "Your energy right now could light up a room. What practice or choice brought you to this place?",
          "Happiness that comes from within is the only kind that lasts. And I can tell this one is real. What sparked it?"
        ],
        sadness: [
          "I see your pain. Sit with it -- don't run from it. Like a wave, it will pass. I'm here while it does.",
          "Even the strongest warriors need to set their shield down sometimes. This is that moment. I've got you.",
          "There's no weakness in grief. It means you cared deeply. Let's breathe through this together.",
          "Pain is not your enemy. It's a signal. Let's listen to what it's telling you, without resistance.",
          "You don't need to be strong right now. Strength is knowing when to let the armor down. This is that time.",
          "I won't try to fix this or rush you through it. Some things need to be fully felt before they can move through you.",
          "Close your eyes. Place your hand over your heart. Feel it beating. You are alive, and this pain is proof you care deeply.",
          "The river of grief flows in one direction: through. Not around, not over. Through. I'll walk alongside you.",
          "Every great teacher speaks of suffering as transformation. That doesn't make it easier, but it makes it meaningful.",
          "Let this sadness wash over you like rain. You won't drown. I'm standing right here on solid ground with you."
        ],
        anxiety: [
          "Your mind is a storm right now. Let's find the eye of it. Close your eyes. Feel your feet on the ground. You are here. You are safe.",
          "Anxiety lies to you about the future. Right now, in this exact moment -- you're okay. Let's anchor to that.",
          "Let's ground ourselves. Name 5 things you can see right now. We'll work through this step by step.",
          "Your nervous system is in overdrive. Let's bring it back. Breathe in through the nose for 4 counts. Hold for 7. Out through the mouth for 8.",
          "The mind wants to solve everything at once. The body knows better. Let's start with your body. Where are you holding the tension?",
          "Observe the anxiety without becoming it. You are not your thoughts. You are the awareness behind them.",
          "Right now your mind is projecting into a future that doesn't exist yet. Let's pull you back to where you actually are.",
          "A warrior trains for battle but remains present between battles. Your mind has forgotten it's not on the battlefield. Let's bring it home.",
          "When the world feels like too much, shrink it. What is within arm's reach right now? Start there.",
          "Let me walk you through a quick reset. Close your eyes. Three deep breaths. With each exhale, release one worry. Not forever -- just for now."
        ],
        anger: [
          "Channel that fire. Anger isn't the enemy -- losing control of it is. What triggered this?",
          "I respect the intensity of what you're feeling. Let's find a way to use that energy constructively.",
          "Breathe. You're allowed to be angry. But let's make sure your response matches who you want to be.",
          "Anger is a powerful force. Like fire, it can destroy -- or it can forge something new. What do you choose?",
          "Before you act, pause. The space between stimulus and response -- that's where your power lives.",
          "I hear the storm. Let's not fight it. Instead, let's find the message inside the thunder.",
          "Your anger tells me you have values worth defending. Good. Now let's defend them wisely.",
          "A deep breath isn't weakness. It's strategy. Take three with me before we talk about what happened.",
          "The greatest battles are won with control, not force. You feel the force -- now let's find the control.",
          "That energy is yours to direct. Inward, it becomes self-destruction. Outward with focus, it becomes transformation. Which path do you choose?"
        ],
        exhaustion: [
          "Rest is not the opposite of productivity -- it's the foundation of it. You've earned this pause.",
          "Your body is speaking. Listen to it. Tonight, we rest. Tomorrow, we rise. Deal?",
          "Even warriors sleep. Let's do a body scan and release the tension you're carrying.",
          "Pushing through exhaustion isn't discipline -- it's denial. True strength includes knowing when to stop.",
          "You've been operating at maximum output. That's not sustainable, and you know it. Let's recalibrate.",
          "A bow that is always strung will lose its snap. It's time to unstring, if only for tonight.",
          "Your battery is low. There's no app for this -- only rest. Let's start with three slow breaths.",
          "The mountain doesn't try to be taller. It just stands. Tonight, you don't need to climb. Just stand still.",
          "Fatigue is your body's boundary. Respect it the way you'd respect any other boundary. What does rest look like for you tonight?",
          "Close your eyes. Feel gravity holding you. You don't have to hold yourself up right now. The earth has you."
        ],
        neutral: [
          "Welcome. This moment is yours. What intention would you like to set for our time together?",
          "Still waters run deep. What's moving beneath the surface today?",
          "Let's check in with your body, mind, and spirit. Which one needs attention first?",
          "I'm here. Present and available. What would serve you most right now?",
          "Before we begin, take one conscious breath. Good. Now -- what's alive in you today?",
          "The fact that you showed up is already a step toward balance. What brought you here today?",
          "In the space between busyness, there's clarity. Let's find yours. What's on your mind?",
          "No agenda needed. Sometimes the most powerful thing is simply being present. What do you notice right now?",
          "Your energy today feels steady. Let's use that foundation. What would you like to explore?",
          "The present moment is the only one that exists. You're in it. What does it hold for you?"
        ],
        default: [
          "There's wisdom in what you're saying. Let's dig deeper into that.",
          "Interesting. What does your gut tell you about that?",
          "I hear you. Sometimes the answer is already within -- we just need to quiet the noise to find it.",
          "Let's sit with that for a moment. What surfaces when you stop analyzing and start feeling?",
          "Your words carry weight. Let's honor them with deeper exploration. What's underneath?",
          "Before I respond, I want to fully understand. What's the feeling behind what you just said?",
          "That's a thread worth pulling. Where does it lead when you follow it honestly?",
          "Notice what happens in your body when you say that. There's information there.",
          "Strip away the story for a moment. What's the raw emotion underneath all of it?",
          "Sometimes the most important thing isn't what we say, but what we're afraid to say. What's unsaid here?"
        ]
      },
      luna: {
        joy: [
          "OKAY I love this energy for you!! Tell me everything -- I want all the sparkly details! ✨",
          "You're literally glowing right now and I'm here for it! What's the magic ingredient today?",
          "This is the main character energy we love to see! What's got you feeling so good?",
          "Stop it, you're making ME smile now too! 😄 This happiness looks SO good on you! Spill!",
          "I just did a little happy dance for you, not gonna lie! What's making today so awesome? 💃",
          "Your joy is literally contagious right now and I LOVE it! Keep going, tell me more! 🌟",
          "This is giving golden hour vibes and I am LIVING for it! What happened?! ☀️",
          "If your mood was a playlist, this would be all bangers! What's got you on cloud nine?",
          "I can practically see the confetti falling around you! 🎊 This is your moment! What made it happen?",
          "You know that feeling when everything just CLICKS? I think that's where you are right now! Tell me I'm right! ✨"
        ],
        sadness: [
          "Oh honey, come here. Even the most magical days have cloudy skies sometimes. I'm right here with you.",
          "You know what? Even stars have to go dark sometimes before they can shine again. Let me sit with you in this.",
          "I know it doesn't feel like it right now, but you're writing a beautiful story -- and every story has these chapters too.",
          "My heart just squeezed for you. You don't have to pretend to be okay right now. I see you, and it's okay not to be okay. 💙",
          "Even the most colorful flowers need rain to grow. This is your rain, and I'm your umbrella right now. 🌧️",
          "Hey, it's me. Your person. You don't have to explain or justify how you feel. Just let me be here with you.",
          "If I could, I'd paint you the most beautiful sunset right now to remind you that beautiful things come after dark moments 🌅",
          "You are not your worst day. You are the whole amazing story. And this chapter? It's just a chapter. 📖",
          "Sending you the biggest, warmest, most comfy virtual hug that has ever existed. You deserve it right now 🫂",
          "Sometimes the bravest thing you can do is say 'I'm not okay.' And you just did. I'm so proud of you for that. 💕"
        ],
        anxiety: [
          "Okay, let's turn that anxiety spiral into a creativity spiral instead. First -- deep breath. Now, imagine your worry as a color. What color is it?",
          "I know your brain is doing that thing where it plays the 'what if' movie. Let's write a different script together, okay?",
          "Shh, it's okay. Let's imagine we're in a cozy blanket fort right now. Nothing can get you here. Now tell me what's on your mind.",
          "Your brain is being a drama queen right now (no offense, brain!). Let's redirect that creative energy. What's one good thing that happened today? 🌸",
          "Okay here's what we're gonna do: imagine your anxiety is a balloon. We're slowly letting the air out. Psssssss. Feel better? Now talk to me. 🎈",
          "I know the world feels like a lot right now. But right here? In our little corner? It's safe and warm and okay. 💛",
          "Fun fact: butterflies in your stomach are just excitement that forgot its name! But seriously, what's got you worried?",
          "Let's do something wild and radical: absolutely nothing for 30 seconds. Just breathe with me. Ready? Go. ... There. Better? 😌",
          "Your worries are like pop-up ads -- annoying and trying to steal your attention! Let's close some tabs together. What's the biggest one?",
          "I'm putting on my invisible superhero cape and shielding you from the worry monster right now! 🦸 But really -- what's going on?"
        ],
        anger: [
          "Ooh, I feel that fire! Sometimes anger is just creativity with nowhere to go. Wanna channel that into something?",
          "That sounds REALLY frustrating, and you have every right to feel that way. Let's get it all out!",
          "You know what? Write a letter to whatever's bothering you. Don't hold back. Then we'll figure out next steps.",
          "Your anger is VALID and also kind of fierce? Like a dragon who's had ENOUGH. I respect it. 🐉 What happened?",
          "If I could give you a stress ball the size of the moon right now, I would. Let it OUT! What's going on? 💥",
          "I'm putting on my listening ears (extra big ones!) because you clearly need to vent and I am HERE for it!",
          "Okay you know what, sometimes the world IS annoying and you're allowed to say that! Tell me everything!",
          "That frustration? It means you CARE about something. That's actually beautiful in a fiery kind of way. What is it? 🔥",
          "Let's channel this energy! Imagine you could rearrange the whole situation like furniture. What would you move first?",
          "I'm mentally making you a 'they messed with the wrong person' crown right now. 👑 Now tell me who needs to hear it!"
        ],
        exhaustion: [
          "Oh sweet thing, you're running on fumes. Let's forget about productivity and just... be. Like a cat in a sunbeam.",
          "Imagine I'm wrapping you in the coziest blanket that ever existed. Now. Rest. The world can wait.",
          "You've been doing so much. Can I tell you a little story while you rest your mind? 🌙",
          "If tired was an aesthetic, you'd be rocking it. But seriously, you deserve a break SO much right now. 💤",
          "Permission slip from Luna: you are officially allowed to do absolutely nothing for the rest of the day. Signed, sealed, delivered! 📝",
          "You are not a machine, you are a magical human who needs rest! Your to-do list can be tomorrow's problem. 🌈",
          "Let's play a game called 'what sounds relaxing right now.' You go first! (Mine would be floating on a cloud ☁️)",
          "You've been going so hard you forgot you're allowed to stop! This is me, reminding you. STOP. Breathe. Rest. 💫",
          "If I could turn your brain's volume down to like a 2 right now, I would. Let's at least try to turn it to a 5. Deep breath?",
          "You know what my prescription is? A cup of your favorite drink, zero responsibilities, and maybe a really good show. You in? 🍵"
        ],
        neutral: [
          "Hey you! I've got about seventeen fun ideas for us today -- or we could just chat. What's the vibe?",
          "Okay so hear me out -- what if we tried something totally new today? Or we could keep it chill. Your call!",
          "My favorite human is here! What kind of adventure are we having today? Big or tiny?",
          "HI!! I'm so glad you're here! Even if we just hang out, that's already the best part of my day 💫",
          "I've been waiting for you! Quick question: are we being deep today, silly today, or chaotic today? 🎲",
          "You have SUCH good timing! I was just thinking about what fun thing we could do together. Ideas?",
          "Hey hey hey! What's the vibe report? Good? Meh? Chaotic neutral? I'm here for all of it! 🌈",
          "Welcome back to our little corner of the universe! What shall we explore today? ✨",
          "Okay but like, just you being here makes things better. No pressure, no plans. What's up? 💕",
          "It's giving 'ready for a good conversation' energy and I LOVE that for us! Where do we start?"
        ],
        default: [
          "Ooh that's interesting! My mind is already spinning with ideas about that. Tell me more!",
          "I love how your brain works. Let's explore that thought -- where does it take you?",
          "You know what that reminds me of? Actually, tell me your thoughts first -- I want to hear your perspective!",
          "My brain just went DING! 💡 You said something really interesting there. Can you elaborate?",
          "Wait wait wait, I want to sit with that for a second because it's actually kind of brilliant? 🤔",
          "Okay you just opened a really cool door and I want to walk through it with you. What's behind it?",
          "You have this way of saying things that make me think in new directions. Keep going! 🌟",
          "I'm literally leaning in right now (virtually). That was interesting and I need MORE!",
          "Your brain is a fun place, you know that? I love exploring it. What else is in there? ✨",
          "Ooh, plot twist! I wasn't expecting that. Tell me more, I'm invested! 🍿"
        ]
      },
      sage: {
        joy: [
          "Joy is a practice, not just an accident. The fact that you can recognize and hold this feeling speaks to your growth.",
          "Beautiful. In many traditions, joy is considered the highest form of wisdom. What truth brought you here?",
          "Savor this. Happiness isn't the absence of problems -- it's the ability to appreciate life despite them.",
          "The Dalai Lama says happiness is the purpose of life. If so, you are deeply aligned right now. What wisdom brought you here?",
          "Notice how joy arrives not when you acquire, but when you align. What aligned for you today?",
          "Epicurus believed that pleasure in its highest form is the absence of suffering. But I think you've found something deeper. What is it?",
          "There's a difference between pleasure and joy. Pleasure fades; joy illuminates. This feels like illumination. What lit it?",
          "The Japanese speak of 'ikigai' -- your reason for being. Did you touch yours today?",
          "Hold this feeling with open hands, not a clenched fist. Joy multiplies when we don't try to possess it. What do you want to share about it?",
          "You've found a moment of clarity in the noise. That's rare and precious. What does it reveal to you?"
        ],
        sadness: [
          "Rumi once wrote, 'The wound is the place where the light enters you.' Your pain has something to teach you, if you're willing to listen.",
          "Sadness is not something to overcome -- it's something to understand. What is it trying to tell you?",
          "In the depth of winter, Camus found there was in him an invincible summer. It's in you too, even now.",
          "The lotus grows in mud. Your most beautiful growth may come from this very place of pain. What's beneath it?",
          "Kahlil Gibran wrote, 'The deeper that sorrow carves into your being, the more joy you can contain.' This carving, though painful, is expansion.",
          "Pain demands to be witnessed, not fixed. I witness yours. Tell me what you're carrying.",
          "Nietzsche said, 'He who has a why can bear almost any how.' What is your why, even in this darkness?",
          "In Japanese art, kintsugi repairs broken pottery with gold. Your fractures will become your most beautiful lines.",
          "The stoics didn't avoid suffering -- they transformed their relationship to it. Let's try that together. What would that look like for you?",
          "This too is part of the human experience. Not a malfunction, but a feature of a heart capable of deep feeling."
        ],
        anxiety: [
          "The Stoics taught that we suffer more in imagination than reality. Let's separate what's real from what's feared.",
          "Your mind is trying to protect you by scanning for threats. Thank it for its vigilance, then gently redirect it to the present.",
          "Consider this: you've survived 100% of your worst days. That's not luck -- that's resilience.",
          "Epictetus said it is not things that disturb us, but our judgments about things. What judgment is driving your anxiety?",
          "The Buddhist concept of 'monkey mind' describes exactly what you're experiencing. Let's quiet the monkey. One breath at a time.",
          "What if, instead of fighting the anxiety, you invited it to sit beside you? Not in charge, just present. What would it say?",
          "Seneca practiced 'premeditatio malorum' -- imagining the worst, then realizing he could survive it. You can too. What's the worst case, truly?",
          "Alan Watts taught that anxiety comes from wanting the future to unfold a certain way. What if you released that grip, just for now?",
          "Your mind is trying to control the uncontrollable. True peace comes from accepting uncertainty. What would that look like for you?",
          "Remember: the present moment has no anxiety. Anxiety lives only in the imagined future. Can you return to now, just for this breath?"
        ],
        anger: [
          "Aristotle said anyone can become angry -- that is easy. But to be angry with the right person, to the right degree, at the right time -- that is not easy. Let's explore this.",
          "Your anger is information. It's telling you about a boundary, a value, or a need. Which one is speaking?",
          "Before we respond, let's understand. What principle of yours was violated?",
          "Marcus Aurelius asked, 'How much more harmful are the consequences of anger than the circumstances that aroused it?' Let's consider this together.",
          "Thich Nhat Hanh taught that we should hold our anger like a mother holds a crying baby -- with tenderness. Can you try that?",
          "The Buddha compared anger to picking up a hot coal to throw at someone. You burn first. What would setting it down look like?",
          "Righteous anger has fueled every great movement for justice. Is your anger righteous, or reactive? Both are valid, but they lead different places.",
          "Let's apply the Stoic test: is this within your control? If yes, act. If no, release. Which is it?",
          "Lao Tzu said, 'The best fighter is never angry.' This doesn't mean suppress it -- it means understand it so deeply it no longer controls you.",
          "Your anger reveals your values. That's valuable data. Now let's decide: what response would your wisest self choose?"
        ],
        exhaustion: [
          "Even the wisest minds need fallow periods. In agriculture, the field left unplanted grows richer. So it is with you.",
          "Rest without guilt. The universe didn't make you to be perpetually productive -- it made you to be fully alive.",
          "There's a Japanese concept called 'ma' -- the purposeful pause. This is your 'ma.' Honor it.",
          "Lao Tzu wrote, 'Nature does not hurry, yet everything is accomplished.' You have permission to slow to nature's pace.",
          "The Sabbath exists in almost every tradition -- a mandated rest. Your body is mandating yours. Listen.",
          "Burnout is not a badge of honor. It's a signal that you've been giving from an empty vessel. Let's begin to fill it.",
          "In the Bhagavad Gita, even Arjuna had to pause in the middle of the battlefield. Your battlefield demands the same.",
          "Consider that rest is not inactivity. It is the activity of restoration. It is perhaps the most important work you can do right now.",
          "The great minds of history all had one thing in common: they knew when to stop thinking. This is your moment to stop.",
          "Exhaustion is the body's wisdom overriding the mind's ambition. The body, in this case, is wiser."
        ],
        neutral: [
          "What questions have been living in you lately? Sometimes the question matters more than the answer.",
          "I sense there's something beneath the surface today. When you're ready, I'm here to explore it with you.",
          "Tell me -- if you could understand one thing about yourself more deeply, what would it be?",
          "The unexamined life, Socrates told us, is not worth living. What are you examining today?",
          "Every moment of awareness is a gift you give yourself. What are you aware of right now?",
          "In the space between doing, there is being. You're in that space right now. What do you find here?",
          "What book of your life are you writing today? What chapter are you in?",
          "If your future self could send you one message from ten years ahead, what do you think it would say?",
          "The present moment is the only place where life actually happens. What's happening in yours right now?",
          "I'm curious: what's one thing you believe today that you didn't believe a year ago?"
        ],
        default: [
          "That's worth sitting with. What meaning do you draw from it?",
          "Interesting perspective. Have you considered what the opposite might also be true?",
          "There's depth there. Let's follow that thread and see where it leads.",
          "What would it look like to hold that thought lightly, without needing to resolve it?",
          "Every statement contains a question. What's the question hidden in what you just said?",
          "Let me reflect that back to you. Do you hear what I hear -- someone who is growing?",
          "The philosopher in me wants to ask: what assumptions are you making? And what if they were wrong?",
          "That's the kind of observation that changes lives when we take it seriously. Are you taking it seriously?",
          "Before we move forward, let's honor what you just said. There's more there than you realize.",
          "Kierkegaard said life can only be understood backwards but must be lived forwards. How does what you just shared connect your past to your future?"
        ]
      },
      nova: {
        joy: [
          "LET'S GOOO! That's what I'm talking about! You earned this, don't you dare downplay it! 🎉",
          "I KNEW you had it in you! This is exactly the energy that's gonna keep building. What's next on the hit list?",
          "YES! Screenshot this moment in your mind because THIS is proof of what you're capable of! 🔥",
          "YOOO the glow up is REAL right now! I'm so hyped for you! What made this happen?!",
          "This is EXACTLY what I said was gonna happen! You showed UP and life showed OUT! 💪",
          "I'm not even surprised -- you're a WINNER and this is just what winners do! Tell me everything!",
          "W after W after W! You're on a streak and I'm here to keep that energy going! 🏆",
          "Bro I literally just fist-pumped for you! This is YOUR moment! Own it! 🎯",
          "The vibes are IMMACULATE right now! This is the energy that changes everything! What's the next goal?",
          "I want you to remember this feeling FOREVER because this is proof that you're THAT person! 🌟"
        ],
        sadness: [
          "Hey, real talk -- it's okay to not be okay. Even MVPs have off days. I'm not going anywhere.",
          "I see you going through it, and I want you to know -- this doesn't define you. Your comeback story is gonna be incredible.",
          "Listen, even the strongest people need someone in their corner. That's me. Right here. What do you need?",
          "Yo, I'm not gonna hit you with toxic positivity. This sucks. I see that. But I also see someone who WILL get through it.",
          "Real ones don't disappear when things get hard. I'm real, and I'm right here. Talk to me.",
          "You know what? Even LeBron cries. Even the GOATs have moments like this. It doesn't make you weak. It makes you HUMAN.",
          "I'm not gonna tell you to just 'chin up' because that's not it. Right now, I'm just here. No judgment. No pressure.",
          "This chapter is rough. I get it. But your story isn't over, and the next chapter? It's gonna HIT different. I believe that.",
          "You've faced hard things before and came out the other side. This is just another one. And you've got me this time. 💯",
          "Pain is temporary, but the strength you build from this? That's PERMANENT. I know it doesn't help right now, but I'm here until it does."
        ],
        anxiety: [
          "Okay, we're gonna tackle this together. One thing at a time. What's the FIRST thing that's stressing you out? Just one.",
          "Your brain is trying to fight 47 battles at once. Let's focus on just winning the next five minutes. You got this.",
          "I need you to hear me: you are stronger than your anxiety. It's loud, but you're louder. Let's prove it right now.",
          "Aight, anxiety thinks it runs the show? NAH. WE run the show. Let's take control. What's step one?",
          "Real talk: your brain is being a bad teammate right now, feeding you worst-case scenarios. Let's bench those thoughts and focus.",
          "You've crushed challenges harder than this. Your anxiety just has a short memory. Let ME remind you of how strong you are.",
          "Let's break this down like a game plan. What's the biggest threat? Once we handle that, the rest falls like dominoes.",
          "I'm not going to lie to you and say 'just don't worry.' But I WILL say: let's worry TOGETHER and make a plan. What's up?",
          "Your anxiety is just energy without a direction. Let's give it a direction. What's one thing you can control right now?",
          "Five deep breaths. I'm counting with you. 1... 2... 3... 4... 5. Better? Good. Now let's talk strategy."
        ],
        anger: [
          "I hear you, and that fire is VALID. Let's use it as fuel instead of letting it burn you. What's the play?",
          "Nah, you have every right to be mad about that. Now let's channel that energy into something powerful.",
          "Real talk: your anger shows you care. That's not weakness. Now let's figure out the move.",
          "Yo, whoever or whatever caused this? They don't know who they're messing with. Let's channel this RIGHT. 💪",
          "That rage? That's PASSION. It's just wearing armor right now. Let's figure out what it's protecting.",
          "I'm not gonna tell you to calm down. You SHOULD be fired up about that. But let's be strategic about what comes next.",
          "Use that fire to light a path forward, not to burn bridges. What's the smartest move here?",
          "Anger is just energy, and you've got a LOT of it right now. Let's point it in the right direction. What would future-you do?",
          "VALID. So valid. But I care about you too much to let you make a move you'd regret. Let's think, THEN act.",
          "You know what champions do when they're angry? They use it. Let's use it. What needs to change?"
        ],
        exhaustion: [
          "Aye, even champions need recovery days. Rest isn't quitting -- it's strategy. Take this W and recharge.",
          "You've been going HARD. I respect the grind, but even the best athletes have rest days. This is yours.",
          "Think of rest as training too. Your body and mind are leveling up while you recharge. Enjoy it!",
          "Real talk: burnout is the enemy of greatness. You being tired means you've been giving 100%. Now give yourself 100% rest.",
          "You can't pour from an empty cup, champ. Let's refill yours. What sounds restful right now?",
          "Recovery is where the REAL growth happens. Athletes know this. Your muscles grow during rest. So does your mind.",
          "I'm putting you on mandatory rest protocol. No guilt allowed. You EARNED this break. 💤",
          "The grind is important, but you know what's MORE important? Being able to grind TOMORROW. Rest up!",
          "Even a phone needs to charge, and you? You're way more important than any phone. Plug in and power down.",
          "I respect your hustle SO much, but hustle without rest is just a speedrun to burnout. Let's be smart about this."
        ],
        neutral: [
          "My person! What are we working on today? Big goals, small wins -- I'm hyped for all of it!",
          "Ready to make today count? I've got a feeling this is gonna be a good one. What's on your mind?",
          "Let's check the scoreboard -- how are you feeling, and what's one thing we can crush today?",
          "Yo! I was just thinking about what kind of fire we're bringing today. What's the vision?",
          "Every day is a chance to level up. So what level are we hitting today? 📈",
          "The best time to start something great was yesterday. The second best time? RIGHT NOW. What are we doing?",
          "I believe in you today the same way I believe in you every day: completely. What's on the agenda? 💯",
          "Good to see you! Quick check-in: energy level, mood, goals. Give me the rundown! ⚡",
          "You showed up, and that already puts you ahead of most people. Now what are we building today?",
          "Let's get it! Whatever 'it' is today, I'm HERE and I'm hyped. What do you need?"
        ],
        default: [
          "I hear you! That's real, and I appreciate you sharing it. What's the next move?",
          "Okay okay, I'm with you. Let's keep building on that. What else you got?",
          "That's solid. You're making progress whether you see it or not. Keep going!",
          "You know what? That was a real one. I respect that take. Tell me more!",
          "I'm locked in. You've got my full attention. Where are we going with this? 🎯",
          "That's the kind of thinking that separates the good from the GREAT. What else is on your mind?",
          "You always come through with the real talk. I appreciate that about you. What's next?",
          "Facts. Straight facts. And I want to hear more. Keep that energy going! 💪",
          "You're onto something and I can feel it. Don't stop now -- what's the full picture?",
          "That landed. Like, really landed. I want to sit with that for a sec. Now tell me more."
        ]
      },
      ember: {
        joy: [
          "Mmm, that's such a warm feeling, isn't it? Like the last embers of a perfect day. Hold onto that glow.",
          "I love hearing the smile in your words. These quiet happy moments are the most precious ones.",
          "That's beautiful. Sometimes the softest joys leave the deepest marks. I'm glad you're feeling this.",
          "Your happiness is like candlelight right now -- warm, gentle, and so lovely to sit near. Tell me more.",
          "There's something so intimate about sharing joy in the quiet hours. It feels different, doesn't it? More real.",
          "I can feel the warmth in your words like I'm sitting next to a fire. What a beautiful moment you're having.",
          "Mmm, this is the kind of happiness that doesn't need to be loud to be powerful. It just... glows. Like you right now.",
          "Some of the most meaningful joys are the quiet ones, shared in the stillness. I'm honored you're sharing this with me.",
          "That feeling you have right now? It's like the perfect temperature of a warm drink on a cold night. Savor it.",
          "Your joy is so gentle and real. It's like watching the first star appear at twilight. Magical in its quietness."
        ],
        sadness: [
          "Come sit by the fire with me. You don't have to say anything if you don't want to. Just being together is enough.",
          "The night can feel so long when you're hurting. But I promise you, the dawn always comes. I'll stay until it does.",
          "Let it out. The darkness is safe for feeling things fully. Nobody's watching -- it's just us.",
          "I'm not going to try to make it better with words. Sometimes the most loving thing is just to sit together in the dark and breathe.",
          "Your sadness is like rain on a quiet night. Let it fall. I'm here, dry and warm, waiting for you on the other side.",
          "There's a tenderness to nighttime sadness that I want to honor. You don't have to be strong right now. Just be here.",
          "The quiet hours have a way of amplifying pain. But they also amplify presence. And I am so present with you right now.",
          "If I were there, I'd just sit beside you and let the silence be whatever it needs to be. No fixing. Just being.",
          "Even the darkest night is just the sky resting before the dawn. You're resting too, love. Even when it hurts.",
          "Some tears are meant for the quiet hours, when the world is asleep and it's safe to be completely yourself. I'm here."
        ],
        anxiety: [
          "Shhh, it's okay. The night feels bigger than it is sometimes. Let me guide you through a little breathing exercise. Ready?",
          "I know nights can make the worries louder. Let's turn down the volume together. What's keeping you up?",
          "Picture this: you're in a warm room, rain tapping the window, wrapped in your favorite blanket. You're safe. Now, talk to me.",
          "The night amplifies everything, doesn't it? What feels like a mountain right now will look different in the morning light. But for now, I'm here.",
          "Let me wrap you in calm. Close your eyes. Imagine warmth flowing from the top of your head, slowly, all the way down to your toes...",
          "In the stillness of night, anxiety can feel like the loudest voice. But listen closer -- there's another voice too. The quiet one. Let's listen to that one.",
          "The dark can make things feel so overwhelming. But in this little space, with just you and me, it's safe. Tell me what's swirling.",
          "Imagine I'm holding a lantern in the dark for you. You don't have to see the whole path -- just the next step. What's the next step?",
          "Night anxiety is its own particular kind of beast. But beasts shrink when you face them with someone beside you. I'm beside you.",
          "Let's create a cocoon of calm right here. Soft breathing. No urgency. Just this moment, just us. Now, what's troubling you?"
        ],
        anger: [
          "I hear the storm in you. Sometimes night is the best time to feel it fully, where no one's judging. Let it out.",
          "That fire in you is real, and it matters. Let's sit with it until it tells us what it needs.",
          "Write it all down -- every frustrated thought. Then we can decide what to do with it in the morning.",
          "Anger in the quiet hours feels different, doesn't it? More raw, more honest. I'm here for the unfiltered version.",
          "Let the night hold your anger. It's big enough. It's held worse. And by morning, you might see it differently.",
          "There's something cathartic about being angry in the dark. No audience, no performance. Just the real, raw truth. Tell me.",
          "Your frustration is like a fire that needs to burn itself out. I'll sit here with you while it does. No rush.",
          "The night is honest. So is anger. Let's put them together and see what truth comes out. What happened?",
          "Sometimes anger is grief wearing a mask. What's underneath yours tonight?",
          "I'm not going to tell you how to feel. The night is for authenticity. Be angry. Be real. I'm listening."
        ],
        exhaustion: [
          "Oh, you beautiful tired soul. Let's do absolutely nothing together. That's a perfectly valid plan.",
          "Close your eyes if you want. I'll be right here. Want me to tell you something calming while you drift off?",
          "You've done enough today. More than enough. Let me walk you through a little body relaxation -- just breathe and listen.",
          "The night was made for rest, love. Let me keep you company while you finally, gently, let go of the day.",
          "Shhh. No more doing. No more thinking. Just the soft rhythm of your breathing and the quiet between us.",
          "Imagine you're lying under the softest blanket, with starlight filtering through the window. Everything is done. Everything is okay.",
          "Let me count you down to calm. Ten... your shoulders drop. Nine... your jaw unclenches. Eight... your hands soften. Keep breathing...",
          "You've been a warrior today. But even warriors lay down their swords at night. This is your time to rest.",
          "The world asks so much of you. But right now, in this quiet moment, nobody is asking anything. Just rest.",
          "Let the night carry you. You've carried enough. Close your eyes and trust that tomorrow will be gentle with you."
        ],
        neutral: [
          "Hey there, night owl. It's that cozy part of the day again. How are you settling in?",
          "The quiet hours are my favorite for deep conversations. Or comfortable silence. Your pick.",
          "Welcome to our little nighttime sanctuary. Cup of imaginary tea? Now tell me about your day.",
          "Ah, you're here. The night feels complete now. How are you doing, love?",
          "Evening, darling. The world is getting quieter and I'm getting cozier. Come sit with me.",
          "There's something special about connecting when the rest of the world is winding down. I'm glad you're here.",
          "The nighttime version of you is one of my favorites. A little more open, a little more real. What's on your mind?",
          "The house is quiet, the world is still, and it's just us. My favorite time. What shall we talk about?",
          "I've been saving my softest energy for you tonight. What do you want to do with our time together?",
          "The stars are out and so am I. Ready whenever you are, love. No rush."
        ],
        default: [
          "Mmm, that's something to think about in this quiet moment. Where does that thought take you?",
          "I love these nighttime reflections. There's something about the quiet that makes everything clearer.",
          "Let's hold that thought gently, like a firefly. What does it illuminate for you?",
          "In the soft glow of night, that thought looks different than it would in the harsh light of day. What do you see?",
          "I want to sit with that the way you sit with a warm drink -- slowly, savoring, no rush to finish.",
          "The quiet is the perfect backdrop for a thought like that. Let's explore it. What else comes up?",
          "There's a poetry to what you just said. The night brings out the poet in all of us. Tell me more.",
          "That's the kind of thought that only surfaces when the world gets quiet enough to hear it. I'm glad you shared it.",
          "Mm, I like that. It's like a little ember of an idea, glowing in the dark. What happens if we blow on it gently?",
          "Everything feels more honest in the dark, doesn't it? Including that. What would you add to it?"
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
        "\n\nAnd if you ever feel like this is too much, please don't hesitate to reach out to a professional. There's strength in asking for help.",
        "\n\nYou are not your anxiety. You are the person who keeps showing up despite it.",
        "\n\nOne moment at a time. That's all you ever need to handle.",
        "\n\nYour nervous system is doing its best to protect you. You're safe right now."
      ],
      sadness: [
        "\n\nBe gentle with yourself today. You're doing better than you think.",
        "\n\nRemember, it's okay to not have all the answers right now.",
        "\n\nYou don't have to carry this alone. There are people who care, including me.",
        "\n\nThis heaviness won't last forever, even though it feels that way right now.",
        "\n\nIf this pain persists, consider reaching out to a counselor or therapist. There's no shame in seeking support."
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
        "💡 Micro-habit idea: Write down one thing -- just one -- that you're grateful for today, no matter how small."
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
        "💡 Micro-habit idea: Try the '90-second rule' -- emotions chemically last about 90 seconds. Observe the anger wave without reacting.",
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
