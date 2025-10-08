//server.js
import express from 'express';
import cors from 'cors';
import { db } from './db.js';
import usersRouter from './users.js';
import productsRouter from './products.js';
import cartRouter from './cart.js';
import ordersRouter from './orders.js';



const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));
app.use((req, res, next) => {
    console.log(`➡️ ${req.method} ${req.url}`);
    next();
});

try {
    // await db.connect();
    console.log('✅ Підключено до бази даних MySQL');
} catch (error) {
    console.error('❌ Помилка підключення до MySQL:', error.message);
}

// 📂 Підключення маршрутів
app.use('/users', usersRouter);
app.use('/products', productsRouter);
app.use('/cart', cartRouter);
app.use('/orders', ordersRouter);

app.get('/', (req, res) => {
    res.send('Сервер текстильного магазину працює 🧵');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущено на порту ${PORT}`);
});