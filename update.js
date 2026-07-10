const fs = require('fs');
const path = require('path');

const PROJECT_DIR = __dirname;

const files = {
    // ===== server.js =====
    'server.js':
`const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  urlPath = decodeURIComponent(urlPath);

  if (urlPath.includes('..')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (urlPath.endsWith('/')) {
    urlPath += 'index.html';
  }

  const filePath = path.join(ROOT_DIR, urlPath);
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
      return;
    }
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(\`✅ Сервер запущен: http://localhost:\${PORT}\`);
  console.log('   Для остановки нажмите Ctrl+C');
});
`,

    // ===== index.html =====
    'index.html':
`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Справиться с математикой. Осваиваем геометрию</title>
    <link rel="stylesheet" href="src/styles/main.css">
</head>
<body>
    <div class="app-container">
        <nav class="sidebar">
            <div class="sidebar-header">📐 Геометрия</div>
            <ul class="sidebar-menu" id="sidebar-menu"></ul>
        </nav>
        <main class="content">
            <div id="dynamic-content"></div>
        </main>
    </div>
    <script type="module" src="src/scripts/main.js"></script>
</body>
</html>`,

    // ===== main.css =====
    'src/styles/main.css':
`* { box-sizing: border-box; }
body { margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f0f0; }
.app-container { display: flex; min-height: 100vh; }
.sidebar { width: 280px; background: #2c3e50; color: white; padding: 20px 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.sidebar-header { font-size: 20px; font-weight: bold; padding: 0 20px 20px; border-bottom: 1px solid #4a6278; margin-bottom: 10px; }
.sidebar-menu { list-style: none; padding: 0; margin: 0; }
.sidebar-menu li a { display: block; padding: 10px 20px; color: #ecf0f1; text-decoration: none; transition: background 0.2s; }
.sidebar-menu li a:hover { background: #34495e; }
.sidebar-menu li a.active { background: #3498db; color: white; font-weight: bold; }
.sidebar-menu li a.completed::after { content: " ✅"; font-size: 12px; }
.block-title { font-weight: bold; margin-top: 10px; }
.submenu { list-style: none; padding-left: 20px; margin: 0; }
.submenu li a { font-size: 14px; padding: 8px 20px; }
.content { flex: 1; padding: 30px; background: white; margin: 20px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow-y: auto; }
.header { text-align: center; margin-bottom: 20px; }
.task-title { font-size: 24px; font-weight: 600; color: #2c3e50; margin: 0; padding: 10px; background: #ecf0f1; border-radius: 8px; line-height: 1.4; }
.task-subtitle { font-size: 18px; font-weight: 500; color: #e74c3c; margin: 8px 0 0 0; padding: 10px; background: #ecf0f1; border-radius: 8px; line-height: 1.4; }
.workspace { display: flex; gap: 20px; justify-content: center; align-items: flex-start; flex-wrap: wrap; }
.left-buttons { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; min-width: 120px; }
.left-buttons button { padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; text-align: left; }
.undoBtn { background: #f39c12; color: white; }
.undoBtn:hover:not(:disabled) { background: #d68910; }
.clearBtn { background: #e74c3c; color: white; }
.clearBtn:hover:not(:disabled) { background: #c0392b; }
.pointerBtn { background: #95a5a6; color: white; }
.pointerBtn.active { background: #7f8c8d; box-shadow: 0 0 0 2px #fff, 0 0 0 4px #7f8c8d; }
.eraserBtn { background: #e67e22; color: white; }
.eraserBtn.active { background: #d35400; box-shadow: 0 0 0 2px #fff, 0 0 0 4px #d35400; }
.lineBtn { background: #2ecc71; color: white; }
.lineBtn.active { background: #27ae60; box-shadow: 0 0 0 2px #fff, 0 0 0 4px #27ae60; }
.pointsBtn { background: #3498db; color: white; }
.pointsBtn.active { background: #2980b9; box-shadow: 0 0 0 2px #fff, 0 0 0 4px #2980b9; }
.point-buttons-container {
    display: none; flex-direction: column; gap: 5px; margin-top: 5px;
    background: #f0f0f0; padding: 8px; border-radius: 6px;
}
.point-buttons-container.visible { display: flex; }
.point-buttons-container .point-btn { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #3498db; background: white; color: #3498db; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
.point-buttons-container .point-btn:hover:not(:disabled) { background: #3498db; color: white; }
.point-buttons-container .point-btn.active { background: #f39c12; border-color: #f39c12; color: white; }
.point-buttons-container .point-btn:disabled { opacity: 0.5; cursor: not-allowed; background: #bdc3c7; border-color: #95a5a6; }
.canvas-wrapper { display: flex; flex-direction: column; align-items: center; position: relative; }
canvas { border: 1px solid #ccc; cursor: crosshair; display: block; background: white; user-select: none; }
.info { margin-top: 10px; font-size: 14px; color: #555; min-height: 24px; }
.right-buttons { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
.right-buttons button { padding: 6px 12px; border: none; color: white; border-radius: 4px; cursor: pointer; transition: background 0.2s; font-size: 14px; min-width: 100px; }
.checkBtn { background: #27ae60; }
.checkBtn:hover:not(:disabled) { background: #229954; }
.hintBtn { background: #8e44ad; }
.hintBtn:hover:not(:disabled) { background: #7d3c98; }
.hintBtn:disabled { opacity: 0.5; cursor: not-allowed; }
.hintProgress { width: 100%; height: 4px; background: #eee; border-radius: 2px; margin-top: 4px; }
.hintBar { width: 0%; height: 100%; background: #f39c12; border-radius: 2px; transition: width 0.3s; }
.right-panel { flex: 1 1 300px; min-width: 200px; display: flex; flex-direction: column; gap: 15px; }
.log-section { background: #f8f9fa; border-radius: 8px; padding: 10px 14px; box-shadow: inset 0 0 6px rgba(0,0,0,0.05); max-height: 180px; overflow-y: auto; }
.log-section h2 { margin-top: 0; font-size: 15px; color: #2c3e50; border-bottom: 2px solid #ddd; padding-bottom: 4px; }
.possiblePointLog, .pointLogList, .segmentLogList, .derivedSegmentLog, .analysisLog { list-style: none; padding: 0; margin: 4px 0 0 0; font-size: 12px; font-family: 'Courier New', monospace; }
.possiblePointLog li, .pointLogList li, .segmentLogList li, .derivedSegmentLog li, .analysisLog li { padding: 2px 0; border-bottom: 1px solid #eee; color: #2c3e50; }
.empty-log { color: #999; font-style: italic; border-bottom: none !important; }
.result-area { margin-top: 20px; padding: 15px 20px; background: #fef9e7; border: 2px solid #f39c12; border-radius: 8px; font-size: 20px; font-weight: bold; color: #2c3e50; min-height: 60px; width: 100%; box-sizing: border-box; }
@media (max-width: 1100px) { .app-container { flex-direction: column; } .sidebar { width: 100%; height: auto; position: relative; } .content { margin: 10px; } }`,

    // ===== canvas.js =====
    'src/scripts/canvas.js':
`export let canvas = null;
export let ctx = null;
export let W = 0;
export let H = 0;

export function initCanvas(canvasElement) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    W = canvas.width;
    H = canvas.height;
}

export function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}`,

    // ===== grid.js =====
    'src/scripts/grid.js':
`import { ctx, W, H } from './canvas.js';
export const GRID_SIZE = 30;
export function snapToGrid(coord) { return Math.round(coord / GRID_SIZE) * GRID_SIZE; }
export function isInsideCanvas(x, y) { return x >= 0 && x <= W && y >= 0 && y <= H; }
export function drawGrid() {
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
}`,

    // ===== possiblePoints.js =====
    'src/scripts/possiblePoints.js':
`import { ctx } from './canvas.js';
export let possiblePoints = [];
let nextId = 1;
export function clearPossiblePoints() { possiblePoints = []; nextId = 1; }
function addPossiblePoint(x, y, tolerance = 1) {
    for (let p of possiblePoints) if (Math.abs(p.x - x) < tolerance && Math.abs(p.y - y) < tolerance) return;
    possiblePoints.push({ id: 'T' + nextId, x, y }); nextId++;
}
export function updatePossiblePoints(segments) {
    clearPossiblePoints();
    for (let seg of segments) { addPossiblePoint(seg.x1, seg.y1); addPossiblePoint(seg.x2, seg.y2); }
    for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
            const p = segmentIntersection(segments[i], segments[j]);
            if (p) addPossiblePoint(p.x, p.y);
        }
    }
    possiblePoints.sort((a, b) => parseInt(a.id.slice(1)) - parseInt(b.id.slice(1)));
}
function segmentIntersection(s1, s2) {
    const x1 = s1.x1, y1 = s1.y1, x2 = s1.x2, y2 = s1.y2;
    const x3 = s2.x1, y3 = s2.y1, x4 = s2.x2, y4 = s2.y2;
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
    return null;
}
export function findClosestPossiblePoint(x, y, maxDist = 25) {
    let best = null, bestDist = Infinity;
    for (let p of possiblePoints) {
        const dx = p.x - x, dy = p.y - y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < bestDist && dist <= maxDist) { bestDist = dist; best = p; }
    }
    return best;
}
export function drawPossiblePoints() {
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
    for (let p of possiblePoints) {
        const s = 4;
        ctx.beginPath(); ctx.moveTo(p.x - s, p.y - s); ctx.lineTo(p.x + s, p.y + s);
        ctx.moveTo(p.x + s, p.y - s); ctx.lineTo(p.x - s, p.y + s); ctx.stroke();
        ctx.fillStyle = '#888'; ctx.font = '10px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText(p.id, p.x + 6, p.y - 2);
    }
    ctx.restore();
}`,

    // ===== points.js =====
    'src/scripts/points.js':
`import { ctx } from './canvas.js';
export let namedPoints = [];
export function addNamedPoint(label, x, y) { namedPoints.push({ label, x, y }); }
export function removeLastNamedPoint() { return namedPoints.length > 0 ? namedPoints.pop() : null; }
export function clearNamedPoints() { namedPoints = []; }
export function drawNamedPoints() {
    if (!ctx) return;
    ctx.save();
    ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let p of namedPoints) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI); ctx.fillStyle = 'black'; ctx.fill();
        ctx.fillStyle = 'black'; ctx.fillText(p.label, p.x + 14, p.y - 12);
    }
    ctx.restore();
}`,

    // ===== segments.js =====
    'src/scripts/segments.js':
`import { ctx } from './canvas.js';
export let segments = [];
export function addSegment(x1, y1, x2, y2) { segments.push({ x1, y1, x2, y2 }); }
export function removeLastSegment() { return segments.length > 0 ? segments.pop() : null; }
export function clearSegments() { segments = []; }
export function drawAllSegments() {
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 2;
    for (let seg of segments) { ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2); ctx.stroke(); }
    ctx.restore();
}`,

    // ===== ui.js (полный, с функциями для точек) =====
    'src/scripts/ui.js':
`export let statusEl, resultArea, possiblePointLog, pointLogList, segmentLogList, derivedSegmentLog, analysisLog;
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
    hidePointContainer();
}
export function setLineActive() {
    if (lineBtn) lineBtn.classList.add('active');
    if (pointerBtn) pointerBtn.classList.remove('active');
    if (pointsBtn) pointsBtn.classList.remove('active');
    if (eraserBtn) eraserBtn.classList.remove('active');
    hidePointContainer();
}
export function setPointsActive() {
    if (pointsBtn) pointsBtn.classList.add('active');
    if (pointerBtn) pointerBtn.classList.remove('active');
    if (lineBtn) lineBtn.classList.remove('active');
    if (eraserBtn) eraserBtn.classList.remove('active');
    showPointContainer();
}
export function setEraserActive() {
    if (eraserBtn) eraserBtn.classList.add('active');
    if (pointerBtn) pointerBtn.classList.remove('active');
    if (lineBtn) lineBtn.classList.remove('active');
    if (pointsBtn) pointsBtn.classList.remove('active');
    hidePointContainer();
}
export function resetTools() {
    if (pointerBtn) pointerBtn.classList.remove('active');
    if (lineBtn) lineBtn.classList.remove('active');
    if (pointsBtn) pointsBtn.classList.remove('active');
    if (eraserBtn) eraserBtn.classList.remove('active');
    hidePointContainer();
}

function showPointContainer() {
    if (!pointButtonsContainer) return;
    pointButtonsContainer.classList.add('visible');
    pointButtonsContainer.style.display = 'flex';
}
function hidePointContainer() {
    if (!pointButtonsContainer) return;
    pointButtonsContainer.classList.remove('visible');
    pointButtonsContainer.style.display = '';
}

export function populatePointButtons(letters) {
    if (!pointButtonsContainer) return;
    pointButtonsContainer.innerHTML = '';
    letters.forEach(letter => {
        const btn = document.createElement('button');
        btn.className = 'point-btn';
        btn.dataset.label = letter;
        btn.textContent = letter;
        pointButtonsContainer.appendChild(btn);
    });
    pointBtns = document.querySelectorAll('.point-btn');
}
`,

    // ===== taskConfig.js (исправленный) =====
    'src/scripts/taskConfig.js':
`export const lessons = {
    'lesson1-1': {
        title: 'Занятие 1. Знакомство с редактором',
        intro: '<h2>Введение</h2><p>Здесь вы научитесь пользоваться редактором: рисовать отрезки, проверять пересечения и получать подсказки.</p>',
        tasks: [
            { id: 'lesson1-1-task1', title: 'Задание 1. Два отрезка', taskConfigId: 'task1-1' },
            { id: 'lesson1-1-task2', title: 'Задание 2. Треугольник', taskConfigId: 'task1-2' }
        ]
    },
    'lesson1-2': {
        title: 'Занятие 2. Самостоятельный чертёж',
        intro: '<h2>Введение</h2><p>Теперь попробуйте самостоятельно нарисовать чертёж по описанию.</p>',
        tasks: [
            { id: 'lesson1-2-task1', title: 'Задание 1. Пересекающиеся отрезки', taskConfigId: 'task1-1' },
            { id: 'lesson1-2-task2', title: 'Задание 2. Ещё один чертёж', taskConfigId: 'task1-1' }
        ]
    }
};

function mergeSegments(segments) {
    if (segments.length === 0) return [];
    const groups = [];
    const used = new Array(segments.length).fill(false);
    for (let i = 0; i < segments.length; i++) {
        if (used[i]) continue;
        const seg = segments[i];
        const group = [seg];
        used[i] = true;
        const angle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
        for (let j = i + 1; j < segments.length; j++) {
            if (used[j]) continue;
            const other = segments[j];
            const otherAngle = Math.atan2(other.y2 - other.y1, other.x2 - other.x1);
            if (Math.abs(angle - otherAngle) < 0.001 || Math.abs(angle - otherAngle + Math.PI) < 0.001 || Math.abs(angle - otherAngle - Math.PI) < 0.001) {
                const dist = distancePointToLine(seg.x1, seg.y1, other.x1, other.y1, other.x2, other.y2);
                if (dist < 2) {
                    group.push(other);
                    used[j] = true;
                }
            }
        }
        groups.push(group);
    }

    const merged = [];
    for (const group of groups) {
        if (group.length === 1) {
            merged.push({ ...group[0] });
            continue;
        }
        let points = [];
        for (const seg of group) {
            points.push({ x: seg.x1, y: seg.y1 });
            points.push({ x: seg.x2, y: seg.y2 });
        }
        const dx = group[0].x2 - group[0].x1;
        const dy = group[0].y2 - group[0].y1;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        points.sort((a, b) => {
            const projA = a.x * ux + a.y * uy;
            const projB = b.x * ux + b.y * uy;
            return projA - projB;
        });
        const filtered = [points[0]];
        for (let i = 1; i < points.length; i++) {
            const last = filtered[filtered.length - 1];
            if (Math.hypot(points[i].x - last.x, points[i].y - last.y) > 2) {
                filtered.push(points[i]);
            }
        }
        if (filtered.length >= 2) {
            merged.push({
                x1: filtered[0].x, y1: filtered[0].y,
                x2: filtered[filtered.length - 1].x, y2: filtered[filtered.length - 1].y
            });
        } else {
            merged.push({ ...group[0] });
        }
    }
    return merged;
}

function distancePointToLine(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len === 0) return Math.hypot(px - x1, py - y1);
    return Math.abs((py - y1)*dx - (px - x1)*dy) / len;
}

export const tasks = {
    'task1-1': {
        letters: ['A', 'B', 'C', 'D'],
        check(segments, namedPoints) {
            const merged = mergeSegments(segments);
            if (merged.length !== 2) {
                return {
                    result: 'Должно получиться ровно два отрезка.',
                    analysis: ['❌ После объединения отрезков на одной прямой должно остаться два отрезка. Сейчас их ' + merged.length + '.']
                };
            }

            const [s1, s2] = merged;
            const intersect = (function() {
                const denom = (s1.x1 - s1.x2)*(s2.y1 - s2.y2) - (s1.y1 - s1.y2)*(s2.x1 - s2.x2);
                if (Math.abs(denom) < 1e-10) return false;
                const t = ((s1.x1 - s2.x1)*(s2.y1 - s2.y2) - (s1.y1 - s2.y1)*(s2.x1 - s2.x2)) / denom;
                const u = -((s1.x1 - s1.x2)*(s1.y1 - s2.y1) - (s1.y1 - s1.y2)*(s1.x1 - s2.x1)) / denom;
                return t >= 0 && t <= 1 && u >= 0 && u <= 1;
            })();

            if (!intersect) {
                return { result: 'Отрезки не пересекаются.', analysis: ['❌ Отрезки должны пересекаться.'] };
            }

            if (!namedPoints || namedPoints.length !== 4) {
                return { result: 'Расставьте точки A, B, C, D.', analysis: ['❌ Должно быть 4 именованные точки.'] };
            }
            const labels = namedPoints.map(p => p.label).sort().join(',');
            if (labels !== 'A,B,C,D') {
                return { result: 'Используйте точки A, B, C, D.', analysis: ['❌ Ожидаются точки A, B, C, D.'] };
            }

            const getLabel = (x, y) => {
                for (let np of namedPoints) if (Math.abs(np.x - x) < 1 && Math.abs(np.y - y) < 1) return np.label;
                return null;
            };
            const ends1 = [getLabel(s1.x1, s1.y1), getLabel(s1.x2, s1.y2)].sort().join(',');
            const ends2 = [getLabel(s2.x1, s2.y1), getLabel(s2.x2, s2.y2)].sort().join(',');
            const validPairs = ['A,B', 'C,D'];
            if (!validPairs.includes(ends1) || !validPairs.includes(ends2) || ends1 === ends2) {
                return { result: 'Точки A,B должны быть на одном отрезке, C,D – на другом.', analysis: ['❌ Неправильное распределение точек.'] };
            }

            return { result: '✅ Задача выполнена! Отрезки AB и CD пересекаются.', analysis: ['✅ Два пересекающихся отрезка с правильными точками.'] };
        },
        hint(segments) {
            const merged = mergeSegments(segments);
            if (merged.length === 0) return { result: 'Нарисуйте первый отрезок.', analysis: ['ℹ️ Начните с первого отрезка.'] };
            if (merged.length === 1) return { result: 'Нарисуйте второй отрезок.', analysis: ['ℹ️ Добавьте ещё один отрезок.'] };
            if (merged.length >= 2) {
                const [s1, s2] = merged;
                const intersect = (function() {
                    const denom = (s1.x1 - s1.x2)*(s2.y1 - s2.y2) - (s1.y1 - s1.y2)*(s2.x1 - s2.x2);
                    if (Math.abs(denom) < 1e-10) return false;
                    const t = ((s1.x1 - s2.x1)*(s2.y1 - s2.y2) - (s1.y1 - s2.y1)*(s2.x1 - s2.x2)) / denom;
                    const u = -((s1.x1 - s1.x2)*(s1.y1 - s2.y1) - (s1.y1 - s1.y2)*(s1.x1 - s2.x1)) / denom;
                    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
                })();
                if (!intersect) return { result: 'Отрезки не пересекаются.', analysis: ['❌ Два отрезка не пересекаются.'] };
                return { result: 'Отлично! Теперь нажмите «Точки» и расставьте A, B, C, D по концам отрезков.', analysis: ['✅ Осталось только обозначить вершины.'] };
            }
            return { result: 'Оставьте только два отрезка.', analysis: ['⚠️ Слишком много отрезков.'] };
        }
    },
    'task1-2': {
        letters: ['A', 'B', 'C'],
        check(segments, namedPoints) {
            if (segments.length !== 3) return { result: 'Должно быть ровно три отрезка.', analysis: ['❌ Количество отрезков не равно трём.'] };
            const points = new Map();
            for (let seg of segments) {
                const key1 = seg.x1 + ',' + seg.y1;
                const key2 = seg.x2 + ',' + seg.y2;
                points.set(key1, (points.get(key1) || 0) + 1);
                points.set(key2, (points.get(key2) || 0) + 1);
            }
            let isValid = true;
            for (let count of points.values()) if (count !== 2) { isValid = false; break; }
            if (!isValid) return { result: 'Отрезки не образуют треугольник.', analysis: ['❌ Концы отрезков должны попарно совпадать.'] };
            if (!namedPoints || namedPoints.length !== 3) return { result: 'Расставьте точки A, B, C.', analysis: ['❌ Нужно поставить три именованные точки.'] };
            const labels = namedPoints.map(p => p.label).sort();
            if (labels.join(',') !== 'A,B,C') return { result: 'Используйте точки A, B, C.', analysis: ['❌ Ожидаются точки A, B, C.'] };
            return { result: '✅ Треугольник ABC построен!', analysis: ['✅ Треугольник с вершинами A, B, C.'] };
        },
        hint(segments) {
            if (segments.length < 3) return { result: 'Постройте три отрезка, соединяющие три точки.', analysis: ['ℹ️ Нужно три отрезка.'] };
            if (segments.length > 3) return { result: 'Оставьте только три отрезка.', analysis: ['⚠️ Слишком много отрезков.'] };
            const points = new Map();
            for (let seg of segments) {
                const key1 = seg.x1 + ',' + seg.y1;
                const key2 = seg.x2 + ',' + seg.y2;
                points.set(key1, (points.get(key1) || 0) + 1);
                points.set(key2, (points.get(key2) || 0) + 1);
            }
            if (points.size !== 3) return { result: 'Три отрезка должны иметь общие концы.', analysis: ['ℹ️ Должно быть три уникальные точки.'] };
            return { result: 'Отлично! Теперь нажмите «Точки» и расставьте A, B, C по вершинам.', analysis: ['✅ Осталось только обозначить вершины.'] };
        }
    }
};`,

    // ===== progress.js =====
    'src/scripts/progress.js':
`const PROGRESS_KEY = 'geometry-progress-v1';
const APP_STATE_KEY = 'geometry-app-state-v1';

export function loadProgress() {
    try { const raw = localStorage.getItem(PROGRESS_KEY); return raw ? JSON.parse(raw) : { completedLessons: [] }; }
    catch (e) { console.error('Ошибка загрузки прогресса:', e); return { completedLessons: [] }; }
}
export function saveProgress(progress) { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch (e) { console.error('Ошибка сохранения прогресса:', e); } }
export function markLessonCompleted(lessonId) {
    const progress = loadProgress();
    if (!progress.completedLessons.includes(lessonId)) { progress.completedLessons.push(lessonId); saveProgress(progress); return true; }
    return false;
}
export function isLessonCompleted(lessonId) { const progress = loadProgress(); return progress.completedLessons.includes(lessonId); }
export function saveAppState(appState) { try { localStorage.setItem(APP_STATE_KEY, JSON.stringify(appState)); } catch (e) { console.error('Ошибка сохранения состояния холстов:', e); } }
export function loadAppState() {
    try { const raw = localStorage.getItem(APP_STATE_KEY); return raw ? JSON.parse(raw) : {}; }
    catch (e) { console.error('Ошибка загрузки состояния холстов:', e); return {}; }
}`,

    // ===== drawing.js (полный, без изменений) =====
    'src/scripts/drawing.js':
`import { canvas, ctx, W, H, getMousePos } from './canvas.js';
import { drawGrid, snapToGrid, isInsideCanvas } from './grid.js';
import {
    possiblePoints, updatePossiblePoints, findClosestPossiblePoint,
    drawPossiblePoints, clearPossiblePoints
} from './possiblePoints.js';
import {
    namedPoints, addNamedPoint, clearNamedPoints, drawNamedPoints
} from './points.js';
import {
    segments, addSegment, removeLastSegment, clearSegments, drawAllSegments
} from './segments.js';
import {
    setStatus, updatePossiblePointLog, updateSegmentLog,
    removeLastSegmentLog, clearSegmentLog, updateDerivedSegmentLog,
    setAnalysis, setResult, clearAnalysis,
    getActivePointBtn, setActivePointBtn, disablePointBtn, enablePointBtn,
    resetAllButtons, startHintTimer,
    clearNamedPointLog,
    setPointerActive, setLineActive, setPointsActive, setEraserActive, resetTools, populatePointButtons
} from './ui.js';

console.log('🔧 drawing.js загружен');

let startPoint = null;
let endPoint = null;
let actionHistory = [];
const MAX_HISTORY = 100;
let activeLabel = null;

let dragMode = 'none';
let dragPoint = null;
let dragSegment = null;
let dragStartPos = null;
let originalSegmentCoords = null;
let dragOriginalSegmentStates = [];
let mouseDownPos = null;
let isDragging = false;

let currentTool = 'pointer';
let allowedLetters = [];

let eraserHoverTarget = null;

const POINT_GRAB_RADIUS = 12;
const SEGMENT_GRAB_RADIUS = 10;

// ===================== Вспомогательные функции =====================
function getPointFullName(x, y) {
    let tId = '?', letter = null;
    for (let pp of possiblePoints) if (Math.abs(pp.x - x) < 1 && Math.abs(pp.y - y) < 1) { tId = pp.id; break; }
    for (let np of namedPoints) if (Math.abs(np.x - x) < 1 && Math.abs(np.y - y) < 1) { letter = np.label; break; }
    return { tId, letter };
}
function getDerivedSegments() {
    try {
        const derived = [];
        if (!segments || !possiblePoints) return derived;
        for (let seg of segments) {
            const pts = [];
            for (let p of possiblePoints) if (isPointOnSegment(p, seg)) pts.push({x: p.x, y: p.y, id: p.id});
            const uniq = [], seen = new Set();
            for (let p of pts) { const k = p.x+','+p.y; if (!seen.has(k)) { seen.add(k); uniq.push(p); } }
            const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
            uniq.sort((a,b) => (dx!==0?(a.x-seg.x1)/dx:(a.y-seg.y1)/dy) - (dx!==0?(b.x-seg.x1)/dx:(b.y-seg.y1)/dy));
            for (let i=0; i<uniq.length-1; i++) {
                const p1=uniq[i], p2=uniq[i+1];
                const f1=getPointFullName(p1.x,p1.y), f2=getPointFullName(p2.x,p2.y);
                derived.push({
                    x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,
                    name1: f1.letter ? f1.tId+'('+f1.letter+')' : f1.tId,
                    name2: f2.letter ? f2.tId+'('+f2.letter+')' : f2.tId
                });
            }
        }
        return derived;
    } catch (e) { console.error(e); return []; }
}
function isPointOnSegment(p, seg) {
    const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
    const len2 = dx*dx + dy*dy;
    if (len2 === 0) return Math.abs(p.x - seg.x1) < 1 && Math.abs(p.y - seg.y1) < 1;
    const t = ((p.x - seg.x1)*dx + (p.y - seg.y1)*dy) / len2;
    if (t < -0.001 || t > 1.001) return false;
    const projX = seg.x1 + t*dx, projY = seg.y1 + t*dy;
    return Math.hypot(p.x - projX, p.y - projY) < 2;
}
function distanceToSegment(px, py, seg) {
    const { x1, y1, x2, y2 } = seg;
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx*dx + dy*dy;
    if (len2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1)*dx + (py - y1)*dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t*dx, projY = y1 + t*dy;
    return Math.hypot(px - projX, py - projY);
}
function findClosestSegment(px, py, maxDist = SEGMENT_GRAB_RADIUS) {
    let best = null, bestDist = Infinity;
    for (let seg of segments) {
        const dist = distanceToSegment(px, py, seg);
        if (dist < bestDist && dist <= maxDist) { bestDist = dist; best = seg; }
    }
    return best;
}
function findClosestNamedPoint(px, py, maxDist = 15) {
    let best = null, bestDist = Infinity;
    for (let np of namedPoints) {
        const dx = px - np.x, dy = py - np.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < bestDist && dist <= maxDist) { bestDist = dist; best = np; }
    }
    return best;
}
function pushHistory(action) {
    actionHistory.push(action);
    if (actionHistory.length > MAX_HISTORY) actionHistory.shift();
}
function snapshotSegments() {
    return segments.map(seg => ({ ...seg }));
}

function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    drawAllSegments();
    drawPossiblePoints();
    drawNamedPoints();
    drawTempSegment();
    drawMarkers();
    if (currentTool === 'eraser' && eraserHoverTarget) {
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        if (eraserHoverTarget.type === 'segment') {
            const seg = eraserHoverTarget.ref;
            ctx.beginPath();
            ctx.moveTo(seg.x1, seg.y1);
            ctx.lineTo(seg.x2, seg.y2);
            ctx.stroke();
        } else if (eraserHoverTarget.type === 'namedPoint') {
            const np = eraserHoverTarget.ref;
            ctx.beginPath();
            ctx.arc(np.x, np.y, 6, 0, 2 * Math.PI);
            ctx.stroke();
        }
        ctx.restore();
    }
}
function drawTempSegment() {
    if (startPoint && endPoint) {
        ctx.save();
        ctx.setLineDash([4,4]); ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(startPoint.x, startPoint.y); ctx.lineTo(endPoint.x, endPoint.y); ctx.stroke();
        ctx.restore();
    }
}
function drawMarkers() {
    ctx.save();
    ctx.fillStyle = '#e74c3c';
    if (startPoint) { ctx.beginPath(); ctx.arc(startPoint.x, startPoint.y, 5, 0, 2*Math.PI); ctx.fill(); }
    if (endPoint) { ctx.beginPath(); ctx.arc(endPoint.x, endPoint.y, 5, 0, 2*Math.PI); ctx.fill(); }
    ctx.restore();
}
function refreshLogs() {
    updatePossiblePointLog(possiblePoints);
    updateSegmentLog(segments, getPointFullName);
    updateDerivedSegmentLog(getDerivedSegments());
}

function onMouseDown(e) {
    const pos = getMousePos(e);
    const px = pos.x, py = pos.y;
    mouseDownPos = { x: px, y: py };
    isDragging = false;

    if (currentTool === 'eraser') {
        const seg = findClosestSegment(px, py, SEGMENT_GRAB_RADIUS);
        if (seg) { deleteSegment(seg); e.preventDefault(); return; }
        const np = findClosestNamedPoint(px, py, 15);
        if (np) { deleteNamedPoint(np); e.preventDefault(); return; }
        dragMode = 'none';
        return;
    }

    if (currentTool === 'point') {
        const closestPoint = findClosestPossiblePoint(px, py, POINT_GRAB_RADIUS);
        if (closestPoint && activeLabel) {
            addNamedPoint(activeLabel, closestPoint.x, closestPoint.y);
            disablePointBtn(activeLabel);
            setActivePointBtn(null);
            activeLabel = null;
            updatePossiblePoints(segments);
            render();
            refreshLogs();
            if (typeof onDrawingChanged === 'function') onDrawingChanged();
            setStatus('Точка ' + activeLabel + ' поставлена в ' + closestPoint.id + ' ✅');
            e.preventDefault();
            return;
        }
        dragMode = 'none';
        return;
    }

    if (currentTool === 'line') {
        dragMode = 'none';
        return;
    }

    if (currentTool === 'pointer') {
        const closestPoint = findClosestPossiblePoint(px, py, POINT_GRAB_RADIUS);
        if (closestPoint) {
            dragMode = 'point';
            dragPoint = closestPoint;
            dragStartPos = { x: snapToGrid(px), y: snapToGrid(py) };
            dragOriginalSegmentStates = [];
            for (let seg of segments) {
                if ((Math.abs(seg.x1 - closestPoint.x) < 1 && Math.abs(seg.y1 - closestPoint.y) < 1) ||
                    (Math.abs(seg.x2 - closestPoint.x) < 1 && Math.abs(seg.y2 - closestPoint.y) < 1)) {
                    dragOriginalSegmentStates.push({
                        seg: seg,
                        x1: seg.x1, y1: seg.y1,
                        x2: seg.x2, y2: seg.y2
                    });
                }
            }
            e.preventDefault();
            return;
        }

        const closestSeg = findClosestSegment(px, py, SEGMENT_GRAB_RADIUS);
        if (closestSeg) {
            dragMode = 'segment';
            dragSegment = closestSeg;
            dragStartPos = { x: snapToGrid(px), y: snapToGrid(py) };
            originalSegmentCoords = { x1: closestSeg.x1, y1: closestSeg.y1, x2: closestSeg.x2, y2: closestSeg.y2 };
            e.preventDefault();
            return;
        }

        const np = findClosestNamedPoint(px, py, 15);
        if (np) {
            dragMode = 'namedPoint';
            dragPoint = np;
            dragStartPos = { x: snapToGrid(px), y: snapToGrid(py) };
            originalSegmentCoords = { x: np.x, y: np.y };
            e.preventDefault();
            return;
        }

        dragMode = 'none';
        return;
    }

    dragMode = 'none';
}
function onMouseMove(e) {
    const pos = getMousePos(e);
    const px = pos.x, py = pos.y;

    if (currentTool === 'eraser') {
        eraserHoverTarget = null;
        const seg = findClosestSegment(px, py, SEGMENT_GRAB_RADIUS);
        if (seg) {
            eraserHoverTarget = { type: 'segment', ref: seg };
        } else {
            const np = findClosestNamedPoint(px, py, 15);
            if (np) eraserHoverTarget = { type: 'namedPoint', ref: np };
        }
        render();
        return;
    } else {
        eraserHoverTarget = null;
    }

    if (mouseDownPos && !isDragging) {
        const dx = px - mouseDownPos.x, dy = py - mouseDownPos.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging = true;
    }

    if (dragMode === 'point' && dragPoint) {
        const snapX = snapToGrid(px), snapY = snapToGrid(py);
        for (let state of dragOriginalSegmentStates) {
            const seg = state.seg;
            if (Math.abs(seg.x1 - dragPoint.x) < 1 && Math.abs(seg.y1 - dragPoint.y) < 1) { seg.x1 = snapX; seg.y1 = snapY; }
            if (Math.abs(seg.x2 - dragPoint.x) < 1 && Math.abs(seg.y2 - dragPoint.y) < 1) { seg.x2 = snapX; seg.y2 = snapY; }
        }
        for (let np of namedPoints) {
            if (Math.abs(np.x - dragPoint.x) < 1 && Math.abs(np.y - dragPoint.y) < 1) {
                np.x = snapX;
                np.y = snapY;
            }
        }
        dragPoint.x = snapX;
        dragPoint.y = snapY;
        updatePossiblePoints(segments);
        render();
        refreshLogs();
    } else if (dragMode === 'segment' && dragSegment) {
        const snapX = snapToGrid(px), snapY = snapToGrid(py);
        const dx = snapX - dragStartPos.x, dy = snapY - dragStartPos.y;
        dragSegment.x1 = originalSegmentCoords.x1 + dx;
        dragSegment.y1 = originalSegmentCoords.y1 + dy;
        dragSegment.x2 = originalSegmentCoords.x2 + dx;
        dragSegment.y2 = originalSegmentCoords.y2 + dy;
        updatePossiblePoints(segments);
        render();
        refreshLogs();
    } else if (dragMode === 'namedPoint' && dragPoint) {
        const snapX = snapToGrid(px), snapY = snapToGrid(py);
        dragPoint.x = snapX;
        dragPoint.y = snapY;
        render();
        refreshLogs();
    }

    if (startPoint && !endPoint && !isDragging && (currentTool === 'line')) {
        endPoint = { x: snapToGrid(px), y: snapToGrid(py) };
        render();
    }
}
function onMouseUp(e) {
    const pos = getMousePos(e);
    const px = pos.x, py = pos.y;

    if (currentTool === 'eraser') { dragMode = 'none'; return; }

    if (isDragging) {
        if (dragMode === 'point') {
            let hasDegenerate = false;
            for (let state of dragOriginalSegmentStates) {
                const seg = state.seg;
                if (Math.abs(seg.x1 - seg.x2) < 1 && Math.abs(seg.y1 - seg.y2) < 1) { hasDegenerate = true; break; }
            }
            if (hasDegenerate) {
                for (let state of dragOriginalSegmentStates) {
                    state.seg.x1 = state.x1; state.seg.y1 = state.y1;
                    state.seg.x2 = state.x2; state.seg.y2 = state.y2;
                }
                updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Нельзя схлопнуть отрезок в точку');
            } else {
                pushHistory({ type: 'move', oldSegments: snapshotSegments(), newSegments: snapshotSegments() });
            }
        } else if (dragMode === 'segment') {
            if (Math.abs(dragSegment.x1 - dragSegment.x2) < 1 && Math.abs(dragSegment.y1 - dragSegment.y2) < 1) {
                dragSegment.x1 = originalSegmentCoords.x1; dragSegment.y1 = originalSegmentCoords.y1;
                dragSegment.x2 = originalSegmentCoords.x2; dragSegment.y2 = originalSegmentCoords.y2;
                updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Нельзя схлопнуть отрезок в точку');
            } else {
                pushHistory({ type: 'move', oldSegments: snapshotSegments(), newSegments: snapshotSegments() });
            }
        } else if (dragMode === 'namedPoint') {
            pushHistory({ type: 'moveNamedPoint', label: dragPoint.label, oldX: originalSegmentCoords.x, oldY: originalSegmentCoords.y, newX: dragPoint.x, newY: dragPoint.y });
        }
        dragMode = 'none'; dragPoint = null; dragSegment = null;
        dragStartPos = null; originalSegmentCoords = null; dragOriginalSegmentStates = [];
        isDragging = false; mouseDownPos = null;
        if (typeof onDrawingChanged === 'function') onDrawingChanged();
        render(); refreshLogs();
        return;
    }

    if (currentTool === 'line' && dragMode === 'none') { handleCanvasClickAt(px, py); }

    dragMode = 'none'; dragPoint = null; dragSegment = null;
    dragStartPos = null; originalSegmentCoords = null; dragOriginalSegmentStates = [];
    isDragging = false; mouseDownPos = null;
}
function handleCanvasClickAt(px, py) {
    if (currentTool !== 'line') return;
    const snapX = snapToGrid(px), snapY = snapToGrid(py);
    if (!isInsideCanvas(snapX, snapY)) { setStatus('Кликни внутри поля'); return; }

    if (!startPoint) {
        startPoint = { x: snapX, y: snapY }; endPoint = null;
        setStatus('Теперь кликни, чтобы выбрать конец отрезка ✏️');
        render();
    } else {
        if (startPoint.x === snapX && startPoint.y === snapY) {
            setStatus('Ты выбрал ту же точку. Начни сначала.');
            startPoint = null; endPoint = null; render();
            return;
        }
        const finalEnd = { x: snapX, y: snapY };
        addSegment(startPoint.x, startPoint.y, finalEnd.x, finalEnd.y);
        pushHistory({ type: 'add', segment: { x1: startPoint.x, y1: startPoint.y, x2: finalEnd.x, y2: finalEnd.y } });
        startPoint = null; endPoint = null;
        updatePossiblePoints(segments); render(); refreshLogs();
        if (typeof onDrawingChanged === 'function') onDrawingChanged();
        setStatus('Отрезок готов!');
    }
}
function deleteSegment(seg) {
    pushHistory({ type: 'delete', segment: { ...seg } });
    const index = segments.indexOf(seg);
    if (index !== -1) {
        segments.splice(index, 1); updatePossiblePoints(segments); render(); refreshLogs();
        if (typeof onDrawingChanged === 'function') onDrawingChanged();
        setStatus('Отрезок удалён');
    }
}
function deleteNamedPoint(np) {
    pushHistory({ type: 'deleteNamedPoint', point: { ...np } });
    const index = namedPoints.indexOf(np);
    if (index !== -1) {
        namedPoints.splice(index, 1); enablePointBtn(np.label); render(); refreshLogs();
        if (typeof onDrawingChanged === 'function') onDrawingChanged();
        setStatus('Точка ' + np.label + ' удалена');
    }
}

export function setTool(tool) {
    if (tool === currentTool) tool = 'pointer';
    currentTool = tool;
    startPoint = null; endPoint = null;
    eraserHoverTarget = null;

    if (tool === 'pointer') setPointerActive();
    else if (tool === 'line') setLineActive();
    else if (tool === 'point') setPointsActive();
    else if (tool === 'eraser') setEraserActive();
    else resetTools();

    render();
}
export function setAllowedLetters(letters) {
    allowedLetters = letters;
    populatePointButtons(letters);
    activeLabel = null;
    setActivePointBtn(null);
    resetAllButtons();
    document.querySelectorAll('.point-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentTool !== 'point') return;
            const label = btn.dataset.label;
            if (btn.disabled) return;
            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
                setActivePointBtn(null);
                activeLabel = null;
                setStatus('Выбор точки отменён');
            } else {
                document.querySelectorAll('.point-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeLabel = label;
                setStatus('Выбрана точка ' + label + '. Кликните рядом с возможной точкой.');
            }
        });
    });
}
export function attachEvents() {
    if (!canvas) return;
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
}
export function detachEvents() {
    if (!canvas) return;
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseup', onMouseUp);
}
export function clearDrawing() {
    clearSegments();
    clearNamedPoints();
    clearPossiblePoints();
    clearSegmentLog();
    clearNamedPointLog();
    clearAnalysis();
    updatePossiblePointLog([]);
    startPoint = null; endPoint = null;
    actionHistory = [];
    activeLabel = null;
    eraserHoverTarget = null;
    resetAllButtons(); setActivePointBtn(null);
    if (typeof onDrawingChanged === 'function') onDrawingChanged();
    setTool('pointer');
    render();
}
export function undoLastAction() {
    if (startPoint) { startPoint = null; endPoint = null; setStatus('Сброшено'); render(); return; }
    if (!actionHistory.length) { setStatus('Нет действий для отмены'); return; }
    const last = actionHistory.pop();
    if (last.type === 'add') {
        const removed = segments.pop();
        if (removed) { updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Отрезок удалён (отмена)'); }
    } else if (last.type === 'delete') {
        segments.push(last.segment);
        updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Отрезок восстановлен (отмена)');
    } else if (last.type === 'deleteNamedPoint') {
        namedPoints.push(last.point);
        disablePointBtn(last.point.label);
        render(); refreshLogs(); setStatus('Точка ' + last.point.label + ' восстановлена');
    } else if (last.type === 'move') {
        segments.splice(0, segments.length, ...last.oldSegments);
        updatePossiblePoints(segments); render(); refreshLogs(); setStatus('Перемещение отменено');
    } else if (last.type === 'moveNamedPoint') {
        const np = namedPoints.find(p => p.label === last.label);
        if (np) { np.x = last.oldX; np.y = last.oldY; render(); refreshLogs(); setStatus('Перемещение точки отменено'); }
    }
    if (typeof onDrawingChanged === 'function') onDrawingChanged();
}
export function getSegments() { return segments; }
export let onDrawingChanged = null;
export function setOnDrawingChanged(callback) { onDrawingChanged = callback; }
export function redraw() { updatePossiblePoints(segments); render(); refreshLogs(); }
`,

    // ===== main.js (полный) =====
    'src/scripts/main.js':
`import { initCanvas, canvas } from './canvas.js';
import {
    initUI,
    setStatus, setResult, clearAnalysis, setAnalysis,
    startHintTimer, hintBar, hintBtn, clearBtn, undoBtn, checkBtn,
    pointerBtn, lineBtn, pointsBtn, eraserBtn, pointButtonsContainer,
    getActivePointBtn, setActivePointBtn, disablePointBtn, enablePointBtn, resetAllButtons
} from './ui.js';
import { lessons, tasks } from './taskConfig.js';
import {
    markLessonCompleted, isLessonCompleted,
    saveAppState as saveAppStateToStorage,
    loadAppState as loadAppStateFromStorage
} from './progress.js';
import {
    attachEvents, detachEvents, clearDrawing,
    undoLastAction, getSegments, setOnDrawingChanged, redraw,
    setTool, setAllowedLetters
} from './drawing.js';
import { namedPoints } from './points.js';

console.log('🚀 main.js загружен!');

let currentView = null;
let currentTaskId = null;
let appState = loadAppStateFromStorage();

setOnDrawingChanged(() => {
    if (!currentView) return;
    appState[currentView] = {
        segments: getSegments().slice(),
        namedPoints: namedPoints.slice()
    };
    saveAppStateToStorage(appState);
});

// ===================== Навигация =====================
function navigateTo(section) {
    detachEvents();
    if (currentView && currentTaskId) {
        appState[currentView] = {
            segments: getSegments().slice(),
            namedPoints: namedPoints.slice()
        };
        saveAppStateToStorage(appState);
    }
    const oldCanvas = document.querySelector('canvas');
    if (oldCanvas) oldCanvas.remove();

    if (section === 'intro') showIntro();
    else if (section === 'block1') showBlockMenu();
    else if (section.startsWith('lesson')) {
        if (section.includes('-task')) showTask(section);
        else if (section.endsWith('-intro')) showLessonIntro(section.replace('-intro', ''));
        else showLessonMenu(section);
    } else {
        document.getElementById('dynamic-content').innerHTML = '<p>Раздел не найден.</p>';
    }
    updateSidebarActive(section);
}
function showIntro() {
    currentView = 'intro'; currentTaskId = null;
    document.getElementById('dynamic-content').innerHTML = '<h2>Добро пожаловать!</h2><p>Эта программа поможет вам освоить геометрию «с нуля» или исправить трудности.</p>';
}
function showBlockMenu() {
    currentView = 'block1'; currentTaskId = null;
    let html = '<h2>Блок 1. Учимся рисовать первичные чертежи</h2><ul>';
    for (const [lessonId, lesson] of Object.entries(lessons)) {
        html += '<li><a href="#" data-section="' + lessonId + '">' + lesson.title + '</a></li>';
    }
    html += '</ul>';
    document.getElementById('dynamic-content').innerHTML = html;
}
function showLessonMenu(lessonId) {
    currentView = lessonId; currentTaskId = null;
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
function showLessonIntro(lessonId) {
    currentView = lessonId + '-intro'; currentTaskId = null;
    const lesson = lessons[lessonId];
    if (!lesson) { document.getElementById('dynamic-content').innerHTML = '<p>Урок не найден.</p>'; return; }
    document.getElementById('dynamic-content').innerHTML = '<h2>' + lesson.title + '</h2>' + (lesson.intro || '');
}
function showTask(taskId) {
    currentView = taskId;
    let taskConfigId = null;
    for (const lesson of Object.values(lessons)) {
        const found = lesson.tasks.find(t => t.id === taskId);
        if (found) { taskConfigId = found.taskConfigId; break; }
    }
    if (!taskConfigId) { document.getElementById('dynamic-content').innerHTML = '<p>Задание не найдено.</p>'; return; }
    currentTaskId = taskConfigId;

    const taskDef = tasks[taskConfigId];
    const letters = taskDef.letters || [];

    const taskTitle = getTaskTitle(taskId);
    const html = generateTaskHTML(taskTitle, letters);
    document.getElementById('dynamic-content').innerHTML = html;

    const canvasEl = document.getElementById('lesson-canvas');
    if (canvasEl) {
        initCanvas(canvasEl);
        initUI('lesson');

        getSegments().splice(0, getSegments().length);
        namedPoints.splice(0, namedPoints.length);

        const state = appState[taskId];
        if (state) {
            if (state.segments) {
                const segs = getSegments();
                segs.push(...state.segments);
            }
            if (state.namedPoints) {
                namedPoints.push(...state.namedPoints);
            }
            redraw();
        } else {
            clearDrawing();
        }
        attachEvents();

        if (letters.length > 0) {
            setAllowedLetters(letters);
            if (pointsBtn) pointsBtn.style.display = 'inline-block';
            if (pointButtonsContainer) pointButtonsContainer.style.display = 'none';
        } else {
            if (pointsBtn) pointsBtn.style.display = 'none';
            if (pointButtonsContainer) pointButtonsContainer.style.display = 'none';
        }
        setTool('pointer');

        if (clearBtn) clearBtn.onclick = clearDrawing;
        if (undoBtn) undoBtn.onclick = undoLastAction;
        if (checkBtn) checkBtn.onclick = handleCheck;
        if (hintBtn) hintBtn.onclick = handleHint;
        if (pointerBtn) pointerBtn.onclick = () => setTool('pointer');
        if (lineBtn) lineBtn.onclick = () => setTool('line');
        if (pointsBtn) pointsBtn.onclick = () => setTool('point');
        if (eraserBtn) eraserBtn.onclick = () => setTool('eraser');

        initHintTimer();
        redraw();
    }
}
function getTaskTitle(taskId) {
    for (const lesson of Object.values(lessons)) {
        const task = lesson.tasks.find(t => t.id === taskId);
        if (task) return task.title;
    }
    return 'Задание';
}
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
        '<button class="pointerBtn active">🖱️ Указатель</button>' +
        '<button class="eraserBtn">🧽 Ластик</button>' +
        '<button class="lineBtn">📏 Линия</button>' +
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
function handleCheck() {
    if (!currentTaskId || !tasks[currentTaskId]) return;
    const taskDef = tasks[currentTaskId];
    const { result, analysis } = taskDef.check(getSegments(), namedPoints);
    setResult(result);
    setAnalysis(analysis);
    if (result.includes('✅') && currentView) {
        const added = markLessonCompleted(currentView);
        if (added) { updateSidebarProgress(); setStatus('✅ Задача выполнена! Урок отмечен как пройденный.'); }
    }
}
function handleHint() {
    if (!currentTaskId || !tasks[currentTaskId]) return;
    const { result, analysis } = tasks[currentTaskId].hint(getSegments());
    setResult(result);
    setAnalysis(analysis);
}
function initHintTimer() {
    if (!hintBar || !hintBtn) return;
    startHintTimer(2, () => {}, () => console.log('Подсказка доступна'));
}
function updateSidebarProgress() {
    document.querySelectorAll('.sidebar-menu a[data-task]').forEach(a => {
        const taskId = a.dataset.task;
        if (isLessonCompleted(taskId)) a.classList.add('completed');
        else a.classList.remove('completed');
    });
}
function buildSidebarMenu() {
    const menu = document.getElementById('sidebar-menu');
    menu.innerHTML = '';

    const introLi = document.createElement('li');
    introLi.innerHTML = '<a href="#" data-section="intro">Введение</a>';
    menu.appendChild(introLi);

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

    document.querySelectorAll('.sidebar-menu a[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.section);
        });
    });
}
function updateSidebarActive(section) {
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    const link = document.querySelector('[data-section="' + section + '"]');
    if (link) link.classList.add('active');
    updateSidebarProgress();
}
document.getElementById('dynamic-content').addEventListener('click', (e) => {
    const target = e.target.closest('a[data-section]');
    if (target) {
        e.preventDefault();
        navigateTo(target.dataset.section);
    }
});

buildSidebarMenu();
navigateTo('intro');
`
};

// Запись всех файлов
console.log('🔄 Полное обновление проекта...');
for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(PROJECT_DIR, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('✅ ' + filePath);
}
console.log('\n🎉 Готово! Запустите node server.js – проверка заданий теперь работает.');
