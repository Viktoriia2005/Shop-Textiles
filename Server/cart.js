//cart.js
import express from 'express';
import { db } from './db.js';

const router = express.Router();

router.post('/quick-add', async (req, res) => {
  const { user_id, product_id } = req.body;
  const quantity = Math.max(1, parseInt(req.body.quantity, 10) || 1);

  if (!user_id || !product_id) {
    return res.status(400).json({ error: 'Вкажіть user_id та product_id' });
  }

  try {
    const [[product]] = await db.execute(
      'SELECT stock FROM products WHERE product_id = ?',
      [product_id]
    );

    if (!product || product.stock < quantity) {
      return res.status(400).json({ error: 'Товару немає на складі' });
    }

    const [[existingItem]] = await db.execute(
      'SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
      [user_id, product_id]
    );

    if (existingItem) {
      if (existingItem.quantity + quantity > product.stock) {
        return res.status(400).json({ error: 'Недостатньо товару на складі' });
      }

      await db.execute(
        'UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
        [quantity, user_id, product_id]
      );
    } else {
      await db.execute(
        'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [user_id, product_id, quantity]
      );
    }

    res.status(201).json({ message: 'Товар додано до кошика' });
  } catch (err) {
    res.status(500).json({ error: 'Помилка при додаванні товару до кошика' });
  }
});

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

router.delete('/:user_id/:product_id', async (req, res) => {
  const { user_id, product_id } = req.params;

  await db.execute(
    'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?',
    [user_id, product_id]
  );

  res.json({ message: 'Item removed from cart' });
});

router.delete('/:user_id', async (req, res) => {
  const { user_id } = req.params;

  await db.execute('DELETE FROM cart_items WHERE user_id = ?', [user_id]);

  res.json({
    message: 'Ваш кошик порожній. Додайте товари, щоб продовжити покупки.',
    empty: true
  });
});

export default router;
