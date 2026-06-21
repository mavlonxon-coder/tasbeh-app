// app.js v4.0 - 26 funksiya
(function() {
    "use strict";
  
    const APP_VERSION = "4.0.0";
    const DEFAULT_ZIKR = ["SubhanAllah", "Alhamdulillah", "Allohu Akbar", "La ilaha illAllah", "Astag'firulloh"];
    const TARGETS = [33, 100, 500, 1000, 5000];
  
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
      favorites: [],
      undoStack: [],
      sessionTarget: null,
      dailyLimit: null
    };
  
    let currentZikrIndex = 0;
    let isLightMode = false;
  
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
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.08);
      } catch(e) {}
    }
  
    function playHaptic() {
      if (!state.vibrateEnabled || !navigator.vibrate) return;
      const intensity = state.hapticIntensity / 100 * 40;
      navigator.vibrate(Math.max(8, intensity));
    }
  
    function updateUI() {
      countEl.innerText = state.count;
      
      const target = TARGETS[state.targetIndex];
      const progress = Math.min((state.count % target) / target * 100, 100);
      const circumference = 427.26;
      const offset = circumference - (progress / 100) * circumference;
      ringProgress.style.strokeDashoffset = offset;
      
      bar.style.width = progress + '%';
      streakSpan.innerText = state.streak;
      totalCountEl.innerText = state.totalCount;
      sessionCountEl.innerText = state.sessionCount;
      targetDisplay.innerText = target;
      goalProgress.innerText = Math.round(progress) + '%';
      
      const today = new Date().toDateString();
      const todayHistory = state.history.filter(h => h.date === today);
      const todayTotal = todayHistory.reduce((sum, h) => sum + h.count, 0);
      todayCount.innerText = todayTotal + state.count;
      
      if (state.dailyLimit && todayTotal + state.count >= state.dailyLimit) {
        setTimeout(() => {
          alert(`✅ Kunlik limit (${state.dailyLimit}) ga yetdingiz!`);
        }, 300);
      }
      
      localStorage.setItem('elektron_tasbeh', JSON.stringify(state));
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
        
        if (state.count > 0) {
          state.history.push({
            date: today,
            count: state.count,
            total: state.totalCount
          });
          if (state.history.length > 90) state.history.shift();
        }
        
        state.sessionCount = 0;
      }
      if (state.streak < 1) state.streak = 1;
      updateUI();
    }
  
    function addZikr() {
      state.count += 1;
      state.totalCount += 1;
      state.sessionCount += 1;
      state.undoStack.push(state.count - 1);
      if (state.undoStack.length > 50) state.undoStack.shift();
      
      playSound();
      playHaptic();
      
      countEl.style.transform = 'scale(1.2)';
      setTimeout(() => { countEl.style.transform = 'scale(1)'; }, 120);
      
      const target = TARGETS[state.targetIndex];
      if (state.count % target === 0 && state.count > 0) {
        setTimeout(() => {
          alert(`🎉 Tabriklaymiz! ${target} ta zikrga yetdingiz!`);
        }, 300);
      }
      
      if (state.sessionTarget && state.sessionCount >= state.sessionTarget) {
        setTimeout(() => {
          alert(`🎯 Sessiya maqsadi (${state.sessionTarget}) ga yetdingiz!`);
          state.sessionTarget = null;
        }, 400);
      }
      
      checkStreak();
      updateUI();
    }
  
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
  
    function changeTarget() {
      state.targetIndex = (state.targetIndex + 1) % TARGETS.length;
      updateUI();
      playHaptic();
      alert(`🎯 Yangi maqsad: ${TARGETS[state.targetIndex]}`);
    }
  
    function changeZikr(index) {
      currentZikrIndex = index;
      zikrChips.forEach((chip, i) => {
        chip.classList.toggle('active', i === index);
      });
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
      const chip = document.createElement('div');
      chip.className = 'zikr-chip';
      chip.dataset.zikr = state.zikrList.length - 1;
      chip.textContent = name;
      chip.addEventListener('click', () => changeZikr(parseInt(chip.dataset.zikr)));
      document.querySelector('.zikr-selection').insertBefore(chip, document.querySelector('.zikr-chip:last-child'));
      updateUI();
      alert(`✅ "${name}" qo'shildi!`);
    }
  
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
        ${state.history.length > 30 ? `<p style="color:var(--text-secondary);font-size:11px;margin-top:6px;">Oxirgi 30 kun ko'rsatilmoqda</p>` : ''}
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
        
        <div style="margin:10px 0;">
          <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border);">
            <span>📊 Bugungi zikr</span>
            <span style="font-weight:700;">${todayCount.innerText}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border);">
            <span>🔥 Streak</span>
            <span style="font-weight:700;">${state.streak} kun</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border);">
            <span>📈 Jami zikr</span>
            <span style="font-weight:700;">${state.totalCount}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;">
            <span>🎯 Haftalik o'rtacha</span>
            <span style="font-weight:700;">${weekData.length ? Math.round(weekData.reduce((s, h) => s + h.count, 0) / weekData.length) : 0}</span>
          </div>
        </div>
        
        <div class="chart-container" id="chartContainer">
          ${weekData.map(h => `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
              <div class="chart-bar" style="height:${(h.count / maxCount) * 70 + 8}px;"></div>
              <div class="chart-label">${new Date(h.date).toLocaleDateString('uz', {weekday:'short'})}</div>
            </div>
          `).join('')}
        </div>
      `;
      modal.classList.add('show');
    }
  
    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  
    function toggleTheme() {
      isLightMode = !isLightMode;
      document.body.classList.toggle('light-mode', isLightMode);
      themeToggle.checked = isLightMode;
      localStorage.setItem('tasbeh_theme', isLightMode ? 'light' : 'dark');
    }
  
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
  
    function closeAllModals() {
      [modal, zikrModal, editModal, settingsModal].forEach(m => m.classList.remove('show'));
    }
  
    function init() {
      const savedTheme = localStorage.getItem('tasbeh_theme');
      if (savedTheme === 'light') {
        isLightMode = true;
        document.body.classList.add('light-mode');
        themeToggle.checked = true;
      }
      
      soundToggle.checked = state.soundEnabled;
      vibrateToggle.checked = state.vibrateEnabled;
      hapticIntensity.value = state.hapticIntensity;
      
      zikrChips.forEach((chip, i) => {
        if (i < state.zikrList.length) {
          chip.textContent = state.zikrList[i];
          chip.dataset.zikr = i;
        }
      });
      
      checkStreak();
      updateUI();
      
      mainBtn.addEventListener('click', addZikr);
      undoBtn.addEventListener('click', undoAction);
      resetBtn.addEventListener('click', resetCount);
      targetBtn.addEventListener('click', changeTarget);
      historyBtn.addEventListener('click', showHistory);
      statsBtn.addEventListener('click', showStatistics);
      settingsBtn.addEventListener('click', () => settingsModal.classList.add('show'));
      fullscreenBtn.addEventListener('click', toggleFullscreen);
      
      countEl.addEventListener('dblclick', editCount);
      
      zikrChips.forEach((chip, i) => {
        chip.addEventListener('click', () => {
          if (i === zikrChips.length - 1) {
            showAddZikrModal();
          } else {
            changeZikr(i);
          }
        });
      });
      
      [modalClose, zikrModalClose, editModalClose, settingsModalClose].forEach(btn => {
        btn.addEventListener('click', closeAllModals);
      });
      
      [modal, zikrModal, editModal, settingsModal].forEach(m => {
        m.addEventListener('click', (e) => {
          if (e.target === m) closeAllModals();
        });
      });
      
      addZikrBtn.addEventListener('click', addCustomZikr);
      newZikrInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addCustomZikr();
      });
      
      saveEditBtn.addEventListener('click', saveEditCount);
      editCountInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveEditCount();
      });
      
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
      
      exportDataBtn.addEventListener('click', exportData);
      importDataBtn.addEventListener('click', importData);
      importDataInput.addEventListener('change', handleImport);
      
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
      
      document.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Space') {
          e.preventDefault();
          if (!modal.classList.contains('show') && !settingsModal.classList.contains('show')) {
            addZikr();
          }
        }
        if (e.key === 'Escape') closeAllModals();
        if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          undoAction();
        }
        if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          resetCount();
        }
      });
      
      console.log(`📿 Elektron Tasbeh v${APP_VERSION} — Zikr bilan qalbni tinchlantir`);
    }
  
    init();
  })();