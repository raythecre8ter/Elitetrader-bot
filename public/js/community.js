// ============================================
// SERENITY — Community Wall & Dream Journal
// ============================================

(function () {
  'use strict';

  // ==================== ANONYMOUS COMMUNITY WALL ====================

  const COMMUNITY_KEY = 'reverie_community_posts';
  const COMMUNITY_LIKES_KEY = 'reverie_community_likes';

  const SEEDED_POSTS = [
    // --- Gratitude ---
    { text: "Grateful for my morning coffee and the quiet before the world wakes up", category: "gratitude", emoji: "☕" },
    { text: "My dog greeted me like I'd been gone for years. I was gone for 5 minutes", category: "gratitude", emoji: "🐶" },
    { text: "Someone held the door for me today and smiled. Small things matter", category: "gratitude", emoji: "🚪" },
    { text: "Finally finished a book I started 3 months ago. Feels so good", category: "gratitude", emoji: "📚" },
    { text: "Grateful for the friend who checks in without being asked", category: "gratitude", emoji: "💜" },
    { text: "Woke up to rain on the roof. There's nothing more peaceful", category: "gratitude", emoji: "🌧️" },
    { text: "My mom called just to say she was thinking of me. I needed that today", category: "gratitude", emoji: "📞" },
    { text: "Thankful for the coworker who noticed I was struggling and covered for me", category: "gratitude", emoji: "🤝" },
    { text: "The sunset tonight stopped me in my tracks. Nature is free therapy", category: "gratitude", emoji: "🌅" },
    { text: "Grateful that I can feel things deeply, even when it hurts", category: "gratitude", emoji: "🌿" },
    { text: "A stranger complimented my shirt today and it made my whole week", category: "gratitude", emoji: "😊" },
    { text: "Thankful for hot showers. Seriously underrated", category: "gratitude", emoji: "🚿" },
    { text: "My kid drew a picture of us holding hands. I'm keeping it forever", category: "gratitude", emoji: "🎨" },
    { text: "Grateful for the teacher who believed in me when I didn't believe in myself", category: "gratitude", emoji: "🌟" },
    { text: "Found an old voicemail from my grandpa. Grateful I never deleted it", category: "gratitude", emoji: "📱" },
    { text: "Thankful for second chances. I almost gave up last year", category: "gratitude", emoji: "🌱" },
    { text: "The barista remembered my order. Sometimes being seen is everything", category: "gratitude", emoji: "❤️" },
    { text: "Grateful for my body — it carried me through the hardest year of my life", category: "gratitude", emoji: "💪" },
    { text: "A song came on that reminded me of a good time. Grateful for music", category: "gratitude", emoji: "🎵" },
    { text: "Thankful for the quiet friend who just sits with me when I'm sad", category: "gratitude", emoji: "🫲" },

    // --- Wins ---
    { text: "Day 30 of meditation. Never thought I'd stick with it", category: "wins", emoji: "🧘" },
    { text: "Set a boundary at work today. Terrifying but worth it", category: "wins", emoji: "🛡️" },
    { text: "Got out of bed on a hard day. That counts", category: "wins", emoji: "🏆" },
    { text: "Told someone how I really felt instead of saying 'I'm fine'", category: "wins", emoji: "💬" },
    { text: "Cooked a real meal instead of ordering takeout", category: "wins", emoji: "🍳" },
    { text: "Went for a walk even though I didn't want to. Came back a different person", category: "wins", emoji: "🚶" },
    { text: "Said no to plans without guilt for the first time", category: "wins", emoji: "✨" },
    { text: "Drank 8 glasses of water today. My past self would be shocked", category: "wins", emoji: "💧" },
    { text: "Applied for the job I thought I wasn't qualified for", category: "wins", emoji: "📨" },
    { text: "Didn't check my phone for the first hour of the morning", category: "wins", emoji: "🌞" },
    { text: "Finally scheduled that doctor's appointment I've been avoiding", category: "wins", emoji: "🏥" },
    { text: "Cried when I needed to instead of pushing it down", category: "wins", emoji: "💧" },
    { text: "Went to bed before midnight for a whole week", category: "wins", emoji: "🌙" },
    { text: "Spoke up in a meeting. My voice was shaking but I did it", category: "wins", emoji: "🎙️" },
    { text: "Deleted social media for a week. My anxiety dropped noticeably", category: "wins", emoji: "📵" },
    { text: "Forgave myself for something I've been carrying for years", category: "wins", emoji: "🦋" },
    { text: "Made it through a panic attack without calling it the end of the world", category: "wins", emoji: "🌊" },
    { text: "Cleaned my room when depression made it feel impossible", category: "wins", emoji: "🏠" },
    { text: "Asked for help. That was the hardest part", category: "wins", emoji: "🤲" },
    { text: "Ran my first mile in years. Slow, but I finished", category: "wins", emoji: "🏃" },

    // --- Reflections ---
    { text: "Realized I've been running from silence. Today I sat with it", category: "reflections", emoji: "🧐" },
    { text: "Not every day has to be productive. Some days just need to be survived", category: "reflections", emoji: "🌾" },
    { text: "Healing isn't linear and that's okay", category: "reflections", emoji: "📈" },
    { text: "I'm learning that 'no' is a complete sentence", category: "reflections", emoji: "💭" },
    { text: "The person I was a year ago would be proud of me now", category: "reflections", emoji: "🪞" },
    { text: "I confused being busy with being okay for too long", category: "reflections", emoji: "⏳" },
    { text: "Grief doesn't shrink. You just grow around it", category: "reflections", emoji: "🍃" },
    { text: "I kept waiting for the right time. There is no right time. There's just now", category: "reflections", emoji: "⏰" },
    { text: "My worth isn't measured by my output. Still learning that", category: "reflections", emoji: "🌟" },
    { text: "Some people are in your life for a season, not a lifetime. And that's okay", category: "reflections", emoji: "🍂" },
    { text: "I used to think vulnerability was weakness. Now I see it's the bravest thing", category: "reflections", emoji: "🫶" },
    { text: "The hardest relationship to fix is the one with yourself", category: "reflections", emoji: "🕰️" },
    { text: "I stopped comparing my chapter 1 to someone else's chapter 20", category: "reflections", emoji: "📖" },
    { text: "Realized my anxiety was trying to protect me, not punish me", category: "reflections", emoji: "🧩" },
    { text: "You can miss someone and still know they're not right for you", category: "reflections", emoji: "🌙" },
    { text: "I spent years trying to earn love that should've been freely given", category: "reflections", emoji: "🕯️" },
    { text: "Slowing down isn't falling behind. It's choosing yourself", category: "reflections", emoji: "🐢" },
    { text: "I used to fear change. Now I fear staying the same", category: "reflections", emoji: "🌀" },
    { text: "Sometimes the bravest thing you can do is rest", category: "reflections", emoji: "🛋️" },
    { text: "Not everything that weighs on you is yours to carry", category: "reflections", emoji: "🏋️" },

    // --- Encouragement ---
    { text: "If you're reading this, you showed up today. That matters", category: "encouragement", emoji: "👏" },
    { text: "Your anxiety is lying to you. You ARE capable", category: "encouragement", emoji: "💪" },
    { text: "It's okay to outgrow people, places, and versions of yourself", category: "encouragement", emoji: "🌱" },
    { text: "Rest is not giving up. It's gearing up", category: "encouragement", emoji: "🔋" },
    { text: "You don't have to have it all figured out right now", category: "encouragement", emoji: "🧩" },
    { text: "The fact that you're trying is proof that you haven't given up", category: "encouragement", emoji: "🔥" },
    { text: "You survived every bad day you've ever had. That's a 100% success rate", category: "encouragement", emoji: "🌟" },
    { text: "It's okay to take the scenic route in life", category: "encouragement", emoji: "🛤️" },
    { text: "Your feelings are valid even if others don't understand them", category: "encouragement", emoji: "💚" },
    { text: "You're allowed to be a masterpiece and a work in progress simultaneously", category: "encouragement", emoji: "🎨" },
    { text: "Asking for help isn't weakness. It's one of the strongest things you can do", category: "encouragement", emoji: "🤝" },
    { text: "You can't pour from an empty cup. Fill yours first", category: "encouragement", emoji: "☕" },
    { text: "Progress you can't see is still progress", category: "encouragement", emoji: "🌿" },
    { text: "Be gentle with yourself. You're doing the best you can", category: "encouragement", emoji: "🫳" },
    { text: "The world is better because you're in it. I mean that", category: "encouragement", emoji: "🌍" },
    { text: "You don't owe anyone an explanation for taking care of yourself", category: "encouragement", emoji: "🛡️" },
    { text: "Small steps still move you forward", category: "encouragement", emoji: "👣" },
    { text: "Tough times don't last. Tough people do", category: "encouragement", emoji: "⛰️" },
    { text: "It's okay to start over. It's not okay to not start", category: "encouragement", emoji: "🔄" },
    { text: "You deserve the same compassion you give to everyone else", category: "encouragement", emoji: "🩷" },
  ];

  const TIME_AGO_OPTIONS = [
    "2m ago","5m ago","12m ago","23m ago","38m ago","45m ago",
    "1h ago","2h ago","3h ago","4h ago","5h ago","6h ago","8h ago",
    "10h ago","12h ago","16h ago","20h ago",
    "1d ago","1d ago","2d ago","2d ago","3d ago","4d ago","5d ago","6d ago"
  ];

  function seededRandom(seed) {
    let s = seed;
    return function () {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function getTodaySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function loadUserPosts() {
    try { return JSON.parse(localStorage.getItem(COMMUNITY_KEY)) || []; }
    catch { return []; }
  }

  function saveUserPosts(posts) {
    localStorage.setItem(COMMUNITY_KEY, JSON.stringify(posts));
  }

  function loadLikes() {
    try { return JSON.parse(localStorage.getItem(COMMUNITY_LIKES_KEY)) || {}; }
    catch { return {}; }
  }

  function saveLikes(likes) {
    localStorage.setItem(COMMUNITY_LIKES_KEY, JSON.stringify(likes));
  }

  window.CommunityWall = {
    getFeed: function (count) {
      count = count || 15;
      var rng = seededRandom(getTodaySeed());
      var shuffled = SEEDED_POSTS.slice().sort(function () { return rng() - 0.5; });
      var seeded = shuffled.slice(0, Math.min(count, shuffled.length)).map(function (p, i) {
        var baseLikes = Math.floor(rng() * 40) + 1;
        return {
          id: 'seeded_' + getTodaySeed() + '_' + i,
          text: p.text,
          category: p.category,
          emoji: p.emoji,
          likes: baseLikes,
          timeAgo: TIME_AGO_OPTIONS[Math.floor(rng() * TIME_AGO_OPTIONS.length)],
          isOwn: false
        };
      });

      var userPosts = loadUserPosts().map(function (p) {
        var elapsed = Date.now() - (p.timestamp || Date.now());
        var mins = Math.floor(elapsed / 60000);
        var timeAgo;
        if (mins < 60) timeAgo = mins + 'm ago';
        else if (mins < 1440) timeAgo = Math.floor(mins / 60) + 'h ago';
        else timeAgo = Math.floor(mins / 1440) + 'd ago';
        return {
          id: p.id,
          text: p.text,
          category: p.category,
          emoji: p.emoji || window.CommunityWall._categoryEmoji(p.category),
          likes: p.likes || 0,
          timeAgo: timeAgo,
          isOwn: true
        };
      });

      var combined = userPosts.concat(seeded);
      var likes = loadLikes();
      combined.forEach(function (p) {
        if (likes[p.id]) { p.likes = (p.likes || 0) + 1; p.liked = true; }
      });
      combined.sort(function () { return rng() - 0.5; });
      return combined.slice(0, count);
    },

    sharePost: function (text, category) {
      if (!text || !text.trim()) return null;
      var posts = loadUserPosts();
      var post = {
        id: 'user_' + Date.now(),
        text: text.trim(),
        category: category || 'reflections',
        emoji: window.CommunityWall._categoryEmoji(category),
        likes: 0,
        timestamp: Date.now()
      };
      posts.unshift(post);
      saveUserPosts(posts);
      return post;
    },

    likePost: function (id) {
      var likes = loadLikes();
      if (likes[id]) { delete likes[id]; }
      else { likes[id] = true; }
      saveLikes(likes);
      return !!likes[id];
    },

    getUserPosts: function () {
      return loadUserPosts();
    },

    _categoryEmoji: function (cat) {
      return { gratitude: "🙏", wins: "🎉", reflections: "💭", encouragement: "💚" }[cat] || "💬";
    },

    renderFeed: function (count) {
      var posts = this.getFeed(count || 12);
      var catColors = { gratitude: '#e8f5e9', wins: '#fff3e0', reflections: '#e3f2fd', encouragement: '#fce4ec' };
      var html = '<div class="community-feed">';
      posts.forEach(function (p) {
        var bg = catColors[p.category] || '#f5f5f5';
        html += '<div class="community-card" style="background:' + bg + ';border-radius:12px;padding:16px;margin-bottom:12px;">'
          + '<div style="display:flex;justify-content:space-between;align-items:start;">'
          + '<span style="font-size:1.5em;margin-right:10px;">' + p.emoji + '</span>'
          + '<span style="font-size:0.75em;color:#888;">' + p.timeAgo + '</span>'
          + '</div>'
          + '<p style="margin:8px 0;line-height:1.5;color:#333;">' + p.text + '</p>'
          + '<div style="display:flex;justify-content:space-between;align-items:center;">'
          + '<span style="font-size:0.7em;text-transform:uppercase;letter-spacing:1px;color:#888;">' + p.category + '</span>'
          + '<button class="community-like-btn" data-id="' + p.id + '" style="background:none;border:none;cursor:pointer;font-size:0.9em;color:' + (p.liked ? '#e53935' : '#aaa') + ';">'
          + (p.liked ? '❤️' : '🤍') + ' ' + p.likes
          + '</button>'
          + '</div>'
          + (p.isOwn ? '<div style="font-size:0.65em;color:#aaa;margin-top:4px;">your post</div>' : '')
          + '</div>';
      });
      html += '</div>';
      return html;
    },

    renderShareForm: function () {
      return '<div class="community-share-form" style="margin-bottom:20px;">'
        + '<textarea id="community-post-text" placeholder="Share something with the community..." '
        + 'style="width:100%;min-height:80px;border-radius:10px;border:1px solid #ddd;padding:12px;font-size:0.95em;resize:vertical;box-sizing:border-box;"></textarea>'
        + '<div style="display:flex;gap:8px;margin:10px 0;flex-wrap:wrap;">'
        + ['gratitude','wins','reflections','encouragement'].map(function (c) {
            var em = { gratitude:"🙏", wins:"🎉", reflections:"💭", encouragement:"💚" }[c];
            return '<label style="cursor:pointer;">'
              + '<input type="radio" name="community-cat" value="' + c + '"' + (c === 'reflections' ? ' checked' : '') + ' style="display:none;">'
              + '<span class="community-cat-chip" data-cat="' + c + '" style="padding:6px 14px;border-radius:20px;border:2px solid #ddd;font-size:0.85em;display:inline-block;">'
              + em + ' ' + c
              + '</span></label>';
          }).join('')
        + '</div>'
        + '<button id="community-share-btn" style="background:#7c4dff;color:white;border:none;padding:10px 24px;border-radius:20px;cursor:pointer;font-size:0.9em;">Share Anonymously</button>'
        + '</div>';
    }
  };

  // ==================== DREAM JOURNAL ====================

  var DREAMS_KEY = 'reverie_dreams';

  var DREAM_TAGS = ['vivid','peaceful','scary','weird','happy','sad','adventure','nostalgic','flying','falling','water','chasing'];

  var THEME_KEYWORDS = {
    water:   { words: ['water','ocean','sea','river','lake','swim','rain','flood','wave','drown','pool','stream'], interpretation: "Often connected to emotions and the unconscious mind" },
    flying:  { words: ['fly','flying','float','soar','wings','air','sky','hover','glide'], interpretation: "May represent freedom, ambition, or a desire to escape" },
    falling: { words: ['fall','falling','drop','cliff','plunge','slip','stumble','trip'], interpretation: "Could reflect feelings of losing control or insecurity" },
    chasing: { words: ['chase','chasing','run','running','pursue','follow','escape','flee','hide'], interpretation: "Often linked to avoidance or running from something in waking life" },
    school:  { words: ['school','class','teacher','exam','test','student','homework','college','university','grade'], interpretation: "May relate to lessons being learned or feelings of being tested" },
    work:    { words: ['work','office','boss','job','meeting','deadline','coworker','project','career','fired'], interpretation: "Could reflect stress, ambition, or identity tied to career" },
    family:  { words: ['family','mother','father','mom','dad','sister','brother','parent','child','baby','son','daughter'], interpretation: "Often connected to core relationships and belonging" },
    home:    { words: ['home','house','room','door','window','attic','basement','roof','apartment','building'], interpretation: "May represent safety, identity, or a desire for stability" },
    animals: { words: ['animal','dog','cat','bird','snake','horse','fish','bear','wolf','spider','insect','lion','tiger'], interpretation: "Could symbolize instincts, desires, or aspects of personality" },
    death:   { words: ['death','die','dead','dying','funeral','grave','ghost','kill','end','afterlife'], interpretation: "Rarely literal — often symbolizes transformation or endings" }
  };

  function loadDreams() {
    try { return JSON.parse(localStorage.getItem(DREAMS_KEY)) || []; }
    catch { return []; }
  }

  function saveDreams(dreams) {
    localStorage.setItem(DREAMS_KEY, JSON.stringify(dreams));
  }

  window.DreamJournal = {
    saveDream: function (entry) {
      if (!entry || !entry.text) return null;
      var dreams = loadDreams();
      var dream = {
        id: 'dream_' + Date.now(),
        text: entry.text,
        mood: entry.mood != null ? entry.mood : 5,
        tags: entry.tags || [],
        lucid: !!entry.lucid,
        recurring: !!entry.recurring,
        date: entry.date || new Date().toISOString()
      };
      dreams.unshift(dream);
      saveDreams(dreams);
      return dream;
    },

    getDreams: function (limit) {
      var dreams = loadDreams();
      return limit ? dreams.slice(0, limit) : dreams;
    },

    getDreamStats: function () {
      var dreams = loadDreams();
      if (!dreams.length) return { totalDreams: 0, avgMood: 0, commonTags: [], lucidCount: 0, recurringCount: 0, dreamStreak: 0 };

      var moodSum = 0, lucid = 0, recurring = 0, tagMap = {};
      dreams.forEach(function (d) {
        moodSum += (d.mood || 0);
        if (d.lucid) lucid++;
        if (d.recurring) recurring++;
        (d.tags || []).forEach(function (t) { tagMap[t] = (tagMap[t] || 0) + 1; });
      });

      var commonTags = Object.keys(tagMap).map(function (t) { return { tag: t, count: tagMap[t] }; })
        .sort(function (a, b) { return b.count - a.count; });

      // Calculate streak
      var streak = 0, today = new Date(); today.setHours(0,0,0,0);
      var checked = {};
      dreams.forEach(function (d) {
        var key = new Date(d.date).toDateString();
        checked[key] = true;
      });
      for (var i = 0; i < 365; i++) {
        var day = new Date(today); day.setDate(day.getDate() - i);
        if (checked[day.toDateString()]) streak++;
        else break;
      }

      return { totalDreams: dreams.length, avgMood: Math.round(moodSum / dreams.length * 10) / 10, commonTags: commonTags, lucidCount: lucid, recurringCount: recurring, dreamStreak: streak };
    },

    analyzeDreamThemes: function (dreams) {
      dreams = dreams || loadDreams();
      if (!dreams.length) return [];

      var allText = dreams.map(function (d) { return d.text.toLowerCase(); }).join(' ');
      var results = [];
      Object.keys(THEME_KEYWORDS).forEach(function (theme) {
        var info = THEME_KEYWORDS[theme];
        var count = 0;
        info.words.forEach(function (w) {
          var regex = new RegExp('\\b' + w + '\\b', 'gi');
          var matches = allText.match(regex);
          if (matches) count += matches.length;
        });
        if (count > 0) results.push({ theme: theme, count: count, interpretation: info.interpretation });
      });

      return results.sort(function (a, b) { return b.count - a.count; });
    },

    renderDreamForm: function () {
      var html = '<div class="dream-form" style="margin-bottom:20px;">'
        + '<textarea id="dream-text" placeholder="Describe your dream..." '
        + 'style="width:100%;min-height:100px;border-radius:10px;border:1px solid #ddd;padding:12px;font-size:0.95em;resize:vertical;box-sizing:border-box;"></textarea>'
        + '<div style="margin:12px 0;">'
        + '<label style="font-size:0.85em;color:#666;">Mood: <span id="dream-mood-val">5</span>/10</label>'
        + '<input type="range" id="dream-mood" min="1" max="10" value="5" '
        + 'style="width:100%;margin-top:4px;" oninput="document.getElementById(\'dream-mood-val\').textContent=this.value">'
        + '</div>'
        + '<div style="margin:10px 0;">'
        + '<label style="font-size:0.85em;color:#666;display:block;margin-bottom:6px;">Tags</label>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;">';
      DREAM_TAGS.forEach(function (tag) {
        html += '<label style="cursor:pointer;">'
          + '<input type="checkbox" class="dream-tag-cb" value="' + tag + '" style="display:none;">'
          + '<span class="dream-tag-chip" style="padding:5px 12px;border-radius:16px;border:1px solid #ccc;font-size:0.8em;display:inline-block;">' + tag + '</span>'
          + '</label>';
      });
      html += '</div></div>'
        + '<div style="display:flex;gap:16px;margin:10px 0;">'
        + '<label style="font-size:0.85em;cursor:pointer;"><input type="checkbox" id="dream-lucid"> Lucid dream</label>'
        + '<label style="font-size:0.85em;cursor:pointer;"><input type="checkbox" id="dream-recurring"> Recurring dream</label>'
        + '</div>'
        + '<button id="dream-save-btn" style="background:#7c4dff;color:white;border:none;padding:10px 24px;border-radius:20px;cursor:pointer;font-size:0.9em;">Save Dream</button>'
        + '</div>';
      return html;
    },

    renderDreamList: function (dreams) {
      dreams = dreams || this.getDreams();
      if (!dreams.length) return '<p style="color:#999;text-align:center;padding:20px;">No dreams recorded yet. Start journaling tonight!</p>';

      var html = '<div class="dream-list">';
      dreams.forEach(function (d) {
        var dateStr = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        var moodEmoji = d.mood >= 7 ? '😊' : d.mood >= 4 ? '😐' : '😟';
        var badges = '';
        if (d.lucid) badges += '<span style="background:#e1f5fe;color:#0277bd;padding:2px 8px;border-radius:10px;font-size:0.7em;margin-right:4px;">lucid</span>';
        if (d.recurring) badges += '<span style="background:#fce4ec;color:#c62828;padding:2px 8px;border-radius:10px;font-size:0.7em;">recurring</span>';

        html += '<div class="dream-entry" style="background:#fafafa;border-radius:12px;padding:14px;margin-bottom:10px;border-left:4px solid #7c4dff;">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
          + '<span style="font-size:0.8em;color:#888;">' + dateStr + '</span>'
          + '<span>' + moodEmoji + ' ' + d.mood + '/10 ' + badges + '</span>'
          + '</div>'
          + '<p style="margin:0 0 8px;line-height:1.5;color:#333;">' + d.text + '</p>'
          + '<div style="display:flex;gap:4px;flex-wrap:wrap;">';
        (d.tags || []).forEach(function (t) {
          html += '<span style="background:#ede7f6;color:#5e35b1;padding:2px 10px;border-radius:12px;font-size:0.75em;">' + t + '</span>';
        });
        html += '</div></div>';
      });
      html += '</div>';
      return html;
    },

    renderDreamInsights: function (stats) {
      stats = stats || this.getDreamStats();
      if (!stats.totalDreams) return '<p style="color:#999;text-align:center;padding:20px;">Record some dreams to see insights!</p>';

      var themes = this.analyzeDreamThemes();
      var maxCount = themes.length ? themes[0].count : 1;

      var html = '<div class="dream-insights">'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:20px;">'
        + '<div style="background:#ede7f6;border-radius:12px;padding:14px;text-align:center;">'
        + '<div style="font-size:1.6em;font-weight:bold;color:#5e35b1;">' + stats.totalDreams + '</div>'
        + '<div style="font-size:0.75em;color:#888;">Total Dreams</div></div>'
        + '<div style="background:#e8f5e9;border-radius:12px;padding:14px;text-align:center;">'
        + '<div style="font-size:1.6em;font-weight:bold;color:#2e7d32;">' + stats.avgMood + '</div>'
        + '<div style="font-size:0.75em;color:#888;">Avg Mood</div></div>'
        + '<div style="background:#e1f5fe;border-radius:12px;padding:14px;text-align:center;">'
        + '<div style="font-size:1.6em;font-weight:bold;color:#0277bd;">' + stats.lucidCount + '</div>'
        + '<div style="font-size:0.75em;color:#888;">Lucid Dreams</div></div>'
        + '<div style="background:#fff3e0;border-radius:12px;padding:14px;text-align:center;">'
        + '<div style="font-size:1.6em;font-weight:bold;color:#e65100;">' + stats.dreamStreak + '</div>'
        + '<div style="font-size:0.75em;color:#888;">Day Streak</div></div>'
        + '</div>';

      if (themes.length) {
        html += '<h4 style="margin:16px 0 10px;color:#333;">Dream Themes</h4>';
        themes.forEach(function (t) {
          var pct = Math.round((t.count / maxCount) * 100);
          html += '<div style="margin-bottom:10px;">'
            + '<div style="display:flex;justify-content:space-between;font-size:0.85em;margin-bottom:3px;">'
            + '<span style="text-transform:capitalize;">' + t.theme + '</span>'
            + '<span style="color:#888;">' + t.count + 'x</span></div>'
            + '<div style="background:#eee;border-radius:6px;height:8px;overflow:hidden;">'
            + '<div style="background:#7c4dff;height:100%;width:' + pct + '%;border-radius:6px;"></div></div>'
            + '<div style="font-size:0.75em;color:#999;margin-top:2px;font-style:italic;">' + t.interpretation + '</div>'
            + '</div>';
        });
      }

      if (stats.commonTags.length) {
        html += '<h4 style="margin:16px 0 10px;color:#333;">Top Tags</h4>'
          + '<div style="display:flex;gap:6px;flex-wrap:wrap;">';
        stats.commonTags.slice(0, 8).forEach(function (t) {
          html += '<span style="background:#ede7f6;color:#5e35b1;padding:4px 12px;border-radius:14px;font-size:0.8em;">' + t.tag + ' (' + t.count + ')</span>';
        });
        html += '</div>';
      }

      html += '</div>';
      return html;
    }
  };

})();
