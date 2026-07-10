const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
// Корнем считаем папку, в которой лежит этот файл
const ROOT_DIR = __dirname;

// Сопоставление расширений файлов и MIME-типов
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
    // Извлекаем путь из URL (без query-параметров)
    let urlPath = req.url.split('?')[0];
    urlPath = decodeURIComponent(urlPath);

    // Простейшая защита от выхода за пределы корневой папки
    if (urlPath.includes('..')) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    // Если путь заканчивается на "/", добавляем index.html
    if (urlPath.endsWith('/')) {
        urlPath += 'index.html';
    }

    const filePath = path.join(ROOT_DIR, urlPath);
    const ext = path.extname(filePath).toLowerCase();

    // Пытаемся прочитать и отдать запрошенный файл
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Файл не найден – для SPA можно отдать index.html (но у нас не SPA)
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 Not Found');
            } else {
                // Другая ошибка (например, нет прав)
                res.writeHead(500);
                res.end('Internal Server Error');
            }
            return;
        }

        // Всё хорошо – отдаём файл с правильным Content-Type
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
    console.log(`   Корневая папка: ${ROOT_DIR}`);
    console.log('   Для остановки нажмите Ctrl+C');
});