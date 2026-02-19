// Упрощенная версия для тестирования подключения
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const clearBtn = document.getElementById('clearBtn');
const usersCountSpan = document.getElementById('usersCount');

// Настройки
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentColor = '#ff69b4';
let allDrawings = [];

// Инициализация холста
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.lineWidth = 4;
ctx.lineCap = 'round';
ctx.shadowBlur = 15;

// Проверка подключения к Supabase
console.log('Проверка Supabase:', supabase);

// Функция для проверки подключения
async function testConnection() {
    try {
        console.log('Тестируем подключение к Supabase...');
        
        // Пробуем получить данные
        const { data, error } = await supabase
            .from('drawings')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error('Ошибка подключения:', error);
            document.getElementById('debugAction').textContent = 'Ошибка: ' + error.message;
            return false;
        }
        
        console.log('Подключение успешно! Данные:', data);
        document.getElementById('debugAction').textContent = 'Подключено!';
        return true;
        
    } catch (error) {
        console.error('Критическая ошибка:', error);
        document.getElementById('debugAction').textContent = 'Ошибка!';
        return false;
    }
}

// Загрузка рисунков
async function loadDrawings() {
    try {
        const { data, error } = await supabase
            .from('drawings')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        allDrawings = data || [];
        redrawAll();
        
        console.log('Загружено точек:', allDrawings.length);
        document.getElementById('debugPointCount').textContent = allDrawings.length;
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        document.getElementById('debugAction').textContent = 'Ошибка загрузки';
    }
}

// Перерисовка
function redrawAll() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    allDrawings.forEach(point => {
        ctx.fillStyle = point.color;
        ctx.shadowColor = point.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Сохранение точки
async function savePoint(x, y, color) {
    try {
        const { data, error } = await supabase
            .from('drawings')
            .insert([{ x, y, color }])
            .select();

        if (error) throw error;
        
        if (data && data[0]) {
            allDrawings.push(data[0]);
            document.getElementById('debugPointCount').textContent = allDrawings.length;
        }
        
        console.log('Точка сохранена');
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        document.getElementById('debugAction').textContent = 'Ошибка сохранения';
    }
}

// Рисование
canvas.addEventListener('mousedown', (e) => {
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
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Сохраняем
    savePoint(x, y, currentColor);
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    
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
    
    // Рисуем точку в конце
    ctx.fillStyle = currentColor;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Сохраняем точку
    savePoint(x, y, currentColor);
    
    lastX = x;
    lastY = y;
});

canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseleave', () => isDrawing = false);

// Очистка
clearBtn.addEventListener('click', async () => {
    try {
        const { error } = await supabase
            .from('drawings')
            .delete()
            .neq('id', 0);

        if (error) throw error;
        
        allDrawings = [];
        redrawAll();
        document.getElementById('debugPointCount').textContent = '0';
        
    } catch (error) {
        console.error('Ошибка очистки:', error);
    }
});

// Обновление цвета
colorPicker.addEventListener('input', (e) => {
    currentColor = e.target.value;
});

// Кнопка проверки
document.getElementById('debugRefresh').addEventListener('click', async () => {
    await testConnection();
    await loadDrawings();
});

// Запуск
testConnection();
loadDrawings();
