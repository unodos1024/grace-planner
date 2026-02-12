
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
            ['admin-member-modal', 'notice-modal', 'admin-history-list-modal', 'admin-content-detail-modal', 'schedule-form-modal', 'schedule-detail-modal'].forEach(id => {
                const m = document.getElementById(id);
                if (m) root.appendChild(m);
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
        let registeredUsers = window.Utils.getStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, []);
        const userIndex = registeredUsers.findIndex(u => u.id === targetId);
        if (userIndex > -1) {
            registeredUsers[userIndex].isApproved = true;
            window.Utils.setStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, registeredUsers);
            window.Utils.showToast(`${registeredUsers[userIndex].name}님을 승인했습니다.`);
            initAdminPage();
        }
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
            list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                </div>
                <p class="empty-state-text">조회할 기수를 선택하시면<br>훈련생 현황이 표시됩니다.</p>
            </div>
        `;
            return;
        }

        const filtered = users.filter(u => u.role === 'believer' && u.isApproved)
            .filter(u => String(u.cohort) === currentCohortFilter)
            .sort((a, b) => a.name.localeCompare(b.name));

        if (filtered.length === 0) {
            list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <p class="empty-state-text">${currentCohortFilter}기에 등록된<br>훈련생이 아직 없습니다.</p>
            </div>
        `;
            return;
        }

        // Task Tracking View (Default)
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        monday.setHours(0, 0, 0, 0);

        list.innerHTML = filtered.map(u => {
            const taskKey = `${window.CONFIG.STORAGE_KEYS.TASK_STATE_PREFIX}${u.id}`;
            const userTasks = window.Utils.getStorageItem(taskKey, []);

            let dayDotsHtml = '';
            const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];

            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                const dStr = d.toISOString().split('T')[0];
                const dayData = userTasks.find(s => s.date.split('T')[0] === dStr) || {};

                dayDotsHtml += `
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1;">
                            <span style="font-size: 9px; color: var(--text-soft); font-weight: 600;">${dayLabels[i]}</span>
                            <div style="display: flex; flex-direction: column; gap: 3px;">
                                <div style="width: 6px; height: 6px; border-radius: 50%; background: ${dayData.prayer ? '#FF7E67' : '#E5E5EA'};"></div>
                                <div style="width: 6px; height: 6px; border-radius: 50%; background: ${dayData.qt ? '#4CD964' : '#E5E5EA'};"></div>
                                <div style="width: 6px; height: 6px; border-radius: 50%; background: ${dayData.bible ? '#5856D6' : '#E5E5EA'};"></div>
                            </div>
                        </div>
                    `;
            }

            return `
                    <div class="gw-card" style="padding: 16px; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--bg-main);">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="avatar-circle" style="width: 32px; height: 32px; font-size: 13px;">${u.name[0]}</div>
                                <div style="font-weight: 700; font-size: 15px; color: var(--text-main);">${u.name}</div>
                            </div>
                            <div style="font-size: 10px; color: var(--text-soft); background: var(--bg-main); padding: 2px 8px; border-radius: 4px;">이번 주 과제 현황</div>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            ${dayDotsHtml}
                        </div>
                        <div style="display: flex; gap: 12px; margin-top: 12px; padding-top: 8px; font-size: 9px; color: var(--text-soft); justify-content: center; border-top: 1px dashed var(--bg-main);">
                            <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 5px; height: 5px; border-radius: 50%; background: #FF7E67;"></div> 기도</div>
                            <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 5px; height: 5px; border-radius: 50%; background: #4CD964;"></div> 성구암송</div>
                            <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 5px; height: 5px; border-radius: 50%; background: #5856D6;"></div> 말씀요약</div>
                        </div>
                    </div>
                `;
        }).join('');
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

        titleEl.innerText = data.type === 'prayer' ? '기도제목 기록' : '말씀요약 기록';
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

        titleEl.innerText = data.type === 'prayer' ? '기도제목 상세' : '말씀요약 상세';
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
            const cohorts = [...new Set(users.filter(u => u.role === 'believer' && u.isApproved && u.cohort).map(u => u.cohort))].sort((a, b) => a - b);
            let html = `<button class="cohort-chip ${adminFilterPrayer === 'all' ? 'active' : ''}" onclick="filterAdminPrayer('all')">전체</button>`;
            cohorts.forEach(c => {
                html += `<button class="cohort-chip ${adminFilterPrayer === String(c) ? 'active' : ''}" onclick="filterAdminPrayer('${c}')">${c}기</button>`;
            });
            filterContainer.innerHTML = html;
        }

        if (!listContainer) return;

        const targetUsers = users.filter(u => u.role === 'believer' && u.isApproved)
            .filter(u => adminFilterPrayer === 'all' || String(u.cohort) === adminFilterPrayer);

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

        // Get last 6 Sundays
        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setDate(now.getDate() - now.getDay() - (i * 7));
            d.setHours(0, 0, 0, 0);
            const label = (d.getMonth() + 1) + '/' + d.getDate();
            weeks[d.getTime()] = { label, count: 0, participants: new Set() };
        }

        // Count unique participants per week
        allUserSermons.forEach(entry => {
            entry.sermons.forEach(s => {
                const sDate = new Date(s.date);
                sDate.setHours(0, 0, 0, 0);
                const sunday = new Date(sDate);
                sunday.setDate(sDate.getDate() - sDate.getDay());

                const time = sunday.getTime();
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

        if (filterContainer) {
            const cohorts = [...new Set(users.filter(u => u.role === 'believer' && u.isApproved && u.cohort).map(u => u.cohort))].sort((a, b) => a - b);
            let html = `<button class="cohort-chip ${adminFilterMember === 'all' ? 'active' : ''}" onclick="filterAdminMember('all')">전체</button>`;
            cohorts.forEach(c => {
                html += `<button class="cohort-chip ${adminFilterMember === String(c) ? 'active' : ''}" onclick="filterAdminMember('${c}')">${c}기</button>`;
            });
            filterContainer.innerHTML = html;
        }

        if (!listContainer) return;

        const targetUsers = users.filter(u => u.role === 'believer' && u.isApproved)
            .filter(u => adminFilterMember === 'all' || String(u.cohort) === adminFilterMember)
            .sort((a, b) => {
                if (a.cohort !== b.cohort) return a.cohort - b.cohort;
                return a.name.localeCompare(b.name);
            });

        listContainer.innerHTML = targetUsers.map(u => `
            <div class="gw-card" style="opacity: ${u.isGraduated ? 0.6 : 1}; padding: 16px; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span class="gw-card-label" style="background: var(--primary-light); color: var(--primary); margin: 0; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${u.cohort}기</span>
                        ${u.isGraduated ? '<span class="gw-card-label" style="background: var(--text-soft); color: white; margin: 0; padding: 2px 6px; border-radius: 4px; font-size: 11px;">수료</span>' : ''}
                        <h4 class="gw-card-title" style="font-size: 17px; margin: 0;">${u.name} ${u.roleTitle && u.roleTitle !== '성도' ? `<span style="font-size: 13px; font-weight: normal; color: var(--text-soft);">(${u.roleTitle})</span>` : ''}</h4>
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--text-main);">
                    <!-- 생년월일 -->
                    <div style="display: flex; align-items: center;">
                        <span style="color: var(--text-soft); width: 60px; font-size: 12px;">생년월일</span>
                        <span style="font-weight: 500;">${u.birth || '-'}</span>
                    </div>

                    <!-- 전화번호 (복사 기능) -->
                    <div style="display: flex; align-items: center;">
                        <span style="color: var(--text-soft); width: 60px; font-size: 12px;">전화번호</span>
                        <div style="display: flex; align-items: center; gap: 6px; flex: 1;">
                            <span style="font-weight: 500; color: ${u.phone ? 'var(--text-main)' : 'var(--text-soft)'};">${u.phone || '미등록'}</span>
                            ${u.phone ? `
                            <button onclick="copyToClipboard('${u.phone}')" 
                                style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 2px 6px; cursor: pointer; display: flex; align-items: center; gap: 2px;">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                <span style="font-size: 10px; color: var(--text-soft);">복사</span>
                            </button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
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

    let editingMemberId = null;
    window.openAdminMemberModal = (userId) => {
        const users = window.Utils.getStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, []);
        const user = users.find(u => u.id === userId);
        if (!user) return;
        editingMemberId = userId;
        document.getElementById('edit-member-id').value = user.id;
        document.getElementById('edit-member-name').value = user.name || '';
        document.getElementById('edit-member-birth').value = user.birth || '';
        document.getElementById('edit-member-phone').value = user.phone || '';
        document.getElementById('edit-member-cohort').value = user.cohort || '';
        document.getElementById('edit-member-role-title').value = user.roleTitle || '성도';

        document.getElementById('admin-member-modal').classList.add('active');
    };

    window.closeAdminMemberModal = () => {
        document.getElementById('admin-member-modal').classList.remove('active');
        editingMemberId = null;
    };

    window.saveMemberChanges = () => {
        if (!editingMemberId) return;
        const newName = document.getElementById('edit-member-name').value.trim();
        const newBirth = document.getElementById('edit-member-birth').value.trim();
        const newPhone = document.getElementById('edit-member-phone').value.trim();
        const newCohort = document.getElementById('edit-member-cohort').value.trim();
        const newRoleTitle = document.getElementById('edit-member-role-title').value;

        if (!newName || !newBirth || !newCohort) {
            window.Utils.showToast('이름, 생년월일, 기수는 필수입니다.');
            return;
        }

        let users = window.Utils.getStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, []);
        const idx = users.findIndex(u => u.id === editingMemberId);
        if (idx > -1) {
            users[idx].name = newName;
            users[idx].birth = newBirth;
            users[idx].phone = newPhone;
            users[idx].cohort = newCohort;
            users[idx].roleTitle = newRoleTitle;
            window.Utils.setStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, users);
            window.Utils.showToast('정보가 수정되었습니다.');
            closeAdminMemberModal();
            initAdminPage();
        }
    };

    window.deleteMember = () => {
        if (!editingMemberId) return;
        if (confirm('정말로 이 회원을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.')) {
            let users = window.Utils.getStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, []);
            const newUsers = users.filter(u => u.id !== editingMemberId);
            window.Utils.setStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, newUsers);
            window.Utils.showToast('회원이 삭제되었습니다.');
            closeAdminMemberModal();
            initAdminPage();
        }
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

    // --- Page Initialization ---
    initModal();
    initAdminPage();
    if (window.Navigation && window.Navigation.updateNavUI) window.Navigation.updateNavUI();
})();


