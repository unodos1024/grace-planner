const Navigation = {
    injectNavigation(role) {
        const sidebarNav = document.getElementById('sidebar-nav-list');
        const mobileNav = document.getElementById('mobile-nav-container');

        const icons = {
            home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>`,
            prayer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z"></path></svg>`,
            sermon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`,
            notice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
            members: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
            settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
            stats: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"></path></svg>`,
            calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`
        };

        // Sidebar items (PC) - includes notice and settings
        const sidebarItems = role === 'pastor' ? [
            { id: 'dashboard', label: '홈', icon: icons.home },
            { id: 'prayers', label: '기도제목', icon: icons.prayer },
            { id: 'schedule', label: '일정관리', icon: icons.calendar },
            { id: 'stats', label: '통계', icon: icons.stats },
            { id: 'members', label: '회원관리', icon: icons.members },
            { id: 'notice', label: '알림', icon: icons.notice },
            { id: 'settings', label: '설정', icon: icons.settings }
        ] : [
            { id: 'home', label: '홈', icon: icons.home },
            { id: 'prayer', label: '기도', icon: icons.prayer },
            { id: 'sermon', label: '말씀요약', icon: icons.sermon },
            { id: 'schedule', label: '일정관리', icon: icons.calendar },
            { id: 'notice', label: '알림', icon: icons.notice },
            { id: 'settings', label: '설정', icon: icons.settings }
        ];

        // Mobile nav items - excludes notice and settings (available in top header)
        const mobileNavItems = role === 'pastor' ? [
            { id: 'dashboard', label: '홈', icon: icons.home },
            { id: 'prayers', label: '기도제목', icon: icons.prayer },
            { id: 'schedule', label: '일정관리', icon: icons.calendar },
            { id: 'stats', label: '통계', icon: icons.stats },
            { id: 'members', label: '회원관리', icon: icons.members }
        ] : [
            { id: 'home', label: '홈', icon: icons.home },
            { id: 'prayer', label: '기도', icon: icons.prayer },
            { id: 'sermon', label: '말씀요약', icon: icons.sermon },
            { id: 'schedule', label: '일정관리', icon: icons.calendar }
        ];


        // Sidebar Render
        if (sidebarNav) {
            sidebarNav.innerHTML = sidebarItems.map(item => `
                <button class="sidebar-item" data-id="${item.id}" onclick="Router.navigate('${item.id}')" aria-label="${item.label} 페이지로 이동" role="link">
                    ${item.icon}
                    <span>${item.label}</span>
                </button>
            `).join('') + `
                <button class="sidebar-item" style="color: #FF7E67; margin-top: auto;" onclick="Auth.handleLogout()" aria-label="로그아웃" role="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                    <span>로그아웃</span>
                </button>
            `;
        }

        // Mobile Nav Render
        if (mobileNav) {
            mobileNav.innerHTML = `
                <nav class="nav-bar" role="navigation" aria-label="주요 서비스 네비게이션">
                    ${mobileNavItems.map(item => `
                        <button class="nav-item" data-id="${item.id}" onclick="Router.navigate('${item.id}')" aria-label="${item.label} 페이지로 이동" role="link">
                            <span class="nav-icon">${item.icon}</span>
                            <span class="nav-label">${item.label}</span>
                        </button>
                    `).join('')}
                </nav>
            `;
        }

        this.updateNavUI();
    },

    updateNavUI(activePageId) {
        if (!activePageId) {
            const urlParams = new URLSearchParams(window.location.search);
            activePageId = urlParams.get('page') || 'home';
        }

        // Update Sidebar
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === activePageId);
        });

        // Update Mobile Nav
        document.querySelectorAll('.nav-bar .nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === activePageId);
        });

        // Handle Admin Tab Context if on dashboard
        if (activePageId === 'dashboard' || activePageId === 'prayers' || activePageId === 'sermons' || activePageId === 'members' || activePageId === 'stats' || activePageId === 'schedule') {
            // If the shell is shared, we might need to notify the dashboard.js
            if (window.handleAdminTabSwitch && activePageId !== 'dashboard') {
                // Simplified: maps sub-pages to dashboard tabs
                const tabMap = { 'prayers': 'prayers', 'sermons': 'sermons', 'members': 'members', 'stats': 'stats', 'schedule': 'schedule' };
                if (tabMap[activePageId]) window.handleAdminTabSwitch(tabMap[activePageId]);
            }
        }
    },

    switchAdminTab(tab) {
        if (window.handleAdminTabSwitch) {
            window.handleAdminTabSwitch(tab);
            this.updateNavUI(tab);
        } else {
            // If not on dashboard, maybe navigate there with tab?
            Router.navigate(tab);
        }
    }
};

window.Navigation = Navigation;
