import { initCanvas, canvas } from './canvas.js';
import {
    initUI,
    setStatus, setResult, clearAnalysis, setAnalysis,
    startHintTimer, hintBar, hintBtn, clearBtn, undoBtn, checkBtn,
    pointerBtn, lineBtn, pointsBtn, eraserBtn, pointButtonsContainer,
    getActivePointBtn, setActivePointBtn, disablePointBtn, enablePointBtn, resetAllButtons
} from './ui.js';
import { lessons, tasks } from './taskConfig.js';
import {
    markLessonCompleted, isLessonCompleted,
    saveAppState as saveAppStateToStorage,
    loadAppState as loadAppStateFromStorage
} from './progress.js';
import {
    attachEvents, detachEvents, clearDrawing,
    undoLastAction, getSegments, setOnDrawingChanged, redraw,
    setTool, setAllowedLetters
} from './drawing.js';
import { namedPoints } from './points.js';

console.log('🚀 main.js загружен!');

let currentView = null;
let currentTaskId = null;
let appState = loadAppStateFromStorage();

setOnDrawingChanged(() => {
    if (!currentView) return;
    appState[currentView] = { segments: getSegments().slice(), namedPoints: namedPoints.slice() };
    saveAppStateToStorage(appState);
});

function navigateTo(section) {
    detachEvents();
    if (currentView && currentTaskId) { appState[currentView] = { segments: getSegments().slice(), namedPoints: namedPoints.slice() }; saveAppStateToStorage(appState); }
    const oldCanvas = document.querySelector('canvas'); if (oldCanvas) oldCanvas.remove();
    if (section === 'intro') showIntro();
    else if (section === 'block1') showBlockMenu();
    else if (section.startsWith('lesson')) {
        if (section.includes('-task')) showTask(section);
        else if (section.endsWith('-intro')) showLessonIntro(section.replace('-intro', ''));
        else showLessonMenu(section);
    } else document.getElementById('dynamic-content').innerHTML = '<p>Раздел не найден.</p>';
    updateSidebarActive(section);
}
function showIntro() { currentView = 'intro'; currentTaskId = null; document.getElementById('dynamic-content').innerHTML = '<h2>Добро пожаловать!</h2><p>Эта программа поможет вам освоить геометрию «с нуля» или исправить трудности.</p>'; }
function showBlockMenu() { currentView = 'block1'; currentTaskId = null; let html = '<h2>Блок 1. Учимся рисовать первичные чертежи</h2><ul>'; for (const [lessonId, lesson] of Object.entries(lessons)) html += '<li><a href="#" data-section="' + lessonId + '">' + lesson.title + '</a></li>'; html += '</ul>'; document.getElementById('dynamic-content').innerHTML = html; }
function showLessonMenu(lessonId) { currentView = lessonId; currentTaskId = null; const lesson = lessons[lessonId]; if (!lesson) { document.getElementById('dynamic-content').innerHTML = '<p>Урок не найден.</p>'; return; } let html = '<h2>' + lesson.title + '</h2><ul>'; html += '<li><a href="#" data-section="' + lessonId + '-intro">Введение</a></li>'; for (const task of lesson.tasks) html += '<li><a href="#" data-section="' + task.id + '">' + task.title + '</a></li>'; html += '</ul>'; document.getElementById('dynamic-content').innerHTML = html; }
function showLessonIntro(lessonId) { currentView = lessonId + '-intro'; currentTaskId = null; const lesson = lessons[lessonId]; if (!lesson) { document.getElementById('dynamic-content').innerHTML = '<p>Урок не найден.</p>'; return; } document.getElementById('dynamic-content').innerHTML = '<h2>' + lesson.title + '</h2>' + (lesson.intro || ''); }
function showTask(taskId) {
    currentView = taskId; let taskConfigId = null;
    for (const lesson of Object.values(lessons)) { const found = lesson.tasks.find(t => t.id === taskId); if (found) { taskConfigId = found.taskConfigId; break; } }
    if (!taskConfigId) { document.getElementById('dynamic-content').innerHTML = '<p>Задание не найдено.</p>'; return; }
    currentTaskId = taskConfigId;
    const taskDef = tasks[taskConfigId]; const letters = taskDef.letters || [];
    const taskTitle = getTaskTitle(taskId); const html = generateTaskHTML(taskTitle, letters);
    document.getElementById('dynamic-content').innerHTML = html;
    const canvasEl = document.getElementById('lesson-canvas');
    if (canvasEl) {
        initCanvas(canvasEl); initUI('lesson');
        getSegments().splice(0, getSegments().length); namedPoints.splice(0, namedPoints.length);
        const state = appState[taskId];
        if (state) { if (state.segments) { const segs = getSegments(); segs.push(...state.segments); } if (state.namedPoints) namedPoints.push(...state.namedPoints); redraw(); } else clearDrawing();
        attachEvents();
        if (letters.length > 0) { setAllowedLetters(letters); if (pointsBtn) pointsBtn.style.display = 'inline-block'; if (pointButtonsContainer) pointButtonsContainer.style.display = 'none'; }
        else { if (pointsBtn) pointsBtn.style.display = 'none'; if (pointButtonsContainer) pointButtonsContainer.style.display = 'none'; }
        setTool('line');
        if (clearBtn) clearBtn.onclick = clearDrawing; if (undoBtn) undoBtn.onclick = undoLastAction;
        if (checkBtn) checkBtn.onclick = handleCheck; if (hintBtn) hintBtn.onclick = handleHint;
        if (pointerBtn) pointerBtn.onclick = () => setTool('pointer'); if (lineBtn) lineBtn.onclick = () => setTool('line');
        if (pointsBtn) pointsBtn.onclick = () => setTool('point'); if (eraserBtn) eraserBtn.onclick = () => setTool('eraser');
        initHintTimer(); redraw();
    }
}
function getTaskTitle(taskId) { for (const lesson of Object.values(lessons)) { const task = lesson.tasks.find(t => t.id === taskId); if (task) return task.title; } return 'Задание'; }
function generateTaskHTML(title, letters) {
    const pointsBtnHtml = letters.length > 0 ? '<button class="pointsBtn">🔤 Точки</button>' : '';
    const containerHtml = '<div class="point-buttons-container" id="pointButtonsContainer"></div>';
    return '<div class="header"><h1 class="task-title">' + title + '</h1><h2 class="task-subtitle">' + (letters.length ? 'Постройте отрезки и обозначьте вершины' : 'Нарисуйте два пересекающихся отрезка') + '</h2></div>' +
    '<div class="workspace"><div class="left-buttons"><button class="undoBtn">↩️ Отменить</button><button class="clearBtn">🧹 Очистить всё</button><button class="pointerBtn">🖱️ Указатель</button><button class="eraserBtn">🧽 Ластик</button><button class="lineBtn active">📏 Линия</button>' + pointsBtnHtml + containerHtml + '</div>' +
    '<div class="canvas-wrapper"><canvas id="lesson-canvas" width="800" height="600"></canvas><div class="info" id="status">…</div><div class="result-area" id="resultArea"></div></div>' +
    '<div class="right-buttons"><button class="checkBtn">✅ Проверить</button><button class="hintBtn" disabled>💡 Подсказка (30)</button><div class="hintProgress"><div class="hintBar"></div></div></div>' +
    '<div class="right-panel"><div class="log-section"><h2>📍 Возможные точки</h2><ul class="possiblePointLog"><li class="empty-log">Пока нет возможных точек</li></ul></div>' + (letters.length ? '<div class="log-section"><h2>📌 Именованные точки</h2><ul class="pointLogList"><li class="empty-log">Пока нет точек</li></ul></div>' : '') + '<div class="log-section"><h2>📋 Отрезки</h2><ul class="segmentLogList"><li class="empty-log">Пока нет отрезков</li></ul></div><div class="log-section"><h2>🧩 Производные отрезки</h2><ul class="derivedSegmentLog"><li class="empty-log">Пока нет производных отрезков</li></ul></div><div class="log-section"><h2>🔍 Анализ чертежа</h2><ul class="analysisLog"><li class="empty-log">Нажми «Проверить»</li></ul></div></div></div>';
}
function handleCheck() { if (!currentTaskId || !tasks[currentTaskId]) return; const taskDef = tasks[currentTaskId]; const { result, analysis } = taskDef.check(getSegments(), namedPoints); setResult(result); setAnalysis(analysis); if (result.includes('✅') && currentView) { const added = markLessonCompleted(currentView); if (added) { updateSidebarProgress(); setStatus('✅ Задача выполнена!'); } } }
function handleHint() { if (!currentTaskId || !tasks[currentTaskId]) return; const { result, analysis } = tasks[currentTaskId].hint(getSegments()); setResult(result); setAnalysis(analysis); }
function initHintTimer() { if (!hintBar || !hintBtn) return; startHintTimer(2, () => {}, () => console.log('Подсказка доступна')); }
function updateSidebarProgress() { document.querySelectorAll('.sidebar-menu a[data-task]').forEach(a => { if (isLessonCompleted(a.dataset.task)) a.classList.add('completed'); else a.classList.remove('completed'); }); }
function buildSidebarMenu() {
    const menu = document.getElementById('sidebar-menu'); menu.innerHTML = '';
    const introLi = document.createElement('li'); introLi.innerHTML = '<a href="#" data-section="intro">Введение</a>'; menu.appendChild(introLi);
    const block1Li = document.createElement('li'); block1Li.innerHTML = '<a href="#" class="block-title" data-section="block1">Блок 1. Учимся рисовать первичные чертежи</a>';
    const block1Submenu = document.createElement('ul'); block1Submenu.className = 'submenu';
    for (const [lessonId, lesson] of Object.entries(lessons)) {
        const lessonLi = document.createElement('li'); lessonLi.innerHTML = '<a href="#" data-section="' + lessonId + '">' + lesson.title + '</a>';
        const lessonSubmenu = document.createElement('ul'); lessonSubmenu.className = 'submenu';
        const introTaskLi = document.createElement('li'); introTaskLi.innerHTML = '<a href="#" data-section="' + lessonId + '-intro">Введение</a>'; lessonSubmenu.appendChild(introTaskLi);
        for (const task of lesson.tasks) { const taskLi = document.createElement('li'); taskLi.innerHTML = '<a href="#" data-task="' + task.id + '" data-section="' + task.id + '">' + task.title + '</a>'; lessonSubmenu.appendChild(taskLi); }
        lessonLi.appendChild(lessonSubmenu); block1Submenu.appendChild(lessonLi);
    }
    block1Li.appendChild(block1Submenu); menu.appendChild(block1Li);
    document.querySelectorAll('.sidebar-menu a[data-section]').forEach(link => { link.addEventListener('click', (e) => { e.preventDefault(); navigateTo(link.dataset.section); }); });
}
function updateSidebarActive(section) { document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active')); const link = document.querySelector('[data-section="' + section + '"]'); if (link) link.classList.add('active'); updateSidebarProgress(); }
document.getElementById('dynamic-content').addEventListener('click', (e) => { const target = e.target.closest('a[data-section]'); if (target) { e.preventDefault(); navigateTo(target.dataset.section); } });
buildSidebarMenu(); navigateTo('intro');
