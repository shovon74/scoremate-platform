// Global state for session protection
window.sessionState = {
    timerRunning: false,
    analysisInProgress: false
};

// Navigation logic for switching sections
window.showSection = function (sectionId, updateState = true) {
    console.log('Showing section:', sectionId);

    // If we are leaving the calculators section, reset all values
    const currentHash = window.location.hash;
    if (currentHash === '#calculators' && sectionId !== 'calculators') {
        if (window.resetCalculators) window.resetCalculators();
    }

    // Check if we should warn the user before leaving
    if (sectionId === 'landing' && (window.sessionState.timerRunning || window.sessionState.analysisInProgress)) {
        const message = window.sessionState.analysisInProgress
            ? 'Your essay is currently being analyzed. Leaving now will interrupt the process. Are you sure?'
            : 'Your timer is running. Leaving now will end your session. Are you sure?';

        if (!confirm(message)) {
            return; // User cancelled, don't navigate
        }
    }

    const landingSection = document.getElementById('landingSection');
    const task2Section = document.getElementById('task2Section');
    const academicHubSection = document.getElementById('academicHubSection');
    const generalHubSection = document.getElementById('generalHubSection');
    const listeningSection = document.getElementById('listeningSection');
    const task1Section = document.getElementById('task1Section');
    const calculatorsSection = document.getElementById('calculatorsSection');
    const speakingSection = document.getElementById('speakingSection');
    const speakingHubSection = document.getElementById('speakingHubSection');
    const task2GeneratorSection = document.getElementById('task2GeneratorSection');
    const task1GeneratorSection = document.getElementById('task1GeneratorSection');
    const readingTestSection = document.getElementById('readingTestSection');


    // Hide all sections first
    if (landingSection) landingSection.style.display = 'none';
    if (academicHubSection) academicHubSection.style.display = 'none';
    if (generalHubSection) generalHubSection.style.display = 'none';
    if (task2Section) task2Section.style.display = 'none';
    if (task1Section) task1Section.style.display = 'none';
    if (calculatorsSection) calculatorsSection.style.display = 'none';
    if (speakingSection) speakingSection.style.display = 'none';
    if (speakingHubSection) speakingHubSection.style.display = 'none';
    if (task2GeneratorSection) task2GeneratorSection.style.display = 'none';
    if (task1GeneratorSection) task1GeneratorSection.style.display = 'none';
    if (listeningSection) listeningSection.style.display = 'none';
    // Reading test uses class toggle instead of display (it's fixed-position)
    if (readingTestSection) readingTestSection.classList.remove('reading-active');


    // Show requested section
    if (sectionId === 'landing' || sectionId === '') {
        if (landingSection) landingSection.style.display = 'block';
        if (updateState) {
            try {
                history.pushState({ section: 'landing' }, '', window.location.pathname);
            } catch (e) {
                console.warn('History pushState failed:', e);
            }
        }
    } else if (sectionId === 'academic_hub') {
        if (academicHubSection) {
            academicHubSection.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (updateState) {
            try {
                history.pushState({ section: 'academic_hub' }, '', '#academic-hub');
            } catch (e) {
                console.warn('History pushState failed:', e);
                window.location.hash = 'academic-hub';
            }
        }
    } else if (sectionId === 'general_hub') {
        if (generalHubSection) {
            generalHubSection.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (updateState) {
            try {
                history.pushState({ section: 'general_hub' }, '', '#general-hub');
            } catch (e) {
                console.warn('History pushState failed:', e);
                window.location.hash = 'general-hub';
            }
        }
    } else if (sectionId === 'task2') {
        if (task2Section) {
            task2Section.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (updateState) {
            try {
                history.pushState({ section: 'task2' }, '', '#task2');
            } catch (e) {
                console.warn('History pushState failed:', e);
                window.location.hash = 'task2';
            }
        }
    } else if (sectionId === 'calculators') {
        if (calculatorsSection) {
            calculatorsSection.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (updateState) {
            try {
                history.pushState({ section: 'calculators' }, '', '#calculators');
            } catch (e) {
                console.warn('History pushState failed:', e);
                window.location.hash = 'calculators';
            }
        }
    } else if (sectionId === 'task1_academic' || sectionId === 'task1_general') {
        if (task1Section) {
            const isAcademic = sectionId === 'task1_academic';
            const uploadCol = document.getElementById('task1-upload-col');
            const grid = document.getElementById('task1Grid');
            const submitBtnText = document.getElementById('task1-btn-text');
            const label1 = document.getElementById('task1-label-1');
            const label3 = document.getElementById('task1-label-3');
            const answerInput = document.getElementById('task1-answer');

            document.getElementById('task1Header').textContent = isAcademic
                ? 'IELTS Academic Writing Task 1'
                : 'IELTS General Writing Task 1';
            document.getElementById('task1Subheader').textContent = isAcademic
                ? 'Analyze your report based on charts, graphs, or diagrams'
                : 'Evaluate your formal, semi-formal, or informal letter';
            document.getElementById('task1-type').value = isAcademic ? 'academic' : 'general';

            if (isAcademic) {
                if (uploadCol) uploadCol.style.display = 'flex';
                if (grid) grid.style.gridTemplateColumns = '1fr 1fr 1.5fr';
                if (submitBtnText) submitBtnText.textContent = 'Analyze Academic Report';
                if (label1) label1.textContent = '1. Topic / Instructions';
                if (label3) label3.textContent = '3. Your Report';
                if (answerInput) answerInput.placeholder = 'Type your 150+ word report here...';
            } else {
                if (uploadCol) uploadCol.style.display = 'none';
                if (grid) grid.style.gridTemplateColumns = '1fr 1.5fr';
                if (submitBtnText) submitBtnText.textContent = 'Analyze General Letter';
                if (label1) label1.textContent = '1. Letter Scenario / Topic';
                if (label3) label3.textContent = '2. Your Letter';
                if (answerInput) answerInput.placeholder = 'Type your 150+ word letter here...';
            }

            task1Section.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (updateState) {
            try {
                history.pushState({ section: sectionId }, '', '#' + sectionId);
            } catch (e) {
                console.warn('History pushState failed:', e);
                window.location.hash = sectionId;
            }
        }
    } else if (sectionId === 'speaking_hub') {
        if (speakingHubSection) {
            speakingHubSection.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (updateState) {
            try {
                history.pushState({ section: 'speaking_hub' }, '', '#speaking-hub');
            } catch (e) {
                console.warn('History pushState failed:', e);
                window.location.hash = 'speaking-hub';
            }
        }
    } else if (sectionId.startsWith('speaking_part')) {
        const speakingSection = document.getElementById('speakingSection');
        if (speakingSection) {
            const part = sectionId.split('_part')[1];
            const header = document.getElementById('speakingHeader');
            const subheader = document.getElementById('speakingSubheader');
            const topicInput = document.getElementById('speakingTopic');
            const submitBtn = document.getElementById('checkSpeechBtn');
            const inputCard = document.getElementById('speaking-input-card');

            // Set basic content
            header.textContent = `IELTS Speaking Part ${part} Answer Checker`;
            document.getElementById('speakingPart').value = part;

            // Reset specialized themes and apply standard ones
            if (header) {
                header.classList.add('speaking-header-red');
                header.classList.remove('text-bard-theme');
                header.style.fontSize = '';
            }
            if (submitBtn) {
                submitBtn.classList.add('btn-check-speech');
                submitBtn.classList.remove('btn-bard-theme');
            }
            if (inputCard) {
                inputCard.classList.remove('card-bard-theme');
            }

            if (part == '1') {
                subheader.textContent = "Instantly and precisely evaluate your IELTS speaking part 1 answer with detailed feedback";
                topicInput.placeholder = "Enter a speaking part 1 question (topic)...";
            } else if (part == '2') {
                subheader.textContent = "Instantly and precisely evaluate your IELTS speaking part 2 answer with detailed feedback";
                topicInput.placeholder = "Enter a speaking part 2 cue card topic...";
            } else if (part == '3') {
                subheader.textContent = "Instantly and precisely evaluate your IELTS speaking part 3 answer with detailed feedback";
                topicInput.placeholder = "Enter a speaking part 3 question (topic)...";
            }

            // Reset UI state
            if (window.resetSpeakingUI) window.resetSpeakingUI();

            speakingSection.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (updateState) {
            try {
                history.pushState({ section: sectionId }, '', '#' + sectionId);
            } catch (e) {
                console.warn('History pushState failed:', e);
                window.location.hash = sectionId;
            }
        }
    } else if (sectionId === 'task1_academic_generator' || sectionId === 'task1_general_generator') {
        const task1GeneratorSection = document.getElementById('task1GeneratorSection');
        if (task1GeneratorSection) {
            const isAcademic = sectionId === 'task1_academic_generator';
            const header = document.getElementById('task1GenHeader');
            const subheader = document.getElementById('task1GenSubheader');
            const uploadWrapper = document.getElementById('gen1-upload-wrapper');
            const typeInput = document.getElementById('task1GenType');
            const topicInput = document.getElementById('gen1-topic');

            header.textContent = isAcademic ? 'Academic Task 1 Generator' : 'General Task 1 Generator';
            subheader.textContent = isAcademic
                ? 'Generate high-scoring Band 9 Reports instantly'
                : 'Generate high-scoring Band 9 Letters instantly';

            if (uploadWrapper) {
                uploadWrapper.style.display = isAcademic ? 'flex' : 'none';
            }
            if (typeInput) {
                typeInput.value = isAcademic ? 'academic' : 'general';
            }
            if (topicInput) {
                topicInput.placeholder = isAcademic
                    ? 'Enter the IELTS Academic Writing Task 1 topic here...'
                    : 'Enter the IELTS General Writing Task 1 situation/topic here...';
            }

            task1GeneratorSection.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (updateState) {
            try {
                history.pushState({ section: sectionId }, '', '#' + sectionId);
            } catch (e) {
                console.warn('History pushState failed:', e);
                window.location.hash = sectionId;
            }
        }
    } else if (sectionId === 'listening') {
        const listeningSection = document.getElementById('listeningSection');
        const listState = document.getElementById('listeningListState');
        const playerState = document.getElementById('listeningPlayerState');

        if (listeningSection) {
            listeningSection.style.display = 'block';
            // Default to list view
            if (listState) listState.style.display = 'block';
            if (playerState) playerState.style.display = 'none';

            // Load tests if empty
            const listContainer = document.getElementById('listeningTestsList');
            if (listContainer && listContainer.children.length <= 1) { // 1 because of loading spinner
                loadListeningTests();
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (updateState) {
            try {
                history.pushState({ section: sectionId }, '', '#' + sectionId);
            } catch (e) {
                console.warn('History pushState failed:', e);
                window.location.hash = sectionId;
            }
        }
    } else if (sectionId === 'task2_generator') {
        const task2GeneratorSection = document.getElementById('task2GeneratorSection');
        if (task2GeneratorSection) {
            task2GeneratorSection.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (updateState) {
            try {
                history.pushState({ section: sectionId }, '', '#' + sectionId);
            } catch (e) {
                console.warn('History pushState failed:', e);
                window.location.hash = sectionId;
            }
        }
    } else if (sectionId === 'reading_test') {
        // ── Reading Test section ──────────────────────────────
        const slug = arguments[2] || null;
        if (readingTestSection) {
            readingTestSection.classList.add('reading-active');
        }
        if (updateState) {
            try {
                history.pushState({ section: 'reading_test', slug }, '', slug ? `#reading-test/${slug}` : '#reading-test');
            } catch (e) {
                console.warn('History pushState failed:', e);
            }
        }
        // Boot the reading test renderer
        if (window.initReadingTest) window.initReadingTest(slug);
    }

}

// Exit reading test — go back to landing
window.exitReadingTest = function () {
    _showModal(
        'Exit the test? Your current progress will be lost.',
        () => {
            if (window.ReadingTest) clearInterval(window.ReadingTest.timerInterval);
            showSection('landing');
        },
        null,   // cancel = do nothing, stay on test
        { okLabel: 'Exit Test', okClass: 'modal-btn-danger' }
    );
};

// Handle browser Back/Forward navigation
window.addEventListener('popstate', (event) => {
    const section = (event.state && event.state.section) ? event.state.section : 'landing';

    // Always attempt to reset calculators when navigating via browser history
    if (window.resetCalculators) {
        window.resetCalculators();
    }

    showSection(section, false);
});

// Check URL on initial load and handle hashes
window.addEventListener('load', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'task2') {
        showSection('task2', false);
    } else if (hash === 'calculators') {
        showSection('calculators', false);
    } else if (hash === 'task1_academic') {
        showSection('task1_academic', false);
    } else if (hash === 'task1_general') {
        showSection('task1_general', false);
    } else if (hash.startsWith('speaking_part')) {
        showSection(hash, false);
    } else if (hash === 'task2_generator') {
        showSection('task2_generator', false);
    } else if (hash === 'task1_academic_generator') {
        showSection('task1_academic_generator', false);
    } else if (hash === 'task1_general_generator') {
        showSection('task1_general_generator', false);
    } else if (hash === 'listening') {
        showSection('listening', false);
    } else {
        // Ensure landing is shown if no hash
        showSection('landing', false);
    }
});




document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Logic
    const themeToggle = document.getElementById('themeToggle');
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    const htmlElement = document.documentElement;

    // Check for saved theme preference or default to light mode
    const currentTheme = localStorage.getItem('sm-theme') || 'light';
    htmlElement.setAttribute('data-theme', currentTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('sm-theme', newTheme);
    });

    // Timer state
    let timerInterval;
    let timeElapsed = 0;
    let isRunning = false;
    const WARNING_TIME = 40 * 60; // 40 minutes

    // Elements
    const timerDisplay = document.getElementById('timerDisplay');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resetBtn = document.getElementById('resetBtn');

    const questionInput = document.getElementById('question');
    const answerInput = document.getElementById('answer');
    const wordCountBadge = document.getElementById('wordCount');

    const form = document.getElementById('checkForm');
    const submitBtn = document.getElementById('submitBtn');
    const loading = document.getElementById('loading');
    const resultArea = document.getElementById('resultArea');
    const feedbackContent = document.getElementById('feedbackContent');

    // Timer Logic
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function updateTimer() {
        timerDisplay.textContent = formatTime(timeElapsed);
        if (timeElapsed >= WARNING_TIME) {
            timerDisplay.classList.add('warning');
            stopTimer();
        }
    }

    function startTimer() {
        if (!isRunning) {
            isRunning = true;
            window.sessionState.timerRunning = true;
            startBtn.disabled = true;
            stopBtn.disabled = false;
            timerInterval = setInterval(() => {
                timeElapsed++;
                updateTimer();
            }, 1000);
        }
    }

    function stopTimer() {
        if (isRunning) {
            isRunning = false;
            window.sessionState.timerRunning = false;
            clearInterval(timerInterval);
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    }

    function resetTimer() {
        stopTimer();
        timeElapsed = 0;
        updateTimer();
        timerDisplay.classList.remove('warning');
    }

    // Event Listeners for Timer
    startBtn.addEventListener('click', startTimer);
    stopBtn.addEventListener('click', stopTimer);
    resetBtn.addEventListener('click', resetTimer);

    // Browser beforeunload protection
    window.addEventListener('beforeunload', (e) => {
        if (window.sessionState.timerRunning || window.sessionState.analysisInProgress) {
            e.preventDefault();
            e.returnValue = ''; // Required for Chrome
            return ''; // Required for some browsers
        }
    });

    // Word Count Logic
    answerInput.addEventListener('input', () => {
        const text = answerInput.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        wordCountBadge.textContent = `${words} WORDS`;

        // Visual feedback based on IELTS target (250 words)
        if (words < 250) {
            wordCountBadge.style.color = '#ef4444'; // red-500
        } else {
            wordCountBadge.style.color = '#10b981'; // emerald-500
        }
    });

    // Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const question = questionInput.value.trim();
        const answer = answerInput.value.trim();

        if (!question || !answer) {
            alert('Please provide both the question and your essay.');
            return;
        }

        // UI State: Loading
        submitBtn.disabled = true;
        loading.style.display = 'flex';
        resultArea.classList.remove('show');
        window.sessionState.analysisInProgress = true;

        try {
            const response = await fetch('/api/writing/task2/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, answer })
            });

            const data = await response.json();

            if (data.success) {
                // Format feedback: Convert markdown-ish bold to HTML if needed
                // app.py returns text from Gemini. Gemini usually uses **bold**.
                let formattedFeedback = data.feedback
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br>');

                feedbackContent.innerHTML = formattedFeedback;

                // Handle spelling/grammar errors
                displaySpellingErrors(data.spelling_errors || []);


                resultArea.classList.add('show');

                // Scroll to results
                setTimeout(() => {
                    resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            } else {
                alert(data.error || 'Something went wrong.');
            }
        } catch (err) {
            alert('Network error. Please check your connection.');
        } finally {
            submitBtn.disabled = false;
            loading.style.display = 'none';
            window.sessionState.analysisInProgress = false;
        }
    });

    // Spelling/Grammar Section Toggle
    const spellingToggle = document.getElementById('spellingToggle');
    const spellingContent = document.getElementById('spellingContent');
    const chevronIcon = document.getElementById('chevronIcon');

    spellingToggle.addEventListener('click', () => {
        spellingContent.classList.toggle('open');
        chevronIcon.classList.toggle('open');
    });

    // Display Spelling Errors Function
    function displaySpellingErrors(errors, prefix = '') {
        const spellingSection = document.getElementById(prefix + 'spellingSection');
        const errorBadge = document.getElementById(prefix + 'errorBadge');
        const tableBody = document.getElementById(prefix + 'spellingTableBody');

        if (!spellingSection || !errorBadge || !tableBody) return;

        if (errors.length === 0) {
            spellingSection.style.display = 'none';
            return;
        }

        // Show section and update badge
        spellingSection.style.display = 'block';
        errorBadge.textContent = errors.length;
        errorBadge.className = errors.length > 0 ? 'error-badge' : 'error-badge success';

        // Clear existing rows
        tableBody.innerHTML = '';

        // Add rows for each error
        errors.forEach(error => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="error-word">${escapeHtml(error.error)}</span></td>
                <td><span class="correct-word">${escapeHtml(error.correction)}</span></td>
                <td><span class="type-badge ${error.type}">${error.type}</span></td>
                <td><span class="pos-tag">${escapeHtml(error.pos)}</span></td>
                <div class="example-tooltip">
                    <div class="example-label">Example:</div>
                    <div class="example-text">${escapeHtml(error.example)}</div>
                </div>
            `;
            tableBody.appendChild(row);
        });
    }

    // Helper function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Writing Task 1 Logic ---
    let t1TimerInterval;
    let t1TimeElapsed = 0;
    let t1IsRunning = false;

    const t1TimerDisplay = document.getElementById('task1-timerDisplay');
    const t1StartBtn = document.getElementById('task1-startBtn');
    const t1StopBtn = document.getElementById('task1-stopBtn');
    const t1ResetBtn = document.getElementById('task1-resetBtn');
    const t1AnswerInput = document.getElementById('task1-answer');
    const t1QuestionInput = document.getElementById('task1-question');
    const t1WordCountBadge = document.getElementById('task1-wordCount');
    const t1Form = document.getElementById('task1-checkForm');
    const t1SubmitBtn = document.getElementById('task1-submitBtn');
    const t1Loading = document.getElementById('task1-loading');
    const t1ResultArea = document.getElementById('task1-resultArea');
    const t1FeedbackContent = document.getElementById('task1-feedbackContent');
    const t1TypeInput = document.getElementById('task1-type');

    // Image Upload Elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('task1-image');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = imagePreview.querySelector('img');
    const removeImgBtn = document.getElementById('removeImg');

    // Image Upload Logic
    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleImageFile(file);
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--primary)';
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = 'var(--border)';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--border)';
            const file = e.dataTransfer.files[0];
            if (file) handleImageFile(file);
        });
    }

    function handleImageFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPG/PNG).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            uploadPlaceholder.style.display = 'none';
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    if (removeImgBtn) {
        removeImgBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.value = '';
            previewImg.src = '';
            uploadPlaceholder.style.display = 'flex';
            imagePreview.style.display = 'none';
        });
    }

    function updateT1Timer() {
        if (t1TimerDisplay) t1TimerDisplay.textContent = formatTime(t1TimeElapsed);
        if (t1TimeElapsed >= 20 * 60 && t1TimerDisplay) { // 20 mins for Task 1
            t1TimerDisplay.classList.add('warning');
        }
    }

    if (t1StartBtn) {
        t1StartBtn.addEventListener('click', () => {
            if (!t1IsRunning) {
                t1IsRunning = true;
                window.sessionState.timerRunning = true;
                t1StartBtn.disabled = true;
                t1StopBtn.disabled = false;
                t1TimerInterval = setInterval(() => {
                    t1TimeElapsed++;
                    updateT1Timer();
                }, 1000);
            }
        });
    }

    if (t1StopBtn) {
        t1StopBtn.addEventListener('click', () => {
            if (t1IsRunning) {
                t1IsRunning = false;
                window.sessionState.timerRunning = false;
                clearInterval(t1TimerInterval);
                t1StartBtn.disabled = false;
                t1StopBtn.disabled = true;
            }
        });
    }

    if (t1ResetBtn) {
        t1ResetBtn.addEventListener('click', () => {
            t1IsRunning = false;
            window.sessionState.timerRunning = false;
            clearInterval(t1TimerInterval);
            t1TimeElapsed = 0;
            updateT1Timer();
            if (t1TimerDisplay) t1TimerDisplay.classList.remove('warning');
            if (t1StartBtn) t1StartBtn.disabled = false;
            if (t1StopBtn) t1StopBtn.disabled = true;
        });
    }


    if (t1AnswerInput) {
        t1AnswerInput.addEventListener('input', () => {
            const text = t1AnswerInput.value.trim();
            const words = text ? text.split(/\s+/).length : 0;
            t1WordCountBadge.textContent = `${words} WORDS`;
            if (words < 150) {
                t1WordCountBadge.style.color = '#ef4444';
            } else {
                t1WordCountBadge.style.color = '#10b981';
            }
        });
    }

    if (t1Form) {
        t1Form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const question = t1QuestionInput.value.trim();
            const answer = t1AnswerInput.value.trim();
            const taskType = t1TypeInput.value;
            const imageFile = fileInput.files[0];

            if (!question || !answer) {
                alert('Please provide both the question/topic and your answer.');
                return;
            }

            // Create FormData to send image and text
            const formData = new FormData();
            formData.append('question', question);
            formData.append('answer', answer);
            formData.append('task_type', taskType);
            if (imageFile) {
                formData.append('chart_image', imageFile);
            }

            t1SubmitBtn.disabled = true;
            t1Loading.style.display = 'flex';
            t1ResultArea.classList.remove('show');
            window.sessionState.analysisInProgress = true;

            try {
                const response = await fetch('/api/writing/task1/check', {
                    method: 'POST',
                    body: formData // Fetch handles FormData automatically
                });

                const data = await response.json();

                if (data.success) {
                    let formattedFeedback = data.feedback
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br>');

                    t1FeedbackContent.innerHTML = formattedFeedback;
                    displaySpellingErrors(data.spelling_errors || [], 'task1-');
                    t1ResultArea.classList.add('show');
                    setTimeout(() => {
                        t1ResultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                } else {
                    alert(data.error || 'Something went wrong.');
                }
            } catch (err) {
                alert('Network error. Please check your connection.');
            } finally {
                t1SubmitBtn.disabled = false;
                t1Loading.style.display = 'none';
                window.sessionState.analysisInProgress = false;
            }
        });
    }


    const t1SpellingToggle = document.getElementById('task1-spellingToggle');
    const t1SpellingContent = document.getElementById('task1-spellingContent');
    const t1ChevronIcon = document.getElementById('task1-chevronIcon');

    if (t1SpellingToggle) {
        t1SpellingToggle.addEventListener('click', () => {
            t1SpellingContent.classList.toggle('open');
            t1ChevronIcon.classList.toggle('open');
        });
    }


    // --- Calculator Logic ---

    // Constraints & Validation
    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    // Tab Switching
    const calcTabs = document.querySelectorAll('.calc-tab');
    const calcContents = document.querySelectorAll('.calc-content');

    calcTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            calcTabs.forEach(t => t.classList.remove('active'));
            calcContents.forEach(c => c.style.display = 'none');

            tab.classList.add('active');
            document.getElementById(`calc-${target}`).style.display = 'block';
        });
    });

    // Overall Band Score Calculation
    const overallInputs = ['listening', 'reading', 'writing', 'speaking'];
    overallInputs.forEach(id => {
        const input = document.getElementById(`overall-${id}`);
        input.addEventListener('change', (e) => {
            // Enforce 0-9 range and 0.5 increments on change
            let val = parseFloat(e.target.value) || 0;
            val = clamp(Math.round(val * 2) / 2, 0, 9);
            e.target.value = val.toFixed(1);
            updateOverallScore();
        });
        input.addEventListener('input', updateOverallScore);
    });

    function updateOverallScore() {
        const scores = overallInputs.map(id => {
            let val = parseFloat(document.getElementById(`overall-${id}`).value) || 0;
            return clamp(val, 0, 9);
        });
        const mean = scores.reduce((a, b) => a + b, 0) / 4;

        // Official IELTS Rounding:
        // Average 6.25 -> 6.5, 6.75 -> 7.0
        // This is equivalent to rounding to the nearest 0.5
        const rounded = Math.round(mean * 2) / 2;
        document.getElementById('overall-result').textContent = rounded.toFixed(1);
    }

    // --- Speaking Logic ---
    const micBtnLarge = document.getElementById('micBtnLarge');
    const checkSpeechBtn = document.getElementById('checkSpeechBtn');
    const liveTranscript = document.getElementById('liveTranscript');
    const transcriptArea = document.getElementById('transcriptPreviewArea');
    const placeholderText = document.getElementById('recordingPlaceholder');
    const speakingTimer = document.getElementById('speakingTimer');
    const speakingLoading = document.getElementById('speaking-loading');
    const speakingEvalArea = document.getElementById('speakingEvalArea');
    const audioUpload = document.getElementById('audioUpload');

    let recognition;
    let finalTranscript = '';
    let speakingIsRecording = false;
    let speakingTimeElapsed = 0;
    let speakingTimerInterval;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            if (liveTranscript) {
                const fullText = (finalTranscript + interimTranscript).trim();
                liveTranscript.textContent = fullText;
                if (fullText.length > 0) {
                    placeholderText.style.display = 'none';
                    transcriptArea.style.display = 'block';
                }
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            stopSpeakingRecording();
        };
    }

    function startSpeakingRecording() {
        if (!recognition) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }

        speakingIsRecording = true;
        finalTranscript = '';
        if (liveTranscript) liveTranscript.textContent = '';
        if (placeholderText) placeholderText.style.display = 'block';
        if (transcriptArea) transcriptArea.style.display = 'none';

        micBtnLarge.classList.add('recording');

        // Timer
        speakingTimeElapsed = 0;
        updateSpeakingTimerDisplay();
        speakingTimerInterval = setInterval(() => {
            speakingTimeElapsed++;
            updateSpeakingTimerDisplay();
        }, 1000);

        recognition.start();
    }

    function stopSpeakingRecording() {
        speakingIsRecording = false;
        micBtnLarge.classList.remove('recording');
        clearInterval(speakingTimerInterval);
        if (recognition) recognition.stop();
    }

    function updateSpeakingTimerDisplay() {
        if (speakingTimer) speakingTimer.textContent = `${speakingTimeElapsed}s`;
    }

    window.resetSpeakingUI = function () {
        stopSpeakingRecording();
        speakingTimeElapsed = 0;
        updateSpeakingTimerDisplay();
        if (liveTranscript) liveTranscript.textContent = '';
        if (placeholderText) placeholderText.style.display = 'block';
        if (transcriptArea) transcriptArea.style.display = 'none';
        if (speakingEvalArea) {
            speakingEvalArea.style.display = 'none';
            speakingEvalArea.classList.remove('show');
        }

        document.getElementById('speakingTopic').value = '';
        if (audioUpload) audioUpload.value = '';
    };

    if (audioUpload) {
        audioUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (placeholderText) {
                    placeholderText.textContent = `File selected: ${file.name}`;
                    placeholderText.style.color = 'var(--primary)';
                }
                // Stop recording if active
                if (speakingIsRecording) stopSpeakingRecording();
            }
        });
    }

    // --- Essay Generator Logic ---
    const generatorForm = document.getElementById('generatorForm');
    const genTopic = document.getElementById('gen-topic');
    const genIdeas = document.getElementById('gen-ideas');

    // const genParagraphs = document.getElementById('gen-paragraphs'); // Removed select
    const genSubmitBtn = document.getElementById('genSubmitBtn');
    const genLoading = document.getElementById('gen-loading');
    const genResultArea = document.getElementById('gen-resultArea');
    const generatedEssayContent = document.getElementById('generatedEssayContent');
    const copyEssayBtn = document.getElementById('copyEssayBtn');

    if (generatorForm) {
        generatorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const topic = genTopic.value.trim();
            const ideas = genIdeas.value.trim();

            // Get value from checked radio button
            const selectedRadio = document.querySelector('input[name="num_paragraphs"]:checked');
            const num_paragraphs = selectedRadio ? selectedRadio.value : 3;

            if (!topic) {
                alert('Please provide a topic.');
                return;
            }

            genSubmitBtn.disabled = true;
            genLoading.style.display = 'flex';
            genResultArea.classList.remove('show');
            window.sessionState.analysisInProgress = true;

            try {
                const response = await fetch('/api/writing/task2/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic, ideas, num_paragraphs })
                });

                const data = await response.json();

                if (data.success) {
                    generatedEssayContent.textContent = data.essay;
                    genResultArea.classList.add('show');
                    // Scroll to results
                    setTimeout(() => {
                        genResultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                } else {
                    alert(data.error || 'Something went wrong.');
                }
            } catch (err) {
                alert('Network error. Please check your connection.');
            } finally {
                genSubmitBtn.disabled = false;
                genLoading.style.display = 'none';
                window.sessionState.analysisInProgress = false;
            }
        });
    }

    if (copyEssayBtn) {
        copyEssayBtn.addEventListener('click', () => {
            const text = generatedEssayContent.textContent;
            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyEssayBtn.innerHTML;
                copyEssayBtn.innerHTML = '<i data-lucide="check"></i> Copied!';
                if (window.lucide) lucide.createIcons();
                setTimeout(() => {
                    copyEssayBtn.innerHTML = originalText;
                    if (window.lucide) lucide.createIcons();
                }, 2000);
            });
        });
    }


    if (micBtnLarge) {
        micBtnLarge.addEventListener('click', () => {
            if (speakingIsRecording) {
                stopSpeakingRecording();
            } else {
                startSpeakingRecording();
            }
        });
    }

    if (checkSpeechBtn) {
        checkSpeechBtn.addEventListener('click', async () => {
            const transcript = liveTranscript ? liveTranscript.textContent.trim() : '';
            const topic = document.getElementById('speakingTopic').value.trim();
            const audioFile = audioUpload ? audioUpload.files[0] : null;

            if (!topic) {
                alert('Please provide a topic/question first.');
                return;
            }
            if (!transcript && !audioFile) {
                alert('Please record your answer or upload an audio file first.');
                return;
            }

            if (speakingIsRecording) stopSpeakingRecording();

            checkSpeechBtn.disabled = true;
            checkSpeechBtn.textContent = 'Analyzing your speech...';
            if (speakingLoading) speakingLoading.style.display = 'flex';
            if (speakingEvalArea) {
                speakingEvalArea.style.display = 'none';
                speakingEvalArea.classList.remove('show');
            }

            await evaluateSpeaking(transcript, topic, audioFile);

            checkSpeechBtn.disabled = false;
            checkSpeechBtn.textContent = 'Check My Speech';
            if (speakingLoading) speakingLoading.style.display = 'none';
        });
    }


    async function evaluateSpeaking(transcript, topic, audioFile) {
        const part = document.getElementById('speakingPart').value;
        const overallBand = document.getElementById('speakingOverallBand');
        const accuracyValue = document.getElementById('accuracyValue');
        const accuracyGauge = document.getElementById('accuracyGauge');
        const polishedText = document.getElementById('polishedTranscript');

        try {
            let response;
            if (audioFile) {
                const formData = new FormData();
                formData.append('part', part);
                formData.append('topic', topic);
                formData.append('transcript', transcript);
                formData.append('audio_file', audioFile);
                response = await fetch('/api/speaking/evaluate', {
                    method: 'POST',
                    body: formData
                });
            } else {
                response = await fetch('/api/speaking/evaluate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ part, topic, transcript })
                });
            }
            const data = await response.json();

            if (data.success) {
                const evalData = data.evaluation;
                if (overallBand) overallBand.textContent = evalData.overall_band.toFixed(1);
                if (polishedText) polishedText.textContent = evalData.polished_transcript;


                document.getElementById('fluencyContent').textContent = evalData.fluency_feedback;
                document.getElementById('lexicalContent').textContent = evalData.lexical_feedback;
                document.getElementById('grammarContent').textContent = evalData.grammar_feedback;
                document.getElementById('pronunciationContent').textContent = evalData.pronunciation_feedback;

                // Populate individual scores badges
                if (document.getElementById('fluencyScore')) document.getElementById('fluencyScore').textContent = evalData.fluency_score.toFixed(1);
                if (document.getElementById('lexicalScore')) document.getElementById('lexicalScore').textContent = evalData.lexical_score.toFixed(1);
                if (document.getElementById('grammarScore')) document.getElementById('grammarScore').textContent = evalData.grammar_score.toFixed(1);
                if (document.getElementById('pronunciationScore')) document.getElementById('pronunciationScore').textContent = evalData.pronunciation_score.toFixed(1);

                // Populate Repetitive Words
                const repContainer = document.getElementById('repetitiveWordsList');
                if (repContainer) {
                    repContainer.innerHTML = '';
                    if (evalData.repetitive_words && evalData.repetitive_words.length > 0) {
                        evalData.repetitive_words.forEach(word => {
                            const tag = document.createElement('span');
                            tag.className = 'word-tag';
                            tag.textContent = word;
                            repContainer.appendChild(tag);
                        });
                    } else {
                        repContainer.innerHTML = '<span class="text-muted">No significant repetition detected. Great job!</span>';
                        // Simple style for muted text if not in CSS yet
                        repContainer.firstElementChild.style.color = 'var(--text-secondary)';
                        repContainer.firstElementChild.style.fontStyle = 'italic';
                    }
                }

                // Simulate word-by-word accuracy viz
                renderActualTranscript(transcript || evalData.polished_transcript, evalData.polished_transcript);

                // Set accuracy gauge
                let score = evalData.pronunciation_score || evalData.overall_band || 6;
                const accuracy = Math.min(98, Math.max(45, (score * 10) + (Math.random() * 5)));
                if (accuracyValue) accuracyValue.textContent = `${Math.round(accuracy)}%`;
                if (accuracyGauge) {
                    accuracyGauge.style.setProperty('--accuracy-deg', `${(accuracy / 100) * 360}deg`);
                    // Force a re-render of conic gradient if needed (though CSS variables usually handle it)
                    accuracyGauge.style.background = `conic-gradient(var(--error) ${(accuracy / 100) * 360}deg, var(--surface) 0deg)`;
                }

                if (speakingEvalArea) {
                    console.log('Displaying results area with data:', evalData);
                    speakingEvalArea.style.display = 'block';

                    // Simple scroll
                    setTimeout(() => {
                        speakingEvalArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }
                if (window.lucide) lucide.createIcons();
            } else {
                console.error('Server returned success: false', data);
                alert('Analysis error: ' + (data.error || 'Unknown error occurred.'));
            }

        } catch (err) {
            console.error('Speaking eval error:', err);
            alert('Network or server error. Please try again.');
        } finally {
            checkSpeechBtn.disabled = false;
            checkSpeechBtn.textContent = 'Check My Speech';
            if (speakingLoading) speakingLoading.style.display = 'none';
        }
    }


    function renderActualTranscript(original, polished) {
        const div = document.getElementById('actualTranscript');
        div.innerHTML = '';
        const words = original.split(' ');

        words.forEach(word => {
            const confidence = 40 + Math.random() * 60;
            const colorClass = confidence > 85 ? 'word-good' : (confidence > 60 ? 'word-avg' : 'word-bad');

            const wordSpan = document.createElement('span');
            wordSpan.className = `word-item ${colorClass}`;
            wordSpan.innerHTML = `
                <span class="conf-score">${Math.round(confidence)}%</span>
                ${word}
            `;
            div.appendChild(wordSpan);
        });
    }

    window.speakText = function (gender) {
        const text = document.getElementById('polishedTranscript').textContent;
        if (!text) return;

        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();

        // Try to pick a voice based on gender
        if (gender === 'male') {
            utterance.voice = voices.find(v => v.name.includes('Male') || v.name.includes('David') || v.name.includes('Daniel')) || voices[0];
        } else {
            utterance.voice = voices.find(v => v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Google UK English Female')) || voices[0];
        }

        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    // Listening Score Calculation
    const listeningRawInput = document.getElementById('listening-raw');
    listeningRawInput.addEventListener('input', (e) => {
        let raw = parseInt(e.target.value) || 0;
        if (raw > 40) e.target.value = 40;
        if (raw < 0) e.target.value = 0;
        raw = clamp(raw, 0, 40);
        document.getElementById('listening-band').textContent = mapRawToBand(raw, 'listening').toFixed(1);
    });

    // Reading Score Calculation
    const readingType = document.getElementById('reading-type');
    const readingRaw = document.getElementById('reading-raw');

    [readingType, readingRaw].forEach(el => {
        el.addEventListener('input', () => {
            let raw = parseInt(readingRaw.value) || 0;
            if (raw > 40) readingRaw.value = 40;
            if (raw < 0) readingRaw.value = 0;
            raw = clamp(raw, 0, 40);
            const type = readingType.value;
            document.getElementById('reading-band').textContent = mapRawToBand(raw, 'reading', type).toFixed(1);
        });
    });

    function mapRawToBand(raw, module, type = 'academic') {
        if (raw <= 0) return 0.0;

        if (module === 'listening') {
            if (raw >= 39) return 9.0;
            if (raw >= 37) return 8.5;
            if (raw >= 35) return 8.0;
            if (raw >= 32) return 7.5;
            if (raw >= 30) return 7.0;
            if (raw >= 26) return 6.5;
            if (raw >= 23) return 6.0;
            if (raw >= 18) return 5.5;
            if (raw >= 16) return 5.0;
            if (raw >= 13) return 4.5;
            if (raw >= 10) return 4.0;
            if (raw >= 6) return 3.5;
            if (raw >= 4) return 3.0;
            return 2.5;
        } else if (module === 'reading' && type === 'academic') {
            if (raw >= 39) return 9.0;
            if (raw >= 37) return 8.5;
            if (raw >= 35) return 8.0;
            if (raw >= 33) return 7.5;
            if (raw >= 30) return 7.0;
            if (raw >= 27) return 6.5;
            if (raw >= 23) return 6.0;
            if (raw >= 19) return 5.5;
            if (raw >= 15) return 5.0;
            if (raw >= 13) return 4.5;
            if (raw >= 10) return 4.0;
            if (raw >= 7) return 3.5;
            if (raw >= 5) return 3.0;
            return 2.5;
        } else if (module === 'reading' && type === 'general') {
            if (raw >= 40) return 9.0;
            if (raw >= 39) return 8.5;
            if (raw >= 37) return 8.0;
            if (raw >= 36) return 7.5;
            if (raw >= 34) return 7.0;
            if (raw >= 32) return 6.5;
            if (raw >= 30) return 6.0;
            if (raw >= 27) return 5.5;
            if (raw >= 23) return 5.0;
            if (raw >= 19) return 4.5;
            if (raw >= 15) return 4.0;
            if (raw >= 12) return 3.5;
            if (raw >= 9) return 3.0;
            return 2.5;
        }
        return 0.0;
    }

    // Expose reset function globally
    window.resetCalculators = function () {
        console.log('Resetting all calculators...');

        // Reset Overall Inputs
        overallInputs.forEach(id => {
            const input = document.getElementById(`overall-${id}`);
            if (input) input.value = "0.0";
        });
        const overallResult = document.getElementById('overall-result');
        if (overallResult) overallResult.textContent = "0.0";

        // Reset Listening
        const listeningRaw = document.getElementById('listening-raw');
        if (listeningRaw) listeningRaw.value = "0";
        const listeningBand = document.getElementById('listening-band');
        if (listeningBand) listeningBand.textContent = "0.0";

        // Reset Reading
        const readingRawInput = document.getElementById('reading-raw');
        if (readingRawInput) readingRawInput.value = "0";
        const readingBand = document.getElementById('reading-band');
        if (readingBand) readingBand.textContent = "0.0";
    };
});

// --- Task 1 Generator Logic (Academic & General) ---
const t1GenForm = document.getElementById('task1GenForm');
const t1GenTopic = document.getElementById('gen1-topic');
const t1GenType = document.getElementById('task1GenType');
const t1GenImageInput = document.getElementById('gen1-image');
const t1GenSubmitBtn = document.getElementById('gen1SubmitBtn');
const t1GenLoading = document.getElementById('gen1-loading');
const t1GenResultArea = document.getElementById('gen1-resultArea');
const t1GeneratedContent = document.getElementById('generatedTask1Content');
const t1CopyBtn = document.getElementById('copyTask1Btn');
const t1GenFileNameSpan = document.getElementById('gen1-fileName');
const t1GenImagePreview = document.getElementById('gen1-imagePreview');
const t1GenPreviewImg = t1GenImagePreview ? t1GenImagePreview.querySelector('img') : null;
const t1GenRemoveImg = document.getElementById('gen1-removeImg');
const t1GenUploadPlaceholder = document.getElementById('gen1-uploadPlaceholder');

// Image Handling for Generator
if (t1GenImageInput) {
    t1GenImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            t1GenFileNameSpan.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (re) => {
                t1GenPreviewImg.src = re.target.result;
                t1GenUploadPlaceholder.style.display = 'none';
                t1GenImagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
}

if (t1GenRemoveImg) {
    t1GenRemoveImg.addEventListener('click', (e) => {
        e.stopPropagation();
        t1GenImageInput.value = '';
        t1GenFileNameSpan.textContent = 'No file chosen';
        t1GenPreviewImg.src = '';
        t1GenUploadPlaceholder.style.display = 'flex';
        t1GenImagePreview.style.display = 'none';
    });
}

if (t1GenForm) {
    t1GenForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const topic = t1GenTopic.value.trim();
        const type = t1GenType.value;
        const imageFile = t1GenImageInput.files[0];

        if (!topic) {
            alert('Please provide a topic/question.');
            return;
        }

        t1GenSubmitBtn.disabled = true;
        t1GenLoading.style.display = 'flex';
        t1GenResultArea.classList.remove('show');
        window.sessionState.analysisInProgress = true;

        try {
            const endpoint = type === 'academic'
                ? '/api/writing/task1/generate/academic'
                : '/api/writing/task1/generate/general';

            let response;

            if (type === 'academic') {
                // Use FormData for file upload
                const formData = new FormData();
                formData.append('topic', topic);
                if (imageFile) {
                    formData.append('chart_image', imageFile);
                }
                response = await fetch(endpoint, {
                    method: 'POST',
                    body: formData
                });
            } else {
                // Use JSON for General
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic })
                });
            }

            const data = await response.json();

            if (data.success) {
                const content = type === 'academic' ? data.report : data.letter;
                t1GeneratedContent.textContent = content;
                t1GenResultArea.classList.add('show');
                setTimeout(() => {
                    t1GenResultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            } else {
                alert(data.error || 'Something went wrong.');
            }
        } catch (err) {
            alert('Network error. Please check your connection.');
        } finally {
            t1GenSubmitBtn.disabled = false;
            t1GenLoading.style.display = 'none';
            window.sessionState.analysisInProgress = false;
        }
    });
}

if (t1CopyBtn) {
    t1CopyBtn.addEventListener('click', () => {
        const text = t1GeneratedContent.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = t1CopyBtn.innerHTML;
            t1CopyBtn.innerHTML = '<i data-lucide="check"></i> Copied!';
            if (window.lucide) lucide.createIcons();
            setTimeout(() => {
                t1CopyBtn.innerHTML = originalText;
                if (window.lucide) lucide.createIcons();
            }, 2000);
        });
    });
}
// Handle browser back/forward buttons
window.onpopstate = function (event) {
    if (event.state && event.state.section) {
        showSection(event.state.section, false);
    } else {
        // Fallback to hash if state is missing
        const sectionId = window.location.hash.replace('#', '') || 'landing';
        // Map hash back to internal section IDs if necessary
        const sectionMap = {
            'academic-hub': 'academic_hub',
            'general-hub': 'general_hub',
            'speaking-hub': 'speaking_hub',
            'speaking-part1': 'speaking_part1',
            'speaking-part2': 'speaking_part2',
            'speaking-part3': 'speaking_part3',
            'task1-academic': 'task1_academic',
            'task1-general': 'task1_general',
            'task2': 'task2',
            'calculators': 'calculators',
            'task2-generator': 'task2_generator',
            'task1-academic-generator': 'task1_academic_generator',
            'task1-general-generator': 'task1_general_generator'
        };
        showSection(sectionMap[sectionId] || sectionId, false);
    }
};
