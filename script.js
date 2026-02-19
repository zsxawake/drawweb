const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const clearBtn = document.getElementById('clearBtn');
const usersCountSpan = document.getElementById('usersCount');

// Настройки рисования
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentColor = '#ff69b4';
let drawingEnabled = true;

// Массив для хранения точек
let points = [];

// Инициализация холста
ctx.strokeStyle = currentColor;
ctx.lineWidth = 4;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.shadowColor = '#ff69b4';
ctx.shadowBlur = 15;
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Загрузка существующих рисунков
async function loadDrawings() {
    try {
        const { data, error } = await supabase
            .from('drawings')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Очищаем холст
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Сохраняем точки и рисуем их
        points = data || [];
        redrawAllPoints();
        
        console.log('Загружено точек:', points.length);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    }
}

// Перерисовать все точки
function redrawAllPoints() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    points.forEach(point => {
        ctx.fillStyle = point.color;
        ctx.shadowColor = point.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Отправка точки в базу данных
async function savePoint(x, y, color) {
    try {
        const { data, error } = await supabase
            .from('drawings')
            .insert([{ 
                x: Math.round(x), 
                y: Math.round(y), 
                color: color 
            }])
            .select();

        if (error) throw error;
        
        console.log('Точка сохранена:', data);
    } catch (error) {
        console.error('Ошибка сохранения:', error);
    }
}

// Подписка на новые точки
function subscribeToDrawings() {
    // Подписываемся на INSERT события
    supabase
        .channel('drawings-channel')
        .on(
            'postgres_changes',
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'drawings' 
            },
            (payload) => {
                console.log('Новая точка от другого пользователя:', payload.new);
                const newPoint = payload.new;
                
                // Добавляем точку в массив
                points.push(newPoint);
                
                // Рисуем новую точку
                ctx.fillStyle = newPoint.color;
                ctx.shadowColor = newPoint.color;
                ctx.beginPath();
                ctx.arc(newPoint.x, newPoint.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        )
        .on(
            'postgres_changes',
            { 
                event: 'DELETE', 
                schema: 'public', 
                table: 'drawings' 
            },
            (payload) => {
                console.log('Холст очищен другим пользователем');
                // Очищаем локальное хранилище и холст
                points = [];
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        )
        .subscribe((status) => {
            console.log('Статус подписки:', status);
        });
}

// Функция для рисования линии с интерполяцией
function drawLine(x1, y1, x2, y2, color) {
    // Рисуем линию на холсте
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Создаем промежуточные точки для более плавной линии
    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const steps = Math.max(2, Math.floor(distance / 2));
    
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pointX = Math.round(x1 + (x2 - x1) * t);
        const pointY = Math.round(y1 + (y2 - y1) * t);
        
        // Рисуем точку
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pointX, pointY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Сохраняем точку в базу
        savePoint(pointX, pointY, color);
    }
}

// Обработчики рисования
canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (!drawingEnabled) return;
    
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    
    lastX = x;
    lastY = y;
    
    // Рисуем начальную точку
    ctx.fillStyle = currentColor;
    ctx.shadowColor = currentColor;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Сохраняем начальную точку
    savePoint(x, y, currentColor);
});

canvas.addEventListener('mousemove', (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    
    // Рисуем линию от предыдущей точки до текущей
    drawLine(lastX, lastY, x, y, currentColor);
    
    lastX = x;
    lastY = y;
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
});

canvas.addEventListener('mouseleave', () => {
    isDrawing = false;
});

// Очистка холста
clearBtn.addEventListener('click', async () => {
    try {
        const { error } = await supabase
            .from('drawings')
            .delete()
            .neq('id', 0);

        if (error) throw error;
        
        // Очищаем локально
        points = [];
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        console.log('Холст очищен');
    } catch (error) {
        console.error('Ошибка очистки:', error);
    }
});

// Обновление цвета
colorPicker.addEventListener('input', (e) => {
    currentColor = e.target.value;
});

// Функция для обновления количества пользователей (упрощенная версия)
let usersOnline = 1;
setInterval(() => {
    // Простая симуляция - в реальном проекте используйте Presence API
    usersOnline = Math.floor(Math.random() * 3) + 1;
    usersCountSpan.textContent = usersOnline;
}, 10000);

// Мобильные обработчики
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!drawingEnabled) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.round((touch.clientX - rect.left) * scaleX);
    const y = Math.round((touch.clientY - rect.top) * scaleY);
    
    isDrawing = true;
    lastX = x;
    lastY = y;
    
    ctx.fillStyle = currentColor;
    ctx.shadowColor = currentColor;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    savePoint(x, y, currentColor);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.round((touch.clientX - rect.left) * scaleX);
    const y = Math.round((touch.clientY - rect.top) * scaleY);
    
    drawLine(lastX, lastY, x, y, currentColor);
    
    lastX = x;
    lastY = y;
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    isDrawing = false;
});

// Инициализация
async function init() {
    console.log('Инициализация приложения...');
    await loadDrawings();
    subscribeToDrawings();
}

// Запускаем приложение
init();
