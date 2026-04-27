
(async () => {
    // 1. State Management
    let homeWeek = 1;

    // Determine today's default week from year progress
    const getTodayWeekIndex = () => {
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        return (dayOfYear % 32) + 1;
    };

    // 2. Data Fetching & Rendering
    const fetchDashboardData = async () => {
        const userId = window.Auth.getCurrentUserId();
        if (!userId) return;

        try {
            const weekStatuses = window.TaskService.getWeeklyProgress();
            renderCalendarStrip(weekStatuses);

            const todayStatus = window.TaskService.getTodayTaskState();

            // Weekly counts for Summary, Memorization, and Phone Fellowship
            const summaryCount = window.TaskService.getWeeklyTaskCount('summary', new Date());
            const memoCount = window.TaskService.getWeeklyTaskCount('qt', new Date()); // Home Memo -> Internal QT
            const phoneCount = window.TaskService.getWeeklyTaskCount('phone', new Date());

            const prepCount = window.TaskService.getWeeklyTaskCount('prep', new Date());

            updateTaskCards([
                { type: 'prayer', isCompleted: todayStatus.prayer, meta: `매일 20분 이상` },
                { type: 'qt', isCompleted: todayStatus.bible },
                { type: 'reading', isCompleted: todayStatus.reading },
                { type: 'memorization', isCompleted: memoCount >= 1 },
                { type: 'prep', isCompleted: prepCount >= 1 },
                { type: 'phone', isCompleted: phoneCount >= 1 }
            ]);

            // Growth Chart still uses last 7 days for trend
            const states = window.TaskService.getAllTaskStates();
            const trendData = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const local = states.find(s => s.date.split('T')[0] === dateStr) || { prayerDuration: 0, date: date.toISOString() };
                trendData.push(local);
            }
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

        // Calculate Weekly Mission Progress for Summary
        const summaryCount = window.TaskService.getWeeklyTaskCount('summary', new Date());
        const memoCount = window.TaskService.getWeeklyTaskCount('qt', new Date());
        const phoneCount = window.TaskService.getWeeklyTaskCount('phone', new Date());
        const prepCount = window.TaskService.getWeeklyTaskCount('prep', new Date());

        let completedMissions = 0;
        let totalMissions = 3; // 암송(1), 전화(1), 예습(1)

        if (memoCount >= 1) completedMissions++;
        if (phoneCount >= 1) completedMissions++;
        if (prepCount >= 1) completedMissions++;

        const progressPercent = Math.min(100, Math.round((completedMissions / totalMissions) * 100));
        const allDone = completedMissions >= totalMissions;

        const daysHtml = dailyStatuses.map((status, i) => {
            const date = new Date(status.date);
            const isToday = date.toDateString() === todayStr;

            return `
                <div class="day-item ${isToday ? 'active' : ''}">
                    <span class="day-name">${dayNames[i]}</span>
                    <span class="day-num">${date.getDate()}</span>
                    <div class="day-dots">
                        <div class="dot prayer ${status.prayer ? 'done' : ''}"></div>
                        <div class="dot bible ${status.bible ? 'done' : ''}"></div>
                        <div class="dot reading ${status.reading ? 'done' : ''}"></div>
                    </div>
                </div>
            `;
        }).join('');

        const weeklyHtml = `
            <div class="calendar-divider"></div>
            <div class="weekly-summary-item">
                <div class="weekly-progress-circle ${allDone ? 'all-done' : ''}" style="--progress: ${progressPercent}">
                    ${allDone ? `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                    ` : `
                        <span style="font-size: 11px; font-weight: 800; color: var(--text-soft); font-family: 'Outfit';">
                            ${completedMissions}/${totalMissions}
                        </span>
                    `}
                </div>
                <span class="weekly-label">미션</span>
            </div>
        `;

        strip.innerHTML = daysHtml + weeklyHtml;

        if (todayLabel) {
            todayLabel.innerText = '오늘의 제자훈련';
            const rangeEl = document.getElementById('today-date-range');
            if (rangeEl) {
                const startDay = new Date(dailyStatuses[0].date);
                const endDay = new Date(dailyStatuses[6].date);
                rangeEl.innerText = `${startDay.getMonth() + 1}/${startDay.getDate()} ~ ${endDay.getMonth() + 1}/${endDay.getDate()}`;
            }
        }
    };

    const updateTaskCards = (tasks) => {
        tasks.forEach(task => {
            const card = document.getElementById(`card-${task.type}`);
            if (card) {
                const btn = card.querySelector('.task-action-btn');
                const metaEl = card.querySelector('.task-meta');

                if (task.isCompleted) {
                    card.classList.add('completed');
                } else {
                    card.classList.remove('completed');
                }

                if (metaEl && task.meta) metaEl.innerText = task.meta;

                // Update Mini Status Dots (SVGs)
                const miniDots = document.querySelectorAll(`.mini-dot.${task.type}`);
                miniDots.forEach(miniDot => {
                    miniDot.classList.toggle('done', !!task.isCompleted);
                });
            }
        });
    };

    window.toggleSection = (sectionId = 'all-training') => {
        const header = document.querySelector(`.section-header[data-section="${sectionId}"]`);
        const miniBar = document.getElementById(`mini-status-${sectionId}`);
        if (!header) return;

        const isCollapsed = header.classList.toggle('collapsed');
        if (miniBar) miniBar.classList.toggle('hidden', !isCollapsed);

        // Save state
        localStorage.setItem(`home_collapsed_${sectionId}`, isCollapsed);
    };

    const initSectionStates = () => {
        const id = 'all-training';
        const isCollapsed = localStorage.getItem(`home_collapsed_${id}`) === 'true';
        if (isCollapsed) {
            const header = document.querySelector(`.section-header[data-section="${id}"]`);
            const miniBar = document.getElementById(`mini-status-${id}`);
            if (header) header.classList.add('collapsed');
            if (miniBar) miniBar.classList.remove('hidden');
        }
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

        // Internal Key Mapping
        let internalKey = type;
        if (type === 'qt') internalKey = 'bible'; // Home QT -> Internal Bible
        if (type === 'summary') internalKey = 'summary'; // Internal summary
        if (type === 'memorization') internalKey = 'qt'; // Home Memo -> Internal QT

        const promise = window.TaskService.toggleTask(internalKey, nextState);
        fetchDashboardData();
        await promise;
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
            if (text) {
                text.innerText = verse.text;
                text.classList.remove('concealed');
            }
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

    // 4. Touch & Swipe Gestures (Slide to change week, Click to flip)
    const initVerseSwipe = () => {
        const card3D = document.querySelector('.verse-card-3d');
        if (!card3D) return;

        let startX = 0;
        let diffX = 0;
        let isMoving = false;
        const inner = card3D.querySelector('.verse-card-inner');

        card3D.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            inner.style.transition = 'none';
            isMoving = true;
            diffX = 0;
        }, { passive: true });

        card3D.addEventListener('touchmove', (e) => {
            if (!isMoving) return;
            diffX = e.touches[0].clientX - startX;
            // Preserving current rotation while sliding
            const currentRotation = inner.classList.contains('flipped') ? 'rotateY(180deg)' : 'rotateY(0deg)';
            inner.style.transform = `translateX(${diffX * 0.8}px) ${currentRotation}`;
        }, { passive: true });

        card3D.addEventListener('touchend', (e) => {
            if (!isMoving) return;
            isMoving = false;

            const isFlipped = inner.classList.contains('flipped');
            const rotation = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';

            if (Math.abs(diffX) > 80) {
                // Swipe Success - Slide Out
                const direction = diffX > 0 ? 1 : -1; // 1: Right (Prev), -1: Left (Next)
                inner.style.transition = 'transform 0.3s ease-in, opacity 0.2s';
                inner.style.transform = `translateX(${direction * 120}%) ${rotation}`;
                inner.style.opacity = '0';

                setTimeout(() => {
                    // Update Data
                    direction > 0 ? prevHomeWeek() : nextHomeWeek();

                    // Move new card to opposite side for slide-in
                    inner.style.transition = 'none';
                    inner.style.transform = `translateX(${direction * -120}%) rotateY(0deg)`;
                    inner.style.opacity = '0.5';

                    // Force Reflow
                    inner.offsetHeight;

                    // Slide back to center
                    inner.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1.1), opacity 0.3s';
                    inner.style.transform = 'translateX(0) rotateY(0deg)';
                    inner.style.opacity = '1';
                }, 300);
            } else {
                // Swipe Failed / Simple Tap - Clean up inline styles
                inner.style.transition = '';
                inner.style.transform = '';
                inner.style.opacity = '';
            }
        });
    };

    // 5. Initialize
    homeWeek = 1; // Always start with Week 1
    initSectionStates();
    await fetchDashboardData();
    renderHomeWeekGrid();
    updateHomeVerseDisplay();
    initVerseSwipe();
})();
