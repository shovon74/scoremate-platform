// Global state for session protection
window.sessionState = {
    timerRunning: false,
    analysisInProgress: false
};

// Navigation logic for switching sections
window.showSection = function (sectionId, updateState = true) {
    console.log('Showing section:', sectionId);

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

    // Hide all sections first
    if (landingSection) landingSection.style.display = 'none';
    if (task2Section) task2Section.style.display = 'none';

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
    } else if (sectionId === 'task1') {
        alert('Writing Task 1 Evaluation is coming soon!');
        if (landingSection) landingSection.style.display = 'block';
    }
}

// Handle browser Back/Forward navigation
window.addEventListener('popstate', (event) => {
    const section = (event.state && event.state.section) ? event.state.section : 'landing';
    showSection(section, false);
});

// Check URL on initial load and handle hashes
window.addEventListener('load', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'task2') {
        showSection('task2', false);
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
    function displaySpellingErrors(errors) {
        const spellingSection = document.getElementById('spellingSection');
        const errorBadge = document.getElementById('errorBadge');
        const tableBody = document.getElementById('spellingTableBody');

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
});
