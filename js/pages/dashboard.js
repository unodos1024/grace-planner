
(() => {
    // Determine initial tab from URL if possible
    const urlParams = new URLSearchParams(window.location.search);
    const initialPage = urlParams.get('page') || 'overview';
    const adminTabs = ['overview', 'prayers', 'schedule', 'stats', 'members', 'notices', 'settings'];

    let currentAdminTab = adminTabs.includes(initialPage) ? initialPage : 'overview';
    if (initialPage === 'dashboard') currentAdminTab = 'overview';

    let adminFilterPrayer = 'all';
    let adminFilterMember = 'all';
    let currentCohortFilter = null;
    let adminCurrentScheduleWeek = 1;
    let dashboardFilter = 'all'; // Smart filter state
    let currentMemberTab = 'believer';

    window.switchMemberTab = (tab) => {
        currentMemberTab = tab;
        ['believer', 'pastor', 'pending'].forEach(t => {
            const btn = document.getElementById(`btn-member-tab-${t}`);
            if (btn) {
                btn.classList.toggle('active', t === tab);
            }
        });
        initAdminPage();
    };

    window.setDashboardFilter = (filter) => {
        dashboardFilter = filter;
        document.querySelectorAll('.filter-chip').forEach(btn => {
            btn.classList.toggle('active', btn.id === `f-${filter}`);
        });
        initAdminPage();
    };

    const renderAdminInsights = (users, week) => {
        const cohortUsers = users.filter(u => u.role === 'believer' && u.isApproved && String(u.cohort) === currentCohortFilter);
        if (cohortUsers.length === 0) return;

        const cohortInfo = window.Utils.getStorageItem('gw_cohort_schedule', { startDate: '2026-02-08' });
        const startDate = new Date(cohortInfo.startDate);
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + ((week - 1) * 7));
        const dayOfWeek = weekStart.getDay();
        const sunday = new Date(weekStart);
        sunday.setDate(weekStart.getDate() - dayOfWeek);
        sunday.setHours(0, 0, 0, 0);
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 7);

        const isReadingWeek = (week % 3 === 0);
        let totalDailyPossible = cohortUsers.length * 14; // 7 days * (Prayer + QT)
        let totalWeeklyPossible = cohortUsers.length * (3 + (isReadingWeek ? 1 : 0));
        let totalDailyDone = 0;
        let totalWeeklyDone = 0;
        let totalAttendanceDone = 0;

        cohortUsers.forEach(u => {
            const taskKey = `${window.CONFIG.STORAGE_KEYS.TASK_STATE_PREFIX}${u.id}`;
            const userTasks = window.Utils.getStorageItem(taskKey, []);
            const weekTasks = userTasks.filter(s => {
                const d = new Date(s.date);
                return d >= monday && d < nextMonday;
            });

            // Daily Stats
            totalDailyDone += weekTasks.filter(s => s.prayer).length;
            totalDailyDone += weekTasks.filter(s => s.bible).length;

            // Weekly Stats
            if (weekTasks.some(s => s.qt)) totalWeeklyDone++; // Memorization
            if (weekTasks.some(s => s.summary)) totalWeeklyDone++;
            if (weekTasks.some(s => s.phone)) totalWeeklyDone++;
            if (isReadingWeek && weekTasks.some(s => s.book || s.reading)) totalWeeklyDone++;

            // Attendance Stats
            if (weekTasks.some(s => s.attendance)) totalAttendanceDone++;
        });

        const dailyRate = Math.round((totalDailyDone / totalDailyPossible) * 100) || 0;
        const weeklyRate = Math.round((totalWeeklyDone / totalWeeklyPossible) * 100) || 0;
        const attendanceRate = Math.round((totalAttendanceDone / cohortUsers.length) * 100) || 0;

        const setBar = (id, val) => {
            const bar = document.getElementById(`chart-bar-${id}`);
            const text = document.getElementById(`chart-val-${id}`);
            if (bar) bar.style.width = `${val}%`;
            if (text) text.innerText = `${val}%`;
        };

        setBar('daily', dailyRate);
        setBar('weekly', weeklyRate);
        setBar('attendance', attendanceRate);
    };

    // Utility: Drag Scroll for filters
    const enableDragScroll = (id) => {
        const slider = document.getElementById(id);
        if (!slider) return;

        let isDown = false;
        let startX;
        let scrollLeft;

        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            slider.classList.add('active');
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });
        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.classList.remove('active');
        });
        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.classList.remove('active');
        });
        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2;
            slider.scrollLeft = scrollLeft - walk;
        });
    };

    const initModal = () => {
        const root = document.getElementById('modal-root');
        if (root) {
            ['admin-member-modal', 'admin-member-edit-modal', 'notice-modal', 'admin-history-list-modal', 'admin-content-detail-modal', 'schedule-form-modal', 'schedule-detail-modal'].forEach(id => {
                const m = document.getElementById(id);
                if (m) root.appendChild(m);
            });
        }

        const roleSelect = document.getElementById('edit-member-system-role');
        if (roleSelect) {
            roleSelect.addEventListener('change', (e) => {
                const cohortGroup = document.getElementById('edit-member-cohort-group');
                if (cohortGroup) {
                    cohortGroup.style.display = (e.target.value === 'pastor') ? 'none' : 'block';
                }
            });
        }

        const adminMemberFilter = document.getElementById('admin-members-filters');
        if (adminMemberFilter) enableDragScroll('admin-members-filters');
    };

    let currentScheduleView = 'calendar';
    let calendarDate = new Date();
    let adminSchedules = [];

    const initAdminPage = () => {
        const registeredUsers = window.Utils.getStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, []);
        adminSchedules = window.Utils.getStorageItem('gw_admin_church_schedules', []);

        // Update Nav UI visibility for tabs
        document.querySelectorAll('.admin-view').forEach(v => {
            v.classList.toggle('hidden', v.id !== `admin-view-${currentAdminTab}`);
            v.classList.toggle('active', v.id === `admin-view-${currentAdminTab}`);
        });

        // Initialize Week Selectors (Overview + Members tabs)
        const cohortInfo = window.Utils.getStorageItem('gw_cohort_schedule', { startDate: '2026-02-08' });
        const startDateForWeek = new Date(cohortInfo.startDate);
        const today = new Date();
        const diffDays = Math.floor((today - startDateForWeek) / (1000 * 60 * 60 * 24));
        const currentWeek = Math.max(1, Math.min(32, Math.floor(diffDays / 7) + 1));

        let weekOptions = '';
        for (let i = 1; i <= 32; i++) {
            weekOptions += `<option value="${i}" ${i === currentWeek ? 'selected' : ''}>${i}주차</option>`;
        }

        ['admin-cohort-week-select'].forEach(id => {
            const sel = document.getElementById(id);
            if (sel && sel.options.length === 0) sel.innerHTML = weekOptions;
        });

        // Render Active Tab Content
        if (currentAdminTab === 'overview') {
            renderPendingList(registeredUsers);
            renderCohortFilters(registeredUsers);
            renderCohortList(registeredUsers);
        } else if (currentAdminTab === 'prayers') {
            renderAdminPrayers(registeredUsers);
        } else if (currentAdminTab === 'schedule') {
            renderAdminSchedule();
        } else if (currentAdminTab === 'stats') {
            renderAdminStats(registeredUsers);
        } else if (currentAdminTab === 'members') {
            renderAdminMembers(registeredUsers);
        } else if (currentAdminTab === 'notices') {
            renderAdminNotices();
        }
    };


    window.handleAdminTabSwitch = (tab) => {
        currentAdminTab = tab;
        document.querySelectorAll('#mobile-nav-container .nav-item, #sidebar-nav-list .sidebar-item').forEach(btn => {
            const btnTab = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
            btn.classList.toggle('active', btnTab === tab);
        });

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
            <div class="gw-card" style="display: flex; justify-content: space-between; align-items: center; border-color: var(--accent); background: #FFFBF7;">
                <div>
                    <h4 class="gw-card-title">${u.name} <span class="gw-card-label" style="background: var(--accent); color: white; margin-left: 8px;">승인 대기</span></h4>
                    <p class="gw-card-desc">${u.role === 'pastor' ? '목회자' : `${u.cohort}기 | ${u.birth}`}</p>
                </div>
                <button class="btn-start" style="position: static; padding: 10px 20px; font-size: 13px;" onclick="handleApproveUser('${u.id}')">승인하기</button>
            </div>
        `).join('');
    };

    window.handleApproveUser = (targetId) => {
        // 승인 버튼 클릭 시 바로 승인하지 않고, 기수 등 정보를 입력할 수 있게 모달을 엽니다.
        window.openAdminMemberEditModal(targetId);
    };

    window.handleRejectUser = (targetId) => {
        if (!confirm('가입 요청을 거절하고 삭제하시겠습니까?')) return;
        let registeredUsers = window.Utils.getStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, []);
        registeredUsers = registeredUsers.filter(u => u.id !== targetId);
        window.Utils.setStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, registeredUsers);
        window.Utils.showToast('가입이 취소/삭제되었습니다.');
        if (window.updatePendingBadge) window.updatePendingBadge();
        initAdminPage();
    };

    const renderCohortFilters = (users) => {
        const container = document.getElementById('admin-cohort-filters');
        if (!container) return;

        const cohorts = [...new Set(users.filter(u => u.role === 'believer' && u.isApproved && u.cohort).map(u => u.cohort))]
            .sort((a, b) => b - a); // Reverse order

        if (cohorts.length > 0 && !currentCohortFilter) {
            currentCohortFilter = String(cohorts[0]);
        }

        let html = '';
        cohorts.forEach(c => {
            html += `<button class="cohort-chip ${currentCohortFilter === String(c) ? 'active' : ''}" onclick="filterCohort('${c}')">${c}기</button>`;
        });
        container.innerHTML = html;
        enableDragScroll('admin-cohort-filters');
    };

    window.filterCohort = (cohort) => {
        currentCohortFilter = String(cohort);
        initAdminPage();
    };

    const renderCohortList = (users) => {
        const list = document.getElementById('admin-cohort-list');
        if (!list) return;

        if (!currentCohortFilter) {
            list.innerHTML = `<div class="empty-state">...</div>`;
            return;
        }

        const cohortInfo = window.Utils.getStorageItem('gw_cohort_schedule', { startDate: '2026-02-08' });
        const startDate = new Date(cohortInfo.startDate);
        const weekSelect = document.getElementById('admin-cohort-week-select');
        const selectedWeek = weekSelect ? parseInt(weekSelect.value) : 1;

        const weekStartOffset = (selectedWeek - 1) * 7;
        const weekStartDate = new Date(startDate);
        weekStartDate.setDate(startDate.getDate() + weekStartOffset);

        // Find Monday of that week
        const day = weekStartDate.getDay();
        const diff = weekStartDate.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(weekStartDate.setDate(diff));
        monday.setHours(0, 0, 0, 0);

        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);

        let filtered = users.filter(u => u.role === 'believer' && u.isApproved && String(u.cohort) === currentCohortFilter);

        // Apply Smart Filters
        if (dashboardFilter === 'unsubmitted') {
            filtered = filtered.filter(u => {
                const taskKey = `${window.CONFIG.STORAGE_KEYS.TASK_STATE_PREFIX}${u.id}`;
                const userTasks = window.Utils.getStorageItem(taskKey, []);
                const weekTasks = userTasks.filter(s => {
                    const d = new Date(s.date);
                    return d >= monday && d < nextMonday;
                });
                const missionsDone = (weekTasks.some(s => s.qt) ? 1 : 0) +
                    (weekTasks.some(s => s.summary) ? 1 : 0) +
                    (weekTasks.some(s => s.phone) ? 1 : 0) +
                    (weekTasks.some(s => s.prep) ? 1 : 0);
                return missionsDone < 4;
            });
        } else if (dashboardFilter === 'absent') {
            filtered = filtered.filter(u => {
                const taskKey = `${window.CONFIG.STORAGE_KEYS.TASK_STATE_PREFIX}${u.id}`;
                const userTasks = window.Utils.getStorageItem(taskKey, []);
                return !userTasks.some(s => {
                    const d = new Date(s.date);
                    return d >= monday && d < nextMonday && s.attendance;
                });
            });
        } else if (dashboardFilter === 'birthday') {
            const today = new Date();
            const todayMonth = today.getMonth() + 1;
            const todayDate = today.getDate();
            filtered = filtered.filter(u => {
                if (!u.birth) return false;
                const [y, m, d] = u.birth.split('-').map(Number);
                // Check if birthday falls in the current week (Sunday to Saturday)
                const bYear = today.getFullYear();
                const bDate = new Date(bYear, m - 1, d);
                return bDate >= monday && bDate < nextMonday;
            });
        }

        filtered.sort((a, b) => a.name.localeCompare(b.name));

        if (filtered.length === 0) {
            list.innerHTML = `<div class="empty-state"><p class="empty-state-text">조건에 맞는 훈련생이 없습니다.</p></div>`;
            return;
        }

        list.innerHTML = filtered.map(u => {
            const taskKey = `${window.CONFIG.STORAGE_KEYS.TASK_STATE_PREFIX}${u.id}`;
            const userTasks = window.Utils.getStorageItem(taskKey, []);

            let dayItemsHtml = '';
            const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];

            const weekTasks = userTasks.filter(s => {
                const d = new Date(s.date);
                return d >= monday && d < nextMonday;
            });

            const isAttended = weekTasks.some(s => s.attendance);
            const hasMemo = weekTasks.some(s => s.qt);
            const hasSummary = weekTasks.some(s => s.summary);
            const hasPhone = weekTasks.some(s => s.phone);
            const hasPrep = weekTasks.some(s => s.prep);
            const isReadingWeek = (selectedWeek % 3 === 0);
            const hasReadingMission = weekTasks.some(s => s.book || s.reading_report);

            let totalMissions = 4;
            let completedMissions = (hasMemo ? 1 : 0) + (hasSummary ? 1 : 0) + (hasPhone ? 1 : 0) + (hasPrep ? 1 : 0);
            const progressPercent = Math.round((completedMissions / totalMissions) * 100);
            const allDone = completedMissions >= totalMissions;

            // Birthday check for icon
            let isBirthWeek = false;
            if (u.birth) {
                const [by, bm, bd] = u.birth.split('-').map(Number);
                const bCurrent = new Date(monday.getFullYear(), bm - 1, bd);
                isBirthWeek = bCurrent >= monday && bCurrent < nextMonday;
            }

            const todayStr = new Date().toDateString();

            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                const dStr = d.toISOString().split('T')[0];
                const dayData = userTasks.find(s => s.date.split('T')[0] === dStr) || {};
                const isToday = d.toDateString() === todayStr;

                dayItemsHtml += `
                <div class="day-item ${isToday ? 'active' : ''}">
                    <span class="day-name">${dayLabels[i]}</span>
                    <div class="day-dots">
                        <div class="dot prayer ${dayData.prayer ? 'done' : ''}"></div>
                        <div class="dot bible ${dayData.bible ? 'done' : ''}"></div>
                        <div class="dot reading ${dayData.reading ? 'done' : ''}"></div>
                    </div>
                </div>
            `;
            }

            return `
            <div class="cohort-member-card admin-compact card-style">
                <div class="admin-compact-header">
                    <div class="member-profile-mini" onclick="handleToggleAttendance('${u.id}', '${monday.toISOString()}')" style="cursor: pointer;" title="클릭하여 출석 토글">
                        <div class="avatar-circle-sm" style="${isAttended ? 'background: var(--primary); color: white;' : ''}">
                            ${isAttended ? '出' : u.name[0]}
                        </div>
                        <div class="member-name-sm">${u.name}${isBirthWeek ? ' 🎂' : ''}</div>
                    </div>

                    <div style="display: flex; gap: 8px;">
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
                            <span class="weekly-label">주간미션</span>
                        </div>
                        ${isReadingWeek ? `
                            <div class="weekly-summary-item">
                                <div class="weekly-progress-circle ${hasReadingMission ? 'all-done' : ''}" style="--progress: ${hasReadingMission ? 100 : 0};">
                                    ${hasReadingMission ? `
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                            <path d="M20 6L9 17l-5-5" />
                                        </svg>
                                    ` : `
                                        <span style="font-size: 11px; font-weight: 800; color: var(--text-soft); font-family: 'Outfit';">
                                            0/1
                                        </span>
                                    `}
                                </div>
                                <span class="weekly-label">독후감</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="admin-compact-body">
                    <div class="days-container-mini">
                        ${dayItemsHtml}
                    </div>
                </div>
            </div>
        `;
        }).join('');
    };

    window.handleToggleAttendance = (userId, mondayIso) => {
        const taskKey = `${window.CONFIG.STORAGE_KEYS.TASK_STATE_PREFIX}${userId}`;
        const userTasks = window.Utils.getStorageItem(taskKey, []);
        const monday = new Date(mondayIso);
        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);

        const weekTaskIndex = userTasks.findIndex(s => {
            const d = new Date(s.date);
            return d >= monday && d < nextMonday && s.attendance !== undefined;
        });

        if (weekTaskIndex > -1) {
            userTasks[weekTaskIndex].attendance = !userTasks[weekTaskIndex].attendance;
        } else {
            const existingTaskInWeek = userTasks.find(s => {
                const d = new Date(s.date);
                return d >= monday && d < nextMonday;
            });

            if (existingTaskInWeek) {
                existingTaskInWeek.attendance = true;
            } else {
                userTasks.push({
                    date: monday.toISOString(),
                    attendance: true
                });
            }
        }

        window.Utils.setStorageItem(taskKey, userTasks);
        initAdminPage();
        window.Utils.showToast('출석 상태가 변경되었습니다.');
    };

    // --- History List Modal Logic ---
    window.openAdminHistoryListModal = (data) => {
        const modal = document.getElementById('admin-history-list-modal');
        const titleEl = document.getElementById('admin-history-list-title');
        const avatarEl = document.getElementById('admin-history-user-avatar');
        const nameEl = document.getElementById('admin-history-user-name');
        const infoEl = document.getElementById('admin-history-info');
        const container = document.getElementById('admin-history-items-container');

        if (!modal || !container) return;

        titleEl.innerText = data.type === 'prayer' ? '기도제목 기록' : '설교요약 기록';
        avatarEl.innerText = data.user.name[0];
        nameEl.innerText = data.user.name;
        infoEl.innerText = `${data.user.cohort}기 훈련생`;

        container.innerHTML = data.items.map(item => {
            const dateStr = new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            const content = data.type === 'prayer' ? item.desc : item.content;
            const snippet = content.replace(/\n/g, ' ').substring(0, 50);

            return `
                <div class="gw-card" onclick="openAdminContentDetailModal({
                    type: '${data.type}',
                    userName: '${data.user.name}',
                    cohort: '${data.user.cohort}',
                    date: '${item.date}',
                    content: \`${content.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`
                })" style="height: 52px; padding: 0 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; background: var(--bg-surface); border: 1px solid var(--border-subtle); margin:0; flex-shrink: 0;">
                    <div style="font-size: 11px; font-weight: 700; color: var(--primary); white-space: nowrap; width: 45px;">${dateStr}</div>
                    <div style="font-size: 14px; color: var(--text-main); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex:1; opacity: 0.8;">
                        ${snippet}${content.length > 50 ? '...' : ''}
                    </div>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--border-strong);"><path d="M9 18l6-6-6-6"/></svg>
                </div>
            `;
        }).join('');

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeAdminHistoryListModal = () => {
        const modal = document.getElementById('admin-history-list-modal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    // --- Content Detail Modal Logic ---
    window.openAdminContentDetailModal = (data) => {
        const modal = document.getElementById('admin-content-detail-modal');
        const titleEl = document.getElementById('admin-content-detail-title');
        const avatarEl = document.getElementById('admin-detail-user-avatar');
        const nameEl = document.getElementById('admin-detail-user-name');
        const infoEl = document.getElementById('admin-detail-info');
        const textEl = document.getElementById('admin-detail-text');

        if (!modal) return;

        titleEl.innerText = data.type === 'prayer' ? '기도제목 상세' : '설교요약 상세';
        avatarEl.innerText = data.userName[0];
        nameEl.innerText = data.userName;
        infoEl.innerText = `${data.cohort}기 | ${new Date(data.date).toLocaleDateString()}`;
        textEl.innerText = data.content;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeAdminContentDetailModal = () => {
        console.log('Closing content detail modal');
        const modal = document.getElementById('admin-content-detail-modal');
        if (modal) {
            modal.classList.remove('active');
            console.log('Class active removed');
        }
        document.body.style.overflow = '';
    };

    // --- Prayer Requests Management ---
    const renderAdminPrayers = (users) => {
        const listContainer = document.getElementById('admin-prayers-list');
        const filterContainer = document.getElementById('admin-prayers-filters');

        if (filterContainer) {
            const cohorts = [...new Set(users.filter(u => u.role === 'believer' && u.isApproved && u.cohort).map(u => u.cohort))].sort((a, b) => b - a);

            if (cohorts.length > 0 && adminFilterPrayer === 'all') {
                adminFilterPrayer = String(cohorts[0]);
            }

            let html = '';
            cohorts.forEach(c => {
                html += `<button class="cohort-chip ${adminFilterPrayer === String(c) ? 'active' : ''}" onclick="filterAdminPrayer('${c}')">${c}기</button>`;
            });
            filterContainer.innerHTML = html;
        }

        if (!listContainer) return;

        const targetUsers = users.filter(u => u.role === 'believer' && u.isApproved)
            .filter(u => String(u.cohort) === adminFilterPrayer);

        const allUserPrayers = targetUsers.map(u => {
            const key = `${window.CONFIG.STORAGE_KEYS.PRAYER_JOURNAL_PREFIX}${u.id}`;
            const prayers = window.Utils.getStorageItem(key, []);
            return { user: u, prayers: prayers };
        }).filter(entry => entry.prayers.length > 0)
            .sort((a, b) => {
                const dateA = new Date(a.prayers[0].date);
                const dateB = new Date(b.prayers[0].date);
                return dateB - dateA; // Latest first
            });

        if (allUserPrayers.length === 0) {
            listContainer.innerHTML = `<div class="sermon-empty-state"><p>기록된 기도제목이 없습니다.</p></div>`;
            return;
        }

        listContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; width: 100%;">
                ${allUserPrayers.map(entry => `
                    <div class="gw-card" onclick="openAdminHistoryListModal({type:'prayer', user: ${JSON.stringify(entry.user).replace(/"/g, '&quot;')}, items: ${JSON.stringify(entry.prayers).replace(/"/g, '&quot;')}})" 
                        style="padding: 14px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; margin: 0; min-height: 52px;">
                        <div style="font-size: 12px; font-weight: 700; color: var(--text-soft); width: 35px;">${entry.user.cohort}기</div>
                        <div style="font-size: 15px; font-weight: 700; color: var(--text-main); flex: 1;">${entry.user.name}</div>
                        <div style="font-size: 12px; color: var(--primary); font-weight: 800; background: var(--primary-light); padding: 3px 10px; border-radius: 10px;">
                            ${entry.prayers.length}건
                        </div>
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" style="color: var(--border-strong);"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                `).join('')}
            </div>
        `;
    };

    window.filterAdminPrayer = (cohort) => {
        adminFilterPrayer = String(cohort);
        initAdminPage();
    };

    window.toggleUserPrayerHistory = (userId) => {
        const history = document.getElementById(`history-${userId}`);
        const icon = document.getElementById(`icon-history-${userId}`);
        if (history) {
            const isHidden = history.classList.contains('hidden');
            history.classList.toggle('hidden');
            if (icon) icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    };

    // --- Sermon Stats Rendering ---
    // --- Sermon Stats Rendering ---
    const renderSermonStats = (allUserSermons) => {
        const dashboard = document.getElementById('admin-sermon-dashboard');
        const chartContainer = document.getElementById('admin-sermon-stats-container');
        const chartWrapper = document.getElementById('admin-sermon-chart-wrapper');
        const typeDist = document.getElementById('admin-sermon-type-dist');

        const kpiRate = document.getElementById('sermon-kpi-rate');
        const kpiTotal = document.getElementById('sermon-kpi-total');
        const typeSun = document.getElementById('stats-type-sunday');
        const typeWed = document.getElementById('stats-type-wed');

        if (!dashboard) return;

        dashboard.style.display = 'flex';
        if (chartContainer) chartContainer.style.display = 'block';
        if (typeDist) typeDist.style.display = 'flex';

        // 1. Basic Stats & Distribution
        let totalCount = 0;
        let sundayCount = 0;
        let wednesdayCount = 0;

        allUserSermons.forEach(entry => {
            totalCount += entry.sermons.length;
            sundayCount += entry.sermons.filter(s => s.type === 'sunday').length;
            wednesdayCount += entry.sermons.filter(s => s.type === 'wednesday').length;
        });

        if (kpiTotal) kpiTotal.innerText = `${totalCount}건`;
        if (typeSun) typeSun.innerText = sundayCount;
        if (typeWed) typeWed.innerText = wednesdayCount;

        // 2. Weekly Participation Chart (Last 6 Weeks)
        const weeks = {};
        const now = new Date();

        // Get last 6 Mondays
        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1) - (i * 7)); // Adjust to Monday
            d.setHours(0, 0, 0, 0);
            const label = (d.getMonth() + 1) + '/' + d.getDate();
            weeks[d.getTime()] = { label, count: 0, participants: new Set() };
        }

        // Count unique participants per week
        allUserSermons.forEach(entry => {
            entry.sermons.forEach(s => {
                const sDate = new Date(s.date);
                sDate.setHours(0, 0, 0, 0);
                const monday = new Date(sDate);
                monday.setDate(sDate.getDate() - sDate.getDay() + (sDate.getDay() === 0 ? -6 : 1)); // Adjust to Monday

                const time = monday.getTime();
                if (weeks[time]) {
                    weeks[time].participants.add(entry.user.id);
                    weeks[time].count = weeks[time].participants.size;
                }
            });
        });

        const sortedWeeks = Object.keys(weeks).sort((a, b) => a - b);
        const thisWeekTime = sortedWeeks[sortedWeeks.length - 1];
        const thisWeekCount = weeks[thisWeekTime].count;

        // Calculate Rate (This week participants / Total believers)
        const totalBelievers = window.Utils.getStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, [])
            .filter(u => u.role === 'believer' && u.isApproved && !u.isGraduated).length;

        const rate = totalBelievers > 0 ? Math.round((thisWeekCount / totalBelievers) * 100) : 0;
        if (kpiRate) kpiRate.innerText = `${rate}%`;

        // Render Chart
        const maxCount = Math.max(...sortedWeeks.map(w => weeks[w].count), 5);
        if (chartWrapper) {
            chartWrapper.innerHTML = sortedWeeks.map(w => {
                const week = weeks[w];
                const heightPerc = (week.count / maxCount) * 100;
                return `
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end;">
                        <div style="font-size: 11px; font-weight: 800; color: var(--primary);">${week.count}</div>
                        <div style="width: 100%; max-width: 32px; background: var(--primary-pale); border-radius: 6px 6px 3px 3px; height: ${heightPerc}%; position: relative; transition: height 0.8s ease; border: 1px solid var(--primary-light);">
                            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 50%; background: linear-gradient(to bottom, rgba(255,255,255,0.4), transparent); border-radius: 6px 6px 0 0;"></div>
                        </div>
                        <div style="font-size: 10px; color: var(--text-soft); font-weight: 600;">${week.label}</div>
                    </div>
                `;
            }).join('');
        }
    };

    const renderAdminStats = (users) => {
        const targetUsers = users.filter(u => u.role === 'believer' && u.isApproved);
        const allUserSermons = targetUsers.map(u => {
            const userId = u.id;
            const sunSermons = window.Utils.getStorageItem(`gw_sermon_sunday_${userId}`, []);
            const wedSermons = window.Utils.getStorageItem(`gw_sermon_wednesday_${userId}`, []);
            const all = [...sunSermons.map(s => ({ ...s, type: 'sunday' })), ...wedSermons.map(s => ({ ...s, type: 'wednesday' }))];
            return { user: u, sermons: all };
        });

        renderSermonStats(allUserSermons);
    };

    window.toggleUserSermonHistory = (userId) => {
        const history = document.getElementById(`s-history-${userId}`);
        const icon = document.getElementById(`icon-s-history-${userId}`);
        if (history) {
            const isHidden = history.classList.contains('hidden');
            history.classList.toggle('hidden');
            if (icon) icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    };

    const renderAdminMembers = (users) => {
        const listContainer = document.getElementById('admin-members-list');
        const filterContainer = document.getElementById('admin-members-filters');
        const weekWrap = document.getElementById('admin-members-week-wrap');
        const pendingBadge = document.getElementById('pending-member-badge');

        const pendingUsers = users.filter(u => !u.isApproved);

        // Update badge
        if (pendingBadge) {
            if (pendingUsers.length > 0) {
                pendingBadge.style.display = 'inline-block';
                pendingBadge.innerText = pendingUsers.length;
            } else {
                pendingBadge.style.display = 'none';
            }
        }

        // Toggle UI visibilities based on tab
        if (currentMemberTab !== 'believer') {
            if (filterContainer) filterContainer.style.display = 'none';
            if (weekWrap) weekWrap.style.display = 'none';
        } else {
            if (filterContainer) filterContainer.style.display = 'flex';
            if (weekWrap) weekWrap.style.display = 'flex';
        }

        if (!listContainer) return;

        // Render based on selected Tab
        if (currentMemberTab === 'pending') {
            if (pendingUsers.length === 0) {
                listContainer.innerHTML = `<div class="sermon-empty-state"><p>승인 대기 중인 회원이 없습니다.</p></div>`;
                return;
            }
            listContainer.innerHTML = pendingUsers.map(u => `
                <div class="gw-card" style="display: flex; justify-content: space-between; align-items: center; border: 1.5px solid #FF7E67; background: #FFFBF7; padding: 18px 20px; transition: none;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <h4 class="gw-card-title" style="font-size: 17px; margin: 0;">${u.name}</h4>
                            <span style="background: #FF7E67; color: white; padding: 2px 10px; border-radius: 8px; font-size: 12px; font-weight: 800; letter-spacing: -0.02em;">승인 대기</span>
                        </div>
                        <p class="gw-card-desc" style="font-size: 13px; font-weight: 600; color: #8E8E93; margin: 0;">
                            ${u.role === 'pastor' ? '목회자' : `${u.cohort ? u.cohort + '기' : '기수 미입력'} | ${u.birth || '생일 미상'}`}
                        </p>
                    </div>
                    <div class="member-actions-group">
                        <button class="gw-btn-secondary" style="padding: 10px 18px;" onclick="openAdminMemberEditModal('${u.id}')">상세보기</button>
                    </div>
                </div>
            `).join('');
            return;
        }

        if (currentMemberTab === 'pastor') {
            const pastorUsers = users.filter(u => u.role === 'pastor' && u.isApproved);
            if (pastorUsers.length === 0) {
                listContainer.innerHTML = `<div class="sermon-empty-state"><p>등록된 목회자가 없습니다.</p></div>`;
                return;
            }
            listContainer.innerHTML = pastorUsers.map(u => `
                <div class="gw-card" style="padding: 14px 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h4 class="gw-card-title" style="font-size: 16px; margin: 0;">${u.name} <span style="font-size: 12px; font-weight: normal; color: var(--text-soft);">(목회자)</span></h4>
                        <button onclick="openAdminMemberEditModal('${u.id}')"
                            style="
                                flex-shrink: 0;
                                padding: 6px 14px; border-radius: 10px; border: 1px solid var(--border-subtle);
                                font-size: 13px; font-weight: 800; cursor: pointer; background: var(--bg-surface); color: var(--text-main);
                            ">
                            수정
                        </button>
                    </div>
                    <div style="font-size: 12px; color: var(--text-soft); margin-top: 8px;">
                        <span>📞 ${u.phone || '미등록'}</span>
                    </div>
                </div>
            `).join('');
            return;
        }

        // --- Only Believer Tab Logic Down Here ---

        if (filterContainer) {
            const cohorts = [...new Set(users.filter(u => u.role === 'believer' && u.isApproved && u.cohort).map(u => u.cohort))].sort((a, b) => b - a);

            if (cohorts.length > 0 && adminFilterMember === 'all') {
                adminFilterMember = String(cohorts[0]);
            }

            let html = '';
            cohorts.forEach(c => {
                html += `<button class="cohort-chip ${adminFilterMember === String(c) ? 'active' : ''}" onclick="filterAdminMember('${c}')">${c}기</button>`;
            });
            filterContainer.innerHTML = html;
        }

        const targetUsers = users.filter(u => u.role === 'believer' && u.isApproved)
            .filter(u => String(u.cohort) === adminFilterMember)
            .sort((a, b) => {
                if (a.cohort !== b.cohort) return a.cohort - b.cohort;
                return a.name.localeCompare(b.name);
            });

        // --- Attendance Setup for Current Week ---
        const cohortInfo = window.Utils.getStorageItem('gw_cohort_schedule', { startDate: '2026-02-08' });
        const startDate = new Date(cohortInfo.startDate);
        const today = new Date();
        const isSunday = today.getDay() === 0;
        const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        const selectedWeek = Math.max(1, Math.min(32, Math.floor(diffDays / 7) + 1));

        const weekStartOffset = (selectedWeek - 1) * 7;
        const weekStartDate = new Date(startDate);
        weekStartDate.setDate(startDate.getDate() + weekStartOffset);

        // Find Monday of that week
        const day = weekStartDate.getDay();
        const diff = weekStartDate.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(weekStartDate.setDate(diff));
        monday.setHours(0, 0, 0, 0);

        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);

        listContainer.innerHTML = targetUsers.map(u => {

            const taskKey = `${window.CONFIG.STORAGE_KEYS.TASK_STATE_PREFIX}${u.id}`;
            const userTasks = window.Utils.getStorageItem(taskKey, []);
            const isAttended = userTasks.some(s => {
                const d = new Date(s.date);
                return d >= sunday && d < saturday && s.attendance;
            });

            // Birthday highlight
            let isBirthdayThisWeek = false;
            if (u.birth) {
                const [, bm, bd] = u.birth.split('-').map(Number);
                const bCurrent = new Date(sunday.getFullYear(), bm - 1, bd);
                isBirthdayThisWeek = bCurrent >= sunday && bCurrent < saturday;
            }

            return `
            <div class="gw-card" style="opacity: ${u.isGraduated ? 0.6 : 1}; padding: 14px 16px; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
                        <span class="gw-card-label" style="background: var(--primary-light); color: var(--primary); margin: 0; padding: 2px 6px; border-radius: 4px; font-size: 11px; flex-shrink: 0;">${u.cohort}기</span>
                        ${u.isGraduated ? '<span class="gw-card-label" style="background: var(--text-soft); color: white; margin: 0; padding: 2px 6px; border-radius: 4px; font-size: 11px; flex-shrink: 0;">수료</span>' : ''}
                        <h4 class="gw-card-title" style="font-size: 16px; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${u.name}${isBirthdayThisWeek ? ' 🎂' : ''}
                            ${u.roleTitle && u.roleTitle !== '성도' ? `<span style="font-size: 12px; font-weight: normal; color: var(--text-soft);">(${u.roleTitle})</span>` : ''}
                        </h4>
                    </div>
                    <!-- Actions -->
                    <div style="display: flex; gap: 8px;">
                        <button onclick="handleMemberAttendance('${u.id}', '${sunday.toISOString()}')"
                            ${isSunday ? '' : 'disabled title="출석 체크는 일요일에만 가능합니다"'}
                            style="
                                flex-shrink: 0;
                                padding: 6px 14px; border-radius: 10px; border: 2px solid;
                                font-size: 13px; font-weight: 800; 
                                cursor: ${isSunday ? 'pointer' : 'default'};
                                transition: all 0.2s ease;
                                opacity: ${isSunday ? 1 : 0.6};
                                ${isAttended
                    ? 'background: var(--primary); color: white; border-color: var(--primary);'
                    : 'background: var(--bg-main); color: var(--text-soft); border-color: var(--border-subtle);'}
                            ">
                            ${isAttended ? '✓ 출석' : '미출석'}
                        </button>
                        <button onclick="openAdminMemberEditModal('${u.id}')"
                            style="
                                flex-shrink: 0;
                                padding: 6px 14px; border-radius: 10px; border: 1px solid var(--border-subtle);
                                font-size: 13px; font-weight: 800; cursor: pointer; background: var(--bg-surface); color: var(--text-main);
                            ">
                            수정
                        </button>
                    </div>
                </div>
                
                <div style="display: flex; gap: 16px; font-size: 12px; color: var(--text-soft);">
                    <span>📅 ${u.birth || '-'}</span>
                    ${u.phone ? `<span style="display: flex; align-items: center; gap: 4px;">
                        📞 ${u.phone}
                        <button onclick="copyToClipboard('${u.phone}')"
                            style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 1px 5px; cursor: pointer; font-size: 10px; color: var(--text-soft);">복사</button>
                    </span>` : '<span>📞 미등록</span>'}
                </div>
            </div>
        `;
        }).join('');
    };

    window.openAdminMemberEditModal = (userId) => {
        const users = window.Utils.getStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, []);
        const user = users.find(u => u.id === userId);
        if (!user) return;

        const modalTitle = document.querySelector('#admin-member-edit-modal .modal-title');
        const saveBtn = document.querySelector('#admin-member-edit-modal .btn-full-action');
        const deleteBtn = document.getElementById('edit-member-delete-btn');

        if (user.isApproved) {
            if (modalTitle) modalTitle.innerText = '회원 정보 수정';
            if (saveBtn) saveBtn.innerText = '저장하기';
            if (deleteBtn) deleteBtn.style.display = 'none';
        } else {
            if (modalTitle) modalTitle.innerText = '가입 승인 및 정보 확인';
            if (saveBtn) saveBtn.innerText = '승인 완료';
            if (deleteBtn) deleteBtn.style.display = 'block';
        }

        document.getElementById('edit-member-id').value = user.id;
        document.getElementById('edit-member-pw').value = user.pw || '';
        document.getElementById('edit-member-system-role').value = user.role || 'believer';
        document.getElementById('edit-member-cohort').value = user.cohort || '';
        document.getElementById('edit-member-name').value = user.name || '';
        document.getElementById('edit-member-role').value = user.roleTitle || '성도';
        document.getElementById('edit-member-birth').value = user.birth || '';
        document.getElementById('edit-member-phone').value = user.phone || '';

        // Role-based field visibility
        const cohortGroup = document.getElementById('edit-member-cohort-group');
        if (cohortGroup) {
            cohortGroup.style.display = (user.role === 'pastor') ? 'none' : 'block';
        }

        document.getElementById('admin-member-edit-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeAdminMemberEditModal = () => {
        const modal = document.getElementById('admin-member-edit-modal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    window.saveAdminMemberEdit = () => {
        const userId = document.getElementById('edit-member-id').value;
        const users = window.Utils.getStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, []);
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex > -1) {
            const wasApproved = users[userIndex].isApproved;

            users[userIndex].pw = document.getElementById('edit-member-pw').value;
            users[userIndex].role = document.getElementById('edit-member-system-role').value;
            users[userIndex].cohort = parseInt(document.getElementById('edit-member-cohort').value) || users[userIndex].cohort;
            users[userIndex].name = document.getElementById('edit-member-name').value;
            users[userIndex].roleTitle = document.getElementById('edit-member-role').value;
            users[userIndex].birth = document.getElementById('edit-member-birth').value;
            users[userIndex].phone = document.getElementById('edit-member-phone').value;
            users[userIndex].isApproved = true; // Mark as approved upon saving

            window.Utils.setStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, users);

            const msg = wasApproved ? '회원 정보가 수정되었습니다.' : '회원 가입이 승인 및 완료되었습니다.';
            window.Utils.showToast(msg);

            closeAdminMemberEditModal();
            initAdminPage();
        }
    };

    window.deleteAdminMemberFromEdit = () => {
        const userId = document.getElementById('edit-member-id').value;
        if (!confirm('정말로 이 가입 요청을 거절하고 삭제하시겠습니까?')) return;

        let registeredUsers = window.Utils.getStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, []);
        registeredUsers = registeredUsers.filter(u => u.id !== userId);

        window.Utils.setStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, registeredUsers);
        window.Utils.showToast('가입 요청이 거절되었습니다.');
        closeAdminMemberEditModal();
        initAdminPage();
    };

    window.handleMemberAttendance = (userId, sundayIso) => {
        const today = new Date();
        if (today.getDay() !== 0) {
            window.Utils.showToast('출석 체크는 일요일에만 가능합니다.', 'error');
            return;
        }

        const taskKey = `${window.CONFIG.STORAGE_KEYS.TASK_STATE_PREFIX}${userId}`;
        const userTasks = window.Utils.getStorageItem(taskKey, []);
        const sunday = new Date(sundayIso);
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 7);

        const weekTaskIndex = userTasks.findIndex(s => {
            const d = new Date(s.date);
            return d >= sunday && d < saturday && s.attendance !== undefined;
        });

        if (weekTaskIndex > -1) {
            userTasks[weekTaskIndex].attendance = !userTasks[weekTaskIndex].attendance;
        } else {
            const existing = userTasks.find(s => {
                const d = new Date(s.date);
                return d >= sunday && d < saturday;
            });
            if (existing) {
                existing.attendance = true;
            } else {
                userTasks.push({ date: sundayIso, attendance: true });
            }
        }
        window.Utils.setStorageItem(taskKey, userTasks);
        initAdminPage();
        window.Utils.showToast('출석 상태가 변경되었습니다.');
    };

    window.copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            window.Utils.showToast('전화번호가 복사되었습니다.');
        }).catch(err => {
            console.error('복사 실패:', err);
            // fallback
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                window.Utils.showToast('전화번호가 복사되었습니다.');
            } catch (err) {
                window.Utils.showToast('복사하지 못했습니다.');
            }
            document.body.removeChild(textArea);
        });
    };

    window.filterAdminMember = (cohort) => {
        adminFilterMember = String(cohort);
        initAdminPage();
    };



    // Notices Management
    const renderAdminNotices = () => {
        const listContainer = document.getElementById('admin-notices-list');
        if (!listContainer) return;

        const notices = window.Utils.getStorageItem('grace_walk_notices', []);

        if (notices.length === 0) {
            listContainer.innerHTML = `
                <div class="gw-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; min-height: 300px; text-align: center;">
                    <div style="width: 60px; height: 60px; background: #F2F4F6; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#8E8E93" stroke-width="2" style="width: 28px; height: 28px;">
                            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <p style="font-size: 16px; font-weight: 600; color: #1C1C1E; margin-bottom: 4px;">등록된 알림이 없습니다.</p>
                    <p style="font-size: 14px; color: #8E8E93;">새로운 소식을 전해보세요.</p>
                </div>`;
            return;
        }

        listContainer.innerHTML = notices.sort((a, b) => new Date(b.date) - new Date(a.date)).map(n => `
            <div class="gw-card" onclick="openNoticeModal('${n.id}')" style="cursor: pointer;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                        <span class="gw-card-label" style="background: ${n.targetCohort === 'all' ? 'var(--primary-light)' : '#F2F4F6'}; color: ${n.targetCohort === 'all' ? 'var(--primary)' : '#666'}; margin-bottom: 6px; display: inline-block;">
                            ${n.targetCohort === 'all' ? '전체 알림' : `${n.targetCohort}기`}
                        </span>
                        <h4 class="gw-card-title">${n.title}</h4>
                    </div>
                    <span style="font-size: 12px; color: var(--text-soft); white-space: nowrap;">${new Date(n.date).toLocaleDateString()}</span>
                </div>
                <p class="gw-card-desc" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${n.content}</p>
            </div>
        `).join('');
    };

    window.openNoticeModal = (id = null) => {
        const modal = document.getElementById('notice-modal');
        const titleInput = document.getElementById('notice-input-title');
        const contentInput = document.getElementById('notice-input-content');
        const idInput = document.getElementById('notice-input-id');
        const cohortSelect = document.getElementById('notice-input-cohort'); // New Field
        const modalTitle = document.getElementById('notice-modal-title');
        const saveBtn = document.getElementById('btn-save-notice');
        const deleteBtn = document.getElementById('btn-delete-notice-modal');

        if (!modal) return;

        // Populate Cohort Options dynamically
        const users = window.Utils.getStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, []);
        const cohorts = [...new Set(users.filter(u => u.cohort).map(u => u.cohort))].sort((a, b) => a - b);

        let optionsHtml = '<option value="all">전체 대상</option>';
        cohorts.forEach(c => {
            optionsHtml += `<option value="${c}">${c}기</option>`;
        });
        if (cohortSelect) cohortSelect.innerHTML = optionsHtml;


        if (id) {
            // Edit Mode
            const notices = window.Utils.getStorageItem('grace_walk_notices', []);
            const notice = notices.find(n => n.id === id);
            if (!notice) return;

            idInput.value = notice.id;
            titleInput.value = notice.title;
            contentInput.value = notice.content;
            if (cohortSelect) cohortSelect.value = notice.targetCohort || 'all'; // Load target

            modalTitle.innerText = '알림 수정';
            saveBtn.innerText = '수정완료';
            deleteBtn.classList.remove('hidden');
        } else {
            // Create Mode
            idInput.value = '';
            titleInput.value = '';
            contentInput.value = '';
            if (cohortSelect) cohortSelect.value = 'all'; // Default

            modalTitle.innerText = '새로운 알림 작성';
            saveBtn.innerText = '등록하기';
            deleteBtn.classList.add('hidden');
        }

        modal.classList.add('active');
    };

    window.closeNoticeModal = () => {
        document.getElementById('notice-modal')?.classList.remove('active');
    };

    window.saveNotice = () => {
        const id = document.getElementById('notice-input-id').value;
        const title = document.getElementById('notice-input-title').value.trim();
        const content = document.getElementById('notice-input-content').value.trim();
        const targetCohort = document.getElementById('notice-input-cohort').value; // Get target

        if (!title || !content) {
            window.Utils.showToast('제목과 내용을 모두 입력해주세요.');
            return;
        }

        let notices = window.Utils.getStorageItem('grace_walk_notices', []);

        if (id) {
            // Update
            const index = notices.findIndex(n => n.id === id);
            if (index !== -1) {
                notices[index] = { ...notices[index], title, content, targetCohort, date: new Date().toISOString() };
                window.Utils.showToast('알림이 수정되었습니다.');
            }
        } else {
            // Create
            const newNotice = {
                id: Date.now().toString(),
                title,
                content,
                targetCohort: targetCohort || 'all',
                date: new Date().toISOString()
            };
            notices.push(newNotice);
            window.Utils.showToast('알림이 등록되었습니다.');
        }

        window.Utils.setStorageItem('grace_walk_notices', notices);
        renderAdminNotices();
        closeNoticeModal();
    };

    window.deleteNoticeModalAction = () => {
        const id = document.getElementById('notice-input-id').value;
        if (!id) return;

        if (confirm('이 알림을 삭제하시겠습니까?')) {
            let notices = window.Utils.getStorageItem('grace_walk_notices', []);
            notices = notices.filter(n => n.id !== id);
            window.Utils.setStorageItem('grace_walk_notices', notices);
            window.Utils.showToast('알림이 삭제되었습니다.');
            renderAdminNotices();
            closeNoticeModal();
        }
    };

    // --- Advanced Schedule Management Logic (High-End) ---
    window.switchScheduleView = (view) => {
        currentScheduleView = view;
        document.getElementById('view-mode-calendar').classList.toggle('active', view === 'calendar');
        document.getElementById('view-mode-list').classList.toggle('active', view === 'list');
        document.getElementById('schedule-calendar-wrapper').classList.toggle('hidden', view !== 'calendar');
        document.getElementById('schedule-list-wrapper').classList.toggle('hidden', view !== 'list');
        renderAdminSchedule();
    };

    window.moveCalendarMonth = (delta) => {
        calendarDate.setMonth(calendarDate.getMonth() + delta);
        renderAdminSchedule();
    };

    window.goToToday = () => {
        calendarDate = new Date();
        renderAdminSchedule();
    };

    const renderAdminSchedule = () => {
        if (currentScheduleView === 'calendar') renderCalendar();
        else renderAdvancedList();
    };

    const renderCalendar = () => {
        const grid = document.getElementById('calendar-grid');
        const monthYearLabel = document.getElementById('calendar-month-year');
        if (!grid || !monthYearLabel) return;

        monthYearLabel.innerText = `${calendarDate.getFullYear()}.${String(calendarDate.getMonth() + 1).padStart(2, '0')}`;

        const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
        const lastDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
        const startOffset = firstDay.getDay();

        let html = '';
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(d => html += `<div class="calendar-day-header">${d}</div>`);

        const prevMonthLastDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 0).getDate();
        for (let i = startOffset - 1; i >= 0; i--) {
            html += `<div class="calendar-day-cell other-month"><div class="day-header"><span class="day-num">${prevMonthLastDay - i}</span></div></div>`;
        }

        const today = new Date();
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const isToday = today.getFullYear() === calendarDate.getFullYear() && today.getMonth() === calendarDate.getMonth() && today.getDate() === day;
            const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const dayEvents = adminSchedules.filter(s => s.startAt.split('T')[0] === dateStr);

            html += `
                <div class="calendar-day-cell" onclick="openScheduleFormByDate('${dateStr}')">
                    <div class="day-header">
                        <span class="day-num ${isToday ? 'today' : ''}">${day}</span>
                    </div>
                    <div class="day-events">
                        ${dayEvents.slice(0, 3).map(e => `
                            <div class="cal-event-puck ${e.category}" onclick="event.stopPropagation(); openScheduleForm('${e.id}')">
                                ${e.title}
                            </div>
                        `).join('')}
                        ${dayEvents.length > 3 ? `<div style="font-size:9px; color:var(--primary); font-weight:800; margin-top:2px; margin-left:4px;">+${dayEvents.length - 3} more</div>` : ''}
                    </div>
                </div>
            `;
        }
        grid.innerHTML = html;
    };

    const renderAdvancedList = () => {
        const list = document.getElementById('admin-schedule-list');
        if (!list) return;

        const searchTerm = document.getElementById('schedule-search')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('schedule-category-filter')?.value || 'all';

        const filtered = adminSchedules.filter(s => {
            const matchesSearch = s.title.toLowerCase().includes(searchTerm) || (s.manager || '').toLowerCase().includes(searchTerm);
            const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
            return matchesSearch && matchesCategory;
        }).sort((a, b) => new Date(b.startAt) - new Date(a.startAt));

        if (filtered.length === 0) {
            list.innerHTML = '<div class="empty-state"><p class="empty-state-text">검색 결과가 없습니다.</p></div>';
            return;
        }

        list.innerHTML = filtered.map(s => `
            <div class="gw-card" onclick="openScheduleDetail('${s.id}')" style="padding: 20px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; border-left: 4px solid var(--primary); cursor:pointer;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span class="cal-event-puck ${s.category}" style="display:inline-block; border-left:none;">${s.category}</span>
                        ${!s.isPublic ? '<span style="font-size:10px; padding:2px 6px; background:#F2F2F7; color:#8E8E93; border-radius:4px; font-weight:700;">비공개</span>' : ''}
                    </div>
                    <h4 style="font-size: 16px; font-weight: 800; margin-bottom: 6px;">${s.title}</h4>
                    <p style="font-size: 13px; color: var(--text-soft); font-weight: 500; display:flex; align-items:center; gap:12px;">
                        <span>📅 ${new Date(s.startAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>📍 ${s.location || '장소 없음'}</span>
                    </p>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="gw-btn-secondary" style="padding: 8px 12px; font-size: 12px;" onclick="event.stopPropagation(); openScheduleForm('${s.id}')">수정</button>
                </div>
            </div>
        `).join('');
    };

    window.filterSchedules = () => {
        if (currentScheduleView === 'list') renderAdvancedList();
        else renderCalendar();
    };

    window.openScheduleForm = (id = null) => {
        const modal = document.getElementById('schedule-form-modal');
        const titleEl = document.getElementById('schedule-modal-title');
        const saveBtn = document.getElementById('btn-save-schedule');
        const deleteBtn = document.getElementById('btn-delete-schedule');

        // Reset Form
        document.getElementById('edit-schedule-id').value = id || '';
        document.getElementById('schedule-input-title').value = '';
        document.getElementById('schedule-input-category').value = 'EVENT';
        document.getElementById('schedule-input-start').value = '';
        document.getElementById('schedule-input-end').value = '';
        document.getElementById('schedule-input-location').value = '';
        document.getElementById('schedule-input-manager').value = '';
        document.getElementById('schedule-input-desc').value = '';
        document.getElementById('schedule-input-memo').value = '';
        document.getElementById('schedule-input-public').checked = true;
        document.getElementById('image-preview').src = '';
        document.getElementById('image-preview-container').classList.add('hidden');
        document.getElementById('upload-placeholder').classList.remove('hidden');
        updateToggleUI(true);

        if (id) {
            const s = adminSchedules.find(item => item.id === id);
            if (s) {
                titleEl.innerText = '일정 수정하기';
                document.getElementById('schedule-input-title').value = s.title;
                document.getElementById('schedule-input-category').value = s.category;
                document.getElementById('schedule-input-start').value = s.startAt.substring(0, 16);
                document.getElementById('schedule-input-end').value = s.endAt ? s.endAt.substring(0, 16) : '';
                document.getElementById('schedule-input-location').value = s.location || '';
                document.getElementById('schedule-input-manager').value = s.manager || '';
                document.getElementById('schedule-input-desc').value = s.description || '';
                document.getElementById('schedule-input-memo').value = s.memo || '';
                document.getElementById('schedule-input-public').checked = s.isPublic;

                if (s.thumbnail) {
                    document.getElementById('image-preview').src = s.thumbnail;
                    document.getElementById('image-preview-container').classList.remove('hidden');
                    document.getElementById('upload-placeholder').classList.add('hidden');
                }

                updateToggleUI(s.isPublic);
                deleteBtn.classList.remove('hidden');
            }
        } else {
            titleEl.innerText = '새 일정 등록';
            deleteBtn.classList.add('hidden');
            // Default start to now
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            document.getElementById('schedule-input-start').value = now.toISOString().slice(0, 16);
        }

        window.Utils.openModal('schedule-form-modal');
    };

    window.openScheduleFormByDate = (dateStr) => {
        window.openScheduleForm();
        document.getElementById('schedule-input-start').value = `${dateStr}T09:00`;
    };

    window.closeScheduleForm = () => window.Utils.closeModal('schedule-form-modal');

    window.toggleSchedulePublic = () => {
        const cb = document.getElementById('schedule-input-public');
        cb.checked = !cb.checked;
        updateToggleUI(cb.checked);
    };

    const updateToggleUI = (isPublic) => {
        const slider = document.querySelector('.toggle-switch');
        const label = document.getElementById('label-toggle-public');
        if (slider) slider.classList.toggle('active', isPublic);
        if (label) {
            label.innerText = isPublic ? '공개' : '비공개';
            label.style.color = isPublic ? 'var(--primary)' : 'var(--text-soft)';
        }
    };

    window.openScheduleDetail = (id) => {
        const s = adminSchedules.find(item => item.id === id);
        if (!s) return;

        const imgBox = document.getElementById('sch-detail-img-box');
        if (s.thumbnail) {
            document.getElementById('sch-detail-img').src = s.thumbnail;
            imgBox.classList.remove('hidden');
        } else {
            imgBox.classList.add('hidden');
        }

        document.getElementById('sch-detail-category').innerText = s.category;
        document.getElementById('sch-detail-category').className = `sch-detail-cat-badge ${s.category}`;
        document.getElementById('sch-detail-title').innerText = s.title;

        const dateRange = s.endAt ?
            `${new Date(s.startAt).toLocaleDateString('ko-KR')} - ${new Date(s.endAt).toLocaleDateString('ko-KR')}` :
            new Date(s.startAt).toLocaleDateString('ko-KR');

        document.getElementById('sch-detail-date').innerText = dateRange;
        document.getElementById('sch-detail-location').innerText = s.location || '장소 정보 없음';
        document.getElementById('sch-detail-manager').innerText = s.manager || '담당자 없음';
        document.getElementById('sch-detail-content').innerText = s.description || '상세 내용이 없습니다.';

        document.getElementById('btn-edit-from-detail').onclick = () => {
            window.Utils.closeModal('schedule-detail-modal');
            window.openScheduleForm(id);
        };

        window.Utils.openModal('schedule-detail-modal');
    };

    window.saveScheduleAction = () => {
        const id = document.getElementById('edit-schedule-id').value;
        const title = document.getElementById('schedule-input-title').value.trim();
        const startAt = document.getElementById('schedule-input-start').value;

        if (!title || !startAt) {
            window.Utils.showToast('제목과 시작 일시는 필수입니다.');
            return;
        }

        const data = {
            id: id || `sch_${Date.now()}`,
            title,
            category: document.getElementById('schedule-input-category').value,
            startAt,
            endAt: document.getElementById('schedule-input-end').value,
            location: document.getElementById('schedule-input-location').value.trim(),
            manager: document.getElementById('schedule-input-manager').value.trim(),
            description: document.getElementById('schedule-input-desc').value.trim(),
            memo: document.getElementById('schedule-input-memo').value.trim(),
            isPublic: document.getElementById('schedule-input-public').checked,
            thumbnail: document.getElementById('image-preview').src || null,
            updatedAt: new Date().toISOString()
        };

        if (id) {
            const idx = adminSchedules.findIndex(s => s.id === id);
            adminSchedules[idx] = data;
        } else {
            adminSchedules.unshift(data);
        }

        window.Utils.setStorageItem('gw_admin_church_schedules', adminSchedules);
        window.Utils.showToast(id ? '일정이 수정되었습니다.' : '새 일정이 등록되었습니다.');
        renderAdminSchedule();
        window.closeScheduleForm();
    };

    window.deleteScheduleAction = () => {
        const id = document.getElementById('edit-schedule-id').value;
        if (!id) return;

        if (confirm('이 일정을 정말 삭제하시겠습니까?')) {
            adminSchedules = adminSchedules.filter(s => s.id !== id);
            window.Utils.setStorageItem('gw_admin_church_schedules', adminSchedules);
            window.Utils.showToast('일정이 삭제되었습니다.');
            renderAdminSchedule();
            window.closeScheduleForm();
        }
    };

    // --- Design Interaction Handlers ---
    window.handleImagePreview = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('image-preview').src = e.target.result;
                document.getElementById('image-preview-container').classList.remove('hidden');
                document.getElementById('upload-placeholder').classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
    };

    window.removeImagePreview = () => {
        document.getElementById('schedule-file-input').value = '';
        document.getElementById('image-preview').src = '';
        document.getElementById('image-preview-container').classList.add('hidden');
        document.getElementById('upload-placeholder').classList.remove('hidden');
    };

    // --- Discipleship Training Schedule Logic (Dashboard) ---
    window.switchScheduleMode = (mode) => {
        const isTraining = mode === 'training';
        document.getElementById('subview-general').classList.toggle('active', !isTraining);
        document.getElementById('subview-training').classList.toggle('active', isTraining);

        document.getElementById('panel-general-schedule').classList.toggle('hidden', isTraining);
        document.getElementById('panel-training-schedule').classList.toggle('hidden', !isTraining);

        if (isTraining) {
            loadDashTrainingData();
        }
    };

    const TRAINING_SCHEDULE_DEFAULT = [
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

    const loadDashTrainingData = () => {
        const stored = window.Utils.getStorageItem('gw_full_schedule', TRAINING_SCHEDULE_DEFAULT);
        renderDashTrainingPreview(stored);
    };

    const handleDashAdminPaste = (e) => {
        e.preventDefault();
        const clipboardData = e.clipboardData || window.clipboardData;
        const pastedData = clipboardData.getData('Text');
        if (!pastedData) return;

        const rows = pastedData.split(/\r\n|\n|\r/);
        const parsedData = rows.map((row, index) => {
            const columns = row.split('\t');
            if (columns.length < 2) return null;
            return {
                week: parseInt(columns[0]) || (index + 1),
                date: columns[1] ? columns[1].trim() : '',
                subject: columns[2] ? columns[2].trim() : '',
                book: (columns[3] || '').trim()
            };
        }).filter(item => item !== null);

        if (parsedData.length > 0) renderDashTrainingPreview(parsedData);
    };

    const renderDashTrainingPreview = (data) => {
        const container = document.getElementById('dash-admin-preview-container');
        const body = document.getElementById('dash-admin-preview-body');
        if (!container || !body) return;

        container.classList.remove('hidden');
        body.innerHTML = data.map((item) => `
            <tr>
                <td style="padding:8px;"><input type="text" class="edit-week" value="${item.week}" style="width:100%; border:1px solid #eee; padding:4px;"></td>
                <td style="padding:8px;"><input type="text" class="edit-date" value="${item.date}" style="width:100%; border:1px solid #eee; padding:4px;"></td>
                <td style="padding:8px;"><input type="text" class="edit-subject" value="${item.subject}" style="width:100%; border:1px solid #eee; padding:4px;"></td>
                <td style="padding:8px;"><input type="text" class="edit-book" value="${item.book}" style="width:100%; border:1px solid #eee; padding:4px;"></td>
            </tr>
        `).join('');
    };

    window.saveDashTrainingSchedule = () => {
        const newStartDate = document.getElementById('dash-admin-start-date').value;
        const cohort = document.getElementById('dash-admin-cohort-select').value;
        const rows = document.querySelectorAll('#dash-admin-preview-body tr');

        const newSchedule = Array.from(rows).map(row => {
            const inputs = row.querySelectorAll('input');
            const weekVal = inputs[0].value.trim();
            return {
                week: isNaN(weekVal) || weekVal === '' ? weekVal : parseInt(weekVal),
                date: inputs[1].value.trim(),
                subject: inputs[2].value.trim(),
                book: inputs[3].value.trim()
            };
        }).filter(item => item.week !== '');

        if (newSchedule.length === 0) {
            window.Utils.showToast('등록할 데이터가 없습니다.');
            return;
        }

        try {
            window.Utils.setStorageItem('gw_full_schedule', newSchedule);
            window.Utils.setStorageItem('gw_cohort_schedule', { startDate: newStartDate, cohort: cohort });
            window.Utils.showToast(`${cohort} 훈련 일정이 성공적으로 업데이트 되었습니다.`);
            setTimeout(() => location.reload(), 1000);
        } catch (e) {
            window.Utils.showToast('저장 중 오류가 발생했습니다.');
        }
    };

    // --- Page Initialization ---
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('dash-admin-paste-zone')?.addEventListener('paste', handleDashAdminPaste);
    });
    initModal();
    initAdminPage();
    if (window.Navigation && window.Navigation.updateNavUI) window.Navigation.updateNavUI();
})();


