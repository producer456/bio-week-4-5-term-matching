// ============================================================
// BIO Week 4–5 Term Matching
// Teacher mode: edit definitions, assign slides
// Student mode: drag-to-pair against teacher's saved key
// ============================================================

const STORAGE_KEY = 'bw45_data';

let userData = loadUserData();
let currentMode = 'teacher';
let currentActivity = 'definitions'; // 'definitions' | 'slides'
let currentGroup = TERM_GROUPS[0].id;

// Student game state
let leftItems = [];  // shuffled term IDs
let rightItems = []; // shuffled targets (def text or slide id)
let pairedLeft = new Set();   // terms already correctly paired
let pairedRight = new Set();  // targets already correctly paired
let selectedLeft = null;
let selectedRight = null;

// ---- Storage ----
function loadUserData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            return {
                definitions: { ...DEFAULT_DEFINITIONS, ...(data.definitions || {}) },
                slides: { ...DEFAULT_SLIDE_ASSIGNMENTS, ...(data.slides || {}) }
            };
        }
    } catch (e) { /* fall through */ }
    return {
        definitions: { ...DEFAULT_DEFINITIONS },
        slides: { ...DEFAULT_SLIDE_ASSIGNMENTS }
    };
}

function saveUserData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    showToast('Saved', 'success');
}

function resetAllData() {
    if (!confirm('Reset all definitions and slide assignments to defaults? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEY);
    userData = loadUserData();
    renderAll();
    showToast('Reset to defaults', 'success');
}

// ---- Init ----
function init() {
    setupModeToggle();
    setupActivityTabs();
    renderGroupTabs();
    setupGroupTabs();
    renderAll();
}

function setupModeToggle() {
    document.getElementById('btn-teacher').addEventListener('click', () => setMode('teacher'));
    document.getElementById('btn-student').addEventListener('click', () => setMode('student'));
}

function setMode(mode) {
    currentMode = mode;
    document.getElementById('btn-teacher').classList.toggle('active', mode === 'teacher');
    document.getElementById('btn-student').classList.toggle('active', mode === 'student');
    document.body.classList.toggle('student-mode', mode === 'student');
    resetGameState();
    renderAll();
}

function setupActivityTabs() {
    document.querySelectorAll('.activity-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentActivity = tab.dataset.activity;
            document.querySelectorAll('.activity-tab').forEach(t => t.classList.toggle('active', t === tab));
            resetGameState();
            renderAll();
        });
    });
}

function renderGroupTabs() {
    const nav = document.getElementById('group-tabs');
    nav.innerHTML = TERM_GROUPS.map(g =>
        `<button class="group-tab ${g.id === currentGroup ? 'active' : ''}" data-group="${g.id}">
            <span class="group-chapter">Ch ${g.chapter}</span> ${g.title}
        </button>`
    ).join('');
}

function setupGroupTabs() {
    document.getElementById('group-tabs').addEventListener('click', (e) => {
        const tab = e.target.closest('.group-tab');
        if (!tab) return;
        currentGroup = tab.dataset.group;
        document.querySelectorAll('.group-tab').forEach(t => t.classList.toggle('active', t === tab));
        resetGameState();
        renderAll();
    });
}

function getCurrentGroup() {
    return TERM_GROUPS.find(g => g.id === currentGroup);
}

function getSlideById(id) {
    return SLIDES.find(s => s.id === id);
}

function slideSrc(slide) {
    return `images/${slide.id}.${slide.type || 'png'}`;
}

// ---- Render dispatch ----
function renderAll() {
    const teacherView = document.getElementById('teacher-view');
    const studentView = document.getElementById('student-view');
    const isTeacher = currentMode === 'teacher';
    teacherView.style.display = isTeacher ? '' : 'none';
    studentView.style.display = isTeacher ? 'none' : '';
    if (isTeacher) renderTeacher(); else renderStudent();
}

// ---- Teacher mode ----
function renderTeacher() {
    const group = getCurrentGroup();
    const view = document.getElementById('teacher-view');
    if (currentActivity === 'definitions') {
        view.innerHTML = renderTeacherDefinitions(group);
        view.querySelectorAll('.def-input').forEach(input => {
            input.addEventListener('input', (e) => {
                userData.definitions[e.target.dataset.term] = e.target.value;
            });
        });
    } else {
        view.innerHTML = renderTeacherSlides(group);
        view.querySelectorAll('.slide-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const term = e.target.dataset.term;
                const val = e.target.value;
                if (val) userData.slides[term] = val;
                else delete userData.slides[term];
                renderTeacher();
            });
        });
    }
}

function renderTeacherDefinitions(group) {
    return `
        <div class="teacher-header">
            <h2>${escapeHtml(group.title)} — Definitions</h2>
            <p class="teacher-hint">Edit the definitions students will be tested on. Click <strong>Save</strong> when done.</p>
        </div>
        <div class="teacher-rows">
            ${group.terms.map(term => `
                <div class="teacher-row">
                    <label class="row-term">${escapeHtml(term)}</label>
                    <textarea class="def-input" data-term="${escapeAttr(term)}" rows="2">${escapeHtml(userData.definitions[term] || '')}</textarea>
                </div>
            `).join('')}
        </div>
    `;
}

function renderTeacherSlides(group) {
    const slideOptions = SLIDES.map(s =>
        `<option value="${s.id}">${escapeHtml(s.label)}</option>`
    ).join('');

    return `
        <div class="teacher-header">
            <h2>${escapeHtml(group.title)} — Slide Assignments</h2>
            <p class="teacher-hint">Choose the histology slide that best illustrates each term, or leave blank to skip in the slide-matching game.</p>
        </div>
        <div class="teacher-rows">
            ${group.terms.map(term => {
                const assigned = userData.slides[term] || '';
                const slide = getSlideById(assigned);
                return `
                    <div class="teacher-row teacher-row-slide">
                        <label class="row-term">${escapeHtml(term)}</label>
                        <div class="row-slide-controls">
                            <select class="slide-select" data-term="${escapeAttr(term)}">
                                <option value="">— none —</option>
                                ${slideOptions.replace(`value="${assigned}"`, `value="${assigned}" selected`)}
                            </select>
                            ${slide ? `<div class="slide-thumb-wrap">
                                <img class="slide-thumb-mini" src="${slideSrc(slide)}" alt="${escapeAttr(slide.label)}">
                                <button class="expand-btn" onclick="openLightbox('${slide.id}')" title="View full size">⤢</button>
                            </div>` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ---- Student mode ----
function resetGameState() {
    leftItems = [];
    rightItems = [];
    pairedLeft = new Set();
    pairedRight = new Set();
    selectedLeft = null;
    selectedRight = null;
}

function renderStudent() {
    const group = getCurrentGroup();
    const view = document.getElementById('student-view');

    // Build pair list — only include terms with a definition (or slide assignment, depending on activity)
    let pairs;
    if (currentActivity === 'definitions') {
        pairs = group.terms
            .filter(t => userData.definitions[t])
            .map(t => ({ term: t, target: userData.definitions[t] }));
    } else {
        pairs = group.terms
            .filter(t => userData.slides[t])
            .map(t => ({ term: t, target: userData.slides[t] }));
    }

    if (pairs.length === 0) {
        view.innerHTML = `
            <div class="student-empty">
                <p>No ${currentActivity === 'definitions' ? 'definitions' : 'slide assignments'} for this group yet.</p>
                <p>Switch to <strong>Teacher Mode</strong> to set them up.</p>
            </div>`;
        return;
    }

    // Initialize shuffled lists if first render of this state
    if (leftItems.length === 0) {
        leftItems = pairs.map(p => p.term);
        // For slides activity, deduplicate the right column so a single diagram
        // appears once even when multiple terms map to it.
        rightItems = currentActivity === 'slides'
            ? [...new Set(pairs.map(p => p.target))]
            : pairs.map(p => p.target);
        shuffle(leftItems);
        shuffle(rightItems);
    }

    const totalPairs = pairs.length;
    const matched = pairedLeft.size;

    view.innerHTML = `
        <div class="student-header">
            <h2>${escapeHtml(group.title)}</h2>
            <div class="student-controls">
                <span class="score">${matched} / ${totalPairs} matched</span>
                <button class="btn-shuffle" onclick="reshuffleGame()">Shuffle</button>
            </div>
        </div>
        <div class="match-game">
            <div class="match-column">
                <h3>Terms</h3>
                ${leftItems.map(term => renderTermCard(term)).join('')}
            </div>
            <div class="match-column">
                <h3>${currentActivity === 'definitions' ? 'Definitions' : 'Slides'}</h3>
                ${rightItems.map(target => renderTargetCard(target)).join('')}
            </div>
        </div>
    `;

    attachStudentEvents();
}

function renderTermCard(term) {
    const paired = pairedLeft.has(term);
    const selected = selectedLeft === term;
    return `
        <div class="match-card term-card ${paired ? 'paired' : ''} ${selected ? 'selected' : ''}"
             data-term="${escapeAttr(term)}"
             draggable="${!paired}">
            ${escapeHtml(term)}
        </div>
    `;
}

function renderTargetCard(target) {
    const paired = pairedRight.has(target);
    const selected = selectedRight === target;
    let inner;
    if (currentActivity === 'definitions') {
        inner = escapeHtml(target);
    } else {
        const slide = getSlideById(target);
        const total = leftItems.filter(t => userData.slides[t] === target).length;
        const matched = leftItems.filter(t => userData.slides[t] === target && pairedLeft.has(t)).length;
        const badge = total > 1 ? `<div class="slide-badge">${matched} / ${total}</div>` : '';
        inner = slide
            ? `<div class="slide-thumb-wrap">
                 <img class="slide-thumb" src="${slideSrc(slide)}" alt="${escapeAttr(slide.label)}">
                 <button class="expand-btn" onclick="event.stopPropagation(); openLightbox('${slide.id}')" title="View full size">⤢</button>
                 ${badge}
               </div>
               <div class="slide-caption">${escapeHtml(slide.label)}</div>`
            : escapeHtml(target);
    }
    return `
        <div class="match-card target-card ${paired ? 'paired' : ''} ${selected ? 'selected' : ''}"
             data-target="${escapeAttr(target)}">
            ${inner}
        </div>
    `;
}

function attachStudentEvents() {
    document.querySelectorAll('.term-card').forEach(card => {
        card.addEventListener('click', () => onClickTerm(card.dataset.term));
        card.addEventListener('dragstart', (e) => {
            if (pairedLeft.has(card.dataset.term)) { e.preventDefault(); return; }
            e.dataTransfer.setData('text/plain', card.dataset.term);
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
    });

    document.querySelectorAll('.target-card').forEach(card => {
        card.addEventListener('click', () => onClickTarget(card.dataset.target));
        card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drag-over'); });
        card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');
            const term = e.dataTransfer.getData('text/plain');
            if (term) attemptPair(term, card.dataset.target);
        });
    });
}

function onClickTerm(term) {
    if (pairedLeft.has(term)) return;
    if (selectedLeft === term) { selectedLeft = null; renderStudent(); return; }
    selectedLeft = term;
    if (selectedRight) {
        attemptPair(selectedLeft, selectedRight);
    } else {
        renderStudent();
    }
}

function onClickTarget(target) {
    if (pairedRight.has(target)) return;
    if (selectedRight === target) { selectedRight = null; renderStudent(); return; }
    selectedRight = target;
    if (selectedLeft) {
        attemptPair(selectedLeft, selectedRight);
    } else {
        renderStudent();
    }
}

function attemptPair(term, target) {
    const correct = currentActivity === 'definitions'
        ? userData.definitions[term] === target
        : userData.slides[term] === target;

    if (correct) {
        pairedLeft.add(term);
        // For slides, only mark target paired when ALL terms mapping to it are paired
        if (currentActivity === 'slides') {
            const remaining = leftItems.filter(t => userData.slides[t] === target && !pairedLeft.has(t));
            if (remaining.length === 0) pairedRight.add(target);
        } else {
            pairedRight.add(target);
        }
        selectedLeft = null;
        selectedRight = null;
        renderStudent();
        if (pairedLeft.size === leftItems.length) {
            setTimeout(() => showToast('🎉 All matched!', 'success'), 200);
        }
    } else {
        flashWrong(term, target);
        selectedLeft = null;
        selectedRight = null;
        setTimeout(() => renderStudent(), 600);
    }
}

function flashWrong(term, target) {
    const termCard = document.querySelector(`.term-card[data-term="${cssEscape(term)}"]`);
    const targetCard = document.querySelector(`.target-card[data-target="${cssEscape(target)}"]`);
    if (termCard) termCard.classList.add('wrong');
    if (targetCard) targetCard.classList.add('wrong');
}

function reshuffleGame() {
    resetGameState();
    renderStudent();
}

// ---- Helpers ----
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
function cssEscape(s) {
    return (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/"/g, '\\"');
}

// ---- Lightbox (full-screen slide viewer) ----
function openLightbox(slideId) {
    const slide = getSlideById(slideId);
    if (!slide) return;
    const lb = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = slideSrc(slide);
    document.getElementById('lightbox-img').alt = slide.label;
    document.getElementById('lightbox-caption').textContent = slide.label;
    lb.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeLightbox(event) {
    if (event && event.target.tagName === 'IMG') return; // click on image itself = no close
    document.getElementById('lightbox').classList.remove('show');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});

// ---- Toast ----
function showToast(msg, type = 'info') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast show ${type}`;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove('show'), 1800);
}

// ---- Export / Import ----
function exportData() {
    const payload = {
        app: 'bio-week-4-5-term-matching',
        version: 1,
        exportedAt: new Date().toISOString(),
        data: userData
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `bw45-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Backup downloaded', 'success');
}

function importData(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const payload = JSON.parse(e.target.result);
            if (payload.app !== 'bio-week-4-5-term-matching') {
                showToast('Not a backup of this app', 'error'); return;
            }
            if (!confirm('Import will OVERWRITE your saved data. Continue?')) return;
            userData = {
                definitions: { ...DEFAULT_DEFINITIONS, ...(payload.data.definitions || {}) },
                slides: { ...DEFAULT_SLIDE_ASSIGNMENTS, ...(payload.data.slides || {}) }
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
            renderAll();
            showToast('Imported', 'success');
        } catch (err) {
            showToast('Import failed: invalid JSON', 'error');
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

// ---- Boot ----
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
