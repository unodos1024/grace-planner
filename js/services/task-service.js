
const TaskService = {
    getStorageKey() {
        const userId = window.Auth.getCurrentUserId();
        return userId ? `${window.CONFIG.STORAGE_KEYS.TASK_STATE_PREFIX}${userId}` : 'gw_task_state';
    },

    getAllTaskStates() {
        return window.Utils.getStorageItem(this.getStorageKey(), []);
    },

    getTodayTaskState() {
        const states = this.getAllTaskStates();
        const todayStr = window.Utils.getTodayISO().split('T')[0];
        return states.find(s => s.date.split('T')[0] === todayStr) || {
            date: todayStr,
            prayer: false,
            qt: false,
            bible: false,
            summary: false,
            phone: false,
            book: false,
            prayerDuration: 0
        };
    },

    async toggleTask(type, completed) {
        const states = this.getAllTaskStates();
        const todayStr = window.Utils.getTodayISO().split('T')[0];
        let dayStatus = states.find(s => s.date.split('T')[0] === todayStr);

        if (!dayStatus) {
            dayStatus = {
                date: todayStr,
                prayer: false,
                qt: false,
                bible: false,
                summary: false,
                phone: false,
                book: false,
                prayerDuration: 0
            };
            states.push(dayStatus);
        }

        dayStatus[type] = completed;
        if (type === 'prayer' && completed && dayStatus.prayerDuration < 20) {
            dayStatus.prayerDuration = 20;
        }

        window.Utils.setStorageItem(this.getStorageKey(), states);

        // API Sync
        const endpointMap = { 'qt': '/qt/check', 'bible': '/bible/check', 'prayer': '/prayer/log' };
        if (endpointMap[type]) {
            try {
                await window.ApiClient.post(endpointMap[type], {
                    completed: completed,
                    date: new Date().toISOString(),
                    minutes: (type === 'prayer' ? 20 : undefined)
                });
            } catch (e) {
                console.error('Task API sync failed', e);
            }
        }
        return dayStatus;
    },

    updatePrayerDuration(minutes) {
        const states = this.getAllTaskStates();
        const todayStr = window.Utils.getTodayISO().split('T')[0];
        let dayStatus = states.find(s => s.date.split('T')[0] === todayStr);

        if (!dayStatus) {
            dayStatus = {
                date: todayStr,
                prayer: false,
                qt: false,
                bible: false,
                phone: false,
                book: false,
                prayerDuration: 0
            };
            states.push(dayStatus);
        }

        dayStatus.prayerDuration = Math.max(dayStatus.prayerDuration, minutes);

        // Strictly mark prayer as completed ONLY if it meets the 20min goal
        dayStatus.prayer = dayStatus.prayerDuration >= 20;

        window.Utils.setStorageItem(this.getStorageKey(), states);
        return dayStatus;
    },

    isBookReportWeek(date) {
        const cohortInfo = window.Utils.getStorageItem('gw_cohort_schedule', { startDate: '2026-02-08' });
        const start = new Date(cohortInfo.startDate);
        const diffDays = Math.floor((new Date(date) - start) / (1000 * 60 * 60 * 24));
        const week = Math.max(1, Math.min(32, Math.floor(diffDays / 7) + 1));
        return week % 3 === 0;
    },

    getWeeklyProgress() {
        const states = this.getAllTaskStates();
        const now = new Date();

        // Use local dates to find the start of the week (Sunday)
        const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayOfWeek = todayAtMidnight.getDay(); // 0 for Sunday

        const sunday = new Date(todayAtMidnight);
        sunday.setDate(todayAtMidnight.getDate() - dayOfWeek);

        const weekStatuses = [];
        for (let i = 0; i < 7; i++) {
            const current = new Date(sunday);
            current.setDate(sunday.getDate() + i);

            // Format to YYYY-MM-DD in local time
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const day = String(current.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const status = states.find(s => s.date.includes(dateStr)) || {
                date: dateStr,
                prayer: false,
                qt: false,
                bible: false,
                phone: false,
                book: false,
                prayerDuration: 0
            };
            weekStatuses.push(status);
        }
        return weekStatuses;
    },

    getWeeklyTaskCount(type, dateInWeek) {
        const states = this.getAllTaskStates();
        const now = new Date(dateInWeek);
        const dayOfWeek = now.getDay();
        const start = new Date(now);
        start.setDate(now.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        const weekStates = states.filter(s => {
            const d = new Date(s.date);
            return d >= start && d <= end;
        });

        return weekStates.filter(s => s[type]).length;
    }
};

window.TaskService = TaskService;
