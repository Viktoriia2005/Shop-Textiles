//cart.js
import express from 'express';
import { db } from './db.js';

const router = express.Router();

// 🛒 Додати товар у кошик з кількістю 1 або оновити, якщо вже є
router.post('/quick-add', async (req, res) => {
  const { user_id, product_id } = req.body;

  // Перевірити доступну кількість
  const [[product]] = await db.execute(
    'SELECT stock FROM products WHERE product_id = ?',
    [product_id]
  );

  if (!product || product.stock < 1) {
    return res.status(400).json({ error: 'Товару немає на складі' });
  }

  // Якщо товар вже є — збільшуємо кількість
  await db.execute(
    `INSERT INTO cart_items (user_id, product_id, quantity)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE quantity = quantity + 1`,
    [user_id, product_id]
  );

  res.status(201).json({ message: 'Товар додано в кошик' });
});

// 🔢 Оновити кількість товару з перевіркою складу
router.put('/:user_id/:product_id', async (req, res) => {
  const { user_id, product_id } = req.params;
  const { quantity } = req.body;

  const [[product]] = await db.execute(
    'SELECT stock FROM products WHERE product_id = ?',
    [product_id]
  );

  if (!product || product.stock < quantity) {
    return res.status(400).json({ error: 'Недостатньо товару на складі для оновлення' });
  }

  await db.execute(
    'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?',
    [quantity, user_id, product_id]
  );

  res.json({ message: 'Quantity updated' });
});

// 📤 Отримати всі товари в кошику
router.get('/:user_id', async (req, res) => {
  const { user_id } = req.params;

  const [items] = await db.execute(
    `SELECT ci.product_id, ci.quantity, p.name, p.price, p.photo, p.stock
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.product_id
     WHERE ci.user_id = ?`,
    [user_id]
  );

  if (items.length === 0) {
    return res.json({ empty: true, message: 'Ваш кошик пустий. Додайте товари, щоб продовжити покупки.' });
  }

  res.json(items);
});

// ❌ Видалити один товар з кошика
router.delete('/:user_id/:product_id', async (req, res) => {
  const { user_id, product_id } = req.params;

  await db.execute(
    'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?',
    [user_id, product_id]
  );

  res.json({ message: 'Item removed from cart' });
});

// 🧹 Очистити весь кошик
router.delete('/:user_id', async (req, res) => {
  const { user_id } = req.params;

  await db.execute('DELETE FROM cart_items WHERE user_id = ?', [user_id]);

  res.json({
    message: 'Ваш кошик очищено. Додайте товари, щоб продовжити покупки.',
    empty: true
  });
});

export default router;