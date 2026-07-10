// Переменные для хранения ссылки на холст, его контекст и размеры
export let canvas = null;   // сам элемент <canvas>
export let ctx = null;      // 2D-контекст рисования
export let W = 0;           // ширина холста в пикселях
export let H = 0;           // высота холста

/**
 * Инициализирует холст, сохраняет контекст и размеры.
 * Вызывается при создании нового холста (например, при открытии задания).
 * @param {HTMLCanvasElement} canvasElement – элемент <canvas>
 */
export function initCanvas(canvasElement) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    W = canvas.width;
    H = canvas.height;
}

/**
 * Переводит координаты мыши из оконных в координаты холста.
 * Учитывает, что CSS-размеры холста могут отличаться от реальных (атрибуты width/height).
 * @param {MouseEvent} e – событие мыши
 * @returns {{x: number, y: number}} – координаты на холсте
 */
export function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();               // размеры и позиция canvas в окне
    const scaleX = canvas.width / rect.width;                  // масштаб по горизонтали
    const scaleY = canvas.height / rect.height;                // масштаб по вертикали
    return {
        x: (e.clientX - rect.left) * scaleX,                  // пересчитываем X
        y: (e.clientY - rect.top) * scaleY                     // пересчитываем Y
    };
}