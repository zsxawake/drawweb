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

// Массив для хранения всех точек
let allDrawings = [];

// Инициализация холста
ctx.strokeStyle = currentColor;
ctx.lineWidth = 4;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.shadowColor = '#ff69b4';
ctx.shadowBlur = 15;
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Функция для загрузки всех рисунков при старте
async function loadAllDrawings() {
    try {
        console.log('Загружаем все рисунки...');
        
        const { data, error } = await supabase
            .from('drawings')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Сохраняем все точки
        allDrawings = data || [];
        
        // Отрисовываем все точки
        redrawAllDrawings();
        
        console.log(`Загружено ${allDrawings.length} точек`);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    }
}

// Функция для полной перерисовки холста
function redrawAllDrawings() {
    // Очищаем холст (заливаем черным)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем все сохраненные точки
    allDrawings.forEach(point => {
        ctx.fillStyle = point.color;
        ctx.shadowColor = point.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Функция для сохранения точки
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
        
        // Добавляем новую точку в локальный массив
        if (data && data[0]) {
            allDrawings.push(data[0]);
        }
        
        console.log('Точка сохранена');
    } catch (error) {
        console.error('Ошибка сохранения:', error);
    }
}

// Функция для рисования линии
function drawLine(x1, y1, x2, y2, color) {
    // Рисуем линию на холсте
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Создаем промежуточные точки для сохранения
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
        
        // Сохраняем точку
        savePoint(pointX, pointY, color);
    }
}

// Обработчики рисования
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

// Мобильные обработчики
canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchmove', handleTouchMove);
canvas.addEventListener('touchend', stopDrawing);

function startDrawing(e) {
    e.preventDefault();
    isDrawing = true;
    
    const { x, y } = getCoordinates(e);
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
}

function draw(e) {
    e.preventDefault();
    if (!isDrawing) return;
    
    const { x, y } = getCoordinates(e);
    
    // Рисуем линию от предыдущей точки до текущей
    drawLine(lastX, lastY, x, y, currentColor);
    
    lastX = x;
    lastY = y;
}

function stopDrawing(e) {
    e.preventDefault();
    isDrawing = false;
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY,
    });
    canvas.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY,
    });
    canvas.dispatchEvent(mouseEvent);
}

// Вспомогательная функция для получения координат
function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    const x = Math.round((clientX - rect.left) * scaleX);
    const y = Math.round((clientY - rect.top) * scaleY);
    
    // Ограничиваем координаты в пределах холста
    return {
        x: Math.max(0, Math.min(canvas.width, x)),
        y: Math.max(0, Math.min(canvas.height, y))
    };
}

// Очистка холста
clearBtn.addEventListener('click', async () => {
    try {
        const { error } = await supabase
            .from('drawings')
            .delete()
            .neq('id', 0);

        if (error) throw error;
        
        // Очищаем локальный массив
        allDrawings = [];
        
        // Очищаем холст
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

// Функция обновления счетчика пользователей
let usersOnline = 1;
setInterval(() => {
    usersOnline = Math.floor(Math.random() * 3) + 1;
    usersCountSpan.textContent = usersOnline;
}, 10000);

// Загружаем все рисунки при старте
loadAllDrawings();

// Добавляем кнопку обновления (на всякий случай)
const refreshBtn = document.createElement('button');
refreshBtn.textContent = '🔄 Обновить';
refreshBtn.className = 'neon-button';
refreshBtn.style.marginLeft = '10px';
refreshBtn.addEventListener('click', () => {
    loadAllDrawings();
});
document.querySelector('.controls').appendChild(refreshBtn);
