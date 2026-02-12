document.addEventListener('DOMContentLoaded', () => {
    // API Base URL
    const API_BASE = 'http://localhost:5116/api';

    // Shared State
    let allVerseData = [];
    let homeWeek = 1;
    let userId = localStorage.getItem('gw_user_id');
    let localTaskState = [];

    const loadLocalTaskState = () => {
        const key = userId ? `gw_task_state_${userId}` : 'gw_task_state';
        localTaskState = JSON.parse(localStorage.getItem(key) || '[]');
    };

    const saveLocalTaskState = () => {
        const key = userId ? `gw_task_state_${userId}` : 'gw_task_state';
        localStorage.setItem(key, JSON.stringify(localTaskState));
    };

    // 1. Fetch Today Summary & Populate Dashboard
    const fetchDashboardData = async () => {
        if (!userId) return;
        try {
            const response = await fetch(`${API_BASE}/home/today?userId=${userId}`);
            if (response.ok) {
                const data = await response.json();

                // Merge remote data with local state for persistence in local-dev
                const todayStr = new Date().toISOString().split('T')[0];
                const localToday = localTaskState.find(s => s.date.split('T')[0] === todayStr);

                if (!localToday && data.weeklyProgress.dailyStatuses) {
                    // Initial sync from server if local is empty
                }

                renderCalendarStrip(data.weeklyProgress.dailyStatuses);
                updateTaskCards(data.tasks);
                renderGrowthChart(data.weeklyProgress.dailyStatuses);
                updateDailyHero();
                const totalMins = data.weeklyProgress.prayerTotalMinutes || 0;
                const totalDisplay = document.getElementById('total-prayer-display');
                if (totalDisplay) totalDisplay.innerText = `누적 ${totalMins}분`;
            } else {
                // Mock data if server is down
                renderFallbackDashboard();
            }
        } catch (e) {
            console.error('Failed to fetch dashboard data', e);
            renderFallbackDashboard();
        }
    };

    const renderFallbackDashboard = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const dummyStatuses = [];

        // Generate last 7 days including today
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            const local = localTaskState.find(s => s.date.split('T')[0] === dStr) || { prayer: false, qt: false, bible: false, prayerDuration: 0 };
            dummyStatuses.push({
                date: dStr,
                ...local
            });
        }

        renderCalendarStrip(dummyStatuses);

        // Update cards from latest local
        const todayLocal = dummyStatuses[6];
        const tasks = [
            { type: 'prayer', isCompleted: todayLocal.prayer },
            { type: 'qt', isCompleted: todayLocal.qt },
            { type: 'bible', isCompleted: todayLocal.bible }
        ];
        updateTaskCards(tasks);
        renderGrowthChart(dummyStatuses);
        updateDailyHero();
    };

    const renderCalendarStrip = (dailyStatuses) => {
        const strip = document.getElementById('main-calendar-strip');
        const todayLabel = document.getElementById('today-date-label');
        if (!strip) return;

        const now = new Date();
        const currentDay = now.getDay(); // 0 (Sun) to 6 (Sat)
        // Adjust to Monday-start week
        const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
        const monday = new Date(new Date().setDate(diff));
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        strip.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const isToday = date.toDateString() === new Date().toDateString();

            // Priority: Local State > Server Data
            const localStatus = localTaskState.find(s => s.date.split('T')[0] === dateStr);
            const serverStatus = dailyStatuses.find(s => s.date.split('T')[0] === dateStr);
            const status = localStatus || serverStatus || { prayer: false, qt: false, bible: false };

            const dayItem = document.createElement('div');
            dayItem.className = 'day-item' + (isToday ? ' active' : '');
            dayItem.innerHTML = `
                <span class="day-name">${dayNames[i]}</span>
                <span class="day-num">${date.getDate()}</span>
                <div class="status-dots">
                    <div class="dot ${status.prayer ? 'active' : ''}"></div>
                    <div class="dot ${status.qt ? 'active' : ''}"></div>
                    <div class="dot ${status.bible ? 'active' : ''}"></div>
                </div>
            `;
            strip.appendChild(dayItem);

            if (isToday && todayLabel) {
                const options = { month: 'long', day: 'numeric', weekday: 'short' };
                todayLabel.innerText = date.toLocaleDateString('ko-KR', options);
            }
        }
    };

    const updateTaskCards = (tasks) => {
        tasks.forEach(task => {
            const type = task.type.toLowerCase().replace('bible_90', 'bible');
            const card = document.getElementById(`card-${type}`);
            if (card) {
                task.isCompleted ? card.classList.add('completed') : card.classList.remove('completed');
            }
        });
    };

    const renderGrowthChart = (dailyStatuses) => {
        const container = document.getElementById('prayer-chart');
        if (!container) return;

        const maxDuration = Math.max(...dailyStatuses.map(s => s.prayerDuration), 30); // At least 30 for scale
        const dayNamesShort = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

        container.innerHTML = dailyStatuses.map((status, i) => {
            const height = (status.prayerDuration / maxDuration) * 100;
            const isToday = new Date(status.date).toDateString() === new Date().toDateString();

            return `
                <div class="chart-bar-group">
                    <div class="chart-bar-bg">
                        <div class="chart-bar-fill" style="height: ${height}%; background: ${status.prayerDuration >= 20 ? 'var(--primary)' : 'var(--primary-pale)'}"></div>
                    </div>
                    <span class="chart-day-label" style="${isToday ? 'color: var(--primary); font-weight: 800;' : ''}">${dayNamesShort[i]}</span>
                </div>
            `;
        }).join('');

        // Update period label
        const periodLabel = document.querySelector('.insight-period');
        if (periodLabel && dailyStatuses.length > 0) {
            const start = new Date(dailyStatuses[0].date);
            const end = new Date(dailyStatuses[dailyStatuses.length - 1].date);
            const options = { month: 'long', day: 'numeric' };
            periodLabel.innerText = `${start.toLocaleDateString('ko-KR', options)} - ${end.toLocaleDateString('ko-KR', options)}`;
        }
    };

    const updateDailyHero = async () => {
        await ensureVerseData();
        if (allVerseData.length === 0) return;

        // Pick a verse based on today's date (deterministic but changes daily)
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        const weekIndex = (dayOfYear % 32) + 1;
        const data = allVerseData.find(d => d.week === weekIndex) || allVerseData[0];
        const verse = data['A'];

        const heroText = document.getElementById('hero-text');
        const heroRef = document.getElementById('hero-ref');
        if (heroText && verse) {
            heroText.innerText = `"${verse.text}"`;
            heroRef.innerText = verse.reference;
        }
    };

    window.shareDailyVerse = () => {
        const text = document.getElementById('hero-text').innerText;
        const ref = document.getElementById('hero-ref').innerText;
        if (navigator.share) {
            navigator.share({
                title: 'Grace Planner 오늘의 말씀',
                text: `${text}\n- ${ref}`,
                url: window.location.href
            }).catch(console.error);
        } else {
            alert('공유 기능을 지원하지 않는 브라우저입니다. 텍스트를 복사해주세요.');
        }
    };

    const updateNavUI = () => {
        const bottomNav = document.querySelector('.nav-bar:not(#admin-nav)'); // Believer Nav
        const adminNav = document.getElementById('admin-nav'); // Pastor Nav

        // Robustly get active page
        const path = window.location.pathname;
        const pageName = path.split('/').pop() || 'index.html';

        const registeredUsers = JSON.parse(localStorage.getItem('gw_registered_users') || '[]');
        const user = registeredUsers.find(u => u.id === userId);
        const isPastor = user && user.role === 'pastor';

        if (isPastor) {
            // Pastor Mode
            if (bottomNav) bottomNav.style.display = 'none';
            if (adminNav) {
                adminNav.classList.remove('hidden');
                adminNav.style.display = 'flex';

                // Highlight Admin Nav based on currentAdminTab variable
                if (typeof currentAdminTab !== 'undefined') {
                    document.querySelectorAll('#admin-nav .nav-item').forEach(btn => btn.classList.remove('active'));
                    const navIdMap = {
                        'overview': 'admin-nav-overview',
                        'prayers': 'admin-nav-prayers',
                        'sermons': 'admin-nav-sermons',
                        'members': 'admin-nav-members'
                    };
                    const activeNavId = navIdMap[currentAdminTab];
                    if (activeNavId) {
                        const activeBtn = document.getElementById(activeNavId);
                        if (activeBtn) activeBtn.classList.add('active');
                    }
                }
            }
        } else {
            // Believer Mode
            if (adminNav) {
                adminNav.classList.add('hidden');
                adminNav.style.display = 'none';
            }
            if (bottomNav) {
                bottomNav.classList.remove('hidden');
                bottomNav.style.display = 'flex';

                document.querySelectorAll('.nav-bar:not(#admin-nav) .nav-item').forEach(item => {
                    const href = item.getAttribute('href');
                    const isActive = (pageName === href) ||
                        (pageName === 'home.html' && href === 'home.html') ||
                        (pageName === '' && href === 'home.html'); // Default
                    item.classList.toggle('active', isActive);
                });
            }
        }
    };

    // 2. Navigation
    window.navigateTo = (screenId) => {
        const pageMap = {
            'screen-home': 'home.html',
            'screen-admin': '../admin/dashboard.html',
            'screen-prayer': 'prayer.html',
            'screen-sermon': 'sermon.html',
            'screen-settings': 'settings.html'
        };

        const targetPage = pageMap[screenId];
        if (targetPage) {
            window.location.href = targetPage;
        }
    };

    // 3. Task Interaction
    window.toggleTask = async (type) => {
        const card = document.getElementById(`card-${type}`);
        if (!card) return;

        const isCompleted = card.classList.contains('completed');
        const nextState = !isCompleted;

        nextState ? card.classList.add('completed') : card.classList.remove('completed');

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        let dayStatus = localTaskState.find(s => s.date.split('T')[0] === todayStr);

        if (!dayStatus) {
            dayStatus = { date: todayStr, prayer: false, qt: false, bible: false, prayerDuration: 0 };
            localTaskState.push(dayStatus);
        }

        dayStatus[type] = nextState;
        if (type === 'prayer') dayStatus.prayerDuration = nextState ? 20 : 0;

        saveLocalTaskState();
        renderFallbackDashboard();

        try {
            let endpoint = '';
            let body = {};
            const isoToday = today.toISOString();

            if (type === 'qt') {
                endpoint = `${API_BASE}/qt/check`;
                body = { date: isoToday, completed: nextState };
            } else if (type === 'bible') {
                endpoint = `${API_BASE}/bible/check`;
                body = { dayIndex: 1, periodType: 'FIRST', completed: nextState };
            } else if (type === 'prayer') {
                endpoint = `${API_BASE}/prayer/log`;
                body = { minutes: nextState ? 20 : 0, date: isoToday };
            }

            if (endpoint) {
                await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            }
        } catch (e) {
            console.error('Failed to update task on server', e);
        }
    };

    // 4. Home Week Grid
    window.toggleHomeWeekGrid = () => {
        const grid = document.getElementById('home-week-grid');
        const btn = document.getElementById('btn-toggle-grid');
        if (!grid || !btn) return;
        const isHidden = grid.classList.toggle('hidden');
        btn.classList.toggle('active', !isHidden);
    };

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

    window.prevHomeWeek = () => {
        if (homeWeek > 1) {
            homeWeek--;
            renderHomeWeekGrid();
            updateHomeVerseDisplay();
        }
    };

    window.nextHomeWeek = () => {
        if (homeWeek < 32) {
            homeWeek++;
            renderHomeWeekGrid();
            updateHomeVerseDisplay();
        }
    };

    // 5. Verse Data
    const VERSES_DATA = [
        { "week": 1, "A": { "subject": "나의 신앙고백과 간증", "reference": "로마서 10:9~10", "text": "네가 만일 네 입으로 예수를 주로 시인하며 또 하나님께서 그를 죽은 자 가운데서 살리신 것을 네 마음에 믿으면 구원을 받으리라 사람이 마음으로 믿어 의에 이르고 입으로 시인하여 구원에 이르느니라" }, "B": { "subject": "나의 신앙고백과 간증", "reference": "마태복음 16:16", "text": "시몬 베드로가 대답하여 이르되 주는 그리스도시요 살아 계신 하나님의 아들이시니이다" } },
        { "week": 2, "A": { "subject": "하나님과 매일 만나는 생활", "reference": "히브리서 4:16", "text": "그러므로 우리는 긍융하심을 받고 때를 따라 돕는 은혜를 얻기 위하여 은혜의 보좌 앞에 담대히 나아갈 것이니라" }, "B": { "subject": "하나님과 매일 만나는 생활", "reference": "예레미야애가 3:22~23", "text": "여호와의 인자와 긍휼이 무궁하시므로 우리가 진멸되지 아니함이니이다 이것들이 아침마다 새로우니 주의 성실하심이 크시도소이다" } },
        { "week": 3, "A": { "subject": "경건의 시간", "reference": "시편 1:1~2", "text": "복 있는 사람은 악인들의 꾀를 따르지 아니하며 죄인들의 길에 서지 아니하며 오만한 자들의 자리에 앉지 아니하고 오직 여호와의 율법을 즐거워하여 그의 율법을 주야로 묵상하는도다" }, "B": { "subject": "경건의 시간", "reference": "시편 119:105", "text": "주의 말씀은 내 발에 등이요 내 길에 빛이니이다" } },
        { "week": 4, "A": { "subject": "살았고 운동력 있는 말씀", "reference": "로마서 1:16", "text": "내가 복음을 부끄러워하지 아니하노니 이 복음은 모든 믿는 자에게 구원을 주시는 하나님의 능력이 됨이라 먼저는 유대인에게요 그리고 헬라인에게로다" }, "B": { "subject": "살았고 운동력 있는 말씀", "reference": "디모데후서 3:16", "text": "모든 성경은 하나님의 감동으로 된 것으로 교훈과 책망과 바르게 함과 의로 교육하기에 유익하니" } },
        { "week": 5, "A": { "subject": "무엇이 바른 기도인가?", "reference": "빌립보서 4:6~7", "text": "아무 것도 염려하지 말고 다만 모든 일에 기도와 간구로, 너희 구할 것을 감사함으로 하나님께 아뢰라 그리하면 모든 지각에 뛰어난 하나님의 평강이 그리스도 예수 안에서 너희 마음과 생각을 지키시리라" }, "B": { "subject": "무엇이 바른 기도인가?", "reference": "마태복음 6:6", "text": "너는 기도할 때에 네 골방에 들어가 문을 닫고 은밀한 중에 계신 네 아버지께 기도하라 은밀한 중에 보시는 네 아버지께서 갚으시리라" } },
        { "week": 6, "A": { "subject": "기도의 응답", "reference": "요한복음 15:7", "text": "너희가 내 안에 거하고 내 말이 너희 안에 거하면 무엇이든지 원하는 대로 구하라 그리하면 이루리라" }, "B": { "subject": "기도의 응답", "reference": "마태복음 7:11", "text": "너희가 악한 자라도 좋은 것으로 자식에게 줄 줄 알거든 하물며 하늘에 계신 너희 아버지께서 구하는 자에게 좋은 것으로 주시지 않겠느냐" } },
        { "week": 7, "A": { "subject": "성경의 권위", "reference": "베드로후서 1:21", "text": "예언은 언제든지 사람의 뜻으로 낸 것이 아니요 오직 성령의 감동하심을 받은 사람들이 하나님께 받아 말한 것임이라" }, "B": { "subject": "성경의 권위", "reference": "여호수아 1:8", "text": "이 율법책을 네 입에서 떠나지 말게 하며 주야로 그것을 묵상하여 그 안에 기록된 대로 다 지켜 행하라 그리하면 네 길이 평탄하게 될 것이며 네가 형통하리라" } },
        { "week": 8, "A": { "subject": "하나님은 누구신가", "reference": "로마서 11:36상", "text": "이는 만물이 주에게서 나오고 주로 말미암고 주에게로 돌아감이라" }, "B": { "subject": "하나님은 누구신가", "reference": "예레미야 31:3하", "text": "내가 영원한 사랑으로 너를 사랑하기에 인자함으로 너를 이끌었다 하였노라" } },
        { "week": 9, "A": { "subject": "예수 그리스도는 누구신가", "reference": "히브리서 4:15", "text": "우리에게 있는 대제사장은 우리의 연약함을 동정하지 못하실 이가 아니요 모든 일에 우리와 똑같이 시험을 받으신 이로되 죄는 없으시니라" }, "B": { "subject": "예수 그리스도는 누구신가", "reference": "요한복음 14:6", "text": "예수께서 이르시되 내가 곧 길이요 진리요 생명이니 나로 말미암지 않고는 아버지께로 올 자가 없느니라" } },
        { "week": 10, "A": { "subject": "삼위일체 하나님", "reference": "요한복음 1:1", "text": "태초에 말씀이 계시니라 이 말씀이 하나님과 함께 계셨으니 이 말씀은 곧 하나님이시니라" }, "B": { "subject": "삼위일체 하나님", "reference": "고린도후서 13:13", "text": "주 예수 그리스도의 은혜와 하나님의 사랑과 성령의 교통하심이 너희 무리와 함께 있을지어다" } },
        { "week": 11, "A": { "subject": "인간의 타락과 그 결과", "reference": "로마서 5:12", "text": "그러므로 한 사람으로 말미암아 죄가 세상에 들어오고 죄로 말미암아 사망이 들어왔나니 이와 같이 모든 사람이 죄를 지었으므로 사망이 모든 사람에게 이르렀느니라" }, "B": { "subject": "인간의 타락과 그 결과", "reference": "히브리서 9:27", "text": "한번 죽는 것은 사람에게 정해진 것이요 그 후에는 심판이 있으리니" } },
        { "week": 12, "A": { "subject": "예수 그리스도의 죽음", "reference": "로마서 5:8", "text": "우리가 아직 죄인 되었을 때에 그리스도께서 우리를 위하여 죽으심으로 하나님께서 우리에 대한 자기의 사랑을 확증하셨느니라" }, "B": { "subject": "예수 그리스도의 죽음", "reference": "갈라디아서 3:13", "text": "그리스도께서 우리를 위하여 저주를 받은 바 되사 율법의 저주에서 우리를 속량하셨으니 기록된 바 나무에 달린 자마다 저주 아래에 있는 자라 하였음이라" } },
        { "week": 13, "A": { "subject": "예수 그리스도의 부활", "reference": "로마서 4:25", "text": "예수는 우리가 범죄한 것 때문에 내줌이 되고 또한 우리를 의롭다 하시기 위하여 살아나셨느니라" }, "B": { "subject": "예수 그리스도의 부활", "reference": "갈라디아서 2:20", "text": "내가 그리스도와 함께 십자가에 못 박혔나니 그런즉 이제는 내가 사는 것이 아니요 오직 내 안에 그리스도께서 사시는 것이라 이제 내가 육체 가운데 사는 것은 나를 사랑하사 나를 위하여 자기 자신을 버리신 하나님의 아들을 믿는 믿음 안에서 사는 것이라" } },
        { "week": 14, "A": { "subject": "약속대로 오신 성령", "reference": "사도행전 2:38", "text": "베드로가 이르되 너희가 회개하여 각각 예수 그리스도의 이름으로 세례를 받고 죄 사함을 받으라 그리하면 성령의 선물을 받으리니" }, "B": { "subject": "약속대로 오신 성령", "reference": "고린도전서 12:13", "text": "우리가 유대인이나 헬라인이나 종이나 자유인이나 다 한 성령으로 세례를 받아 한 몸이 되었고 또 다 한 성령을 마시게 하셨느니라" } },
        { "week": 15, "A": { "subject": "거듭난 사람", "reference": "디도서 3:5", "text": "우리를 구원하시되 우리가 행한 바 의로운 행위로 말미암지 아니하고 오직 그의 긍융하심을 따라 중생의 씻음과 성령의 새롭게 하심으로 하셨나니" }, "B": { "subject": "거듭난 사람", "reference": "데살로니가전서 1:3~4", "text": "너희의 믿음의 역사와 사랑의 수고와 우리 주 예수 그리스도에 대한 소망의 인내를 우리 하나님 아버지 앞에서 끊임없이 기억함이니 하나님의 사랑하심을 받은 형제들아 너희를 택하심을 아노라" } },
        { "week": 16, "A": { "subject": "믿음이란 무엇인가", "reference": "에베소서 2:8~9", "text": "너희는 그 은혜에 의하여 믿음으로 말미암아 구원을 받았으니 이것은 너희에게서 난 것이 아니요 하나님의 선물이라 행위에서 난 것이 아니니 이는 누구든지 자랑하지 못하게 함이라" }, "B": { "subject": "믿음이란 무엇인가", "reference": "로마서 4:18", "text": "아브라함이 바랄 수 없는 중에 바라고 믿었으니 이는 네 후손이 이같으리라 하신 말씀대로 많은 민족의 조상이 되게 하려 하심이라" } },
        { "week": 17, "A": { "subject": "의롭다함을 받은 은혜", "reference": "로마서 3:21~22", "text": "이제는 율법 외에 하나님의 한 의가 나타났으니 율법과 선지자들에게 증거를 받은 것이라 곧 예수 그리스도를 믿음으로 말미암아 모든 믿는 자에게 미치는 하나님의 의니 차별이 없느니라" }, "B": { "subject": "의롭다함을 받은 은혜", "reference": "로마서 8:32", "text": "자기 아들을 아끼지 아니하시고 우리 모든 사람을 위하여 내주신 이가 어찌 그 아들과 함께 모든 것을 우리에게 주시지 아니하겠느냐" } },
        { "week": 18, "A": { "subject": "우리 안에 계시는 성령", "reference": "로마서 8:26", "text": "이와 같이 성령도 우리의 연약함을 도우시나니 우리는 마땅히 기도할 바를 알지 못하나 오직 성령이 말할 수 없는 탄식으로 우리를 위하여 친히 간구하시느니라" }, "B": { "subject": "우리 안에 계시는 성령", "reference": "갈라디아서 5:22~23", "text": "오직 성령의 열매는 사랑과 희락과 화평과 오래 참음과 자비와 양선과 충성과 온유와 절제니 이같은 것을 금지할 법이 없느니라" } },
        { "week": 19, "A": { "subject": "그리스도인의 성화", "reference": "고린도후서 7:1", "text": "그런즉 사랑하는 자들아 이 약속을 가진 우리는 하나님을 두려워하는 가운데서 거룩함을 온전히 이루어 육과 영의 온갖 더러운 것에서 자신을 깨끗하게 하자" }, "B": { "subject": "그리스도인의 성화", "reference": "요한1서 3:3", "text": "주를 향하여 이 소망을 가진 자마다 그의 깨끗하심과 같이 자기를 깨끗하게 하느니라" } },
        { "week": 20, "A": { "subject": "예수 그리스도의 재림", "reference": "요한계시록 22:7", "text": "보라 내가 속히 오리니 이 두루마리의 예언의 말씀을 지키는 자는 복이 있으리라 하더라" }, "B": { "subject": "예수 그리스도의 재림", "reference": "데살로니가전서 4:16~17", "text": "주께서 호령과 천사장의 소리와 하나님의 나팔 소리로 친히 하늘로부터 강림하시리니 그리스도 안에서 죽은 자들이 먼저 일어나고 그 후에 우리 살아 남은 자들도 그들과 함께 구름 속으로 끌어 올려 공중에서 주를 영접하게 하시리니 그리하여 우리가 항상 주와 함께 있으리라" } },
        { "week": 21, "A": { "subject": "순종의 생활", "reference": "마태복음 7:24", "text": "그러므로 누구든지 나의 이 말을 듣고 행하는 자는 그 집을 반석 위에 지은 지혜로운 사람 같으리니" }, "B": { "subject": "순종의 생활", "reference": "요한복음 14:21", "text": "나의 계명을 지키는 자라야 나를 사랑하는 자니 나를 사랑하는 자는 내 아버지께 사랑을 받을 것이요 나도 그를 사랑하여 그에게 나를 나타내리라" } },
        { "week": 22, "A": { "subject": "봉사의 의무", "reference": "빌립보서 2:3~4", "text": "아무 일에든지 다툼이나 허영으로 하지 말고 오직 겸손한 마음으로 각각 자기보다 남을 낫게 여기고 각각 자기 일을 돌볼뿐더러 또한 각각 다른 사람들의 일을 돌보아 나의 기쁨을 충만하게 하라" }, "B": { "subject": "봉사의 의무", "reference": "베드로전서 4:11상", "text": "만일 누가 말하려면 하나님의 말씀을 하는 것 같이 하고 누가 봉사하려면 하나님이 공급하시는 힘으로 하는 것 같이 하라" } },
        { "week": 23, "A": { "subject": "그리스도를 증거하는 생활", "reference": "마태복음 28:19~20", "text": "그러므로 너희는 가서 모든 민족을 제자로 삼아 아버지와 아들과 성령의 이름으로 세례를 베풀고 내가 너희에게 분부한 모든 것을 가르쳐 지키게 하라 볼지어다 내가 세상 끝날까지 너희와 항상 함께 있으리라 하시니라" }, "B": { "subject": "그리스도를 증거하는 생활", "reference": "마태복음 5:16", "text": "이같이 너희 빛이 사람 앞에 비치게 하여 그들로 너희 착한 행실을 보고 하늘에 계신 너희 아버지께 영광을 돌리게 하라" } },
        { "week": 24, "A": { "subject": "말의 덕을 세우는 사람", "reference": "누가복음 6:45", "text": "선한 사람은 마음에 쌓은 선에서 선을 내고 악한 자는 그 쌓은 악에서 악을 내나니 이는 마음에 가득한 것을 입으로 말함이니라" }, "B": { "subject": "말의 덕을 세우는 사람", "reference": "잠언 15:23", "text": "사람은 그 입의 대답으로 말미암아 기쁨을 얻나니 때에 맞는 말이 얼마나 아름다운고" } },
        { "week": 25, "A": { "subject": "영적 성장과 성숙", "reference": "에베소서 4:13", "text": "우리가 다 하나님의 아들을 믿는 것과 아는 일에 하나가 되어 온전한 사람을 이루어 그리스도의 장성한 분량이 충만한 데까지 이르리니" }, "B": { "subject": "영적 성장과 성숙", "reference": "빌립보서 3:12", "text": "내가 이미 얻었다 함도 아니요 온전히 이루었다 함도 아니라 오직 내가 그리스도 예수께 잡힌 바 된 그것을 잡으려고 달려가노라" } },
        { "week": 26, "A": { "subject": "순결한 생활", "reference": "고린도전서 6:19~20", "text": "너희 몸은 너희가 하나님께로부터 받은 바 너희 가운데 계신 성령의 전인 줄을 알지 못하느냐 너희는 너희 자신의 것이 아니라 값으로 산 것이 되었으니 그런즉 너희 몸으로 하나님께 영광을 돌리라" }, "B": { "subject": "순결한 생활", "reference": "디모데후서 2:22", "text": "또한 너는 청년의 정욕을 피하고 주를 깨끗한 마음으로 부르는 자들과 함께 의와 믿음과 사랑과 화평을 따르라" } },
        { "week": 27, "A": { "subject": "그리스도인의 가정 생활", "reference": "에베소서 6:1~3", "text": "자녀들아 주 안에서 너희 부모에게 순종하라 이것이 옳으니라 네 아버지와 어머니를 공경하라 이것은 약속이 있는 첫 계명이니 이로써 네가 잘되고 땅에서 장수하리라" }, "B": { "subject": "그리스도인의 가정 생활", "reference": "신명기 6:6~7", "text": "오늘 내가 네게 명하는 이 말씀을 너는 마음에 새기고 네 자녀에게 부지런히 가르치며 집에 앉았을 때에든지 길을 갈 때에든지 누워 있을 때에든지 일어날 때에든지 이 말씀을 강론할 것이며" } },
        { "week": 28, "A": { "subject": "신앙 인격의 연단", "reference": "시편 119:71", "text": "고난 당한 것이 내게 유익이라 이로 말미암아 내가 주의 율례들을 배우게 되었나이다" }, "B": { "subject": "신앙 인격의 연단", "reference": "로마서 8:28", "text": "우리가 알거니와 하나님을 사랑하는 자 곧 그의 뜻대로 부르심을 입은 자들에게는 모든 것이 합력하여 선을 이루느니라" } },
        { "week": 29, "A": { "subject": "그리스도의 주재권", "reference": "로마서 14:7~8", "text": "우리 중에 누구든지 자기를 위하여 사는 자가 없고 자기를 위하여 죽는 자도 없도다 우리가 살아도 주를 위하여 살고 죽어도 주를 위하여 죽나니 그러므로 사나 죽으나 우리가 주의 것이로다" }, "B": { "subject": "그리스도의 주재권", "reference": "요한계시록 3:20", "text": "볼지어다 내가 문 밖에 서서 두드리노니 누구든지 내 음성을 듣고 문을 열면 내가 그에게로 들어가 그와 더불어 먹고 그는 나와 더불어 먹으리라" } },
        { "week": 30, "A": { "subject": "청지기직", "reference": "에베소서 5:15~16", "text": "그런즉 너희가 어떻게 행할지를 자세히 주의하여 지혜 없는 자 같이 하지 말고 오직 지혜 있는 자 같이 하여 세월을 아끼라 때가 악하니라" }, "B": { "subject": "청지기직", "reference": "디모데전서 6:17", "text": "네가 이 세대에서 부한 자들을 명하여 마음을 높이지 말고 정함이 없는 재물에 소망을 두지 말고 오직 우리에게 모든 것을 후히 주사 누리게 하시는 하나님께 두며" } },
        { "week": 31, "A": { "subject": "영적 전투", "reference": "베드로전서 5:8", "text": "근신하라 깨어라 너희 대적 마귀가 우는 사자 같이 두루 다니며 삼킬 자를 찾나니" }, "B": { "subject": "영적 전투", "reference": "에베소서 6:10~11", "text": "끝으로 너희가 주 안에서와 그 힘의 능력으로 강건하여지고 마귀의 간계를 능히 대적하기 위하여 하나님의 전신 갑주를 입으라" } },
        { "week": 32, "A": { "subject": "새 계명 : 사랑하라", "reference": "요한복음 13:34~35", "text": "새 계명을 너희에게 주노니 서로 사랑하라 내가 너희를 사랑한 것 같이 너희도 서로 사랑하라 너희가 서로 사랑하면 이로써 모든 사람이 너희가 내 제자인 줄 알리라" }, "B": { "subject": "새 계명 : 사랑하라", "reference": "요한1서 3:18", "text": "자녀들아 우리가 말과 혀로만 사랑하지 말고 행함과 진실함으로 하자" } }
    ];

    async function ensureVerseData() {
        if (allVerseData.length > 0) return;
        allVerseData = VERSES_DATA;
    }

    async function updateHomeVerseDisplay() {
        await ensureVerseData();
        const data = allVerseData.find(d => d.week === homeWeek) || allVerseData[0];
        if (!data) return;

        const verseA = data['A'];
        const verseB = data['B'];

        const badge = document.getElementById('home-selected-week');
        if (badge) badge.innerText = `${homeWeek}`;

        if (verseA) {
            const subject = document.getElementById('home-verse-subject');
            const text = document.getElementById('home-verse-text-front');
            const ref = document.getElementById('home-verse-ref-front');
            if (subject) subject.innerText = verseA.subject;
            if (text) text.innerText = verseA.text;
            if (ref) ref.innerText = verseA.reference;
        }

        if (verseB) {
            const subject = document.getElementById('home-verse-subject-back');
            const text = document.getElementById('home-verse-text-back');
            const ref = document.getElementById('home-verse-ref-back');
            if (subject) subject.innerText = verseB.subject;
            if (text) text.innerText = verseB.text;
            if (ref) ref.innerText = verseB.reference;
        }

        const inner = document.querySelector('.verse-card-inner');
        if (inner) inner.classList.remove('flipped');
    }

    // 6. Premium Timer Logic
    const TARGET_MINUTES = 20;
    let prayerSeconds = TARGET_MINUTES * 60;
    let timerId = null;
    const prayerDisplay = document.getElementById('prayer-time');
    const statusLabel = document.getElementById('timer-status');
    const toggleBtnText = document.getElementById('btn-toggle-text');
    const progressFill = document.getElementById('timer-progress-fill');
    const goalMessage = document.getElementById('timer-goal-message');

    // Audio Engine
    let audioCtx = null;
    let ambientSource = null;
    let currentAmbient = 'none';

    const initAudio = () => { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); };

    const createNoise = (type) => {
        const bufferSize = 2 * audioCtx.sampleRate, noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate), output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            if (type === 'rain') { output[i] = Math.random() * 0.2 - 0.1; }
            else { let lastOut = 0; let white = Math.random() * 2 - 1; output[i] = (lastOut + (0.02 * white)) / 1.02; lastOut = output[i]; output[i] *= 0.5; }
        }
        const noise = audioCtx.createBufferSource(); noise.buffer = noiseBuffer; noise.loop = true;
        const lowpass = audioCtx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = type === 'rain' ? 3000 : 800;
        const gainNode = audioCtx.createGain(); gainNode.gain.value = 0.05;
        noise.connect(lowpass); lowpass.connect(gainNode); gainNode.connect(audioCtx.destination);
        return noise;
    };

    window.setAmbient = (type) => {
        initAudio(); currentAmbient = type;
        document.querySelectorAll('.ambient-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.sound === type));
        if (timerId) { stopAmbient(); startAmbient(); }
    };

    const startAmbient = () => {
        if (!audioCtx || currentAmbient === 'none') return;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        if (currentAmbient === 'rain' || currentAmbient === 'forest') { ambientSource = createNoise(currentAmbient); ambientSource.start(); }
    };

    const stopAmbient = () => { if (ambientSource) { try { ambientSource.stop(); } catch (e) { } ambientSource = null; } };

    const updateTimerUI = () => {
        if (!prayerDisplay) return;
        const mins = Math.floor(prayerSeconds / 60); const secs = prayerSeconds % 60;
        prayerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        const elapsed = (TARGET_MINUTES * 60) - prayerSeconds; const progress = (elapsed / (TARGET_MINUTES * 60)) * 100;
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (goalMessage) { const minsLeft = Math.ceil(prayerSeconds / 60); goalMessage.innerText = `${TARGET_MINUTES}분 목표까지 ${minsLeft}분 남음`; }
    };

    const prayerBtn = document.getElementById('btn-prayer-toggle');
    if (prayerBtn) {
        prayerBtn.onclick = async () => {
            if (timerId) {
                clearInterval(timerId); timerId = null; stopAmbient();
                if (toggleBtnText) toggleBtnText.innerText = '다시 시작';
                if (statusLabel) { statusLabel.innerText = '잠시 멈춤'; statusLabel.style.color = '#86868B'; }
            } else {
                if (statusLabel) { statusLabel.innerText = '기도 중...'; statusLabel.style.color = '#FF7E67'; }
                if (toggleBtnText) toggleBtnText.innerText = '일시 정지';
                startAmbient();
                timerId = setInterval(async () => {
                    if (prayerSeconds > 0) { prayerSeconds--; updateTimerUI(); }
                    else {
                        clearInterval(timerId); timerId = null; stopAmbient();
                        if (statusLabel) statusLabel.innerText = '목표 달성!';
                        alert('오늘의 기도 목표를 달성했습니다!');
                        await fetch(`${API_BASE}/prayer/log`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ minutes: TARGET_MINUTES, date: new Date().toISOString() })
                        });
                        fetchDashboardData();
                    }
                }, 1000);
            }
        };
    }

    const resetBtn = document.getElementById('btn-prayer-reset');
    if (resetBtn) {
        resetBtn.onclick = () => {
            clearInterval(timerId); timerId = null; stopAmbient();
            prayerSeconds = TARGET_MINUTES * 60; updateTimerUI();
            if (toggleBtnText) toggleBtnText.innerText = '시작하기';
            if (statusLabel) { statusLabel.innerText = '준비 완료'; statusLabel.style.color = 'var(--primary)'; }
        };
    }

    // 7. Prayer Journal Logic
    let prayerJournal = [];
    const loadPrayerJournal = () => {
        const key = userId ? `gw_prayer_journal_${userId}` : 'gw_prayer_journal';
        prayerJournal = JSON.parse(localStorage.getItem(key) || '[]');
    };

    const savePrayerJournalState = () => {
        const key = userId ? `gw_prayer_journal_${userId}` : 'gw_prayer_journal';
        localStorage.setItem(key, JSON.stringify(prayerJournal));
    };

    window.switchPrayerTab = (tab) => {
        document.getElementById('tab-timer').classList.toggle('active', tab === 'timer');
        document.getElementById('tab-journal').classList.toggle('active', tab === 'journal');
        document.getElementById('prayer-timer-view').classList.toggle('hidden', tab !== 'timer');
        document.getElementById('prayer-journal-view').classList.toggle('hidden', tab !== 'journal');
    };

    window.openPrayerModal = () => document.getElementById('prayer-modal').classList.add('active');
    window.closePrayerModal = (e) => {
        if (e) e.stopPropagation();
        document.getElementById('prayer-modal').classList.remove('active');
    };

    window.savePrayerJournal = () => {
        const desc = document.getElementById('prayer-input-desc').value;
        if (!desc) { alert('기도 내용을 입력해주세요.'); return; }

        const newPrayer = {
            id: Date.now(),
            desc,
            date: new Date().toISOString(),
            isAnswered: false
        };

        prayerJournal.unshift(newPrayer);
        savePrayerJournalState();
        renderPrayerJournal();
        closePrayerModal();

        // Clear inputs
        document.getElementById('prayer-input-desc').value = '';
    };

    const renderPrayerJournal = () => {
        const container = document.getElementById('prayer-journal-list');
        if (!container) return;
        loadPrayerJournal();

        if (prayerJournal.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>기록된 기도제목이 없습니다.<br>삶의 고백을 남겨보세요.</p></div>`;
            return;
        }

        container.innerHTML = prayerJournal.map(p => `
            <div class="prayer-card ${p.isAnswered ? 'answered' : ''}">
                <div class="prayer-card-header">
                    <span class="prayer-tag">${p.isAnswered ? '응답 완료 ✨' : '기도 중'}</span>
                </div>
                <p class="prayer-desc" style="font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 0;">${p.desc}</p>
                <div class="prayer-footer">
                    <span class="prayer-date-info">${new Date(p.date).toLocaleDateString()} 시작</span>
                    <button class="btn-answer-toggle" onclick="togglePrayerAnswer(${p.id})">
                        ${p.isAnswered ? '취소' : '응답 받음!'}
                    </button>
                </div>
            </div>
        `).join('');
    };

    window.togglePrayerAnswer = (id) => {
        const prayer = prayerJournal.find(p => p.id === id);
        if (!prayer) return;

        prayer.isAnswered = !prayer.isAnswered;
        if (prayer.isAnswered) createConfetti();
        savePrayerJournalState();
        renderPrayerJournal();
    };

    // 8. Sermon Logic
    let allSermonNotes = [];
    const fetchSermonNotes = async () => {
        try {
            const response = await fetch(`${API_BASE}/sermon`);
            if (response.ok) { allSermonNotes = await response.json(); renderSermonList(); }
        } catch (e) { console.error('Failed to fetch sermon notes', e); }
    };

    const renderSermonList = () => {
        const container = document.getElementById('sermon-list-container');
        const countDisplay = document.getElementById('sermon-count');
        if (!container) return;
        if (countDisplay) countDisplay.innerText = allSermonNotes.length;

        if (allSermonNotes.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>아직 기록된 설교 요약이 없습니다.<br>오늘 받은 은혜를 기록해보세요.</p></div>`;
            return;
        }

        container.innerHTML = allSermonNotes.map(note => `
            <div class="journal-card" onclick="showSermonDetail(${note.noteId})">
                <span class="journal-date">${new Date(note.createdDate).toLocaleDateString()}</span>
                <h4 class="journal-card-title">${note.title}</h4>
                <p class="journal-card-preview">${note.content}</p>
            </div>
        `).join('');
    };

    window.showSermonForm = () => {
        document.getElementById('sermon-list-view').classList.add('hidden');
        document.getElementById('sermon-detail-view').classList.add('hidden');
        document.getElementById('sermon-form-view').classList.remove('hidden');
        document.getElementById('sermon-screen-title').innerText = '은혜 기록하기';
        const badge = document.getElementById('sermon-count-badge'); if (badge) badge.style.display = 'none';
        document.getElementById('sermon-input-title').value = '';
        document.getElementById('sermon-input-content').value = '';
        document.getElementById('sermon-input-date').value = new Date().toISOString().split('T')[0];
    };

    window.showSermonList = () => {
        document.getElementById('sermon-form-view').classList.add('hidden');
        document.getElementById('sermon-detail-view').classList.add('hidden');
        document.getElementById('sermon-list-view').classList.remove('hidden');
        document.getElementById('sermon-screen-title').innerText = '설교 요약';
        const badge = document.getElementById('sermon-count-badge'); if (badge) badge.style.display = 'block';
        fetchSermonNotes();
    };

    window.showSermonDetail = (noteId) => {
        const note = allSermonNotes.find(n => n.noteId === noteId); if (!note) return;
        document.getElementById('sermon-list-view').classList.add('hidden');
        document.getElementById('sermon-form-view').classList.add('hidden');
        document.getElementById('sermon-detail-view').classList.remove('hidden');
        document.getElementById('sermon-screen-title').innerText = '기록 상세';
        const badge = document.getElementById('sermon-count-badge'); if (badge) badge.style.display = 'none';
        document.getElementById('detail-sermon-date').innerText = new Date(note.createdDate).toLocaleDateString();
        document.getElementById('detail-sermon-title').innerText = note.title;
        document.getElementById('detail-sermon-content').innerText = note.content;
    };

    window.handleSermonBack = () => {
        if (!document.getElementById('sermon-form-view').classList.contains('hidden') || !document.getElementById('sermon-detail-view').classList.contains('hidden')) {
            showSermonList();
        } else { navigateTo('screen-home'); }
    };

    window.saveSermonNote = async () => {
        const title = document.getElementById('sermon-input-title').value;
        const content = document.getElementById('sermon-input-content').value;
        const date = document.getElementById('sermon-input-date').value;
        if (!title || !content || !date) { alert('모든 항목을 입력해주세요.'); return; }

        // LocalStorage Save for Prototype/Admin View
        const localKey = userId ? `gw_sermon_notes_${userId}` : 'gw_sermon_notes';
        const currentNotes = JSON.parse(localStorage.getItem(localKey) || '[]');
        currentNotes.unshift({
            noteId: Date.now(),
            title,
            content,
            createdDate: new Date(date).toISOString(),
            worshipType: 'SUNDAY'
        });
        localStorage.setItem(localKey, JSON.stringify(currentNotes));

        try {
            // Keep API call for future backend integration
            fetch(`${API_BASE}/sermon`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, worshipType: 'SUNDAY', createdDate: new Date(date).toISOString() })
            }).catch(e => console.log('Backend sync failed, fully relying on local'));

            showSermonList();
            fetchDashboardData();
        } catch (e) { console.error(e); alert('오류 발생'); }
    };

    window.completeMemorization = (event) => {
        if (event) event.stopPropagation();
        createConfetti();
        const btn = event.target; btn.innerText = '암송 성공! 🎊'; btn.style.background = '#FF7E67'; btn.disabled = true;
        setTimeout(() => {
            const inner = document.querySelector('.verse-card-inner');
            if (inner) inner.classList.remove('flipped');
            setTimeout(() => { btn.innerText = '암송 완료! ✨'; btn.style.background = ''; btn.disabled = false; }, 1000);
        }, 2000);
    };

    const createConfetti = () => {
        const container = document.getElementById('confetti-container'); if (!container) return;
        const colors = ['#4A6741', '#FF7E67', '#AEC6B5', '#F3F0FF', '#FFE66D'];
        for (let i = 0; i < 50; i++) {
            const c = document.createElement('div'); c.className = 'confetti'; c.style.left = Math.random() * 100 + 'vw';
            c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            c.style.width = (Math.random() * 8 + 4) + 'px'; c.style.height = (Math.random() * 8 + 4) + 'px';
            c.style.animationDelay = Math.random() * 0.5 + 's'; container.appendChild(c);
            setTimeout(() => c.remove(), 3000);
        }
    };

    // Initialization Logic
    const initPage = () => {
        loadLocalTaskState();
        updateNavUI();
        const userDisplay = document.getElementById('display-user-id');
        if (userDisplay) userDisplay.innerText = userId;

        const path = window.location.pathname;
        const pageName = path.split('/').pop();

        if (pageName === 'home.html' || document.getElementById('screen-home')) {
            fetchDashboardData(); renderHomeWeekGrid(); updateHomeVerseDisplay();
        }
        if (pageName === 'prayer.html' || document.getElementById('screen-prayer')) {
            updateTimerUI(); fetchDashboardData();
            renderPrayerJournal();
        }
        if (pageName === 'sermon.html' || document.getElementById('screen-sermon')) {
            fetchSermonNotes();
        }
        if (pageName === 'settings.html' || document.getElementById('screen-settings')) {
            fetchDashboardData();
        }
    };

    // 10. Multi-Step Auth Logic
    let currentAuthStep = 'login';
    let signupData = {
        role: '', id: '', pw: '', name: '', birth: '', cohort: '', termsAgreed: false
    };

    window.goToAuthStep = (step) => {
        document.querySelectorAll('.auth-step').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(`auth-step-${step}`);
        if (target) target.classList.add('active');
        currentAuthStep = step;

        if (step === 'summary') renderSignupSummary();
    };

    window.toggleAuthMode = (mode) => {
        // Legacy support or ignored in new multi-step
        goToAuthStep(mode === 'signup' ? 'role' : 'login');
    };

    // Seed Users (Force ensure admin/user exists and is approved)
    const initSeedUsers = () => {
        const usersKey = 'gw_registered_users';
        let users = JSON.parse(localStorage.getItem(usersKey) || '[]');

        // Remove existing temp users to force update their state (pw/approval)
        users = users.filter(u => u.id !== 'admin' && u.id !== 'user');

        // Add them back with correct credentials
        users.push({ id: 'admin', pw: '1', name: '관리자', role: 'pastor', isApproved: true });
        users.push({ id: 'user', pw: '1', name: '김철수', role: 'believer', birth: '900101', cohort: '11', isApproved: true });

        localStorage.setItem(usersKey, JSON.stringify(users));
    };
    initSeedUsers();

    // New Role Selection Logic (select -> activate next)
    window.selectRole = (role) => {
        signupData.role = role;

        // Visual Selection
        document.querySelectorAll('.selection-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.getAttribute('data-role') === role) btn.classList.add('selected');
        });

        // Enable Next Button
        const nextBtn = document.getElementById('btn-next-role');
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.classList.add('active');
        }

        // Toggle Believer Fields Visibility (pre-emptive)
        document.getElementById('believer-info-fields').classList.toggle('hidden', role !== 'believer');
    };

    window.checkCredsInput = () => {
        const id = document.getElementById('signup-id').value.trim();
        const pw = document.getElementById('signup-pw').value.trim();
        const btn = document.getElementById('btn-next-creds');

        if (id && pw) {
            btn.disabled = false;
            btn.classList.add('active');
        } else {
            btn.disabled = true;
            btn.classList.remove('active');
        }
    };

    window.checkInfoInput = () => {
        const name = document.getElementById('signup-name').value.trim();
        const btn = document.getElementById('btn-next-info');
        let isValid = !!name;

        if (signupData.role === 'believer') {
            const birth = document.getElementById('signup-birth').value.trim();
            const cohort = document.getElementById('signup-cohort').value.trim();
            isValid = isValid && !!birth && !!cohort;
        }

        if (isValid) {
            btn.disabled = false;
            btn.classList.add('active');
        } else {
            btn.disabled = true;
            btn.classList.remove('active');
        }
    };

    window.handleInfoNext = () => {
        // Data collection happens on next click
        signupData.id = document.getElementById('signup-id').value.trim();
        signupData.pw = document.getElementById('signup-pw').value.trim();
        signupData.name = document.getElementById('signup-name').value.trim();

        if (signupData.role === 'believer') {
            signupData.birth = document.getElementById('signup-birth').value.trim();
            signupData.cohort = document.getElementById('signup-cohort').value.trim();
        }
        goToAuthStep('summary');
    };

    const renderSignupSummary = () => {
        const container = document.getElementById('signup-summary-card');
        let html = `
            <div class="summary-row"><span class="summary-label">구분</span><span class="summary-value">${signupData.role === 'pastor' ? '목회자' : '훈련생'}</span></div>
            <div class="summary-row"><span class="summary-label">이름</span><span class="summary-value">${signupData.name}</span></div>
        `;
        if (signupData.role === 'believer') {
            html += `
                <div class="summary-row"><span class="summary-label">생년월일</span><span class="summary-value">${signupData.birth}</span></div>
                <div class="summary-row"><span class="summary-label">기수</span><span class="summary-value">${signupData.cohort}기</span></div>
            `;
        }
        container.innerHTML = html;
    };

    window.toggleTerms = () => {
        signupData.termsAgreed = !signupData.termsAgreed;
        document.getElementById('terms-check').classList.toggle('checked', signupData.termsAgreed);
        document.getElementById('btn-signup-confirm').disabled = !signupData.termsAgreed;
        document.getElementById('btn-signup-confirm').classList.toggle('active', signupData.termsAgreed);
    };

    window.submitSignup = () => {
        if (!signupData.termsAgreed) return;

        const usersKey = 'gw_registered_users';
        let registeredUsers = JSON.parse(localStorage.getItem(usersKey) || '[]');

        if (registeredUsers.find(u => u.id === signupData.id)) {
            alert('이미 존재하는 아이디입니다.');
            goToAuthStep('creds');
            return;
        }

        const newUser = {
            id: signupData.id,
            pw: signupData.pw,
            name: signupData.name,
            role: signupData.role,
            birth: signupData.role === 'believer' ? signupData.birth : '',
            cohort: signupData.role === 'believer' ? signupData.cohort : '',
            isApproved: false // Admin must approve
        };

        registeredUsers.push(newUser);
        localStorage.setItem(usersKey, JSON.stringify(registeredUsers));
        goToAuthStep('final');
    };

    window.handleLoginSubmit = () => {
        const id = document.getElementById('login-id').value.trim();
        const loginPw = document.getElementById('login-pw').value.trim();

        const registeredUsers = JSON.parse(localStorage.getItem('gw_registered_users') || '[]');
        const user = registeredUsers.find(u => u.id === id && u.pw === loginPw);

        if (user) {
            if (!user.isApproved) {
                // Update final step text for clearer context
                document.querySelector('#auth-step-final .login-prompt').innerText = '승인 대기 중';
                document.querySelector('#auth-step-final p').innerHTML = '승인 대기 중인 계정입니다.<br>목회자님의 승인을 기다려주세요.';
                goToAuthStep('final');
                return;
            }
            userId = user.id;
            localStorage.setItem('gw_user_id', userId);

            // Redirect based on role
            if (user.role === 'pastor') {
                window.location.href = 'admin/dashboard.html';
            } else {
                window.location.href = 'user/home.html';
            }
        } else {
            alert('아이디 또는 비밀번호가 틀렸습니다.');
        }
    };

    window.handleLogout = () => {
        if (confirm('로그아웃 하시겠습니까?')) {
            localStorage.removeItem('gw_user_id'); userId = null;
            // Go to root index.html
            // If we are in user/ or admin/, go up one level
            const path = window.location.pathname;
            const parts = path.split('/');
            if (parts[parts.length - 2] === 'user' || parts[parts.length - 2] === 'admin') {
                window.location.href = '../index.html';
            } else {
                window.location.href = 'index.html';
            }
        }
    };

    /* --- Admin Logic --- */
    let currentAdminTab = 'overview';
    let adminFilterPrayer = 'all';
    let adminFilterSermon = 'all';
    let adminFilterMember = 'all';
    let currentCohortFilter = 'all'; // For Overview

    const initAdminPage = () => {
        const registeredUsers = JSON.parse(localStorage.getItem('gw_registered_users') || '[]');

        // Stats
        const total = registeredUsers.filter(u => u.role === 'believer' && u.isApproved && !u.isGraduated).length;
        const pending = registeredUsers.filter(u => !u.isApproved).length;
        const statTotal = document.getElementById('admin-stat-total');
        const statPending = document.getElementById('admin-stat-pending');
        if (statTotal) statTotal.innerText = total;
        if (statPending) statPending.innerText = pending;

        // Render Active Tab Content
        if (currentAdminTab === 'overview') {
            renderPendingList(registeredUsers);
            renderCohortFilters(registeredUsers); // For Overview
            renderCohortList(registeredUsers);
        } else if (currentAdminTab === 'prayers') {
            renderAdminPrayers(registeredUsers);
        } else if (currentAdminTab === 'sermons') {
            renderAdminSermons(registeredUsers);
        } else if (currentAdminTab === 'members') {
            renderAdminMembers(registeredUsers);
        }
    };

    window.switchAdminTab = (tab) => {
        currentAdminTab = tab;

        // Update Bottom Nav Highlighting
        document.querySelectorAll('#admin-nav .nav-item').forEach(btn => btn.classList.remove('active'));
        const navIdMap = {
            'overview': 'admin-nav-overview',
            'prayers': 'admin-nav-prayers',
            'sermons': 'admin-nav-sermons',
            'members': 'admin-nav-members'
        };
        const activeNavId = navIdMap[tab];
        if (activeNavId) {
            const activeNav = document.getElementById(activeNavId);
            if (activeNav) activeNav.classList.add('active');
        }

        // Update Views
        document.querySelectorAll('.admin-view').forEach(v => {
            v.classList.add('hidden');
            v.classList.remove('active');
        });
        const activeView = document.getElementById(`admin-view-${tab}`);
        if (activeView) {
            activeView.classList.remove('hidden');
            activeView.classList.add('active');
        }

        initAdminPage();
    };

    // --- Overview Logic ---
    const renderPendingList = (users) => {
        const pendingContainer = document.getElementById('admin-pending-section');
        const list = document.getElementById('admin-pending-list');
        const pendingUsers = users.filter(u => !u.isApproved);

        if (!pendingContainer || !list) return;

        if (pendingUsers.length === 0) {
            pendingContainer.classList.add('hidden');
            return;
        }

        pendingContainer.classList.remove('hidden');
        list.innerHTML = pendingUsers.map(u => `
            <div class="member-card pending">
                <div class="member-info">
                    <h4>${u.name} <span class="pending-badge">승인 대기</span></h4>
                    <p>${u.role === 'pastor' ? '목회자' : `${u.cohort}기 | ${u.birth}`}</p>
                </div>
                <div class="member-actions">
                    <button class="btn-approve" onclick="handleApproveUser('${u.id}')">승인</button>
                </div>
            </div>
        `).join('');
    };

    window.handleApproveUser = (targetId) => {
        const usersKey = 'gw_registered_users';
        let registeredUsers = JSON.parse(localStorage.getItem(usersKey) || '[]');
        const userIndex = registeredUsers.findIndex(u => u.id === targetId);

        if (userIndex > -1) {
            registeredUsers[userIndex].isApproved = true;
            localStorage.setItem(usersKey, JSON.stringify(registeredUsers));
            alert(`${registeredUsers[userIndex].name}님을 승인했습니다.`);
            initAdminPage(); // Refresh
        }
    };

    const renderCohortFilters = (users) => {
        const container = document.getElementById('admin-cohort-filters');
        if (!container) return;

        const cohorts = [...new Set(users.filter(u => u.role === 'believer' && u.isApproved && u.cohort).map(u => u.cohort))].sort();

        let html = `<button class="cohort-chip ${currentCohortFilter === 'all' ? 'active' : ''}" onclick="filterCohort('all')">전체</button>`;
        cohorts.forEach(c => {
            html += `<button class="cohort-chip ${currentCohortFilter === c ? 'active' : ''}" onclick="filterCohort('${c}')">${c}기</button>`;
        });
        container.innerHTML = html;
    };

    window.filterCohort = (cohort) => {
        currentCohortFilter = cohort;
        initAdminPage(); // Re-render with filter
    };

    const renderCohortList = (users) => {
        const list = document.getElementById('admin-cohort-list');
        if (!list) return;

        let filtered = users.filter(u => u.role === 'believer' && u.isApproved);

        if (currentCohortFilter !== 'all') {
            filtered = filtered.filter(u => u.cohort === currentCohortFilter);
        }

        if (filtered.length === 0) {
            list.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">표시할 훈련생이 없습니다.</p>';
            return;
        }

        const todayStr = new Date().toISOString().split('T')[0];

        list.innerHTML = filtered.map(u => {
            const taskKey = `gw_task_state_${u.id}`;
            const taskState = JSON.parse(localStorage.getItem(taskKey) || '[]');
            const todayTask = taskState.find(s => s.date.split('T')[0] === todayStr) || {};

            const isPrayerDone = todayTask.prayer;
            // QT logic if needed

            return `
            <div class="member-card">
                <div class="member-info">
                    <h4>${u.name}</h4>
                    <p>${u.cohort}기 | ${u.birth}</p>
                    <div class="member-stats">
                        <span class="mini-stat" style="color: ${isPrayerDone ? 'var(--primary)' : 'var(--text-muted)'}; background: ${isPrayerDone ? 'var(--primary-light)' : '#f0f0f0'}">기도 ${isPrayerDone ? '완료' : '-'}</span>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    };

    // --- Admin Prayer View ---
    const renderAdminPrayers = (users) => {
        const listContainer = document.getElementById('admin-prayers-list');
        const filterContainer = document.getElementById('admin-prayers-filters');
        if (!listContainer) return;

        // 1. Filters
        if (filterContainer) {
            const cohorts = [...new Set(users.filter(u => u.role === 'believer' && u.isApproved && u.cohort).map(u => u.cohort))].sort();
            let html = `<button class="cohort-chip ${adminFilterPrayer === 'all' ? 'active' : ''}" onclick="filterAdminPrayer('all')">전체</button>`;
            cohorts.forEach(c => {
                html += `<button class="cohort-chip ${adminFilterPrayer === c ? 'active' : ''}" onclick="filterAdminPrayer('${c}')">${c}기</button>`;
            });
            filterContainer.innerHTML = html;
        }

        // 2. Data Aggregation
        let allPrayers = [];
        const targetUsers = adminFilterPrayer === 'all'
            ? users.filter(u => u.role === 'believer' && u.isApproved)
            : users.filter(u => u.role === 'believer' && u.isApproved && u.cohort === adminFilterPrayer);

        targetUsers.forEach(u => {
            const userPrayers = JSON.parse(localStorage.getItem(`gw_prayer_journal_${u.id}`) || '[]');
            userPrayers.forEach(p => {
                allPrayers.push({ ...p, userName: u.name, userCohort: u.cohort, userId: u.id });
            });
        });

        // 3. Render
        if (allPrayers.length === 0) {
            listContainer.innerHTML = '<div class="empty-state"><p>등록된 기도제목이 없습니다.</p></div>';
            return;
        }

        // Sort by date desc
        allPrayers.sort((a, b) => new Date(b.date) - new Date(a.date));

        listContainer.innerHTML = allPrayers.map(p => `
            <div class="member-card" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
                    <div class="member-info">
                        <h4>${p.userName} (${p.userCohort}기)</h4>
                        <span style="font-size: 12px; color: var(--text-muted);">${new Date(p.date).toLocaleDateString()}</span>
                    </div>
                    <span class="prayer-tag">${p.isAnswered ? '응답됨' : '기도 중'}</span>
                </div>
                <div style="background: var(--bg-main); padding: 12px; border-radius: 8px; width: 100%; font-size: 14px; line-height: 1.5;">
                    ${p.desc}
                </div>
            </div>
        `).join('');
    };

    window.filterAdminPrayer = (cohort) => {
        adminFilterPrayer = cohort;
        initAdminPage();
    };

    // --- Admin Sermon View ---
    const renderAdminSermons = (users) => {
        const listContainer = document.getElementById('admin-sermons-list');
        const filterContainer = document.getElementById('admin-sermons-filters');
        if (!listContainer) return;

        // 1. Filters
        if (filterContainer) {
            const cohorts = [...new Set(users.filter(u => u.role === 'believer' && u.isApproved && u.cohort).map(u => u.cohort))].sort();
            let html = `<button class="cohort-chip ${adminFilterSermon === 'all' ? 'active' : ''}" onclick="filterAdminSermon('all')">전체</button>`;
            cohorts.forEach(c => {
                html += `<button class="cohort-chip ${adminFilterSermon === c ? 'active' : ''}" onclick="filterAdminSermon('${c}')">${c}기</button>`;
            });
            filterContainer.innerHTML = html;
        }

        // 2. Data Aggregation
        let allSermons = [];
        const targetUsers = adminFilterSermon === 'all'
            ? users.filter(u => u.role === 'believer' && u.isApproved)
            : users.filter(u => u.role === 'believer' && u.isApproved && u.cohort === adminFilterSermon);

        targetUsers.forEach(u => {
            const userSermons = JSON.parse(localStorage.getItem(`gw_sermon_notes_${u.id}`) || '[]');
            userSermons.forEach(s => {
                allSermons.push({ ...s, userName: u.name, userCohort: u.cohort, userId: u.id });
            });
        });

        // 3. Render
        if (allSermons.length === 0) {
            listContainer.innerHTML = '<div class="empty-state"><p>등록된 설교 요약이 없습니다.</p></div>';
            return;
        }

        allSermons.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));

        listContainer.innerHTML = allSermons.map(s => `
            <div class="member-card" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
                    <div class="member-info">
                        <h4>${s.userName} (${s.userCohort}기)</h4>
                        <span style="font-size: 12px; color: var(--text-muted);">${new Date(s.createdDate).toLocaleDateString()}</span>
                    </div>
                </div>
                <div style="width: 100%;">
                    <h5 style="font-size: 15px; font-weight: 700; margin-bottom: 4px;">${s.title}</h5>
                    <p style="font-size: 13px; color: var(--text-main); line-height: 1.5; white-space: pre-wrap;">${s.content}</p>
                </div>
            </div>
        `).join('');
    };

    window.filterAdminSermon = (cohort) => {
        adminFilterSermon = cohort;
        initAdminPage();
    };

    // --- Admin Member Management ---
    const renderAdminMembers = (users) => {
        const listContainer = document.getElementById('admin-members-list');
        const filterContainer = document.getElementById('admin-members-filters');
        if (!listContainer) return;

        // 1. Filters (Group by cohort)
        if (filterContainer) {
            const cohorts = [...new Set(users.filter(u => u.role === 'believer' && u.isApproved && u.cohort).map(u => u.cohort))].sort();
            let html = `<button class="cohort-chip ${adminFilterMember === 'all' ? 'active' : ''}" onclick="filterAdminMember('all')">전체</button>`;
            cohorts.forEach(c => {
                html += `<button class="cohort-chip ${adminFilterMember === c ? 'active' : ''}" onclick="filterAdminMember('${c}')">${c}기</button>`;
            });
            filterContainer.innerHTML = html;
        }

        // 2. Filter Users
        let targetUsers = users.filter(u => u.role === 'believer' && u.isApproved);
        if (adminFilterMember !== 'all') {
            targetUsers = targetUsers.filter(u => u.cohort === adminFilterMember);
        }

        if (targetUsers.length === 0) {
            listContainer.innerHTML = '<div class="empty-state"><p>조회된 회원이 없습니다.</p></div>';
            return;
        }

        // 3. Render List
        // Sort: Active first, Graduated last
        targetUsers.sort((a, b) => (a.isGraduated === b.isGraduated) ? 0 : a.isGraduated ? 1 : -1);

        listContainer.innerHTML = targetUsers.map(u => `
            <div class="member-card" onclick="openAdminMemberModal('${u.id}')" style="cursor: pointer; opacity: ${u.isGraduated ? 0.6 : 1}">
                <div class="member-info">
                    <h4>${u.name} <span class="prayer-tag" style="font-size:11px; padding:2px 8px;">${u.cohort}기</span> ${u.isGraduated ? '<span class="prayer-tag answered">수료</span>' : ''}</h4>
                    <p>${u.birth} | ID: ${u.id}</p>
                </div>
                <div class="member-actions">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </div>
            </div>
        `).join('');
    };

    window.filterAdminMember = (cohort) => {
        adminFilterMember = cohort;
        initAdminPage();
    };

    // --- Admin Member Edit Modal ---
    let editingMemberId = null;

    window.openAdminMemberModal = (userId) => {
        const users = JSON.parse(localStorage.getItem('gw_registered_users') || '[]');
        const user = users.find(u => u.id === userId);
        if (!user) return;

        editingMemberId = userId;
        document.getElementById('edit-member-id').value = user.id;
        document.getElementById('edit-member-name').value = user.name;
        document.getElementById('edit-member-cohort').value = user.cohort;

        const btnGrad = document.getElementById('btn-graduate-member');
        if (user.isGraduated) {
            btnGrad.innerText = '수료 취소 (다시 훈련생으로)';
            btnGrad.style.color = '#FF7E67';
        } else {
            btnGrad.innerText = '수료 처리 (졸업)';
            btnGrad.style.color = 'var(--text-main)';
        }

        document.getElementById('admin-member-modal').classList.add('active');
    };

    window.closeAdminMemberModal = () => {
        document.getElementById('admin-member-modal').classList.remove('active');
        editingMemberId = null;
    };

    window.saveMemberChanges = () => {
        if (!editingMemberId) return;
        const newCohort = document.getElementById('edit-member-cohort').value.trim();

        let users = JSON.parse(localStorage.getItem('gw_registered_users') || '[]');
        const idx = users.findIndex(u => u.id === editingMemberId);
        if (idx > -1) {
            users[idx].cohort = newCohort;
            localStorage.setItem('gw_registered_users', JSON.stringify(users));
            alert('정보가 수정되었습니다.');
            closeAdminMemberModal();
            initAdminPage();
        }
    };

    window.resetMemberPassword = () => {
        if (!confirm('비밀번호를 "1234"로 초기화하시겠습니까?')) return;

        let users = JSON.parse(localStorage.getItem('gw_registered_users') || '[]');
        const idx = users.findIndex(u => u.id === editingMemberId);
        if (idx > -1) {
            users[idx].pw = '1234';
            localStorage.setItem('gw_registered_users', JSON.stringify(users));
            alert('비밀번호가 "1234"로 초기화되었습니다.');
        }
    };

    window.toggleGraduateStatus = () => {
        if (!editingMemberId) return;

        let users = JSON.parse(localStorage.getItem('gw_registered_users') || '[]');
        const idx = users.findIndex(u => u.id === editingMemberId);
        if (idx > -1) {
            const isGrad = !!users[idx].isGraduated;
            const msg = isGrad ? '수료를 취소하고 훈련생으로 복귀시키겠습니까?' : '이 훈련생을 수료 처리하시겠습니까?\n(통계에서 제외됨)';

            if (confirm(msg)) {
                users[idx].isGraduated = !isGrad;
                localStorage.setItem('gw_registered_users', JSON.stringify(users));
                alert(users[idx].isGraduated ? '수료 처리되었습니다.' : '훈련생으로 복귀되었습니다.');
                closeAdminMemberModal();
                initAdminPage();
            }
        }
    };

    const checkAuth = () => {
        const overlay = document.getElementById('auth-overlay');
        const path = window.location.pathname;
        const pageName = path.split('/').pop() || 'index.html';
        const registeredUsers = JSON.parse(localStorage.getItem('gw_registered_users') || '[]');
        const user = registeredUsers.find(u => u.id === userId);

        const isUserPage = path.includes('/user/');
        const isAdminPage = path.includes('/admin/');
        const isRootPage = !isUserPage && !isAdminPage;

        if (!userId || (user && !user.isApproved)) {
            // Not logged in
            if (isRootPage) {
                if (overlay) overlay.classList.add('active');
                if (user && !user.isApproved) goToAuthStep('final');
            } else {
                // Redirect to login
                window.location.href = '../index.html';
            }
        } else {
            // Logged in
            if (isRootPage) {
                // Already logged in at login page, redirect to Dashboard/Home
                if (user.role === 'pastor') {
                    window.location.href = 'admin/dashboard.html';
                } else {
                    window.location.href = 'user/home.html';
                }
            } else if (isUserPage) {
                if (user.role === 'pastor') {
                    window.location.href = '../admin/dashboard.html';
                } else {
                    initPage();
                }
            } else if (isAdminPage) {
                if (user.role !== 'pastor') {
                    window.location.href = '../user/home.html';
                } else {
                    initAdminPage();
                }
            }

            // Force update UI after role check
            setTimeout(updateNavUI, 50);
        }
    };

    checkAuth();
});
