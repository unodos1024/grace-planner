
(async () => {
    // 1. State Management
    let homeWeek = 1;
    let localTaskState = [];

    // Determine today's default week from year progress
    const getTodayWeekIndex = () => {
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        return (dayOfYear % 32) + 1;
    };

    const loadLocalTaskState = () => {
        const userId = window.Auth.getCurrentUserId();
        const key = userId ? `${window.CONFIG.STORAGE_KEYS.TASK_STATE_PREFIX}${userId}` : 'gw_task_state';
        localTaskState = window.Utils.getStorageItem(key, []);
    };

    const saveLocalTaskState = () => {
        const userId = window.Auth.getCurrentUserId();
        const key = userId ? `${window.CONFIG.STORAGE_KEYS.TASK_STATE_PREFIX}${userId}` : 'gw_task_state';
        window.Utils.setStorageItem(key, localTaskState);
    };

    // 2. Data Fetching & Rendering
    const fetchDashboardData = async () => {
        const userId = window.Auth.getCurrentUserId();
        if (!userId) return;

        try {
            const todayStr = window.Utils.getTodayISO();
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Get Monday
            const monday = new Date(now.setDate(diff));

            const weekStatuses = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date(monday);
                date.setDate(monday.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                const local = localTaskState.find(s => s.date.split('T')[0] === dateStr) || { prayer: false, qt: false, bible: false, prayerDuration: 0 };
                weekStatuses.push({ date: dateStr, ...local });
            }

            renderCalendarStrip(weekStatuses);

            const todayLocal = weekStatuses.find(s => s.date === todayStr.split('T')[0]) || { prayer: false, qt: false, bible: false };
            updateTaskCards([
                { type: 'prayer', isCompleted: todayLocal.prayer },
                { type: 'qt', isCompleted: todayLocal.qt },
                { type: 'bible', isCompleted: todayLocal.bible }
            ]);

            // Growth Chart still uses last 7 days for trend
            const trendData = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const local = localTaskState.find(s => s.date.split('T')[0] === dateStr) || { prayerDuration: 0 };
                trendData.push(local);
            }
            renderGrowthChart(trendData);
            updateDailyHero();
        } catch (e) {
            console.error('Failed to update dashboard', e);
        }
    };

    const renderCalendarStrip = (dailyStatuses) => {
        const strip = document.getElementById('main-calendar-strip');
        const todayLabel = document.getElementById('today-date-label');
        if (!strip) return;

        const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
        const todayStr = new Date().toDateString();

        strip.innerHTML = dailyStatuses.map((status, i) => {
            const date = new Date(status.date);
            const isToday = date.toDateString() === todayStr;

            return `
                <div class="day-item ${isToday ? 'active' : ''}">
                    <span class="day-name">${dayNames[i]}</span>
                    <span class="day-num">${date.getDate()}</span>
                    <div class="day-dots">
                        <div class="dot prayer ${status.prayer ? 'done' : ''}"></div>
                        <div class="dot qt ${status.qt ? 'done' : ''}"></div>
                        <div class="dot bible ${status.bible ? 'done' : ''}"></div>
                    </div>
                </div>
            `;
        }).join('');

        if (todayLabel) {
            const monday = new Date(dailyStatuses[0].date);
            const sunday = new Date(dailyStatuses[6].date);
            todayLabel.innerHTML = `오늘의 제자훈련 <span style="font-size: 13px; font-weight: 600; color: var(--text-soft); margin-left:8px;">${monday.getMonth() + 1}/${monday.getDate()} ~ ${sunday.getMonth() + 1}/${sunday.getDate()}</span>`;
        }
    };

    const updateTaskCards = (tasks) => {
        tasks.forEach(task => {
            const card = document.getElementById(`card-${task.type}`);
            if (card) {
                task.isCompleted ? card.classList.add('completed') : card.classList.remove('completed');
            }
        });
    };

    const renderGrowthChart = (dailyStatuses) => {
        const container = document.getElementById('prayer-chart');
        if (!container) return;

        const maxDuration = Math.max(...dailyStatuses.map(s => s.prayerDuration), 30);
        container.innerHTML = dailyStatuses.map((status, i) => {
            const height = (status.prayerDuration / maxDuration) * 100;
            return `
                <div class="chart-bar-group" style="flex:1; display:flex; flex-direction:column; align-items:center; gap:8px;">
                    <div class="chart-bar" style="height: 100px; width: 12px; background: var(--bg-main); border-radius: 10px; overflow:hidden; position:relative;">
                        <div class="chart-fill" style="height: ${height}%; width:100%; position:absolute; bottom:0; background: ${status.prayerDuration >= 20 ? 'var(--primary)' : 'var(--primary-pale)'}; border-radius:10px; transition: height 0.6s ease;"></div>
                    </div>
                </div>
            `;
        }).join('');
    };


    const updateDailyHero = () => {
        const verses = window.VersesData || [];
        if (verses.length === 0) return;
        const weekIdx = getTodayWeekIndex();
        const data = verses.find(d => d.week === weekIdx) || verses[0];
        const verse = data['A'];
        const heroText = document.getElementById('hero-text');
        const heroRef = document.getElementById('hero-ref');
        if (heroText && verse) {
            heroText.innerText = `"${verse.text}"`;
            heroRef.innerText = verse.reference;
        }
    };

    // 3. Interactions (Make Global)
    window.toggleTask = async (type) => {
        const card = document.getElementById(`card-${type}`);
        if (!card) return;
        const isCompleted = card.classList.contains('completed');
        const nextState = !isCompleted;
        if (nextState && window.Utils.createConfetti) window.Utils.createConfetti();
        nextState ? card.classList.add('completed') : card.classList.remove('completed');

        const todayStr = window.Utils.getTodayISO();
        let dayStatus = localTaskState.find(s => s.date.split('T')[0] === todayStr);
        if (!dayStatus) {
            dayStatus = { date: todayStr, prayer: false, qt: false, bible: false, prayerDuration: 0 };
            localTaskState.push(dayStatus);
        }
        dayStatus[type] = nextState;
        if (type === 'prayer') dayStatus.prayerDuration = nextState ? 20 : 0;
        saveLocalTaskState();
        fetchDashboardData();

        const endpointMap = { 'qt': '/qt/check', 'bible': '/bible/check', 'prayer': '/prayer/log' };
        if (endpointMap[type]) {
            window.ApiClient?.post(endpointMap[type], { completed: nextState, date: new Date().toISOString() }).catch(console.error);
        }
    };

    window.shareDailyVerse = () => {
        const text = document.getElementById('hero-text')?.innerText;
        const ref = document.getElementById('hero-ref')?.innerText;
        if (navigator.share && text) {
            navigator.share({ title: '오늘의 말씀', text: `${text}\n- ${ref}` }).catch(console.error);
        } else {
            alert('공유 기능을 지원하지 않는 브라우저입니다.');
        }
    };

    window.toggleVerseCard = (el) => {
        const inner = el.querySelector('.verse-card-inner');
        if (inner) inner.classList.toggle('flipped');
    };

    window.toggleHomeWeekGrid = () => {

        const grid = document.getElementById('home-week-grid');
        const btn = document.getElementById('btn-toggle-grid');
        if (grid) {
            const isHidden = grid.classList.toggle('hidden');
            if (btn) btn.classList.toggle('active', !isHidden);
        }
    };

    window.prevHomeWeek = () => { if (homeWeek > 1) { homeWeek--; updateHomeVerseDisplay(); } };
    window.nextHomeWeek = () => { if (homeWeek < 32) { homeWeek++; updateHomeVerseDisplay(); } };

    const renderHomeWeekGrid = () => {
        const grid = document.getElementById('home-week-grid');
        if (!grid) return;
        grid.innerHTML = '';
        for (let i = 1; i <= 32; i++) {
            const btn = document.createElement('div');
            btn.className = 'mini-week-btn' + (i === homeWeek ? ' selected' : '');
            btn.innerText = i;
            btn.onclick = (e) => {
                e.stopPropagation();
                homeWeek = i;
                document.querySelectorAll('.mini-week-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                updateHomeVerseDisplay();
            };
            grid.appendChild(btn);
        }
    };

    const updateHomeVerseDisplay = () => {
        const verses = window.VersesData || [];
        const data = verses.find(d => d.week === homeWeek) || verses[0];
        if (!data) return;
        const badge = document.getElementById('home-selected-week');
        if (badge) badge.innerText = `${homeWeek}`;
        ['A', 'B'].forEach(suffix => {
            const verse = data[suffix];
            const subject = document.getElementById(`home-verse-subject${suffix === 'B' ? '-back' : ''}`);
            const text = document.getElementById(`home-verse-text-${suffix === 'A' ? 'front' : 'back'}`);
            const ref = document.getElementById(`home-verse-ref-${suffix === 'A' ? 'front' : 'back'}`);
            if (subject) subject.innerText = verse.subject;
            if (text) text.innerText = verse.text;
            if (ref) ref.innerText = verse.reference;
        });
        document.querySelector('.verse-card-inner')?.classList.remove('flipped');
        renderHomeWeekGrid();
    };

    window.completeMemorization = (event) => {
        if (event) event.stopPropagation();
        if (window.Utils.createConfetti) window.Utils.createConfetti();
        const btn = event.target;
        btn.innerText = '암송 성공! 🎊'; btn.style.background = '#FF7E67'; btn.disabled = true;
        setTimeout(() => {
            document.querySelector('.verse-card-inner')?.classList.remove('flipped');
            setTimeout(() => { btn.innerText = '암송 완료! ✨'; btn.style.background = ''; btn.disabled = false; }, 1000);
        }, 2000);
    };

    // 4. Initialize
    homeWeek = getTodayWeekIndex();
    loadLocalTaskState();
    await fetchDashboardData();
    renderHomeWeekGrid();
    updateHomeVerseDisplay();
})();
