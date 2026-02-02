/* ==========================================
   0. Security & Anti-Debug (簡易プロテクト)
   ========================================== */
   (function() {
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.onkeydown = function(e) {
      if (e.keyCode == 123) { return false; } // F12
      if (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) { return false; }
      if (e.ctrlKey && e.shiftKey && e.keyCode == 'C'.charCodeAt(0)) { return false; }
      if (e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) { return false; }
      if (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) { return false; }
    };
    setInterval(function() {
      const startTime = performance.now();
      // debugger; // 開発時はコメントアウト推奨
      const endTime = performance.now();
      if (endTime - startTime > 100) {
        // 検知時の処理
      }
    }, 1000);
  })();
  
  /* ==========================================
     1. Logic & Data Fetching
     ========================================== */
  const SESSION_KEY = 'aws_v9_session';
  const WEAK_KEY = 'aws_v9_weak';
  const BK_KEY = 'aws_v9_bookmark';
  let appState = { mode: '', questions: [], currentIndex: 0, correctCount: 0, wrongList: [] };
  let currentLang = 'ja';
  let timerInterval = null;
  
  // データ格納用変数
  let vocabClfData = [], vocabSaaData = [], vocabSapData = [];
  let clfData = [], saaData = [], sapData = [], allData = [];
  
  // 翻訳データ
  const TRANSLATIONS = {
    ja: {
      quit: "中断", home_title: "学習モード選択", home_subtitle: "基礎から実践まで完全網羅", resume: "再開",
      sec_review: "復習＆ブックマーク", weak_mode: "苦手克服", bk_mode: "ブックマーク",
      sec_vocab: "用語暗記", vocab_mode: "単語帳", vocab_desc: "基本用語ドリル",
      mode_quick: "クイック", mode_hard: "演習", mode_endless: "エンドレス", mode_exam: "本番模試",
      guide_title: "学習ガイド", guide_text: "CLF/SAA/SAP対応。★ボタンで問題を保存できます。",
      score_label: "正解率", review_label: "復習", home_btn: "ホーム", next_btn: "次へ", finish_btn: "結果",
      correct: "正解", wrong: "不正解", point: "ポイント", solution: "解", ad_title: "合格への近道", ad_btn: "参考書を探す"
    },
    en: {
      quit: "Quit", home_title: "Select Mode", home_subtitle: "Full Exam Prep", resume: "Resume",
      sec_review: "Review", weak_mode: "Weakness", bk_mode: "Bookmarks",
      sec_vocab: "Vocabulary", vocab_mode: "Vocab Drill", vocab_desc: "Basics",
      mode_quick: "Quick", mode_hard: "Hard", mode_endless: "Endless", mode_exam: "Exam Sim",
      guide_title: "Guide", guide_text: "Supports CLF/SAA/SAP. Use ★ to bookmark questions.",
      score_label: "Score", review_label: "Review", home_btn: "Home", next_btn: "Next", finish_btn: "Finish",
      correct: "Correct", wrong: "Wrong", point: "Point", solution: "Ans", ad_title: "Recommended", ad_btn: "Find Books"
    }
  };
  
  document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('aws_app_lang');
    if(savedLang) { currentLang = savedLang; document.getElementById('langSelect').value = savedLang; }
    applyTranslation();
    
    window.history.replaceState({screen:'homeScreen'},'','#home');
    window.addEventListener('popstate', e => {
      if(e.state && e.state.screen) _show(e.state.screen); else _show('homeScreen');
    });
  
    // data.jsonを読み込む
    loadExternalData().then(() => {
       try { checkSession(); updateBadges(); _show('homeScreen'); } 
       catch(e) { console.error(e); localStorage.clear(); _show('homeScreen'); }
    });
  });
  
  // JSON読み込み関数
  async function loadExternalData() {
     try {
       const response = await fetch('./data.json');
       if (!response.ok) throw new Error("JSON not found");
       const data = await response.json();
       
       // Vocabデータの展開
       vocabClfData = expandArray(data.vocabClf, 30);
       vocabSaaData = expandArray(data.vocabSaa, 30);
       vocabSapData = expandArray(data.vocabSap, 30);
       
       // シナリオデータの展開
       const baseClf = expandArray(data.baseClf, 100);
       const baseSaa = expandArray(data.baseSaa, 100);
       const baseSap = expandArray(data.baseSap, 100);
       
       // アプリ用にID付与
       clfData = expandData(baseClf, 125, 'clf');
       saaData = expandData(baseSaa, 125, 'saa');
       sapData = expandData(baseSap, 125, 'sap');
       
       // 全データ結合
       allData = [...vocabClfData, ...vocabSaaData, ...vocabSapData, ...clfData, ...saaData, ...sapData];
       
     } catch(e) {
       console.error("Data Load Error:", e);
       alert("データの読み込みに失敗しました。ローカルで開いている場合はGitHub等にアップロードしてください。");
     }
  }
  
  function expandArray(arr, minLength) {
      if (!arr || arr.length === 0) return [];
      let result = [...arr];
      while (result.length < minLength) {
          result.push(...arr); 
      }
      return result; 
  }
  
  function expandData(base, targetCount, prefix) {
    let result = [];
    let count = 0;
    if(!base || base.length === 0) return [];
    while (result.length < targetCount) {
      for (let item of base) {
        if (result.length >= targetCount) break;
        let newId = `${prefix}_${count}`;
        result.push({ ...item, id: newId });
        count++;
      }
    }
    return result;
  }
  
  /* ==========================================
     2. UI & Game Logic
     ========================================== */
  function changeLanguage(val) { 
    currentLang = val; 
    localStorage.setItem('aws_app_lang', val); 
    applyTranslation(); 
    if(document.getElementById('quizScreen').classList.contains('active')) renderQuestion();
  }
  
  function applyTranslation() {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en'];
    document.querySelectorAll('[data-t]').forEach(el => {
      const k = el.getAttribute('data-t');
      if(t[k]) el.innerText = t[k];
    });
    updateBadges();
  }
  
  function getLocalizedText(obj) {
    if (typeof obj === 'string') return obj;
    return obj[currentLang] || obj['en'] || obj['ja'] || "";
  }
  
  function _show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    const timer = document.getElementById('quizTimer');
    if(id === 'quizScreen') {
      document.getElementById('quitBtn').classList.remove('hidden');
      if(appState.mode && appState.mode.includes('exam')) {
        timer.style.display = 'block'; startTimer();
      } else {
        timer.style.display = 'none'; stopTimer();
      }
    } else {
      document.getElementById('quitBtn').classList.add('hidden');
      timer.style.display = 'none'; stopTimer();
    }
    if(id === 'homeScreen') { checkSession(); updateBadges(); }
  }
  function showScreen(id) { window.history.pushState({screen:id}, '', `#${id.replace('Screen','')}`); _show(id); }
  function goHome() { if(window.history.length>1) window.history.back(); else { window.history.replaceState({screen:'homeScreen'},'','#home'); _show('homeScreen'); } }
  
  function startTimer() { stopTimer(); const start = Date.now(); timerInterval = setInterval(() => {
    const d = Math.floor((Date.now()-start)/1000);
    const m = Math.floor(d/60).toString().padStart(2,'0');
    const s = (d%60).toString().padStart(2,'0');
    document.getElementById('quizTimer').innerText = `${m}:${s}`;
  }, 1000); }
  function stopTimer() { if(timerInterval) clearInterval(timerInterval); document.getElementById('quizTimer').innerText = "00:00"; }
  
  function getList(key) { return JSON.parse(localStorage.getItem(key)||'[]'); }
  function addToList(key, id) { const l = getList(key); if(!l.includes(id)) { l.push(id); localStorage.setItem(key, JSON.stringify(l)); } }
  function removeFromList(key, id) { const l = getList(key).filter(i=>i!==id); localStorage.setItem(key, JSON.stringify(l)); }
  function hasInList(key, id) { return getList(key).includes(id); }
  
  function updateBadges() {
    const w = getList(WEAK_KEY).length;
    const b = getList(BK_KEY).length;
    document.getElementById('weakCount').innerText = (currentLang==='ja' ? `残り${w}問` : `${w} left`);
    const wb = document.getElementById('weakBadge');
    if(w>0) { wb.innerText = w; wb.classList.remove('hidden'); } else wb.classList.add('hidden');
    document.getElementById('bkCount').innerText = (currentLang==='ja' ? `${b}問` : `${b} saved`);
    const bb = document.getElementById('bkBadge');
    if(b>0) { bb.innerText = b; bb.classList.remove('hidden'); } else bb.classList.add('hidden');
  }
  
  function toggleBookmark() {
    if(!appState.questions.length) return;
    const q = appState.questions[appState.currentIndex];
    const btn = document.getElementById('btnBookmark');
    if(hasInList(BK_KEY, q.id)) { removeFromList(BK_KEY, q.id); btn.classList.remove('active'); } 
    else { addToList(BK_KEY, q.id); btn.classList.add('active'); }
  }
  
  function startCourse(mode) {
    localStorage.removeItem(SESSION_KEY);
    appState = { mode: mode, questions: [], currentIndex: 0, correctCount: 0, wrongList: [] };
    
    let pool = [];
    if(mode.startsWith('clf')) pool = [...clfData];
    else if(mode.startsWith('saa')) pool = [...saaData];
    else if(mode.startsWith('sap')) pool = [...sapData];
    else if(mode === 'vocab_clf') pool = [...vocabClfData];
    else if(mode === 'vocab_saa') pool = [...vocabSaaData];
    else if(mode === 'vocab_sap') pool = [...vocabSapData];
    else if(mode === 'weakness') {
      const ids = getList(WEAK_KEY);
      if(ids.length===0) { alert("No weakness!"); return; }
      pool = allData.filter(d => ids.includes(d.id));
    }
    else if(mode === 'bookmark') {
      const ids = getList(BK_KEY);
      if(ids.length===0) { alert("No bookmarks!"); return; }
      pool = allData.filter(d => ids.includes(d.id));
    }
  
    if(pool.length === 0) { alert("Data loading..."); return; }
    pool = shuffle(pool);
    
    if(mode.includes('quick')) pool = pool.slice(0, 10);
    if(mode.includes('hard')) pool = pool.slice(0, 30);
    if(mode.includes('saa_quick')) pool = pool.slice(0, 15);
    if(mode.includes('exam')) {
      const limit = mode.includes('sap') ? 75 : 65;
      pool = pool.slice(0, limit);
    }
  
    appState.questions = pool;
    showScreen('quizScreen');
    renderQuestion();
  }
  
  function renderQuestion() {
    if(!appState.questions.length) return;
    const q = appState.questions[appState.currentIndex];
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en'];
    
    document.getElementById('qCount').innerText = `Q.${appState.currentIndex+1} / ${appState.mode.includes('endless') || appState.mode.includes('vocab') ?'∞':appState.questions.length}`;
    document.getElementById('scorePreview').innerText = `${t.score_label}: ${appState.correctCount}`;
    document.getElementById('progressBar').style.width = ((appState.currentIndex+1)/appState.questions.length*100)+'%';
    document.getElementById('qText').innerText = getLocalizedText(q.q);
  
    const bkBtn = document.getElementById('btnBookmark');
    if(hasInList(BK_KEY, q.id)) bkBtn.classList.add('active'); else bkBtn.classList.remove('active');
  
    const b = document.getElementById('levelBadge');
    b.className = 'tag-badge';
    if(appState.mode.includes('clf')) { b.innerText='CLF'; b.classList.add('tag-clf'); }
    else if(appState.mode.includes('sap')) { b.innerText='SAP'; b.classList.add('tag-sap'); }
    else if(appState.mode.includes('vocab')) { b.innerText='Vocab'; b.classList.add('tag-vocab'); }
    else { b.innerText='SAA'; b.classList.add('tag-saa'); }
  
    const area = document.getElementById('optionsArea');
    area.innerHTML = '';
    const aText = getLocalizedText(q.a);
    let opts = [{t:aText, c:true}];
    
    let distractorPool = [];
    if(appState.mode === 'vocab_clf') distractorPool = vocabClfData;
    else if(appState.mode === 'vocab_saa') distractorPool = vocabSaaData;
    else if(appState.mode === 'vocab_sap') distractorPool = vocabSapData;
    else if(appState.mode.includes('clf')) distractorPool = clfData;
    else if(appState.mode.includes('sap')) distractorPool = sapData;
    else distractorPool = saaData;
  
    if(distractorPool.length === 0) distractorPool = appState.questions;
  
    let others = shuffle(distractorPool.filter(d => getLocalizedText(d.a) !== aText));
    const set = new Set([aText]);
    for(let o of others) {
      const txt = getLocalizedText(o.a);
      if(!set.has(txt)) { opts.push({t:txt, c:false}); set.add(txt); if(opts.length >= 4) break; }
    }
    while(opts.length < 4) { opts.push({t:`Option ${opts.length+1}`, c:false}); }
    
    shuffle(opts).forEach((o,i) => {
      const btn = document.createElement('div');
      btn.className = 'option-btn';
      btn.innerHTML = `<span style="font-weight:bold;margin-right:8px;">${String.fromCharCode(65+i)}.</span> ${o.t}`;
      btn.onclick = () => check(btn, o, q);
      area.appendChild(btn);
    });
  
    document.getElementById('feedbackArea').style.display='none';
    document.getElementById('nextBtn').classList.add('hidden');
    document.getElementById('finishBtn').classList.add('hidden');
  }
  
  function check(btn, opt, q) {
    if(document.querySelector('.option-btn.correct') || document.querySelector('.option-btn.wrong')) return;
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en'];
    const fb = document.getElementById('feedbackArea');
    const trueAns = getLocalizedText(q.a);
    
    document.querySelectorAll('.option-btn').forEach(b => {
      if(b.innerText.includes(trueAns)) b.classList.add('correct');
    });
  
    if(opt.c) {
      appState.correctCount++;
      fb.style.background = "#e8f5e9";
      fb.querySelector('.feedback-title').innerText = t.correct;
      fb.querySelector('.feedback-title').style.color = "#2e7d32";
      if(appState.mode === 'weakness') removeFromList(WEAK_KEY, q.id);
    } else {
      btn.classList.add('wrong');
      appState.wrongList.push(q);
      fb.style.background = "#ffebee";
      fb.querySelector('.feedback-title').innerText = t.wrong;
      fb.querySelector('.feedback-title').style.color = "#c62828";
      addToList(WEAK_KEY, q.id);
    }
  
    const point = getLocalizedText(q.t || q.f);
    
    // ▼▼▼ AdSense広告挿入（記事内広告・In-article） ▼▼▼
    document.getElementById('explanationText').innerHTML = `
      <strong>${t.solution}:</strong><br>${trueAns}<br><br>
      <span style="font-size:13px;color:#555;">${t.point}: ${point}</span>
      
      <div style="margin-top:30px; text-align:center; min-height: 250px;">
        <span style="font-size:10px; color:#ccc; display:block; margin-bottom:5px;">SPONSORED</span>
        
        <ins class="adsbygoogle"
             style="display:block; text-align:center;"
             data-ad-layout="in-article"
             data-ad-format="fluid"
             data-ad-client="ca-pub-7804916394997850"
             data-ad-slot="9152404899"></ins>
      </div>
    `;

    // 広告表示トリガー
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
    // ▲▲▲ AdSense終了 ▲▲▲
  
    fb.style.display = 'block';
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    saveSession();
  
    const isLast = appState.currentIndex >= appState.questions.length - 1;
    const isEndless = appState.mode.includes('endless') || appState.mode.includes('vocab') || appState.mode === 'weakness' || appState.mode === 'bookmark';
    
    if(isEndless) {
      document.getElementById('nextBtn').innerText = t.next_btn;
      document.getElementById('nextBtn').classList.remove('hidden');
    } else {
      if(isLast) {
        document.getElementById('finishBtn').innerText = t.finish_btn;
        document.getElementById('finishBtn').classList.remove('hidden');
      } else {
        document.getElementById('nextBtn').innerText = t.next_btn;
        document.getElementById('nextBtn').classList.remove('hidden');
      }
    }
  }
  
  function nextQuestion() {
    appState.currentIndex++;
    const isEndless = appState.mode.includes('endless') || appState.mode.includes('vocab') || appState.mode === 'weakness' || appState.mode === 'bookmark';
    if(isEndless && appState.currentIndex >= appState.questions.length) {
      if(appState.mode === 'weakness') {
        const ids = getList(WEAK_KEY);
        if(ids.length===0) { alert("Congratulations!"); goHome(); return; }
        appState.questions = allData.filter(d=>ids.includes(d.id));
      }
      appState.questions = shuffle(appState.questions);
      appState.currentIndex = 0;
    }
    renderQuestion();
  }
  
  function finishQuiz() {
    stopTimer();
    localStorage.removeItem(SESSION_KEY);
    showScreen('resultScreen');
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en'];
    const score = Math.round((appState.correctCount / (appState.currentIndex+1)) * 100);
    document.getElementById('finalScore').innerText = `${score}%`;
    
    let msg = "Review";
    if(score >= 90) msg = "Perfect!";
    else if(score >= 70) msg = "Good Job!";
    else if(score >= 50) msg = "Passed";
    document.getElementById('resultMsg').innerText = msg;
  
    const list = document.getElementById('reviewList');
    list.innerHTML = '';
    if(appState.wrongList.length === 0) {
      list.innerHTML = `<div style="padding:20px;text-align:center;color:#2e7d32;">Perfect!</div>`;
    } else {
      appState.wrongList.forEach(q => {
        const d = document.createElement('div');
        d.className = 'review-item';
        const qt = getLocalizedText(q.q);
        const at = getLocalizedText(q.a);
        d.innerHTML = `<span class="review-q">Q. ${qt}</span><span class="review-a">✅ ${at}</span>`;
        list.appendChild(d);
      });
    }
  }
  
  function saveSession() { localStorage.setItem(SESSION_KEY, JSON.stringify(appState)); }
  function checkSession() {
    try {
      const d = localStorage.getItem(SESSION_KEY);
      const area = document.getElementById('resumeArea');
      if(d) {
        const s = JSON.parse(d);
        area.innerHTML = `🔄 Resume (Q.${s.currentIndex+1})`;
        area.classList.remove('hidden');
      } else area.classList.add('hidden');
    } catch(e) { localStorage.clear(); }
  }
  function resumeGame() {
    const d = localStorage.getItem(SESSION_KEY);
    if(d) { appState = JSON.parse(d); showScreen('quizScreen'); renderQuestion(); }
  }
  function shuffle(a) { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
