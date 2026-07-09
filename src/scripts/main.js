import { canvas, ctx, W, H, getMousePos } from './canvas.js';
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
    statusEl, clearBtn, undoBtn, checkBtn, hintBtn, hintBar,
    setStatus,
    updatePossiblePointLog,
    addNamedPointLog, removeLastNamedPointLog, clearNamedPointLog,
    updateSegmentLog, removeLastSegmentLog, clearSegmentLog, updateDerivedSegmentLog,
    setAnalysis, setResult, clearAnalysis,
    getActivePointBtn, setActivePointBtn, disablePointBtn, enablePointBtn, resetAllButtons,
    onCanvasClick, onClearClick, onUndoClick, onCheckClick, onHintClick,
    startHintTimer
} from './ui.js';
import { getHintMessage } from './hints.js';

console.log('🔵 main.js начал загрузку');
console.log('🔵 canvas:', canvas, 'ctx:', ctx);
console.log('🔵 W:', W, 'H:', H);

let startPoint = null;
let endPoint = null;
let actionHistory = [];
let activeLabel = null;

function getPointNameByCoord(x, y, tol = 1) { /* без изменений */ }
function getPointFullName(x, y) { /* без изменений */ }
function getDerivedSegments() { /* без изменений */ }
function isPointOnSegment(p, seg) { /* без изменений */ }
function segLength(s) { /* без изменений */ }
function segAngle(s) { /* без изменений */ }
function angleBetweenSegments(s1, s2) { /* без изменений */ }
function isParallel(s1, s2) { /* без изменений */ }

function performAnalysis() {
    console.log('🟡 performAnalysis() вызвана');
    // ... весь код функции без изменений
    return lines;
}

function segmentIntersection(s1, s2) { /* без изменений */ }

// ---- Отрисовка ----
function render() {
    console.log('🟢 render() вызвана');
    ctx.clearRect(0, 0, W, H);
    console.log('🟢 после clearRect');
    drawGrid();
    console.log('🟢 после drawGrid');
    drawAllSegments();
    console.log('🟢 после drawAllSegments');
    drawPossiblePoints();
    console.log('🟢 после drawPossiblePoints');
    drawNamedPoints();
    console.log('🟢 после drawNamedPoints');
    drawTempSegment();
    console.log('🟢 после drawTempSegment');
    drawMarkers();
    console.log('🟢 после drawMarkers');
}

function drawTempSegment() { /* без изменений */ }
function drawMarkers() { /* без изменений */ }

function refreshPossiblePoints() {
    console.log('🟠 refreshPossiblePoints()');
    updatePossiblePoints(segments);
    updatePossiblePointLog(possiblePoints);
}

function refreshAllLogs() {
    console.log('🟠 refreshAllLogs()');
    updateSegmentLog(segments, getPointFullName);
    const derived = getDerivedSegments();
    updateDerivedSegmentLog(derived);
}

function handleCanvasClick(e) { /* без изменений */ }

// ... обработчики кнопок ...

function handleClear() { /* без изменений */ }
function handleUndo() { /* без изменений */ }
function handleCheck() { /* без изменений */ }
function handleHint() { /* без изменений */ }

function initHintTimer() {
    console.log('⏳ Таймер подсказки запущен (2 сек)');
    startHintTimer(2,
        (remaining) => {},
        () => { console.log('💡 Подсказка доступна'); }
    );
}

// ---- Инициализация ----
console.log('🔵 Назначение обработчиков...');
onCanvasClick(handleCanvasClick);
onClearClick(handleClear);
onUndoClick(handleUndo);
onCheckClick(handleCheck);
onHintClick(handleHint);

console.log('🔵 Первый render...');
render();
refreshPossiblePoints();
refreshAllLogs();

setStatus('🎨 <b>Как рисовать отрезок:</b><br>Кликни два раза на узлы сетки (начало и конец).<br><br>📍 <b>Как поставить точку:</b><br>Нажми кнопку с буквой (A–E), потом кликни<br>на нужное место рядом с Т1, Т2...');

console.log('🔵 Запуск initHintTimer...');
initHintTimer();

console.log('🔵 main.js полностью загружен');