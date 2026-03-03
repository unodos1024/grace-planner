
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
            prayerDuration: 0
        };
    },

    async toggleTask(type, completed) {
        const states = this.getAllTaskStates();
        const todayStr = window.Utils.getTodayISO().split('T')[0];
        let dayStatus = states.find(s => s.date.split('T')[0] === todayStr);

        if (!dayStatus) {
            dayStatus = { date: todayStr, prayer: false, qt: false, bible: false, prayerDuration: 0 };
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
            dayStatus = { date: todayStr, prayer: false, qt: false, bible: false, prayerDuration: 0 };
            states.push(dayStatus);
        }

        dayStatus.prayerDuration = Math.max(dayStatus.prayerDuration, minutes);
        // Automatically mark prayer as completed if it meets a threshold (e.g., 1 min for started, or goal 20)
        if (dayStatus.prayerDuration >= 1) dayStatus.prayer = true;

        window.Utils.setStorageItem(this.getStorageKey(), states);
        return dayStatus;
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
                prayerDuration: 0
            };
            weekStatuses.push(status);
        }
        return weekStatuses;
    }
};

window.TaskService = TaskService;
