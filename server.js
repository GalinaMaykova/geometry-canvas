// Подключаем встроенные модули Node.js
const http = require('http');   // для создания HTTP-сервера
const fs = require('fs');       // для работы с файловой системой
const path = require('path');   // для построения корректных путей

// Порт, на котором будет работать сервер
const PORT = 3000;
// Корневая папка – та, в которой лежит этот файл (geometry-canvas)
const ROOT_DIR = __dirname;

// Сопоставление расширений файлов с MIME-типами (нужно, чтобы браузер правильно понимал содержимое)
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

// Создаём HTTP-сервер. Функция-обработчик будет вызываться при каждом запросе.
const server = http.createServer((req, res) => {
  // Берём путь из URL, отсекаем параметры (всё после знака "?")
  let urlPath = req.url.split('?')[0];
  // Декодируем символы (например, %20 превращаем в пробел)
  urlPath = decodeURIComponent(urlPath);

  // Простейшая защита от попыток выйти за пределы корневой папки
  if (urlPath.includes('..')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Если путь заканчивается на "/", добавляем index.html (стандартное поведение)
  if (urlPath.endsWith('/')) {
    urlPath += 'index.html';
  }

  // Формируем полный путь к файлу на диске
  const filePath = path.join(ROOT_DIR, urlPath);
  // Получаем расширение файла (например, ".js")
  const ext = path.extname(filePath).toLowerCase();

  // Пытаемся прочитать файл
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Файл не найден – отправляем ошибку 404
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        // Другая ошибка (например, нет прав доступа)
        res.writeHead(500);
        res.end('Internal Server Error');
      }
      return;
    }
    // Всё хорошо – определяем Content-Type по расширению и отправляем содержимое
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// Запускаем сервер и выводим сообщение в консоль
server.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
  console.log('   Для остановки нажмите Ctrl+C');
});
