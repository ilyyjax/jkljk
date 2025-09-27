// RageRex v1.0 - script.js
// Plug-and-play roast engine + TTS (Web Speech API)

(() => {
  // Elements
  const consentModal = document.getElementById('consentModal');
  const acceptBtn = document.getElementById('acceptBtn');
  const declineBtn = document.getElementById('declineBtn');
  const spawnWithTTS = document.getElementById('spawnWithTTS');

  const chat = document.getElementById('chat');
  const inputForm = document.getElementById('inputForm');
  const userInput = document.getElementById('userInput');
  const intensity = document.getElementById('intensity');
  const ttsToggle = document.getElementById('ttsToggle');
  const surpriseBtn = document.getElementById('surpriseBtn');
  const autoInsultToggle = document.getElementById('autoInsultToggle');
  const downloadLog = document.getElementById('downloadLog');

  let sessionLog = [];
  let voice = null;
  let autoInsultTimer = null;

  // --- Roast database (expandable) ---
  const roasts = [
    "You're the human version of a participation award.",
    "I’d explain it to you, but I left my crayons at home.",
    "Your brain's like the Bermuda Triangle — information goes in and never comes out.",
    "You bring everyone so much joy… when you leave the room.",
    "You're like a cloud. When you disappear, it's a beautiful day.",
    "If I wanted to kill myself I'd climb your ego and jump to your IQ.",
    "You have the perfect face for radio.",
    "I could eat a bowl of alphabet soup and shit out smarter sentences than that.",
    "You're proof that evolution can go in reverse.",
    "You’re the reason they have instructions on shampoo bottles.",
    "You look like what would happen if Photoshop had a hate feature.",
    "Somewhere out there today a puppy is learning to ignore you.",
    "You’re as sharp as a marble.",
    "I’d call you a tool, but even tools are useful sometimes.",
    "Your confidence is inspiring — for people who need strong examples of misplaced optimism.",
    "You're like a software update at 3 AM: inconvenient and nobody asked for you.",
    "Your secrets are safe with me — I wasn't listening anyways.",
    "You have the charm of a soggy toast.",
    "You couldn't pour water out of a boot if the instructions were on the heel.",
    "You're the reason the gene pool needs a lifeguard.",
    "Your face could scare the chrome off a bumper.",
    "I've seen salads dressed better than you.",
    "You're the human equivalent of a typo in a complaint letter.",
    "If nonsense was currency, you'd be a billionaire.",
    "You're about as useful as the 'ueue' in 'queue'.",
    "You're a full-season subscription to mild disappointment.",
    "I don't have the energy to pretend to like you today.",
    "You're an unskippable ad in the YouTube of life.",
    "Your personality is like decaf coffee — all style, no buzz.",
    "If personality was wifi, you'd be a 'connecting…' message."
  ];

  // bonus zingers: context-aware (short)
  const comebacks = [
    "Cool story. Did you say more?",
    "Oof. That one played on a loop in my head — for one second.",
    "Wow. Did your keyboard fall on your face?",
    "I'm impressed — for trying, and failing spectacularly.",
    "Cute take. Also wrong."
  ];

  // Utility: append message
  function appendMessage({who='bot', text, meta=''}) {
    const el = document.createElement('div');
    el.className = 'msg ' + (who === 'user' ? 'user' : 'bot');
    if (meta) el.innerHTML = `<div class="meta">${meta}</div>` + `<div class="text">${escapeHtml(text)}</div>`;
    else el.innerHTML = `<div class="text">${escapeHtml(text)}</div>`;
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
    sessionLog.push({time: new Date().toISOString(), who, text});
  }

  // Escape for safety
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // Pick a roast based on intensity (1-10). Higher intensity => harsher roast selection.
  function pickRoast(level=6){
    // simple mapping: level 1-3 => softer comebacks, 4-7 => medium roasts, 8-10 => top-tier roasts
    if (level <= 3) {
      const soft = [
        "You're kind of adorable when you're wrong.",
        "Bless your heart. You tried.",
        "That was cute — like a training wheel on a bike."
      ];
      return randomFrom(soft.concat(comebacks));
    } else if (level <= 7) {
      return randomFrom(roasts);
    } else {
      // slightly harsher phrasing (still non-violent)
      const harsh = [
        "You're a glitch in the simulation that forgot to be charming.",
        "You have the charisma of wet cardboard.",
        "I've met chairs with more personality than you."
      ];
      return randomFrom(roasts.concat(harsh));
    }
  }

  function randomFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  // TTS helpers
  function speak(text, options = {}) {
    if (!ttsToggle.checked || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    if (voice) utter.voice = voice;
    utter.rate = options.rate || 1;
    utter.pitch = options.pitch || 1;
    utter.volume = options.volume || 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  }

  // On form submit (user message)
  inputForm.addEventListener('submit', e => {
    e.preventDefault();
    const val = userInput.value.trim();
    if (!val) return;
    appendMessage({who:'user', text:val});
    userInput.value = '';
    // Bot responds after tiny delay
    setTimeout(() => {
      const roast = generateReply(val);
      appendMessage({who:'bot', text:roast, meta:'RageRex'});
      speak(roast);
    }, 300 + Math.random() * 700);
  });

  // Surprise roast button
  surpriseBtn.addEventListener('click', () => {
    const roast = pickRoast(parseInt(intensity.value));
    appendMessage({who:'bot', text:roast, meta:'RageRex'});
    speak(roast);
  });

  // Download log
  downloadLog.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(sessionLog, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'rage_session_log.json'; a.click();
    URL.revokeObjectURL(url);
  });

  // Auto-insult idle
  autoInsultToggle.addEventListener('change', () => {
    if (autoInsultTimer) { clearInterval(autoInsultTimer); autoInsultTimer = null; }
    if (autoInsultToggle.checked) {
      autoInsultTimer = setInterval(() => {
        const roast = pickRoast(parseInt(intensity.value));
        appendMessage({who:'bot', text:roast, meta:'Idle roast'});
        speak(roast);
      }, 30000 + Math.random()*30000);
    }
  });

  // Generate reply - basic heuristics to tailor message
  function generateReply(userText){
    const lower = userText.toLowerCase();
    // If user insults bot, escalate with a comeback
    if (/(stupid|idiot|suck|trash|hate you|shut up)/i.test(lower)) {
      return randomFrom([
        "Oh you're mad? Tell me when you finish your participation trophy collection.",
        "Cute insult. Did you Google that one?",
        "You're working with limited firmware there, aren't you?"
      ]);
    }
    // if user asks for gentler tone
    if (/(please|be nice|calm|stop)/i.test(lower)) {
      return pickRoast(Math.max(1, parseInt(intensity.value)-3));
    }
    // generic: base on intensity
    return pickRoast(parseInt(intensity.value));
  }

  // Voice load
  function initVoices() {
    const synth = window.speechSynthesis;
    let voices = synth.getVoices();
    if (!voices.length) {
      // some browsers load asynchronously
      synth.addEventListener('voiceschanged', () => {
        voices = synth.getVoices();
        voice = chooseVoice(voices);
      });
    } else {
      voice = chooseVoice(voices);
    }
  }

  function chooseVoice(voices){
    // prefer English, slightly gruff voice if available
    const candidates = voices.filter(v => /en(-|_)?/i.test(v.lang));
    if (!candidates.length) return voices[0] || null;
    // pick a voice with 'male' or 'deep' in name if possible
    for (let v of candidates) {
      if (/male|deep|david|fred|mark|matt/i.test(v.name)) return v;
    }
    return candidates[0];
  }

  // Consent modal actions
  acceptBtn.addEventListener('click', () => {
    consentModal.classList.remove('active');
    initVoices();
    if (spawnWithTTS.checked) {
      setTimeout(() => {
        const spawnLine = "Welcome to RageRex. You're about to be roasted. Hope you brought thick skin.";
        appendMessage({who:'bot', text:spawnLine, meta:'RageRex'});
        speak(spawnLine);
      }, 300);
    } else {
      appendMessage({who:'bot', text:'RageRex is live. Talk to me.', meta:'RageRex'});
    }
  });
  declineBtn.addEventListener('click', () => {
    // close page politely
    document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;color:#c5cfda;font-family:system-ui,Segoe UI,Arial;"><div style="max-width:700px;text-align:center"><h2>Maybe later</h2><p class="small">You declined. Refresh to try again.</p></div></div>';
  });

  // init on load
  window.addEventListener('load', () => {
    initVoices();
    // small easter-entrance animation message
    setTimeout(() => {
      if (!consentModal.classList.contains('active')) {
        appendMessage({who:'bot', text:'I hope you can handle the heat.', meta:'RageRex'});
      }
    }, 900);
  });

  // handy: small keyboard / UX niceties
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && userInput.value === '') {
      // recall last user message
      const last = [...sessionLog].reverse().find(x=>x.who==='user');
      if (last) userInput.value = last.text;
    }
  });

})();
