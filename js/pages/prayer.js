(() => {
    // 1. Premium Timer State
    let targetMinutes = 20;
    let totalSeconds = targetMinutes * 60;
    let elapsedSeconds = 0; // Stopwatch style: count from 0
    let cumulativeSeconds = 0; // Daily accumulation
    let timerId = null;
    let wakeLock = null;
    const CIRCLE_CIRCUMFERENCE = 283;

    // Find elements
    const prayerDisplay = document.getElementById('prayer-time');
    const statusLabel = document.getElementById('timer-status');
    const toggleBtnText = document.getElementById('btn-toggle-text');
    const svgCircle = document.getElementById('timer-svg-progress');
    const cumulativeLabel = document.getElementById('cumulative-prayer-label');

    // Architecture Fix: Move modal to layout container
    const initModal = () => {
        const modal = document.getElementById('prayer-modal');
        const root = document.getElementById('modal-root');
        if (modal && root) {
            root.appendChild(modal);
        }
    };

    // Wake Lock handling
    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
            }
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    };

    const releaseWakeLock = () => {
        if (wakeLock) {
            wakeLock.release().then(() => { wakeLock = null; });
        }
    };

    // Load cumulative time from storage
    const loadCumulativeTime = () => {
        const userId = window.Auth.getCurrentUserId();
        const taskKey = userId ? `${window.CONFIG.STORAGE_KEYS.TASK_STATE_PREFIX}${userId}` : 'gw_task_state';
        const taskState = window.Utils.getStorageItem(taskKey, []);
        const todayStr = window.Utils.getTodayISO();
        const dayStatus = taskState.find(s => s.date.split('T')[0] === todayStr);
        cumulativeSeconds = dayStatus ? (dayStatus.prayerDuration || 0) * 60 : 0;
    };

    // 3. UI Update Logic (Stopwatch Format: HH:MM:SS)
    const updateTimerUI = () => {
        if (!prayerDisplay) return;

        const hrs = Math.floor(elapsedSeconds / 3600);
        const mins = Math.floor((elapsedSeconds % 3600) / 60);
        const secs = elapsedSeconds % 60;

        let display = "";
        if (hrs > 0) {
            display += hrs.toString().padStart(2, '0') + ":";
        }
        display += mins.toString().padStart(2, '0') + ":" + secs.toString().padStart(2, '0');
        prayerDisplay.innerText = display;

        // Circle progress based on target goal
        if (svgCircle) {
            const progressRatio = Math.min(elapsedSeconds / totalSeconds, 1);
            const offset = CIRCLE_CIRCUMFERENCE - (progressRatio * CIRCLE_CIRCUMFERENCE);
            svgCircle.style.strokeDashoffset = offset;
        }
    };

    const persistCumulativeTime = () => {
        const userId = window.Auth.getCurrentUserId();
        const taskKey = userId ? `${window.CONFIG.STORAGE_KEYS.TASK_STATE_PREFIX}${userId}` : 'gw_task_state';
        const taskState = window.Utils.getStorageItem(taskKey, []);
        const todayStr = window.Utils.getTodayISO();
        let dayStatus = taskState.find(s => s.date.split('T')[0] === todayStr);

        const totalDurationMins = Math.floor((cumulativeSeconds + elapsedSeconds) / 60);

        if (!dayStatus) {
            dayStatus = { date: todayStr, prayer: totalDurationMins >= 1, qt: false, bible: false, prayerDuration: totalDurationMins };
            taskState.push(dayStatus);
        } else {
            dayStatus.prayerDuration = Math.max(dayStatus.prayerDuration, totalDurationMins);
            if (totalDurationMins >= targetMinutes) dayStatus.prayer = true;
        }
        window.Utils.setStorageItem(taskKey, taskState);
    };

    window.setTimerDuration = (mins) => {
        if (timerId) return; // Prevent change during run
        targetMinutes = mins;
        totalSeconds = targetMinutes * 60;
        elapsedSeconds = 0; // Reset for new goal
        document.querySelectorAll('.duration-btn').forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.min) === mins));
        updateTimerUI();
    };

    const prayerBtn = document.getElementById('btn-prayer-toggle');
    if (prayerBtn) {
        prayerBtn.onclick = () => {
            if (timerId) {
                // Pause
                clearInterval(timerId);
                timerId = null;
                releaseWakeLock();
                persistCumulativeTime();
                if (toggleBtnText) toggleBtnText.innerText = '다시 시작';
                if (statusLabel) {
                    statusLabel.innerText = '잠시 멈춤';
                    statusLabel.style.color = '#86868B';
                }
            } else {
                // Start
                if (statusLabel) {
                    statusLabel.innerText = '집중 기도 중';
                    statusLabel.style.color = 'var(--primary)';
                }
                if (toggleBtnText) toggleBtnText.innerText = '일시 정지';
                requestWakeLock();

                timerId = setInterval(() => {
                    elapsedSeconds++;
                    updateTimerUI();

                    // Check Goal completion
                    if (elapsedSeconds >= totalSeconds && statusLabel && statusLabel.innerText !== '목표 달성!') {
                        statusLabel.innerText = '목표 달성!';
                        statusLabel.style.color = 'var(--accent)'; // Highlight goal reach
                        if (window.Utils.createConfetti) window.Utils.createConfetti();

                        // Mark task as done (Persistent)
                        persistCumulativeTime();

                        // API call
                        window.ApiClient?.post('/prayer/log', { minutes: targetMinutes, date: new Date().toISOString() }).catch(() => { });

                        // We continue counting even after goal reached?
                        // The user said "stopwatch form", so let's keep counting but celebrate once.
                    }
                }, 1000);
            }
        };
    }


    const resetBtn = document.getElementById('btn-prayer-reset');
    if (resetBtn) {
        resetBtn.onclick = () => {
            persistCumulativeTime();
            clearInterval(timerId);
            timerId = null;
            releaseWakeLock();
            loadCumulativeTime(); // Reload stored cumulative time
            elapsedSeconds = 0;
            updateTimerUI();
            if (toggleBtnText) toggleBtnText.innerText = '시작하기';
            if (statusLabel) {
                statusLabel.innerText = '준비 완료';
                statusLabel.style.color = 'var(--primary)';
            }
        };
    }


    // 4. Prayer Journal Logic
    let prayerJournal = [];
    const loadPrayerJournal = () => {
        const userId = window.Auth.getCurrentUserId();
        const key = userId ? `${window.CONFIG.STORAGE_KEYS.PRAYER_JOURNAL_PREFIX}${userId}` : 'gw_prayer_journal';
        prayerJournal = window.Utils.getStorageItem(key, []);
    };

    const savePrayerJournalState = () => {
        const userId = window.Auth.getCurrentUserId();
        const key = userId ? `${window.CONFIG.STORAGE_KEYS.PRAYER_JOURNAL_PREFIX}${userId}` : 'gw_prayer_journal';
        window.Utils.setStorageItem(key, prayerJournal);
    };

    window.switchPrayerTab = (tab) => {
        document.querySelectorAll('.tab-trigger').forEach(btn => btn.classList.toggle('active', btn.id === `tab-${tab}`));
        document.getElementById('prayer-timer-view')?.classList.toggle('hidden', tab !== 'timer');
        document.getElementById('prayer-journal-view')?.classList.toggle('hidden', tab !== 'journal');
    };

    window.openPrayerModal = () => {
        document.getElementById('prayer-modal-title').innerText = '기도 제목 남기기';
        document.getElementById('prayer-input-id').value = '';
        document.getElementById('prayer-input-desc').value = '';
        document.getElementById('btn-save-prayer').innerText = '기도 제목 저장하기';
        document.getElementById('btn-delete-prayer-modal')?.classList.add('hidden');
        document.getElementById('prayer-modal')?.classList.add('active');
    };

    window.openEditPrayerModal = (id) => {
        const prayer = prayerJournal.find(p => p.id === id);
        if (!prayer) return;

        document.getElementById('prayer-modal-title').innerText = '기도 제목 수정';
        document.getElementById('prayer-input-id').value = prayer.id;
        document.getElementById('prayer-input-desc').value = prayer.desc;
        document.getElementById('btn-save-prayer').innerText = '내용 수정하기';
        document.getElementById('btn-delete-prayer-modal')?.classList.remove('hidden');
        document.getElementById('prayer-modal')?.classList.add('active');
    };

    window.closePrayerModal = (e) => {
        if (e) e.stopPropagation();
        document.getElementById('prayer-modal')?.classList.remove('active');
    };

    window.savePrayerJournal = () => {
        const id = document.getElementById('prayer-input-id').value;
        const desc = document.getElementById('prayer-input-desc').value.trim();
        if (!desc) {
            window.Utils?.showToast('기도 내용을 입력해주세요.');
            return;
        }

        if (id) {
            // Update mode
            const index = prayerJournal.findIndex(p => p.id === parseInt(id));
            if (index !== -1) {
                prayerJournal[index].desc = desc;
                window.Utils?.showToast('기도 제목이 수정되었습니다.');
            }
        } else {
            // Create mode
            const newPrayer = { id: Date.now(), desc, date: new Date().toISOString() };
            prayerJournal.unshift(newPrayer);
            window.Utils?.showToast('기도 제목이 저장되었습니다.');
        }

        savePrayerJournalState();
        renderPrayerJournal();
        window.closePrayerModal();
        document.getElementById('prayer-input-id').value = '';
        document.getElementById('prayer-input-desc').value = '';
    };


    const renderPrayerJournal = () => {
        const container = document.getElementById('prayer-journal-list');
        if (!container) return;
        loadPrayerJournal();

        if (prayerJournal.length === 0) {
            container.innerHTML = `<div class="sermon-empty-state">
                <div style="background: var(--primary-light); width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:32px; height:32px; color: var(--primary); opacity: 0.5;">
                        <path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z" />
                    </svg>
                </div>
                <p style="font-size: 15px; font-weight: 600; color: var(--text-soft);">기록된 기도제목이 없습니다.<br>하나님께 드리는 마음을 기록해보세요.</p>
            </div>`;
            return;
        }

        container.innerHTML = prayerJournal.map(p => `
            <div class="gw-card" onclick="openEditPrayerModal(${p.id})">
                <p class="gw-card-title">${p.desc}</p>
                <div style="margin-top:16px; font-size:12px; color:var(--text-soft); font-weight:600; display: flex; align-items: center; gap: 4px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px; opacity: 0.6;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    ${new Date(p.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>
        `).join('');
    };

    window.deletePrayerModalAction = () => {
        const id = document.getElementById('prayer-input-id').value;
        if (!id) return;
        if (!confirm('이 기도제목을 삭제하시겠습니까?')) return;
        prayerJournal = prayerJournal.filter(p => p.id !== parseInt(id));
        savePrayerJournalState();
        renderPrayerJournal();
        window.closePrayerModal();
        window.Utils?.showToast('기도 제목이 삭제되었습니다.');
    };



    // Initialization
    initModal();
    loadCumulativeTime();
    updateTimerUI();
    renderPrayerJournal();
})();

