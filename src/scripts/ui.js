export let statusEl, resultArea, possiblePointLog, pointLogList, segmentLogList, derivedSegmentLog, analysisLog;
export let pointBtns, clearBtn, undoBtn, checkBtn, hintBtn, hintBar;
export let pointerBtn, lineBtn, pointsBtn, eraserBtn, pointButtonsContainer;

export function initUI(prefix) {
    statusEl = document.getElementById('status');
    resultArea = document.getElementById('resultArea');
    possiblePointLog = document.querySelector('.possiblePointLog');
    pointLogList = document.querySelector('.pointLogList');
    segmentLogList = document.querySelector('.segmentLogList');
    derivedSegmentLog = document.querySelector('.derivedSegmentLog');
    analysisLog = document.querySelector('.analysisLog');
    pointBtns = document.querySelectorAll('.point-btn');
    clearBtn = document.querySelector('.clearBtn');
    undoBtn = document.querySelector('.undoBtn');
    checkBtn = document.querySelector('.checkBtn');
    hintBtn = document.querySelector('.hintBtn');
    hintBar = document.querySelector('.hintBar');
    pointerBtn = document.querySelector('.pointerBtn');
    lineBtn = document.querySelector('.lineBtn');
    pointsBtn = document.querySelector('.pointsBtn');
    eraserBtn = document.querySelector('.eraserBtn');
    pointButtonsContainer = document.getElementById('pointButtonsContainer');
    console.log('initUI: pointButtonsContainer =', pointButtonsContainer);
}

export function setStatus(text) { if (statusEl) statusEl.innerHTML = text; }
export function updatePossiblePointLog(points) {
    if (!possiblePointLog) return;
    possiblePointLog.innerHTML = '';
    if (!points.length) { possiblePointLog.innerHTML = '<li class="empty-log">Пока нет возможных точек</li>'; return; }
    for (let p of points) { const li = document.createElement('li'); li.textContent = p.id + ' (' + Math.round(p.x) + ', ' + Math.round(p.y) + ')'; possiblePointLog.appendChild(li); }
}
export function addNamedPointLog(label, x, y) {
    if (!pointLogList) return;
    const empty = pointLogList.querySelector('.empty-log'); if (empty) empty.remove();
    const li = document.createElement('li');
    li.textContent = '[' + new Date().toLocaleTimeString() + '] ' + label + ' (' + Math.round(x) + ', ' + Math.round(y) + ')';
    pointLogList.appendChild(li); pointLogList.scrollTop = pointLogList.scrollHeight;
}
export function removeLastNamedPointLog() {
    if (!pointLogList) return;
    const items = pointLogList.querySelectorAll('li:not(.empty-log)');
    if (items.length) items[items.length - 1].remove();
    if (!pointLogList.querySelectorAll('li:not(.empty-log)').length) pointLogList.innerHTML = '<li class="empty-log">Пока нет точек</li>';
}
export function clearNamedPointLog() { if (pointLogList) pointLogList.innerHTML = '<li class="empty-log">Пока нет точек</li>'; }
export function updateSegmentLog(segs, getInfo) {
    if (!segmentLogList) return;
    segmentLogList.innerHTML = '';
    if (!segs.length) { segmentLogList.innerHTML = '<li class="empty-log">Пока нет отрезков</li>'; return; }
    for (let s of segs) {
        const a = getInfo(s.x1, s.y1), b = getInfo(s.x2, s.y2);
        const nameA = a.letter ? a.tId + '(' + a.letter + ')' : a.tId;
        const nameB = b.letter ? b.tId + '(' + b.letter + ')' : b.tId;
        const li = document.createElement('li');
        li.textContent = nameA + '-' + nameB + '  (' + Math.round(s.x1) + ',' + Math.round(s.y1) + ') → (' + Math.round(s.x2) + ',' + Math.round(s.y2) + ')';
        segmentLogList.appendChild(li);
    }
}
export function removeLastSegmentLog() {
    if (!segmentLogList) return;
    const items = segmentLogList.querySelectorAll('li:not(.empty-log)');
    if (items.length) items[items.length - 1].remove();
    if (!segmentLogList.querySelectorAll('li:not(.empty-log)').length) segmentLogList.innerHTML = '<li class="empty-log">Пока нет отрезков</li>';
}
export function updateDerivedSegmentLog(derived) {
    if (!derivedSegmentLog) return;
    if (!Array.isArray(derived)) derived = [];
    derivedSegmentLog.innerHTML = '';
    if (!derived.length) { derivedSegmentLog.innerHTML = '<li class="empty-log">Пока нет производных отрезков</li>'; return; }
    for (let s of derived) {
        const li = document.createElement('li');
        li.textContent = s.name1 + '-' + s.name2 + '  (' + Math.round(s.x1) + ',' + Math.round(s.y1) + ') → (' + Math.round(s.x2) + ',' + Math.round(s.y2) + ')';
        derivedSegmentLog.appendChild(li);
    }
}
export function clearSegmentLog() {
    if (segmentLogList) segmentLogList.innerHTML = '<li class="empty-log">Пока нет отрезков</li>';
    if (derivedSegmentLog) derivedSegmentLog.innerHTML = '<li class="empty-log">Пока нет производных отрезков</li>';
}
export function setAnalysis(items) {
    if (!analysisLog) return;
    analysisLog.innerHTML = '';
    if (!items || !items.length) { analysisLog.innerHTML = '<li class="empty-log">Нет данных для анализа</li>'; return; }
    for (let item of items) { const li = document.createElement('li'); li.textContent = item; analysisLog.appendChild(li); }
}
export function setResult(text) { if (resultArea) resultArea.textContent = text; }
export function clearAnalysis() { if (analysisLog) analysisLog.innerHTML = ''; if (resultArea) resultArea.textContent = ''; }
export function getActivePointBtn() { return document.querySelector('.point-btn.active'); }
export function setActivePointBtn(label) {
    pointBtns.forEach(b => b.classList.remove('active'));
    if (label) { const btn = document.querySelector('.point-btn[data-label="' + label + '"]'); if (btn) btn.classList.add('active'); }
}
export function disablePointBtn(label) {
    const btn = document.querySelector('.point-btn[data-label="' + label + '"]');
    if (btn) { btn.disabled = true; btn.classList.remove('active'); }
}
export function enablePointBtn(label) {
    const btn = document.querySelector('.point-btn[data-label="' + label + '"]');
    if (btn) btn.disabled = false;
}
export function resetAllButtons() { pointBtns.forEach(b => { b.disabled = false; b.classList.remove('active'); }); }
export function startHintTimer(duration, onTick, onComplete) {
    let remaining = duration;
    hintBtn.disabled = true; hintBtn.textContent = '💡 Подсказка (' + remaining + ')'; hintBar.style.width = '0%';
    const interval = setInterval(() => {
        remaining--;
        const progress = ((duration - remaining) / duration) * 100;
        hintBar.style.width = progress + '%'; hintBtn.textContent = '💡 Подсказка (' + remaining + ')';
        if (remaining <= 0) {
            clearInterval(interval);
            hintBtn.disabled = false; hintBtn.textContent = '💡 Подсказка'; hintBar.style.width = '100%';
            if (onComplete) onComplete();
        }
        if (onTick) onTick(remaining);
    }, 1000);
}

// Инструменты
export function setPointerActive() {
    if (pointerBtn) pointerBtn.classList.add('active');
    if (lineBtn) lineBtn.classList.remove('active');
    if (pointsBtn) pointsBtn.classList.remove('active');
    if (eraserBtn) eraserBtn.classList.remove('active');
    if (pointButtonsContainer) pointButtonsContainer.classList.remove('visible');
}
export function setLineActive() {
    if (lineBtn) lineBtn.classList.add('active');
    if (pointerBtn) pointerBtn.classList.remove('active');
    if (pointsBtn) pointsBtn.classList.remove('active');
    if (eraserBtn) eraserBtn.classList.remove('active');
    if (pointButtonsContainer) pointButtonsContainer.classList.remove('visible');
}
export function setPointsActive() {
    console.log('setPointsActive вызвана');
    if (pointsBtn) pointsBtn.classList.add('active');
    if (pointerBtn) pointerBtn.classList.remove('active');
    if (lineBtn) lineBtn.classList.remove('active');
    if (eraserBtn) eraserBtn.classList.remove('active');
    if (pointButtonsContainer) {
        pointButtonsContainer.classList.add('visible');
        pointButtonsContainer.style.display = 'flex';   // принудительно
        console.log('Контейнер точек: classList=', pointButtonsContainer.classList);
        console.log('Контейнер точек: style.display=', pointButtonsContainer.style.display);
        console.log('Контейнер точек: размеры', pointButtonsContainer.offsetWidth, pointButtonsContainer.offsetHeight);
        console.log('Контейнер точек: children=', pointButtonsContainer.children.length);
    } else {
        console.error('pointButtonsContainer не найден!');
    }
}
export function setEraserActive() {
    if (eraserBtn) eraserBtn.classList.add('active');
    if (pointerBtn) pointerBtn.classList.remove('active');
    if (lineBtn) lineBtn.classList.remove('active');
    if (pointsBtn) pointsBtn.classList.remove('active');
    if (pointButtonsContainer) pointButtonsContainer.classList.remove('visible');
}
export function resetTools() {
    if (pointerBtn) pointerBtn.classList.remove('active');
    if (lineBtn) lineBtn.classList.remove('active');
    if (pointsBtn) pointsBtn.classList.remove('active');
    if (eraserBtn) eraserBtn.classList.remove('active');
    if (pointButtonsContainer) pointButtonsContainer.classList.remove('visible');
}

export function populatePointButtons(letters) {
    console.log('populatePointButtons вызвана с буквами:', letters);
    if (!pointButtonsContainer) {
        console.error('populatePointButtons: контейнер не найден!');
        return;
    }
    pointButtonsContainer.innerHTML = '';
    letters.forEach(letter => {
        const btn = document.createElement('button');
        btn.className = 'point-btn';
        btn.dataset.label = letter;
        btn.textContent = letter;
        pointButtonsContainer.appendChild(btn);
    });
    pointBtns = document.querySelectorAll('.point-btn');
    console.log('Добавлены кнопки:', letters, 'всего кнопок:', pointButtonsContainer.children.length);
}
