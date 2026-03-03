
const PrayerService = {
    getStorageKey() {
        const userId = window.Auth.getCurrentUserId();
        return userId ? `${window.CONFIG.STORAGE_KEYS.PRAYER_JOURNAL_PREFIX}${userId}` : 'gw_prayer_journal';
    },

    getJournal() {
        return window.Utils.getStorageItem(this.getStorageKey(), []);
    },

    saveJournal(journal) {
        window.Utils.setStorageItem(this.getStorageKey(), journal);
    },

    addPrayer(desc) {
        const journal = this.getJournal();
        const newPrayer = { id: Date.now(), desc, date: new Date().toISOString() };
        journal.unshift(newPrayer);
        this.saveJournal(journal);
        return newPrayer;
    },

    updatePrayer(id, desc) {
        const journal = this.getJournal();
        const index = journal.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
            journal[index].desc = desc;
            this.saveJournal(journal);
            return journal[index];
        }
        return null;
    },

    deletePrayer(id) {
        let journal = this.getJournal();
        journal = journal.filter(p => p.id !== parseInt(id));
        this.saveJournal(journal);
    }
};

window.PrayerService = PrayerService;
