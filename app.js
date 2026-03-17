/* =============================================
   AI Video Director v2 — Application Logic
   ============================================= */

// ─── MINIMAX VOICES DATABASE ────────────────────
const VOICES = {
  ru_male: [
    { id:'Russian_HandsomeChildhoodFriend', name:'Друг детства', desc:'Молодой, обаятельный' },
    { id:'Russian_ReliableMan',             name:'Надёжный',     desc:'Уверенный, зрелый' },
    { id:'Russian_AttractiveGuy',           name:'Привлекательный', desc:'Харизматичный, энергичный' },
    { id:'Russian_Bad-temperedBoy',         name:'Вспыльчивый',  desc:'Эмоциональный, резкий' }
  ],
  ru_female: [
    { id:'Russian_BrightHeroine',     name:'Яркая королева',   desc:'Властный, выразительный' },
    { id:'Russian_AmbitiousWoman',    name:'Амбициозная',      desc:'Деловой, уверенный' },
    { id:'Russian_CrazyQueen',        name:'Дерзкая',          desc:'Игривый, дерзкий' },
    { id:'Russian_PessimisticGirl',   name:'Меланхоличная',    desc:'Мягкий, задумчивый' }
  ],
  en_male: [
    { id:'English_expressive_narrator',  name:'Narrator',       desc:'Экспрессивный рассказчик' },
    { id:'English_magnetic_voiced_man',  name:'Magnetic',       desc:'Магнетический, глубокий' },
    { id:'English_Trustworth_Man',       name:'Trustworthy',    desc:'Надёжный, спокойный' },
    { id:'English_Gentle-voiced_man',    name:'Gentle',         desc:'Мягкий, тёплый' },
    { id:'English_ManWithDeepVoice',     name:'Deep Voice',     desc:'Басовитый, солидный' },
    { id:'English_PatientMan',           name:'Patient',        desc:'Терпеливый, рассудительный' },
    { id:'English_WiseScholar',          name:'Scholar',        desc:'Мудрый, начитанный' },
    { id:'English_Comedian',             name:'Comedian',       desc:'Весёлый, ироничный' },
    { id:'English_Deep-VoicedGentleman', name:'Gentleman',      desc:'Глубокий, элегантный' },
    { id:'English_SadTeen',              name:'Teen Boy',       desc:'Молодой, подростковый' }
  ],
  en_female: [
    { id:'English_radiant_girl',        name:'Radiant Girl',    desc:'Яркая, позитивная' },
    { id:'English_compelling_lady1',    name:'Compelling',      desc:'Убедительная, сильная' },
    { id:'English_CalmWoman',           name:'Calm Woman',      desc:'Спокойная, уравновешенная' },
    { id:'English_Graceful_Lady',       name:'Graceful',        desc:'Элегантная, изящная' },
    { id:'English_ConfidentWoman',      name:'Confident',       desc:'Уверенная, деловая' },
    { id:'English_SereneWoman',         name:'Serene',          desc:'Безмятежная, тёплая' },
    { id:'English_Whispering_girl',     name:'Whispering',      desc:'Шёпот, интимный' },
    { id:'English_PlayfulGirl',         name:'Playful',         desc:'Игривая, весёлая' },
    { id:'English_WiseladyWise',        name:'Wise Lady',       desc:'Мудрая, зрелая' },
    { id:'English_Kind-heartedGirl',    name:'Kind-hearted',    desc:'Добрая, душевная' },
    { id:'English_AnimeCharacter',      name:'Female Narrator', desc:'Рассказчица, чёткая' },
    { id:'English_AssertiveQueen',      name:'Assertive Queen', desc:'Властная, решительная' }
  ]
};

// ─── ACTOR MEMORY (voice ↔ character bindings) ──
const ACTOR_STORE_KEY = 'avd_actors';
function loadActors() {
  try { return JSON.parse(localStorage.getItem(ACTOR_STORE_KEY)) || {}; } catch { return {}; }
}
function saveActor(charName, voiceData) {
  const actors = loadActors();
  actors[charName.toLowerCase().trim()] = { ...voiceData, savedAt: new Date().toISOString() };
  localStorage.setItem(ACTOR_STORE_KEY, JSON.stringify(actors));
}
function getActor(charName) {
  return loadActors()[(charName||'').toLowerCase().trim()] || null;
}

// ─── STATE ──────────────────────────────────────
const S = {
  step: 1, total: 8,
  charCount: 1,
  lighting: 'natural',
  colorScheme: 'neutral',
  videoModel: 'seedance-2.0',
  ttsModel: 'speech-2.8-hd',
  duration: '10',
  aspectRatio: '16:9',
  sceneCount: 1,
  quality: 'standard',
  musicMode: 'none',
  useRefAsScene0: false,
  voices: {},
  genderTab: {},
  voiceMode: {},   // {1:'preset', 2:'design'}
  voiceDesignText: {}, // {1:'Зрелая женщина 55 лет...'}
  charFiles: {},
  wardrobeMode: {}, // {1:'keep', 2:'change'}
  wardrobeFiles: {},
  wardrobeDesc: {},
  locationPhotos: [],
  scenes: [],
  genActive: false,
  results: {}
};
const STORE_KEY = 'avd_draft_v2';

// ─── INIT ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDropzone('dropScenario','fileScenario', f => readText(f).then(t => eid('scenarioText').value = t));
  eid('speechSpeed').addEventListener('input', e => eid('speedVal').textContent = (+e.target.value).toFixed(1)+'x');
  buildChars();
  initScenes();
  // Restore keys
  eid('apiKeyInput').value    = ls('avd_api')  || '';
  eid('minimaxKeyInput').value = ls('avd_minimax') || '';
  eid('webhookInput').value   = ls('avd_hook') || '';
  if (localStorage.getItem(STORE_KEY)) eid('toast').classList.remove('hidden');
  updateUI();
});

// ─── NAVIGATION ─────────────────────────────────
function goNext() {
  // Validation: step 2 requires face photos
  if (S.step === 2) {
    let valid = true;
    for (let i = 1; i <= S.charCount; i++) {
      if (!S.charFiles[i]?.face) { valid = false; break; }
    }
    if (!valid) {
      eid('charValidation').classList.remove('hidden');
      return;
    }
    eid('charValidation').classList.add('hidden');
  }
  if (S.step === 2) buildWardrobe();
  if (S.step === 4) initScenes();
  if (S.step === 5) buildVoices();
  if (S.step === 7) buildSummary();
  if (S.step >= S.total) return;
  eid('step'+S.step).classList.remove('active');
  S.step++;
  eid('step'+S.step).classList.add('active');
  updateUI();
  scrollTo({top:0,behavior:'smooth'});
}
function goBack() {
  if (S.step <= 1) return;
  eid('step'+S.step).classList.remove('active');
  S.step--;
  eid('step'+S.step).classList.add('active');
  updateUI();
  scrollTo({top:0,behavior:'smooth'});
}
function updateUI() {
  const pct = (S.step / S.total * 100).toFixed(0);
  eid('progressBar').style.width = pct + '%';
  eid('stepLabel').textContent = `Шаг ${S.step} из ${S.total}`;
}

// ─── OPTION PICKERS ─────────────────────────────
function pickOpt(el, key) {
  el.closest('.opts').querySelectorAll('.opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  S[key] = el.dataset.val;
  // Music mode toggle
  if (key === 'musicMode') {
    eid('musicDescBlock').classList.toggle('hidden', S.musicMode !== 'describe');
    eid('musicUploadBlock').classList.toggle('hidden', S.musicMode !== 'upload');
  }
}
function pickModel(el, key) {
  el.closest('.model-list').querySelectorAll('.model').forEach(m => m.classList.remove('selected'));
  el.classList.add('selected');
  S[key] = el.dataset.val;
}

// ─── CHARACTER CARDS (step 2) ───────────────────
function setCharCount(n) {
  S.charCount = n;
  eid('charCountOpts').querySelectorAll('.opt').forEach(o =>
    o.classList.toggle('selected', +o.dataset.val === n));
  buildChars();
}

function buildChars() {
  const g = eid('charsGrid'); g.innerHTML = '';
  for (let i = 1; i <= S.charCount; i++) {
    const saved = getActor(eid('cName'+i)?.value || '');
    const d = document.createElement('div');
    d.className = 'char-card';
    d.innerHTML = `
      <h4>Персонаж ${i}</h4>
      <div class="upload-row">
        <div class="upload-box ${S.charFiles[i]?.face?'has':''}" id="faceBox${i}" onclick="eid('faceIn${i}').click()">
          <span class="u-icon">📷</span><span>${S.charFiles[i]?.face?.name||'Фото лица *'}</span>
          <small>Обязательно · JPG, PNG</small>
          <input type="file" id="faceIn${i}" accept="image/*" hidden onchange="markUpload(${i},'face',this)">
        </div>
        <div class="upload-box ${S.charFiles[i]?.video?'has':''}" id="vidBox${i}" onclick="eid('vidIn${i}').click()">
          <span class="u-icon">🎬</span><span>${S.charFiles[i]?.video?.name||'Видео-референс'}</span>
          <small>Опционально · MP4, MOV</small>
          <input type="file" id="vidIn${i}" accept="video/*" hidden onchange="markUpload(${i},'video',this)">
        </div>
      </div>
      <input type="text" id="cName${i}" placeholder="Имя персонажа" value="${eid('cName'+i)?.value||''}"
             onblur="checkActorMemory(${i})">
      <textarea id="cDesc${i}" rows="2" placeholder="Возраст, внешность, характер...">${eid('cDesc'+i)?.value||''}</textarea>
      ${saved ? `<div class="actor-memory-hint">🔗 Найден закреплённый голос: <strong>${saved.voiceName||saved.voiceId}</strong></div>` : ''}`;
    g.appendChild(d);
  }
}

function markUpload(i, type, inp) {
  if (!inp.files[0]) return;
  if (!S.charFiles[i]) S.charFiles[i] = {};
  S.charFiles[i][type] = inp.files[0];
  const box = eid(type==='face'?'faceBox'+i:'vidBox'+i);
  box.classList.add('has');
  box.querySelector('span:nth-child(2)').textContent = inp.files[0].name;
  eid('charValidation').classList.add('hidden');
}

function checkActorMemory(i) {
  const name = eid('cName'+i)?.value;
  if (!name) return;
  const saved = getActor(name);
  if (saved) {
    S.voices[i] = saved.voiceId;
    S.voiceMode[i] = saved.mode || 'preset';
    if (saved.designText) S.voiceDesignText[i] = saved.designText;
    if (saved.gender) S.genderTab[i] = saved.gender;
  }
}

// ─── WARDROBE (step 3) ─────────────────────────
function buildWardrobe() {
  const c = eid('wardrobeCard'); c.innerHTML = '';
  for (let i = 1; i <= S.charCount; i++) {
    const cName = eid('cName'+i)?.value || 'Персонаж '+i;
    if (!S.wardrobeMode[i]) S.wardrobeMode[i] = 'keep';
    const sec = document.createElement('div');
    sec.className = 'wardrobe-section';
    sec.innerHTML = `
      <h4>👔 ${esc(cName)}</h4>
      <div class="opts compact" id="wardOpts${i}">
        <div class="opt ${S.wardrobeMode[i]==='keep'?'selected':''}" data-val="keep"
             onclick="setWardrobeMode(${i},'keep',this)">
          👗 Оставить как на референсе
        </div>
        <div class="opt ${S.wardrobeMode[i]==='change'?'selected':''}" data-val="change"
             onclick="setWardrobeMode(${i},'change',this)">
          ✂️ Переодеть
        </div>
      </div>
      <div id="wardrobeChange${i}" class="${S.wardrobeMode[i]==='change'?'':'hidden'}">
        <textarea id="wardDesc${i}" rows="2"
                  placeholder="Описание нового образа: цвет, стиль, детали...">${S.wardrobeDesc[i]||''}</textarea>
        <div class="upload-box mini" onclick="eid('wardPhotoIn${i}').click()">
          <span class="u-icon">📷</span><span>Фото элементов одежды</span>
          <input type="file" id="wardPhotoIn${i}" accept="image/*" multiple hidden
                 onchange="markWardrobePhotos(${i},this)">
        </div>
        <div class="thumbs-row" id="wardThumbs${i}"></div>
      </div>`;
    c.appendChild(sec);
  }
}

function setWardrobeMode(i, mode, el) {
  S.wardrobeMode[i] = mode;
  el.closest('.opts').querySelectorAll('.opt').forEach(o => o.classList.toggle('selected', o.dataset.val===mode));
  eid('wardrobeChange'+i).classList.toggle('hidden', mode!=='change');
}

function markWardrobePhotos(i, inp) {
  if (!inp.files.length) return;
  S.wardrobeFiles[i] = Array.from(inp.files);
  const t = eid('wardThumbs'+i); t.innerHTML = '';
  S.wardrobeFiles[i].forEach(f => {
    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = URL.createObjectURL(f);
    t.appendChild(img);
  });
}

// ─── LOCATION PHOTOS ────────────────────────────
function addLocationPhotos(inp) {
  if (!inp.files.length) return;
  S.locationPhotos.push(...Array.from(inp.files));
  const t = eid('locThumbs'); t.innerHTML = '';
  S.locationPhotos.forEach((f,i) => {
    const wrap = document.createElement('div');
    wrap.className = 'thumb-wrap';
    wrap.innerHTML = `<img class="thumb" src="${URL.createObjectURL(f)}"><span class="thumb-del" onclick="removeLocPhoto(${i})">✕</span>`;
    t.appendChild(wrap);
  });
}
function removeLocPhoto(i) {
  S.locationPhotos.splice(i, 1);
  addLocationPhotos({files:[]});
  const t = eid('locThumbs'); t.innerHTML = '';
  S.locationPhotos.forEach((f,idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'thumb-wrap';
    wrap.innerHTML = `<img class="thumb" src="${URL.createObjectURL(f)}"><span class="thumb-del" onclick="removeLocPhoto(${idx})">✕</span>`;
    t.appendChild(wrap);
  });
}

// ─── SCENES / STORYBOARD (step 5) ──────────────
function setSceneCount(n) {
  S.sceneCount = n;
  eid('sceneCountOpts').querySelectorAll('.opt').forEach(o =>
    o.classList.toggle('selected', +o.dataset.val === n));
  initScenes();
}

function toggleRefScene() {
  S.useRefAsScene0 = eid('useRefAsScene0').checked;
  eid('refDurationNote').classList.toggle('hidden', !S.useRefAsScene0);
  calcTotalDuration();
}

function initScenes() {
  // Preserve existing scene data
  const old = S.scenes.slice();
  S.scenes = [];
  const c = eid('scenesContainer'); c.innerHTML = '';

  // Get character names for dropdowns
  const charNames = [];
  for (let i = 1; i <= S.charCount; i++) {
    charNames.push(eid('cName'+i)?.value || 'Персонаж '+i);
  }

  for (let s = 0; s < S.sceneCount; s++) {
    const prev = old[s] || {};
    S.scenes[s] = {
      duration: prev.duration || 10,
      angle: prev.angle || 'medium',
      characters: prev.characters || charNames.map((_,i)=>i+1),
      dialog: prev.dialog || '',
      action: prev.action || '',
      notes: prev.notes || ''
    };

    const anglesMap = {'close-up':'Крупный','medium':'Средний','wide':'Общий','over-shoulder':'Через плечо','two-shot':'Двойной'};
    const charCheckboxes = charNames.map((cn,ci) => {
      const checked = S.scenes[s].characters.includes(ci+1) ? 'checked' : '';
      return `<label class="char-check"><input type="checkbox" ${checked} onchange="toggleSceneChar(${s},${ci+1},this.checked)"> ${esc(cn)}</label>`;
    }).join(' ');

    const card = document.createElement('div');
    card.className = 'scene-card';
    card.innerHTML = `
      <div class="scene-header">
        <strong>Сцена ${s+1}</strong>
        <div class="scene-dur-picker">
          <button class="${S.scenes[s].duration===5?'on':''}" onclick="setSceneDur(${s},5)">5с</button>
          <button class="${S.scenes[s].duration===10?'on':''}" onclick="setSceneDur(${s},10)">10с</button>
          <button class="${S.scenes[s].duration===15?'on':''}" onclick="setSceneDur(${s},15)">15с</button>
        </div>
      </div>
      <div class="scene-body">
        <div class="scene-field">
          <label>📸 Ракурс:</label>
          <select onchange="S.scenes[${s}].angle=this.value">
            ${Object.entries(anglesMap).map(([k,v])=>`<option value="${k}" ${S.scenes[s].angle===k?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="scene-field">
          <label>👥 Персонажи:</label>
          <div class="char-checks">${charCheckboxes}</div>
        </div>
        <div class="scene-field">
          <label>💬 Диалоги сцены:</label>
          <textarea rows="2" placeholder="Имя: реплика (каждая реплика с новой строки)"
                    onchange="S.scenes[${s}].dialog=this.value">${esc(S.scenes[s].dialog)}</textarea>
        </div>
        <div class="scene-field">
          <label>🎬 Действия:</label>
          <textarea rows="2" placeholder="Что происходит в этой сцене..."
                    onchange="S.scenes[${s}].action=this.value">${esc(S.scenes[s].action)}</textarea>
        </div>
        <div class="scene-field">
          <label>📝 Доп. указания:</label>
          <input type="text" placeholder="Особые эффекты, переходы..."
                 onchange="S.scenes[${s}].notes=this.value" value="${esc(S.scenes[s].notes)}">
        </div>
      </div>`;
    c.appendChild(card);
  }
  calcTotalDuration();
}

function setSceneDur(s, dur) {
  S.scenes[s].duration = dur;
  const card = eid('scenesContainer').children[s];
  card.querySelectorAll('.scene-dur-picker button').forEach(b =>
    b.classList.toggle('on', +b.textContent.replace('с','') === dur));
  calcTotalDuration();
}

function toggleSceneChar(s, charIdx, checked) {
  if (checked && !S.scenes[s].characters.includes(charIdx)) {
    S.scenes[s].characters.push(charIdx);
  } else if (!checked) {
    S.scenes[s].characters = S.scenes[s].characters.filter(c => c !== charIdx);
  }
}

function calcTotalDuration() {
  const total = S.scenes.reduce((sum, sc) => sum + (sc.duration || 10), 0);
  eid('totalDuration').textContent = total + ' сек';
}

// ─── VOICE SELECTION (step 6) ───────────────────
function buildVoices() {
  const c = eid('voicesContainer'); c.innerHTML = '';
  for (let i = 1; i <= S.charCount; i++) {
    const cName = eid('cName'+i)?.value || 'Персонаж '+i;
    const saved = getActor(cName);
    if (!S.genderTab[i]) S.genderTab[i] = 'ru_female';
    if (!S.voiceMode[i]) S.voiceMode[i] = saved ? (saved.mode||'preset') : 'preset';
    if (saved && !S.voices[i]) {
      S.voices[i] = saved.voiceId;
      if (saved.designText) S.voiceDesignText[i] = saved.designText;
      if (saved.gender) S.genderTab[i] = saved.gender;
    }

    const sec = document.createElement('div');
    sec.className = 'voice-section';
    sec.id = 'vsec'+i;

    const savedBadge = saved
      ? `<div class="actor-memory-hint">🔗 Закреплённый голос: <strong>${saved.voiceName||saved.voiceId}</strong> <button class="btn-xs" onclick="clearActorVoice(${i},'${esc(cName)}')">Сбросить</button></div>`
      : '';

    sec.innerHTML = `
      <div class="voice-title">🗣️ ${esc(cName)} ${savedBadge}</div>
      <div class="voice-mode-tabs">
        <div class="g-tab ${S.voiceMode[i]==='preset'?'on':''}" onclick="setVoiceMode(${i},'preset')">📋 Из каталога</div>
        <div class="g-tab ${S.voiceMode[i]==='design'?'on':''}" onclick="setVoiceMode(${i},'design')">✨ Описать голос</div>
      </div>
      <div id="voicePreset${i}" class="${S.voiceMode[i]==='preset'?'':'hidden'}">
        <div class="gender-tabs">
          ${['ru_female','ru_male','en_female','en_male'].map(g =>
            `<div class="g-tab ${S.genderTab[i]===g?'on':''}" onclick="switchGender(${i},'${g}')">${
              g==='ru_female'?'🇷🇺 Жен.':g==='ru_male'?'🇷🇺 Муж.':g==='en_female'?'🇬🇧 Жен.':'🇬🇧 Муж.'
            }</div>`
          ).join('')}
        </div>
        <div class="v-grid" id="vgrid${i}">${voiceCards(i, S.genderTab[i])}</div>
        <button class="btn btn-sm btn-outline" onclick="previewVoices(${i})" style="margin-top:8px">
          🎧 Прослушать 3 варианта
        </button>
      </div>
      <div id="voiceDesign${i}" class="${S.voiceMode[i]==='design'?'':'hidden'}">
        <textarea id="vDesignText${i}" rows="3"
                  placeholder="Опишите голос: Зрелая женщина 55 лет, тёплый голос, уверенная интонация, с лёгкой иронией...">${S.voiceDesignText[i]||''}</textarea>
        <button class="btn btn-sm btn-next" onclick="designVoice(${i})">
          ✨ Создать и прослушать голос
        </button>
        <div id="designResult${i}"></div>
      </div>`;
    c.appendChild(sec);
  }
}

function setVoiceMode(i, mode) {
  S.voiceMode[i] = mode;
  const sec = eid('vsec'+i);
  sec.querySelectorAll('.voice-mode-tabs .g-tab').forEach(t =>
    t.classList.toggle('on', t.textContent.includes(mode==='preset'?'каталога':'Описать')));
  eid('voicePreset'+i).classList.toggle('hidden', mode!=='preset');
  eid('voiceDesign'+i).classList.toggle('hidden', mode!=='design');
}

function voiceCards(ci, gender) {
  const list = VOICES[gender] || VOICES.ru_female;
  return list.map(v =>
    `<div class="v-card ${S.voices[ci]===v.id?'on':''}" onclick="pickVoice(${ci},'${v.id}','${esc(v.name)}')">
      <strong>${v.name}</strong><small>${v.desc}</small>
    </div>`
  ).join('');
}

function switchGender(ci, g) {
  S.genderTab[ci] = g;
  const sec = eid('vsec'+ci);
  sec.querySelectorAll('.gender-tabs .g-tab').forEach(t => {
    const map = {'ru_female':'🇷🇺 Жен.','ru_male':'🇷🇺 Муж.','en_female':'🇬🇧 Жен.','en_male':'🇬🇧 Муж.'};
    t.classList.toggle('on', t.textContent.trim() === map[g]);
  });
  eid('vgrid'+ci).innerHTML = voiceCards(ci, g);
}

function pickVoice(ci, vid, vname) {
  S.voices[ci] = vid;
  eid('vgrid'+ci).innerHTML = voiceCards(ci, S.genderTab[ci]);
  // Save actor binding
  const charName = eid('cName'+ci)?.value;
  if (charName) {
    saveActor(charName, {
      voiceId: vid,
      voiceName: vname,
      mode: 'preset',
      gender: S.genderTab[ci]
    });
  }
}

function clearActorVoice(ci, charName) {
  const actors = loadActors();
  delete actors[charName.toLowerCase().trim()];
  localStorage.setItem(ACTOR_STORE_KEY, JSON.stringify(actors));
  S.voices[ci] = null;
  buildVoices();
}

// ─── VOICE PREVIEW (3 samples) ─────────────────
async function previewVoices(ci) {
  const gender = S.genderTab[ci];
  const list = VOICES[gender] || VOICES.ru_female;
  // Pick current + 2 neighbors
  const currentIdx = list.findIndex(v => v.id === S.voices[ci]);
  const indices = new Set();
  if (currentIdx >= 0) indices.add(currentIdx);
  while (indices.size < Math.min(3, list.length)) {
    indices.add(Math.floor(Math.random() * list.length));
  }

  const charName = eid('cName'+ci)?.value || 'Персонаж';
  const sampleText = `Привет! Меня зовут ${charName}. Я рада вас видеть и готова начать работу.`;

  const modal = eid('voicePreviewModal');
  const container = eid('voicePreviewList');
  container.innerHTML = '<div class="loading">🎙️ Генерация превью...</div>';
  modal.classList.remove('hidden');

  const minimaxKey = eid('minimaxKeyInput')?.value || ls('avd_minimax') || '';
  if (!minimaxKey) {
    container.innerHTML = '<div class="err">Введите MiniMax API ключ на шаге 8, затем вернитесь сюда</div>';
    return;
  }

  container.innerHTML = '';
  for (const idx of indices) {
    const v = list[idx];
    try {
      const res = await fetch('https://api.minimax.io/v1/t2a_v2', {
        method:'POST',
        headers:{'Authorization':'Bearer '+minimaxKey,'Content-Type':'application/json'},
        body: JSON.stringify({
          model: S.ttsModel,
          text: sampleText,
          stream: false,
          language_boost: 'Russian',
          output_format: 'url',
          voice_setting: { voice_id: v.id, speed: 1, vol: 1, pitch: 0 },
          audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 }
        })
      });
      const data = await res.json();
      const audioUrl = data?.data?.audio;
      container.innerHTML += `
        <div class="preview-item">
          <strong>${v.name}</strong> <small>${v.desc}</small>
          ${audioUrl ? `<audio controls src="${audioUrl}"></audio>` : '<small class="err">Ошибка генерации</small>'}
          <button class="btn btn-sm btn-next" onclick="pickVoice(${ci},'${v.id}','${esc(v.name)}');closeVoicePreview()">
            ✅ Выбрать
          </button>
        </div>`;
    } catch(e) {
      container.innerHTML += `<div class="preview-item"><strong>${v.name}</strong> <small class="err">${e.message}</small></div>`;
    }
  }
}

function closeVoicePreview() {
  eid('voicePreviewModal').classList.add('hidden');
}

// ─── VOICE DESIGN (custom voice by description) ─
async function designVoice(ci) {
  const desc = eid('vDesignText'+ci)?.value?.trim();
  if (!desc) { toast('Опишите желаемый голос'); return; }
  S.voiceDesignText[ci] = desc;

  const minimaxKey = eid('minimaxKeyInput')?.value || ls('avd_minimax') || '';
  if (!minimaxKey) { toast('Введите MiniMax API ключ на шаге 8'); return; }

  const charName = eid('cName'+ci)?.value || 'Персонаж';
  const sampleText = `Привет! Меня зовут ${charName}. Рада познакомиться с вами поближе.`;
  const resultDiv = eid('designResult'+ci);
  resultDiv.innerHTML = '<div class="loading">✨ Создаём уникальный голос...</div>';

  try {
    const res = await fetch('https://api.minimax.io/v1/voice_design', {
      method:'POST',
      headers:{'Authorization':'Bearer '+minimaxKey,'Content-Type':'application/json'},
      body: JSON.stringify({ prompt: desc, preview_text: sampleText })
    });
    const data = await res.json();
    if (data.voice_id) {
      S.voices[ci] = data.voice_id;
      // Decode hex audio to blob
      let audioHtml = '';
      if (data.trial_audio) {
        const bytes = new Uint8Array(data.trial_audio.match(/.{1,2}/g).map(b=>parseInt(b,16)));
        const blob = new Blob([bytes], {type:'audio/mp3'});
        const url = URL.createObjectURL(blob);
        audioHtml = `<audio controls src="${url}"></audio>`;
      }
      resultDiv.innerHTML = `
        <div class="preview-item success">
          <strong>✅ Голос создан!</strong> <small>ID: ${data.voice_id}</small>
          ${audioHtml}
          <button class="btn btn-sm btn-next" onclick="confirmDesignedVoice(${ci},'${data.voice_id}')">
            🔗 Закрепить за персонажем
          </button>
        </div>`;
    } else {
      resultDiv.innerHTML = `<div class="err">Ошибка: ${data?.base_resp?.status_msg || 'неизвестная'}</div>`;
    }
  } catch(e) {
    resultDiv.innerHTML = `<div class="err">Ошибка: ${e.message}</div>`;
  }
}

function confirmDesignedVoice(ci, voiceId) {
  const charName = eid('cName'+ci)?.value;
  if (charName) {
    saveActor(charName, {
      voiceId: voiceId,
      voiceName: 'Custom: ' + (S.voiceDesignText[ci]||'').slice(0,40),
      mode: 'design',
      designText: S.voiceDesignText[ci],
      gender: S.genderTab[ci]
    });
  }
  toast('✅ Голос закреплён за ' + (charName||'персонажем'));
}

// ─── MUSIC ──────────────────────────────────────
function markMusicUpload(inp) {
  if (!inp.files[0]) return;
  S.musicFile = inp.files[0];
  inp.closest('.upload-box').classList.add('has');
  inp.closest('.upload-box').querySelector('span:nth-child(2)').textContent = inp.files[0].name;
}

// ─── SUMMARY (step 8) ──────────────────────────
function buildSummary() {
  const mNames = {'seedance-2.0':'Seedance 2.0','kling-3':'Kling 3','seedance-1.5-pro':'Seedance 1.5 Pro'};
  const tNames = {'speech-2.8-hd':'MiniMax 2.8 HD','speech-2.8-turbo':'MiniMax 2.8 Turbo'};
  const qNames = {draft:'Черновик',standard:'Стандарт',high:'Высокое'};

  const totalDur = S.scenes.reduce((s,sc)=>s+(sc.duration||10),0);
  const charNames = [];
  for (let i=1;i<=S.charCount;i++) charNames.push(eid('cName'+i)?.value||'Персонаж '+i);

  eid('summaryBlock').innerHTML = [
    si('Сценарий', trunc(eid('scenarioText').value,60)),
    si('Персонажи', charNames.join(', ')),
    si('Видео', mNames[S.videoModel]||S.videoModel),
    si('Озвучка', tNames[S.ttsModel]||S.ttsModel),
    si('Сцен', S.sceneCount + (S.useRefAsScene0?' (+референс)':'')),
    si('Итого', totalDur + ' сек' + (S.useRefAsScene0?' + референс':'')),
    si('Формат', S.aspectRatio),
    si('Качество', qNames[S.quality]||S.quality),
    si('Музыка', S.musicMode==='none'?'Нет':S.musicMode==='describe'?trunc(eid('musicDesc')?.value,40):'Загружен трек')
  ].join('');

  // Scene table
  const anglesMap = {'close-up':'Крупный','medium':'Средний','wide':'Общий','over-shoulder':'Через плечо','two-shot':'Двойной'};
  let table = '<table class="scene-table"><thead><tr><th>Сцена</th><th>Длит.</th><th>Ракурс</th><th>Персонажи</th><th>Диалог</th></tr></thead><tbody>';
  if (S.useRefAsScene0) {
    table += `<tr class="ref-row"><td>0 (реф.)</td><td>—</td><td>—</td><td>—</td><td><em>Референсное видео</em></td></tr>`;
  }
  S.scenes.forEach((sc,i) => {
    const scChars = sc.characters.map(ci=>charNames[ci-1]||'?').join(', ');
    table += `<tr><td>${i+1}</td><td>${sc.duration}с</td><td>${anglesMap[sc.angle]||sc.angle}</td><td>${esc(scChars)}</td><td>${esc(trunc(sc.dialog,30))}</td></tr>`;
  });
  table += '</tbody></table>';
  eid('sceneSummaryTable').innerHTML = table;

  // Time estimate
  const vidTime = S.videoModel==='seedance-2.0'?'1–3 мин/сцена':'3–5 мин/сцена';
  const totalTime = S.videoModel==='seedance-2.0'?`~${S.sceneCount*2+2} мин`:`~${S.sceneCount*4+2} мин`;
  eid('timeBlock').innerHTML = `
    <div class="time-row"><span class="t-l">Видео (${mNames[S.videoModel]}, ${S.sceneCount} сц.)</span><span class="t-v">${vidTime}</span></div>
    <div class="time-row"><span class="t-l">Озвучка (MiniMax)</span><span class="t-v">~30 сек</span></div>
    <div class="time-row"><span class="t-l">Склейка + наложение звука (FFmpeg)</span><span class="t-v">~1 мин</span></div>
    <div class="time-row total"><span class="t-l">Итого:</span><span class="t-v">${totalTime}</span></div>`;
}

function si(l,v){return `<div class="s-item"><span class="s-lbl">${l}</span><span class="s-val">${v||'—'}</span></div>`}
function trunc(s,n){return s?(s.length>n?s.slice(0,n)+'…':s):'—'}

// ─── BUILD PAYLOAD ──────────────────────────────
function buildPayload() {
  const chars = [];
  for (let i=1; i<=S.charCount; i++) {
    chars.push({
      index: i,
      name: eid('cName'+i)?.value || 'Персонаж '+i,
      description: eid('cDesc'+i)?.value || '',
      voiceId: S.voices[i] || null,
      voiceMode: S.voiceMode[i] || 'preset',
      voiceDesignText: S.voiceDesignText[i] || null,
      wardrobeMode: S.wardrobeMode[i] || 'keep',
      wardrobeDesc: S.wardrobeDesc[i] || (eid('wardDesc'+i)?.value || ''),
      hasFacePhoto: !!S.charFiles[i]?.face,
      hasVideoRef: !!S.charFiles[i]?.video
    });
  }

  return {
    timestamp: new Date().toISOString(),
    brief: eid('briefText')?.value || '',
    scenario: { text: eid('scenarioText')?.value || '' },
    location: {
      description: eid('locationText')?.value || '',
      lighting: S.lighting,
      colorScheme: S.colorScheme,
      hasPhotos: S.locationPhotos.length > 0
    },
    characterCount: S.charCount,
    characters: chars,
    scenes: S.scenes.map((sc, i) => ({
      index: i,
      duration: sc.duration,
      angle: sc.angle,
      characters: sc.characters,
      dialog: sc.dialog,
      action: sc.action,
      notes: sc.notes
    })),
    useRefAsScene0: S.useRefAsScene0,
    videoGeneration: {
      model: S.videoModel,
      aspectRatio: S.aspectRatio,
      quality: S.quality
    },
    tts: {
      model: S.ttsModel,
      speed: +eid('speechSpeed')?.value || 1
    },
    music: {
      mode: S.musicMode,
      description: S.musicMode==='describe' ? (eid('musicDesc')?.value||'') : '',
      hasFile: S.musicMode==='upload' && !!S.musicFile
    }
  };
}

// ─── LAUNCH ─────────────────────────────────────
async function launch() {
  const apiKey = eid('apiKeyInput').value.trim();
  const minimaxKey = eid('minimaxKeyInput').value.trim();
  const hook = eid('webhookInput').value.trim();

  if (!minimaxKey) { toast('⚠️ Введите MiniMax API ключ!'); return; }
  if (!hook && !apiKey) { toast('⚠️ Введите API in One ключ или Webhook URL!'); return; }

  localStorage.setItem('avd_minimax', minimaxKey);
  if (apiKey) localStorage.setItem('avd_api', apiKey);
  if (hook) localStorage.setItem('avd_hook', hook);
  saveDraft();

  const payload = buildPayload();

  // ── Webhook mode (N8N) ──
  if (hook) {
    showModal();
    log('info','Отправка данных на N8N webhook...');
    try {
      // Build FormData for files
      const fd = new FormData();
      fd.append('payload', JSON.stringify({...payload, apiKey, minimaxKey}));
      // Attach character files
      for (let i=1; i<=S.charCount; i++) {
        if (S.charFiles[i]?.face) fd.append(`char${i}_face`, S.charFiles[i].face);
        if (S.charFiles[i]?.video) fd.append(`char${i}_video`, S.charFiles[i].video);
        if (S.wardrobeFiles[i]) S.wardrobeFiles[i].forEach((f,j)=>fd.append(`char${i}_wardrobe_${j}`,f));
      }
      S.locationPhotos.forEach((f,j)=>fd.append(`location_photo_${j}`,f));
      if (S.musicFile) fd.append('music', S.musicFile);

      const r = await fetch(hook, {method:'POST', body: fd});
      if (!r.ok) throw new Error('HTTP '+r.status);
      log('ok','✅ Данные отправлены на N8N! Workflow запущен.');
      log('info','Генерация выполняется на сервере.');
      setBar(100,'Отправлено');
    } catch(e) { log('err','Ошибка webhook: '+e.message); }
    return;
  }

  // ── Direct API mode (basic) ──
  showModal();
  log('info','Прямой режим: генерация через API...');
  log('info','⚠️ Для полной генерации со склейкой используйте N8N webhook');
  setBar(100,'Используйте N8N для полной генерации');
}

// ─── DRAFT SAVE/LOAD ────────────────────────────
function saveDraft() {
  try {
    const data = {
      scenarioText: eid('scenarioText')?.value,
      briefText: eid('briefText')?.value,
      locationText: eid('locationText')?.value,
      charCount: S.charCount,
      lighting: S.lighting,
      colorScheme: S.colorScheme,
      videoModel: S.videoModel,
      ttsModel: S.ttsModel,
      speechSpeed: eid('speechSpeed')?.value,
      voices: S.voices,
      genderTab: S.genderTab,
      voiceMode: S.voiceMode,
      voiceDesignText: S.voiceDesignText,
      sceneCount: S.sceneCount,
      scenes: S.scenes,
      useRefAsScene0: S.useRefAsScene0,
      aspectRatio: S.aspectRatio,
      quality: S.quality,
      musicMode: S.musicMode,
      musicDesc: eid('musicDesc')?.value,
      wardrobeMode: S.wardrobeMode,
      wardrobeDesc: {},
      characters: [],
      savedAt: new Date().toISOString()
    };
    for (let i=1;i<=S.charCount;i++) {
      data.characters.push({
        name: eid('cName'+i)?.value||'',
        description: eid('cDesc'+i)?.value||''
      });
      data.wardrobeDesc[i] = eid('wardDesc'+i)?.value || '';
    }
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
    localStorage.setItem('avd_minimax', eid('minimaxKeyInput')?.value||'');
    localStorage.setItem('avd_api', eid('apiKeyInput')?.value||'');
    localStorage.setItem('avd_hook', eid('webhookInput')?.value||'');
    toast('📋 Черновик сохранён!');
  } catch(e) { toast('Ошибка сохранения'); console.error(e); }
}

function loadDraft() {
  hideToast();
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY));
    if (!d) return;
    if (d.scenarioText) eid('scenarioText').value = d.scenarioText;
    if (d.briefText) eid('briefText').value = d.briefText;
    if (d.locationText) eid('locationText').value = d.locationText;
    if (d.charCount) setCharCount(d.charCount);
    if (d.lighting) { S.lighting=d.lighting; restoreOpts('lightingOpts',d.lighting); }
    if (d.colorScheme) { S.colorScheme=d.colorScheme; restoreOpts('colorOpts',d.colorScheme); }
    if (d.videoModel) { S.videoModel=d.videoModel; restoreModel('videoModelList',d.videoModel); }
    if (d.ttsModel) { S.ttsModel=d.ttsModel; restoreModel('ttsModelList',d.ttsModel); }
    if (d.speechSpeed) { eid('speechSpeed').value=d.speechSpeed; eid('speedVal').textContent=(+d.speechSpeed).toFixed(1)+'x'; }
    if (d.voices) S.voices=d.voices;
    if (d.genderTab) S.genderTab=d.genderTab;
    if (d.voiceMode) S.voiceMode=d.voiceMode;
    if (d.voiceDesignText) S.voiceDesignText=d.voiceDesignText;
    if (d.sceneCount) { S.sceneCount=d.sceneCount; setSceneCount(d.sceneCount); }
    if (d.scenes) S.scenes=d.scenes;
    if (d.useRefAsScene0!=null) { S.useRefAsScene0=d.useRefAsScene0; eid('useRefAsScene0').checked=d.useRefAsScene0; }
    if (d.aspectRatio) { S.aspectRatio=d.aspectRatio; restoreOpts('aspectOpts',d.aspectRatio); }
    if (d.quality) { S.quality=d.quality; restoreOpts('qualityOpts',d.quality); }
    if (d.musicMode) { S.musicMode=d.musicMode; restoreOpts('musicOpts',d.musicMode); }
    if (d.musicDesc) eid('musicDesc').value = d.musicDesc;
    if (d.wardrobeMode) S.wardrobeMode=d.wardrobeMode;
    if (d.wardrobeDesc) S.wardrobeDesc=d.wardrobeDesc;
    setTimeout(()=>{
      if (d.characters) d.characters.forEach((c,i)=>{
        const n=eid('cName'+(i+1)), desc=eid('cDesc'+(i+1));
        if(n)n.value=c.name||''; if(desc)desc.value=c.description||'';
      });
      initScenes();
    },80);
    toast('✅ Черновик загружен');
  } catch(e) { toast('Ошибка загрузки'); console.error(e); }
}

function restoreOpts(id,val) {
  const el=eid(id);if(!el)return;
  el.querySelectorAll('.opt').forEach(o=>o.classList.toggle('selected',o.dataset.val===String(val)));
}
function restoreModel(id,val) {
  const el=eid(id);if(!el)return;
  el.querySelectorAll('.model').forEach(m=>m.classList.toggle('selected',m.dataset.val===val));
}

// ─── DROPZONE ───────────────────────────────────
function initDropzone(zoneId, inputId, cb) {
  const z=eid(zoneId), inp=eid(inputId);
  z.addEventListener('click',()=>inp.click());
  z.addEventListener('dragover',e=>{e.preventDefault();z.classList.add('over')});
  z.addEventListener('dragleave',()=>z.classList.remove('over'));
  z.addEventListener('drop',e=>{e.preventDefault();z.classList.remove('over');if(e.dataTransfer.files[0]){markDrop(z,e.dataTransfer.files[0]);cb(e.dataTransfer.files[0])}});
  inp.addEventListener('change',()=>{if(inp.files[0]){markDrop(z,inp.files[0]);cb(inp.files[0])}});
}
function markDrop(z,f){z.classList.add('has-file');z.querySelector('p').textContent=f.name}
function readText(f){return new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsText(f)})}

// ─── MODAL ──────────────────────────────────────
function showModal(){eid('modal').classList.remove('hidden');eid('logBox').innerHTML='';eid('genBar').style.width='0';eid('genStatus').textContent='Подготовка...';eid('dlBtn').classList.add('hidden')}
function closeModal(){eid('modal').classList.add('hidden')}
function log(type,msg){
  const t=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  eid('logBox').innerHTML+=`<div class="log-e ${type}"><span class="log-t">[${t}]</span><span class="log-m">${esc(msg)}</span></div>`;
  eid('logBox').scrollTop=9999;
}
function setBar(pct,txt){eid('genBar').style.width=Math.min(pct,100)+'%';if(txt)eid('genStatus').textContent=txt}
function hideToast(){eid('toast').classList.add('hidden')}

// ─── UTILS ──────────────────────────────────────
function eid(id){return document.getElementById(id)}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function ls(k){return localStorage.getItem(k)}
function toast(msg){
  const t=document.createElement('div');t.className='toast-popup';t.innerHTML='<span>'+msg+'</span>';
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(()=>t.remove(),300)},2500);
}
