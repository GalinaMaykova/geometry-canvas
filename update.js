const fs = require('fs');
const path = require('path');

const PROJECT_DIR = __dirname;

const files = {
    // ===== drawing.js (исправлена setTool, добавлен экспорт getCurrentTool) =====
    'src/scripts/drawing.js':
`import { canvas, ctx, W, H, getMousePos } from './canvas.js';
import { drawGrid, snapToGrid, isInsideCanvas } from './grid.js';
import {
    possiblePoints, updatePossiblePoints, findClosestPossiblePoint,
    drawPossiblePoints, clearPossiblePoints
} from './possiblePoints.js';
import {
    namedPoints, addNamedPoint, clearNamedPoints, drawNamedPoints
} from './points.js';
import {
    segments, addSegment, removeLastSegment, clearSegments, drawAllSegments
} from './segments.js';
import {
    setStatus, updatePossiblePointLog, updateSegmentLog,
    removeLastSegmentLog, clearSegmentLog, updateDerivedSegmentLog,
    setAnalysis, setResult, clearAnalysis,
    getActivePointBtn, setActivePointBtn, disablePointBtn, enablePointBtn,
    resetAllButtons, startHintTimer,
    clearNamedPointLog,
    setPointerActive, setLineActive, setPointsActive, setEraserActive, resetTools, populatePointButtons
} from './ui.js';

console.log('🔧 drawing.js загружен');

let startPoint = null;
let endPoint = null;
let actionHistory = [];
const MAX_HISTORY = 100;
let activeLabel = null;

let dragMode = 'none';
let dragPoint = null;
let dragSegment = null;
let dragStartPos = null;
let originalSegmentCoords = null;
let dragOriginalSegmentStates = [];
let mouseDownPos = null;
let isDragging = false;

let currentTool = 'line';   // по умолчанию линия
let allowedLetters = [];

let eraserHoverTarget = null;

const POINT_GRAB_RADIUS = 12;
const SEGMENT_GRAB_RADIUS = 10;

// ===================== Вспомогательные функции =====================
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
            for (let p of possiblePoints) if (isPointOnSegment(p, seg)) pts.push({x: p.x, y: p.y, id: p.id});
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
function distanceToSegment(px, py, seg) {
    const { x1, y1, x2, y2 } = seg;
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx*dx + dy*dy;
    if (len2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1)*dx + (py - y1)*dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t*dx, projY = y1 + t*dy;
    return Math.hypot(px - projX, py - projY);
}
function findClosestSegment(px, py, maxDist = SEGMENT_GRAB_RADIUS) {
    let best = null, bestDist = Infinity;
    for (let seg of segments) {
        const dist = distanceToSegment(px, py, seg);
        if (dist < bestDist && dist <= maxDist) { bestDist = dist; best = seg; }
    }
    return best;
}
function findClosestNamedPoint(px, py, maxDist = 15) {
    let best = null, bestDist = Infinity;
    for (let np of namedPoints) {
        const dx = px - np.x, dy = py - np.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < bestDist && dist <= maxDist) { bestDist = dist; best = np; }
    }
    return best;
}
function pushHistory(action) { actionHistory.push(action); if (actionHistory.length > MAX_HISTORY) actionHistory.shift(); }
function snapshotSegments() { return segments.map(seg => ({ ...seg })); }

function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    drawGrid(); drawAllSegments(); drawPossiblePoints(); drawNamedPoints();
    drawTempSegment(); drawMarkers();
    if (currentTool === 'eraser' && eraserHoverTarget) {
        ctx.save(); ctx.strokeStyle = 'red'; ctx.lineWidth = 3;
        if (eraserHoverTarget.type === 'segment') { const seg = eraserHoverTarget.ref; ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2); ctx.stroke(); }
        else if (eraserHoverTarget.type === 'namedPoint') { const np = eraserHoverTarget.ref; ctx.beginPath(); ctx.arc(np.x, np.y, 6, 0, 2*Math.PI); ctx.stroke(); }
        ctx.restore();
    }
}
function drawTempSegment() { if (startPoint && endPoint) { ctx.save(); ctx.setLineDash([4,4]); ctx.strokeStyle='#e67e22'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(startPoint.x, startPoint.y); ctx.lineTo(endPoint.x, endPoint.y); ctx.stroke(); ctx.restore(); } }
function drawMarkers() { ctx.save(); ctx.fillStyle='#e74c3c'; if (startPoint) { ctx.beginPath(); ctx.arc(startPoint.x, startPoint.y, 5, 0, 2*Math.PI); ctx.fill(); } if (endPoint) { ctx.beginPath(); ctx.arc(endPoint.x, endPoint.y, 5, 0, 2*Math.PI); ctx.fill(); } ctx.restore(); }
function refreshLogs() { updatePossiblePointLog(possiblePoints); updateSegmentLog(segments, getPointFullName); updateDerivedSegmentLog(getDerivedSegments()); }

// ===================== Обработчики мыши =====================
function onMouseDown(e) {
    const pos = getMousePos(e); const px = pos.x, py = pos.y;
    mouseDownPos = { x: px, y: py }; isDragging = false;

    if (currentTool === 'eraser') {
        const np = findClosestNamedPoint(px, py, 15);   // приоритет точки
        if (np) { deleteNamedPoint(np); e.preventDefault(); return; }
        const seg = findClosestSegment(px, py, SEGMENT_GRAB_RADIUS);
        if (seg) { deleteSegmentWithPoints(seg); e.preventDefault(); return; }
        dragMode = 'none'; return;
    }
    if (currentTool === 'point') {
        const closestPoint = findClosestPossiblePoint(px, py, POINT_GRAB_RADIUS);
        if (closestPoint && activeLabel) {
            addNamedPoint(activeLabel, closestPoint.x, closestPoint.y);
            disablePointBtn(activeLabel); setActivePointBtn(null); activeLabel = null;
            updatePossiblePoints(segments); render(); refreshLogs();
            if (typeof onDrawingChanged === 'function') onDrawingChanged();
            setStatus('Точка ' + activeLabel + ' поставлена в ' + closestPoint.id + ' ✅');
            e.preventDefault(); return;
        }
        dragMode = 'none'; return;
    }
    if (currentTool === 'line') { dragMode = 'none'; return; }

    if (currentTool === 'pointer') {
        const closestPoint = findClosestPossiblePoint(px, py, POINT_GRAB_RADIUS);
        if (closestPoint) {
            dragMode = 'point'; dragPoint = closestPoint; dragStartPos = { x: snapToGrid(px), y: snapToGrid(py) };
            dragOriginalSegmentStates = [];
            for (let seg of segments) {
                if ((Math.abs(seg.x1 - closestPoint.x) < 1 && Math.abs(seg.y1 - closestPoint.y) < 1) ||
                    (Math.abs(seg.x2 - closestPoint.x) < 1 && Math.abs(seg.y2 - closestPoint.y) < 1))
                    dragOriginalSegmentStates.push({ seg, x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2 });
            }
            e.preventDefault(); return;
        }
        const closestSeg = findClosestSegment(px, py, SEGMENT_GRAB_RADIUS);
        if (closestSeg) { dragMode = 'segment'; dragSegment = closestSeg; dragStartPos = { x: snapToGrid(px), y: snapToGrid(py) }; originalSegmentCoords = { x1: closestSeg.x1, y1: closestSeg.y1, x2: closestSeg.x2, y2: closestSeg.y2 }; e.preventDefault(); return; }
        const np = findClosestNamedPoint(px, py, 15);
        if (np) { dragMode = 'namedPoint'; dragPoint = np; dragStartPos = { x: snapToGrid(px), y: snapToGrid(py) }; originalSegmentCoords = { x: np.x, y: np.y }; e.preventDefault(); return; }
        dragMode = 'none'; return;
    }
    dragMode = 'none';
}
function onMouseMove(e) {
    const pos = getMousePos(e); const px = pos.x, py = pos.y;
    if (currentTool === 'eraser') { eraserHoverTarget = null; const np = findClosestNamedPoint(px, py, 15); if (np) eraserHoverTarget = { type: 'namedPoint', ref: np }; else { const seg = findClosestSegment(px, py, SEGMENT_GRAB_RADIUS); if (seg) eraserHoverTarget = { type: 'segment', ref: seg }; } render(); return; }
    else eraserHoverTarget = null;

    if (mouseDownPos && !isDragging) { const dx = px - mouseDownPos.x, dy = py - mouseDownPos.y; if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging = true; }

    if (dragMode === 'point' && dragPoint) {
        const snapX = snapToGrid(px), snapY = snapToGrid(py);
        for (let state of dragOriginalSegmentStates) { const seg = state.seg; if (Math.abs(seg.x1 - dragPoint.x) < 1 && Math.abs(seg.y1 - dragPoint.y) < 1) { seg.x1 = snapX; seg.y1 = snapY; } if (Math.abs(seg.x2 - dragPoint.x) < 1 && Math.abs(seg.y2 - dragPoint.y) < 1) { seg.x2 = snapX; seg.y2 = snapY; } }
        for (let np of namedPoints) { if (Math.abs(np.x - dragPoint.x) < 1 && Math.abs(np.y - dragPoint.y) < 1) { np.x = snapX; np.y = snapY; } }
        dragPoint.x = snapX; dragPoint.y = snapY; updatePossiblePoints(segments); render(); refreshLogs();
    } else if (dragMode === 'segment' && dragSegment) { const snapX = snapToGrid(px), snapY = snapToGrid(py); const dx = snapX - dragStartPos.x, dy = snapY - dragStartPos.y; dragSegment.x1 = originalSegmentCoords.x1 + dx; dragSegment.y1 = originalSegmentCoords.y1 + dy; dragSegment.x2 = originalSegmentCoords.x2 + dx; dragSegment.y2 = originalSegmentCoords.y2 + dy; updatePossiblePoints(segments); render(); refreshLogs(); }
    else if (dragMode === 'namedPoint' && dragPoint) { const snapX = snapToGrid(px), snapY = snapToGrid(py); dragPoint.x = snapX; dragPoint.y = snapY; render(); refreshLogs(); }

    if (startPoint && !endPoint && !isDragging && currentTool === 'line') { endPoint = { x: snapToGrid(px), y: snapToGrid(py) }; render(); }
}
function onMouseUp(e) {
    const pos = getMousePos(e); const px = pos.x, py = pos.y;
    if (currentTool === 'eraser') { dragMode = 'none'; return; }
    if (isDragging) {
        if (dragMode === 'point') { let hasDegenerate = false; for (let state of dragOriginalSegmentStates) { const seg = state.seg; if (Math.abs(seg.x1 - seg.x2) < 1 && Math.abs(seg.y1 - seg.y2) < 1) { hasDegenerate = true; break; } } if (hasDegenerate) { for (let state of dragOriginalSegmentStates) { state.seg.x1 = state.x1; state.seg.y1 = state.y1; state.seg.x2 = state.x2; state.seg.y2 = state.y2; } updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Нельзя схлопнуть отрезок в точку'); } else { pushHistory({ type: 'move', oldSegments: snapshotSegments(), newSegments: snapshotSegments() }); } }
        else if (dragMode === 'segment') { if (Math.abs(dragSegment.x1 - dragSegment.x2) < 1 && Math.abs(dragSegment.y1 - dragSegment.y2) < 1) { dragSegment.x1 = originalSegmentCoords.x1; dragSegment.y1 = originalSegmentCoords.y1; dragSegment.x2 = originalSegmentCoords.x2; dragSegment.y2 = originalSegmentCoords.y2; updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Нельзя схлопнуть отрезок в точку'); } else { pushHistory({ type: 'move', oldSegments: snapshotSegments(), newSegments: snapshotSegments() }); } }
        else if (dragMode === 'namedPoint') { pushHistory({ type: 'moveNamedPoint', label: dragPoint.label, oldX: originalSegmentCoords.x, oldY: originalSegmentCoords.y, newX: dragPoint.x, newY: dragPoint.y }); }
        dragMode = 'none'; dragPoint = null; dragSegment = null; dragStartPos = null; originalSegmentCoords = null; dragOriginalSegmentStates = []; isDragging = false; mouseDownPos = null;
        if (typeof onDrawingChanged === 'function') onDrawingChanged(); render(); refreshLogs(); return;
    }
    if (currentTool === 'line' && dragMode === 'none') handleCanvasClickAt(px, py);
    dragMode = 'none'; dragPoint = null; dragSegment = null; dragStartPos = null; originalSegmentCoords = null; dragOriginalSegmentStates = []; isDragging = false; mouseDownPos = null;
}
function handleCanvasClickAt(px, py) {
    if (currentTool !== 'line') return;
    const snapX = snapToGrid(px), snapY = snapToGrid(py);
    if (!isInsideCanvas(snapX, snapY)) { setStatus('Кликни внутри поля'); return; }
    if (!startPoint) { startPoint = { x: snapX, y: snapY }; endPoint = null; setStatus('Теперь кликни, чтобы выбрать конец отрезка ✏️'); render(); }
    else { if (startPoint.x === snapX && startPoint.y === snapY) { setStatus('Ты выбрал ту же точку. Начни сначала.'); startPoint = null; endPoint = null; render(); return; } const finalEnd = { x: snapX, y: snapY }; addSegment(startPoint.x, startPoint.y, finalEnd.x, finalEnd.y); pushHistory({ type: 'add', segment: { x1: startPoint.x, y1: startPoint.y, x2: finalEnd.x, y2: finalEnd.y } }); startPoint = null; endPoint = null; updatePossiblePoints(segments); render(); refreshLogs(); if (typeof onDrawingChanged === 'function') onDrawingChanged(); setStatus('Отрезок готов!'); }
}
function deleteSegmentWithPoints(seg) {
    const toRemove = [];
    for (let np of namedPoints) { if ((Math.abs(np.x - seg.x1) < 1 && Math.abs(np.y - seg.y1) < 1) || (Math.abs(np.x - seg.x2) < 1 && Math.abs(np.y - seg.y2) < 1)) toRemove.push(np); }
    for (let np of toRemove) deleteNamedPoint(np);
    pushHistory({ type: 'delete', segment: { ...seg } });
    const index = segments.indexOf(seg);
    if (index !== -1) { segments.splice(index, 1); updatePossiblePoints(segments); render(); refreshLogs(); if (typeof onDrawingChanged === 'function') onDrawingChanged(); setStatus('Отрезок удалён'); }
}
function deleteNamedPoint(np) { pushHistory({ type: 'deleteNamedPoint', point: { ...np } }); const index = namedPoints.indexOf(np); if (index !== -1) { namedPoints.splice(index, 1); enablePointBtn(np.label); render(); refreshLogs(); if (typeof onDrawingChanged === 'function') onDrawingChanged(); setStatus('Точка ' + np.label + ' удалена'); } }

// ===================== Публичные методы =====================

/**
 * Устанавливает инструмент (указатель, линия, точки, ластик).
 * Больше не переключает на указатель при повторном вызове с тем же инструментом.
 */
export function setTool(tool) {
    currentTool = tool;
    startPoint = null;
    endPoint = null;
    eraserHoverTarget = null;

    if (tool === 'pointer') setPointerActive();
    else if (tool === 'line') setLineActive();
    else if (tool === 'point') setPointsActive();
    else if (tool === 'eraser') setEraserActive();
    else resetTools();

    render();
}

/** Возвращает текущий инструмент (нужно для main.js) */
export function getCurrentTool() {
    return currentTool;
}

export function setAllowedLetters(letters) {
    allowedLetters = letters; populatePointButtons(letters); activeLabel = null; setActivePointBtn(null); resetAllButtons();
    document.querySelectorAll('.point-btn').forEach(btn => { btn.addEventListener('click', () => { if (currentTool !== 'point') return; const label = btn.dataset.label; if (btn.disabled) return; if (btn.classList.contains('active')) { btn.classList.remove('active'); setActivePointBtn(null); activeLabel = null; setStatus('Выбор точки отменён'); } else { document.querySelectorAll('.point-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); activeLabel = label; setStatus('Выбрана точка ' + label + '. Кликните рядом с возможной точкой.'); } }); });
}
export function attachEvents() { if (!canvas) return; canvas.addEventListener('mousedown', onMouseDown); canvas.addEventListener('mousemove', onMouseMove); canvas.addEventListener('mouseup', onMouseUp); }
export function detachEvents() { if (!canvas) return; canvas.removeEventListener('mousedown', onMouseDown); canvas.removeEventListener('mousemove', onMouseMove); canvas.removeEventListener('mouseup', onMouseUp); }
export function clearDrawing() { clearSegments(); clearNamedPoints(); clearPossiblePoints(); clearSegmentLog(); clearNamedPointLog(); clearAnalysis(); updatePossiblePointLog([]); startPoint = null; endPoint = null; actionHistory = []; activeLabel = null; eraserHoverTarget = null; resetAllButtons(); setActivePointBtn(null); if (typeof onDrawingChanged === 'function') onDrawingChanged(); setTool('pointer'); render(); }
export function undoLastAction() { if (startPoint) { startPoint = null; endPoint = null; setStatus('Сброшено'); render(); return; } if (!actionHistory.length) { setStatus('Нет действий для отмены'); return; } const last = actionHistory.pop(); if (last.type === 'add') { const removed = segments.pop(); if (removed) { updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Отрезок удалён (отмена)'); } } else if (last.type === 'delete') { segments.push(last.segment); updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Отрезок восстановлен (отмена)'); } else if (last.type === 'deleteNamedPoint') { namedPoints.push(last.point); disablePointBtn(last.point.label); render(); refreshLogs(); setStatus('Точка ' + last.point.label + ' восстановлена'); } else if (last.type === 'move') { segments.splice(0, segments.length, ...last.oldSegments); updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Перемещение отменено'); } else if (last.type === 'moveNamedPoint') { const np = namedPoints.find(p => p.label === last.label); if (np) { np.x = last.oldX; np.y = last.oldY; render(); refreshLogs(); setStatus('Перемещение точки отменено'); } } if (typeof onDrawingChanged === 'function') onDrawingChanged(); }
export function getSegments() { return segments; }
export let onDrawingChanged = null;
export function setOnDrawingChanged(callback) { onDrawingChanged = callback; }
export function redraw() { updatePossiblePoints(segments); render(); refreshLogs(); }
`,

    // ===== main.js (исправлены обработчики кнопок инструментов) =====
    'src/scripts/main.js':
`import { initCanvas, canvas } from './canvas.js';
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
    setTool, setAllowedLetters, getCurrentTool   // <-- новый импорт
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

// ===================== Навигация =====================
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
        setTool('line');   // всегда начинаем с линии

        // Привязка кнопок с учётом логики повтора
        if (clearBtn) clearBtn.onclick = clearDrawing;
        if (undoBtn) undoBtn.onclick = undoLastAction;
        if (checkBtn) checkBtn.onclick = handleCheck;
        if (hintBtn) hintBtn.onclick = handleHint;
        if (pointerBtn) pointerBtn.onclick = () => {
            if (getCurrentTool() === 'pointer') setTool('pointer');   // остаёмся на указателе
            else setTool('pointer');
        };
        if (lineBtn) lineBtn.onclick = () => {
            if (getCurrentTool() === 'line') setTool('pointer');      // повтор → указатель
            else setTool('line');
        };
        if (eraserBtn) eraserBtn.onclick = () => {
            if (getCurrentTool() === 'eraser') setTool('pointer');
            else setTool('eraser');
        };
        if (pointsBtn) pointsBtn.onclick = () => {
            if (getCurrentTool() === 'point') setTool('pointer');
            else setTool('point');
        };

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
`
};

// Запись только изменённых файлов
console.log('🔄 Обновление drawing.js и main.js...');
for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(PROJECT_DIR, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('✅ ' + filePath);
}
console.log('\n🎉 Готово! Запустите node server.js – теперь инструмент не сбрасывается при открытии задания.');
console.log('   Повторный клик по активному инструменту возвращает Указатель.');
