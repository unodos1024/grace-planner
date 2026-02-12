
(async () => {
    let allSermonNotes = [];
    let currentTab = 'sunday'; // 'sunday' or 'my'

    const fetchSermonNotes = async () => {
        const userId = window.Auth.getCurrentUserId();
        const localKey = userId ? `${window.CONFIG.STORAGE_KEYS.SERMON_NOTES_PREFIX}${userId}` : 'gw_sermon_notes';
        const localNotes = window.Utils.getStorageItem(localKey, []);

        // Default to local notes first to prevent UI delay/blank state
        allSermonNotes = localNotes;
        renderSermonList();

        try {
            // Check if API_BASE is reachable or if we are in local-only mode
            if (!window.CONFIG.API_BASE || window.CONFIG.API_BASE.includes('localhost:5116')) {
                // Silently skip if backend is likely not running in dev
                console.log('Skipping backend fetch (Dev mode/Local only)');
                return;
            }

            const response = await fetch(`${window.CONFIG.API_BASE}/sermon`).catch(() => null);
            if (response && response.ok) {
                const serverNotes = await response.json();
                if (serverNotes && serverNotes.length > 0) {
                    allSermonNotes = serverNotes;
                    renderSermonList();
                }
            }
        } catch (e) {
            // Error is handled, fallback is already in place
        }
    };

    window.switchSermonTab = (tab) => {
        currentTab = tab;
        document.getElementById('tab-sunday').classList.toggle('active', tab === 'sunday');
        document.getElementById('tab-wednesday').classList.toggle('active', tab === 'wednesday');
        renderSermonList();
    };

    const renderSermonList = () => {
        const container = document.getElementById('sermon-list-container');
        if (!container) return;

        // Filter by tab
        const typeFilter = currentTab === 'sunday' ? 'SUNDAY' : 'WEDNESDAY';
        const filteredNotes = allSermonNotes.filter(n => n.worshipType === typeFilter);

        if (filteredNotes.length === 0) {
            container.innerHTML = `
                <div class="sermon-empty-state">
                    <div style="background: var(--primary-light); width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:32px; height:32px; color: var(--primary); opacity: 0.5;">
                            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <p style="font-size: 15px; font-weight: 600; color: var(--text-soft);">기록된 내용이 없습니다.<br>${currentTab === 'sunday' ? '주일 설교의 기록을 남겨보세요.' : '수요기도회의 은혜를 기록해보세요.'}</p>
                </div>`;
            return;
        }

        container.innerHTML = filteredNotes.map(note => `
            <div class="gw-card" onclick="openEditSermonModal(${note.noteId})">
                <p class="gw-card-title">${note.content}</p>
                <div style="margin-top:12px; font-size:12px; color:var(--text-soft); font-weight:600; display: flex; align-items: center; gap: 4px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px; height:12px; opacity: 0.6;">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    ${new Date(note.createdDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>
        `).join('');
    };

    const initModal = () => {
        const modal = document.getElementById('sermon-modal');
        const root = document.getElementById('modal-root');
        if (modal && root) {
            root.appendChild(modal);
        }
    };

    window.openSermonModal = () => {
        document.getElementById('sermon-modal-title').innerText = currentTab === 'sunday' ? '주일 설교 기록' : '수요기도회 기록';
        document.getElementById('sermon-input-id').value = '';
        document.getElementById('sermon-input-content').value = '';
        document.getElementById('sermon-input-date').value = window.Utils.getTodayISO();
        document.getElementById('btn-save-sermon').innerText = '기록 저장하기';
        document.getElementById('btn-delete-sermon-modal')?.classList.add('hidden');
        document.getElementById('sermon-modal')?.classList.add('active');
    };

    window.openEditSermonModal = (id) => {
        const note = allSermonNotes.find(n => n.noteId === id);
        if (!note) return;

        document.getElementById('sermon-modal-title').innerText = note.worshipType === 'SUNDAY' ? '주일 설교 수정' : '수요기도회 수정';
        document.getElementById('sermon-input-id').value = note.noteId;
        document.getElementById('sermon-input-content').value = note.content;
        document.getElementById('sermon-input-date').value = note.createdDate.split('T')[0];
        document.getElementById('btn-save-sermon').innerText = '내용 수정하기';
        document.getElementById('btn-delete-sermon-modal')?.classList.remove('hidden');
        document.getElementById('sermon-modal')?.classList.add('active');
    };

    window.closeSermonModal = () => {
        document.getElementById('sermon-modal')?.classList.remove('active');
    };

    window.saveSermonNote = async () => {
        const id = document.getElementById('sermon-input-id').value;
        const content = document.getElementById('sermon-input-content').value.trim();
        const date = document.getElementById('sermon-input-date').value;

        if (!content || !date) {
            window.Utils?.showToast('모든 항목을 입력해주세요.');
            return;
        }

        const localKey = window.Auth.getCurrentUserId() ? `${window.CONFIG.STORAGE_KEYS.SERMON_NOTES_PREFIX}${window.Auth.getCurrentUserId()}` : 'gw_sermon_notes';
        let currentNotes = window.Utils.getStorageItem(localKey, []);

        if (id) {
            const index = currentNotes.findIndex(n => n.noteId === parseInt(id));
            if (index !== -1) {
                currentNotes[index] = { ...currentNotes[index], content, createdDate: new Date(date).toISOString() };
                window.Utils?.showToast('기록이 수정되었습니다.');
            }
        } else {
            const worshipType = currentTab === 'sunday' ? 'SUNDAY' : 'WEDNESDAY';
            const newNote = {
                noteId: Date.now(), content, createdDate: new Date(date).toISOString(), worshipType
            };
            currentNotes.unshift(newNote);
            window.Utils?.showToast('새 기록이 저장되었습니다.');
        }


        window.Utils.setStorageItem(localKey, currentNotes);
        allSermonNotes = currentNotes;

        try {
            window.ApiClient.post('/sermon', { content, worshipType: (id ? undefined : (currentTab === 'sunday' ? 'SUNDAY' : 'MY')), createdDate: new Date(date).toISOString() })
                .catch(e => console.log('Backend sync failed'));
            renderSermonList();
            window.closeSermonModal();
        } catch (e) { console.error(e); }
    };


    window.deleteSermonModalAction = () => {
        const id = document.getElementById('sermon-input-id').value;
        if (!id) return;
        if (!confirm('이 기록을 삭제하시겠습니까?')) return;

        const localKey = window.Auth.getCurrentUserId() ? `${window.CONFIG.STORAGE_KEYS.SERMON_NOTES_PREFIX}${window.Auth.getCurrentUserId()}` : 'gw_sermon_notes';
        let currentNotes = window.Utils.getStorageItem(localKey, []);
        currentNotes = currentNotes.filter(n => n.noteId !== parseInt(id));
        window.Utils.setStorageItem(localKey, currentNotes);
        allSermonNotes = currentNotes;
        renderSermonList();
        window.closeSermonModal();
        window.Utils?.showToast('기록이 삭제되었습니다.');
    };

    // Initialization
    initModal();
    await fetchSermonNotes();
})();

