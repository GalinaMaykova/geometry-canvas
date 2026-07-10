import { ctx } from './canvas.js';

// Массив возможных точек (генерируются автоматически из концов отрезков и пересечений)
export let possiblePoints = [];
// Счётчик для генерации имён T1, T2, T3...
let nextId = 1;

/** Очищает список возможных точек и сбрасывает счётчик */
export function clearPossiblePoints() {
    possiblePoints = [];
    nextId = 1;
}

/**
 * Добавляет точку, если рядом (в пределах tolerance) нет уже существующей.
 * Это предотвращает появление дубликатов.
 * @param {number} x – координата X
 * @param {number} y – координата Y
 * @param {number} [tolerance=1] – допустимая разница координат
 */
function addPossiblePoint(x, y, tolerance = 1) {
    for (let p of possiblePoints) {
        // если рядом есть точка – выходим
        if (Math.abs(p.x - x) < tolerance && Math.abs(p.y - y) < tolerance) return;
    }
    // иначе добавляем новую с именем T1, T2...
    possiblePoints.push({ id: 'T' + nextId, x, y });
    nextId++;
}

/**
 * Перестраивает список возможных точек на основе текущих отрезков.
 * Собирает концы всех отрезков и точки их пересечения.
 * @param {Array} segments – массив отрезков [{x1,y1,x2,y2}, ...]
 */
export function updatePossiblePoints(segments) {
    clearPossiblePoints();
    // Добавляем концы отрезков
    for (let seg of segments) {
        addPossiblePoint(seg.x1, seg.y1);
        addPossiblePoint(seg.x2, seg.y2);
    }
    // Добавляем точки пересечения каждой пары отрезков
    for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
            const p = segmentIntersection(segments[i], segments[j]);
            if (p) addPossiblePoint(p.x, p.y);
        }
    }
    // Сортируем по номеру (T1, T2...), чтобы отображались по порядку
    possiblePoints.sort((a, b) => parseInt(a.id.slice(1)) - parseInt(b.id.slice(1)));
}

/**
 * Вычисляет точку пересечения двух отрезков.
 * Возвращает объект {x, y} или null, если отрезки не пересекаются.
 */
function segmentIntersection(s1, s2) {
    const x1 = s1.x1, y1 = s1.y1, x2 = s1.x2, y2 = s1.y2;
    const x3 = s2.x1, y3 = s2.y1, x4 = s2.x2, y4 = s2.y2;
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;   // параллельны или совпадают
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    // Если t и u в диапазоне [0,1], отрезки пересекаются
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
    }
    return null;
}

/**
 * Ищет ближайшую возможную точку в радиусе maxDist от заданных координат.
 * @param {number} x – координата X курсора
 * @param {number} y – координата Y курсора
 * @param {number} [maxDist=25] – максимальное расстояние поиска
 * @returns {Object|null} – ближайшая точка (с полями id, x, y) или null
 */
export function findClosestPossiblePoint(x, y, maxDist = 25) {
    let best = null, bestDist = Infinity;
    for (let p of possiblePoints) {
        const dx = p.x - x, dy = p.y - y;
        const dist = Math.sqrt(dx*dx + dy*dy);   // евклидово расстояние
        if (dist < bestDist && dist <= maxDist) {
            bestDist = dist;
            best = p;
        }
    }
    return best;
}

/**
 * Рисует все возможные точки (крестики) и подписывает их имена (T1, T2...).
 */
export function drawPossiblePoints() {
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = '#aaa';   // серый цвет
    ctx.lineWidth = 1;
    for (let p of possiblePoints) {
        const s = 4;   // половинная длина линии крестика
        ctx.beginPath();
        ctx.moveTo(p.x - s, p.y - s); ctx.lineTo(p.x + s, p.y + s);
        ctx.moveTo(p.x + s, p.y - s); ctx.lineTo(p.x - s, p.y + s);
        ctx.stroke();
        // Подпись T1, T2...
        ctx.fillStyle = '#888';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(p.id, p.x + 6, p.y - 2);
    }
    ctx.restore();
}