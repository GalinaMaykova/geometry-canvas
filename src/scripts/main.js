// ===== main.js – главный модуль приложения (подробные комментарии) =====
// Здесь происходит: навигация по урокам, создание холстов для заданий,
// восстановление сохранённого состояния, привязка кнопок и обработка проверки/подсказок.

import { initCanvas, canvas } from './canvas.js';            // работа с холстом
import {
    initUI,                                                  // привязка элементов интерфейса
    setStatus, setResult, clearAnalysis, setAnalysis,        // управление статусом и результатом
    startHintTimer, hintBar, hintBtn, clearBtn, undoBtn, checkBtn, // элементы управления
    pointerBtn, lineBtn, pointsBtn, eraserBtn, pointButtonsContainer, // кнопки инструментов
    getActivePointBtn, setActivePointBtn, disablePointBtn, enablePointBtn, resetAllButtons // кнопки точек
} from './ui.js';
import { lessons, tasks } from './taskConfig.js';            // структура уроков и функции проверки
import {
    markLessonCompleted, isLessonCompleted,                  // работа с прогрессом
    saveAppState as saveAppStateToStorage,                   // сохранение состояния холстов
    loadAppState as loadAppStateFromStorage                  // загрузка состояния холстов
} from './progress.js';
import {
    attachEvents, detachEvents, clearDrawing,               // управление холстом
    undoLastAction, getSegments, setOnDrawingChanged, redraw, // отмена и перерисовка
    setTool, setAllowedLetters, getCurrentTool               // переключение инструментов
} from './drawing.js';
import { namedPoints } from './points.js';                   // массив именованных точек (A, B, C…)

console.log('🚀 main.js загружен!');

// ======================= ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =======================

let currentView = null;
let currentTaskId = null;

// Загружаем сохранённое состояние
let appState = loadAppStateFromStorage();

// КРИТИЧЕСКАЯ ПРОВЕРКА: если данные повреждены, останавливаем всё
if (appState === null) {
    // Показываем сообщение об ошибке
    document.getElementById('dynamic-content').innerHTML =
        '<div style="text-align:center; margin-top:50px; font-size:20px; color:red;">' +
        '<h2>⚠️ Ошибка данных</h2>' +
        '<p>Сохранённые данные повреждены. Пожалуйста, очистите localStorage.</p>' +
        '<p><button onclick="localStorage.clear();location.reload();" style="padding:10px 20px; font-size:16px;">Очистить и перезагрузить</button></p>' +
        '</div>';
    // Прекращаем выполнение остального кода (не строим меню, не вешаем обработчики)
    throw new Error('Повреждённые данные localStorage');
}

// ======================= КОЛБЭК ИЗМЕНЕНИЯ ХОЛСТА =======================
// drawing.js вызывает эту функцию каждый раз, когда пользователь что-то рисует,
// удаляет или перемещает. Мы сохраняем текущее состояние в appState и в localStorage.
setOnDrawingChanged(() => {
    if (!currentView) return;   // если раздел не определён, не сохраняем
    appState[currentView] = {
        segments: getSegments().slice(),     // копия массива отрезков
        namedPoints: namedPoints.slice()     // копия массива именованных точек
    };
    saveAppStateToStorage(appState);
});

// ======================= КНОПКА СБРОСА КЭША =======================
// Находим кнопку .dev-reset-btn (она определена в index.html) и вешаем обработчик
const devResetBtn = document.querySelector('.dev-reset-btn');
if (devResetBtn) {
    devResetBtn.addEventListener('click', () => {
        localStorage.clear();   // полностью очищаем все данные
        location.reload();      // перезагружаем страницу
    });
}

// ======================= НАВИГАЦИЯ =======================

/**
 * Переключает отображаемый раздел: введение, блок, урок, задание.
 * @param {string} section – идентификатор раздела (например, 'intro', 'lesson1-1-task1')
 */
function navigateTo(section) {
    detachEvents();  // отключаем обработчики мыши от старого холста

    // Сохраняем состояние текущего задания перед уходом
    if (currentView && currentTaskId) {
        appState[currentView] = {
            segments: getSegments().slice(),
            namedPoints: namedPoints.slice()
        };
        saveAppStateToStorage(appState);
    }

    // Удаляем старый холст из DOM
    const oldCanvas = document.querySelector('canvas');
    if (oldCanvas) oldCanvas.remove();

    // В зависимости от раздела показываем нужный контент
    if (section === 'intro') showIntro();
    else if (section === 'block1') showBlockMenu();
    else if (section.startsWith('lesson')) {
        if (section.includes('-task')) showTask(section);          // конкретное задание
        else if (section.endsWith('-intro')) showLessonIntro(section.replace('-intro', '')); // введение урока
        else showLessonMenu(section);                              // список заданий урока
    } else {
        document.getElementById('dynamic-content').innerHTML = '<p>Раздел не найден.</p>';
    }
    updateSidebarActive(section);   // подсвечиваем активный пункт меню
}

/** Показывает общее введение */
function showIntro() {
    currentView = 'intro';
    currentTaskId = null;
    document.getElementById('dynamic-content').innerHTML = '<h2>Добро пожаловать!</h2><p>Эта программа поможет вам освоить геометрию «с нуля» или исправить трудности.</p>';
}

/** Показывает страницу Блока 1 со списком уроков */
function showBlockMenu() {
    currentView = 'block1';
    currentTaskId = null;
    let html = '<h2>Блок 1. Учимся рисовать первичные чертежи</h2><ul>';
    for (const [lessonId, lesson] of Object.entries(lessons)) {
        html += '<li><a href="#" data-section="' + lessonId + '">' + lesson.title + '</a></li>';
    }
    html += '</ul>';
    document.getElementById('dynamic-content').innerHTML = html;
}

/**
 * Показывает меню конкретного урока (ссылки на введение и задания).
 * @param {string} lessonId – идентификатор урока
 */
function showLessonMenu(lessonId) {
    currentView = lessonId;
    currentTaskId = null;
    const lesson = lessons[lessonId];
    if (!lesson) { document.getElementById('dynamic-content').innerHTML = '<p>Урок не найден.</p>'; return; }
    let html = '<h2>' + lesson.title + '</h2><ul>';
    html += '<li><a href="#" data-section="' + lessonId + '-intro">Введение</a></li>';
    for (const task of lesson.tasks) {
        html += '<li><a href="#" data-section="' + task.id + '">' + task.title + '</a></li>';
    }
    html += '</ul>';
    document.getElementById('dynamic-content').innerHTML = html;
}

/** Показывает введение урока */
function showLessonIntro(lessonId) {
    currentView = lessonId + '-intro';
    currentTaskId = null;
    const lesson = lessons[lessonId];
    if (!lesson) { document.getElementById('dynamic-content').innerHTML = '<p>Урок не найден.</p>'; return; }
    document.getElementById('dynamic-content').innerHTML = '<h2>' + lesson.title + '</h2>' + (lesson.intro || '');
}

/**
 * Открывает задание: создаёт холст, восстанавливает сохранённое состояние, настраивает инструменты.
 * @param {string} taskId – идентификатор задания (например, 'lesson1-1-task1')
 */
function showTask(taskId) {
    currentView = taskId;
    // Ищем конфигурацию задания в lessons
    let taskConfigId = null;
    for (const lesson of Object.values(lessons)) {
        const found = lesson.tasks.find(t => t.id === taskId);
        if (found) { taskConfigId = found.taskConfigId; break; }
    }
    if (!taskConfigId) { document.getElementById('dynamic-content').innerHTML = '<p>Задание не найдено.</p>'; return; }
    currentTaskId = taskConfigId;

    const taskDef = tasks[taskConfigId];
    const letters = taskDef.letters || [];   // буквы, которые нужно расставить (если есть)

    // Генерируем HTML с холстом, панелями и кнопками
    const taskTitle = getTaskTitle(taskId);
    const html = generateTaskHTML(taskTitle, letters);
    document.getElementById('dynamic-content').innerHTML = html;

    // Инициализируем холст
    const canvasEl = document.getElementById('lesson-canvas');
    if (canvasEl) {
        initCanvas(canvasEl);           // сохраняем ссылки на canvas, ctx, W, H
        initUI('lesson');               // привязываем элементы интерфейса

        // Очищаем глобальные массивы отрезков и точек (чтобы не осталось от другого задания)
        getSegments().splice(0, getSegments().length);
        namedPoints.splice(0, namedPoints.length);

        // Восстанавливаем состояние именно этого задания (если оно было сохранено ранее)
        const state = appState && appState[taskId] ? appState[taskId] : null;
        if (state) {
            if (state.segments) {
                const segs = getSegments();
                segs.push(...state.segments);   // копируем отрезки
            }
            if (state.namedPoints) {
                namedPoints.push(...state.namedPoints); // копируем именованные точки
            }
            redraw();   // перерисовываем холст с восстановленными объектами
        } else {
            clearDrawing();   // если сохранения нет – просто очищаем холст
        }

        // Навешиваем обработчики мыши на новый холст
        attachEvents();

        // Настройка кнопок точек: показываем, только если задание требует буквы
        if (letters.length > 0) {
            setAllowedLetters(letters);
            if (pointsBtn) pointsBtn.style.display = 'inline-block';
            if (pointButtonsContainer) pointButtonsContainer.style.display = 'none';
        } else {
            if (pointsBtn) pointsBtn.style.display = 'none';
            if (pointButtonsContainer) pointButtonsContainer.style.display = 'none';
        }

        // По умолчанию активируем инструмент «Линия»
        setTool('line');

        // Привязываем обработчики кнопок
        if (clearBtn) clearBtn.onclick = clearDrawing;
        if (undoBtn) undoBtn.onclick = undoLastAction;
        if (checkBtn) checkBtn.onclick = handleCheck;
        if (hintBtn) hintBtn.onclick = handleHint;

        // Кнопки инструментов: при повторном клике возвращают «Указатель»
        if (pointerBtn) pointerBtn.onclick = () => setTool('pointer');
        if (lineBtn) lineBtn.onclick = () => {
            if (getCurrentTool() === 'line') setTool('pointer');
            else setTool('line');
        };
        if (eraserBtn) eraserBtn.onclick = () => {
            if (getCurrentTool() === 'eraser') setTool('pointer');
            else setTool('eraser');
        };
        if (pointsBtn) pointsBtn.onclick = () => {
            if (getCurrentTool() === 'point') setTool('pointer');
            else setTool('point');
        };

        // Запускаем таймер подсказки и окончательно перерисовываем холст
        initHintTimer();
        redraw();
    }
}

/** Возвращает заголовок задания по его id */
function getTaskTitle(taskId) {
    for (const lesson of Object.values(lessons)) {
        const task = lesson.tasks.find(t => t.id === taskId);
        if (task) return task.title;
    }
    return 'Задание';
}

/**
 * Генерирует HTML-разметку для задания (холст, панели, кнопки).
 * @param {string} title – заголовок задания
 * @param {string[]} letters – буквы для кнопок точек (если есть)
 * @returns {string} – HTML-строка
 */
function generateTaskHTML(title, letters) {
    const pointsBtnHtml = letters.length > 0 ? '<button class="pointsBtn">🔤 Точки</button>' : '';
    const containerHtml = '<div class="point-buttons-container" id="pointButtonsContainer"></div>';
    return '<div class="header">' +
        '<h1 class="task-title">' + title + '</h1>' +
        '<h2 class="task-subtitle">' + (letters.length ? 'Постройте отрезки и обозначьте вершины' : 'Нарисуйте два пересекающихся отрезка') + '</h2>' +
        '</div>' +
        '<div class="workspace">' +
        '<div class="left-buttons">' +
        '<button class="undoBtn">↩️ Отменить</button>' +
        '<button class="clearBtn">🧹 Очистить всё</button>' +
        '<button class="pointerBtn">🖱️ Указатель</button>' +
        '<button class="eraserBtn">🧽 Ластик</button>' +
        '<button class="lineBtn active">📏 Линия</button>' +
        pointsBtnHtml +
        containerHtml +
        '</div>' +
        '<div class="canvas-wrapper">' +
        '<canvas id="lesson-canvas" width="800" height="600"></canvas>' +
        '<div class="info" id="status">…</div>' +
        '<div class="result-area" id="resultArea"></div>' +
        '</div>' +
        '<div class="right-buttons">' +
        '<button class="checkBtn">✅ Проверить</button>' +
        '<button class="hintBtn" disabled>💡 Подсказка (30)</button>' +
        '<div class="hintProgress"><div class="hintBar"></div></div>' +
        '</div>' +
        '<div class="right-panel">' +
        '<div class="log-section"><h2>📍 Возможные точки</h2><ul class="possiblePointLog"><li class="empty-log">Пока нет возможных точек</li></ul></div>' +
        (letters.length ? '<div class="log-section"><h2>📌 Именованные точки</h2><ul class="pointLogList"><li class="empty-log">Пока нет точек</li></ul></div>' : '') +
        '<div class="log-section"><h2>📋 Отрезки</h2><ul class="segmentLogList"><li class="empty-log">Пока нет отрезков</li></ul></div>' +
        '<div class="log-section"><h2>🧩 Производные отрезки</h2><ul class="derivedSegmentLog"><li class="empty-log">Пока нет производных отрезков</li></ul></div>' +
        '<div class="log-section"><h2>🔍 Анализ чертежа</h2><ul class="analysisLog"><li class="empty-log">Нажми «Проверить»</li></ul></div>' +
        '</div>' +
        '</div>';
}

/** Обработчик кнопки «Проверить» */
function handleCheck() {
    if (!currentTaskId || !tasks[currentTaskId]) return;
    const taskDef = tasks[currentTaskId];
    // Вызываем функцию проверки из taskConfig, передаём текущие отрезки и точки
    const { result, analysis } = taskDef.check(getSegments(), namedPoints);
    setResult(result);                     // выводим результат в жёлтую область
    setAnalysis(analysis);                 // выводим подробности в блок анализа
    // Если задача решена (в тексте есть ✅), отмечаем урок как пройденный
    if (result.includes('✅') && currentView) {
        const added = markLessonCompleted(currentView);
        if (added) {
            updateSidebarProgress();
            setStatus('✅ Задача выполнена! Урок отмечен как пройденный.');
        }
    }
}

/** Обработчик кнопки «Подсказка» */
function handleHint() {
    if (!currentTaskId || !tasks[currentTaskId]) return;
    const taskDef = tasks[currentTaskId];
    const { result, analysis } = taskDef.hint(getSegments());
    setResult(result);
    setAnalysis(analysis);
}

/** Запускает таймер подсказки (2 секунды) */
function initHintTimer() {
    if (!hintBar || !hintBtn) return;
    startHintTimer(2, () => {}, () => console.log('Подсказка доступна'));
}

/** Обновляет галочки «пройдено» в боковом меню */
function updateSidebarProgress() {
    document.querySelectorAll('.sidebar-menu a[data-task]').forEach(a => {
        const taskId = a.dataset.task;
        if (isLessonCompleted(taskId)) a.classList.add('completed');
        else a.classList.remove('completed');
    });
}

/** Строит боковое меню на основе структуры lessons */
function buildSidebarMenu() {
    const menu = document.getElementById('sidebar-menu');
    menu.innerHTML = '';   // очищаем

    // Пункт «Введение»
    const introLi = document.createElement('li');
    introLi.innerHTML = '<a href="#" data-section="intro">Введение</a>';
    menu.appendChild(introLi);

    // Блок 1 с уроками и заданиями
    const block1Li = document.createElement('li');
    block1Li.innerHTML = '<a href="#" class="block-title" data-section="block1">Блок 1. Учимся рисовать первичные чертежи</a>';
    const block1Submenu = document.createElement('ul');
    block1Submenu.className = 'submenu';

    for (const [lessonId, lesson] of Object.entries(lessons)) {
        const lessonLi = document.createElement('li');
        lessonLi.innerHTML = '<a href="#" data-section="' + lessonId + '">' + lesson.title + '</a>';
        const lessonSubmenu = document.createElement('ul');
        lessonSubmenu.className = 'submenu';

        const introTaskLi = document.createElement('li');
        introTaskLi.innerHTML = '<a href="#" data-section="' + lessonId + '-intro">Введение</a>';
        lessonSubmenu.appendChild(introTaskLi);

        for (const task of lesson.tasks) {
            const taskLi = document.createElement('li');
            taskLi.innerHTML = '<a href="#" data-task="' + task.id + '" data-section="' + task.id + '">' + task.title + '</a>';
            lessonSubmenu.appendChild(taskLi);
        }

        lessonLi.appendChild(lessonSubmenu);
        block1Submenu.appendChild(lessonLi);
    }

    block1Li.appendChild(block1Submenu);
    menu.appendChild(block1Li);

    // Вешаем обработчики на все ссылки меню
    document.querySelectorAll('.sidebar-menu a[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.section);
        });
    });
}

/** Подсвечивает активный пункт меню */
function updateSidebarActive(section) {
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    const link = document.querySelector('[data-section="' + section + '"]');
    if (link) link.classList.add('active');
    updateSidebarProgress();
}

// Делегирование кликов внутри основной области (чтобы не вешать обработчики на каждую ссылку)
document.getElementById('dynamic-content').addEventListener('click', (e) => {
    const target = e.target.closest('a[data-section]');
    if (target) {
        e.preventDefault();
        navigateTo(target.dataset.section);
    }
});

// ---------- СТАРТ ПРИЛОЖЕНИЯ ----------
buildSidebarMenu();
navigateTo('intro');   // при загрузке всегда показываем введение