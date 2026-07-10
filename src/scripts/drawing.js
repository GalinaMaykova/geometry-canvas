import { canvas, ctx, W, H, getMousePos } from './canvas.js';
import { drawGrid, snapToGrid, isInsideCanvas } from './grid.js';
import {
    possiblePoints, updatePossiblePoints, findClosestPossiblePoint,
    drawPossiblePoints, clearPossiblePoints
} from './possiblePoints.js';
import {
    namedPoints, clearNamedPoints, drawNamedPoints
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
    showDeleteButton, hideDeleteButton
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
let mouseDownPos = null;
let isDragging = false;

let selectedSegment = null;

// Флаг: был ли клик по уже выделенному отрезку (чтобы снять выделение в mouseup)
let clickedOnSelected = false;

const POINT_GRAB_RADIUS = 12;
const SEGMENT_GRAB_RADIUS = 10;

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

function pushHistory(action) {
    actionHistory.push(action);
    if (actionHistory.length > MAX_HISTORY) actionHistory.shift();
}

function snapshotSegments() {
    return segments.map(seg => ({ ...seg }));
}

function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    drawAllSegments();
    if (selectedSegment) {
        ctx.save();
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(selectedSegment.x1, selectedSegment.y1);
        ctx.lineTo(selectedSegment.x2, selectedSegment.y2);
        ctx.stroke();
        ctx.restore();
    }
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

function onMouseDown(e) {
    const pos = getMousePos(e);
    const px = pos.x, py = pos.y;
    mouseDownPos = { x: px, y: py };
    isDragging = false;
    clickedOnSelected = false; // сбрасываем флаг

    if (!startPoint) {
        const closestPoint = findClosestPossiblePoint(px, py, POINT_GRAB_RADIUS);
        if (closestPoint) {
            dragMode = 'point';
            dragPoint = closestPoint;
            dragStartPos = { x: snapToGrid(px), y: snapToGrid(py) };
            clearSelection();
            e.preventDefault();
            return;
        }

        const closestSeg = findClosestSegment(px, py, SEGMENT_GRAB_RADIUS);
        if (closestSeg) {
            if (closestSeg === selectedSegment) {
                // Клик по уже выделенному отрезку – запоминаем, чтобы снять выделение при mouseup
                clickedOnSelected = true;
            } else {
                // Новый отрезок – выделяем его
                selectSegment(closestSeg);
            }
            dragMode = 'segment';
            dragSegment = closestSeg;
            dragStartPos = { x: snapToGrid(px), y: snapToGrid(py) };
            originalSegmentCoords = {
                x1: closestSeg.x1, y1: closestSeg.y1,
                x2: closestSeg.x2, y2: closestSeg.y2
            };
            e.preventDefault();
            return;
        }
    }

    // Клик на пустом месте – снимаем выделение
    clearSelection();
    dragMode = 'none';
}

function onMouseMove(e) {
    const pos = getMousePos(e);
    const px = pos.x, py = pos.y;

    if (mouseDownPos && !isDragging) {
        const dx = px - mouseDownPos.x, dy = py - mouseDownPos.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging = true;
    }

    if (dragMode === 'point' && dragPoint) {
        const snapX = snapToGrid(px), snapY = snapToGrid(py);
        for (let seg of segments) {
            if (Math.abs(seg.x1 - dragPoint.x) < 1 && Math.abs(seg.y1 - dragPoint.y) < 1) { seg.x1 = snapX; seg.y1 = snapY; }
            if (Math.abs(seg.x2 - dragPoint.x) < 1 && Math.abs(seg.y2 - dragPoint.y) < 1) { seg.x2 = snapX; seg.y2 = snapY; }
        }
        dragPoint.x = snapX;
        dragPoint.y = snapY;
        updatePossiblePoints(segments);
        render();
        refreshLogs();
    } else if (dragMode === 'segment' && dragSegment) {
        const snapX = snapToGrid(px), snapY = snapToGrid(py);
        const dx = snapX - dragStartPos.x;
        const dy = snapY - dragStartPos.y;
        dragSegment.x1 = originalSegmentCoords.x1 + dx;
        dragSegment.y1 = originalSegmentCoords.y1 + dy;
        dragSegment.x2 = originalSegmentCoords.x2 + dx;
        dragSegment.y2 = originalSegmentCoords.y2 + dy;
        updatePossiblePoints(segments);
        render();
        refreshLogs();
    }

    if (startPoint && !endPoint && !isDragging && dragMode === 'none') {
        endPoint = { x: snapToGrid(px), y: snapToGrid(py) };
        render();
    }
}

function onMouseUp(e) {
    const pos = getMousePos(e);
    const px = pos.x, py = pos.y;

    if (isDragging) {
        // Завершение перетаскивания (не снимаем выделение)
        if (dragMode === 'point' || dragMode === 'segment') {
            pushHistory({
                type: 'move',
                oldSegments: snapshotSegments(),
                newSegments: snapshotSegments()
            });
        }
        dragMode = 'none';
        dragPoint = null;
        dragSegment = null;
        dragStartPos = null;
        originalSegmentCoords = null;
        isDragging = false;
        mouseDownPos = null;
        clickedOnSelected = false;
        if (typeof onDrawingChanged === 'function') onDrawingChanged();
        render();
        refreshLogs();
        return;
    }

    // Клик без перетаскивания
    if (dragMode === 'segment' && clickedOnSelected) {
        // Повторный клик по выделенному отрезку – снимаем выделение
        clearSelection();
    } else if (dragMode === 'segment') {
        // Клик по новому отрезку (выделение уже произошло в mousedown)
        // Ничего дополнительного не делаем
    }

    if (dragMode === 'none') {
        handleCanvasClickAt(px, py);
    }

    dragMode = 'none';
    dragPoint = null;
    dragSegment = null;
    dragStartPos = null;
    originalSegmentCoords = null;
    isDragging = false;
    mouseDownPos = null;
    clickedOnSelected = false;
}

function handleCanvasClickAt(px, py) {
    const snapX = snapToGrid(px), snapY = snapToGrid(py);
    if (!isInsideCanvas(snapX, snapY)) { setStatus('Кликни внутри поля'); return; }

    if (!startPoint) {
        startPoint = { x: snapX, y: snapY };
        endPoint = null;
        setStatus('Теперь кликни, чтобы выбрать конец отрезка ✏️');
        render();
    } else {
        if (startPoint.x === snapX && startPoint.y === snapY) {
            setStatus('Ты выбрал ту же точку. Начни сначала.');
            startPoint = null;
            endPoint = null;
            render();
            return;
        }
        const finalEnd = { x: snapX, y: snapY };
        addSegment(startPoint.x, startPoint.y, finalEnd.x, finalEnd.y);
        pushHistory({
            type: 'add',
            segment: { x1: startPoint.x, y1: startPoint.y, x2: finalEnd.x, y2: finalEnd.y }
        });
        startPoint = null;
        endPoint = null;
        updatePossiblePoints(segments);
        render();
        refreshLogs();
        if (typeof onDrawingChanged === 'function') onDrawingChanged();
        setStatus('Отрезок готов!');
    }
}

function selectSegment(seg) {
    if (selectedSegment !== seg) {
        selectedSegment = seg;
        showDeleteButton();
    }
    render();
}

function clearSelection() {
    if (selectedSegment) {
        selectedSegment = null;
        hideDeleteButton();
        render();
    }
}

export function deleteSelectedSegment() {
    if (!selectedSegment) return;
    pushHistory({
        type: 'delete',
        segment: { ...selectedSegment }
    });
    const index = segments.indexOf(selectedSegment);
    if (index !== -1) {
        segments.splice(index, 1);
        updatePossiblePoints(segments);
        clearSelection();
        render();
        refreshLogs();
        if (typeof onDrawingChanged === 'function') onDrawingChanged();
        setStatus('Отрезок удалён');
    }
}

export function attachEvents() {
    if (!canvas) return;
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
}

export function detachEvents() {
    if (!canvas) return;
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseup', onMouseUp);
}

export function clearDrawing() {
    clearSegments();
    clearNamedPoints();
    clearPossiblePoints();
    clearSegmentLog();
    clearNamedPointLog();
    clearAnalysis();
    updatePossiblePointLog([]);
    startPoint = null;
    endPoint = null;
    actionHistory = [];
    activeLabel = null;
    selectedSegment = null;
    resetAllButtons();
    setActivePointBtn(null);
    hideDeleteButton();
    if (typeof onDrawingChanged === 'function') onDrawingChanged();
    render();
}

export function undoLastAction() {
    if (startPoint) { startPoint = null; endPoint = null; setStatus('Сброшено'); render(); return; }
    if (!actionHistory.length) { setStatus('Нет действий для отмены'); return; }
    const last = actionHistory.pop();
    if (last.type === 'add') {
        const removed = segments.pop();
        if (removed) {
            updatePossiblePoints(segments);
            clearSelection();
            render();
            refreshLogs();
            setStatus('Отрезок удалён (отмена)');
        }
    } else if (last.type === 'delete') {
        segments.push(last.segment);
        updatePossiblePoints(segments);
        clearSelection();
        render();
        refreshLogs();
        setStatus('Отрезок восстановлен (отмена)');
    } else if (last.type === 'move') {
        segments.splice(0, segments.length, ...last.oldSegments);
        updatePossiblePoints(segments);
        clearSelection();
        render();
        refreshLogs();
        setStatus('Перемещение отменено');
    }
    if (typeof onDrawingChanged === 'function') onDrawingChanged();
}

export function getSegments() { return segments; }
export let onDrawingChanged = null;
export function setOnDrawingChanged(callback) { onDrawingChanged = callback; }
export function redraw() { updatePossiblePoints(segments); render(); refreshLogs(); }
