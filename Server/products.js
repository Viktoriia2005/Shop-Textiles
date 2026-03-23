//products.js
import express from 'express';
import { db } from './db.js';

const router = express.Router();

router.get('/popular', async (req, res) => {
    try {
        const [products] = await db.execute(`
      SELECT product_id, Name, Price, Photo, Rating
      FROM products
      WHERE Stock > 0
      ORDER BY Rating DESC
      LIMIT 8
    `);
        res.json(products);
    } catch (error) {
        console.error('❌ Помилка отримання популярних товарів:', error);
        res.status(500).json({ error: 'Не вдалося отримати товари' });
    }
});

// 🔍 Отримати всі товари, які є на складі, з пошуком
router.get('/', async (req, res) => {
    const { search } = req.query;

    let query = `
    SELECT 
      product_id, 
      Name, 
      Description, 
      Price, 
      Photo, 
      Rating, 
      Stock 
    FROM products 
    WHERE stock > 0
  `;
    const params = [];

    if (search) {
        query += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR product_id = ?)';
        const keyword = `%${search.toLowerCase()}%`;
        params.push(keyword, keyword, search); // третій параметр — пряме порівняння з ID
    }

    try {
        const [products] = await db.execute(query, params);
        res.json(products);
    } catch (error) {
        console.error('❌ Помилка запиту до бази:', error);
        res.status(500).json({ error: 'Помилка отримання товарів' });
    }
});


router.get('/hints', async (req, res) => {
    const { hint } = req.query;

    if (!hint || hint.trim().length < 1) {
        return res.json([]);
    }

    const keyword = `%${hint.toLowerCase()}%`;

    try {
        const [products] = await db.execute(
            `SELECT product_id, Name 
       FROM products 
       WHERE stock > 0 
       AND (LOWER(name) LIKE ? OR product_id LIKE ?) 
       LIMIT 10`,
            [keyword, hint] // перший параметр для назви, другий — для ID
        );
        res.json(products);
    } catch (error) {
        console.error('❌ Помилка запиту до підказок:', error);
        res.status(500).json({ error: 'Помилка отримання підказок' });
    }
});

router.get('/tag/:keyword', async (req, res) => {
    const keyword = req.params.keyword.toLowerCase();

    try {
        const [products] = await db.execute(
            `SELECT product_id, Name, Description, Price, Photo, Rating, Stock 
       FROM products 
       WHERE stock > 0 AND (
         LOWER(name) LIKE ? OR LOWER(description) LIKE ?
       )`,
            [`%${keyword}%`, `%${keyword}%`]
        );

        res.json(products);
    } catch (error) {
        console.error('❌ Помилка запиту по маркеру:', error);
        res.status(500).json({ error: 'Не вдалося отримати товари' });
    }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.execute(`
      SELECT product_id, Name, Description, Price, Photo, Rating, Stock
      FROM products
      WHERE product_id = ?
    `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Товар не знайдено' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('❌ Помилка отримання товару:', error);
        res.status(500).json({ error: 'Не вдалося отримати товар' });
    }
});

// ➕ Додавання нового товару
router.post('/', async (req, res) => {
    const { name, description, price, photo, stock } = req.body;

    try {
        const [result] = await db.execute(
            `INSERT INTO products (Name, Description, Price, Photo, Stock) 
       VALUES (?, ?, ?, ?, ?)`,
            [name, description, price, photo, stock]
        );

        res.status(201).json({
            message: 'Товар успішно додано',
            product_id: result.insertId,
            product: { id: result.insertId, name, description, price, photo, stock }
        });
    } catch (error) {
        console.error('❌ Помилка додавання товару:', error);
        res.status(500).json({ error: 'Не вдалося додати товар' });
    }
});

// ✏️ Редагування товару
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, price, photo, stock } = req.body;

    try {
        const [result] = await db.execute(
            `UPDATE products 
       SET Name = ?, Description = ?, Price = ?, Photo = ?, Stock = ?
       WHERE product_id = ?`,
            [name, description, price, photo, stock, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Товар не знайдено' });
        }

        res.json({ message: 'Товар успішно змінено' });
    } catch (error) {
        console.error('❌ Помилка редагування товару:', error);
        res.status(500).json({ error: 'Не вдалося змінити товар' });
    }
});

// 🗑️ Видалення товару
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.execute(
            `DELETE FROM products WHERE product_id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Товар не знайдено' });
        }

        res.json({ message: 'Товар успішно видалено' });
    } catch (error) {
        console.error('❌ Помилка видалення товару:', error);
        res.status(500).json({ error: 'Не вдалося видалити товар' });
    }
});

// Сортування за ціною зростання
router.get('/sort/asc', async (req, res) => {
    try {
        // використовуємо ту ж таблицю, що й інші запити
        const [rows] = await db.execute(
            `SELECT product_id, Name, Description, Price, Photo, Rating, Stock
             FROM products
             WHERE stock > 0
             ORDER BY Price ASC`
        );
        res.json(rows);
    } catch (err) {
        console.error('❌ Помилка сортування:', err);
        res.status(500).json({ error: 'Не вдалося отримати товари' });
    }
});
// Сортування за ціною спадання
router.get('/sort/desc', async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT product_id, Name, Description, Price, Photo, Rating, Stock
             FROM products
             WHERE stock > 0
             ORDER BY Price DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error('❌ Помилка сортування:', err);
        res.status(500).json({ error: 'Не вдалося отримати товари' });
    }
});
export default router;