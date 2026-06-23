// ============================================
// SERENITY — Weekly Wellness Report & Daily Challenges
// ============================================

(function () {
  'use strict';

  // ==================== WEEKLY REPORT ====================

  var WeeklyReport = {};

  var MOTIVATIONAL_MESSAGES = {
    improving: [
      'You are on a beautiful upward path. Keep nurturing yourself.',
      'Your growth this week has been remarkable. You deserve this momentum.',
      'Every small step you took this week added up to real progress.'
    ],
    declining: [
      'Tough weeks make us stronger. Be gentle with yourself.',
      'It is okay to have hard days. Tomorrow is a fresh canvas.',
      'You showed up even when it was hard. That takes real courage.'
    ],
    stable: [
      'Consistency is its own kind of strength. Well done.',
      'Steady and present — that is something to be proud of.',
      'You held your ground this week. That matters more than you think.'
    ]
  };

  function pickMotivational(trend) {
    var msgs = MOTIVATIONAL_MESSAGES[trend] || MOTIVATIONAL_MESSAGES.stable;
    var day = new Date().getDay();
    return msgs[day % msgs.length];
  }

  function buildSparklineSVG(moodScores) {
    if (!moodScores || moodScores.length === 0) return '';
    var w = 320, h = 60, pad = 8;
    var maxScore = 10, minScore = 0;
    var pts = moodScores.map(function (m, i) {
      var x = pad + (i / Math.max(moodScores.length - 1, 1)) * (w - pad * 2);
      var y = h - pad - ((m.score - minScore) / (maxScore - minScore)) * (h - pad * 2);
      return { x: x, y: y, score: m.score, date: m.date };
    });
    var polyline = pts.map(function (p) { return p.x + ',' + p.y; }).join(' ');
    var areaPath = 'M' + pts[0].x + ',' + (h - pad) + ' L' + pts.map(function (p) {
      return p.x + ',' + p.y;
    }).join(' L') + ' L' + pts[pts.length - 1].x + ',' + (h - pad) + ' Z';
    var dots = pts.map(function (p) {
      return '<circle cx="' + p.x + '" cy="' + p.y + '" r="3" fill="#7EB09B" />';
    }).join('');
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" style="display:block;margin:0 auto;">' +
      '<defs><linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#7EB09B" stop-opacity="0.4"/>' +
      '<stop offset="100%" stop-color="#7EB09B" stop-opacity="0.02"/>' +
      '</linearGradient></defs>' +
      '<path d="' + areaPath + '" fill="url(#sparkGrad)" />' +
      '<polyline points="' + polyline + '" fill="none" stroke="#7EB09B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' +
      dots +
      '</svg>';
  }

  function trendArrow(trend) {
    if (trend === 'improving') return '<span style="color:#7EB09B;">&#9650; Improving</span>';
    if (trend === 'declining') return '<span style="color:#E87C7C;">&#9660; Declining</span>';
    return '<span style="color:#9B8EC4;">&#9679; Stable</span>';
  }

  function buildBondBar(bondGrowth) {
    var pct = Math.min(Math.max(bondGrowth || 0, 0), 100);
    return '<div style="width:100%;height:8px;border-radius:4px;background:rgba(255,255,255,0.08);overflow:hidden;">' +
      '<div style="width:' + pct + '%;height:100%;border-radius:4px;background:linear-gradient(90deg,#9B8EC4,#7EB09B);transition:width 0.6s ease;"></div>' +
      '</div>';
  }

  WeeklyReport.generateReport = function (data) {
    var d = data || {}, userName = d.userName || 'Friend', weekNum = d.weekNumber || '';
    var dateRange = d.dateRange || '', moodScores = d.moodScores || [];
    var avgMood = d.avgMood != null ? d.avgMood : '--', moodTrend = d.moodTrend || 'stable';
    var habitsCompleted = d.habitsCompleted || 0, habitsTotal = d.habitsTotal || 0;
    var exercisesCompleted = d.exercisesCompleted || 0, exerciseMinutes = d.exerciseMinutes || 0;
    var reflectionsWritten = d.reflectionsWritten || 0, conversationCount = d.conversationCount || 0;
    var topEmotions = d.topEmotions || [], companionName = d.companionName || 'Companion';
    var bondGrowth = d.bondGrowth || 0, achievementsEarned = d.achievementsEarned || [];
    var streakDays = d.streakDays || 0, sparkline = buildSparklineSVG(moodScores);

    var emotionChips = topEmotions.slice(0, 5).map(function (e) {
      return '<span style="display:inline-block;padding:4px 12px;margin:3px;border-radius:20px;' +
        'background:rgba(155,142,196,0.15);border:1px solid rgba(155,142,196,0.25);' +
        'font-size:12px;color:#D4CDE8;">' + e.name + ' <span style="opacity:0.6;">x' + e.count + '</span></span>';
    }).join('');

    var achievementItems = achievementsEarned.map(function (a) {
      return '<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;margin:3px;' +
        'border-radius:16px;background:rgba(232,168,124,0.12);border:1px solid rgba(232,168,124,0.2);font-size:12px;color:#F0EDE8;">' +
        a.icon + ' ' + a.name + '</span>';
    }).join('');

    var habitsPercent = habitsTotal > 0 ? Math.round((habitsCompleted / habitsTotal) * 100) : 0;

    return '<div style="' +
      'width:375px;max-width:100%;margin:0 auto;border-radius:24px;overflow:hidden;' +
      'background:linear-gradient(165deg,#161625 0%,#0F0F1A 40%,#1A1528 100%);' +
      'box-shadow:0 8px 48px rgba(0,0,0,0.5);font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;color:#F0EDE8;' +
      '">' +

      // Header
      '<div style="padding:28px 24px 16px;text-align:center;position:relative;overflow:hidden;">' +
        '<div style="position:absolute;top:-30px;left:-30px;width:140px;height:140px;border-radius:50%;' +
          'background:radial-gradient(circle,rgba(126,176,155,0.15),transparent 70%);"></div>' +
        '<div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;border-radius:50%;' +
          'background:radial-gradient(circle,rgba(155,142,196,0.12),transparent 70%);"></div>' +
        '<div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:rgba(240,237,232,0.4);margin-bottom:6px;">Serenity</div>' +
        '<div style="font-family:Playfair Display,Georgia,serif;font-size:22px;font-weight:600;' +
          'background:linear-gradient(135deg,#7EB09B,#9B8EC4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;' +
          'background-clip:text;">Your Week at a Glance</div>' +
        '<div style="font-size:13px;color:rgba(240,237,232,0.5);margin-top:6px;">' +
          (weekNum ? 'Week ' + weekNum + ' &middot; ' : '') + dateRange +
        '</div>' +
        '<div style="font-size:14px;color:rgba(240,237,232,0.65);margin-top:4px;">Hello, ' + userName + '</div>' +
      '</div>' +

      // Sparkline
      '<div style="padding:0 24px 16px;">' +
        '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(240,237,232,0.4);margin-bottom:8px;">Mood This Week</div>' +
        '<div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:12px 8px;">' +
          sparkline +
          '<div style="text-align:center;margin-top:8px;">' + trendArrow(moodTrend) + '</div>' +
        '</div>' +
      '</div>' +

      // Stats Grid
      '<div style="padding:0 24px 16px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
        buildStatCell('Avg Mood', typeof avgMood === 'number' ? avgMood.toFixed(1) + '/10' : avgMood, '#7EB09B') +
        buildStatCell('Habits', habitsCompleted + '/' + habitsTotal + ' (' + habitsPercent + '%)', '#9B8EC4') +
        buildStatCell('Streak', streakDays + ' days', '#E8A87C') +
        buildStatCell('Exercises', exercisesCompleted + ' (' + exerciseMinutes + ' min)', '#6C9BCF') +
        buildStatCell('Reflections', reflectionsWritten, '#7EB09B') +
        buildStatCell('Conversations', conversationCount, '#9B8EC4') +
      '</div>' +

      // Top Emotions
      (topEmotions.length > 0 ?
        '<div style="padding:0 24px 16px;">' +
          '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(240,237,232,0.4);margin-bottom:8px;">Top Emotions</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:2px;">' + emotionChips + '</div>' +
        '</div>' : '') +

      // Companion Bond
      '<div style="padding:0 24px 16px;">' +
        '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(240,237,232,0.4);margin-bottom:8px;">' +
          companionName + ' Bond Growth</div>' +
        buildBondBar(bondGrowth) +
        '<div style="text-align:right;font-size:11px;color:rgba(240,237,232,0.4);margin-top:4px;">+' + bondGrowth + '%</div>' +
      '</div>' +

      // Achievements
      (achievementsEarned.length > 0 ?
        '<div style="padding:0 24px 16px;">' +
          '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(240,237,232,0.4);margin-bottom:8px;">Achievements Earned</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:2px;">' + achievementItems + '</div>' +
        '</div>' : '') +

      // Motivational Message
      '<div style="padding:16px 24px 20px;text-align:center;">' +
        '<div style="font-family:Playfair Display,Georgia,serif;font-style:italic;font-size:14px;' +
          'color:rgba(240,237,232,0.7);line-height:1.6;padding:12px 16px;' +
          'border-top:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06);">' +
          '&ldquo;' + pickMotivational(moodTrend) + '&rdquo;' +
        '</div>' +
      '</div>' +

      // Share Hint
      '<div style="padding:0 24px 24px;text-align:center;">' +
        '<div style="font-size:11px;color:rgba(240,237,232,0.25);letter-spacing:1px;">' +
          'Screenshot &amp; share your progress' +
        '</div>' +
      '</div>' +

    '</div>';
  };

  function buildStatCell(label, value, color) {
    return '<div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:14px 12px;text-align:center;' +
      'border:1px solid rgba(255,255,255,0.05);">' +
      '<div style="font-size:18px;font-weight:600;color:' + color + ';">' + value + '</div>' +
      '<div style="font-size:11px;color:rgba(240,237,232,0.4);margin-top:4px;text-transform:uppercase;letter-spacing:1px;">' + label + '</div>' +
    '</div>';
  }

  WeeklyReport.renderReportView = function (userId) {
    var container = document.createElement('div');
    container.style.cssText = 'padding:20px;max-width:420px;margin:0 auto;';
    container.innerHTML = '<div style="text-align:center;color:rgba(240,237,232,0.5);padding:40px 0;">Loading your weekly report...</div>';

    var dashUrl = '/api/dashboard/' + encodeURIComponent(userId) + '/full';
    var trendsUrl = '/api/checkins/' + encodeURIComponent(userId) + '/trends';

    Promise.all([
      fetch(dashUrl).then(function (r) { return r.json(); }),
      fetch(trendsUrl).then(function (r) { return r.json(); })
    ]).then(function (results) {
      var dash = results[0] || {};
      var trends = results[1] || {};

      var r = {
        userName: dash.userName || dash.name || 'Friend', weekNumber: trends.weekNumber || dash.weekNumber || '',
        dateRange: trends.dateRange || dash.dateRange || '', moodScores: trends.moodScores || dash.moodScores || [],
        avgMood: trends.avgMood != null ? trends.avgMood : dash.avgMood, moodTrend: trends.moodTrend || dash.moodTrend || 'stable',
        habitsCompleted: dash.habitsCompleted || 0, habitsTotal: dash.habitsTotal || 0, bestStreak: dash.bestStreak || 0,
        exercisesCompleted: dash.exercisesCompleted || 0, exerciseMinutes: dash.exerciseMinutes || 0,
        reflectionsWritten: dash.reflectionsWritten || 0, conversationCount: dash.conversationCount || 0,
        topEmotions: trends.topEmotions || dash.topEmotions || [], companionName: dash.companionName || 'Companion',
        bondGrowth: dash.bondGrowth || 0, achievementsEarned: dash.achievementsEarned || [], streakDays: dash.streakDays || 0
      };

      container.innerHTML = WeeklyReport.generateReport(r) +
        '<div style="text-align:center;margin-top:20px;">' +
          '<button onclick="window.WeeklyReport._downloadHint()" style="' +
            'padding:12px 28px;border:none;border-radius:12px;cursor:pointer;font-size:14px;font-weight:500;' +
            'background:linear-gradient(135deg,#7EB09B,#9B8EC4);color:#F0EDE8;' +
            'box-shadow:0 4px 16px rgba(126,176,155,0.3);transition:transform 0.2s ease,box-shadow 0.2s ease;' +
          '">Download as Image</button>' +
        '</div>';
    }).catch(function (err) {
      container.innerHTML = '<div style="text-align:center;color:#E87C7C;padding:40px 20px;">' +
        'Unable to load report data. Please try again later.</div>';
      console.error('WeeklyReport load error:', err);
    });

    return container;
  };

  WeeklyReport._downloadHint = function () {
    alert('To save your report, take a screenshot of the card above. On mobile, press the power + volume-down buttons. On desktop, use your OS screenshot tool.');
  };

  window.WeeklyReport = WeeklyReport;

  // ==================== DAILY CHALLENGES ====================

  var CHALLENGES_STORAGE = 'serenity_challenges';

  var CHALLENGE_POOL = [
    // Mindfulness (0-4)
    { title: 'Take 3 mindful bites of your next meal — really taste it', category: 'Mindfulness', icon: '🧘', difficulty: 'easy' },
    { title: 'Watch the sunset or sunrise today (even a photo counts)', category: 'Mindfulness', icon: '🌅', difficulty: 'easy' },
    { title: 'Spend 5 minutes in complete silence', category: 'Mindfulness', icon: '🤫', difficulty: 'easy' },
    { title: 'Notice 3 beautiful things you\'d normally walk past', category: 'Mindfulness', icon: '🌼', difficulty: 'easy' },
    { title: 'Do one thing with your non-dominant hand', category: 'Mindfulness', icon: '✋', difficulty: 'medium' },
    // Connection (5-9)
    { title: 'Send a genuine compliment to someone', category: 'Connection', icon: '💌', difficulty: 'easy' },
    { title: 'Call someone you haven\'t talked to in a while', category: 'Connection', icon: '📞', difficulty: 'medium' },
    { title: 'Write a thank-you note (digital or physical)', category: 'Connection', icon: '✍️', difficulty: 'easy' },
    { title: 'Ask someone \'How are you really doing?\'', category: 'Connection', icon: '🫂', difficulty: 'medium' },
    { title: 'Share a memory that makes you smile with someone', category: 'Connection', icon: '😊', difficulty: 'easy' },
    // Movement (10-14)
    { title: 'Dance to one full song — no one\'s watching', category: 'Movement', icon: '💃', difficulty: 'easy' },
    { title: 'Take a 10-minute walk with no phone', category: 'Movement', icon: '🚶', difficulty: 'medium' },
    { title: 'Stretch for 5 minutes right now', category: 'Movement', icon: '🧘', difficulty: 'easy' },
    { title: 'Do 10 jumping jacks and notice how you feel after', category: 'Movement', icon: '🏃', difficulty: 'easy' },
    { title: 'Walk barefoot on grass or a different texture', category: 'Movement', icon: '🦶', difficulty: 'medium' },
    // Creativity (15-19)
    { title: 'Draw something, anything — skill doesn\'t matter', category: 'Creativity', icon: '🎨', difficulty: 'easy' },
    { title: 'Write a haiku about your current mood', category: 'Creativity', icon: '✍️', difficulty: 'medium' },
    { title: 'Take a photo of something you find beautiful', category: 'Creativity', icon: '📷', difficulty: 'easy' },
    { title: 'Rearrange something in your space', category: 'Creativity', icon: '🏠', difficulty: 'easy' },
    { title: 'Listen to a genre of music you never listen to', category: 'Creativity', icon: '🎵', difficulty: 'easy' },
    // Self-Care (20-24)
    { title: 'Drink an extra glass of water today', category: 'Self-Care', icon: '💧', difficulty: 'easy' },
    { title: 'Go to bed 30 minutes earlier tonight', category: 'Self-Care', icon: '🌙', difficulty: 'medium' },
    { title: 'Say \'no\' to one thing that drains you', category: 'Self-Care', icon: '🚫', difficulty: 'bold' },
    { title: 'Take a longer shower/bath than usual and enjoy it', category: 'Self-Care', icon: '🛁', difficulty: 'easy' },
    { title: 'Wear something that makes you feel confident', category: 'Self-Care', icon: '👑', difficulty: 'easy' },
    // Kindness (25-29)
    { title: 'Leave an anonymous positive note somewhere', category: 'Kindness', icon: '💛', difficulty: 'medium' },
    { title: 'Let someone go ahead of you in line', category: 'Kindness', icon: '🤝', difficulty: 'easy' },
    { title: 'Donate or give away one thing you don\'t need', category: 'Kindness', icon: '🎁', difficulty: 'medium' },
    { title: 'Write down 3 things you like about yourself', category: 'Kindness', icon: '📝', difficulty: 'easy' },
    { title: 'Forgive someone (even just in your mind)', category: 'Kindness', icon: '🙏', difficulty: 'bold' },
    // Adventure (30-34)
    { title: 'Take a different route than usual', category: 'Adventure', icon: '🗺️', difficulty: 'easy' },
    { title: 'Try a food you\'ve never had before', category: 'Adventure', icon: '🍽️', difficulty: 'medium' },
    { title: 'Learn one word in a new language', category: 'Adventure', icon: '🌍', difficulty: 'easy' },
    { title: 'Do something that slightly scares you', category: 'Adventure', icon: '🎢', difficulty: 'bold' },
    { title: 'Talk to a stranger (safely)', category: 'Adventure', icon: '👋', difficulty: 'bold' },
    // Reflection (35-39)
    { title: 'Write a letter to your future self', category: 'Reflection', icon: '✉️', difficulty: 'medium' },
    { title: 'Write a letter to your past self', category: 'Reflection', icon: '📜', difficulty: 'medium' },
    { title: 'List 5 things that went right this week', category: 'Reflection', icon: '✨', difficulty: 'easy' },
    { title: 'Think about a mistake and find the lesson', category: 'Reflection', icon: '💡', difficulty: 'medium' },
    { title: 'Imagine your ideal day and write it down', category: 'Reflection', icon: '🌟', difficulty: 'easy' }
  ];

  CHALLENGE_POOL.forEach(function (c, i) { c.id = i; });
  var DailyChallenges = {};

  function dateToSeed(d) { d = d instanceof Date ? d : new Date(d); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function seededIndex(seed, n) { var h = seed; h = ((h >>> 16) ^ h) * 0x45d9f3b; h = ((h >>> 16) ^ h) * 0x45d9f3b; h = (h >>> 16) ^ h; return Math.abs(h) % n; }

  DailyChallenges.getChallenge = function (date) {
    var ch = CHALLENGE_POOL[seededIndex(dateToSeed(date ? new Date(date) : new Date()), CHALLENGE_POOL.length)];
    return { id: ch.id, title: ch.title, description: ch.title, category: ch.category, icon: ch.icon, difficulty: ch.difficulty };
  };
  DailyChallenges.getTodaysChallenge = function () { return DailyChallenges.getChallenge(new Date()); };

  function loadCompleted() { try { var r = localStorage.getItem(CHALLENGES_STORAGE); return r ? JSON.parse(r) : []; } catch (e) { return []; } }
  function saveCompleted(a) { localStorage.setItem(CHALLENGES_STORAGE, JSON.stringify(a)); }
  function todayStr() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  DailyChallenges.completeChallenge = function (challengeId) {
    var completed = loadCompleted(), today = todayStr();
    if (completed.some(function (c) { return c.date === today && c.challengeId === challengeId; })) return;
    var ch = CHALLENGE_POOL[challengeId] || {};
    completed.push({ challengeId: challengeId, date: today, title: ch.title || '', category: ch.category || '', icon: ch.icon || '', completedAt: new Date().toISOString() });
    saveCompleted(completed);
  };

  DailyChallenges.isCompletedToday = function () { return loadCompleted().some(function (c) { return c.date === todayStr(); }); };
  DailyChallenges.getCompletedCount = function () { return loadCompleted().length; };

  DailyChallenges.getStreak = function () {
    var completed = loadCompleted(), dates = {};
    if (completed.length === 0) return 0;
    completed.forEach(function (c) { dates[c.date] = true; });
    var streak = 0, d = new Date();
    if (!dates[todayStr()]) d.setDate(d.getDate() - 1);
    while (true) {
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (dates[key]) { streak++; d.setDate(d.getDate() - 1); } else { break; }
    }
    return streak;
  };

  function difficultyBadge(diff) {
    var colors = { easy: '#7EB09B', medium: '#E8A87C', bold: '#E87C7C' };
    var color = colors[diff] || colors.easy;
    return '<span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:10px;' +
      'text-transform:uppercase;letter-spacing:1px;font-weight:600;' +
      'background:' + color + '22;color:' + color + ';border:1px solid ' + color + '33;">' + diff + '</span>';
  }

  var CATEGORY_COLORS = {
    Mindfulness: '#9B8EC4',
    Connection: '#E87C9F',
    Movement: '#6C9BCF',
    Creativity: '#E8A87C',
    'Self-Care': '#7EB09B',
    Kindness: '#E8D87C',
    Adventure: '#CF6C6C',
    Reflection: '#8EB0C4'
  };

  DailyChallenges.renderChallengeCard = function () {
    var ch = DailyChallenges.getTodaysChallenge();
    var done = DailyChallenges.isCompletedToday();
    var streak = DailyChallenges.getStreak();
    var total = DailyChallenges.getCompletedCount();
    var catColor = CATEGORY_COLORS[ch.category] || '#7EB09B';

    return '<div style="' +
      'width:375px;max-width:100%;margin:0 auto;border-radius:20px;overflow:hidden;' +
      'background:linear-gradient(165deg,#161625 0%,#0F0F1A 100%);' +
      'box-shadow:0 4px 24px rgba(0,0,0,0.4);font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;color:#F0EDE8;' +
      '">' +

      // Category header strip
      '<div style="padding:20px 24px 12px;position:relative;">' +
        '<div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;border-radius:50%;' +
          'background:radial-gradient(circle,' + catColor + '20,transparent 70%);"></div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;">' +
          '<div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:' + catColor + ';">' +
            ch.category +
          '</div>' +
          difficultyBadge(ch.difficulty) +
        '</div>' +
      '</div>' +

      // Icon and title
      '<div style="padding:4px 24px 16px;text-align:center;">' +
        '<div style="font-size:48px;margin-bottom:12px;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.3));">' + ch.icon + '</div>' +
        '<div style="font-family:Playfair Display,Georgia,serif;font-size:18px;font-weight:600;line-height:1.4;' +
          'color:#F0EDE8;margin-bottom:8px;">' +
          'Today\'s Challenge' +
        '</div>' +
        '<div style="font-size:15px;color:rgba(240,237,232,0.75);line-height:1.5;padding:0 8px;">' +
          ch.title +
        '</div>' +
      '</div>' +

      // Stats row
      '<div style="display:flex;justify-content:center;gap:24px;padding:12px 24px;' +
        'border-top:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05);">' +
        '<div style="text-align:center;">' +
          '<div style="font-size:18px;font-weight:600;color:#E8A87C;">' + streak + '</div>' +
          '<div style="font-size:10px;color:rgba(240,237,232,0.4);text-transform:uppercase;letter-spacing:1px;">Streak</div>' +
        '</div>' +
        '<div style="text-align:center;">' +
          '<div style="font-size:18px;font-weight:600;color:#9B8EC4;">' + total + '</div>' +
          '<div style="font-size:10px;color:rgba(240,237,232,0.4);text-transform:uppercase;letter-spacing:1px;">Completed</div>' +
        '</div>' +
      '</div>' +

      // Button
      '<div style="padding:20px 24px 24px;text-align:center;">' +
        (done
          ? '<div style="padding:14px 28px;border-radius:14px;font-size:14px;font-weight:500;' +
              'background:rgba(126,176,155,0.15);color:#7EB09B;border:1px solid rgba(126,176,155,0.25);' +
              'display:inline-block;">Completed Today</div>'
          : '<button onclick="window.DailyChallenges.completeChallenge(' + ch.id + ');' +
              'if(this.parentNode.parentNode){this.parentNode.innerHTML=\'<div style=&quot;padding:14px 28px;border-radius:14px;font-size:14px;font-weight:500;' +
              'background:rgba(126,176,155,0.15);color:#7EB09B;border:1px solid rgba(126,176,155,0.25);' +
              'display:inline-block;&quot;>Completed Today</div>\';}" style="' +
              'padding:14px 32px;border:none;border-radius:14px;cursor:pointer;font-size:14px;font-weight:600;' +
              'background:linear-gradient(135deg,#7EB09B,#6C9BCF);color:#F0EDE8;' +
              'box-shadow:0 4px 16px rgba(126,176,155,0.3);transition:transform 0.2s ease,box-shadow 0.2s ease;' +
            '">Challenge Accepted!</button>'
        ) +
      '</div>' +

    '</div>';
  };

  DailyChallenges.renderHistoryList = function () {
    var completed = loadCompleted();
    if (completed.length === 0) {
      return '<div style="text-align:center;color:rgba(240,237,232,0.4);padding:32px 16px;' +
        'font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;">' +
        'No challenges completed yet. Start today!</div>';
    }

    // Sort most recent first
    var sorted = completed.slice().sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });

    var items = sorted.map(function (entry) {
      var catColor = CATEGORY_COLORS[entry.category] || '#7EB09B';
      return '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;' +
        'background:rgba(255,255,255,0.03);border-radius:12px;margin-bottom:8px;' +
        'border:1px solid rgba(255,255,255,0.05);font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">' +
        '<div style="font-size:24px;flex-shrink:0;">' + (entry.icon || '') + '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:13px;color:#F0EDE8;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
            (entry.title || 'Challenge #' + entry.challengeId) +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;margin-top:4px;">' +
            '<span style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:' + catColor + ';">' +
              (entry.category || '') +
            '</span>' +
            '<span style="font-size:10px;color:rgba(240,237,232,0.3);">' + entry.date + '</span>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:16px;color:#7EB09B;flex-shrink:0;">&#10003;</div>' +
      '</div>';
    }).join('');

    return '<div style="max-width:400px;margin:0 auto;">' + items + '</div>';
  };

  window.DailyChallenges = DailyChallenges;

})();
