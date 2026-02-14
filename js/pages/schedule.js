(() => {
    let currentViewingWeek = 1;
    let actualCurrentWeek = 1;
    let isListView = false;

    // 2026 Full Schedule Data from Image
    let ScheduleData = [
        { week: 1, date: "2/8", subject: "오리엔테이션", book: "" },
        { week: 2, date: "3/1", subject: "나의 신앙고백과 간증", book: "길(옥한흠, 국제제자훈련원)" },
        { week: 3, date: "3/8", subject: "하나님과 매일 만나는 생활", book: "" },
        { week: 4, date: "3/15", subject: "살았고 운동력 있는 말씀 / 귀납적 성경 연구", book: "만화 성령론(백금산, 부흥과개혁사)" },
        { week: 5, date: "3/22", subject: "무엇이 바른 기도인가 / 기도의 응답", book: "" },
        { week: 6, date: "4/5", subject: "하나님은 누구신가", book: "탕부 하나님(팀켈러, 두란노서원)" },
        { week: 7, date: "4/12", subject: "예수 그리스도는 누구신가", book: "" },
        { week: 8, date: "4/19", subject: "삼위일체 하나님", book: "" },
        { week: 9, date: "4/26", subject: "인간의 타락과 그 결과", book: "기독교의 기본진리(존 스토트, 생명의말씀사)" },
        { week: 10, date: "5/10", subject: "예수 그리스도의 죽음", book: "" },
        { week: 11, date: "5/17", subject: "예수 그리스도의 부활", book: "" },
        { week: 12, date: "5/31", subject: "약속대로 오신 성령", book: "성령 세례와 충만(존 스토트, IVP)" },
        { week: 13, date: "6/7", subject: "거듭난 사람", book: "" },
        { week: 14, date: "6/14", subject: "믿음이란 무엇인가", book: "만화 구원론(백금산, 부흥과개혁사)" },
        { week: 15, date: "6/21", subject: "의롭다 함을 받은 은혜", book: "" },
        { week: 16, date: "6/28", subject: "우리 안에 계시는 성령", book: "" },
        { week: 17, date: "7/5", subject: "그리스도인의 성화", book: "예수님처럼(맥스 루카도, 복있는 사람)" },
        { week: 18, date: "7/12", subject: "예수 그리스도의 재림", book: "" },
        { week: "-", date: "여름방학", subject: "해외선교 및 국내선교 / 1학기 마무리 MT", book: "하나님을 아는 지식(J.I. 패커, IVP)" },
        { week: 19, date: "9/6", subject: "순종의 생활", book: "순종(앤드류 머레이. CLC)" },
        { week: 20, date: "9/13", subject: "가을특별새벽부흥회", book: "" },
        { week: 21, date: "9/20", subject: "봉사의 의무", book: "" },
        { week: 22, date: "10/4", subject: "그리스도를 증거하는 생활", book: "" },
        { week: 23, date: "10/11", subject: "말의 덕을 세우는 사람", book: "내면세계의 질서와 영적성장(고든맥도날드, IVP)" },
        { week: 24, date: "10/18", subject: "가을 영성수련회", book: "" },
        { week: 25, date: "10/25", subject: "영적 성장과 성숙", book: "결혼을 말하다(팀 켈러, 두란노서원)" },
        { week: 26, date: "11/1", subject: "순결한 생활 / 그리스도인의 가정 생활", book: "" },
        { week: 27, date: "11/8", subject: "신앙 인격의 연단", book: "고통에는 뜻이 있다(옥한흠, 국제제자훈련원)" },
        { week: 28, date: "11/15", subject: "그리스도의 주재권", book: "" },
        { week: 29, date: "11/22", subject: "청지기 직", book: "내 마음 그리스도의 집(로버트멍어, IVP소책자)" },
        { week: 30, date: "11/29", subject: "영적 전투", book: "" },
        { week: 31, date: "12/6", subject: "새 계명: 사랑하라", book: "사랑한다면 예수님처럼(필 라이큰, 생명의말씀사)" },
        { week: 32, date: "12/13", subject: "수료 예배", book: "" }
    ];

    const ReadingData = {
        '2': { title: '길', author: '옥한흠', pages: '전체' },
        '4': { title: '만화 성령론', author: '백금산', pages: '전체' },
        '6': { title: '탕부 하나님', author: '팀 켈러', pages: '전체' },
        '9': { title: '기독교의 기본진리', author: '존 스토트', pages: '전체' },
        '12': { title: '성령 세례와 충만', author: '존 스토트', pages: '전체' },
        '14': { title: '만화 구원론', author: '백금산', pages: '전체' },
        '17': { title: '예수님처럼', author: '맥스 루카도', pages: '전체' },
        '19': { title: '순종', author: '앤드류 머레이', pages: '전체' },
        '23': { title: '내면세계의 질서와 영적성장', author: '고든 맥도날드', pages: '전체' },
        '25': { title: '결혼을 말하다', author: '팀 켈러', pages: '전체' },
        '27': { title: '고통에는 뜻이 있다', author: '옥한흠', pages: '전체' },
        '29': { title: '내 마음 그리스도의 집', author: '로버트 멍어', pages: '전체' },
        '31': { title: '사랑한다면 예수님처럼', author: '필 라이큰', pages: '전체' }
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
        renderFullSchedule();

        // 3. Event Listeners
        document.getElementById('toggle-list-view')?.addEventListener('click', toggleListView);
        document.getElementById('admin-paste-zone')?.addEventListener('paste', handleAdminPaste);

        // 4. Set Initial Detail (to current active week)
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

    const parseImageDate = (dateStr) => {
        if (!dateStr) return null;
        const [month, day] = dateStr.split('/').map(Number);
        const year = 2026;
        return new Date(year, month - 1, day);
    };

    const calculateCurrentWeek = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let currentWeek = 1;

        // Find the latest numeric week that has already started or is today
        for (let i = 0; i < ScheduleData.length; i++) {
            const item = ScheduleData[i];
            if (typeof item.week !== 'number') continue; // Skip breaks etc.

            const weekDate = parseImageDate(item.date);
            if (weekDate && weekDate <= today) {
                currentWeek = item.week;
            } else if (weekDate && weekDate > today) {
                break;
            }
        }

        actualCurrentWeek = currentWeek;
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
            const item = ScheduleData.find(s => s.week === i);
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
                    <span class="status-text">${item ? item.date : statusLabel}</span>
                </div>
            `;
        }
        grid.innerHTML = html;
    };

    const renderFullSchedule = () => {
        const container = document.getElementById('schedule-items-container');
        if (!container) return;

        let html = '';
        ScheduleData.forEach(item => {
            const isBreak = item.week === '-';
            const isActive = item.week === actualCurrentWeek ? 'active-row' : '';
            const rowClass = isBreak ? 'summer-break-row' : isActive;
            const weekLabel = isBreak ? '-' : `W${item.week}`;

            html += `
                <div class="schedule-list-item ${rowClass}" ${!isBreak ? `onclick="selectWeek(${item.week})"` : ''}>
                    <div class="week-col">${weekLabel}</div>
                    <div class="date-col">${item.date}</div>
                    <div class="subject-col">${item.subject}</div>
                    <div class="book-col">${item.book}</div>
                </div>
            `;
        });
        container.innerHTML = html;
    };

    const toggleListView = () => {
        isListView = !isListView;
        const grid = document.getElementById('roadmap-grid');
        const list = document.getElementById('full-schedule-list');
        const insight = document.getElementById('curriculum-insight');
        const btn = document.getElementById('toggle-list-view');

        if (isListView) {
            grid.classList.add('hidden');
            list.classList.remove('hidden');
            insight?.classList.add('hidden');
            btn.innerText = '로드맵으로 보기';
        } else {
            grid.classList.remove('hidden');
            list.classList.add('hidden');
            insight?.classList.remove('hidden');
            btn.innerText = '리스트로 보기';
        }
    };

    window.selectWeek = (week) => {
        currentViewingWeek = week;
        updateCurriculumInsight(week);

        // Highlight logic
        document.querySelectorAll('.journey-step').forEach(el => {
            el.style.borderColor = ''; // Reset custom state
        });
        const target = document.getElementById(`step-week-${week}`);
        if (target && !target.classList.contains('active')) {
            target.style.borderColor = 'var(--accent)';
        }

        // List view highlight
        document.querySelectorAll('.schedule-list-item').forEach(el => el.classList.remove('active-row'));
        const row = document.querySelector(`.schedule-list-item[onclick="selectWeek(${week})"]`);
        if (row) row.classList.add('active-row');
    };

    const updateCurriculumInsight = (week) => {
        const scheduleItem = ScheduleData.find(s => s.week === week);
        const verseData = (window.VersesData || []).find(v => v.week === week);

        if (!scheduleItem) return;

        // Information Update
        document.getElementById('card-week-badge').innerText = `Week ${week}`;
        document.getElementById('card-subject').innerText = scheduleItem.subject;


        // Date Display
        const dateObj = parseImageDate(scheduleItem.date);
        if (dateObj) {
            const fmt = (d) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
            document.getElementById('card-date-range').innerText = fmt(dateObj);
        } else {
            document.getElementById('card-date-range').innerText = `2026.${scheduleItem.date.replace('/', '.')}`;
        }

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
        const settings = window.Utils.getStorageItem('gw_cohort_schedule', { startDate: '2026-02-08' });
        const storedSchedule = window.Utils.getStorageItem('gw_full_schedule', ScheduleData);

        document.getElementById('admin-start-date').value = settings.startDate;
        document.getElementById('admin-cohort-select').value = settings.cohort || '제자반 26기';

        // Load current data into preview
        renderAdminPreview(storedSchedule);
        window.Utils.openModal('schedule-admin-modal');
    };

    window.saveScheduleSettings = () => {
        const newStartDate = document.getElementById('admin-start-date').value;
        const cohort = document.getElementById('admin-cohort-select').value;
        const rows = document.querySelectorAll('#admin-preview-body tr');

        const newSchedule = Array.from(rows).map(row => {
            const weekVal = row.querySelector('.edit-week').value.trim();
            return {
                week: isNaN(weekVal) || weekVal === '' ? weekVal : parseInt(weekVal),
                date: row.querySelector('.edit-date').value.trim(),
                subject: row.querySelector('.edit-subject').value.trim(),
                book: row.querySelector('.edit-book').value.trim()
            };
        }).filter(item => item.week !== '');

        if (newSchedule.length === 0) {
            window.Utils.showToast('등록할 일정 데이터가 없습니다.', 'error');
            return;
        }

        try {
            window.Utils.setStorageItem('gw_full_schedule', newSchedule);
            window.Utils.setStorageItem('gw_cohort_schedule', { startDate: newStartDate, cohort: cohort });

            window.Utils.showToast(`${cohort}기 훈련 일정이 성공적으로 게시되었습니다.`);
            window.Utils.closeModal('schedule-admin-modal');

            setTimeout(() => location.reload(), 1000);
        } catch (e) {
            console.error('Save failed', e);
            window.Utils.showToast('저장 중 오류가 발생했습니다.', 'error');
        }
    };

    const handleAdminPaste = (e) => {
        e.preventDefault();
        const clipboardData = e.clipboardData || window.clipboardData;
        const pastedData = clipboardData.getData('Text');
        if (!pastedData) return;

        const rows = pastedData.split(/\r\n|\n|\r/);
        const parsedData = rows.map((row, index) => {
            const columns = row.split('\t');
            if (columns.length < 2) return null;
            const weekVal = columns[0].trim();
            return {
                week: isNaN(weekVal) || weekVal === '' ? weekVal : parseInt(weekVal),
                date: columns[1] ? columns[1].trim() : '',
                subject: columns[2] ? columns[2].trim() : '',
                book: (columns[3] || '').trim()
            };
        }).filter(item => item !== null);

        if (parsedData.length > 0) renderAdminPreview(parsedData);
    };

    const renderAdminPreview = (data) => {
        const container = document.getElementById('admin-preview-container');
        const body = document.getElementById('admin-preview-body');
        if (!container || !body) return;
        container.classList.remove('hidden');
        body.innerHTML = data.map((item) => `
            <tr>
                <td><input type="text" class="edit-week" value="${item.week}"></td>
                <td><input type="text" class="edit-date" value="${item.date}"></td>
                <td><input type="text" class="edit-subject" value="${item.subject}"></td>
                <td><input type="text" class="edit-book" value="${item.book}"></td>
            </tr>
        `).join('');
    };

    const stored = window.Utils.getStorageItem('gw_full_schedule', null);
    if (stored) {
        ScheduleData.length = 0;
        stored.forEach(item => ScheduleData.push(item));
    }

    initSchedule();
})();
