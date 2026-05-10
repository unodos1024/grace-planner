
(() => {
    let currentWeek = 1;
    let currentType = 'A'; // 'A' or 'B'
    let currentStep = 1;
    let versesData = [];
    let currentVerse = null;
    let currentKeywords = [];
    const maxSteps = 4;

    const init = () => {
        console.log("Memorization V2 (Data.js) Initializing...");
        versesData = window.VersesData || [];
        
        if (versesData.length === 0) {
            console.error("VersesData not found in window object.");
            return;
        }

        renderWeekGrid();
        updateDisplay();
    };

    const renderWeekGrid = () => {
        const gridContainer = document.getElementById('grid-container-32');
        if (!gridContainer) return;

        let html = '';
        for (let i = 1; i <= 32; i++) {
            const activeClass = i === currentWeek ? 'active' : '';
            html += `<button class="grid-btn ${activeClass}" data-week="${i}" onclick="selectWeek(${i})">${i}</button>`;
        }
        gridContainer.innerHTML = html;
    };

    window.toggleWeekGrid = () => {
        const panel = document.getElementById('week-grid-panel');
        const btn = document.getElementById('btn-toggle-week-grid');
        if (panel) panel.classList.toggle('hidden');
        if (btn) btn.classList.toggle('active');
    };

    window.selectWeek = (week) => {
        currentWeek = week;
        const panel = document.getElementById('week-grid-panel');
        const btn = document.getElementById('btn-toggle-week-grid');
        if (panel) panel.classList.add('hidden');
        if (btn) btn.classList.remove('active');
        renderWeekGrid();
        resetLearning();
    };

    const updateDisplay = () => {
        if (!versesData || versesData.length === 0) return;

        const weekData = versesData.find(v => v.week === currentWeek);
        if (!weekData) return;

        currentVerse = weekData[currentType];
        if (!currentVerse) return;

        // Header Update
        const subjectEl = document.getElementById('memo-display-subject');
        const refEl = document.getElementById('memo-display-ref');
        const weekBadge = document.getElementById('memo-selected-week');

        if (subjectEl) subjectEl.innerText = currentVerse.subject;
        if (refEl) refEl.innerText = currentVerse.reference;
        if (weekBadge) weekBadge.innerText = currentWeek;

        // Internal keyword extraction for "Hide Keyword" functionality
        currentKeywords = extractKeywords(currentVerse.text);
        
        renderLearningContent();
        updateUI();
    };

    const extractKeywords = (text) => {
        // Simple logic: words with 2 or more characters, pick top 5
        return text.split(/\s+/).filter(w => w.length >= 2).slice(0, 10);
    };

    const renderLearningContent = () => {
        if (!currentVerse) return;

        // Step 1: Read
        const fullVerseText = document.getElementById('full-verse-text');
        if (fullVerseText) fullVerseText.innerText = currentVerse.text;

        // Step 2: Conceal Area Setup (Combine Reference + Text for full memorization)
        const concealArea = document.getElementById('conceal-area');
        if (concealArea) {
            const combinedText = `${currentVerse.reference} ${currentVerse.text}`;
            const words = combinedText.split(/\s+/);
            concealArea.innerHTML = words.map(w => `<span class="conceal-word" onclick="this.classList.toggle('hidden-box')">${w}</span>`).join(' ');
        }

        const inputEl = document.getElementById('write-input');
        if (inputEl) inputEl.value = '';
    };

    window.moveStep = (direction) => {
        const nextStep = currentStep + direction;
        if (nextStep < 1 || nextStep > maxSteps) return;
        moveStepTo(nextStep);
    };

    window.moveStepTo = (step) => {
        if (step < 1 || step > maxSteps) return;
        currentStep = step;
        updateUI();
        if (currentStep === 4) runComparison();
    };

    const updateUI = () => {
        // Sync Step Items (Dots)
        document.querySelectorAll('.step-item').forEach(item => {
            const s = parseInt(item.getAttribute('data-step'));
            item.classList.toggle('active', s === currentStep);
            item.classList.toggle('completed', s < currentStep);
        });

        // Show/Hide Step Contents
        document.querySelectorAll('.step-content').forEach((content, i) => {
            content.classList.toggle('hidden', (i + 1) !== currentStep);
        });

        const progressFill = document.getElementById('memo-progress-fill');
        if (progressFill) {
            const progress = (currentStep / maxSteps) * 100;
            progressFill.style.width = `${progress}%`;
        }

        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');
        const btnRetry = document.getElementById('btn-retry');

        if (btnPrev) btnPrev.classList.toggle('hidden', currentStep === 1);
        if (btnNext) btnNext.classList.toggle('hidden', currentStep === 4);
        if (btnRetry) btnRetry.classList.toggle('hidden', currentStep !== 4);
    };

    window.switchVerseType = (type) => {
        currentType = type;
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('id') === `btn-type-${type}`);
        });
        resetLearning();
    };

    window.prevMemoWeek = () => {
        if (currentWeek > 1) {
            currentWeek--;
            renderWeekGrid();
            resetLearning();
        }
    };

    window.nextMemoWeek = () => {
        if (currentWeek < 32) {
            currentWeek++;
            renderWeekGrid();
            resetLearning();
        }
    };

    window.controlConceal = (type) => {
        const words = document.querySelectorAll('.conceal-word');
        const keywordBtns = document.querySelectorAll('.btn-text');
        
        keywordBtns.forEach(btn => {
            const btnText = btn.innerText;
            if (type === 'all') btn.classList.toggle('active', btnText.includes('모두 가리기'));
            else if (type === 'none') btn.classList.toggle('active', btnText.includes('모두 보기'));
            else if (type === 'keyword') btn.classList.toggle('active', btnText.includes('키워드만'));
        });

        words.forEach(el => {
            const text = el.innerText;
            if (type === 'all') el.classList.add('hidden-box');
            else if (type === 'none') el.classList.remove('hidden-box');
            else if (type === 'keyword') {
                const isKeyword = currentKeywords.some(k => text.includes(k));
                el.classList.toggle('hidden-box', isKeyword);
            }
        });
    };

    const runComparison = () => {
        const inputEl = document.getElementById('write-input');
        if (!inputEl) return;
        
        const input = inputEl.value.trim();
        const combinedOriginal = `${currentVerse.reference} ${currentVerse.text}`;
        const originalWords = combinedOriginal.split(/\s+/);
        const inputWords = input.split(/\s+/);
        
        let correctCount = 0;
        const resultHTML = [];

        const maxLen = Math.max(originalWords.length, inputWords.length);
        for (let i = 0; i < maxLen; i++) {
            const origin = originalWords[i] || "";
            const user = inputWords[i] || "";

            if (origin === user && origin !== "") {
                resultHTML.push(`<span>${origin}</span>`);
                correctCount++;
            } else {
                if (origin) resultHTML.push(`<span class="word-wrong">${origin}</span>`);
                if (user) resultHTML.push(`<span class="word-added">${user}</span>`);
            }
        }

        const resultArea = document.getElementById('compare-result');
        if (resultArea) resultArea.innerHTML = resultHTML.join(' ');
        
        const accuracy = Math.round((correctCount / originalWords.length) * 100);
        const accuracyEl = document.getElementById('accuracy-val');
        const correctCountEl = document.getElementById('correct-count');
        const totalCountEl = document.getElementById('total-count');

        if (accuracyEl) accuracyEl.innerText = accuracy;
        if (correctCountEl) correctCountEl.innerText = correctCount;
        if (totalCountEl) totalCountEl.innerText = originalWords.length;
    };

    window.resetLearning = () => {
        currentStep = 1;
        const inputEl = document.getElementById('write-input');
        if (inputEl) inputEl.value = '';
        updateDisplay();
    };

    init();
})();
