// ===== drawing.js – главный модуль редактора (рисование, перетаскивание, удаление) =====
// Здесь собрана вся логика работы с холстом: обработка мыши, переключение инструментов,
// история действий для отмены, удаление отрезков и точек, автоматическая подстановка букв.

// Импортируем всё необходимое из других модулей
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
    // Функции управления инструментами и точками
    setPointerActive, setLineActive, setPointsActive, setEraserActive,
    resetTools, populatePointButtons
} from './ui.js';

console.log('🔧 drawing.js загружен');   // отладочное сообщение

// ======================= СОСТОЯНИЕ РЕДАКТОРА =======================
let startPoint = null;           // начало временного отрезка (при рисовании в режиме "Линия")
let endPoint = null;             // конец временного отрезка (для отображения пунктира)
let actionHistory = [];          // стек действий для кнопки "Отменить"
const MAX_HISTORY = 100;        // максимальная глубина стека (чтобы не переполнялась память)
let activeLabel = null;          // буква, выбранная в режиме "Точки" (если выбрана вручную)

// Перетаскивание (drag & drop)
let dragMode = 'none';           // 'none', 'point' (T-точка), 'segment' (целый отрезок), 'namedPoint'
let dragPoint = null;            // ссылка на перетаскиваемый объект (точка или отрезок)
let dragSegment = null;          // ссылка на перетаскиваемый отрезок (когда тянем его целиком)
let dragStartPos = null;         // начальная позиция мыши в координатах сетки
let originalSegmentCoords = null; // исходные координаты перетаскиваемого отрезка (для отката)
let dragOriginalSegmentStates = []; // копии состояний отрезков, затронутых перетаскиванием точки
let mouseDownPos = null;         // позиция мыши в момент нажатия (нужна, чтобы отличить клик от перетаскивания)
let isDragging = false;          // флаг, показывающий, что мышь двигалась с зажатой кнопкой

// Текущий инструмент: 'pointer' (указатель), 'line' (линия), 'point' (точки), 'eraser' (ластик)
let currentTool = 'line';        // по умолчанию активна "Линия"
let allowedLetters = [];         // буквы, доступные для текущего задания (из taskConfig)

// Подсветка при наведении ластика
let eraserHoverTarget = null;    // { type: 'segment'|'namedPoint', ref: объект }

// Радиусы захвата объектов мышью (в пикселях)
const POINT_GRAB_RADIUS = 12;    // для возможных и именованных точек
const SEGMENT_GRAB_RADIUS = 10;  // для отрезков

// ======================= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =======================

/**
 * Для заданных координат возвращает объект с T-идентификатором (T1, T2…) и буквой (A, B…),
 * если в этой точке стоит именованная точка. Используется для красивых подписей в логах.
 * @param {number} x – координата X
 * @param {number} y – координата Y
 * @returns {{tId: string, letter: string|null}}
 */
function getPointFullName(x, y) {
    let tId = '?';
    let letter = null;
    // Ищем среди возможных точек (T1, T2…)
    for (let pp of possiblePoints) {
        if (Math.abs(pp.x - x) < 1 && Math.abs(pp.y - y) < 1) { tId = pp.id; break; }
    }
    // Ищем среди именованных точек (A, B…)
    for (let np of namedPoints) {
        if (Math.abs(np.x - x) < 1 && Math.abs(np.y - y) < 1) { letter = np.label; break; }
    }
    return { tId, letter };
}

/**
 * Строит массив производных отрезков — частей исходных отрезков,
 * на которые они разбиваются точками пересечения. Нужно для отладки и анализа.
 * @returns {Array} – массив объектов {x1,y1,x2,y2, name1, name2}
 */
function getDerivedSegments() {
    try {
        const derived = [];
        if (!segments || !possiblePoints) return derived;
        for (let seg of segments) {
            const pts = [];
            // Собираем все возможные точки, лежащие на этом отрезке
            for (let p of possiblePoints) {
                if (isPointOnSegment(p, seg)) pts.push({x: p.x, y: p.y, id: p.id});
            }
            // Убираем дубликаты
            const uniq = [], seen = new Set();
            for (let p of pts) { const k = p.x+','+p.y; if (!seen.has(k)) { seen.add(k); uniq.push(p); } }
            // Сортируем точки вдоль отрезка по параметру t
            const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
            uniq.sort((a,b) => (dx!==0?(a.x-seg.x1)/dx:(a.y-seg.y1)/dy) - (dx!==0?(b.x-seg.x1)/dx:(b.y-seg.y1)/dy));
            // Формируем отрезки между соседними точками
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

/**
 * Проверяет, лежит ли точка p на отрезке seg (с допуском 2 пикселя).
 * @param {{x:number,y:number}} p – точка
 * @param {{x1,y1,x2,y2}} seg – отрезок
 * @returns {boolean}
 */
function isPointOnSegment(p, seg) {
    const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
    const len2 = dx*dx + dy*dy;
    if (len2 === 0) return Math.abs(p.x - seg.x1) < 1 && Math.abs(p.y - seg.y1) < 1; // отрезок-точка
    const t = ((p.x - seg.x1)*dx + (p.y - seg.y1)*dy) / len2;   // проекция на прямую
    if (t < -0.001 || t > 1.001) return false;                   // не попадает на отрезок
    const projX = seg.x1 + t*dx, projY = seg.y1 + t*dy;
    return Math.hypot(p.x - projX, p.y - projY) < 2;             // расстояние до прямой меньше 2 пикселей
}

/**
 * Вычисляет расстояние от точки (px,py) до отрезка seg.
 * Используется для определения, насколько близко курсор к отрезку.
 */
function distanceToSegment(px, py, seg) {
    const { x1, y1, x2, y2 } = seg;
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx*dx + dy*dy;
    if (len2 === 0) return Math.hypot(px - x1, py - y1);     // отрезок нулевой длины – расстояние до точки
    let t = ((px - x1)*dx + (py - y1)*dy) / len2;            // параметр проекции
    t = Math.max(0, Math.min(1, t));                         // ограничиваем [0,1], чтобы получить расстояние до отрезка, а не до прямой
    const projX = x1 + t*dx, projY = y1 + t*dy;
    return Math.hypot(px - projX, py - projY);
}

/**
 * Ищет ближайший отрезок к точке (px,py) в радиусе maxDist.
 * @returns {Object|null} – объект отрезка или null
 */
function findClosestSegment(px, py, maxDist = SEGMENT_GRAB_RADIUS) {
    let best = null, bestDist = Infinity;
    for (let seg of segments) {
        const dist = distanceToSegment(px, py, seg);
        if (dist < bestDist && dist <= maxDist) { bestDist = dist; best = seg; }
    }
    return best;
}

/**
 * Ищет ближайшую именованную точку (A, B…) в радиусе maxDist.
 * @returns {Object|null} – объект точки (с полями label, x, y) или null
 */
function findClosestNamedPoint(px, py, maxDist = 15) {
    let best = null, bestDist = Infinity;
    for (let np of namedPoints) {
        const dx = px - np.x, dy = py - np.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < bestDist && dist <= maxDist) { bestDist = dist; best = np; }
    }
    return best;
}

/**
 * Добавляет действие в историю и обрезает стек, если он слишком большой.
 * @param {Object} action – объект действия (тип и данные)
 */
function pushHistory(action) {
    actionHistory.push(action);
    if (actionHistory.length > MAX_HISTORY) actionHistory.shift(); // удаляем самое старое
}

/** Создаёт копию массива отрезков (для сохранения состояния перед перетаскиванием) */
function snapshotSegments() {
    return segments.map(seg => ({ ...seg }));
}

// ======================= ОТРИСОВКА =======================

/**
 * Главная функция отрисовки: очищает холст и рисует все элементы.
 */
function render() {
    if (!ctx) return;                          // если холст не готов – выходим
    ctx.clearRect(0, 0, W, H);                 // очищаем весь холст
    drawGrid();                                // рисуем сетку
    drawAllSegments();                         // все отрезки
    drawPossiblePoints();                      // возможные точки (крестики T1, T2…)
    drawNamedPoints();                         // именованные точки (буквы A, B…)
    drawTempSegment();                         // временный пунктирный отрезок (при рисовании)
    drawMarkers();                             // красные маркеры начала и конца временного отрезка

    // Подсветка красным при наведении ластика
    if (currentTool === 'eraser' && eraserHoverTarget) {
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        if (eraserHoverTarget.type === 'segment') {
            const seg = eraserHoverTarget.ref;
            ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2); ctx.stroke();
        } else if (eraserHoverTarget.type === 'namedPoint') {
            const np = eraserHoverTarget.ref;
            ctx.beginPath(); ctx.arc(np.x, np.y, 6, 0, 2*Math.PI); ctx.stroke();
        }
        ctx.restore();
    }
}

/** Рисует временный пунктирный отрезок между startPoint и endPoint */
function drawTempSegment() {
    if (startPoint && endPoint) {
        ctx.save();
        ctx.setLineDash([4, 4]);               // пунктирная линия
        ctx.strokeStyle = '#e67e22';           // оранжевый цвет
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
        ctx.restore();
    }
}

/** Рисует красные кружки в точках startPoint и endPoint */
function drawMarkers() {
    ctx.save();
    ctx.fillStyle = '#e74c3c';                 // красный цвет
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

/** Обновляет все логи в правой панели */
function refreshLogs() {
    updatePossiblePointLog(possiblePoints);
    updateSegmentLog(segments, getPointFullName);
    updateDerivedSegmentLog(getDerivedSegments());
}

// ======================= ОБРАБОТЧИКИ МЫШИ =======================

/**
 * Нажатие кнопки мыши на холсте.
 * Здесь определяется, что делать: удалить (ластик), поставить точку,
 * начать перетаскивание или (для линии) просто запомнить позицию.
 */
function onMouseDown(e) {
    const pos = getMousePos(e);                // переводим координаты мыши в координаты холста
    const px = pos.x, py = pos.y;
    mouseDownPos = { x: px, y: py };
    isDragging = false;                        // сбрасываем флаг перетаскивания

    // ---------- Ластик ----------
    if (currentTool === 'eraser') {
        // Приоритет у именованных точек – они удаляются первыми
        const np = findClosestNamedPoint(px, py, 15);
        if (np) { deleteNamedPoint(np); e.preventDefault(); return; }
        // Затем проверяем отрезки
        const seg = findClosestSegment(px, py, SEGMENT_GRAB_RADIUS);
        if (seg) { deleteSegmentWithPoints(seg); e.preventDefault(); return; }
        dragMode = 'none';
        return;
    }

    // ---------- Точки ----------
    if (currentTool === 'point') {
        const closestPoint = findClosestPossiblePoint(px, py, POINT_GRAB_RADIUS);
        if (closestPoint) {
            // Если буква не выбрана вручную – автоматически берём первую свободную
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
            disablePointBtn(activeLabel);      // делаем кнопку серой
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

    // ---------- Линия ----------
    // В режиме линии мы ничего не делаем при нажатии – построение произойдёт в mouseup
    if (currentTool === 'line') {
        dragMode = 'none';
        return;
    }

    // ---------- Указатель (перетаскивание) ----------
    if (currentTool === 'pointer') {
        // Проверяем возможную точку (T1, T2…)
        const closestPoint = findClosestPossiblePoint(px, py, POINT_GRAB_RADIUS);
        if (closestPoint) {
            dragMode = 'point';
            dragPoint = closestPoint;
            dragStartPos = { x: snapToGrid(px), y: snapToGrid(py) };
            // Сохраняем состояния всех отрезков, у которых конец совпадает с этой точкой
            dragOriginalSegmentStates = [];
            for (let seg of segments) {
                if ((Math.abs(seg.x1 - closestPoint.x) < 1 && Math.abs(seg.y1 - closestPoint.y) < 1) ||
                    (Math.abs(seg.x2 - closestPoint.x) < 1 && Math.abs(seg.y2 - closestPoint.y) < 1)) {
                    dragOriginalSegmentStates.push({
                        seg, x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2
                    });
                }
            }
            e.preventDefault(); return;
        }
        // Проверяем целый отрезок
        const closestSeg = findClosestSegment(px, py, SEGMENT_GRAB_RADIUS);
        if (closestSeg) {
            dragMode = 'segment';
            dragSegment = closestSeg;
            dragStartPos = { x: snapToGrid(px), y: snapToGrid(py) };
            originalSegmentCoords = { x1: closestSeg.x1, y1: closestSeg.y1, x2: closestSeg.x2, y2: closestSeg.y2 };
            e.preventDefault(); return;
        }
        // Проверяем именованную точку
        const np = findClosestNamedPoint(px, py, 15);
        if (np) {
            dragMode = 'namedPoint';
            dragPoint = np;
            dragStartPos = { x: snapToGrid(px), y: snapToGrid(py) };
            originalSegmentCoords = { x: np.x, y: np.y };
            e.preventDefault(); return;
        }
        dragMode = 'none';
    }
}

/**
 * Движение мыши с зажатой кнопкой.
 * Обрабатывает перетаскивание, а в режиме линии обновляет временный отрезок.
 */
function onMouseMove(e) {
    const pos = getMousePos(e);
    const px = pos.x, py = pos.y;

    // Для ластика обновляем подсветку объекта под курсором
    if (currentTool === 'eraser') {
        eraserHoverTarget = null;
        const np = findClosestNamedPoint(px, py, 15);
        if (np) { eraserHoverTarget = { type: 'namedPoint', ref: np }; }
        else {
            const seg = findClosestSegment(px, py, SEGMENT_GRAB_RADIUS);
            if (seg) eraserHoverTarget = { type: 'segment', ref: seg };
        }
        render();   // перерисовываем, чтобы показать/убрать красную обводку
        return;
    } else {
        eraserHoverTarget = null;
    }

    // Определяем, было ли движение мыши (если да, то это перетаскивание, а не клик)
    if (mouseDownPos && !isDragging) {
        const dx = px - mouseDownPos.x, dy = py - mouseDownPos.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging = true;
    }

    // --- Перетаскивание возможной точки ---
    if (dragMode === 'point' && dragPoint) {
        const snapX = snapToGrid(px), snapY = snapToGrid(py);
        // Двигаем концы всех затронутых отрезков
        for (let state of dragOriginalSegmentStates) {
            const seg = state.seg;
            if (Math.abs(seg.x1 - dragPoint.x) < 1 && Math.abs(seg.y1 - dragPoint.y) < 1) { seg.x1 = snapX; seg.y1 = snapY; }
            if (Math.abs(seg.x2 - dragPoint.x) < 1 && Math.abs(seg.y2 - dragPoint.y) < 1) { seg.x2 = snapX; seg.y2 = snapY; }
        }
        // Синхронно двигаем именованные точки, привязанные к этой T-точке
        for (let np of namedPoints) {
            if (Math.abs(np.x - dragPoint.x) < 1 && Math.abs(np.y - dragPoint.y) < 1) { np.x = snapX; np.y = snapY; }
        }
        dragPoint.x = snapX;
        dragPoint.y = snapY;
        updatePossiblePoints(segments);
        render(); refreshLogs();
    }
    // --- Перетаскивание целого отрезка ---
    else if (dragMode === 'segment' && dragSegment) {
        const snapX = snapToGrid(px), snapY = snapToGrid(py);
        const dx = snapX - dragStartPos.x, dy = snapY - dragStartPos.y;
        dragSegment.x1 = originalSegmentCoords.x1 + dx;
        dragSegment.y1 = originalSegmentCoords.y1 + dy;
        dragSegment.x2 = originalSegmentCoords.x2 + dx;
        dragSegment.y2 = originalSegmentCoords.y2 + dy;
        updatePossiblePoints(segments);
        render(); refreshLogs();
    }
    // --- Перетаскивание именованной точки ---
    else if (dragMode === 'namedPoint' && dragPoint) {
        const snapX = snapToGrid(px), snapY = snapToGrid(py);
        dragPoint.x = snapX;
        dragPoint.y = snapY;
        render(); refreshLogs();
    }

    // В режиме линии показываем временный отрезок от startPoint до текущей позиции
    if (startPoint && !endPoint && !isDragging && currentTool === 'line') {
        endPoint = { x: snapToGrid(px), y: snapToGrid(py) };
        render();
    }
}

/**
 * Отпускание кнопки мыши.
 * Завершает перетаскивание или построение отрезка.
 */
function onMouseUp(e) {
    const pos = getMousePos(e);
    const px = pos.x, py = pos.y;

    if (currentTool === 'eraser') { dragMode = 'none'; return; }

    // --- Завершение перетаскивания ---
    if (isDragging) {
        if (dragMode === 'point') {
            // Проверяем, не схлопнулся ли какой-нибудь отрезок в точку
            let hasDegenerate = false;
            for (let state of dragOriginalSegmentStates) {
                const seg = state.seg;
                if (Math.abs(seg.x1 - seg.x2) < 1 && Math.abs(seg.y1 - seg.y2) < 1) {
                    hasDegenerate = true; break;
                }
            }
            if (hasDegenerate) {
                // Откатываем все затронутые отрезки
                for (let state of dragOriginalSegmentStates) {
                    state.seg.x1 = state.x1; state.seg.y1 = state.y1;
                    state.seg.x2 = state.x2; state.seg.y2 = state.y2;
                }
                updatePossiblePoints(segments); render(); refreshLogs();
                setStatus('Нельзя схлопнуть отрезок в точку');
            } else {
                pushHistory({ type: 'move', oldSegments: snapshotSegments(), newSegments: snapshotSegments() });
            }
        } else if (dragMode === 'segment') {
            if (Math.abs(dragSegment.x1 - dragSegment.x2) < 1 && Math.abs(dragSegment.y1 - dragSegment.y2) < 1) {
                // Откат перемещения отрезка, ставшего точкой
                dragSegment.x1 = originalSegmentCoords.x1; dragSegment.y1 = originalSegmentCoords.y1;
                dragSegment.x2 = originalSegmentCoords.x2; dragSegment.y2 = originalSegmentCoords.y2;
                updatePossiblePoints(segments); render(); refreshLogs();
                setStatus('Нельзя схлопнуть отрезок в точку');
            } else {
                pushHistory({ type: 'move', oldSegments: snapshotSegments(), newSegments: snapshotSegments() });
            }
        } else if (dragMode === 'namedPoint') {
            pushHistory({ type: 'moveNamedPoint', label: dragPoint.label, oldX: originalSegmentCoords.x, oldY: originalSegmentCoords.y, newX: dragPoint.x, newY: dragPoint.y });
        }
        // Сбрасываем состояние перетаскивания
        dragMode = 'none'; dragPoint = null; dragSegment = null;
        dragStartPos = null; originalSegmentCoords = null; dragOriginalSegmentStates = [];
        isDragging = false; mouseDownPos = null;
        if (typeof onDrawingChanged === 'function') onDrawingChanged();
        render(); refreshLogs();
        return;
    }

    // --- Завершение построения отрезка (режим "Линия") ---
    if (currentTool === 'line' && dragMode === 'none') {
        handleCanvasClickAt(px, py);
    }

    // Сброс после клика
    dragMode = 'none'; dragPoint = null; dragSegment = null;
    dragStartPos = null; originalSegmentCoords = null; dragOriginalSegmentStates = [];
    isDragging = false; mouseDownPos = null;
}

/**
 * Обрабатывает клик в режиме "Линия": первый клик – начало отрезка, второй – конец.
 * @param {number} px – координата X курсора (в пикселях холста)
 * @param {number} py – координата Y курсора
 */
function handleCanvasClickAt(px, py) {
    if (currentTool !== 'line') return;     // реагируем только в режиме линии
    const snapX = snapToGrid(px), snapY = snapToGrid(py);
    if (!isInsideCanvas(snapX, snapY)) { setStatus('Кликни внутри поля'); return; }

    if (!startPoint) {
        // Первый клик – запоминаем начало
        startPoint = { x: snapX, y: snapY };
        endPoint = null;
        setStatus('Теперь кликни, чтобы выбрать конец отрезка ✏️');
        render();
    } else {
        // Второй клик – завершаем отрезок
        if (startPoint.x === snapX && startPoint.y === snapY) {
            setStatus('Ты выбрал ту же точку. Начни сначала.');
            startPoint = null; endPoint = null;
            render();
            return;
        }
        const finalEnd = { x: snapX, y: snapY };
        addSegment(startPoint.x, startPoint.y, finalEnd.x, finalEnd.y);
        pushHistory({ type: 'add', segment: { x1: startPoint.x, y1: startPoint.y, x2: finalEnd.x, y2: finalEnd.y } });
        startPoint = null; endPoint = null;
        updatePossiblePoints(segments);
        render(); refreshLogs();
        if (typeof onDrawingChanged === 'function') onDrawingChanged();
        setStatus('Отрезок готов!');
    }
}

// ======================= УДАЛЕНИЕ ОБЪЕКТОВ =======================

/**
 * Удаляет отрезок И все именованные точки, которые стояли на его концах.
 * @param {Object} seg – объект отрезка {x1,y1,x2,y2}
 */
function deleteSegmentWithPoints(seg) {
    // Сначала собираем точки для удаления (чтобы не модифицировать массив во время итерации)
    const toRemove = [];
    for (let np of namedPoints) {
        if ((Math.abs(np.x - seg.x1) < 1 && Math.abs(np.y - seg.y1) < 1) ||
            (Math.abs(np.x - seg.x2) < 1 && Math.abs(np.y - seg.y2) < 1)) {
            toRemove.push(np);
        }
    }
    // Удаляем все найденные именованные точки
    for (let np of toRemove) deleteNamedPoint(np);
    // Теперь удаляем сам отрезок
    pushHistory({ type: 'delete', segment: { ...seg } });
    const index = segments.indexOf(seg);
    if (index !== -1) {
        segments.splice(index, 1);
        updatePossiblePoints(segments); render(); refreshLogs();
        if (typeof onDrawingChanged === 'function') onDrawingChanged();
        setStatus('Отрезок удалён');
    }
}

/**
 * Удаляет одну именованную точку (используется и ластиком, и при удалении отрезка).
 * @param {Object} np – объект точки {label, x, y}
 */
function deleteNamedPoint(np) {
    pushHistory({ type: 'deleteNamedPoint', point: { ...np } });
    const index = namedPoints.indexOf(np);
    if (index !== -1) {
        namedPoints.splice(index, 1);
        enablePointBtn(np.label);          // разблокируем кнопку буквы
        render(); refreshLogs();
        if (typeof onDrawingChanged === 'function') onDrawingChanged();
        setStatus('Точка ' + np.label + ' удалена');
    }
}

// ======================= ПУБЛИЧНЫЕ МЕТОДЫ (ЭКСПОРТЫ) =======================

/**
 * Переключает активный инструмент.
 * @param {string} tool – 'pointer', 'line', 'point', 'eraser'
 */
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

/** Возвращает текущий инструмент (нужно для main.js, чтобы обрабатывать повторные клики) */
export function getCurrentTool() {
    return currentTool;
}

/**
 * Настраивает кнопки точек для текущего задания.
 * @param {string[]} letters – массив букв (например ['A','B','C','D'])
 */
export function setAllowedLetters(letters) {
    allowedLetters = letters;
    populatePointButtons(letters);
    activeLabel = null;
    setActivePointBtn(null);
    resetAllButtons();
    // Вешаем обработчики на новые кнопки
    document.querySelectorAll('.point-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentTool !== 'point') return;
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
                setStatus('Выбрана точка ' + label + '. Кликните рядом с возможной точкой.');
            }
        });
    });
}

/** Навешивает обработчики мыши на холст */
export function attachEvents() {
    if (!canvas) return;
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
}

/** Снимает обработчики мыши (при переключении задания) */
export function detachEvents() {
    if (!canvas) return;
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseup', onMouseUp);
}

/** Полностью очищает холст и историю действий */
export function clearDrawing() {
    clearSegments();
    clearNamedPoints();
    clearPossiblePoints();
    clearSegmentLog();
    clearNamedPointLog();
    clearAnalysis();
    updatePossiblePointLog([]);
    startPoint = null; endPoint = null;
    actionHistory = [];
    activeLabel = null;
    eraserHoverTarget = null;
    resetAllButtons();
    setActivePointBtn(null);
    if (typeof onDrawingChanged === 'function') onDrawingChanged();
    setTool('pointer');
    render();
}

/**
 * Отменяет последнее действие (отрезок, точку, перемещение).
 * Поддерживает типы действий: 'add', 'delete', 'addNamedPoint', 'deleteNamedPoint', 'move', 'moveNamedPoint'.
 */
export function undoLastAction() {
    // Если был начат отрезок, просто сбрасываем его
    if (startPoint) { startPoint = null; endPoint = null; setStatus('Сброшено'); render(); return; }
    if (!actionHistory.length) { setStatus('Нет действий для отмены'); return; }
    const last = actionHistory.pop();

    if (last.type === 'add') {
        // Удаляем последний добавленный отрезок
        const removed = segments.pop();
        if (removed) { updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Отрезок удалён (отмена)'); }
    } else if (last.type === 'delete') {
        // Восстанавливаем удалённый отрезок
        segments.push(last.segment);
        updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Отрезок восстановлен (отмена)');
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
        namedPoints.push(last.point);
        disablePointBtn(last.point.label);
        render(); refreshLogs(); setStatus('Точка ' + last.point.label + ' восстановлена');
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

/** Возвращает текущий массив отрезков */
export function getSegments() { return segments; }

/** Колбэк, вызываемый при любом изменении холста (для сохранения состояния) */
export let onDrawingChanged = null;
export function setOnDrawingChanged(callback) { onDrawingChanged = callback; }

/** Перерисовывает холст (например, после восстановления состояния) */
export function redraw() {
    updatePossiblePoints(segments);
    render();
    refreshLogs();
}