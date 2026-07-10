import { initCanvas, getMousePos } from './canvas.js';
import { drawGrid, snapToGrid, isInsideCanvas } from './grid.js';
import {
    possiblePoints,
    updatePossiblePoints,
    findClosestPossiblePoint,
    drawPossiblePoints,
    clearPossiblePoints
} from './possiblePoints.js';
import {
    namedPoints,
    addNamedPoint,
    removeLastNamedPoint,
    clearNamedPoints,
    drawNamedPoints
} from './points.js';
import {
    segments,
    addSegment,
    removeLastSegment,
    clearSegments,
    drawAllSegments
} from './segments.js';
import {
    initUI,
    setStatus, updatePossiblePointLog, addNamedPointLog, removeLastNamedPointLog, clearNamedPointLog,
    updateSegmentLog, removeLastSegmentLog, clearSegmentLog, updateDerivedSegmentLog,
    setAnalysis, setResult, clearAnalysis,
    getActivePointBtn, setActivePointBtn, disablePointBtn, enablePointBtn, resetAllButtons,
    startHintTimer
} from './ui.js';
import { lessons, tasks } from './taskConfig.js';

console.log('🚀 main.js загружен!');

let currentSection = 'intro';
let currentTaskId = null;
let canvas, ctx, W, H;
let startPoint = null, endPoint = null, actionHistory = [], activeLabel = null;

function getPointFullName(x, y) { return { tId: 'T?', letter: null }; } // заглушка
function getDerivedSegments() { return []; } // заглушка

function render() {
    if (!ctx) return;
    ctx.clearRect(0,0,W,H);
    drawGrid();
    drawAllSegments();
    drawPossiblePoints();
    if (currentTaskId && tasks[currentTaskId] && tasks[currentTaskId].showPoints) {
        drawNamedPoints();
    }
    drawTempSegment();
    drawMarkers();
}

function drawTempSegment() {
    if (startPoint && endPoint) {
        ctx.save();
        ctx.setLineDash([4,4]);
        ctx.strokeStyle = '#e67e22';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
        ctx.restore();
    }
}

function drawMarkers() {
    ctx.save();
    ctx.fillStyle = '#e74c3c';
    if (startPoint) {
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, 5, 0, 2*Math.PI);
        ctx.fill();
    }
    if (endPoint) {
        ctx.beginPath();
        ctx.arc(endPoint.x, endPoint.y, 5, 0, 2*Math.PI);
        ctx.fill();
    }
    ctx.restore();
}

function handleCanvasClick(e) {
    if (!canvas) return;
    const pos = getMousePos(e);
    const x = pos.x, y = pos.y;
    const sx = snapToGrid(x), sy = snapToGrid(y);
    if (!isInsideCanvas(sx, sy)) {
        setStatus('Кликни внутри поля');
        return;
    }
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
        startPoint = null;
        endPoint = null;
        refreshPossiblePoints();
        render();
        refreshAllLogs();
        setStatus('Отрезок готов!');
    } else {
        startPoint = null;
        endPoint = null;
        render();
        setStatus('Начнём заново.');
    }
}

function refreshPossiblePoints() {
    updatePossiblePoints(segments);
    updatePossiblePointLog(possiblePoints);
}

function refreshAllLogs() {
    updateSegmentLog(segments, getPointFullName);
    updateDerivedSegmentLog(getDerivedSegments());
}

function handleClear() {
    clearSegments();
    clearNamedPoints();
    clearPossiblePoints();
    clearSegmentLog();
    clearNamedPointLog();
    clearAnalysis();
    updatePossiblePointLog([]);
    startPoint = null;
    endPoint = null;
    resetAllButtons();
    setActivePointBtn(null);
    activeLabel = null;
    actionHistory = [];
    setStatus('Всё стёрто!');
    render();
}

function handleUndo() {
    if (startPoint) {
        startPoint = null;
        endPoint = null;
        setStatus('Сброшено');
        render();
        return;
    }
    if (!actionHistory.length) {
        setStatus('Нет действий для отмены');
        return;
    }
    const last = actionHistory.pop();
    if (last.type === 'segment') {
        if (removeLastSegment()) {
            removeLastSegmentLog();
            refreshPossiblePoints();
            render();
            refreshAllLogs();
            setStatus('Отрезок удалён');
        }
    }
}

function handleCheck() {
    if (!currentTaskId || !tasks[currentTaskId]) return;
    const { result, analysis } = tasks[currentTaskId].check(segments);
    setResult(result);
    setAnalysis(analysis);
}

function handleHint() {
    if (!currentTaskId || !tasks[currentTaskId]) return;
    const { result, analysis } = tasks[currentTaskId].hint(segments);
    setResult(result);
    setAnalysis(analysis);
}

function initHintTimer() {
    startHintTimer(2, () => {}, () => console.log('Подсказка доступна'));
}

function loadSection(sectionId) {
    currentSection = sectionId;
    const lesson = lessons[sectionId];
    if (!lesson) {
        document.getElementById('dynamic-content').innerHTML = '<p>Раздел не найден.</p>';
        return;
    }
    if (canvas) {
        canvas.removeEventListener('click', handleCanvasClick);
        const oldCanvas = document.querySelector('canvas');
        if (oldCanvas) oldCanvas.remove();
    }
    let html = '';
    if (sectionId === 'intro' || !lesson.taskId) {
        html = lesson.content || '<p>Заглушка</p>';
    } else {
        html = generateLessonHTML(lesson);
    }
    document.getElementById('dynamic-content').innerHTML = html;

    if (lesson.taskId) {
        currentTaskId = lesson.taskId;
        const canvasEl = document.getElementById('lesson-canvas');
        if (canvasEl) {
            initCanvas(canvasEl);
            canvas = canvasEl;
            ctx = canvas.getContext('2d');
            W = canvas.width;
            H = canvas.height;
            initUI('lesson');
            canvas.addEventListener('click', handleCanvasClick);
            document.querySelector('.clearBtn').onclick = handleClear;
            document.querySelector('.undoBtn').onclick = handleUndo;
            document.querySelector('.checkBtn').onclick = handleCheck;
            document.querySelector('.hintBtn').onclick = handleHint;
            initHintTimer();
            render();
            refreshPossiblePoints();
            refreshAllLogs();
        }
    }
    // Подсветка активного пункта меню (без обратных кавычек!)
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector('[data-section="' + sectionId + '"]');
    if (activeLink) activeLink.classList.add('active');
}

function generateLessonHTML(lesson) {
    return '<div class="header">' +
        '<h1 class="task-title">' + lesson.title + '</h1>' +
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

// Привязка событий меню
document.querySelectorAll('.sidebar-menu a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        if (section) loadSection(section);
    });
});

// Загружаем введение по умолчанию
loadSection('intro');
