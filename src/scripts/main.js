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

console.log('🚀 main.js загружен!');

let startPoint = null;
let endPoint = null;
let actionHistory = [];
let activeLabel = null;

function getPointNameByCoord(x, y, tol = 1) {
    for (let np of namedPoints) {
        if (Math.abs(np.x - x) < tol && Math.abs(np.y - y) < tol) {
            return np.label;
        }
    }
    for (let pp of possiblePoints) {
        if (Math.abs(pp.x - x) < tol && Math.abs(pp.y - y) < tol) {
            return pp.id;
        }
    }
    return '?';
}

function getPointFullName(x, y) {
    let tId = '?';
    let letter = null;
    for (let pp of possiblePoints) {
        if (Math.abs(pp.x - x) < 1 && Math.abs(pp.y - y) < 1) {
            tId = pp.id;
            break;
        }
    }
    for (let np of namedPoints) {
        if (Math.abs(np.x - x) < 1 && Math.abs(np.y - y) < 1) {
            letter = np.label;
            break;
        }
    }
    return { tId, letter };
}

function isPointOnSegment(p, seg) {
    const { x1, y1, x2, y2 } = seg;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx*dx + dy*dy;
    if (lengthSq === 0) return Math.abs(p.x - x1) < 1 && Math.abs(p.y - y1) < 1;
    const t = ((p.x - x1)*dx + (p.y - y1)*dy) / lengthSq;
    if (t < -0.001 || t > 1.001) return false;
    const projX = x1 + t*dx;
    const projY = y1 + t*dy;
    const dist = Math.sqrt((p.x - projX)*(p.x - projX) + (p.y - projY)*(p.y - projY));
    return dist < 2;
}

function getDerivedSegments() {
    try {
        const derived = [];
        if (!segments || !possiblePoints) return derived;
        for (let seg of segments) {
            const pointsOnSeg = [];
            for (let p of possiblePoints) {
                if (isPointOnSegment(p, seg)) {
                    pointsOnSeg.push({ x: p.x, y: p.y, id: p.id });
                }
            }
            const unique = [];
            const seen = new Set();
            for (let p of pointsOnSeg) {
                const key = p.x + ',' + p.y;
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(p);
                }
            }
            const dx = seg.x2 - seg.x1;
            const dy = seg.y2 - seg.y1;
            unique.sort((a, b) => {
                const tA = (dx !== 0) ? (a.x - seg.x1) / dx : (a.y - seg.y1) / dy;
                const tB = (dx !== 0) ? (b.x - seg.x1) / dx : (b.y - seg.y1) / dy;
                return tA - tB;
            });
            for (let i = 0; i < unique.length - 1; i++) {
                const p1 = unique[i];
                const p2 = unique[i+1];
                const full1 = getPointFullName(p1.x, p1.y);
                const full2 = getPointFullName(p2.x, p2.y);
                const name1 = full1.letter ? full1.tId + '(' + full1.letter + ')' : full1.tId;
                const name2 = full2.letter ? full2.tId + '(' + full2.letter + ')' : full2.tId;
                derived.push({
                    x1: p1.x, y1: p1.y,
                    x2: p2.x, y2: p2.y,
                    name1: name1,
                    name2: name2
                });
            }
        }
        return derived;
    } catch (e) {
        console.error('Ошибка в getDerivedSegments:', e);
        return [];
    }
}

function segLength(s) {
    const dx = s.x2 - s.x1;
    const dy = s.y2 - s.y1;
    return Math.sqrt(dx*dx + dy*dy);
}

function segAngle(s) {
    let ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180 / Math.PI;
    if (ang < 0) ang += 180;
    return ang;
}

function angleBetweenSegments(s1, s2) {
    const dx1 = s1.x2 - s1.x1;
    const dy1 = s1.y2 - s1.y1;
    const dx2 = s2.x2 - s2.x1;
    const dy2 = s2.y2 - s2.y1;
    const dot = dx1*dx2 + dy1*dy2;
    const norm1 = Math.sqrt(dx1*dx1 + dy1*dy1);
    const norm2 = Math.sqrt(dx2*dx2 + dy2*dy2);
    if (norm1 < 0.001 || norm2 < 0.001) return 0;
    const cosA = Math.max(-1, Math.min(1, dot / (norm1 * norm2)));
    return Math.acos(cosA) * 180 / Math.PI;
}

function isParallel(s1, s2) {
    const a1 = segAngle(s1);
    const a2 = segAngle(s2);
    const diff = Math.abs(a1 - a2) % 180;
    return diff < 0.1 || diff > 179.9;
}

function performAnalysis() {
    const lines = [];
    const derived = getDerivedSegments();

    const intersecting = [];
    for (let i = 0; i < segments.length; i++) {
        for (let j = i+1; j < segments.length; j++) {
            const p = segmentIntersection(segments[i], segments[j]);
            if (p) {
                const name1 = getPointFullName(segments[i].x1, segments[i].y1).tId + getPointFullName(segments[i].x2, segments[i].y2).tId;
                const name2 = getPointFullName(segments[j].x1, segments[j].y1).tId + getPointFullName(segments[j].x2, segments[j].y2).tId;
                intersecting.push(name1 + ' и ' + name2);
            }
        }
    }
    if (intersecting.length > 0) {
        lines.push('✅ Пересекающиеся отрезки: ' + intersecting.join(', '));
    } else {
        lines.push('❌ Пересекающихся отрезков нет');
    }

    const equalGroups = [];
    const visited = new Array(segments.length).fill(false);
    for (let i = 0; i < segments.length; i++) {
        if (visited[i]) continue;
        const lenI = segLength(segments[i]);
        const group = [i];
        for (let j = i+1; j < segments.length; j++) {
            if (visited[j]) continue;
            if (Math.abs(segLength(segments[j]) - lenI) < 1) {
                group.push(j);
                visited[j] = true;
            }
        }
        if (group.length > 1) {
            visited[i] = true;
            const names = group.map(idx => {
                const s = segments[idx];
                return getPointFullName(s.x1, s.y1).tId + getPointFullName(s.x2, s.y2).tId;
            });
            equalGroups.push(names.join(', ') + ' (длина ' + lenI.toFixed(1) + ')');
        }
    }
    if (equalGroups.length > 0) {
        lines.push('✅ Равные отрезки: ' + equalGroups.join('; '));
    } else {
        lines.push('❌ Равных отрезков нет');
    }

    const angleSet = new Set();
    for (let p of possiblePoints) {
        const incident = derived.filter(s => (Math.abs(s.x1 - p.x) < 1 && Math.abs(s.y1 - p.y) < 1) || (Math.abs(s.x2 - p.x) < 1 && Math.abs(s.y2 - p.y) < 1));
        for (let i = 0; i < incident.length; i++) {
            for (let j = i+1; j < incident.length; j++) {
                const s1 = incident[i];
                const s2 = incident[j];
                const v1 = (Math.abs(s1.x1 - p.x) < 1 && Math.abs(s1.y1 - p.y) < 1) ? {x: s1.x2, y: s1.y2} : {x: s1.x1, y: s1.y1};
                const v2 = (Math.abs(s2.x1 - p.x) < 1 && Math.abs(s2.y1 - p.y) < 1) ? {x: s2.x2, y: s2.y2} : {x: s2.x1, y: s2.y1};
                const name1 = getPointFullName(v1.x, v1.y).tId;
                const name2 = getPointFullName(v2.x, v2.y).tId;
                const centerName = getPointFullName(p.x, p.y).tId;
                const ang = angleBetweenSegments(
                    {x1: p.x, y1: p.y, x2: v1.x, y2: v1.y},
                    {x1: p.x, y1: p.y, x2: v2.x, y2: v2.y}
                );
                const parts = [name1, name2].sort();
                const key = centerName + '|' + parts[0] + '|' + parts[1];
                if (!angleSet.has(key)) {
                    angleSet.add(key);
                    lines.push('📐 Угол <' + name1 + centerName + name2 + ' = ' + ang.toFixed(1) + '°');
                }
            }
        }
    }
    if (angleSet.size === 0) {
        lines.push('❌ Углы не обнаружены');
    }

    const pointIncidence = new Map();
    for (let s of derived) {
        const id1 = getPointFullName(s.x1, s.y1).tId;
        const id2 = getPointFullName(s.x2, s.y2).tId;
        pointIncidence.set(id1, (pointIncidence.get(id1) || 0) + 1);
        pointIncidence.set(id2, (pointIncidence.get(id2) || 0) + 1);
    }
    const commonPoints = [];
    for (let [id, count] of pointIncidence.entries()) {
        if (count > 1) commonPoints.push(id + ' (' + count + ' отр.)');
    }
    if (commonPoints.length > 0) {
        lines.push('✅ Общие точки: ' + commonPoints.join(', '));
    } else {
        lines.push('❌ Общих точек нет');
    }

    const parallelPairs = [];
    for (let i = 0; i < segments.length; i++) {
        for (let j = i+1; j < segments.length; j++) {
            if (isParallel(segments[i], segments[j])) {
                const name1 = getPointFullName(segments[i].x1, segments[i].y1).tId + getPointFullName(segments[i].x2, segments[i].y2).tId;
                const name2 = getPointFullName(segments[j].x1, segments[j].y1).tId + getPointFullName(segments[j].x2, segments[j].y2).tId;
                parallelPairs.push(name1 + ' || ' + name2);
            }
        }
    }
    if (parallelPairs.length > 0) {
        lines.push('✅ Параллельные отрезки: ' + parallelPairs.join(', '));
    } else {
        lines.push('❌ Параллельных отрезков нет');
    }

    const perpPairs = [];
    for (let i = 0; i < segments.length; i++) {
        for (let j = i+1; j < segments.length; j++) {
            const ang = angleBetweenSegments(segments[i], segments[j]);
            if (Math.abs(ang - 90) < 0.1) {
                const name1 = getPointFullName(segments[i].x1, segments[i].y1).tId + getPointFullName(segments[i].x2, segments[i].y2).tId;
                const name2 = getPointFullName(segments[j].x1, segments[j].y1).tId + getPointFullName(segments[j].x2, segments[j].y2).tId;
                perpPairs.push(name1 + ' ⊥ ' + name2);
            }
        }
    }
    if (perpPairs.length > 0) {
        lines.push('✅ Перпендикулярные отрезки (90°): ' + perpPairs.join(', '));
    } else {
        lines.push('❌ Перпендикулярных отрезков (90°) нет');
    }

    const approxPerpPairs = [];
    for (let i = 0; i < segments.length; i++) {
        for (let j = i+1; j < segments.length; j++) {
            const ang = angleBetweenSegments(segments[i], segments[j]);
            if (ang >= 85 && ang <= 95) {
                const name1 = getPointFullName(segments[i].x1, segments[i].y1).tId + getPointFullName(segments[i].x2, segments[i].y2).tId;
                const name2 = getPointFullName(segments[j].x1, segments[j].y1).tId + getPointFullName(segments[j].x2, segments[j].y2).tId;
                approxPerpPairs.push(name1 + ' ∠ ' + name2 + ' (' + ang.toFixed(1) + '°)');
            }
        }
    }
    if (approxPerpPairs.length > 0) {
        lines.push('✅ Примерно перпендикулярные отрезки (85°–95°): ' + approxPerpPairs.join(', '));
    } else {
        lines.push('❌ Примерно перпендикулярных отрезков (85°–95°) нет');
    }

    return lines;
}

function segmentIntersection(s1, s2) {
    const x1 = s1.x1, y1 = s1.y1, x2 = s1.x2, y2 = s1.y2;
    const x3 = s2.x1, y3 = s2.y1, x4 = s2.x2, y4 = s2.y2;
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
    }
    return null;
}

// ---- Отрисовка ----
function render() {
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
        ctx.setLineDash([4, 4]);
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
        ctx.arc(startPoint.x, startPoint.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    }
    if (endPoint) {
        ctx.beginPath();
        ctx.arc(endPoint.x, endPoint.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    }
    ctx.restore();
}

function refreshPossiblePoints() {
    updatePossiblePoints(segments);
    updatePossiblePointLog(possiblePoints);
}

function refreshAllLogs() {
    updateSegmentLog(segments, getPointFullName);
    let derived = [];
    try {
        const result = getDerivedSegments();
        if (Array.isArray(result)) {
            derived = result;
        } else {
            console.warn('getDerivedSegments вернул не массив:', result);
        }
    } catch (e) {
        console.error('Ошибка при получении производных отрезков:', e);
    }
    updateDerivedSegmentLog(derived);
}

function handleCanvasClick(e) {
    const pos = getMousePos(e);
    const x = pos.x, y = pos.y;

    const activeBtn = getActivePointBtn();
    if (activeBtn) {
        const label = activeBtn.dataset.label;
        if (namedPoints.some(p => p.label === label)) {
            setStatus('Точка ' + label + ' уже стоит! Выбери другую кнопку.');
            return;
        }
        const closest = findClosestPossiblePoint(x, y, 30);
        if (!closest) {
            setStatus('Рядом нет возможной точки (Т1, Т2, ...). Попробуй ещё раз.');
            return;
        }
        addNamedPoint(label, closest.x, closest.y);
        addNamedPointLog(label, closest.x, closest.y);
        disablePointBtn(label);
        setActivePointBtn(null);
        activeLabel = null;
        actionHistory.push({ type: 'point', label, x: closest.x, y: closest.y });
        setStatus('Точка ' + label + ' поставлена в ' + closest.id + ' ✅');
        render();
        refreshAllLogs();
        return;
    }

    const snapX = snapToGrid(x);
    const snapY = snapToGrid(y);
    if (!isInsideCanvas(snapX, snapY)) {
        setStatus('Кликни внутри серого поля 😊');
        return;
    }

    if (!startPoint) {
        startPoint = { x: snapX, y: snapY };
        setStatus('Отлично! Теперь кликни в любое место, чтобы выбрать конец отрезка ✏️');
        render();
        return;
    }

    if (startPoint && !endPoint) {
        if (startPoint.x === snapX && startPoint.y === snapY) {
            setStatus('Ты выбрал ту же точку. Начни сначала 🔄');
            startPoint = null;
            render();
            return;
        }
        endPoint = { x: snapX, y: snapY };
        setStatus('Ура! Отрезок готов 🎉');
        addSegment(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
        actionHistory.push({
            type: 'segment',
            x1: startPoint.x, y1: startPoint.y,
            x2: endPoint.x, y2: endPoint.y
        });
        startPoint = null;
        endPoint = null;
        refreshPossiblePoints();
        render();
        refreshAllLogs();
        setStatus('Кликни в любое место, чтобы начать новый отрезок ✨');
        return;
    }

    startPoint = null;
    endPoint = null;
    render();
    setStatus('Начнём заново. Кликни, чтобы выбрать начало отрезка');
}

document.querySelectorAll('.point-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const label = btn.dataset.label;
        if (btn.disabled) return;
        if (btn.classList.contains('active')) {
            btn.classList.remove('active');
            setActivePointBtn(null);
            activeLabel = null;
            setStatus('Выбор точки отменён');
        } else {
            document.querySelectorAll('.point-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeLabel = label;
            setStatus('Выбрана точка ' + label + '. Кликни на холсте рядом с возможной точкой (Т1, Т2, ...).');
        }
    });
});

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
    setStatus('Всё стёрто! Кликни в любое место, чтобы начать 🧹');
    render();
}

function handleUndo() {
    if (startPoint) {
        startPoint = null;
        endPoint = null;
        setStatus('Начальная точка сброшена. Начни сначала 🔄');
        render();
        return;
    }
    if (actionHistory.length === 0) {
        setStatus('Нет действий для отмены 🙈');
        return;
    }
    const lastAction = actionHistory.pop();
    if (lastAction.type === 'point') {
        const removed = removeLastNamedPoint();
        if (removed) {
            removeLastNamedPointLog();
            enablePointBtn(removed.label);
            setStatus('Точка ' + removed.label + ' удалена ↩️');
            setActivePointBtn(null);
            activeLabel = null;
            render();
            refreshAllLogs();
        }
    } else if (lastAction.type === 'segment') {
        const removed = removeLastSegment();
        if (removed) {
            removeLastSegmentLog();
            refreshPossiblePoints();
            render();
            refreshAllLogs();
            setStatus('Последний отрезок удалён ↩️');
        }
    }
}

function handleCheck() {
    const analysis = performAnalysis();
    setAnalysis(analysis);
    setResult('Анализ завершён');
    setStatus('✅ Анализ обновлён');
}

function handleHint() {
    const { result, analysis } = getHintMessage(segments);
    setResult(result);
    setAnalysis(analysis);
    setStatus('💡 Подсказка обновлена');
}

function initHintTimer() {
    startHintTimer(2,
        (remaining) => {},
        () => { console.log('Подсказка доступна'); }
    );
}

onCanvasClick(handleCanvasClick);
onClearClick(handleClear);
onUndoClick(handleUndo);
onCheckClick(handleCheck);
onHintClick(handleHint);

render();
refreshPossiblePoints();
refreshAllLogs();

setStatus('🎨 <b>Как рисовать отрезок:</b><br>Кликни два раза на узлы сетки (начало и конец).<br><br>📍 <b>Как поставить точку:</b><br>Нажми кнопку с буквой (A–E), потом кликни<br>на нужное место рядом с Т1, Т2...');

initHintTimer();