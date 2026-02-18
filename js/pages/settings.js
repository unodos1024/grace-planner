
(() => {
    const user = window.Auth.getCurrentUser();
    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth(); // 0-11

    // 사용자 정보 업데이트
    const updateUserInfo = () => {
        if (!user) return;
        const nameEl = document.getElementById('settings-name');
        const roleEl = document.getElementById('settings-role');
        const avatarEl = document.getElementById('settings-avatar');

        if (nameEl) nameEl.innerText = user.name;
        if (roleEl) roleEl.innerText = user.role === 'pastor' ? '목회자' : user.cohort + '기 훈련생';
        if (avatarEl) avatarEl.innerText = user.name[0];
    };

    // 주간 기도시간 그리드 렌더링
    const renderPrayerWeek = () => {
        const container = document.getElementById('prayer-week-grid');
        if (!container) return;

        const userId = window.Auth.getCurrentUserId();
        const key = userId ? `${window.CONFIG.STORAGE_KEYS.TASK_STATE_PREFIX}${userId}` : 'gw_task_state';
        const localTaskState = window.Utils.getStorageItem(key, []);

        const weekData = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const local = localTaskState.find(s => s.date.split('T')[0] === dateStr) || {
                prayerDuration: 0
            };
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const dateDisplay = `${month}/${day}`;
            const duration = local.prayerDuration || 0;

            weekData.push({
                dateDisplay,
                duration,
                isToday: i === 0
            });
        }

        container.innerHTML = weekData.map(data => `
            <div class="prayer-day-column">
                <div class="prayer-day-box ${data.isToday ? 'today' : ''}">
                    <span class="time">${data.duration}</span>
                    <span class="unit">min</span>
                </div>
                <div class="prayer-day-label ${data.isToday ? 'today' : ''}">${data.dateDisplay}</div>
            </div>
        `).join('');

        // PC 마우스 드래그 스크롤 기능
        let isDown = false;
        let startX;
        let scrollLeft;

        container.addEventListener('mousedown', (e) => {
            isDown = true;
            container.style.cursor = 'grabbing';
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
            e.preventDefault();
        });

        container.addEventListener('mouseleave', () => {
            isDown = false;
            container.style.cursor = 'grab';
        });

        container.addEventListener('mouseup', () => {
            isDown = false;
            container.style.cursor = 'grab';
        });

        container.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 2.5;
            container.scrollLeft = scrollLeft - walk;
        });

        requestAnimationFrame(() => {
            container.scrollLeft = container.scrollWidth;
        });
    };

    // 달력 렌더링
    const renderCalendar = () => {
        const calendarBody = document.getElementById('calendar-body');
        const currentMonthEl = document.getElementById('current-month');
        if (!calendarBody) return;

        if (currentMonthEl) {
            currentMonthEl.innerText = `${currentYear}년 ${currentMonth + 1}월`;
        }

        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();

        const allUsers = window.Utils.getStorageItem('gw_registered_users', []);

        const birthdaysThisMonth = allUsers.filter(u => {
            if (!u.birth) return false;
            let mm;
            if (u.birth.includes('-') && u.birth.length === 10) {
                mm = parseInt(u.birth.substring(5, 7));
            } else if (u.birth.length === 6) {
                mm = parseInt(u.birth.substring(2, 4));
            } else {
                return false;
            }
            return mm === (currentMonth + 1);
        }).map(u => {
            let dd;
            if (u.birth.includes('-')) {
                dd = parseInt(u.birth.substring(8, 10));
            } else {
                dd = parseInt(u.birth.substring(4, 6));
            }
            return {
                day: dd,
                name: u.name,
                cohort: u.cohort
            };
        });

        let html = '';
        let dayCounter = 1;

        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const cellIndex = week * 7 + day;

                if (cellIndex < startDayOfWeek || dayCounter > daysInMonth) {
                    html += '<div class="calendar-day empty"></div>';
                } else {
                    const today = new Date();
                    const isToday = today.getFullYear() === currentYear &&
                        today.getMonth() === currentMonth &&
                        today.getDate() === dayCounter;

                    const birthday = birthdaysThisMonth.find(b => b.day === dayCounter);
                    const hasBirthday = !!birthday;

                    html += `
                        <div class="calendar-day ${isToday ? 'today' : ''} ${hasBirthday ? 'has-birthday' : ''}" 
                             onclick="selectCalendarDate(${dayCounter})">
                            ${dayCounter}
                        </div>
                    `;
                    dayCounter++;
                }
            }
            if (dayCounter > daysInMonth) break;
        }

        calendarBody.innerHTML = html;
        renderBirthdayList(birthdaysThisMonth);
    };

    // 날짜 선택 인터랙션
    window.selectCalendarDate = (day) => {
        document.querySelectorAll('.calendar-day').forEach(el => {
            el.classList.remove('selected');
            if (el.innerText === String(day)) {
                el.classList.add('selected');
            }
        });
    };

    // 생일자 목록 렌더링 (Mini-Card Style)
    const renderBirthdayList = (birthdays) => {
        const listEl = document.getElementById('birthday-list');
        if (!listEl) return;

        if (birthdays.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-soft); font-size: 13px; padding: 24px 0;">이번 달 생일자가 없습니다.</p>';
            return;
        }

        birthdays.sort((a, b) => a.day - b.day);

        listEl.innerHTML = birthdays.map(b => `
            <div class="birthday-mini-card">
                <div class="birthday-date-badge">${b.day}일</div>
                <div class="birthday-user-info">
                    <span class="birthday-user-name">${b.name}님</span>
                    <span class="birthday-user-cohort">${b.cohort || '?'}기 훈련생</span>
                </div>
            </div>
        `).join('');
    };

    // 월 변경
    window.changeMonth = (delta) => {
        currentMonth += delta;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        } else if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    };

    // Oracle DB 사용자 목록 조회
    const fetchOracleUsers = async () => {
        const container = document.getElementById('oracle-user-list');
        if (!container) return;

        try {
            // window.apiCall은 js/config.js에 정의됨
            const users = await window.apiCall('/users');

            if (users && users.length > 0) {
                container.innerHTML = users.map(u => `
                    <div class="oracle-user-item">
                        <span class="user-id">ID: ${u.id}</span>
                        <span class="user-name">${u.name}</span>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="empty-text">조회된 사용자가 없습니다.</p>';
            }
        } catch (error) {
            console.error('Failed to fetch Oracle users:', error);
            container.innerHTML = '<p class="error-text">데이터를 불러오는데 실패했습니다.</p>';
        }
    };

    // 초기화
    updateUserInfo();

    if (user && user.role === 'pastor') {
        const prayerSection = document.getElementById('settings-prayer-section');
        if (prayerSection) prayerSection.style.display = 'none';
    } else {
        renderPrayerWeek();
    }

    renderCalendar();
    fetchOracleUsers();
})();

