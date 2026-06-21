// app.js v4.0 - 26 funksiya
(function() {
    "use strict";
  
    // ===== KONFIGURATSIYA =====
    const APP_VERSION = "4.0.0";
    const DEFAULT_ZIKR = ["SubhanAllah", "Alhamdulillah", "Allohu Akbar", "La ilaha illAllah", "Astag'firulloh"];
    const TARGETS = [33, 100, 500, 1000, 5000];
  
    // ===== STATE =====
    let state = JSON.parse(localStorage.getItem("elektron_tasbeh")) || {
      count: 0,
      totalCount: 0,
      sessionCount: 0,
      lastDate: new Date().toDateString(),
      streak: 1,
      targetIndex: 1,
      theme: 'default',
      soundEnabled: true,
      vibrateEnabled: true,
      hapticIntensity: 50,
      zikrList: [...DEFAULT_ZIKR],
      history: [],
      dailyHistory: {},
      favorites: [],
      undoStack: [],
      sessionTarget: null,
      dailyLimit: null
    };
  
    let currentZikrIndex = 0;
    let isLightMode = false;
  
    // ===== DOM =====
    const countEl = document.getElementById('countDisplay');
    const ringProgress = document.getElementById('ringProgress');
    const bar = document.getElementById('progressBar');
    const streakSpan = document.getElementById('streakCount');
    const todayCount = document.getElementById('todayCount');
    const totalCountEl = document.getElementById('totalCount');
    const sessionCountEl = document.getElementById('sessionCount');
    const targetDisplay = document.getElementById('targetDisplay');
    const goalProgress = document.getElementById('goalProgress');
    
    const mainBtn = document.getElementById('mainBtn');
    const undoBtn = document.getElementById('undoBtn');
    const resetBtn = document.getElementById('resetBtn');
    const targetBtn = document.getElementById('targetBtn');
    const historyBtn = document.getElementById('historyBtn');
    const statsBtn = document.getElementById('statsBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    
    const zikrModal = document.getElementById('zikrModal');
    const zikrModalClose = document.getElementById('zikrModalClose');
    const newZikrInput = document.getElementById('newZikrInput');
    const addZikrBtn = document.getElementById('addZikrBtn');
    
    const editModal = document.getElementById('editModal');
    const editModalClose = document.getElementById('editModalClose');
    const editCountInput = document.getElementById('editCountInput');
    const saveEditBtn = document.getElementById('saveEditBtn');
    
    const settingsModal = document.getElementById('settingsModal');
    const settingsModalClose = document.getElementById('settingsModalClose');
    const themeToggle = document.getElementById('themeToggle');
    const soundToggle = document.getElementById('soundToggle');
    const vibrateToggle = document.getElementById('vibrateToggle');
    const hapticIntensity = document.getElementById('hapticIntensity');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    const importDataInput = document.getElementById('importDataInput');
    
    const zikrChips = document.querySelectorAll('.zikr-chip');
    const colorOptions = document.querySelectorAll('.color-option');
  
    // ===== 1. AUDIO SYSTEM =====
    let audioCtx = null;
    
    function playSound() {
      if (!state.soundEnabled) return;
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 1200;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.1);
      } catch(e) { /* silent fail */ }
    }
  
    // ===== 2. VIBRATION =====
    function playHaptic() {
      if (!state.vibrateEnabled || !navigator.vibrate) return;
      const intensity = state.hapticIntensity / 100 * 50;
      navigator.vibrate(Math.max(10, intensity));
    }
  
    // ===== 3. SCREEN FLASH =====
    function screenFlash() {
      const flash = document.createElement('div');
      flash.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 200, 150, 0.05);
        z-index: 999;
        pointer-events: none;
        animation: flashFade 0.15s ease-out forwards;
      `;
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 200);
    }
  
    // Add flash animation
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes flashFade {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(styleSheet);
  
    // ===== 4. UPDATE UI =====
    function updateUI() {
      // Counter
      countEl.innerText = state.count;
      
      // Progress ring
      const target = TARGETS[state.targetIndex];
      const progress = Math.min((state.count % target) / target * 100, 100);
      const circumference = 534.07;
      const offset = circumference - (progress / 100) * circumference;
      ringProgress.style.strokeDashoffset = offset;
      
      // Progress bar
      bar.style.width = progress + '%';
      
      // Stats
      streakSpan.innerText = state.streak;
      totalCountEl.innerText = state.totalCount;
      sessionCountEl.innerText = state.sessionCount;
      targetDisplay.innerText = target;
      goalProgress.innerText = Math.round(progress) + '%';
      
      // Today count
      const today = new Date().toDateString();
      const todayHistory = state.history.filter(h => h.date === today);
      const todayTotal = todayHistory.reduce((sum, h) => sum + h.count, 0);
      todayCount.innerText = todayTotal + state.count;
      
      // Check daily limit
      if (state.dailyLimit && todayTotal + state.count >= state.dailyLimit) {
        setTimeout(() => {
          alert(`✅ Kunlik limit (${state.dailyLimit}) ga yetdingiz!`);
        }, 300);
      }
      
      localStorage.setItem('elektron_tasbeh', JSON.stringify(state));
    }
  
    // ===== 5. STREAK CHECK =====
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
        
        // Save daily history
        if (state.count > 0) {
          state.history.push({
            date: today,
            count: state.count,
            total: state.totalCount
          });
          if (state.history.length > 90) state.history.shift();
        }
        
        // Reset session count for new day
        state.sessionCount = 0;
      }
      if (state.streak < 1) state.streak = 1;
      updateUI();
    }
  
    // ===== 6. ADD ZIKR =====
    function addZikr() {
      state.count += 1;
      state.totalCount += 1;
      state.sessionCount += 1;
      state.undoStack.push(state.count - 1);
      if (state.undoStack.length > 50) state.undoStack.shift();
      
      // Feedback
      playSound();
      playHaptic();
      screenFlash();
      
      // Animation
      countEl.style.transform = 'scale(1.2)';
      setTimeout(() => { countEl.style.transform = 'scale(1)'; }, 120);
      
      // Check target
      const target = TARGETS[state.targetIndex];
      if (state.count % target === 0 && state.count > 0) {
        setTimeout(() => {
          alert(`🎉 Tabriklaymiz! ${target} ta zikrga yetdingiz!`);
        }, 300);
      }
      
      // Check session target
      if (state.sessionTarget && state.sessionCount >= state.sessionTarget) {
        setTimeout(() => {
          alert(`🎯 Sessiya maqsadi (${state.sessionTarget}) ga yetdingiz!`);
          state.sessionTarget = null;
        }, 400);
      }
      
      checkStreak();
      updateUI();
    }
  
    // ===== 7. UNDO =====
    function undoAction() {
      if (state.undoStack.length === 0) {
        alert('Orqaga qaytarish uchun hech narsa yo\'q');
        return;
      }
      const lastCount = state.undoStack.pop();
      const diff = state.count - lastCount;
      state.count = lastCount;
      state.totalCount -= diff;
      state.sessionCount -= diff;
      playHaptic();
      updateUI();
    }
  
    // ===== 8. RESET =====
    function resetCount() {
      if (state.count === 0) return;
      if (!confirm('Barcha zikrlarni qayta tiklamoqchimisiz?')) return;
      state.count = 0;
      state.undoStack = [];
      updateUI();
      playHaptic();
      countEl.style.transform = 'scale(0.9)';
      setTimeout(() => { countEl.style.transform = 'scale(1)'; }, 150);
    }
  
    // ===== 9. MANUAL EDIT =====
    function editCount() {
      editCountInput.value = state.count;
      editModal.classList.add('show');
    }
  
    function saveEditCount() {
      const newCount = parseInt(editCountInput.value);
      if (isNaN(newCount) || newCount < 0) {
        alert('Iltimos, to\'g\'ri raqam kiriting');
        return;
      }
      const diff = newCount - state.count;
      state.count = newCount;
      state.totalCount += diff;
      state.sessionCount += diff;
      editModal.classList.remove('show');
      updateUI();
    }
  
    // ===== 10. CHANGE TARGET =====
    function changeTarget() {
      state.targetIndex = (state.targetIndex + 1) % TARGETS.length;
      updateUI();
      playHaptic();
      alert(`🎯 Yangi maqsad: ${TARGETS[state.targetIndex]}`);
    }
  
    // ===== 11-12. ZIKR MANAGEMENT =====
    function changeZikr(index) {
      currentZikrIndex = index;
      zikrChips.forEach((chip, i) => {
        chip.classList.toggle('active', i === index);
      });
      // Update display - we show zikr name somewhere
      playHaptic();
    }
  
    function showAddZikrModal() {
      zikrModal.classList.add('show');
      newZikrInput.value = '';
      newZikrInput.focus();
    }
  
    function addCustomZikr() {
      const name = newZikrInput.value.trim();
      if (!name) {
        alert('Iltimos, zikr nomini kiriting');
        return;
      }
      if (state.zikrList.includes(name)) {
        alert('Bu zikr allaqachon mavjud');
        return;
      }
      state.zikrList.push(name);
      zikrModal.classList.remove('show');
      // Add new chip
      const chip = document.createElement('div');
      chip.className = 'zikr-chip';
      chip.dataset.zikr = state.zikrList.length - 1;
      chip.textContent = name;
      chip.addEventListener('click', () => changeZikr(parseInt(chip.dataset.zikr)));
      document.querySelector('.zikr-selection').insertBefore(chip, document.querySelector('.zikr-chip:last-child'));
      updateUI();
      alert(`✅ "${name}" qo'shildi!`);
    }
  
    // ===== 13. FAVORITES =====
    function toggleFavorite() {
      const currentZikr = state.zikrList[currentZikrIndex];
      const index = state.favorites.indexOf(currentZikr);
      if (index > -1) {
        state.favorites.splice(index, 1);
      } else {
        state.favorites.push(currentZikr);
      }
      updateUI();
      playHaptic();
    }
  
    // ===== 14. AUTO CYCLE (33-33-34) =====
    let autoCycleInterval = null;
    
    function toggleAutoCycle() {
      if (autoCycleInterval) {
        clearInterval(autoCycleInterval);
        autoCycleInterval = null;
        alert('⏸ Avto zikr to\'xtatildi');
        return;
      }
      
      const targets = [33, 33, 34];
      let cycleIndex = 0;
      let currentCount = state.count;
      
      autoCycleInterval = setInterval(() => {
        addZikr();
        const target = targets[cycleIndex % targets.length];
        if ((state.count - currentCount) % target === 0 && state.count > currentCount) {
          cycleIndex++;
          playSound();
          if (navigator.vibrate) navigator.vibrate(100);
          alert(`🔄 ${target} ta zikr tugadi!`);
        }
      }, 1000);
      
      alert('▶ Avto zikr boshlandi (33-33-34)');
    }
  
    // ===== 15. SESSION GOAL =====
    function setSessionGoal() {
      const goal = prompt('Sessiya maqsadini kiriting (raqam):');
      if (goal === null) return;
      const num = parseInt(goal);
      if (isNaN(num) || num < 1) {
        alert('Iltimos, to\'g\'ri raqam kiriting');
        return;
      }
      state.sessionTarget = num;
      updateUI();
      alert(`🎯 Sessiya maqsadi: ${num} ta zikr`);
    }
  
    // ===== 16. DAILY LIMIT =====
    function setDailyLimit() {
      const limit = prompt('Kunlik limitni kiriting (raqam):');
      if (limit === null) return;
      const num = parseInt(limit);
      if (isNaN(num) || num < 1) {
        alert('Iltimos, to\'g\'ri raqam kiriting');
        return;
      }
      state.dailyLimit = num;
      updateUI();
      alert(`📅 Kunlik limit: ${num} ta zikr`);
    }
  
    // ===== 17-18. STATISTICS =====
    function showHistory() {
      const historyHTML = state.history.length === 0 ? 
        '<p style="color:var(--text-secondary);">Hali tarix mavjud emas</p>' :
        state.history.slice().reverse().slice(0, 30).map(h => `
          <div class="history-item">
            <span class="date">${h.date}</span>
            <span class="count">${h.count} ta</span>
          </div>
        `).join('');
      
      modalBody.innerHTML = `
        <h2>📊 Zikr Tarixi</h2>
        ${historyHTML}
        ${state.history.length > 30 ? `<p style="color:var(--text-secondary);font-size:12px;margin-top:8px;">Oxirgi 30 kun ko'rsatilmoqda</p>` : ''}
      `;
      modal.classList.add('show');
    }
  
    function showStatistics() {
      const today = new Date().toDateString();
      const weekData = state.history.filter(h => {
        const date = new Date(h.date);
        const now = new Date();
        const diff = (now - date) / (1000 * 60 * 60 * 24);
        return diff <= 7;
      });
      
      const maxCount = Math.max(1, ...weekData.map(h => h.count));
      
      modalBody.innerHTML = `
        <h2>📈 Statistika</h2>
        
        <div style="margin: 12px 0;">
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-color);">
            <span>📊 Bugungi zikr</span>
            <span style="color:#00C896;font-weight:700;">${todayCount.innerText}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-color);">
            <span>🔥 Streak</span>
            <span style="color:#00C896;font-weight:700;">${state.streak} kun</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-color);">
            <span>📈 Jami zikr</span>
            <span style="color:#00C896;font-weight:700;">${state.totalCount}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-color);">
            <span>🎯 Haftalik o'rtacha</span>
            <span style="color:#00C896;font-weight:700;">${weekData.length ? Math.round(weekData.reduce((s, h) => s + h.count, 0) / weekData.length) : 0}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;">
            <span>⭐ Sevimli zikr</span>
            <span style="color:#00C896;font-weight:700;">${state.favorites.length || 'Yo\'q'}</span>
          </div>
        </div>
        
        <div class="chart-container" id="chartContainer">
          ${weekData.map(h => `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
              <div class="chart-bar" style="height:${(h.count / maxCount) * 80 + 10}px;"></div>
              <div class="chart-label">${new Date(h.date).toLocaleDateString('uz', {weekday:'short'})}</div>
            </div>
          `).join('')}
        </div>
      `;
      modal.classList.add('show');
    }
  
    // ===== 19. FULLSCREEN =====
    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  
    // ===== 20-21. THEME =====
    function toggleTheme() {
      isLightMode = !isLightMode;
      document.body.classList.toggle('light-mode', isLightMode);
      themeToggle.checked = isLightMode;
      localStorage.setItem('tasbeh_theme', isLightMode ? 'light' : 'dark');
    }
  
    function changeColor(color) {
      state.theme = color;
      colorOptions.forEach(opt => opt.classList.toggle('active', opt.dataset.color === color));
      
      const colors = {
        default: '#00C896',
        blue: '#3b82f6',
        purple: '#a855f7',
        gold: '#D4AF37',
        pink: '#ec4899'
      };
      
      const accent = colors[color] || '#00C896';
      document.documentElement.style.setProperty('--accent', accent);
      document.documentElement.style.setProperty('--accent-glow', accent + '40');
      ringProgress.style.stroke = accent;
      countEl.style.color = accent;
      
      localStorage.setItem('tasbeh_ultra_v3', JSON.stringify(state));
    }
  
    // ===== 22. EXPORT/IMPORT =====
    function exportData() {
      const data = {
        version: APP_VERSION,
        exportDate: new Date().toISOString(),
        state: state,
        zikrList: state.zikrList
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasbeh_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  
    function importData() {
      importDataInput.click();
    }
  
    function handleImport(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);
          if (data.state) {
            state = data.state;
            state.zikrList = data.zikrList || DEFAULT_ZIKR;
            localStorage.setItem('elektron_tasbeh', JSON.stringify(state));
            updateUI();
            alert('✅ Ma\'lumotlar muvaffaqiyatli yuklandi!');
            location.reload();
          } else {
            alert('❌ Noto\'g\'ri fayl formati');
          }
        } catch(err) {
          alert('❌ Xatolik yuz berdi: ' + err.message);
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }
  
    // ===== 23. PARTICLES BACKGROUND =====
    function createParticles() {
      const container = document.getElementById('particles');
      for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (20 + Math.random() * 30) + 's';
        particle.style.animationDelay = (Math.random() * 20) + 's';
        particle.style.width = (2 + Math.random() * 3) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
      }
    }
  
    // ===== 24. KEYBOARD SHORTCUTS =====
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        if (!modal.classList.contains('show') && !settingsModal.classList.contains('show')) {
          addZikr();
        }
      }
      if (e.key === 'Escape') {
        closeAllModals();
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undoAction();
      }
      if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        resetCount();
      }
    });
  
    // ===== 25. CLOSE MODALS =====
    function closeAllModals() {
      [modal, zikrModal, editModal, settingsModal].forEach(m => m.classList.remove('show'));
    }
  
    // ===== 26. INIT =====
    function init() {
      // Load saved theme
      const savedTheme = localStorage.getItem('tasbeh_theme');
      if (savedTheme === 'light') {
        isLightMode = true;
        document.body.classList.add('light-mode');
        themeToggle.checked = true;
      }
      
      // Load color theme
      if (state.theme && state.theme !== 'default') {
        changeColor(state.theme);
      }
      
      // Load sound/vibration state
      soundToggle.checked = state.soundEnabled;
      vibrateToggle.checked = state.vibrateEnabled;
      hapticIntensity.value = state.hapticIntensity;
      
      // Update zikr chips
      zikrChips.forEach((chip, i) => {
        if (i < state.zikrList.length) {
          chip.textContent = state.zikrList[i];
          chip.dataset.zikr = i;
        }
      });
      
      // Check streak and update
      checkStreak();
      updateUI();
      
      // Create particles
      createParticles();
      
      // Event listeners
      mainBtn.addEventListener('click', addZikr);
      undoBtn.addEventListener('click', undoAction);
      resetBtn.addEventListener('click', resetCount);
      targetBtn.addEventListener('click', changeTarget);
      historyBtn.addEventListener('click', showHistory);
      statsBtn.addEventListener('click', showStatistics);
      settingsBtn.addEventListener('click', () => settingsModal.classList.add('show'));
      fullscreenBtn.addEventListener('click', toggleFullscreen);
      
      // Double-click on count for edit
      countEl.addEventListener('dblclick', editCount);
      
      // Zikr chips
      zikrChips.forEach((chip, i) => {
        chip.addEventListener('click', () => {
          if (i === zikrChips.length - 1) {
            showAddZikrModal();
          } else {
            changeZikr(i);
          }
        });
      });
      
      // Modals close
      [modalClose, zikrModalClose, editModalClose, settingsModalClose].forEach(btn => {
        btn.addEventListener('click', closeAllModals);
      });
      
      [modal, zikrModal, editModal, settingsModal].forEach(m => {
        m.addEventListener('click', (e) => {
          if (e.target === m) closeAllModals();
        });
      });
      
      // Zikr add
      addZikrBtn.addEventListener('click', addCustomZikr);
      newZikrInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addCustomZikr();
      });
      
      // Edit save
      saveEditBtn.addEventListener('click', saveEditCount);
      editCountInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveEditCount();
      });
      
      // Settings
      themeToggle.addEventListener('change', toggleTheme);
      soundToggle.addEventListener('change', () => {
        state.soundEnabled = soundToggle.checked;
        localStorage.setItem('elektron_tasbeh', JSON.stringify(state));
      });
      vibrateToggle.addEventListener('change', () => {
        state.vibrateEnabled = vibrateToggle.checked;
        localStorage.setItem('elektron_tasbeh', JSON.stringify(state));
      });
      hapticIntensity.addEventListener('input', (e) => {
        state.hapticIntensity = parseInt(e.target.value);
        localStorage.setItem('elektron_tasbeh', JSON.stringify(state));
        if (state.vibrateEnabled) navigator.vibrate(20);
      });
      
      colorOptions.forEach(opt => {
        opt.addEventListener('click', () => changeColor(opt.dataset.color));
      });
      
      exportDataBtn.addEventListener('click', exportData);
      importDataBtn.addEventListener('click', importData);
      importDataInput.addEventListener('change', handleImport);
      
      // Auto cycle on long press main button
      let longPressTimer = null;
      mainBtn.addEventListener('touchstart', () => {
        longPressTimer = setTimeout(toggleAutoCycle, 1500);
      });
      mainBtn.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
      });
      mainBtn.addEventListener('touchmove', () => {
        clearTimeout(longPressTimer);
      });
      
      console.log(`📿 Elektron Tasbeh v${APP_VERSION} — 26 funksiya`);
      console.log('🔹 Zikr bilan qalbni tinchlantir');
    }
  
    // ===== START =====
    init();
  })();