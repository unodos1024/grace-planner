
const Auth = {
    signupData: {
        role: 'believer', id: '', pw: '', name: '', birth: '', phone: ''
    },

    getCurrentUserId() {
        return window.Utils.getStorageItem(window.CONFIG.STORAGE_KEYS.USER_ID);
    },

    getCurrentUser() {
        const userId = this.getCurrentUserId();
        if (!userId) return null;
        const users = window.Utils.getStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, []);
        return users.find(u => u.id === userId);
    },

    checkAuth() {
        const path = window.location.pathname;
        const pageName = path.split('/').pop() || 'index.html';
        const user = this.getCurrentUser();
        const userId = this.getCurrentUserId();

        const isAuthPage = path.includes('/pages/auth/');
        const isRootPage = pageName === 'index.html' && !path.includes('/pages/');

        if (!userId || (user && !user.isApproved)) {
            if (!isAuthPage) {
                const parts = path.split('/');
                const pagesIdx = parts.indexOf('pages');
                let targetPath = '';

                if (pagesIdx !== -1) {
                    const depth = parts.length - pagesIdx - 1;
                    targetPath = '../'.repeat(depth) + 'auth/login.html';
                } else {
                    targetPath = 'pages/auth/login.html';
                }

                if (!path.endsWith('login.html')) {
                    window.location.href = targetPath;
                }
            }
        } else {
            // Logged in
            if (isAuthPage || isRootPage) {
                const target = 'pages/layout/layout.html';
                let redirectPath = target;

                if (isAuthPage) {
                    redirectPath = '../../' + target;
                }
                window.location.href = redirectPath;
            } else {
                if (path.includes('/pages/') && !isAuthPage) {
                    if (window.Navigation && window.Navigation.injectNavigation) {
                        window.Navigation.injectNavigation(user.role);
                        if (window.Navigation.updateNavUI) window.Navigation.updateNavUI();
                    }
                }
            }
        }
    },

    handleLogout() {
        if (confirm('로그아웃 하시겠습니까?')) {
            localStorage.removeItem(window.CONFIG.STORAGE_KEYS.USER_ID);
            const path = window.location.pathname;
            const parts = path.split('/');
            const pagesIdx = parts.indexOf('pages');

            let rootPath = '';
            if (pagesIdx !== -1) {
                const depth = parts.length - pagesIdx - 1;
                rootPath = '../'.repeat(depth);
            }
            window.location.href = rootPath + 'index.html';
        }
    },

    // Login & Signup handlers
    goToAuthStep(step) {
        document.querySelectorAll('.auth-step').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(`auth-step-${step}`);
        if (target) target.classList.add('active');

        if (step === 'summary') this.renderSignupSummary();
    },

    handleLoginSubmit() {
        const id = document.getElementById('login-id').value.trim();
        const loginPw = document.getElementById('login-pw').value.trim();

        const registeredUsers = window.Utils.getStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, []);
        const user = registeredUsers.find(u => u.id === id && u.pw === loginPw);

        if (user) {
            if (!user.isApproved) {
                const finalPrompt = document.querySelector('#auth-step-final .login-prompt');
                const finalDesc = document.querySelector('#auth-step-final p');
                if (finalPrompt) finalPrompt.innerText = '승인 대기 중';
                if (finalDesc) finalDesc.innerHTML = '승인 대기 중인 계정입니다.<br>목회자님의 승인을 기다려주세요.';
                this.goToAuthStep('final');
                return;
            }

            window.Utils.setStorageItem(window.CONFIG.STORAGE_KEYS.USER_ID, user.id);
            this.checkAuth();
        } else {
            alert('아이디 또는 비밀번호가 틀렸습니다.');
        }
    },

    checkLoginInput() {
        // Optional: Real-time validation visual cues
        const id = document.getElementById('login-id').value.trim();
        const pw = document.getElementById('login-pw').value.trim();
        const btn = document.getElementById('btn-login');

        if (btn) {
            if (id && pw) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    },

    // Role Selection
    selectRole(role) {
        this.signupData.role = role;

        // Update UI buttons
        document.querySelectorAll('.role-select-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.role === role);
        });

        // Toggle fields visibility
        const fields = document.getElementById('believer-info-fields');
        if (fields) {
            fields.classList.toggle('hidden', role !== 'believer');

            // Clear fields when switching to pastor so validation doesn't get stuck on hidden fields (optional, but good practice)
            if (role === 'pastor') {
                const birth = document.getElementById('signup-birth');
                const phone = document.getElementById('signup-phone');
                if (birth) birth.value = '';
                if (phone) phone.value = '';
            }
        }

        // Re-run validation
        this.checkSignupInput();
    },

    // Consolidated Input Check with Real-time Feedback
    checkSignupInput() {
        const idEl = document.getElementById('signup-id');
        const pwEl = document.getElementById('signup-pw');
        const nameEl = document.getElementById('signup-name');

        const id = idEl.value.trim();
        const pw = pwEl.value.trim();
        const name = nameEl.value.trim();

        // 1. Validation Logic
        const isIdValid = /^[a-zA-Z0-9]{4,12}$/.test(id);
        const isPwValid = pw.length >= 4;
        const isNameValid = name.length >= 2;

        let isRoleValid = true;
        if (this.signupData.role === 'believer') {
            const birth = document.getElementById('signup-birth').value.trim();
            const phone = document.getElementById('signup-phone').value.trim();
            isRoleValid = /^\d{4}-\d{2}-\d{2}$/.test(birth) && /^\d{3}-\d{4}-\d{4}$/.test(phone);
        }

        const isValid = isIdValid && isPwValid && isNameValid && isRoleValid;

        // 2. Visual Feedback (Minimizing Layout Shift)
        const updateFieldState = (el, valid, condition) => {
            const group = el.closest('.input-group');
            if (group) {
                if (condition && !valid) group.classList.add('error');
                else group.classList.remove('error');
            }
        };

        if (id.length > 0) updateFieldState(idEl, isIdValid, id.length >= 4);
        if (pw.length > 0) updateFieldState(pwEl, isPwValid, pw.length >= 1);

        const btn = document.getElementById('btn-signup-confirm');
        if (btn) {
            btn.disabled = !isValid;
            btn.classList.toggle('active', isValid);
        }
    },

    // Summary Render Removed (Merged into form)

    submitSignup() {
        // Collect final data
        this.signupData.id = document.getElementById('signup-id').value.trim();
        this.signupData.pw = document.getElementById('signup-pw').value.trim();
        this.signupData.name = document.getElementById('signup-name').value.trim();
        if (this.signupData.role === 'believer') {
            this.signupData.birth = document.getElementById('signup-birth').value.trim();
            this.signupData.phone = document.getElementById('signup-phone').value.trim();
        }

        let registeredUsers = window.Utils.getStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, []);

        if (registeredUsers.find(u => u.id === this.signupData.id)) {
            alert('이미 존재하는 아이디입니다.');
            // Focus on ID field
            document.getElementById('signup-id').focus();
            return;
        }

        const newUser = {
            id: this.signupData.id,
            pw: this.signupData.pw,
            name: this.signupData.name,
            role: this.signupData.role,
            birth: this.signupData.role === 'believer' ? this.signupData.birth : '',
            phone: this.signupData.role === 'believer' ? this.signupData.phone : '',
            isApproved: false
        };

        registeredUsers.push(newUser);
        window.Utils.setStorageItem(window.CONFIG.STORAGE_KEYS.REGISTERED_USERS, registeredUsers);
        this.goToAuthStep('final');
    },

    // Auto-hyphen formatters
    formatBirthDate(input) {
        let value = input.value.replace(/[^0-9]/g, '');
        if (value.length > 8) value = value.slice(0, 8);

        if (value.length < 5) {
            input.value = value;
        } else if (value.length < 7) {
            input.value = `${value.slice(0, 4)}-${value.slice(4)}`;
        } else {
            input.value = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`;
        }
        this.checkSignupInput();
    },

    formatPhoneNumber(input) {
        let value = input.value.replace(/[^0-9]/g, '');
        if (value.length > 11) value = value.slice(0, 11);

        if (value.length < 4) {
            input.value = value;
        } else if (value.length < 8) {
            input.value = `${value.slice(0, 3)}-${value.slice(3)}`;
        } else {
            input.value = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7)}`;
        }
        this.checkSignupInput();
    }
};

// Map to global for HTML onclick handlers
window.Auth = Auth;
window.handleLoginSubmit = () => Auth.handleLoginSubmit();
window.checkLoginInput = () => Auth.checkLoginInput();
window.goToAuthStep = (step) => Auth.goToAuthStep(step);
window.selectRole = (role) => Auth.selectRole(role);
window.checkSignupInput = () => Auth.checkSignupInput();
window.submitSignup = () => Auth.submitSignup();
window.handleLogout = () => Auth.handleLogout();

// Formatters
window.formatBirthDate = (el) => Auth.formatBirthDate(el);
window.formatPhoneNumber = (el) => Auth.formatPhoneNumber(el);

// Initialize mock users for testing
const initMockUsers = () => {
    const REGISTERED_USERS_KEY = window.CONFIG?.STORAGE_KEYS?.REGISTERED_USERS || 'grace_walk_registered_users';
    let users = window.Utils.getStorageItem(REGISTERED_USERS_KEY, []);

    if (users.length === 0) {
        users = [
            { id: 'admin', pw: '1', name: '관리자', role: 'pastor', isApproved: true },
            { id: 'user', pw: '1', name: '테스트훈련생', role: 'believer', birth: '1995-01-01', cohort: '7', isApproved: true, roleTitle: '성도' }
        ];
    }

    // Add 10 more mock data if not exists
    const additionalUsers = [
        { id: 'user2', pw: '1', name: '김철수', role: 'believer', birth: '1990-02-05', cohort: '6', isApproved: true, phone: '010-1111-2222', roleTitle: '집사' },
        { id: 'user3', pw: '1', name: '이영희', role: 'believer', birth: '1992-02-12', cohort: '6', isApproved: true, phone: '010-3333-4444', roleTitle: '권사' },
        { id: 'user4', pw: '1', name: '박민수', role: 'believer', birth: '1985-02-20', cohort: '7', isApproved: true, phone: '010-5555-6666', roleTitle: '성도' }, // Today? approx.
        { id: 'user5', pw: '1', name: '정수진', role: 'believer', birth: '1988-11-25', cohort: '8', isApproved: true, phone: '010-7777-8888', roleTitle: '성도' },
        { id: 'user6', pw: '1', name: '최동훈', role: 'believer', birth: '1995-02-28', cohort: '8', isApproved: true, phone: '010-9999-0000', roleTitle: '집사' },
        { id: 'user7', pw: '1', name: '강지혜', role: 'believer', birth: '1998-02-14', cohort: '9', isApproved: true, phone: '010-1212-3434', roleTitle: '성도' },
        { id: 'user8', pw: '1', name: '윤서준', role: 'believer', birth: '1993-03-05', cohort: '9', isApproved: true, phone: '010-5656-7878', roleTitle: '성도' },
        { id: 'user9', pw: '1', name: '임현주', role: 'believer', birth: '1991-03-12', cohort: '10', isApproved: true, phone: '010-9090-1212', roleTitle: '권사' },
        { id: 'user10', pw: '1', name: '장도윤', role: 'believer', birth: '1987-02-10', cohort: '10', isApproved: true, phone: '010-3434-5656', roleTitle: '장로' },
        { id: 'user11', pw: '1', name: '송은영', role: 'believer', birth: '1994-04-18', cohort: '11', isApproved: true, phone: '010-7878-9090', roleTitle: '성도' }
    ];

    let changed = false;
    additionalUsers.forEach(u => {
        const existingIdx = users.findIndex(existing => existing.id === u.id);
        if (existingIdx === -1) {
            users.push(u);
            changed = true;
        } else {
            // Update existing mock users with new birthday data for the example
            if (users[existingIdx].birth !== u.birth) {
                users[existingIdx].birth = u.birth;
                changed = true;
            }
        }
    });

    if (changed || users.length === 2) { // Save if changed or if it was just initialized
        window.Utils.setStorageItem(REGISTERED_USERS_KEY, users);
        console.log('Mock users updated/initialized');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.CONFIG && window.Utils) {
        initMockUsers();
        Auth.checkAuth();
    }
});
