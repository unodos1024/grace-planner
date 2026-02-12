(() => {
    let currentViewingWeek = 1;
    let actualCurrentWeek = 1;

    const ReadingData = {
        '1': { title: '평균의 실종', author: '김난도', pages: '1-42p' },
        '2': { title: '평균의 실종', author: '김난도', pages: '43-85p' },
        '3': { title: '평균의 실종', author: '김난도', pages: '86-120p' },
        '5': { title: '기도의 기쁨', author: 'E.M. 바운즈', pages: '1-30p' },
        '8': { title: '성숙의 길', author: '존 스토트', pages: '1-50p' }
    };

    const initSchedule = () => {
        const user = window.Auth.getCurrentUser();
        if (user && user.role === 'pastor') {
            document.getElementById('admin-schedule-controls')?.classList.remove('hidden');
        }

        // 1. Calculate the current week of training
        calculateCurrentWeek();

        // 2. Render UI Components
        renderProgressGauge();
        renderRoadmap();

        // 3. Set Initial Detail (to current active week)
        updateCurriculumInsight(actualCurrentWeek);

        // 4. Autoscroll to current week (Horizontal ONLY)
        setTimeout(() => {
            const activeStep = document.querySelector('.journey-step.active');
            if (activeStep) {
                activeStep.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }, 150);
    };

    const calculateCurrentWeek = () => {
        const config = window.Utils.getStorageItem('gw_cohort_schedule', { startDate: '2026-02-02' });
        const start = new Date(config.startDate);
        const today = new Date();

        // Difference in days
        const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24));
        const week = Math.floor(diffDays / 7) + 1;

        actualCurrentWeek = Math.max(1, Math.min(32, week));
        currentViewingWeek = actualCurrentWeek;
    };

    const renderProgressGauge = () => {
        const percentage = Math.floor((actualCurrentWeek / 32) * 100);
        document.getElementById('journey-status-text').innerText = `${actualCurrentWeek}주차 진행 중`;
        document.getElementById('journey-percentage').innerText = `${percentage}%`;
        document.getElementById('journey-progress-bar').style.width = `${percentage}%`;
    };

    const renderRoadmap = () => {
        const grid = document.getElementById('roadmap-grid');
        if (!grid) return;

        let html = '';
        for (let i = 1; i <= 32; i++) {
            let status = 'future';
            let statusLabel = '예정';

            if (i < actualCurrentWeek) {
                status = 'past';
                statusLabel = '완료';
            } else if (i === actualCurrentWeek) {
                status = 'active';
                statusLabel = '진행 중';
            }

            html += `
                <div class="journey-step ${status}" onclick="selectWeek(${i})" id="step-week-${i}">
                    <span class="week-num">WEEK ${i}</span>
                    <div class="step-circle">${i}</div>
                    <span class="status-text">${statusLabel}</span>
                </div>
            `;
        }
        grid.innerHTML = html;
    };

    window.selectWeek = (week) => {
        currentViewingWeek = week;
        updateCurriculumInsight(week);

        // Highlight logic
        document.querySelectorAll('.journey-step').forEach(el => {
            el.style.borderColor = ''; // Reset custom state
        });
        const target = document.getElementById(`step-week-${week}`);
        if (!target.classList.contains('active')) {
            target.style.borderColor = 'var(--accent)';
        }
    };

    const updateCurriculumInsight = (week) => {
        const data = (window.VersesData || []).find(v => v.week === week);
        if (!data) return;

        // Information Update
        document.getElementById('card-week-badge').innerText = `Week ${week}`;
        document.getElementById('card-subject').innerText = data.A.subject;
        document.getElementById('card-verse-desc').innerText = data.A.text.substring(0, 60) + '...';

        // Date Calculation
        const config = window.Utils.getStorageItem('gw_cohort_schedule', { startDate: '2026-02-02' });
        const start = new Date(config.startDate);
        const wStart = new Date(start);
        wStart.setDate(start.getDate() + (week - 1) * 7);
        const wEnd = new Date(wStart);
        wEnd.setDate(wStart.getDate() + 6);

        const fmt = (d) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
        document.getElementById('card-date-range').innerText = `${fmt(wStart)} - ${String(wEnd.getMonth() + 1).padStart(2, '0')}.${String(wEnd.getDate()).padStart(2, '0')}`;

        // Reading Info
        const reading = ReadingData[String(week)];
        const readingBox = document.getElementById('reading-insight-box');
        if (reading) {
            readingBox.classList.remove('hidden');
            document.getElementById('card-book-title').innerText = `📖 ${reading.title}`;
            document.getElementById('card-book-meta').innerText = `${reading.author} 저자 | ${reading.pages} 읽기`;
        } else {
            readingBox.classList.add('hidden');
        }

        // Phase Goal (Sample logic)
        const goals = [
            "신앙의 기초를 다지고 구원의 확신을 점검합니다.",
            "매일 말씀과 기도로 하나님과 교제하는 법을 배웁니다.",
            "성령 충만한 삶과 그리스도 중심의 생활을 실천합니다.",
            "공동체 안에서 서로 사랑하며 제자로서의 사명을 감당합니다."
        ];
        const goalIndex = Math.min(3, Math.floor((week - 1) / 8));
        document.getElementById('card-goals').innerText = goals[goalIndex];
    };

    // --- Admin Handlers (Kept for compatibility) ---
    window.openScheduleAdmin = () => {
        const settings = window.Utils.getStorageItem('gw_cohort_schedule', { startDate: '2026-02-16' });
        document.getElementById('admin-start-date').value = settings.startDate;
        window.Utils.openModal('schedule-admin-modal');
    };

    window.saveScheduleSettings = () => {
        const newStartDate = document.getElementById('admin-start-date').value;
        const cohort = document.getElementById('admin-cohort-select').value;
        window.Utils.setStorageItem('gw_cohort_schedule', { startDate: newStartDate, cohort: cohort });
        window.Utils.showToast(`${cohort}기 훈련 일정이 업데이트되었습니다.`);
        window.Utils.closeModal('schedule-admin-modal');
        initSchedule(); // Re-init
    };

    initSchedule();
})();
