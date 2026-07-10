import { ctx } from './canvas.js';

// Массив отрезков, которые нарисовал пользователь
export let segments = [];

/**
 * Добавляет новый отрезок.
 * @param {number} x1, y1 – координаты начала
 * @param {number} x2, y2 – координаты конца
 */
export function addSegment(x1, y1, x2, y2) {
    segments.push({ x1, y1, x2, y2 });
}

/**
 * Удаляет последний добавленный отрезок (для отмены).
 * @returns {Object|null} – удалённый отрезок или null, если массив пуст
 */
export function removeLastSegment() {
    return segments.length > 0 ? segments.pop() : null;
}

/** Очищает все отрезки */
export function clearSegments() {
    segments = [];
}

/**
 * Рисует все отрезки тёмно-синими линиями.
 */
export function drawAllSegments() {
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = '#2c3e50';   // тёмно-синий цвет
    ctx.lineWidth = 2;
    for (let seg of segments) {
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
    }
    ctx.restore();
}