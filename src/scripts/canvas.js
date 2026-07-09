// Находим на странице элемент <canvas> по его id="canvas"
export const canvas = document.getElementById('canvas');
// Получаем 2D-контекст рисования – именно через него мы будем рисовать линии и фигуры
export const ctx = canvas.getContext('2d');
// Запоминаем ширину и высоту холста (они заданы в HTML-атрибутах width/height)
export const W = canvas.width;
export const H = canvas.height;

/**
 * Переводит координаты события мыши в координаты на холсте,
 * учитывая возможное масштабирование CSS.
 * @param {MouseEvent} e - событие мыши
 * @returns {{x: number, y: number}} координаты на холсте
 */
export function getMousePos(e) {
    // Получаем положение и размеры холста относительно окна браузера
    const rect = canvas.getBoundingClientRect();
    // Вычисляем коэффициент масштабирования по горизонтали (если CSS-размер отличается от фактического)
    const scaleX = canvas.width / rect.width;
    // То же по вертикали
    const scaleY = canvas.height / rect.height;
    // Возвращаем объект с координатами, где
    // x = (координата мыши в окне – левый край холста) * масштаб
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}