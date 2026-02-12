(() => {
    const list = document.getElementById('user-notice-list');
    const currentUser = window.Auth.getCurrentUser();
    // Check for both 'pastor' and 'admin' roles to be safe
    const isPastor = currentUser && (currentUser.role === 'pastor' || currentUser.role === 'admin');

    // Force visible if role matches
    if (isPastor) {
        const fab = document.getElementById('admin-fab');
        if (fab) fab.classList.remove('hidden');
    }

    const renderNotices = () => {
        const allNotices = window.Utils.getStorageItem('grace_walk_notices', []);

        let myNotices;
        if (!currentUser) {
            // Guest or not logged in - show public notices only
            myNotices = allNotices.filter(n => !n.targetCohort || n.targetCohort === 'all');
        } else {
            // Filter
            myNotices = allNotices.filter(n => {
                if (isPastor) return true; // Admins see all
                if (!n.targetCohort || n.targetCohort === 'all') return true;
                if (String(n.targetCohort) === String(currentUser.cohort)) return true;
                return false;
            });
        }

        if (myNotices.length === 0) {
            // Empty State matching requested text
            list.innerHTML = `
            <div class="gw-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; min-height: 240px; text-align: center; border-radius: 24px;">
                <div style="width: 56px; height: 56px; background: #F2F4F6; border-radius: 18px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#8E8E93" stroke-width="2" style="width: 24px; height: 24px;">
                        <path d="M12 22c4.97 0 9-4.03 9-9 0-4.97-9-13-9-13S3 8.03 3 13c0 4.97 4.03 9 9 9z"></path>
                        <circle cx="12" cy="13" r="3"></circle>
                    </svg>
                </div>
                <h3 style="font-size: 16px; font-weight: 600; color: #8E8E93; margin-bottom: 4px;">등록된 알림이 없습니다.</h3>
                <p style="font-size: 14px; color: #8E8E93;">새로운 소식이 도착하면 알려드릴게요.</p>
            </div>`;
        } else {
            list.innerHTML = myNotices.sort((a, b) => new Date(b.date) - new Date(a.date)).map(n => `
                <div class="gw-card notification-item" onclick="openNoticeModal('${n.id}')" style="cursor: pointer; border-radius: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <span class="gw-card-label" style="background: ${n.targetCohort === 'all' ? '#E8F5E9' : '#F2F4F6'}; color: ${n.targetCohort === 'all' ? '#4CAF50' : '#666'}; margin: 0; padding: 4px 8px; border-radius: 6px; font-size: 11px;">
                            ${n.targetCohort === 'all' ? '전체' : `${n.targetCohort}기`}
                        </span>
                        <span style="font-size: 12px; color: #C7C7CC;">${new Date(n.date).toLocaleDateString()}</span>
                    </div>
                    <h3 class="gw-card-title" style="font-size: 16px; margin-bottom: 0; font-weight: 700;">${n.title}</h3>
                </div>
            `).join('');
        }
    };

    window.openNoticeModal = (id = null) => {
        const modal = document.getElementById('notice-modal');
        const modalTitle = document.getElementById('notice-modal-title');

        // Form Elements
        const editView = document.getElementById('admin-edit-form');
        const readView = document.getElementById('user-read-view');
        const idInput = document.getElementById('notice-input-id');
        const titleInput = document.getElementById('notice-input-title');
        const contentInput = document.getElementById('notice-input-content');
        const cohortSelect = document.getElementById('notice-input-cohort');
        const saveBtn = document.getElementById('btn-save-notice');
        const deleteBtn = document.getElementById('btn-delete-notice');
        const closeBtn = document.getElementById('btn-close-notice');

        if (!modal) return;

        // Reset Views
        editView.classList.add('hidden');
        readView.classList.add('hidden');
        saveBtn.classList.add('hidden');
        deleteBtn.classList.add('hidden');
        closeBtn.classList.remove('hidden');

        const notices = window.Utils.getStorageItem('grace_walk_notices', []);
        let notice = null;
        if (id) notice = notices.find(n => n.id === id);

        // Scenario 1: Admin creating new
        if (isPastor && !id) {
            modalTitle.innerText = '알림 작성';
            editView.classList.remove('hidden');
            saveBtn.classList.remove('hidden');
            saveBtn.innerText = '등록하기';
            closeBtn.classList.add('hidden');

            // Clear inputs
            idInput.value = '';
            titleInput.value = '';
            contentInput.value = '';
            populateCohortOptions();
            if (cohortSelect) cohortSelect.value = 'all';
        }
        // Scenario 2: Admin editing existing
        else if (isPastor && id && notice) {
            modalTitle.innerText = '알림 수정';
            editView.classList.remove('hidden');
            saveBtn.classList.remove('hidden');
            saveBtn.innerText = '수정완료';
            deleteBtn.classList.remove('hidden');
            closeBtn.classList.add('hidden');

            idInput.value = notice.id;
            titleInput.value = notice.title;
            contentInput.value = notice.content;
            populateCohortOptions();
            if (cohortSelect) cohortSelect.value = notice.targetCohort || 'all';
        }
        // Scenario 3: User/Admin viewing details
        else if (id && notice) {
            modalTitle.innerText = '알림 내용';
            readView.classList.remove('hidden');

            document.getElementById('notice-detail-title').innerText = notice.title;
            document.getElementById('notice-detail-date').innerText = new Date(notice.date).toLocaleDateString();
            document.getElementById('notice-detail-content').innerText = notice.content;

            const badge = document.getElementById('notice-detail-badge');
            if (badge) {
                badge.innerText = notice.targetCohort === 'all' ? '전체' : `${notice.targetCohort}기`;
                badge.style.background = notice.targetCohort === 'all' ? '#E8F5E9' : '#F2F4F6';
                badge.style.color = notice.targetCohort === 'all' ? '#4CAF50' : '#666';
            }
        }

        modal.classList.add('active');
        document.body.classList.add('modal-open');
    };

    window.closeNoticeModal = () => {
        const modal = document.getElementById('notice-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    };

    const populateCohortOptions = () => {
        const cohortSelect = document.getElementById('notice-input-cohort');
        if (!cohortSelect) return;
        const users = window.Utils.getStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, []);
        const cohorts = [...new Set(users.filter(u => u.cohort).map(u => u.cohort))].sort((a, b) => a - b);

        let optionsHtml = '<option value="all">전체 대상</option>';
        cohorts.forEach(c => {
            optionsHtml += `<option value="${c}">${c}기</option>`;
        });
        cohortSelect.innerHTML = optionsHtml;
    };

    window.saveNoticeAction = () => {
        const id = document.getElementById('notice-input-id').value;
        const title = document.getElementById('notice-input-title').value.trim();
        const content = document.getElementById('notice-input-content').value.trim();
        const targetCohort = document.getElementById('notice-input-cohort')?.value;

        if (!title || !content) {
            window.Utils.showToast('제목과 내용을 모두 입력해주세요.');
            return;
        }

        let notices = window.Utils.getStorageItem('grace_walk_notices', []);

        if (id) {
            const index = notices.findIndex(n => n.id === id);
            if (index !== -1) {
                notices[index] = { ...notices[index], title, content, targetCohort, date: new Date().toISOString() };
                window.Utils.showToast('알림이 수정되었습니다.');
            }
        } else {
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
        renderNotices();
        window.closeNoticeModal();
    };

    window.deleteNoticeAction = () => {
        const id = document.getElementById('notice-input-id').value;
        if (!id) return;
        if (!confirm('이 알림을 삭제하시겠습니까?')) return;

        let notices = window.Utils.getStorageItem('grace_walk_notices', []);
        notices = notices.filter(n => n.id !== id);
        window.Utils.setStorageItem('grace_walk_notices', notices);
        window.Utils.showToast('알림이 삭제되었습니다.');
        renderNotices();
        window.closeNoticeModal();
    };

    // Initial Render
    renderNotices();

    // Mark notices as read when page loads
    window.Utils.setStorageItem('last_notice_view', Date.now());

    // Update notification badge if function exists
    if (window.updateNotificationBadge) {
        window.updateNotificationBadge();
    }
})();
