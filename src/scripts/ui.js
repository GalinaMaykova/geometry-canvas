// ===== ui.js – модуль интерфейса =====
// Здесь собраны все ссылки на элементы DOM, функции обновления логов,
// управления кнопками и инструментами (указатель, линия, точки, ластик).

// Экспортируемые переменные – они будут заполнены в initUI()
export let statusEl, resultArea;
export let possiblePointLog, pointLogList, segmentLogList, derivedSegmentLog, analysisLog;
export let pointBtns, clearBtn, undoBtn, checkBtn, hintBtn, hintBar;
export let pointerBtn, lineBtn, pointsBtn, eraserBtn, pointButtonsContainer;

/**
 * Инициализирует ссылки на элементы DOM.
 * Вызывается при открытии каждого задания, чтобы привязаться к новым элементам.
 * @param {string} prefix – не используется, оставлен для совместимости
 */
export function initUI(prefix) {
    statusEl = document.getElementById('status');                     // строка статуса под холстом
    resultArea = document.getElementById('resultArea');               // жёлтая область результата
    possiblePointLog = document.querySelector('.possiblePointLog');   // лог возможных точек
    pointLogList = document.querySelector('.pointLogList');           // лог именованных точек
    segmentLogList = document.querySelector('.segmentLogList');       // лог отрезков
    derivedSegmentLog = document.querySelector('.derivedSegmentLog'); // лог производных отрезков
    analysisLog = document.querySelector('.analysisLog');             // лог анализа
    pointBtns = document.querySelectorAll('.point-btn');              // все кнопки букв (A, B, C…)
    clearBtn = document.querySelector('.clearBtn');                   // кнопка «Очистить всё»
    undoBtn = document.querySelector('.undoBtn');                     // кнопка «Отменить»
    checkBtn = document.querySelector('.checkBtn');                   // кнопка «Проверить»
    hintBtn = document.querySelector('.hintBtn');                     // кнопка «Подсказка»
    hintBar = document.querySelector('.hintBar');                     // прогресс-бар подсказки
    pointerBtn = document.querySelector('.pointerBtn');               // кнопка «Указатель»
    lineBtn = document.querySelector('.lineBtn');                     // кнопка «Линия»
    pointsBtn = document.querySelector('.pointsBtn');                 // кнопка «Точки»
    eraserBtn = document.querySelector('.eraserBtn');                 // кнопка «Ластик»
    pointButtonsContainer = document.getElementById('pointButtonsContainer'); // контейнер для круглых кнопок букв
}

/** Устанавливает HTML-содержимое строки статуса под холстом */
export function setStatus(text) {
    if (statusEl) statusEl.innerHTML = text;
}

/** Обновляет список возможных точек (T1, T2…) в правой панели */
export function updatePossiblePointLog(points) {
    if (!possiblePointLog) return;
    possiblePointLog.innerHTML = '';  // очищаем старый список
    if (!points.length) {
        // Если точек нет – показываем заглушку
        possiblePointLog.innerHTML = '<li class="empty-log">Пока нет возможных точек</li>';
        return;
    }
    for (let p of points) {
        const li = document.createElement('li');
        li.textContent = p.id + ' (' + Math.round(p.x) + ', ' + Math.round(p.y) + ')';
        possiblePointLog.appendChild(li);
    }
}

/** Добавляет запись о новой именованной точке (A, B…) в лог */
export function addNamedPointLog(label, x, y) {
    if (!pointLogList) return;
    // Удаляем заглушку «Пока нет точек», если она есть
    const empty = pointLogList.querySelector('.empty-log');
    if (empty) empty.remove();
    const li = document.createElement('li');
    const now = new Date();
    const time = now.toLocaleTimeString();   // время в формате ЧЧ:ММ:СС
    li.textContent = '[' + time + '] ' + label + ' (' + Math.round(x) + ', ' + Math.round(y) + ')';
    pointLogList.appendChild(li);
    // Прокручиваем лог вниз, чтобы видеть последнюю запись
    pointLogList.scrollTop = pointLogList.scrollHeight;
}

/** Удаляет последнюю запись из лога именованных точек (после отмены) */
export function removeLastNamedPointLog() {
    if (!pointLogList) return;
    const items = pointLogList.querySelectorAll('li:not(.empty-log)');
    if (items.length) {
        items[items.length - 1].remove();
    }
    // Если записей не осталось, возвращаем заглушку
    if (!pointLogList.querySelectorAll('li:not(.empty-log)').length) {
        pointLogList.innerHTML = '<li class="empty-log">Пока нет точек</li>';
    }
}

/** Очищает лог именованных точек полностью */
export function clearNamedPointLog() {
    if (pointLogList) pointLogList.innerHTML = '<li class="empty-log">Пока нет точек</li>';
}

/**
 * Обновляет лог отрезков.
 * @param {Array} segs – массив отрезков
 * @param {Function} getInfo – функция, возвращающая для координат объект {tId, letter}
 */
export function updateSegmentLog(segs, getInfo) {
    if (!segmentLogList) return;
    segmentLogList.innerHTML = '';
    if (!segs.length) {
        segmentLogList.innerHTML = '<li class="empty-log">Пока нет отрезков</li>';
        return;
    }
    for (let s of segs) {
        const a = getInfo(s.x1, s.y1);
        const b = getInfo(s.x2, s.y2);
        // Формируем красивое имя: T1(A) – T2(B)
        const nameA = a.letter ? a.tId + '(' + a.letter + ')' : a.tId;
        const nameB = b.letter ? b.tId + '(' + b.letter + ')' : b.tId;
        const li = document.createElement('li');
        li.textContent = nameA + '-' + nameB + '  (' + Math.round(s.x1) + ',' + Math.round(s.y1) + ') → (' + Math.round(s.x2) + ',' + Math.round(s.y2) + ')';
        segmentLogList.appendChild(li);
    }
}

/** Удаляет последнюю запись из лога отрезков */
export function removeLastSegmentLog() {
    if (!segmentLogList) return;
    const items = segmentLogList.querySelectorAll('li:not(.empty-log)');
    if (items.length) {
        items[items.length - 1].remove();
    }
    if (!segmentLogList.querySelectorAll('li:not(.empty-log)').length) {
        segmentLogList.innerHTML = '<li class="empty-log">Пока нет отрезков</li>';
    }
}

/** Обновляет лог производных отрезков (разбитых точками пересечения) */
export function updateDerivedSegmentLog(derived) {
    if (!derivedSegmentLog) return;
    if (!Array.isArray(derived)) derived = [];  // защита от не-массива
    derivedSegmentLog.innerHTML = '';
    if (!derived.length) {
        derivedSegmentLog.innerHTML = '<li class="empty-log">Пока нет производных отрезков</li>';
        return;
    }
    for (let s of derived) {
        const li = document.createElement('li');
        li.textContent = s.name1 + '-' + s.name2 + '  (' + Math.round(s.x1) + ',' + Math.round(s.y1) + ') → (' + Math.round(s.x2) + ',' + Math.round(s.y2) + ')';
        derivedSegmentLog.appendChild(li);
    }
}

/** Очищает логи отрезков и производных отрезков */
export function clearSegmentLog() {
    if (segmentLogList) segmentLogList.innerHTML = '<li class="empty-log">Пока нет отрезков</li>';
    if (derivedSegmentLog) derivedSegmentLog.innerHTML = '<li class="empty-log">Пока нет производных отрезков</li>';
}

/** Заполняет блок анализа списком строк */
export function setAnalysis(items) {
    if (!analysisLog) return;
    analysisLog.innerHTML = '';
    if (!items || !items.length) {
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
    if (resultArea) resultArea.textContent = text;
}

/** Очищает анализ и результат */
export function clearAnalysis() {
    if (analysisLog) analysisLog.innerHTML = '';
    if (resultArea) resultArea.textContent = '';
}

/** Возвращает активную кнопку точки (ту, что подсвечена) */
export function getActivePointBtn() {
    return document.querySelector('.point-btn.active');
}

/** Подсвечивает кнопку точки с указанной буквой */
export function setActivePointBtn(label) {
    pointBtns.forEach(b => b.classList.remove('active'));
    if (label) {
        const btn = document.querySelector('.point-btn[data-label="' + label + '"]');
        if (btn) btn.classList.add('active');
    }
}

/** Делает кнопку точки недоступной (точка уже стоит) */
export function disablePointBtn(label) {
    const btn = document.querySelector('.point-btn[data-label="' + label + '"]');
    if (btn) {
        btn.disabled = true;
        btn.classList.remove('active');
    }
}

/** Делает кнопку точки снова доступной (после удаления) */
export function enablePointBtn(label) {
    const btn = document.querySelector('.point-btn[data-label="' + label + '"]');
    if (btn) btn.disabled = false;
}

/** Сбрасывает все кнопки точек: разблокирует и снимает подсветку */
export function resetAllButtons() {
    pointBtns.forEach(b => {
        b.disabled = false;
        b.classList.remove('active');
    });
}

/**
 * Запускает таймер обратного отсчёта для кнопки «Подсказка».
 * @param {number} duration – длительность в секундах
 * @param {Function} onTick – вызывается каждую секунду с оставшимся временем
 * @param {Function} onComplete – вызывается по истечении таймера
 */
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

// ---------- Управление инструментами ----------

/** Активирует указатель и скрывает панель с кнопками точек */
export function setPointerActive() {
    if (pointerBtn) pointerBtn.classList.add('active');
    if (lineBtn) lineBtn.classList.remove('active');
    if (pointsBtn) pointsBtn.classList.remove('active');
    if (eraserBtn) eraserBtn.classList.remove('active');
    hidePointContainer();
}

/** Активирует линию и скрывает панель с точками */
export function setLineActive() {
    if (lineBtn) lineBtn.classList.add('active');
    if (pointerBtn) pointerBtn.classList.remove('active');
    if (pointsBtn) pointsBtn.classList.remove('active');
    if (eraserBtn) eraserBtn.classList.remove('active');
    hidePointContainer();
}

/** Активирует точки и показывает панель с круглыми кнопками букв */
export function setPointsActive() {
    if (pointsBtn) pointsBtn.classList.add('active');
    if (pointerBtn) pointerBtn.classList.remove('active');
    if (lineBtn) lineBtn.classList.remove('active');
    if (eraserBtn) eraserBtn.classList.remove('active');
    showPointContainer();
}

/** Активирует ластик и скрывает панель с точками */
export function setEraserActive() {
    if (eraserBtn) eraserBtn.classList.add('active');
    if (pointerBtn) pointerBtn.classList.remove('active');
    if (lineBtn) lineBtn.classList.remove('active');
    if (pointsBtn) pointsBtn.classList.remove('active');
    hidePointContainer();
}

/** Сбрасывает все инструменты (убирает подсветку) */
export function resetTools() {
    if (pointerBtn) pointerBtn.classList.remove('active');
    if (lineBtn) lineBtn.classList.remove('active');
    if (pointsBtn) pointsBtn.classList.remove('active');
    if (eraserBtn) eraserBtn.classList.remove('active');
    hidePointContainer();
}

// Вспомогательные функции для показа/скрытия контейнера с кнопками точек

function showPointContainer() {
    if (!pointButtonsContainer) return;
    pointButtonsContainer.classList.add('visible');
    pointButtonsContainer.style.display = 'flex';   // принудительно показываем
}

function hidePointContainer() {
    if (!pointButtonsContainer) return;
    pointButtonsContainer.classList.remove('visible');
    pointButtonsContainer.style.display = '';        // убираем инлайн-стиль
}

/**
 * Создаёт внутри pointButtonsContainer круглые кнопки для указанных букв.
 * @param {string[]} letters – массив букв (например ['A','B','C','D'])
 */
export function populatePointButtons(letters) {
    if (!pointButtonsContainer) return;
    pointButtonsContainer.innerHTML = '';   // очищаем старые кнопки
    letters.forEach(letter => {
        const btn = document.createElement('button');
        btn.className = 'point-btn';
        btn.dataset.label = letter;
        btn.textContent = letter;
        pointButtonsContainer.appendChild(btn);
    });
    // Обновляем глобальный список pointBtns, чтобы остальные функции видели новые кнопки
    pointBtns = document.querySelectorAll('.point-btn');
}