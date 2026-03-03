
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
            updateTaskCards([
                { type: 'prayer', isCompleted: todayStatus.prayer },
                { type: 'qt', isCompleted: todayStatus.qt },
                { type: 'bible', isCompleted: todayStatus.bible }
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

        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
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
            const startDay = new Date(dailyStatuses[0].date);
            const endDay = new Date(dailyStatuses[6].date);
            todayLabel.innerHTML = `오늘의 제자훈련 <span style="font-size: 13px; font-weight: 600; color: var(--text-soft); margin-left:8px;">${startDay.getMonth() + 1}/${startDay.getDate()} ~ ${endDay.getMonth() + 1}/${endDay.getDate()}</span>`;
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

        // 2. Local State Update & Immediate Re-render (Dots)
        const promise = window.TaskService.toggleTask(type, nextState);
        fetchDashboardData(); // Update calendar dots immediately from local storage

        // 3. Background Sync (Don't wait for UI render)
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
                // Swipe Failed - Return to current state
                inner.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                inner.style.transform = rotation;
                inner.style.opacity = '1';
            }
        });
    };

    // 5. Initialize
    homeWeek = 1; // Always start with Week 1
    await fetchDashboardData();
    renderHomeWeekGrid();
    updateHomeVerseDisplay();
    initVerseSwipe();
})();
