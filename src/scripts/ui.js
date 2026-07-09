// Импортируем canvas, чтобы привязать к нему обработчик клика
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
}