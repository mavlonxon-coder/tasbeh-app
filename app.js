// app.js
(function() {
    "use strict";
  
    const ZIKR_LIST = ["SubhanAllah", "Alhamdulillah", "Allohu Akbar", "La ilaha illAllah"];
    let currentZikrIndex = 0;
  
    let state = JSON.parse(localStorage.getItem("tasbeh_ultra")) || {
      count: 0,
      lastDate: new Date().toDateString(),
      streak: 1
    };
  
    const countEl = document.getElementById('countDisplay');
    const zikrEl = document.getElementById('zikrDisplay');
    const bar = document.getElementById('progressBar');
    const streakSpan = document.getElementById('streakCount');
    const mainBtn = document.getElementById('mainBtn');
    const changeBtn = document.getElementById('changeZikrBtn');
    const resetBtn = document.getElementById('resetBtn');
  
    function updateUI() {
      countEl.innerText = state.count;
      const progress = state.count % 100;
      bar.style.width = progress + '%';
      streakSpan.innerText = state.streak;
      localStorage.setItem('tasbeh_ultra', JSON.stringify(state));
    }
  
    function checkStreak() {
      const today = new Date().toDateString();
      if (state.lastDate !== today) {
        const diffTime = new Date(today) - new Date(state.lastDate);
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (diffDays === 1) {
          state.streak += 1;
        } else if (diffDays > 1) {
          state.streak = 1;
        }
        state.lastDate = today;
      }
      if (state.streak < 1) state.streak = 1;
      updateUI();
    }
  
    function addZikr() {
      state.count += 1;
      if (navigator.vibrate) navigator.vibrate(30);
      countEl.style.transform = 'scale(1.2)';
      setTimeout(() => { countEl.style.transform = 'scale(1)'; }, 120);
  
      const today = new Date().toDateString();
      if (state.lastDate !== today) {
        const diffTime = new Date(today) - new Date(state.lastDate);
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (diffDays === 1) {
          state.streak += 1;
        } else if (diffDays > 1) {
          state.streak = 1;
        }
        state.lastDate = today;
      }
      updateUI();
    }
  
    function changeZikr() {
      currentZikrIndex = (currentZikrIndex + 1) % ZIKR_LIST.length;
      zikrEl.innerText = ZIKR_LIST[currentZikrIndex];
      if (navigator.vibrate) navigator.vibrate(10);
    }
  
    function resetCount() {
      if (state.count === 0) return;
      state.count = 0;
      updateUI();
      if (navigator.vibrate) navigator.vibrate(20);
      countEl.style.transform = 'scale(0.9)';
      setTimeout(() => { countEl.style.transform = 'scale(1)'; }, 150);
    }
  
    function init() {
      zikrEl.innerText = ZIKR_LIST[currentZikrIndex];
      checkStreak();
      updateUI();
  
      mainBtn.addEventListener('click', addZikr);
      changeBtn.addEventListener('click', changeZikr);
      resetBtn.addEventListener('click', resetCount);
  
      document.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Space') {
          e.preventDefault();
          addZikr();
        }
      });
  
      let lastTap = 0;
      mainBtn.addEventListener('touchstart', (e) => {
        const now = Date.now();
        if (now - lastTap < 300) e.preventDefault();
        lastTap = now;
      }, { passive: false });
  
      console.log('Tasbeh Ultra Elite · UzGlobal 2026');
    }
  
    init();
  })();