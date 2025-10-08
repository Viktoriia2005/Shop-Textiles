//users.js
import express from 'express';
import { db } from './db.js';
import bcrypt from 'bcrypt';

const router = express.Router();
const saltRounds = 10;

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // 🔍 Перевірка на дублікати email
        const [existing] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Користувач з таким email вже існує' });
        }

        // 🔐 Хешування пароля
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 💾 Запис у базу
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        // 🆔 Отримання ID нового користувача
        const userId = result.insertId;

        // 📦 Повернення даних користувача
        res.status(201).json({
            message: 'Користувача зареєстровано',
            user_id: userId, // 🔑 Додано окремо
            user: { id: userId, name, email }
        });
    } catch (error) {
        res.status(500).json({ error: 'Помилка реєстрації' });
    }
});

// 🔑 Вхід
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Користувача не знайдено' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.Password);

        if (!match) {
            return res.status(401).json({ error: 'Невірний пароль' });
        }

        // ✅ Повертаємо дані користувача
        res.status(200).json({
            message: 'Вхід успішний',
            user: {
                user_id: user.user_id,
                name: user.Name,
                email: user.Email
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Помилка входу' });
        console.error('❌ Помилка логіну:', error);
    }
});

router.get('/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const [rows] = await db.execute(
            'SELECT user_id, Name, Email FROM users WHERE user_id = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Користувача не знайдено' });
        }

        res.json(rows[0]); // ✅ Повертаємо дані
    } catch (error) {
        console.error('❌ Помилка отримання користувача:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// 🚪 Вихід (тільки клієнтська дія)
router.post('/logout', (req, res) => {
    // Якщо використовуєш сесії — тут можна очистити
    // Якщо ні — просто повідомлення
    res.json({ message: 'Вихід виконано' });
});

export default router;