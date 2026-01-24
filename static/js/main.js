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
    const task1Section = document.getElementById('task1Section');
    const calculatorsSection = document.getElementById('calculatorsSection');

    // Hide all sections first
    if (landingSection) landingSection.style.display = 'none';
    if (task2Section) task2Section.style.display = 'none';
    if (task1Section) task1Section.style.display = 'none';
    if (calculatorsSection) calculatorsSection.style.display = 'none';

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
    }


}

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
    const currentTheme = localStorage.getItem('theme') || 'light';
    htmlElement.setAttribute('data-theme', currentTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
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
