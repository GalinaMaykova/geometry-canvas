// Импортируем контекст и размеры холста из canvas.js
import { ctx, W, H } from './canvas.js';

// Размер одной клетки сетки (в пикселях)
export const GRID_SIZE = 30;

/**
 * Привязывает координату к ближайшему узлу сетки (округляет).
 * @param {number} coord - исходная координата (например, координата клика)
 * @returns {number} координата, кратная GRID_SIZE
 */
export function snapToGrid(coord) {
    // Делим на размер клетки, округляем до целого и умножаем обратно
    return Math.round(coord / GRID_SIZE) * GRID_SIZE;
}

/**
 * Проверяет, находится ли точка внутри холста.
 * @param {number} x – координата X
 * @param {number} y – координата Y
 * @returns {boolean} true, если точка внутри, иначе false
 */
export function isInsideCanvas(x, y) {
    return x >= 0 && x <= W && y >= 0 && y <= H;
}

/**
 * Рисует фоновую сетку на холсте (серые линии).
 */
export function drawGrid() {
    // Сохраняем текущее состояние контекста (цвета, линии и т.д.)
    ctx.save();
    // Устанавливаем цвет линий сетки – светло-серый
    ctx.strokeStyle = '#ddd';
    // Толщина линии – 1 пиксель
    ctx.lineWidth = 1;
    // Рисуем вертикальные линии: x от 0 до ширины холста с шагом GRID_SIZE
    for (let x = 0; x <= W; x += GRID_SIZE) {
        ctx.beginPath();          // начинаем новый путь
        ctx.moveTo(x, 0);        // перемещаем "карандаш" в точку (x, 0)
        ctx.lineTo(x, H);        // проводим линию до (x, H)
        ctx.stroke();            // отрисовываем линию
    }
    // Аналогично горизонтальные линии: y от 0 до высоты холста
    for (let y = 0; y <= H; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }
    // Восстанавливаем предыдущее состояние контекста (чтобы не сбить другие настройки рисования)
    ctx.restore();
}