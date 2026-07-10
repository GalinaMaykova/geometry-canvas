import { ctx } from './canvas.js';

// Массив именованных точек, которые ставит пользователь (A, B, C...)
export let namedPoints = [];

/**
 * Добавляет именованную точку.
 * @param {string} label – буква (например 'A')
 * @param {number} x – координата X
 * @param {number} y – координата Y
 */
export function addNamedPoint(label, x, y) {
    namedPoints.push({ label, x, y });
}

/**
 * Удаляет последнюю добавленную именованную точку (используется для отмены).
 * @returns {Object|null} – удалённая точка или null, если массив пуст
 */
export function removeLastNamedPoint() {
    return namedPoints.length > 0 ? namedPoints.pop() : null;
}

/** Очищает все именованные точки */
export function clearNamedPoints() {
    namedPoints = [];
}

/**
 * Рисует именованные точки: чёрные кружочки и букву рядом.
 */
export function drawNamedPoints() {
    if (!ctx) return;
    ctx.save();
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let p of namedPoints) {
        // Маленький чёрный круг
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'black';
        ctx.fill();
        // Буква чуть правее и выше центра
        ctx.fillStyle = 'black';
        ctx.fillText(p.label, p.x + 14, p.y - 12);
    }
    ctx.restore();
}