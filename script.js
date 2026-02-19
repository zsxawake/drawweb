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

// Хранилище для всех точек
let allPoints = [];

// Инициализация холста
ctx.strokeStyle = currentColor;
ctx.lineWidth = 3;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.shadowColor = '#ff69b4';
ctx.shadowBlur = 10;
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Загрузка существующих рисунков
async function loadDrawings() {
    try {
        const { data, error } = await supabase
            .from('drawings')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(1000); // Ограничиваем количество точек

        if (error) throw error;

        // Очищаем холст
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Сохраняем точки и рисуем их
        allPoints = data || [];
        redrawAllPoints();
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    }
}

// Перерисовать все точки
function redrawAllPoints() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.shadowColor = '#ff69b4';
    ctx.shadowBlur = 10;
    
    allPoints.forEach(point => {
        ctx.fillStyle = point.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Отправка точки в базу данных
async function savePoint(x, y, color) {
    try {
        const { error } = await supabase
            .from('drawings')
            .insert([{ x, y, color }]);

        if (error) throw error;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
    }
}

// Подписка на новые точки
function subscribeToDrawings() {
    supabase
        .channel('drawings-channel')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'drawings' },
            (payload) => {
                const newPoint = payload.new;
                allPoints.push(newPoint);
                
                // Рисуем новую точку
                ctx.fillStyle = newPoint.color;
                ctx.shadowColor = newPoint.color;
                ctx.beginPath();
                ctx.arc(newPoint.x, newPoint.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        )
        .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'drawings' },
            () => {
                // При очистке перезагружаем все
                loadDrawings();
            }
        )
        .subscribe();
}

// Обработчики рисования
canvas.addEventListener('mousedown', (e) => {
    if (!drawingEnabled) return;
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    lastX = x;
    lastY = y;
    
    // Рисуем точку
    ctx.fillStyle = currentColor;
    ctx.shadowColor = currentColor;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Сохраняем точку
    savePoint(x, y, currentColor);
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || !drawingEnabled) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Рисуем линию
    ctx.strokeStyle = currentColor;
    ctx.shadowColor = currentColor;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Рисуем точки на линии для базы данных
    const distance = Math.sqrt(Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2));
    const steps = Math.max(2, Math.floor(distance / 5));
    
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pointX = lastX + (x - lastX) * t;
        const pointY = lastY + (y - lastY) * t;
        
        savePoint(pointX, pointY, currentColor);
    }
    
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
            .neq('id', 0); // Удаляем все записи

        if (error) throw error;
        
        // Очищаем локальное хранилище
        allPoints = [];
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
    } catch (error) {
        console.error('Ошибка очистки:', error);
    }
});

// Обновление цвета
colorPicker.addEventListener('input', (e) => {
    currentColor = e.target.value;
});

// Симуляция счетчика пользователей (в реальном проекте используйте Presence API)
let usersOnline = 1;
setInterval(() => {
    // Здесь можно добавить реальное отслеживание пользователей через Supabase Presence
    usersOnline = Math.max(1, Math.min(5, usersOnline + Math.floor(Math.random() * 3) - 1));
    usersCountSpan.textContent = usersOnline;
}, 5000);

// Инициализация
async function init() {
    await loadDrawings();
    subscribeToDrawings();
    
    // Добавляем небольшую задержку для неонового эффекта
    setTimeout(() => {
        redrawAllPoints();
    }, 100);
}

init();

// Адаптация под мобильные устройства
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    isDrawing = true;
    lastX = x;
    lastY = y;
    
    ctx.fillStyle = currentColor;
    ctx.shadowColor = currentColor;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    savePoint(x, y, currentColor);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    ctx.strokeStyle = currentColor;
    ctx.shadowColor = currentColor;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    savePoint(x, y, currentColor);
    
    lastX = x;
    lastY = y;
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    isDrawing = false;
});
