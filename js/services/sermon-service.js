
const SermonService = {
    getStorageKey() {
        const userId = window.Auth.getCurrentUserId();
        return userId ? `${window.CONFIG.STORAGE_KEYS.SERMON_NOTES_PREFIX}${userId}` : 'gw_sermon_notes';
    },

    getNotes() {
        return window.Utils.getStorageItem(this.getStorageKey(), []);
    },

    async fetchSermonNotes() {
        // Fallback to local
        let notes = this.getNotes();

        try {
            if (window.CONFIG.API_BASE && !window.CONFIG.API_BASE.includes('localhost:5116')) {
                const serverNotes = await window.ApiClient.get('/sermon');
                if (serverNotes && serverNotes.length > 0) {
                    notes = serverNotes;
                    // Optionally sync local with server if needed
                    window.Utils.setStorageItem(this.getStorageKey(), notes);
                }
            }
        } catch (e) {
            console.warn('Backend sermon fetch failed, using local data', e);
        }
        return notes;
    },

    async saveNote(id, content, date, worshipType) {
        let notes = this.getNotes();
        let savedNote = null;

        if (id) {
            const index = notes.findIndex(n => n.noteId === parseInt(id));
            if (index !== -1) {
                notes[index] = { ...notes[index], content, createdDate: new Date(date).toISOString() };
                savedNote = notes[index];
            }
        } else {
            savedNote = {
                noteId: Date.now(), content, createdDate: new Date(date).toISOString(), worshipType
            };
            notes.unshift(savedNote);
        }

        window.Utils.setStorageItem(this.getStorageKey(), notes);

        // Sync with API
        try {
            await window.ApiClient.post('/sermon', {
                content,
                worshipType: id ? undefined : worshipType,
                createdDate: new Date(date).toISOString()
            });
        } catch (e) {
            console.warn('Sermon API sync failed', e);
        }

        return savedNote;
    },

    deleteNote(id) {
        let notes = this.getNotes();
        notes = notes.filter(n => n.noteId !== parseInt(id));
        window.Utils.setStorageItem(this.getStorageKey(), notes);
    }
};

window.SermonService = SermonService;
