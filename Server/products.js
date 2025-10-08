//products.js
import express from 'express';
import { db } from './db.js';

const router = express.Router();

router.get('/products', async (req, res) => {
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
        query += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)';
        const keyword = `%${search.toLowerCase()}%`;
        params.push(keyword, keyword);
    }

    try {
        const [products] = await db.execute(query, params);
        res.json(products);
    } catch (error) {
        console.error('❌ Помилка запиту до бази:', error);
        res.status(500).json({ error: 'Помилка отримання товарів' });
    }
});

// 🔎 Підказки для пошуку (тільки назви товарів)
router.get('/hints', async (req, res) => {
    const { hint } = req.query;

    if (!hint || hint.trim().length < 1) {
        return res.json([]);
    }

    const keyword = `%${hint.toLowerCase()}%`;

    try {
        const [products] = await db.execute(
            `SELECT product_id, Name FROM products WHERE stock > 0 AND LOWER(name) LIKE ?`,
            [keyword]
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
      SELECT product_id, Name, Description, Price, Photo, Rating, Stock, Details
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

export default router;