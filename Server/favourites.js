// favourites.js
import express from 'express';
import { db } from './db.js';

const router = express.Router();

// Отримати всі вподобані товари користувача (з деталями товару)
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const [rows] = await db.execute(
            `SELECT 
                p.product_id, 
                p.Name, 
                p.Description, 
                p.Price, 
                p.Photo, 
                p.Rating, 
                p.Stock
             FROM favourites f
             JOIN products p ON p.product_id = f.product_id
             WHERE f.user_id = ?
             ORDER BY f.favourite_id DESC`,
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error('❌ Помилка отримання вподобаних:', error);
        res.status(500).json({ error: 'Не вдалося отримати вподобані товари' });
    }
});

// Отримати тільки список product_id
router.get('/:userId/ids', async (req, res) => {
    const { userId } = req.params;

    try {
        const [rows] = await db.execute(
            'SELECT product_id FROM favourites WHERE user_id = ?',
            [userId]
        );
        res.json(rows.map(r => r.product_id));
    } catch (error) {
        console.error('❌ Помилка отримання ID вподобаних:', error);
        res.status(500).json({ error: 'Не вдалося отримати список вподобаних' });
    }
});

// Додати в обране
router.post('/', async (req, res) => {
    const { user_id, product_id } = req.body;

    if (!user_id || !product_id) {
        return res.status(400).json({ error: 'Потрібні user_id та product_id' });
    }

    try {
        const [existing] = await db.execute(
            'SELECT favourite_id FROM favourites WHERE user_id = ? AND product_id = ?',
            [user_id, product_id]
        );

        if (existing.length > 0) {
            return res.json({ message: 'Вже у вподобаних' });
        }

        await db.execute(
            'INSERT INTO favourites (user_id, product_id) VALUES (?, ?)',
            [user_id, product_id]
        );

        res.status(201).json({ message: 'Додано у вподобані' });
    } catch (error) {
        console.error('❌ Помилка додавання у вподобані:', error);
        res.status(500).json({ error: 'Не вдалося додати у вподобані' });
    }
});

// Видалити з обраного
router.delete('/:userId/:productId', async (req, res) => {
    const { userId, productId } = req.params;

    try {
        const [result] = await db.execute(
            'DELETE FROM favourites WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Товар не знайдено у вподобаних' });
        }

        res.json({ message: 'Видалено з вподобаних' });
    } catch (error) {
        console.error('❌ Помилка видалення з вподобаних:', error);
        res.status(500).json({ error: 'Не вдалося видалити з вподобаних' });
    }
});

export default router;
