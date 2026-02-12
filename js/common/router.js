const Router = {
    pages: {
        'home': {
            url: '../home/home.html',
            title: '홈 - Grace Planner',
            js: ['../../js/pages/home.js'],
            css: ['../../css/pages/home.css']
        },
        'prayer': {
            url: '../prayer/prayer.html',
            title: '기도 - Grace Planner',
            js: ['../../js/pages/prayer.js'],
            css: ['../../css/pages/prayer.css']
        },
        'sermon': {
            url: '../sermon/sermon.html',
            title: '말씀요약 - Grace Planner',
            js: ['../../js/pages/sermon.js'],
            css: ['../../css/pages/sermon.css']
        },
        'notice': {
            url: '../notice/notice.html',
            title: '알림 - Grace Planner',
            js: ['../../js/pages/notice.js'],
            css: ['../../css/pages/notice.css']
        },
        'settings': {
            url: '../settings/settings.html',
            title: '설정 - Grace Planner',
            js: ['../../js/pages/settings.js'],
            css: ['../../css/pages/settings.css']
        },
        'dashboard': {
            url: '../dashboard/dashboard.html',
            title: '대시보드 - Grace Planner',
            js: ['../../js/pages/dashboard.js'],
            css: ['../../css/pages/dashboard.css']
        },
        'prayers': {
            url: '../dashboard/dashboard.html',
            title: '기도제목 관리 - Grace Planner',
            js: ['../../js/pages/dashboard.js'],
            css: ['../../css/pages/dashboard.css']
        },
        'sermons': {
            url: '../dashboard/dashboard.html',
            title: '말씀요약 관리 - Grace Planner',
            js: ['../../js/pages/dashboard.js'],
            css: ['../../css/pages/dashboard.css']
        },
        'members': {
            url: '../dashboard/dashboard.html',
            title: '회원 관리 - Grace Planner',
            js: ['../../js/pages/dashboard.js'],
            css: ['../../css/pages/dashboard.css']
        },
        'stats': {
            url: '../dashboard/dashboard.html',
            title: '통계 - Grace Planner',
            js: ['../../js/pages/dashboard.js'],
            css: ['../../css/pages/dashboard.css']
        },
        'schedule': {
            url: '../schedule/schedule.html',
            title: '일정 - Grace Planner',
            js: ['../../js/pages/schedule.js'],
            css: ['../../css/pages/schedule.css']
        }
    },

    updateForRole(role) {
        if (role === 'pastor') {
            this.pages['schedule'] = {
                url: '../dashboard/dashboard.html',
                title: '일정 관리 - Grace Planner',
                js: ['../../js/pages/dashboard.js'],
                css: ['../../css/pages/dashboard.css', '../../css/pages/schedule.css']
            };
        }
    },

    init() {
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                this.loadPage(e.state.page, false);
            }
        });

        const user = window.Auth.getCurrentUser();
        if (user) this.updateForRole(user.role);

        const defaultPage = (user && user.role === 'pastor') ? 'dashboard' : 'home';

        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page') || defaultPage;
        this.loadPage(page, false);
    },

    async loadPage(pageId, pushState = true) {
        const page = this.pages[pageId];
        if (!page) return;

        const container = document.getElementById('shell-content');
        if (!container) return;

        try {
            container.innerHTML = '<div class="loading-spinner"></div>';

            // 1. Cleanup and Load CSS
            // Remove previous page-specific CSS
            document.querySelectorAll('link[data-page-css]').forEach(link => link.remove());

            if (page.css) {
                page.css.forEach(url => {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = url + '?t=' + Date.now();
                    link.setAttribute('data-page-css', 'true');
                    document.head.appendChild(link);
                });
            }

            // 2. Fetch HTML with Cache Busting
            const response = await fetch(page.url + '?t=' + Date.now());
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const mainContent = doc.getElementById('app') || doc.body;

            container.innerHTML = `<div class="page-transition-wrapper">${mainContent.innerHTML}</div>`;
            document.title = page.title;

            if (pushState) {
                const newUrl = window.location.pathname + '?page=' + pageId;
                window.history.pushState({ page: pageId }, page.title, newUrl);
            }

            // 3. Load & Execute JS with Cleanup
            if (page.js) {
                // Pre-cleanup: Remove previous page scripts to prevent duplication
                document.querySelectorAll('script[data-page-script]').forEach(s => s.remove());

                // Call previous page's destroy if exists
                if (window.currentPageInstance?.destroy) {
                    window.currentPageInstance.destroy();
                    window.currentPageInstance = null;
                }

                const scriptPromises = page.js.map(url => {
                    return new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = url + '?t=' + Date.now();
                        script.setAttribute('data-page-script', 'true'); // Flag for cleanup
                        script.onload = resolve;
                        script.onerror = reject;
                        document.body.appendChild(script);
                    });
                });
                await Promise.all(scriptPromises);
            }

            // 4. Update Nav UI & Scroll to Top
            if (window.Navigation && window.Navigation.updateNavUI) {
                window.Navigation.updateNavUI(pageId);
            }
            container.scrollTop = 0; // Reset scroll position for the new page

        } catch (error) {
            console.error('Failed to load page:', error);
            container.innerHTML = '<p class="error-msg">페이지를 불러오는 중 오류가 발생했습니다.</p>';
        }
    },

    navigate(pageId) {
        this.loadPage(pageId);
    }
};

window.Router = Router;
