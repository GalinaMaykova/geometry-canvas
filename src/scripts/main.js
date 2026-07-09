// Импорты из других модулей
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
    // импорт всех UI-функций и элементов
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
import { getHintMessage } from './hints.js';  // функция подсказки

console.log('🚀 main.js загружен!');  // отладочное сообщение

// Переменные для построения временного отрезка
let startPoint = null;  // начальная точка (когда пользователь делает первый клик)
let endPoint = null;    // конечная точка (второй клик)
let actionHistory = []; // история действий для отмены (стек)
let activeLabel = null; // какая буква сейчас активна (выбрана кнопкой)

// ---- Вспомогательные функции для получения имён точек по координатам ----

/**
 * Возвращает имя точки (букву, если есть, или T-идентификатор) по координатам.
 * Используется в старых местах, где нужен просто идентификатор.
 */
function getPointNameByCoord(x, y, tol = 1) {
    // сначала ищем среди именованных точек
    for (let np of namedPoints) {
        if (Math.abs(np.x - x) < tol && Math.abs(np.y - y) < tol) {
            return np.label;
        }
    }
    // затем среди возможных
    for (let pp of possiblePoints) {
        if (Math.abs(pp.x - x) < tol && Math.abs(pp.y - y) < tol) {
            return pp.id;
        }
    }
    return '?';
}

/**
 * Возвращает объект с T-идентификатором и буквой (если есть) для координат.
 * Используется для красивых подписей в логах.
 */
function getPointFullName(x, y) {
    let tId = '?';
    let letter = null;
    // ищем T-идентификатор
    for (let pp of possiblePoints) {
        if (Math.abs(pp.x - x) < 1 && Math.abs(pp.y - y) < 1) {
            tId = pp.id;
            break;
        }
    }
    // ищем букву
    for (let np of namedPoints) {
        if (Math.abs(np.x - x) < 1 && Math.abs(np.y - y) < 1) {
            letter = np.label;
            break;
        }
    }
    return { tId, letter };
}

/**
 * Проверяет, лежит ли точка (p) на отрезке seg (с допуском 2 пикселя).
 */
function isPointOnSegment(p, seg) {
    const { x1, y1, x2, y2 } = seg;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx*dx + dy*dy;         // квадрат длины отрезка
    if (lengthSq === 0) return Math.abs(p.x - x1) < 1 && Math.abs(p.y - y1) < 1; // отрезок-точка
    // Параметр проекции t
    const t = ((p.x - x1)*dx + (p.y - y1)*dy) / lengthSq;
    if (t < -0.001 || t > 1.001) return false; // не попадает на отрезок
    const projX = x1 + t*dx;
    const projY = y1 + t*dy;
    const dist = Math.sqrt((p.x - projX)*(p.x - projX) + (p.y - projY)*(p.y - projY));
    return dist < 2; // допуск 2 пикселя
}

/**
 * Строит список производных отрезков – частей исходных отрезков, на которые они разбиваются точками пересечения.
 * Каждый элемент: { x1, y1, x2, y2, name1, name2 }
 */
function getDerivedSegments() {
    try {
        const derived = [];
        if (!segments || !possiblePoints) return derived;
        for (let seg of segments) {
            const pointsOnSeg = [];
            // собираем все возможные точки, лежащие на этом отрезке
            for (let p of possiblePoints) {
                if (isPointOnSegment(p, seg)) {
                    pointsOnSeg.push({ x: p.x, y: p.y, id: p.id });
                }
            }
            // убираем дубликаты
            const unique = [];
            const seen = new Set();
            for (let p of pointsOnSeg) {
                const key = p.x + ',' + p.y;
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(p);
                }
            }
            // сортируем точки вдоль отрезка
            const dx = seg.x2 - seg.x1;
            const dy = seg.y2 - seg.y1;
            unique.sort((a, b) => {
                const tA = (dx !== 0) ? (a.x - seg.x1) / dx : (a.y - seg.y1) / dy;
                const tB = (dx !== 0) ? (b.x - seg.x1) / dx : (b.y - seg.y1) / dy;
                return tA - tB;
            });
            // формируем отрезки между соседними точками
            for (let i = 0; i < unique.length - 1; i++) {
                const p1 = unique[i];
                const p2 = unique[i+1];
                const full1 = getPointFullName(p1.x, p1.y);
                const full2 = getPointFullName(p2.x, p2.y);
                // имя с буквой, если есть
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

// ---- Геометрические вычисления для анализа ----

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

/**
 * Выполняет полный анализ чертежа и возвращает список строк.
 */
function performAnalysis() {
    const lines = [];
    const derived = getDerivedSegments();

    // 1. Пересекающиеся отрезки (пары)
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
    lines.push(intersecting.length > 0 ? '✅ Пересекающиеся отрезки: ' + intersecting.join(', ') : '❌ Пересекающихся отрезков нет');

    // 2. Равные отрезки (допуск 1 пиксель)
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
            const names = group.map(idx => getPointFullName(segments[idx].x1, segments[idx].y1).tId + getPointFullName(segments[idx].x2, segments[idx].y2).tId);
            equalGroups.push(names.join(', ') + ' (длина ' + lenI.toFixed(1) + ')');
        }
    }
    lines.push(equalGroups.length > 0 ? '✅ Равные отрезки: ' + equalGroups.join('; ') : '❌ Равных отрезков нет');

    // 3. Углы (на основе производных отрезков)
    const angleSet = new Set();
    for (let p of possiblePoints) {
        const incident = derived.filter(s => (Math.abs(s.x1 - p.x) < 1 && Math.abs(s.y1 - p.y) < 1) || (Math.abs(s.x2 - p.x) < 1 && Math.abs(s.y2 - p.y) < 1));
        for (let i = 0; i < incident.length; i++) {
            for (let j = i+1; j < incident.length; j++) {
                const s1 = incident[i], s2 = incident[j];
                const v1 = (Math.abs(s1.x1 - p.x) < 1 && Math.abs(s1.y1 - p.y) < 1) ? {x: s1.x2, y: s1.y2} : {x: s1.x1, y: s1.y1};
                const v2 = (Math.abs(s2.x1 - p.x) < 1 && Math.abs(s2.y1 - p.y) < 1) ? {x: s2.x2, y: s2.y2} : {x: s2.x1, y: s2.y1};
                const name1 = getPointFullName(v1.x, v1.y).tId;
                const name2 = getPointFullName(v2.x, v2.y).tId;
                const centerName = getPointFullName(p.x, p.y).tId;
                const ang = angleBetweenSegments({x1: p.x, y1: p.y, x2: v1.x, y2: v1.y}, {x1: p.x, y1: p.y, x2: v2.x, y2: v2.y});
                const key = centerName + '|' + [name1, name2].sort().join('|');
                if (!angleSet.has(key)) {
                    angleSet.add(key);
                    lines.push('📐 Угол <' + name1 + centerName + name2 + ' = ' + ang.toFixed(1) + '°');
                }
            }
        }
    }
    if (angleSet.size === 0) lines.push('❌ Углы не обнаружены');

    // 4. Общие точки (инцидентность >1)
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
    lines.push(commonPoints.length > 0 ? '✅ Общие точки: ' + commonPoints.join(', ') : '❌ Общих точек нет');

    // 5. Параллельные отрезки
    const parallelPairs = [];
    for (let i = 0; i < segments.length; i++) {
        for (let j = i+1; j < segments.length; j++) {
            if (isParallel(segments[i], segments[j])) {
                const n1 = getPointFullName(segments[i].x1, segments[i].y1).tId + getPointFullName(segments[i].x2, segments[i].y2).tId;
                const n2 = getPointFullName(segments[j].x1, segments[j].y1).tId + getPointFullName(segments[j].x2, segments[j].y2).tId;
                parallelPairs.push(n1 + ' || ' + n2);
            }
        }
    }
    lines.push(parallelPairs.length > 0 ? '✅ Параллельные отрезки: ' + parallelPairs.join(', ') : '❌ Параллельных отрезков нет');

    // 6. Перпендикулярные (90°)
    const perpPairs = [];
    for (let i = 0; i < segments.length; i++) {
        for (let j = i+1; j < segments.length; j++) {
            const ang = angleBetweenSegments(segments[i], segments[j]);
            if (Math.abs(ang - 90) < 0.1) {
                const n1 = getPointFullName(segments[i].x1, segments[i].y1).tId + getPointFullName(segments[i].x2, segments[i].y2).tId;
                const n2 = getPointFullName(segments[j].x1, segments[j].y1).tId + getPointFullName(segments[j].x2, segments[j].y2).tId;
                perpPairs.push(n1 + ' ⊥ ' + n2);
            }
        }
    }
    lines.push(perpPairs.length > 0 ? '✅ Перпендикулярные отрезки (90°): ' + perpPairs.join(', ') : '❌ Перпендикулярных отрезков (90°) нет');

    // 7. Примерно перпендикулярные (85°–95°)
    const approxPerpPairs = [];
    for (let i = 0; i < segments.length; i++) {
        for (let j = i+1; j < segments.length; j++) {
            const ang = angleBetweenSegments(segments[i], segments[j]);
            if (ang >= 85 && ang <= 95) {
                const n1 = getPointFullName(segments[i].x1, segments[i].y1).tId + getPointFullName(segments[i].x2, segments[i].y2).tId;
                const n2 = getPointFullName(segments[j].x1, segments[j].y1).tId + getPointFullName(segments[j].x2, segments[j].y2).tId;
                approxPerpPairs.push(n1 + ' ∠ ' + n2 + ' (' + ang.toFixed(1) + '°)');
            }
        }
    }
    lines.push(approxPerpPairs.length > 0 ? '✅ Примерно перпендикулярные отрезки (85°–95°): ' + approxPerpPairs.join(', ') : '❌ Примерно перпендикулярных отрезков (85°–95°) нет');

    return lines;
}

/** Вычисление точки пересечения (дубликат для анализа, чтобы не импортировать) */
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

// ---- Отрисовка всего холста ----
function render() {
    ctx.clearRect(0, 0, W, H);  // очищаем холст
    drawGrid();                 // рисуем сетку
    drawAllSegments();          // все отрезки
    drawPossiblePoints();       // возможные точки (крестики)
    drawNamedPoints();          // именованные точки (кружки)
    drawTempSegment();          // временный отрезок (если строится)
    drawMarkers();              // маркеры начала и конца временного отрезка
}

/** Рисует временный отрезок (когда пользователь делает второй клик) */
function drawTempSegment() {
    if (startPoint && endPoint) {
        ctx.save();
        ctx.setLineDash([4, 4]);      // пунктир
        ctx.strokeStyle = '#e67e22';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
        ctx.restore();
    }
}

/** Рисует красные маркеры начальной и конечной точек временного отрезка */
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

// Обновление возможных точек и их лога
function refreshPossiblePoints() {
    updatePossiblePoints(segments);
    updatePossiblePointLog(possiblePoints);
}

// Обновление всех логов (отрезки, производные)
function refreshAllLogs() {
    updateSegmentLog(segments, getPointFullName);
    let derived = [];
    try {
        const result = getDerivedSegments();
        if (Array.isArray(result)) derived = result;
    } catch (e) { console.error('Ошибка в refreshAllLogs:', e); }
    updateDerivedSegmentLog(derived);
}

// ---- Главный обработчик клика по холсту ----
function handleCanvasClick(e) {
    const pos = getMousePos(e);  // координаты клика на холсте
    const x = pos.x, y = pos.y;

    // Если активна кнопка буквы (ставим именованную точку)
    const activeBtn = getActivePointBtn();
    if (activeBtn) {
        const label = activeBtn.dataset.label;
        // проверяем, не стоит ли уже такая точка
        if (namedPoints.some(p => p.label === label)) {
            setStatus('Точка ' + label + ' уже стоит! Выбери другую кнопку.');
            return;
        }
        // ищем ближайшую возможную точку
        const closest = findClosestPossiblePoint(x, y, 30);
        if (!closest) {
            setStatus('Рядом нет возможной точки (Т1, Т2, ...). Попробуй ещё раз.');
            return;
        }
        // добавляем точку, обновляем логи и кнопки
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

    // Иначе строим отрезок
    const snapX = snapToGrid(x);  // привязываемся к узлам сетки
    const snapY = snapToGrid(y);
    if (!isInsideCanvas(snapX, snapY)) {
        setStatus('Кликни внутри серого поля 😊');
        return;
    }

    // Первый клик – запоминаем начало
    if (!startPoint) {
        startPoint = { x: snapX, y: snapY };
        setStatus('Отлично! Теперь кликни в любое место, чтобы выбрать конец отрезка ✏️');
        render();
        return;
    }

    // Второй клик – фиксируем конец и создаём отрезок
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
        actionHistory.push({ type: 'segment', x1: startPoint.x, y1: startPoint.y, x2: endPoint.x, y2: endPoint.y });
        startPoint = null;
        endPoint = null;
        refreshPossiblePoints();
        render();
        refreshAllLogs();
        setStatus('Кликни в любое место, чтобы начать новый отрезок ✨');
        return;
    }

    // Если что-то пошло не так – сбрасываем
    startPoint = null;
    endPoint = null;
    render();
    setStatus('Начнём заново. Кликни, чтобы выбрать начало отрезка');
}

// ---- Кнопки выбора букв (A-E) ----
document.querySelectorAll('.point-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const label = btn.dataset.label;
        if (btn.disabled) return;
        if (btn.classList.contains('active')) {
            // если уже активна – отменяем выбор
            btn.classList.remove('active');
            setActivePointBtn(null);
            activeLabel = null;
            setStatus('Выбор точки отменён');
        } else {
            // иначе делаем эту кнопку активной
            document.querySelectorAll('.point-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeLabel = label;
            setStatus('Выбрана точка ' + label + '. Кликни на холсте рядом с возможной точкой (Т1, Т2, ...).');
        }
    });
});

// ---- Обработчики основных кнопок ----
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
    // если строили временный отрезок – сбрасываем его
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
    startHintTimer(2,   // 2 секунды задержки перед активацией
        () => {},
        () => { console.log('Подсказка доступна'); }
    );
}

// ---- Привязка обработчиков и первый запуск ----
onCanvasClick(handleCanvasClick);
onClearClick(handleClear);
onUndoClick(handleUndo);
onCheckClick(handleCheck);
onHintClick(handleHint);

render();                 // первая отрисовка
refreshPossiblePoints();
refreshAllLogs();

setStatus('🎨 <b>Как рисовать отрезок:</b><br>Кликни два раза на узлы сетки (начало и конец).<br><br>📍 <b>Как поставить точку:</b><br>Нажми кнопку с буквой (A–E), потом кликни<br>на нужное место рядом с Т1, Т2...');

initHintTimer();          // запускаем таймер подсказки