
(() => {
    let currentWeek = 1;
    let currentType = 'A'; // 'A' or 'B'
    let currentQuizVerse = null;
    let quizBlanks = [];
    let quizUserAnswers = [];
    let currentDifficulty = 4; // Number of blanks or 'all'

    const init = () => {
        renderWeekGrid();
        loadVerseData();
        initSwipeEvents();

        // Force bottom navigation visibility
        const mobileNav = document.getElementById('mobile-nav-container');
        if (mobileNav) {
            mobileNav.classList.remove('hidden');
            mobileNav.style.display = 'flex';
        }
    };

    let touchStartX = 0;
    const initSwipeEvents = () => {
        const board = document.querySelector('.game-board');
        if (!board) return;
        board.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
        board.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const deltaX = touchEndX - touchStartX;
            if (Math.abs(deltaX) > 50) {
                if (deltaX > 0) prevMemoWeek();
                else nextMemoWeek();
            }
        }, { passive: true });
    };

    const renderWeekGrid = () => {
        const grid = document.getElementById('memo-week-grid');
        if (!grid) return;
        grid.innerHTML = '';
        for (let i = 1; i <= 32; i++) {
            const btn = document.createElement('div');
            btn.className = 'mini-week-btn' + (i === currentWeek ? ' selected' : '');
            btn.innerText = i;
            btn.onclick = (e) => {
                e.stopPropagation();
                currentWeek = i;
                document.querySelectorAll('.mini-week-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                loadVerseData();
            };
            grid.appendChild(btn);
        }
    };

    window.toggleMemoWeekGrid = () => {
        const grid = document.getElementById('memo-week-grid');
        const btn = document.getElementById('btn-toggle-grid');
        if (grid) {
            const isHidden = grid.classList.toggle('hidden');
            if (btn) btn.classList.toggle('active', !isHidden);
        }
    };

    window.prevMemoWeek = () => { if (currentWeek > 1) { currentWeek--; loadVerseData(); renderWeekGrid(); } };
    window.nextMemoWeek = () => { if (currentWeek < 32) { currentWeek++; loadVerseData(); renderWeekGrid(); } };

    window.switchVerseType = (type) => {
        currentType = type;
        document.getElementById('btn-type-A').classList.toggle('active', type === 'A');
        document.getElementById('btn-type-B').classList.toggle('active', type === 'B');
        loadVerseData();
    };

    window.setDifficulty = (diff) => {
        currentDifficulty = diff;
        document.querySelectorAll('.btn-diff').forEach(btn => {
            const level = btn.getAttribute('data-level');
            btn.classList.toggle('active', level == diff);
        });
        generateQuiz();
    };

    const loadVerseData = () => {
        const verses = window.VersesData || [];
        const weekData = verses.find(v => v.week === currentWeek) || verses[0];
        if (!weekData) return;
        const verse = weekData[currentType];
        if (!verse) return;

        document.getElementById('memo-selected-week').innerText = currentWeek;
        const subjectEl = document.getElementById('quiz-display-subject');
        const refEl = document.getElementById('quiz-display-ref');
        if (subjectEl) subjectEl.innerText = verse.subject;
        if (refEl) refEl.innerText = verse.reference;

        currentQuizVerse = verse;
        generateQuiz();
    };

    window.generateQuiz = () => {
        if (!currentQuizVerse) return;
        
        const words = currentQuizVerse.text.split(' ');
        const questionContainer = document.getElementById('quiz-question-container');
        const choicesContainer = document.getElementById('quiz-choices-container');
        if (!questionContainer || !choicesContainer) return;

        const possibleIndices = words.map((w, i) => i).filter(i => words[i].length >= 1);
        
        let blankCount = currentDifficulty === 'all' ? possibleIndices.length : parseInt(currentDifficulty);
        blankCount = Math.min(blankCount, possibleIndices.length);

        const shuffledIndices = [...possibleIndices].sort(() => Math.random() - 0.5);
        quizBlanks = shuffledIndices.slice(0, blankCount).sort((a, b) => a - b);
        quizUserAnswers = new Array(quizBlanks.length).fill(null);

        questionContainer.innerHTML = ''; // Clear and build manually for safety
        words.forEach((word, index) => {
            const blankIndex = quizBlanks.indexOf(index);
            if (blankIndex !== -1) {
                const span = document.createElement('span');
                span.className = 'quiz-blank';
                span.id = `quiz-blank-${blankIndex}`;
                span.onclick = () => handleBlankClick(blankIndex);
                questionContainer.appendChild(span);
                questionContainer.appendChild(document.createTextNode(' '));
            } else {
                questionContainer.appendChild(document.createTextNode(word + ' '));
            }
        });

        const hiddenWords = quizBlanks.map(idx => words[idx]);
        const shuffledChoices = [...hiddenWords].sort(() => Math.random() - 0.5);
        
        choicesContainer.innerHTML = '';
        shuffledChoices.forEach((word, idx) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-choice';
            btn.innerText = word;
            btn.id = `choice-${idx}`;
            btn.onclick = () => handleChoiceClick(btn, word);
            choicesContainer.appendChild(btn);
        });
    };

    window.handleChoiceClick = (btn, word) => {
        // If already used, undo it
        if (btn.classList.contains('used')) {
            const blankIdx = quizUserAnswers.findIndex(ans => ans && ans.btnId === btn.id);
            if (blankIdx !== -1) handleBlankClick(blankIdx);
            return;
        }

        const emptyIdx = quizUserAnswers.findIndex(ans => ans === null);
        if (emptyIdx === -1) return;
        
        quizUserAnswers[emptyIdx] = { word: word, btnId: btn.id };
        const blank = document.getElementById(`quiz-blank-${emptyIdx}`);
        if (blank) {
            blank.innerText = word;
            blank.classList.add('filled');
        }
        btn.classList.add('used');
    };

    window.handleBlankClick = (blankIndex) => {
        const answer = quizUserAnswers[blankIndex];
        if (!answer) return;

        // Reset the button
        const btn = document.getElementById(answer.btnId);
        if (btn) btn.classList.remove('used');

        // Clear the blank
        quizUserAnswers[blankIndex] = null;
        const blank = document.getElementById(`quiz-blank-${blankIndex}`);
        if (blank) {
            blank.innerText = '';
            blank.classList.remove('filled');
        }
    };

    window.checkQuizAnswer = () => {
        if (!currentQuizVerse) return;
        const words = currentQuizVerse.text.split(' ');
        const correctAnswers = quizBlanks.map(idx => words[idx]);
        const isCorrect = quizUserAnswers.every((ans, i) => ans && ans.word === correctAnswers[i]);

        if (isCorrect) {
            if (window.Utils?.createConfetti) window.Utils.createConfetti();
            window.Utils?.showToast('정답입니다! ✨');
            setTimeout(() => { if (confirm('다음 단계로 도전하시겠습니까?')) { generateQuiz(); } }, 500);
        } else {
            window.Utils?.showToast('틀렸습니다. 다시 해보세요!');
            
            // Fully reset current answers on failure
            quizUserAnswers.fill(null);
            document.querySelectorAll('.quiz-blank').forEach(b => { 
                b.innerText = ''; 
                b.classList.remove('filled'); 
            });
            document.querySelectorAll('.quiz-choice').forEach(c => {
                c.classList.remove('used');
            });
        }
    };

    init();
})();
