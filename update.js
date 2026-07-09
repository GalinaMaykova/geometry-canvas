// Подключаем модули Node.js для работы с файловой системой и путями
const fs = require('fs');   // модуль для работы с файлами (чтение, запись, создание папок)
const path = require('path'); // модуль для построения правильных путей к файлам

// Определяем папку, в которой лежит сам скрипт (корень geometry-canvas)
const PROJECT_DIR = __dirname;  // __dirname – это папка, где находится update.js

// Все модули, которые мы будем создавать/обновлять. Ключ – относительный путь к файлу, значение – его содержимое.
const files = {

    // ===== 1. canvas.js =====
    // Модуль для работы с холстом: получение элемента <canvas> и его контекста,
    // а также функция перевода координат мыши в координаты холста.
    'src/scripts/canvas.js':
`// Находим на странице элемент <canvas> по его id="canvas"
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
}`,

    // ===== 2. grid.js =====
    // Модуль сетки: привязка к узлам, проверка границ и рисование сетки.
    'src/scripts/grid.js':
`// Импортируем контекст и размеры холста из canvas.js
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
}`,

    // ===== 3. possiblePoints.js =====
    // Модуль "возможных точек": концы отрезков и точки их пересечения.
    // Они называются T1, T2, T3... и именно к ним можно привязать именованные точки A–E.
    'src/scripts/possiblePoints.js':
`// Импортируем контекст (нужен для рисования возможных точек)
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
}`,

    // ===== 4. points.js =====
    // Модуль для работы с именованными точками (A, B, C, D, E).
    // Они могут быть привязаны только к возможным точкам (T1, T2...).
    'src/scripts/points.js':
`import { ctx } from './canvas.js';

// Массив именованных точек [{label: 'A', x: число, y: число}, ...]
export let namedPoints = [];

/**
 * Добавляет именованную точку с заданной буквой и координатами.
 * @param {string} label – буква точки (например 'A')
 * @param {number} x – координата X
 * @param {number} y – координата Y
 */
export function addNamedPoint(label, x, y) {
    namedPoints.push({ label, x, y });
    console.log('Добавлена точка ' + label + ': (' + x + ',' + y + ')');
}

/**
 * Удаляет последнюю добавленную именованную точку (используется при отмене действия).
 * @returns {Object|null} удалённая точка или null, если массив пуст
 */
export function removeLastNamedPoint() {
    if (namedPoints.length > 0) {
        const removed = namedPoints.pop();
        console.log('Удалена точка ' + removed.label + ': (' + removed.x + ',' + removed.y + ')');
        return removed;
    }
    return null;
}

/**
 * Полностью очищает список именованных точек.
 */
export function clearNamedPoints() {
    namedPoints = [];
    console.log('Все именованные точки очищены');
}

/**
 * Рисует все именованные точки: чёрные кружки и букву рядом.
 */
export function drawNamedPoints() {
    ctx.save();
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let p of namedPoints) {
        // Рисуем маленький чёрный круг в точке
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'black';
        ctx.fill();
        // Подписываем букву чуть правее и выше
        ctx.fillStyle = 'black';
        ctx.fillText(p.label, p.x + 14, p.y - 12);
    }
    ctx.restore();
}`,

    // ===== 5. segments.js =====
    // Модуль для работы с отрезками: хранение, добавление, удаление и рисование.
    'src/scripts/segments.js':
`import { ctx } from './canvas.js';

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
}`,

    // ===== 6. ui.js =====
    // Модуль интерфейса: управление HTML-элементами (кнопки, списки, статус).
    'src/scripts/ui.js':
`// Импортируем canvas, чтобы привязать к нему обработчик клика
import { canvas } from './canvas.js';

// Экспортируем ссылки на важные элементы DOM, чтобы другие модули могли их менять
export const statusEl = document.getElementById('status');            // строка статуса под холстом
export const clearBtn = document.getElementById('clearBtn');          // кнопка "Очистить"
export const undoBtn = document.getElementById('undoBtn');            // кнопка "Отменить"
export const checkBtn = document.getElementById('checkBtn');          // кнопка "Проверить"
export const hintBtn = document.getElementById('hintBtn');            // кнопка "Подсказка"
export const hintBar = document.getElementById('hintBar');            // прогресс-бар подсказки

// Логи (списки в правой панели)
export const possiblePointLog = document.getElementById('possiblePointLog');  // список возможных точек
export const pointLogList = document.getElementById('pointLogList');          // список именованных точек
export const segmentLogList = document.getElementById('segmentLogList');      // список отрезков
export const derivedSegmentLog = document.getElementById('derivedSegmentLog'); // список производных отрезков
export const analysisLog = document.getElementById('analysisLog');           // анализ чертежа
export const resultArea = document.getElementById('resultArea');             // жёлтое поле результата

// Все кнопки выбора букв (A, B, C, D, E)
export const pointBtns = document.querySelectorAll('.point-btn');

/**
 * Устанавливает HTML-содержимое строки статуса (подсказки пользователю).
 * @param {string} text – текст с HTML
 */
export function setStatus(text) {
    statusEl.innerHTML = text;
}

// Далее функции обновления каждого лога, очистки и т.д. Все они устроены похоже:
// 1. Очищаем содержимое элемента
// 2. Если данных нет – показываем сообщение-заглушку
// 3. Иначе создаём элементы <li> и наполняем их информацией

export function updatePossiblePointLog(possiblePoints) {
    possiblePointLog.innerHTML = '';
    if (possiblePoints.length === 0) {
        possiblePointLog.innerHTML = '<li class="empty-log">Пока нет возможных точек</li>';
        return;
    }
    for (let p of possiblePoints) {
        const li = document.createElement('li');
        li.textContent = p.id + ' (' + Math.round(p.x) + ', ' + Math.round(p.y) + ')';
        possiblePointLog.appendChild(li);
    }
}

export function addNamedPointLog(label, x, y) {
    const empty = pointLogList.querySelector('.empty-log');
    if (empty) empty.remove();
    const li = document.createElement('li');
    const now = new Date();
    const time = now.toLocaleTimeString();
    li.textContent = '[' + time + '] ' + label + ' (' + Math.round(x) + ', ' + Math.round(y) + ')';
    pointLogList.appendChild(li);
    pointLogList.scrollTop = pointLogList.scrollHeight;
}

export function removeLastNamedPointLog() {
    const items = pointLogList.querySelectorAll('li:not(.empty-log)');
    if (items.length > 0) {
        items[items.length - 1].remove();
    }
    if (pointLogList.querySelectorAll('li:not(.empty-log)').length === 0) {
        pointLogList.innerHTML = '<li class="empty-log">Пока нет точек</li>';
    }
}

export function clearNamedPointLog() {
    pointLogList.innerHTML = '<li class="empty-log">Пока нет точек</li>';
}

export function updateSegmentLog(segments, getPointInfoFn) {
    segmentLogList.innerHTML = '';
    if (segments.length === 0) {
        segmentLogList.innerHTML = '<li class="empty-log">Пока нет отрезков</li>';
        return;
    }
    for (let seg of segments) {
        const p1 = getPointInfoFn(seg.x1, seg.y1);
        const p2 = getPointInfoFn(seg.x2, seg.y2);
        const name1 = p1.letter ? p1.tId + '(' + p1.letter + ')' : p1.tId;
        const name2 = p2.letter ? p2.tId + '(' + p2.letter + ')' : p2.tId;
        const li = document.createElement('li');
        li.textContent = name1 + '-' + name2 + '  (' + Math.round(seg.x1) + ',' + Math.round(seg.y1) + ') → (' + Math.round(seg.x2) + ',' + Math.round(seg.y2) + ')';
        segmentLogList.appendChild(li);
    }
}

/** Удаляет последнюю запись из лога отрезков (после отмены) */
export function removeLastSegmentLog() {
    const items = segmentLogList.querySelectorAll('li:not(.empty-log)');
    if (items.length > 0) {
        items[items.length - 1].remove();
    }
    if (segmentLogList.querySelectorAll('li:not(.empty-log)').length === 0) {
        segmentLogList.innerHTML = '<li class="empty-log">Пока нет отрезков</li>';
    }
}

/** Заполняет лог производных отрезков (разбитых точками пересечения) */
export function updateDerivedSegmentLog(derivedSegments) {
    // Если элемент не существует – ничего не делаем
    if (!derivedSegmentLog) return;
    // Защита: если передали не массив, превращаем в пустой массив
    if (!Array.isArray(derivedSegments)) {
        console.warn('updateDerivedSegmentLog: передан не массив, заменён на []', derivedSegments);
        derivedSegments = [];
    }
    derivedSegmentLog.innerHTML = '';
    if (derivedSegments.length === 0) {
        derivedSegmentLog.innerHTML = '<li class="empty-log">Пока нет производных отрезков</li>';
        return;
    }
    for (let seg of derivedSegments) {
        const li = document.createElement('li');
        li.textContent = seg.name1 + '-' + seg.name2 + '  (' + Math.round(seg.x1) + ',' + Math.round(seg.y1) + ') → (' + Math.round(seg.x2) + ',' + Math.round(seg.y2) + ')';
        derivedSegmentLog.appendChild(li);
    }
}

/** Полная очистка логов отрезков */
export function clearSegmentLog() {
    segmentLogList.innerHTML = '<li class="empty-log">Пока нет отрезков</li>';
    if (derivedSegmentLog) {
        derivedSegmentLog.innerHTML = '<li class="empty-log">Пока нет производных отрезков</li>';
    }
}

/** Отображает анализ в виде списка строк */
export function setAnalysis(items) {
    analysisLog.innerHTML = '';
    if (!items || items.length === 0) {
        analysisLog.innerHTML = '<li class="empty-log">Нет данных для анализа</li>';
        return;
    }
    for (let item of items) {
        const li = document.createElement('li');
        li.textContent = item;
        analysisLog.appendChild(li);
    }
}

/** Устанавливает текст в жёлтой области результата */
export function setResult(text) {
    resultArea.textContent = text;
}

/** Очищает анализ и результат */
export function clearAnalysis() {
    analysisLog.innerHTML = '';
    resultArea.textContent = '';
}

// ---- Функции для кнопок выбора букв ----

/** Возвращает активную кнопку буквы (ту, что подсвечена жёлтым) */
export function getActivePointBtn() {
    return document.querySelector('.point-btn.active');
}

/** Делает кнопку с заданной буквой активной (подсвечивает) */
export function setActivePointBtn(label) {
    pointBtns.forEach(btn => btn.classList.remove('active'));
    if (label) {
        const btn = document.querySelector('.point-btn[data-label="' + label + '"]');
        if (btn) btn.classList.add('active');
    }
}

/** Блокирует кнопку (точка уже поставлена) */
export function disablePointBtn(label) {
    const btn = document.querySelector('.point-btn[data-label="' + label + '"]');
    if (btn) {
        btn.disabled = true;
        btn.classList.remove('active');
    }
}

/** Разблокирует кнопку */
export function enablePointBtn(label) {
    const btn = document.querySelector('.point-btn[data-label="' + label + '"]');
    if (btn) btn.disabled = false;
}

/** Сбрасывает все кнопки: разблокирует и убирает подсветку */
export function resetAllButtons() {
    pointBtns.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('active');
    });
}

// ---- Назначение обработчиков ----

export function onCanvasClick(handler) {
    canvas.addEventListener('click', handler);
}

export function onClearClick(handler) {
    clearBtn.addEventListener('click', handler);
}

export function onUndoClick(handler) {
    undoBtn.addEventListener('click', handler);
}

export function onCheckClick(handler) {
    checkBtn.addEventListener('click', handler);
}

export function onHintClick(handler) {
    hintBtn.addEventListener('click', handler);
}

/** Запускает таймер обратного отсчёта для кнопки подсказки */
export function startHintTimer(duration, onTick, onComplete) {
    let remaining = duration;
    hintBtn.disabled = true;
    hintBtn.textContent = '💡 Подсказка (' + remaining + ')';
    hintBar.style.width = '0%';

    const interval = setInterval(() => {
        remaining--;
        const progress = ((duration - remaining) / duration) * 100;
        hintBar.style.width = progress + '%';
        hintBtn.textContent = '💡 Подсказка (' + remaining + ')';

        if (remaining <= 0) {
            clearInterval(interval);
            hintBtn.disabled = false;
            hintBtn.textContent = '💡 Подсказка';
            hintBar.style.width = '100%';
            if (onComplete) onComplete();
        }
        if (onTick) onTick(remaining);
    }, 1000);
}`,

    // ===== 7. hints.js =====
    // Логика подсказок – в зависимости от количества отрезков и их взаимного расположения.
    'src/scripts/hints.js':
`/**
 * Возвращает текст подсказки и список аналитических сообщений.
 * @param {Array} segments – массив отрезков [{x1,y1,x2,y2}, ...]
 * @returns {{ result: string, analysis: string[] }}
 */
export function getHintMessage(segments) {
    const count = segments.length;

    // 0 отрезков – предложение нарисовать первый отрезок
    if (count === 0) {
        return {
            result: 'Нарисуй отрезок, нажав на холст в начале и конце отрезка.',
            analysis: ['ℹ️ Холст пуст — начни с первого отрезка.']
        };
    }

    // 1 отрезок – нужно больше одного
    if (count === 1) {
        return {
            result: 'Написано отрезки. Отрезки — это больше чем один.',
            analysis: ['ℹ️ Один отрезок: нужно добавить ещё один, чтобы получить пересечение.']
        };
    }

    // 2 отрезка – проверяем, пересекаются ли и где именно
    if (count === 2) {
        const [s1, s2] = segments; // берём первый и второй отрезок

        // Вычисляем точку пересечения (внутренняя функция)
        const intersectPt = (function() {
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
        })();

        // Если не пересекаются
        if (!intersectPt) {
            return {
                result: 'Отрезки это хорошо, но они должны пересекаться.',
                analysis: ['❌ Два отрезка не пересекаются — построй их так, чтобы они пересеклись.']
            };
        }

        // Проверяем, является ли точка пересечения серединой отрезка (допуск 2 пикселя)
        function isMidpoint(px, py, seg) {
            const mx = (seg.x1 + seg.x2) / 2;
            const my = (seg.y1 + seg.y2) / 2;
            return Math.abs(px - mx) < 2 && Math.abs(py - my) < 2;
        }

        const mid1 = isMidpoint(intersectPt.x, intersectPt.y, s1);
        const mid2 = isMidpoint(intersectPt.x, intersectPt.y, s2);

        // Если оба пересекаются в своих серединах – отлично, можно ставить точки
        if (mid1 && mid2) {
            return {
                result: 'Пересекаются в середине. Теперь расставь точки A, B, C, D, E.',
                analysis: ['✅ Пересечение в серединах обоих отрезков. Можно обозначать вершины.']
            };
        } else {
            // Иначе – пересекаются, но не в серединах
            return {
                result: 'Пересекаются не в середине.',
                analysis: ['ℹ️ Отрезки пересекаются, но не в своих серединах. Добейтесь пересечения в центре.']
            };
        }
    }

    // Больше двух отрезков – общая подсказка
    return {
        result: 'На холсте несколько отрезков. Продолжай строить чертёж.',
        analysis: ['ℹ️ Несколько отрезков построено.']
    };
}`,

    // ===== 8. main.js =====
    // Главный модуль приложения: вся логика взаимодействия, обработчики, анализ.
    'src/scripts/main.js':
`// Импорты из других модулей
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

initHintTimer();          // запускаем таймер подсказки`
};

// ========== ЗАПИСЬ ВСЕХ ФАЙЛОВ ==========
console.log('🔄 Обновление скриптов...');
for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(PROJECT_DIR, filePath);
    const dir = path.dirname(fullPath);
    // Если папка не существует – создаём её рекурсивно
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    // Записываем файл с содержимым в кодировке UTF-8
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('✅ ' + filePath);
}

console.log('\n🎉 Готово! Теперь выполните:');
console.log('  git add .');
console.log('  git commit -m "Обновление скриптов с комментариями"');
console.log('  git push');
