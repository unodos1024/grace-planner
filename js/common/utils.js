
const Utils = {
    getTodayISO() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    formatDate(date, options = { month: 'long', day: 'numeric', weekday: 'short' }) {
        return new Date(date).toLocaleDateString('ko-KR', options);
    },

    createConfetti() {
        const container = document.getElementById('confetti-container');
        if (!container) return;
        const colors = ['#4A6741', '#FF7E67', '#AEC6B5', '#F3F0FF', '#FFE66D'];
        for (let i = 0; i < 50; i++) {
            const c = document.createElement('div');
            c.className = 'confetti';
            c.style.left = Math.random() * 100 + 'vw';
            c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            c.style.width = (Math.random() * 8 + 4) + 'px';
            c.style.height = (Math.random() * 8 + 4) + 'px';
            c.style.animationDelay = Math.random() * 0.5 + 's';
            container.appendChild(c);
            setTimeout(() => c.remove(), 3000);
        }
    },

    // Data protection layer (Encoding/Decoding for PII)
    getStorageItem(key, defaultValue = null) {
        const item = localStorage.getItem(key);
        if (!item) return defaultValue;

        // 1. Try Base64 Decoding if it looks like encoded PII
        // Non-JSON strings (like "user") that are short might pass atob but fail parsing
        if (!item.startsWith('{') && !item.startsWith('[') && item.length > 4) {
            try {
                const decoded = decodeURIComponent(escape(atob(item)));
                // Only return if it's a valid JSON or a meaningful string
                try {
                    return JSON.parse(decoded);
                } catch {
                    // If it's not JSON but decoded successfully, return the string
                    return decoded;
                }
            } catch (e) {
                // Not valid Base64 or malformed URI, ignore and continue
            }
        }

        // 2. Try raw JSON parsing
        // Optimization: Only parse if it looks like JSON
        if (item.startsWith('{') || item.startsWith('[')) {
            try {
                return JSON.parse(item);
            } catch (e) {
                console.warn(`Storage key "${key}" contains invalid JSON.`, e);
                return item || defaultValue;
            }
        }

        // 3. Just a raw string
        return item || defaultValue;
    },

    setStorageItem(key, value) {
        const str = typeof value === 'string' ? value : JSON.stringify(value);
        // Basic obfuscation for PII protection (Base64 + UTF-8 support)
        const encoded = btoa(unescape(encodeURIComponent(str)));
        localStorage.setItem(key, encoded);
    },

    showToast(message, duration = 2500) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerText = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // Modal History Helper (Accessibility & UX)
    trackModalHistory(onBack) {
        history.pushState({ modal: 'open' }, '');
        const popHandler = (e) => {
            if (onBack) onBack();
        };
        window.addEventListener('popstate', popHandler, { once: true });
        return () => window.removeEventListener('popstate', popHandler);
    },

    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.classList.add('modal-open');
            this.trackModalHistory(() => this.closeModal(id));
        }
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
        }
    }
};


window.Utils = Utils;
