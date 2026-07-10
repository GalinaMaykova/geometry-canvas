import { initCanvas, canvas, ctx, W, H, getMousePos } from './canvas.js';
import { drawGrid, snapToGrid, isInsideCanvas } from './grid.js';
import {
    possiblePoints, updatePossiblePoints, findClosestPossiblePoint,
    drawPossiblePoints, clearPossiblePoints
} from './possiblePoints.js';
import {
    namedPoints, addNamedPoint, removeLastNamedPoint, clearNamedPoints, drawNamedPoints
} from './points.js';
import {
    segments, addSegment, removeLastSegment, clearSegments, drawAllSegments
} from './segments.js';
import {
    initUI,
    setStatus, updatePossiblePointLog, addNamedPointLog,
    removeLastNamedPointLog, clearNamedPointLog, updateSegmentLog,
    removeLastSegmentLog, clearSegmentLog, updateDerivedSegmentLog,
    setAnalysis, setResult, clearAnalysis,
    getActivePointBtn, setActivePointBtn, disablePointBtn, enablePointBtn,
    resetAllButtons, startHintTimer,
    statusEl, resultArea, possiblePointLog, pointLogList, segmentLogList,
    derivedSegmentLog, analysisLog, pointBtns,
    clearBtn, undoBtn, checkBtn, hintBtn, hintBar
} from './ui.js';
import { lessons, tasks } from './taskConfig.js';
import {
    markLessonCompleted, isLessonCompleted,
    saveAppState as saveAppStateToStorage,
    loadAppState as loadAppStateFromStorage
} from './progress.js';

console.log('🚀 main.js загружен!');

// Глобальные переменные для текущего задания
let startPoint = null;
let endPoint = null;
let actionHistory = [];
let activeLabel = null;

// Состояние каждого задания: { segments, possiblePoints, namedPoints, actionHistory, startPoint, endPoint, activeLabel }
// Загружаем из localStorage при старте
let appState = loadAppStateFromStorage();

// Текущий открытый раздел (идентификатор задания или урока/введения)
let currentView = null;   // например, 'lesson1-1-task1' или 'lesson1-1' или 'intro'
let currentTaskId = null; // ID задания (если открыто задание)
let canvasReady = false;

// Вспомогательные функции
function getPointFullName(x, y) {
    let tId = '?', letter = null;
    for (let pp of possiblePoints) if (Math.abs(pp.x - x) < 1 && Math.abs(pp.y - y) < 1) { tId = pp.id; break; }
    for (let np of namedPoints) if (Math.abs(np.x - x) < 1 && Math.abs(np.y - y) < 1) { letter = np.label; break; }
    return { tId, letter };
}

function getDerivedSegments() {
    try {
        const derived = [];
        if (!segments || !possiblePoints) return derived;
        for (let seg of segments) {
            const pts = [];
            for (let p of possiblePoints) {
                if (isPointOnSegment(p, seg)) pts.push({x: p.x, y: p.y, id: p.id});
            }
            const uniq = [], seen = new Set();
            for (let p of pts) { const k = p.x+','+p.y; if (!seen.has(k)) { seen.add(k); uniq.push(p); } }
            const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
            uniq.sort((a,b) => (dx!==0?(a.x-seg.x1)/dx:(a.y-seg.y1)/dy) - (dx!==0?(b.x-seg.x1)/dx:(b.y-seg.y1)/dy));
            for (let i=0; i<uniq.length-1; i++) {
                const p1=uniq[i], p2=uniq[i+1];
                const f1=getPointFullName(p1.x,p1.y), f2=getPointFullName(p2.x,p2.y);
                derived.push({
                    x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,
                    name1: f1.letter ? f1.tId+'('+f1.letter+')' : f1.tId,
                    name2: f2.letter ? f2.tId+'('+f2.letter+')' : f2.tId
                });
            }
        }
        return derived;
    } catch (e) { console.error(e); return []; }
}

function isPointOnSegment(p, seg) {
    const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
    const len2 = dx*dx + dy*dy;
    if (len2 === 0) return Math.abs(p.x - seg.x1) < 1 && Math.abs(p.y - seg.y1) < 1;
    const t = ((p.x - seg.x1)*dx + (p.y - seg.y1)*dy) / len2;
    if (t < -0.001 || t > 1.001) return false;
    const projX = seg.x1 + t*dx, projY = seg.y1 + t*dy;
    return Math.hypot(p.x - projX, p.y - projY) < 2;
}

// Сохранение и восстановление состояния
function saveCurrentState() {
    if (!currentView) return;
    appState[currentView] = {
        segments: segments.slice(),
        possiblePoints: possiblePoints.slice(),
        namedPoints: namedPoints.slice(),
        actionHistory: actionHistory.slice(),
        startPoint: startPoint ? { ...startPoint } : null,
        endPoint: endPoint ? { ...endPoint } : null,
        activeLabel: activeLabel
    };
    // Сохраняем в localStorage
    saveAppStateToStorage(appState);
}

function restoreState(viewId) {
    const state = appState[viewId];
    clearSegments();
    clearNamedPoints();
    clearPossiblePoints();
    actionHistory = [];
    startPoint = null;
    endPoint = null;
    activeLabel = null;
    resetAllButtons();
    setActivePointBtn(null);

    if (state) {
        segments.push(...state.segments);
        possiblePoints.push(...state.possiblePoints);
        namedPoints.push(...state.namedPoints);
        actionHistory = state.actionHistory.slice();
        startPoint = state.startPoint;
        endPoint = state.endPoint;
        activeLabel = state.activeLabel;
    }
}

// Отрисовка
function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    drawAllSegments();
    drawPossiblePoints();
    drawNamedPoints();
    drawTempSegment();
    drawMarkers();
}

function drawTempSegment() {
    if (startPoint && endPoint) {
        ctx.save();
        ctx.setLineDash([4,4]); ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(startPoint.x, startPoint.y); ctx.lineTo(endPoint.x, endPoint.y); ctx.stroke();
        ctx.restore();
    }
}

function drawMarkers() {
    ctx.save();
    ctx.fillStyle = '#e74c3c';
    if (startPoint) { ctx.beginPath(); ctx.arc(startPoint.x, startPoint.y, 5, 0, 2*Math.PI); ctx.fill(); }
    if (endPoint) { ctx.beginPath(); ctx.arc(endPoint.x, endPoint.y, 5, 0, 2*Math.PI); ctx.fill(); }
    ctx.restore();
}

function refreshLogs() {
    updatePossiblePointLog(possiblePoints);
    updateSegmentLog(segments, getPointFullName);
    updateDerivedSegmentLog(getDerivedSegments());
}

// Обработчик клика
function handleCanvasClick(e) {
    const pos = getMousePos(e);
    const x = pos.x, y = pos.y;
    const sx = snapToGrid(x), sy = snapToGrid(y);
    if (!isInsideCanvas(sx, sy)) { setStatus('Кликни внутри поля'); return; }

    if (!startPoint) {
        startPoint = { x: sx, y: sy };
        setStatus('Теперь кликни для конца отрезка ✏️');
        render();
    } else if (!endPoint) {
        if (startPoint.x === sx && startPoint.y === sy) {
            setStatus('Та же точка. Начни сначала.');
            startPoint = null;
            render();
            return;
        }
        endPoint = { x: sx, y: sy };
        addSegment(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
        actionHistory.push({ type: 'segment', x1: startPoint.x, y1: startPoint.y, x2: endPoint.x, y2: endPoint.y });
        startPoint = null; endPoint = null;
        updatePossiblePoints(segments);
        render();
        refreshLogs();
        saveCurrentState(); // сохраняем после каждого добавления отрезка
        setStatus('Отрезок готов!');
    }
}

// Обработчики кнопок
function handleClear() {
    clearSegments(); clearNamedPoints(); clearPossiblePoints();
    clearSegmentLog(); clearNamedPointLog(); clearAnalysis();
    updatePossiblePointLog([]);
    startPoint = null; endPoint = null;
    resetAllButtons(); setActivePointBtn(null); activeLabel = null; actionHistory = [];
    saveCurrentState(); // сохраняем пустое состояние
    setStatus('Всё стёрто!');
    render();
}

function handleUndo() {
    if (startPoint) { startPoint = null; endPoint = null; setStatus('Сброшено'); render(); return; }
    if (!actionHistory.length) { setStatus('Нет действий для отмены'); return; }
    const last = actionHistory.pop();
    if (last.type === 'segment') {
        if (removeLastSegment()) {
            removeLastSegmentLog();
            updatePossiblePoints(segments);
            render();
            refreshLogs();
            saveCurrentState();
            setStatus('Отрезок удалён');
        }
    }
}

function handleCheck() {
    if (!currentTaskId || !tasks[currentTaskId]) return;
    const { result, analysis } = tasks[currentTaskId].check(segments);
    setResult(result);
    setAnalysis(analysis);
    if (result.includes('✅') && currentView) {
        const added = markLessonCompleted(currentView);
        if (added) {
            updateSidebarProgress();
            setStatus('✅ Задача выполнена! Урок отмечен как пройденный.');
        }
    }
}

function handleHint() {
    if (!currentTaskId || !tasks[currentTaskId]) return;
    const { result, analysis } = tasks[currentTaskId].hint(segments);
    setResult(result);
    setAnalysis(analysis);
}

function initHintTimer() {
    if (!hintBar || !hintBtn) return;
    startHintTimer(2, () => {}, () => console.log('Подсказка доступна'));
}

// Обновление значков прогресса в меню
function updateSidebarProgress() {
    document.querySelectorAll('.sidebar-menu a[data-task]').forEach(a => {
        const taskId = a.dataset.task;
        if (isLessonCompleted(taskId)) {
            a.classList.add('completed');
        } else {
            a.classList.remove('completed');
        }
    });
}

// Генерация полного меню (как раньше)
function buildSidebarMenu() {
    const menu = document.getElementById('sidebar-menu');
    menu.innerHTML = '';

    // Введение
    const introLi = document.createElement('li');
    introLi.innerHTML = '<a href="#" data-section="intro">Введение</a>';
    menu.appendChild(introLi);

    // Блок 1 с уроками и подпунктами
    const block1Li = document.createElement('li');
    block1Li.innerHTML = '<a href="#" class="block-title" data-section="block1">Блок 1. Учимся рисовать первичные чертежи</a>';
    const block1Submenu = document.createElement('ul');
    block1Submenu.className = 'submenu';

    for (const [lessonId, lesson] of Object.entries(lessons)) {
        const lessonLi = document.createElement('li');
        lessonLi.innerHTML = '<a href="#" data-section="' + lessonId + '">' + lesson.title + '</a>';
        const lessonSubmenu = document.createElement('ul');
        lessonSubmenu.className = 'submenu';

        // Введение урока
        const introTaskLi = document.createElement('li');
        introTaskLi.innerHTML = '<a href="#" data-section="' + lessonId + '-intro">Введение</a>';
        lessonSubmenu.appendChild(introTaskLi);

        // Задания
        for (const task of lesson.tasks) {
            const taskLi = document.createElement('li');
            taskLi.innerHTML = '<a href="#" data-task="' + task.id + '" data-section="' + task.id + '">' + task.title + '</a>';
            lessonSubmenu.appendChild(taskLi);
        }

        lessonLi.appendChild(lessonSubmenu);
        block1Submenu.appendChild(lessonLi);
    }

    block1Li.appendChild(block1Submenu);
    menu.appendChild(block1Li);

    // Привязываем обработчики
    document.querySelectorAll('.sidebar-menu a[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.section);
        });
    });
}

// Навигация
function navigateTo(section) {
    if (currentView && currentTaskId) {
        saveCurrentState();
    }

    if (canvas) {
        canvas.removeEventListener('click', handleCanvasClick);
        const oldCanvas = document.querySelector('canvas');
        if (oldCanvas) oldCanvas.remove();
        canvasReady = false;
    }

    if (section === 'intro') {
        showIntro();
    } else if (section === 'block1') {
        showBlockMenu();
    } else if (section.startsWith('lesson')) {
        if (section.includes('-task')) {
            showTask(section);
        } else if (section.endsWith('-intro')) {
            const lessonId = section.replace('-intro', '');
            showLessonIntro(lessonId);
        } else {
            showLessonMenu(section);
        }
    } else {
        document.getElementById('dynamic-content').innerHTML = '<p>Раздел не найден.</p>';
    }

    updateSidebarActive(section);
}

function showIntro() {
    currentView = 'intro';
    currentTaskId = null;
    document.getElementById('dynamic-content').innerHTML = '<h2>Добро пожаловать!</h2><p>Эта программа поможет вам освоить геометрию «с нуля» или исправить трудности.</p>';
}

function showBlockMenu() {
    currentView = 'block1';
    currentTaskId = null;
    let html = '<h2>Блок 1. Учимся рисовать первичные чертежи</h2><ul>';
    for (const [lessonId, lesson] of Object.entries(lessons)) {
        html += '<li><a href="#" data-section="' + lessonId + '">' + lesson.title + '</a></li>';
    }
    html += '</ul>';
    document.getElementById('dynamic-content').innerHTML = html;
}

function showLessonMenu(lessonId) {
    currentView = lessonId;
    currentTaskId = null;
    const lesson = lessons[lessonId];
    if (!lesson) {
        document.getElementById('dynamic-content').innerHTML = '<p>Урок не найден.</p>';
        return;
    }
    let html = '<h2>' + lesson.title + '</h2><ul>';
    html += '<li><a href="#" data-section="' + lessonId + '-intro">Введение</a></li>';
    for (const task of lesson.tasks) {
        html += '<li><a href="#" data-section="' + task.id + '">' + task.title + '</a></li>';
    }
    html += '</ul>';
    document.getElementById('dynamic-content').innerHTML = html;
}

function showLessonIntro(lessonId) {
    currentView = lessonId + '-intro';
    currentTaskId = null;
    const lesson = lessons[lessonId];
    if (!lesson) {
        document.getElementById('dynamic-content').innerHTML = '<p>Урок не найден.</p>';
        return;
    }
    document.getElementById('dynamic-content').innerHTML = '<h2>' + lesson.title + '</h2>' + (lesson.intro || '');
}

function showTask(taskId) {
    currentView = taskId;
    let taskConfigId = null;
    for (const lesson of Object.values(lessons)) {
        const found = lesson.tasks.find(t => t.id === taskId);
        if (found) {
            taskConfigId = found.taskConfigId;
            break;
        }
    }
    if (!taskConfigId) {
        document.getElementById('dynamic-content').innerHTML = '<p>Задание не найдено.</p>';
        return;
    }

    currentTaskId = taskConfigId;

    const taskTitle = getTaskTitle(taskId);
    const html = generateTaskHTML(taskTitle);
    document.getElementById('dynamic-content').innerHTML = html;

    const canvasEl = document.getElementById('lesson-canvas');
    if (canvasEl) {
        initCanvas(canvasEl);
        initUI('lesson');
        restoreState(taskId);
        canvas.addEventListener('click', handleCanvasClick);
        if (clearBtn) clearBtn.onclick = handleClear;
        if (undoBtn) undoBtn.onclick = handleUndo;
        if (checkBtn) checkBtn.onclick = handleCheck;
        if (hintBtn) hintBtn.onclick = handleHint;
        initHintTimer();
        render();
        refreshLogs();
        canvasReady = true;
    }
}

function getTaskTitle(taskId) {
    for (const lesson of Object.values(lessons)) {
        const task = lesson.tasks.find(t => t.id === taskId);
        if (task) return task.title;
    }
    return 'Задание';
}

function generateTaskHTML(title) {
    return '<div class="header">' +
        '<h1 class="task-title">' + title + '</h1>' +
        '<h2 class="task-subtitle">Нарисуйте два пересекающихся отрезка</h2>' +
        '</div>' +
        '<div class="workspace">' +
        '<div class="left-buttons"></div>' +
        '<div class="canvas-wrapper">' +
        '<canvas id="lesson-canvas" width="800" height="600"></canvas>' +
        '<div class="info" id="status">…</div>' +
        '<div class="result-area" id="resultArea"></div>' +
        '</div>' +
        '<div class="right-buttons">' +
        '<button class="undoBtn">↩️ Отменить</button>' +
        '<button class="clearBtn">🧹 Очистить всё</button>' +
        '<button class="checkBtn">✅ Проверить</button>' +
        '<button class="hintBtn" disabled>💡 Подсказка (30)</button>' +
        '<div class="hintProgress"><div class="hintBar"></div></div>' +
        '</div>' +
        '<div class="right-panel">' +
        '<div class="log-section"><h2>📍 Возможные точки</h2><ul class="possiblePointLog"><li class="empty-log">Пока нет возможных точек</li></ul></div>' +
        '<div class="log-section"><h2>📋 Отрезки</h2><ul class="segmentLogList"><li class="empty-log">Пока нет отрезков</li></ul></div>' +
        '<div class="log-section"><h2>🧩 Производные отрезки</h2><ul class="derivedSegmentLog"><li class="empty-log">Пока нет производных отрезков</li></ul></div>' +
        '<div class="log-section"><h2>🔍 Анализ чертежа</h2><ul class="analysisLog"><li class="empty-log">Нажми «Проверить»</li></ul></div>' +
        '</div>' +
        '</div>';
}

function updateSidebarActive(section) {
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    const link = document.querySelector('[data-section="' + section + '"]');
    if (link) link.classList.add('active');
    updateSidebarProgress();
}

// Делегирование кликов в основной области для ссылок с data-section
document.getElementById('dynamic-content').addEventListener('click', (e) => {
    const target = e.target.closest('a[data-section]');
    if (target) {
        e.preventDefault();
        navigateTo(target.dataset.section);
    }
});

// Старт приложения
buildSidebarMenu();
navigateTo('intro');
