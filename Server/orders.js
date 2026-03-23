import express from 'express';
import { db } from './db.js';

const router = express.Router();

const DELIVERY_FLOW = [
  'Очікування',
  'Ваше замовлення чекає перевізника',
  'Замовлення прямує до вас',
  'Замовлення очікує вас',
  'Доставлено'
];

const ACTIVE_DELIVERY_STATUSES = DELIVERY_FLOW.slice(0, 4);

function normalizeMethod(method) {
  const value = String(method || 'card').toLowerCase();
  if (value === 'paypal' || value === 'googlepay' || value === 'card') return value;
  return 'card';
}

function simulatePayment({ payment_method, card_number, expiry_date, cvv }) {
  if (payment_method !== 'card') return true;

  const cleanCard = String(card_number || '').replace(/\D/g, '');
  const cleanCvv = String(cvv || '').replace(/\D/g, '');
  const cleanExpiry = String(expiry_date || '').trim();

  if (cleanCard.length < 16 || cleanCvv.length < 3 || cleanExpiry.length < 4) {
    return false;
  }

  // Керований fail-сценарій для тесту: картка закінчується на 0000
  if (cleanCard.endsWith('0000')) {
    return false;
  }

  return true;
}

async function refreshOrderStatuses() {
  await db.execute(
    `UPDATE orders
     SET Status = CASE
        WHEN TIMESTAMPDIFF(MINUTE, order_date, NOW()) >= 20 THEN 'Доставлено'
        WHEN TIMESTAMPDIFF(MINUTE, order_date, NOW()) >= 15 THEN 'Замовлення очікує вас'
        WHEN TIMESTAMPDIFF(MINUTE, order_date, NOW()) >= 10 THEN 'Замовлення прямує до вас'
        WHEN TIMESTAMPDIFF(MINUTE, order_date, NOW()) >= 5 THEN 'Ваше замовлення чекає перевізника'
        ELSE 'Очікування'
     END,
     delivered_at = CASE
        WHEN TIMESTAMPDIFF(MINUTE, order_date, NOW()) >= 20
         AND (delivered_at IS NULL OR delivered_at = '0000-00-00 00:00:00')
         THEN NOW()
        ELSE delivered_at
     END
     WHERE Status IN ('Оплачено', 'Очікування', 'Ваше замовлення чекає перевізника', 'Замовлення прямує до вас', 'Замовлення очікує вас', 'Доставлено')`
  );
}

router.post('/pay', async (req, res) => {
  const {
    user_id,
    items,
    payment_method,
    card_number,
    expiry_date,
    cvv
  } = req.body || {};

  if (!user_id) {
    return res.status(400).json({ error: 'Не передано user_id' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Список товарів порожній або некоректний' });
  }

  const groupedItems = new Map();
  for (const item of items) {
    const productId = Number(item.product_id);
    const qty = Number(item.quantity);

    if (!Number.isFinite(productId) || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Некоректні дані товарів у кошику' });
    }

    groupedItems.set(productId, (groupedItems.get(productId) || 0) + qty);
  }

  const method = normalizeMethod(payment_method);
  const paymentSuccess = simulatePayment({
    payment_method: method,
    card_number,
    expiry_date,
    cvv
  });

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const productRows = [];

    for (const [productId] of groupedItems) {
      const [rows] = await connection.execute(
        'SELECT product_id, Name, Price, Stock FROM products WHERE product_id = ? FOR UPDATE',
        [productId]
      );

      if (!rows.length) {
        throw new Error(`Товар ${productId} не знайдено`);
      }

      productRows.push(rows[0]);
    }

    const productMap = new Map(productRows.map((p) => [Number(p.product_id), p]));

    for (const [productId, qty] of groupedItems) {
      const product = productMap.get(productId);
      if (!product || Number(product.Stock) < qty) {
        throw new Error(`Недостатньо товару на складі (product_id: ${productId})`);
      }
    }

    let amount = 0;
    for (const [productId, qty] of groupedItems) {
      const product = productMap.get(productId);
      amount += Number(product.Price) * qty;
    }

    const orderStatus = paymentSuccess ? 'Очікування' : 'Оплата не успішна';

    const [orderResult] = await connection.execute(
      'INSERT INTO orders (user_id, order_date, Status) VALUES (?, NOW(), ?)',
      [user_id, orderStatus]
    );

    const order_id = orderResult.insertId;

    for (const [productId, qty] of groupedItems) {
      const product = productMap.get(productId);
      await connection.execute(
        'INSERT INTO order_items (order_id, product_id, quantity, price_at_order) VALUES (?, ?, ?, ?)',
        [order_id, productId, qty, Number(product.Price)]
      );
    }

    const paymentStatus = paymentSuccess ? 'успішна' : 'невдала';
    await connection.execute(
      'INSERT INTO payments (order_id, user_id, amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?)',
      [order_id, user_id, amount, method, paymentStatus]
    );

    if (paymentSuccess) {
      for (const [productId, qty] of groupedItems) {
        await connection.execute(
          'UPDATE products SET Stock = Stock - ? WHERE product_id = ?',
          [qty, productId]
        );
      }

      await connection.execute('DELETE FROM cart_items WHERE user_id = ?', [user_id]);
    }

    await connection.commit();

    return res.status(paymentSuccess ? 201 : 402).json({
      order_id,
      amount,
      payment_method: method,
      payment_status: paymentStatus,
      message: paymentSuccess
        ? 'Оплата успішна. Замовлення оформлено.'
        : 'Оплата не успішна. Спробуйте інший спосіб.'
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Помилка симуляції оплати:', error);
    return res.status(500).json({ error: error.message || 'Помилка симуляції оплати' });
  } finally {
    connection.release();
  }
});

router.get('/user/:id/full', async (req, res) => {
  const userId = req.params.id;

  try {
    await refreshOrderStatuses();

    const [orders] = await db.execute(
      `SELECT
         o.order_id,
         o.order_date,
         o.Status AS status,
         o.delivered_at,
         p.payment_id,
         p.payment_method,
         p.payment_status,
         p.amount
       FROM orders o
       LEFT JOIN payments p ON p.order_id = o.order_id
       WHERE o.user_id = ?
       ORDER BY o.order_date DESC`,
      [userId]
    );

    const fullOrders = [];

    for (const order of orders) {
      const [items] = await db.execute(
        `SELECT
           oi.item_id,
           oi.product_id,
           oi.quantity,
           oi.price_at_order,
           p.Name,
           p.Photo
         FROM order_items oi
         JOIN products p ON oi.product_id = p.product_id
         WHERE oi.order_id = ?`,
        [order.order_id]
      );

      const total = items.reduce(
        (sum, item) => sum + Number(item.price_at_order || 0) * Number(item.quantity || 0),
        0
      );

      fullOrders.push({ ...order, items, total });
    }

    res.json(fullOrders);
  } catch (error) {
    console.error('❌ Помилка отримання замовлень:', error);
    res.status(500).json({ error: 'Не вдалося отримати замовлення' });
  }
});

export default router;
