import { ctx } from './canvas.js';

// Массив отрезков [{x1, y1, x2, y2}, ...]
export let segments = [];

/**
 * Добавляет новый отрезок.
 * @param {number} x1, y1 – координаты начала
 * @param {number} x2, y2 – координаты конца
 */
export function addSegment(x1, y1, x2, y2) {
    segments.push({ x1, y1, x2, y2 });
    console.log('Добавлен отрезок: (' + x1 + ',' + y1 + ') → (' + x2 + ',' + y2 + ')');
}

/**
 * Удаляет последний добавленный отрезок (отмена действия).
 * @returns {Object|null} удалённый отрезок или null, если массив пуст
 */
export function removeLastSegment() {
    if (segments.length > 0) {
        const removed = segments.pop();
        console.log('Удалён отрезок: (' + removed.x1 + ',' + removed.y1 + ') → (' + removed.x2 + ',' + removed.y2 + ')');
        return removed;
    }
    return null;
}

/**
 * Очищает массив отрезков полностью.
 */
export function clearSegments() {
    segments = [];
    console.log('Все отрезки очищены');
}

/**
 * Рисует все отрезки на холсте (тёмно-синие линии толщиной 2px).
 */
export function drawAllSegments() {
    ctx.save();
    ctx.strokeStyle = '#2c3e50';  // тёмно-синий цвет
    ctx.lineWidth = 2;
    for (let seg of segments) {
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
    }
    ctx.restore();
}