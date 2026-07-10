import { canvas, ctx, W, H, getMousePos } from './canvas.js';
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

// ===================== СОСТОЯНИЕ РЕДАКТОРА =====================
let startPoint = null;           // начало временного отрезка (при рисовании)
let endPoint = null;             // конец временного отрезка
let actionHistory = [];          // стек для отмены действий
const MAX_HISTORY = 100;        // максимальная глубина стека
let activeLabel = null;          // выбранная буква для инструмента "Точки"

// Перетаскивание
let dragMode = 'none';           // 'none', 'point', 'segment', 'namedPoint'
let dragPoint = null;            // объект точки (T-точка или именованная)
let dragSegment = null;          // объект перетаскиваемого отрезка
let dragStartPos = null;         // начальная позиция мыши (сетка)
let originalSegmentCoords = null; // исходные координаты отрезка
let dragOriginalSegmentStates = []; // состояния отрезков, затронутых перетаскиванием точки
let mouseDownPos = null;         // позиция мыши в момент нажатия
let isDragging = false;          // флаг, было ли движение мыши

// Текущий инструмент: 'pointer', 'line', 'point', 'eraser'
let currentTool = 'line';        // по умолчанию активна "Линия"
let allowedLetters = [];         // буквы, доступные для текущего задания

// Подсветка для ластика
let eraserHoverTarget = null;    // { type: 'segment'|'namedPoint', ref: объект }

// Радиусы захвата
const POINT_GRAB_RADIUS = 12;    // для возможных и именованных точек
const SEGMENT_GRAB_RADIUS = 10;  // для отрезков

// ======================= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =======================

/** Возвращает объект с T-идентификатором и буквой (если есть) */
function getPointFullName(x, y) {
    let tId = '?', letter = null;
    for (let pp of possiblePoints) if (Math.abs(pp.x - x) < 1 && Math.abs(pp.y - y) < 1) { tId = pp.id; break; }
    for (let np of namedPoints) if (Math.abs(np.x - x) < 1 && Math.abs(np.y - y) < 1) { letter = np.label; break; }
    return { tId, letter };
}
/** Строит производные отрезки (разбитые точками пересечения) */
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
/** Проверяет, лежит ли точка p на отрезке seg */
function isPointOnSegment(p, seg) {
    const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
    const len2 = dx*dx + dy*dy;
    if (len2 === 0) return Math.abs(p.x - seg.x1) < 1 && Math.abs(p.y - seg.y1) < 1;
    const t = ((p.x - seg.x1)*dx + (p.y - seg.y1)*dy) / len2;
    if (t < -0.001 || t > 1.001) return false;
    const projX = seg.x1 + t*dx, projY = seg.y1 + t*dy;
    return Math.hypot(p.x - projX, p.y - projY) < 2;
}
/** Расстояние от точки (px,py) до отрезка seg */
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
/** Ищет ближайший отрезок к точке (px,py) */
function findClosestSegment(px, py, maxDist = SEGMENT_GRAB_RADIUS) {
    let best = null, bestDist = Infinity;
    for (let seg of segments) {
        const dist = distanceToSegment(px, py, seg);
        if (dist < bestDist && dist <= maxDist) { bestDist = dist; best = seg; }
    }
    return best;
}
/** Ищет ближайшую именованную точку */
function findClosestNamedPoint(px, py, maxDist = 15) {
    let best = null, bestDist = Infinity;
    for (let np of namedPoints) {
        const dx = px - np.x, dy = py - np.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < bestDist && dist <= maxDist) { bestDist = dist; best = np; }
    }
    return best;
}
/** Добавляет действие в историю и обрезает стек */
function pushHistory(action) { actionHistory.push(action); if (actionHistory.length > MAX_HISTORY) actionHistory.shift(); }
/** Создаёт копию массива отрезков */
function snapshotSegments() { return segments.map(seg => ({ ...seg })); }

// ======================= ОТРИСОВКА =======================
function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    drawAllSegments();
    drawPossiblePoints();
    drawNamedPoints();
    drawTempSegment();
    drawMarkers();
    if (currentTool === 'eraser' && eraserHoverTarget) {
        ctx.save();
        ctx.strokeStyle = 'red'; ctx.lineWidth = 3;
        if (eraserHoverTarget.type === 'segment') { const seg = eraserHoverTarget.ref; ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2); ctx.stroke(); }
        else if (eraserHoverTarget.type === 'namedPoint') { const np = eraserHoverTarget.ref; ctx.beginPath(); ctx.arc(np.x, np.y, 6, 0, 2*Math.PI); ctx.stroke(); }
        ctx.restore();
    }
}
function drawTempSegment() { if (startPoint && endPoint) { ctx.save(); ctx.setLineDash([4,4]); ctx.strokeStyle='#e67e22'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(startPoint.x, startPoint.y); ctx.lineTo(endPoint.x, endPoint.y); ctx.stroke(); ctx.restore(); } }
function drawMarkers() { ctx.save(); ctx.fillStyle='#e74c3c'; if (startPoint) { ctx.beginPath(); ctx.arc(startPoint.x, startPoint.y, 5, 0, 2*Math.PI); ctx.fill(); } if (endPoint) { ctx.beginPath(); ctx.arc(endPoint.x, endPoint.y, 5, 0, 2*Math.PI); ctx.fill(); } ctx.restore(); }
function refreshLogs() { updatePossiblePointLog(possiblePoints); updateSegmentLog(segments, getPointFullName); updateDerivedSegmentLog(getDerivedSegments()); }

// ======================= ОБРАБОТЧИКИ МЫШИ =======================
function onMouseDown(e) {
    const pos = getMousePos(e);
    const px = pos.x, py = pos.y;
    mouseDownPos = { x: px, y: py };
    isDragging = false;

    // --- Ластик: сначала проверяем именованную точку, потом отрезок ---
    if (currentTool === 'eraser') {
        const np = findClosestNamedPoint(px, py, 15);     // приоритет у точек!
        if (np) { deleteNamedPoint(np); e.preventDefault(); return; }
        const seg = findClosestSegment(px, py, SEGMENT_GRAB_RADIUS);
        if (seg) { deleteSegmentWithPoints(seg); e.preventDefault(); return; }
        dragMode = 'none';
        return;
    }

    // --- Точки: автоматический выбор первой свободной буквы ---
    if (currentTool === 'point') {
        const closestPoint = findClosestPossiblePoint(px, py, POINT_GRAB_RADIUS);
        if (closestPoint) {
            // Если активная буква не выбрана – берём первую неиспользованную
            if (!activeLabel) {
                const firstAvailable = allowedLetters.find(letter =>
                    !namedPoints.some(np => np.label === letter)
                );
                if (firstAvailable) {
                    activeLabel = firstAvailable;
                    setActivePointBtn(firstAvailable);
                } else {
                    setStatus('Все точки уже расставлены');
                    return;
                }
            }
            // Ставим точку
            addNamedPoint(activeLabel, closestPoint.x, closestPoint.y);
            disablePointBtn(activeLabel);
            pushHistory({ type: 'addNamedPoint', point: { label: activeLabel, x: closestPoint.x, y: closestPoint.y } });
            setStatus('Точка ' + activeLabel + ' поставлена в ' + closestPoint.id + ' ✅');
            setActivePointBtn(null);
            activeLabel = null;
            updatePossiblePoints(segments);
            render(); refreshLogs();
            if (typeof onDrawingChanged === 'function') onDrawingChanged();
            e.preventDefault();
            return;
        }
        dragMode = 'none';
        return;
    }

    // --- Линия: ничего не делаем в mousedown, всё будет в mouseup ---
    if (currentTool === 'line') {
        dragMode = 'none';
        return;
    }

    // --- Указатель: перетаскивание точек и отрезков ---
    if (currentTool === 'pointer') {
        // Проверяем возможную точку (T1, T2…)
        const closestPoint = findClosestPossiblePoint(px, py, POINT_GRAB_RADIUS);
        if (closestPoint) {
            dragMode = 'point';
            dragPoint = closestPoint;
            dragStartPos = { x: snapToGrid(px), y: snapToGrid(py) };
            dragOriginalSegmentStates = [];
            for (let seg of segments) {
                if ((Math.abs(seg.x1 - closestPoint.x) < 1 && Math.abs(seg.y1 - closestPoint.y) < 1) ||
                    (Math.abs(seg.x2 - closestPoint.x) < 1 && Math.abs(seg.y2 - closestPoint.y) < 1)) {
                    dragOriginalSegmentStates.push({ seg, x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2 });
                }
            }
            e.preventDefault(); return;
        }
        // Проверяем целый отрезок
        const closestSeg = findClosestSegment(px, py, SEGMENT_GRAB_RADIUS);
        if (closestSeg) {
            dragMode = 'segment'; dragSegment = closestSeg;
            dragStartPos = { x: snapToGrid(px), y: snapToGrid(py) };
            originalSegmentCoords = { x1: closestSeg.x1, y1: closestSeg.y1, x2: closestSeg.x2, y2: closestSeg.y2 };
            e.preventDefault(); return;
        }
        // Проверяем именованную точку
        const np = findClosestNamedPoint(px, py, 15);
        if (np) {
            dragMode = 'namedPoint'; dragPoint = np;
            dragStartPos = { x: snapToGrid(px), y: snapToGrid(py) };
            originalSegmentCoords = { x: np.x, y: np.y };
            e.preventDefault(); return;
        }
        dragMode = 'none';
    }
}

function onMouseMove(e) {
    const pos = getMousePos(e);
    const px = pos.x, py = pos.y;

    // Обновляем подсветку для ластика
    if (currentTool === 'eraser') {
        eraserHoverTarget = null;
        const np = findClosestNamedPoint(px, py, 15);
        if (np) { eraserHoverTarget = { type: 'namedPoint', ref: np }; }
        else {
            const seg = findClosestSegment(px, py, SEGMENT_GRAB_RADIUS);
            if (seg) eraserHoverTarget = { type: 'segment', ref: seg };
        }
        render();
        return;
    } else {
        eraserHoverTarget = null;
    }

    if (mouseDownPos && !isDragging) {
        const dx = px - mouseDownPos.x, dy = py - mouseDownPos.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging = true;
    }

    // Перетаскивание возможной точки
    if (dragMode === 'point' && dragPoint) {
        const snapX = snapToGrid(px), snapY = snapToGrid(py);
        for (let state of dragOriginalSegmentStates) {
            const seg = state.seg;
            if (Math.abs(seg.x1 - dragPoint.x) < 1 && Math.abs(seg.y1 - dragPoint.y) < 1) { seg.x1 = snapX; seg.y1 = snapY; }
            if (Math.abs(seg.x2 - dragPoint.x) < 1 && Math.abs(seg.y2 - dragPoint.y) < 1) { seg.x2 = snapX; seg.y2 = snapY; }
        }
        // Синхронно двигаем именованные точки, привязанные к этой T-точке
        for (let np of namedPoints) {
            if (Math.abs(np.x - dragPoint.x) < 1 && Math.abs(np.y - dragPoint.y) < 1) { np.x = snapX; np.y = snapY; }
        }
        dragPoint.x = snapX; dragPoint.y = snapY;
        updatePossiblePoints(segments); render(); refreshLogs();
    }
    // Перетаскивание целого отрезка
    else if (dragMode === 'segment' && dragSegment) {
        const snapX = snapToGrid(px), snapY = snapToGrid(py);
        const dx = snapX - dragStartPos.x, dy = snapY - dragStartPos.y;
        dragSegment.x1 = originalSegmentCoords.x1 + dx; dragSegment.y1 = originalSegmentCoords.y1 + dy;
        dragSegment.x2 = originalSegmentCoords.x2 + dx; dragSegment.y2 = originalSegmentCoords.y2 + dy;
        updatePossiblePoints(segments); render(); refreshLogs();
    }
    // Перетаскивание именованной точки
    else if (dragMode === 'namedPoint' && dragPoint) {
        const snapX = snapToGrid(px), snapY = snapToGrid(py);
        dragPoint.x = snapX; dragPoint.y = snapY;
        render(); refreshLogs();
    }

    // Показываем временный отрезок в режиме "Линия"
    if (startPoint && !endPoint && !isDragging && currentTool === 'line') {
        endPoint = { x: snapToGrid(px), y: snapToGrid(py) };
        render();
    }
}

function onMouseUp(e) {
    const pos = getMousePos(e);
    const px = pos.x, py = pos.y;

    if (currentTool === 'eraser') { dragMode = 'none'; return; }

    if (isDragging) {
        if (dragMode === 'point') {
            let hasDegenerate = false;
            for (let state of dragOriginalSegmentStates) {
                const seg = state.seg;
                if (Math.abs(seg.x1 - seg.x2) < 1 && Math.abs(seg.y1 - seg.y2) < 1) { hasDegenerate = true; break; }
            }
            if (hasDegenerate) {
                for (let state of dragOriginalSegmentStates) {
                    state.seg.x1 = state.x1; state.seg.y1 = state.y1;
                    state.seg.x2 = state.x2; state.seg.y2 = state.y2;
                }
                updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Нельзя схлопнуть отрезок в точку');
            } else {
                pushHistory({ type: 'move', oldSegments: snapshotSegments(), newSegments: snapshotSegments() });
            }
        } else if (dragMode === 'segment') {
            if (Math.abs(dragSegment.x1 - dragSegment.x2) < 1 && Math.abs(dragSegment.y1 - dragSegment.y2) < 1) {
                dragSegment.x1 = originalSegmentCoords.x1; dragSegment.y1 = originalSegmentCoords.y1;
                dragSegment.x2 = originalSegmentCoords.x2; dragSegment.y2 = originalSegmentCoords.y2;
                updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Нельзя схлопнуть отрезок в точку');
            } else {
                pushHistory({ type: 'move', oldSegments: snapshotSegments(), newSegments: snapshotSegments() });
            }
        } else if (dragMode === 'namedPoint') {
            pushHistory({ type: 'moveNamedPoint', label: dragPoint.label, oldX: originalSegmentCoords.x, oldY: originalSegmentCoords.y, newX: dragPoint.x, newY: dragPoint.y });
        }
        dragMode = 'none'; dragPoint = null; dragSegment = null;
        dragStartPos = null; originalSegmentCoords = null; dragOriginalSegmentStates = [];
        isDragging = false; mouseDownPos = null;
        if (typeof onDrawingChanged === 'function') onDrawingChanged();
        render(); refreshLogs();
        return;
    }

    // Завершаем построение отрезка в режиме "Линия"
    if (currentTool === 'line' && dragMode === 'none') {
        handleCanvasClickAt(px, py);
    }

    dragMode = 'none'; dragPoint = null; dragSegment = null;
    dragStartPos = null; originalSegmentCoords = null; dragOriginalSegmentStates = [];
    isDragging = false; mouseDownPos = null;
}

/**
 * Обрабатывает клик в режиме "Линия": первый клик – начало, второй – конец отрезка.
 */
function handleCanvasClickAt(px, py) {
    if (currentTool !== 'line') return;
    const snapX = snapToGrid(px), snapY = snapToGrid(py);
    if (!isInsideCanvas(snapX, snapY)) { setStatus('Кликни внутри поля'); return; }

    if (!startPoint) {
        startPoint = { x: snapX, y: snapY }; endPoint = null;
        setStatus('Теперь кликни, чтобы выбрать конец отрезка ✏️');
        render();
    } else {
        if (startPoint.x === snapX && startPoint.y === snapY) {
            setStatus('Ты выбрал ту же точку. Начни сначала.');
            startPoint = null; endPoint = null; render();
            return;
        }
        const finalEnd = { x: snapX, y: snapY };
        addSegment(startPoint.x, startPoint.y, finalEnd.x, finalEnd.y);
        pushHistory({ type: 'add', segment: { x1: startPoint.x, y1: startPoint.y, x2: finalEnd.x, y2: finalEnd.y } });
        startPoint = null; endPoint = null;
        updatePossiblePoints(segments); render(); refreshLogs();
        if (typeof onDrawingChanged === 'function') onDrawingChanged();
        setStatus('Отрезок готов!');
    }
}

/**
 * Удаляет отрезок И все именованные точки, которые стояли на его концах.
 */
function deleteSegmentWithPoints(seg) {
    const toRemove = [];
    for (let np of namedPoints) {
        if ((Math.abs(np.x - seg.x1) < 1 && Math.abs(np.y - seg.y1) < 1) ||
            (Math.abs(np.x - seg.x2) < 1 && Math.abs(np.y - seg.y2) < 1)) {
            toRemove.push(np);
        }
    }
    for (let np of toRemove) deleteNamedPoint(np);
    pushHistory({ type: 'delete', segment: { ...seg } });
    const index = segments.indexOf(seg);
    if (index !== -1) { segments.splice(index, 1); updatePossiblePoints(segments); render(); refreshLogs(); if (typeof onDrawingChanged === 'function') onDrawingChanged(); setStatus('Отрезок удалён'); }
}

/** Удаляет именованную точку (используется и ластиком, и при удалении отрезка) */
function deleteNamedPoint(np) {
    pushHistory({ type: 'deleteNamedPoint', point: { ...np } });
    const index = namedPoints.indexOf(np);
    if (index !== -1) { namedPoints.splice(index, 1); enablePointBtn(np.label); render(); refreshLogs(); if (typeof onDrawingChanged === 'function') onDrawingChanged(); setStatus('Точка ' + np.label + ' удалена'); }
}

// ======================= ПУБЛИЧНЫЕ МЕТОДЫ =======================

/** Переключает инструмент. Повторное нажатие возвращает в "Указатель". */
export function setTool(tool) {
    currentTool = tool;
    startPoint = null; endPoint = null;
    eraserHoverTarget = null;

    if (tool === 'pointer') setPointerActive();
    else if (tool === 'line') setLineActive();
    else if (tool === 'point') setPointsActive();
    else if (tool === 'eraser') setEraserActive();
    else resetTools();

    render();
}

export function getCurrentTool() { return currentTool; }

export function setAllowedLetters(letters) {
    allowedLetters = letters;
    populatePointButtons(letters);
    activeLabel = null;
    setActivePointBtn(null);
    resetAllButtons();
    document.querySelectorAll('.point-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentTool !== 'point') return;
            const label = btn.dataset.label;
            if (btn.disabled) return;
            if (btn.classList.contains('active')) {
                btn.classList.remove('active'); setActivePointBtn(null); activeLabel = null;
                setStatus('Выбор точки отменён');
            } else {
                document.querySelectorAll('.point-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active'); activeLabel = label;
                setStatus('Выбрана точка ' + label + '. Кликните рядом с возможной точкой.');
            }
        });
    });
}

export function attachEvents() { if (!canvas) return; canvas.addEventListener('mousedown', onMouseDown); canvas.addEventListener('mousemove', onMouseMove); canvas.addEventListener('mouseup', onMouseUp); }
export function detachEvents() { if (!canvas) return; canvas.removeEventListener('mousedown', onMouseDown); canvas.removeEventListener('mousemove', onMouseMove); canvas.removeEventListener('mouseup', onMouseUp); }
export function clearDrawing() { clearSegments(); clearNamedPoints(); clearPossiblePoints(); clearSegmentLog(); clearNamedPointLog(); clearAnalysis(); updatePossiblePointLog([]); startPoint = null; endPoint = null; actionHistory = []; activeLabel = null; eraserHoverTarget = null; resetAllButtons(); setActivePointBtn(null); if (typeof onDrawingChanged === 'function') onDrawingChanged(); setTool('pointer'); render(); }

/**
 * Отменяет последнее действие (отрезок, точку, перемещение).
 * Поддерживает типы: 'add' (отрезок), 'delete' (отрезок), 'addNamedPoint' (точка),
 * 'deleteNamedPoint' (точка), 'move' (перемещение отрезка), 'moveNamedPoint' (перемещение точки).
 */
export function undoLastAction() {
    if (startPoint) { startPoint = null; endPoint = null; setStatus('Сброшено'); render(); return; }
    if (!actionHistory.length) { setStatus('Нет действий для отмены'); return; }
    const last = actionHistory.pop();

    if (last.type === 'add') {
        // Удаляем последний добавленный отрезок
        const removed = segments.pop();
        if (removed) { updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Отрезок удалён (отмена)'); }
    } else if (last.type === 'delete') {
        // Восстанавливаем удалённый отрезок
        segments.push(last.segment); updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Отрезок восстановлен (отмена)');
    } else if (last.type === 'addNamedPoint') {
        // Удаляем последнюю добавленную точку (по label и координатам)
        const index = namedPoints.findIndex(p => p.label === last.point.label && Math.abs(p.x - last.point.x) < 1 && Math.abs(p.y - last.point.y) < 1);
        if (index !== -1) {
            namedPoints.splice(index, 1);
            enablePointBtn(last.point.label);
            render(); refreshLogs(); setStatus('Точка ' + last.point.label + ' удалена (отмена)');
        }
    } else if (last.type === 'deleteNamedPoint') {
        // Восстанавливаем удалённую точку
        namedPoints.push(last.point); disablePointBtn(last.point.label); render(); refreshLogs(); setStatus('Точка ' + last.point.label + ' восстановлена');
    } else if (last.type === 'move') {
        // Откатываем перемещение отрезков
        segments.splice(0, segments.length, ...last.oldSegments);
        updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Перемещение отменено');
    } else if (last.type === 'moveNamedPoint') {
        // Откатываем перемещение именованной точки
        const np = namedPoints.find(p => p.label === last.label);
        if (np) { np.x = last.oldX; np.y = last.oldY; render(); refreshLogs(); setStatus('Перемещение точки отменено'); }
    }

    if (typeof onDrawingChanged === 'function') onDrawingChanged();
}

export function getSegments() { return segments; }
export let onDrawingChanged = null;
export function setOnDrawingChanged(callback) { onDrawingChanged = callback; }
export function redraw() { updatePossiblePoints(segments); render(); refreshLogs(); }
