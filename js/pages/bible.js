window.BiblePage = {
    bibleData: null,
    currentBook: '창',
    currentChapter: 1,
    bookNames: {
        '창': '창세기', '출': '출애굽기', '레': '레위기', '민': '민수기', '신': '신명기',
        '수': '여호수아', '삿': '사사기', '룻': '룻기', '삼상': '사무엘상', '삼하': '사무엘하',
        '왕상': '열왕기상', '왕하': '열왕기하', '대상': '역대상', '대하': '역대하', '스': '에스라',
        '느': '느헤미야', '에': '에스더', '욥': '욥기', '시': '시편', '잠': '잠언',
        '전': '전도서', '아': '아가', '사': '이사야', '예': '예레미야', '애': '예레미야애가',
        '겔': '에스겔', '단': '다니엘', '호': '호세아', '요엘': '요엘', '암': '아모스',
        '옵': '오바댜', '요나': '요나', '미': '미가', '나': '나훔', '합': '하박국',
        '습': '스바냐', '학': '학개', '슥': '스가랴', '말': '말라기',
        '마': '마태복음', '막': '마가복음', '눅': '누가복음', '요': '요한복음', '행': '사도행전',
        '롬': '로마서', '고전': '고린도전서', '고후': '고린도후서', '갈': '갈라디아서', '엡': '에베소서',
        '빌': '빌립보서', '골': '골로새서', '살전': '데살로니가전서', '살후': '데살로니가후서', '딤전': '디모데전서',
        '딤후': '디모데후서', '딛': '디도서', '몬': '빌레몬서', '히': '히브리서', '야': '야고보서',
        '벧전': '베드로전서', '벧후': '베드로후서', '요일': '요한일서', '요이': '요한이서', '요삼': '요한삼서',
        '유': '유다서', '계': '요한계시록'
    },

    async init() {
        try {
            this.renderLoading();
            await this.loadData();
            this.currentFontSize = parseInt(localStorage.getItem('bible-font-size')) || 16;
            this.renderVerses();
            this.updateSelectorLabels();
            this.initGestures();
        } catch (error) {
            console.error('Bible data load failed:', error);
            this.renderError();
        }
    },

    // --- Font Size Control ---
    changeFontSize(delta) {
        this.currentFontSize = Math.min(Math.max(this.currentFontSize + delta, 12), 30);
        localStorage.setItem('bible-font-size', this.currentFontSize);
        this.applyFontSize();
    },

    applyFontSize() {
        const view = document.querySelector('.bible-reader-view');
        if (view) {
            view.style.setProperty('--bible-font-size', `${this.currentFontSize}px`);
        }
    },

    // --- Gesture Support ---
    initGestures() {
        const wrapper = document.querySelector('.bible-page-wrapper');
        const mobileNav = document.getElementById('mobile-nav-container');
        if (!wrapper) return;

        let lastScrollY = window.scrollY;

        // --- Scroll to Hide Nav ---
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            if (!mobileNav) return;

            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                mobileNav.classList.add('hidden');
            } else {
                mobileNav.classList.remove('hidden');
            }
            lastScrollY = currentScrollY;
        }, { passive: true });

        // --- Swipe Gestures ---
        let startX = 0;
        let startY = 0;

        wrapper.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });

        wrapper.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;

            const diffX = endX - startX;
            const diffY = endY - startY;

            // Swipe threshold (50px) and ensure it's primarily horizontal
            if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 0) {
                    this.navigateChapter(-1); // Right swipe -> Prev
                } else {
                    this.navigateChapter(1);  // Left swipe -> Next
                }
            }
        }, { passive: true });
    },

    navigateChapter(step) {
        const nextChapter = this.currentChapter + step;
        const maxChapters = this.getMaxChapters(this.currentBook);

        if (nextChapter >= 1 && nextChapter <= maxChapters) {
            this.currentChapter = nextChapter;
            this.renderVerses();
            this.updateSelectorLabels();

            // Visual feedback - simple fade effect
            const view = document.querySelector('.bible-reader-view');
            if (view) {
                view.style.animation = 'none';
                view.offsetHeight; // trigger reflow
                view.style.animation = 'fadeUp 0.4s ease';
            }
        }
    },

    getMaxChapters(abbr) {
        let maxChapter = 0;
        for (const key of Object.keys(this.bibleData)) {
            if (key.startsWith(abbr)) {
                const chapterMatch = key.match(new RegExp(`^${abbr}(\\d+):`));
                if (chapterMatch) {
                    const c = parseInt(chapterMatch[1]);
                    if (c > maxChapter) maxChapter = c;
                }
            }
        }
        return maxChapter;
    },

    async loadData() {
        if (this.bibleData) return;
        const response = await fetch('../../data/bible.json');
        this.bibleData = await response.json();
    },

    renderLoading() {
        const content = document.querySelector('.bible-page-wrapper');
        if (content) {
            // Check if widget and modal exist to preserve them
            const existing = content.querySelectorAll('.bible-search-fab, .modal-overlay');
            content.innerHTML = '<div class="loading-spinner"></div>';
            existing.forEach(el => content.appendChild(el));
        }
    },

    renderError() {
        const content = document.querySelector('.bible-page-wrapper');
        if (content) {
            const existing = content.querySelectorAll('.bible-search-fab, .modal-overlay');
            content.innerHTML = '<p class="error-msg">성경 데이터를 불러오는 데 실패했습니다.</p>';
            existing.forEach(el => content.appendChild(el));
        }
    },

    updateSelectorLabels() {
        const infoLabel = document.getElementById('current-bible-info');
        if (infoLabel) {
            const fullBookName = this.bookNames[this.currentBook] || this.currentBook;
            infoLabel.innerText = `${fullBookName} ${this.currentChapter}장`;
        }
    },

    renderVerses() {
        const wrapper = document.querySelector('.bible-page-wrapper');
        if (!wrapper || !this.bibleData) return;

        // Sort keys to ensure chronological order (BookChapter:Verse)
        const prefix = `${this.currentBook}${this.currentChapter}:`;
        const verses = Object.keys(this.bibleData)
            .filter(key => key.startsWith(prefix))
            .sort((a, b) => {
                const partsA = a.split(':');
                const partsB = b.split(':');
                return parseInt(partsA[1]) - parseInt(partsB[1]);
            });

        if (verses.length === 0) {
            const existing = wrapper.querySelectorAll('.bible-search-fab, .modal-overlay');
            wrapper.innerHTML = '<p class="empty-msg">해당 장의 본문을 찾을 수 없습니다.</p>';
            existing.forEach(el => wrapper.appendChild(el));
            return;
        }

        const bookName = this.bookNames[this.currentBook] || this.currentBook;
        let html = `
            <div class="bible-reader-view">
                <div class="bible-page-header-row">
                    <div class="bible-page-title">${bookName} ${this.currentChapter}장</div>
                    <div class="font-size-control">
                        <button onclick="BiblePage.changeFontSize(-1)" class="btn-font">가-</button>
                        <button onclick="BiblePage.changeFontSize(1)" class="btn-font">가+</button>
                    </div>
                </div>
        `;
        verses.forEach(key => {
            const verseNum = key.split(':')[1];
            const text = this.bibleData[key];
            html += `
                <div class="verse-row">
                    <span class="verse-num">${verseNum}</span>
                    <span class="verse-text">${text}</span>
                </div>
            `;
        });
        html += '</div>';

        // Find existing non-content elements to preserve them
        const existing = wrapper.querySelectorAll('.bible-search-fab, .modal-overlay');
        wrapper.innerHTML = html;
        existing.forEach(el => wrapper.appendChild(el));

        this.applyFontSize(); // Apply saved font size immediately after render
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // --- Modal Selector Logic ---
    openSelectorModal() {
        const modal = document.getElementById('bible-selector-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.renderBookGrid();
        }
    },

    closeSelectorModal() {
        const modal = document.getElementById('bible-selector-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    renderBookGrid() {
        const gridOld = document.getElementById('bible-book-grid-old');
        const gridNew = document.getElementById('bible-book-grid-new');
        if (!gridOld || !gridNew) return;

        // Old Testament boundaries (Genesis to Malachi)
        const otBooks = [
            '창', '출', '레', '민', '신', '수', '삿', '룻', '삼상', '삼하',
            '왕상', '왕하', '대상', '대하', '스', '느', '에', '욥', '시', '잠',
            '전', '아', '사', '예', '애', '겔', '단', '호', '요엘', '암',
            '옵', '요나', '미', '나', '합', '습', '학', '슥', '말'
        ];

        let htmlOld = '';
        let htmlNew = '';

        for (const [abbr, fullName] of Object.entries(this.bookNames)) {
            const isActive = abbr === this.currentBook;
            const itemHtml = `<div class="book-item ${isActive ? 'active' : ''}" onclick="BiblePage.selectBook('${abbr}')">${fullName}</div>`;

            if (otBooks.includes(abbr)) {
                htmlOld += itemHtml;
            } else {
                htmlNew += itemHtml;
            }
        }

        gridOld.innerHTML = htmlOld;
        gridNew.innerHTML = htmlNew;

        document.getElementById('chapter-selection-section').classList.add('hidden');
    },

    selectBook(abbr) {
        this.tempSelectedBook = abbr;

        // Highlight in UI (searching both grids)
        const items = document.querySelectorAll('.book-item');
        items.forEach(item => {
            item.classList.toggle('active', item.innerText === this.bookNames[abbr]);
        });

        this.renderChapterGrid(abbr);
    },

    renderChapterGrid(abbr) {
        const section = document.getElementById('chapter-selection-section');
        const grid = document.getElementById('bible-chapter-grid');
        if (!section || !grid) return;

        section.classList.remove('hidden');

        // Logic to determine max chapters
        let maxChapter = 0;
        for (const key of Object.keys(this.bibleData)) {
            if (key.startsWith(abbr)) {
                const chapterMatch = key.match(new RegExp(`^${abbr}(\\d+):`));
                if (chapterMatch) {
                    const c = parseInt(chapterMatch[1]);
                    if (c > maxChapter) maxChapter = c;
                }
            }
        }

        let html = '';
        for (let i = 1; i <= maxChapter; i++) {
            const isActive = abbr === this.currentBook && i === this.currentChapter;
            html += `<div class="chapter-item ${isActive ? 'active' : ''}" onclick="BiblePage.selectChapter(${i})">${i}</div>`;
        }
        grid.innerHTML = html;

        // Modal smooth scroll to chapter grid
        setTimeout(() => {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    },

    selectChapter(chapter) {
        if (this.tempSelectedBook) {
            this.currentBook = this.tempSelectedBook;
            this.currentChapter = chapter;

            this.updateSelectorLabels();
            this.renderVerses();
            this.closeSelectorModal();
        }
    },

    destroy() {
        document.body.style.overflow = '';
    }
};

// Auto-init logic
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.BiblePage.init());
} else if (document.getElementById('bible-content')) {
    window.BiblePage.init();
}

