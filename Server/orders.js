//orders.js
import express from 'express';
import { db } from './db.js';

const router = express.Router();

// 🧾 Створити нове замовлення
router.post('/', async (req, res) => {
  const { user_id, items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Список товарів порожній або некоректний' });
  }

  try {
    // 🧠 Групуємо товари за product_id
    const groupedItems = {};
    for (const item of items) {
      const pid = item.product_id;
      if (!groupedItems[pid]) {
        groupedItems[pid] = { ...item };
      } else {
        groupedItems[pid].quantity += item.quantity;
      }
    }

    // 🔍 Перевірити наявність кожного товару
    for (const item of Object.values(groupedItems)) {
      const [[product]] = await db.execute(
        'SELECT stock FROM products WHERE product_id = ?',
        [item.product_id]
      );

      if (!product || product.stock < item.quantity) {
        return res.status(400).json({
          error: `Недостатньо товару "${item.product_id}" на складі`
        });
      }
    }

    // 🧾 Створити замовлення
    const [orderResult] = await db.execute(
      'INSERT INTO orders (user_id, order_date, status) VALUES (?, NOW(), ?)',
      [user_id, 'active']
    );
    const order_id = orderResult.insertId;

    // 📦 Вставити унікальні товари
    for (const item of Object.values(groupedItems)) {
      await db.execute(
        'INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)',
        [order_id, item.product_id, item.quantity]
      );

      await db.execute(
        'UPDATE products SET stock = stock - ? WHERE product_id = ?',
        [item.quantity, item.product_id]
      );
    }

    res.status(201).json({ message: 'Замовлення створено', order_id });
  } catch (error) {
    console.error('❌ Помилка створення замовлення:', error);
    res.status(500).json({ error: 'Помилка оформлення замовлення' });
  }
});


// router.get('/user/:id/full', async (req, res) => {
//   const userId = req.params.id;

//   try {
//     const [orders] = await db.execute(
//       'SELECT order_id, order_date, status FROM orders WHERE user_id = ? ORDER BY order_date DESC',
//       [userId]
//     );

//     const fullOrders = [];

//     for (const order of orders) {
//       const [items] = await db.execute(`
//         SELECT oi.quantity, p.name
//         FROM order_items oi
//         JOIN products p ON oi.product_id = p.product_id
//         WHERE oi.order_id = ?
//       `, [order.order_id]);

//       fullOrders.push({ ...order, items });
//     }

//     res.json(fullOrders);
//   } catch (error) {
//     console.error('❌ Помилка отримання замовлень:', error);
//     res.status(500).json({ error: 'Не вдалося отримати замовлення' });
//   }
// });


router.get('/user/:id/full', async (req, res) => {
  const userId = req.params.id;

  try {
    const [orders] = await db.execute(
      'SELECT order_id, order_date, status FROM orders WHERE user_id = ? ORDER BY order_date DESC',
      [userId]
    );

    const fullOrders = [];

    for (const order of orders) {
      const [items] = await db.execute(`
        SELECT 
          oi.product_id,
          oi.quantity,
          p.Name,
          p.Price,
          p.Photo
        FROM order_items oi
        JOIN products p ON oi.product_id = p.product_id
        WHERE oi.order_id = ?
      `, [order.order_id]);

      const total = items.reduce((sum, item) => sum + Number(item.Price) * Number(item.quantity), 0);

      fullOrders.push({ ...order, items, total });
    }

    res.json(fullOrders);
  } catch (error) {
    console.error('❌ Помилка отримання замовлень:', error);
    res.status(500).json({ error: 'Не вдалося отримати замовлення' });
  }
});

export default router;