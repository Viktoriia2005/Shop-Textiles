import express from 'express';
import { db } from './db.js';
import { requireRole } from './auth.js';

const router = express.Router();

/* ===================== POPULAR ===================== */
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
  } catch (err) {
    res.status(500).json({ error: 'Failed to load popular' });
  }
});

/* ===================== GET ALL + SEARCH ===================== */
router.get('/', async (req, res) => {
  const { search } = req.query;

  let sql = `
    SELECT product_id, Name, Description, Price, Photo, Rating, Stock, category_id
    FROM products
    WHERE Stock > 0
  `;

  const params = [];

  if (search) {
    sql += ` AND (
      LOWER(Name) LIKE ? OR
      LOWER(Description) LIKE ? OR
      product_id = ?
    )`;

    const keyword = `%${search.toLowerCase()}%`;
    params.push(keyword, keyword, search);
  }

  try {
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

/* ===================== HINTS ===================== */
router.get('/hints', async (req, res) => {
  const { hint } = req.query;
  if (!hint) return res.json([]);

  const keyword = `%${hint.toLowerCase()}%`;

  try {
    const [rows] = await db.execute(
      `SELECT product_id, Name
       FROM products
       WHERE Stock > 0
       AND (LOWER(Name) LIKE ? OR product_id LIKE ?)
       LIMIT 10`,
      [keyword, hint]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json([]);
  }
});

/* ===================== CATEGORIES ===================== */
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT category_id, name_category FROM categories`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json([]);
  }
});

/* ===================== BY CATEGORY ===================== */
router.get('/category/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid category id' });
  }

  try {
    const [rows] = await db.execute(
      `SELECT product_id, Name, Description, Price, Photo, Rating, Stock, category_id
       FROM products
       WHERE Stock > 0 AND category_id = ?`,
      [id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json([]);
  }
});

/* ===================== SINGLE PRODUCT ===================== */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT product_id, Name, Description, Price, Photo, Rating, Stock, category_id
       FROM products
       WHERE product_id = ?`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

/* ===================== CREATE PRODUCT (ADMIN) ===================== */
router.post('/', requireRole('admin'), async (req, res) => {
  const { name, description, price, photo, stock, category_id } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO products (Name, Description, Price, Photo, Stock, category_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, price, photo, stock, category_id]
    );

    res.status(201).json({
      product_id: result.insertId,
      message: 'Created'
    });
  } catch (err) {
    res.status(500).json({ error: 'Insert failed' });
  }
});

/* ===================== UPDATE PRODUCT ===================== */
router.put('/:id', requireRole('admin'), async (req, res) => {
  const { name, description, price, photo, stock, category_id } = req.body;

  try {
    await db.execute(
      `UPDATE products
       SET Name=?, Description=?, Price=?, Photo=?, Stock=?, category_id=?
       WHERE product_id=?`,
      [name, description, price, photo, stock, category_id, req.params.id]
    );

    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

/* ===================== DELETE ===================== */
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await db.execute(
      `DELETE FROM products WHERE product_id=?`,
      [req.params.id]
    );

    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;