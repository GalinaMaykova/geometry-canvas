// Импортируем контекст (нужен для рисования возможных точек)
import { ctx } from './canvas.js';

// Массив возможных точек (каждая имеет поля id, x, y)
export let possiblePoints = [];
// Счётчик для автоматической нумерации T1, T2, ...
let nextId = 1;

/**
 * Очищает список возможных точек и сбрасывает счётчик.
 */
export function clearPossiblePoints() {
    possiblePoints = [];
    nextId = 1;
}

/**
 * Добавляет новую возможную точку, если рядом нет уже существующей (проверка по допуску tolerance).
 * @param {number} x – координата X
 * @param {number} y – координата Y
 * @param {number} [tolerance=1] – допустимое расстояние (по X и Y) до существующей точки
 */
function addPossiblePoint(x, y, tolerance = 1) {
    // Проверяем, есть ли уже точка с такими координатами (с учётом допуска)
    for (let p of possiblePoints) {
        if (Math.abs(p.x - x) < tolerance && Math.abs(p.y - y) < tolerance) {
            return; // если есть – не добавляем
        }
    }
    // Добавляем новую точку с идентификатором T1, T2, ...
    possiblePoints.push({ id: 'T' + nextId, x, y });
    nextId++; // увеличиваем счётчик для следующей точки
}

/**
 * Перестраивает список возможных точек на основе концов отрезков и их пересечений.
 * Вызывается каждый раз, когда отрезки добавляются или удаляются.
 * @param {Array} segments – массив отрезков [{x1,y1,x2,y2}, ...]
 */
export function updatePossiblePoints(segments) {
    clearPossiblePoints(); // очищаем старый список

    // Добавляем концы всех отрезков как возможные точки
    for (let seg of segments) {
        addPossiblePoint(seg.x1, seg.y1);
        addPossiblePoint(seg.x2, seg.y2);
    }

    // Проверяем каждую пару отрезков на пересечение
    for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
            const p = segmentIntersection(segments[i], segments[j]); // вычисляем точку пересечения
            if (p) {
                addPossiblePoint(p.x, p.y); // если пересекаются, добавляем точку пересечения
            }
        }
    }

    // Сортируем точки по их номеру (T1, T2, T3...)
    possiblePoints.sort((a, b) => parseInt(a.id.slice(1)) - parseInt(b.id.slice(1)));
}

/**
 * Вычисляет точку пересечения двух отрезков, если она есть.
 * Используется математический метод через параметры t и u.
 * @param {Object} s1 – первый отрезок {x1,y1,x2,y2}
 * @param {Object} s2 – второй отрезок
 * @returns {Object|null} {x, y} или null, если отрезки не пересекаются
 */
function segmentIntersection(s1, s2) {
    const x1 = s1.x1, y1 = s1.y1, x2 = s1.x2, y2 = s1.y2;
    const x3 = s2.x1, y3 = s2.y1, x4 = s2.x2, y4 = s2.y2;

    // Знаменатель формулы
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    // Если знаменатель близок к нулю – отрезки параллельны
    if (Math.abs(denom) < 1e-10) return null;

    // Параметр t для первого отрезка
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    // Параметр u для второго отрезка
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    // Если оба параметра в пределах [0, 1], то отрезки пересекаются
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        // Вычисляем координаты точки пересечения
        return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
    }
    return null;
}

/**
 * Ищет ближайшую возможную точку в радиусе maxDist от заданных координат.
 * Используется при клике, чтобы привязать именованную точку к ближайшему узлу.
 * @param {number} x – координата X клика
 * @param {number} y – координата Y клика
 * @param {number} [maxDist=25] – максимальное расстояние поиска
 * @returns {Object|null} ближайшая точка или null
 */
export function findClosestPossiblePoint(x, y, maxDist = 25) {
    let best = null, bestDist = Infinity;
    for (let p of possiblePoints) {
        const dx = p.x - x, dy = p.y - y;
        const dist = Math.sqrt(dx*dx + dy*dy); // евклидово расстояние
        if (dist < bestDist && dist <= maxDist) {
            bestDist = dist;
            best = p;
        }
    }
    return best;
}

/**
 * Рисует все возможные точки (крестики) и подписывает их идентификаторы (T1, T2...).
 */
export function drawPossiblePoints() {
    ctx.save();
    ctx.strokeStyle = '#aaa';  // серый цвет для крестика
    ctx.lineWidth = 1;
    for (let p of possiblePoints) {
        const s = 4; // половинная длина линии крестика
        // Рисуем крестик (две пересекающиеся линии)
        ctx.beginPath();
        ctx.moveTo(p.x - s, p.y - s);
        ctx.lineTo(p.x + s, p.y + s);
        ctx.moveTo(p.x + s, p.y - s);
        ctx.lineTo(p.x - s, p.y + s);
        ctx.stroke();

        // Подписываем точку (например, T1, T2...)
        ctx.fillStyle = '#888';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(p.id, p.x + 6, p.y - 2);
    }
    ctx.restore();
}