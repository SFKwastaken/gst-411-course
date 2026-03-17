class GSTHub {
    constructor() {
        this.data = null;
        this.currentChapter = null;
        this.currentQuiz = [];
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.answeredQuestions = new Set(); // tracks questions already revealed
        this.isExam = false;

        this.init();
    }

    init() {
        // Ensure data is available
        this.data = window.courseData;
        
        if (this.data) {
            console.log('GST Hub Initialized with', this.data.chapters.length, 'chapters');
            this.renderChapterList();
            this.setupListeners();
            
            // Check if we should auto-load a chapter (e.g., from URL or just default to showing something)
            // For now, the welcome screen is default in HTML.
        } else {
            console.error('Course data not found. Make sure courseData.js is loaded correctly.');
            alert('Error: Course data could not be loaded. Please ensure "courseData.js" is in the same folder as this file.');
        }
    }

    setupListeners() {
        document.getElementById('start-quiz-btn').onclick = () => this.startQuiz();
        document.getElementById('prev-btn').onclick = () => this.prevQuestion();
        document.getElementById('next-btn').onclick = () => this.nextQuestion();
        document.getElementById('retake-btn').onclick = () => this.retake();
    }

    renderChapterList() {
        const list = document.getElementById('chapter-list');
        list.innerHTML = this.data.chapters.map(ch => `
            <li class="nav-item">
                <a class="nav-link" id="nav-ch-${ch.id}" onclick="app.loadChapter(${ch.id})">
                    Chapter ${ch.id}: ${ch.title.split(':')[0]}
                </a>
            </li>
        `).join('');
    }

    loadChapter(id) {
        this.isExam = false;
        this.currentChapter = this.data.chapters.find(ch => ch.id === id);
        this.showScreen('content-viewer');
        document.getElementById('chapter-content').style.display = 'block';
        document.getElementById('quiz-interface').style.display = 'none';
        document.getElementById('results-interface').style.display = 'none';

        document.getElementById('view-title').innerText = this.currentChapter.title;
        document.getElementById('view-body').innerHTML = this.parseMarkdown(this.currentChapter.content);

        // Update active nav
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        document.getElementById(`nav-ch-${id}`)?.classList.add('active');
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    loadNextChapter() {
        if (!this.currentChapter) return;
        const nextId = this.currentChapter.id + 1;
        const nextCh = this.data.chapters.find(ch => ch.id === nextId);
        if (nextCh) {
            this.loadChapter(nextId);
        } else if (nextId === 9) { // Handle the jump from 8 to 10
             this.loadChapter(10);
        } else if (this.currentChapter.id === 11) {
             this.loadChapter(12); // Epilogue
        } else {
            this.showFinalExam();
        }
    }

    startQuiz() {
        this.currentQuiz = [...this.currentChapter.quiz].sort(() => Math.random() - 0.5);
        this.currentQuestionIndex = 0;
        this.userAnswers = new Array(this.currentQuiz.length).fill(null);
        this.answeredQuestions = new Set();
        
        document.getElementById('chapter-content').style.display = 'none';
        document.getElementById('quiz-interface').style.display = 'flex';
        document.getElementById('quiz-title').innerText = `${this.currentChapter.title} Quiz`;
        
        this.renderQuestion();
    }

    showFinalExam() {
        this.isExam = true;
        this.currentQuiz = [...this.data.finalExam].sort(() => Math.random() - 0.5);
        this.currentQuestionIndex = 0;
        this.userAnswers = new Array(this.currentQuiz.length).fill(null);
        this.answeredQuestions = new Set();

        this.showScreen('content-viewer');
        document.getElementById('chapter-content').style.display = 'none';
        document.getElementById('quiz-interface').style.display = 'flex';
        document.getElementById('results-interface').style.display = 'none';
        
        document.getElementById('quiz-title').innerText = `Final Examination`;
        this.renderQuestion();
    }

    renderQuestion() {
        const idx = this.currentQuestionIndex;
        const q = this.currentQuiz[idx];
        const alreadyAnswered = this.answeredQuestions.has(idx);
        const userAnswer = this.userAnswers[idx];

        document.getElementById('quiz-progress').innerText = `Question ${idx + 1}/${this.currentQuiz.length}`;
        document.getElementById('question-text').innerText = q.question;

        const optionsGrid = document.getElementById('options-grid');
        optionsGrid.innerHTML = q.options.map((opt, i) => {
            let cls = 'option-btn';
            if (alreadyAnswered) {
                // Reveal: correct answer always green, wrong choice red
                if (i === q.answer) cls += ' correct';
                else if (i === userAnswer) cls += ' wrong';
            } else if (userAnswer === i) {
                cls += ' selected';
            }
            const disabled = alreadyAnswered ? 'disabled' : '';
            return `<button class="${cls}" onclick="app.selectOption(${i})" ${disabled}>
                ${String.fromCharCode(65 + i)}. ${opt}
            </button>`;
        }).join('');

        document.getElementById('prev-btn').disabled = this.currentQuestionIndex === 0;

        const isLast = idx === this.currentQuiz.length - 1;
        const nextBtn = document.getElementById('next-btn');
        nextBtn.innerText = isLast ? 'Submit' : (alreadyAnswered ? 'Next →' : 'Next');
        // Only enable Next/Submit after the question has been answered
        nextBtn.disabled = !alreadyAnswered;
    }

    selectOption(index) {
        const idx = this.currentQuestionIndex;
        // Ignore clicks if already answered
        if (this.answeredQuestions.has(idx)) return;
        this.userAnswers[idx] = index;
        this.answeredQuestions.add(idx);
        this.renderQuestion();
    }

    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.renderQuestion();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.currentQuiz.length - 1) {
            this.currentQuestionIndex++;
            this.renderQuestion();
        } else {
            this.submitQuiz();
        }
    }

    submitQuiz() {
        let score = 0;
        const failed = [];

        this.currentQuiz.forEach((q, i) => {
            if (this.userAnswers[i] === q.answer) {
                score++;
            } else {
                failed.push({
                    question: q.question,
                    yourAnswer: q.options[this.userAnswers[i]] || 'No answer',
                    correctAnswer: q.options[q.answer]
                });
            }
        });

        this.showResults(score, this.currentQuiz.length, failed);
    }

    showResults(score, total, failed) {
        document.getElementById('quiz-interface').style.display = 'none';
        document.getElementById('results-interface').style.display = 'block';

        const percentage = (score / total) * 100;
        document.querySelector('.score-display').innerText = `${score}/${total}`;
        
        let msg = percentage >= 70 ? "Excellent work! You have a strong grasp of this section." : 
                  percentage >= 50 ? "Good effort. Review the content to improve your score." : 
                  "You might need more study. Try reviewing the notes again.";
        
        document.getElementById('result-text').innerText = msg;
        document.getElementById('result-heading').innerText = this.isExam ? "Exam Completed" : "Quiz Completed";

        const failedList = document.getElementById('failed-list');
        const failedContainer = document.getElementById('failed-questions');
        
        if (failed.length > 0) {
            failedContainer.style.display = 'block';
            failedList.innerHTML = failed.map(f => `
                <div class="question-card" style="border-left: 4px solid var(--error)">
                    <p style="font-weight: 600; margin-bottom: 0.5rem">${f.question}</p>
                    <p style="color: var(--error)">Your Answer: ${f.yourAnswer}</p>
                    <p style="color: var(--success)">Correct Answer: ${f.correctAnswer}</p>
                </div>
            `).join('');
        } else {
            failedContainer.style.display = 'none';
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    retake() {
        if (this.isExam) {
            this.showFinalExam();
        } else {
            this.loadChapter(this.currentChapter.id);
        }
    }

    showScreen(id) {
        document.getElementById('welcome-screen').style.display = id === 'welcome' ? 'block' : 'none';
        document.getElementById('content-viewer').style.display = id === 'content-viewer' ? 'block' : 'none';
    }

    parseMarkdown(text) {
        return text
            .replace(/### (.*)/g, '<h3 style="color: var(--accent); margin: 2rem 0 1rem;">$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff">$1</strong>')
            .replace(/- (.*)/g, '<li style="margin-bottom: 0.5rem">$1</li>')
            .split('\n\n').map(p => {
                if (p.includes('<li')) return `<ul style="margin-bottom: 1.5rem">${p}</ul>`;
                if (p.includes('<h3')) return p;
                return `<p style="margin-bottom: 1rem">${p}</p>`;
            }).join('');
    }
}

const app = new GSTHub();
window.app = app;
