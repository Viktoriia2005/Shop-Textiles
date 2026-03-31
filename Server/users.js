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
        const [roleRows] = await db.execute(
            'SELECT role_id FROM roles WHERE name_role = ?',
            ['user']
        );
        if (roleRows.length === 0) {
            return res.status(500).json({ error: 'Role user not found' });
        }
        const roleId = roleRows[0].role_id;

        const [result] = await db.execute(
            'INSERT INTO users (Name, Email, Password, role_id) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, roleId]
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
        const [rows] = await db.execute(`
      SELECT u.user_id, u.Name, u.Email, u.Password, r.name_role
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE u.Email = ?
    `, [email]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Користувача не знайдено' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.Password);

        if (!match) {
            return res.status(401).json({ error: 'Невірний пароль' });
        }

        res.status(200).json({
            message: 'Вхід успішний',
            user: {
                user_id: user.user_id,
                name: user.Name,
                email: user.Email,
                role: user.name_role   // ✅ додаємо роль
            }
        });
    } catch (error) {
        console.error('❌ Помилка логіну:', error);
        res.status(500).json({ error: 'Помилка входу' });
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

// 📝 Оновлення імені та email користувача
router.put('/:id', async (req, res) => {
    const userId = req.params.id;
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Необхідно вказати name та email' });
    }

    try {
        // 🔍 перевірка, чи не зайнятий email іншим користувачем
        const [existing] = await db.execute(
            'SELECT user_id FROM users WHERE Email = ? AND user_id <> ?',
            [email, userId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Цей email вже використовується' });
        }

        const [result] = await db.execute(
            'UPDATE users SET Name = ?, Email = ? WHERE user_id = ?',
            [name, email, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Користувача не знайдено' });
        }

        res.json({ message: 'Дані успішно оновлено' });
    } catch (error) {
        console.error('❌ Помилка оновлення користувача:', error);
        res.status(500).json({ error: 'Серверна помилка під час оновлення' });
    }
});

// 🚪 Вихід (тільки клієнтська дія)
router.post('/logout', (req, res) => {
    // Якщо використовуєш сесії — тут можна очистити
    // Якщо ні — просто повідомлення
    res.json({ message: 'Вихід виконано' });
});

router.get('/admin/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.execute(
            `SELECT u.user_id, u.Name, u.Email, r.name_role
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ? AND r.name_role = 'admin'`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Адміністратор не знайдений' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('❌ Помилка отримання даних адміна:', error);
        res.status(500).json({ error: 'Не вдалося отримати дані адміна' });
    }
});

export default router;