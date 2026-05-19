import { db } from './db.js';

export function parseUserId(req) {
  const body = req.body || {};
  return req.headers['x-user-id'] || body.user_id || body.userId || req.query.user_id || req.query.userId;
}

export function requireRole(requiredRole) {
  return async (req, res, next) => {
    const userId = parseUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Не передано user_id для перевірки ролі' });
    }

    try {
      const [rows] = await db.execute(
        `SELECT r.name_role
         FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE u.user_id = ?`,
        [userId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Користувача не знайдено' });
      }

      const userRole = rows[0].name_role;
      if (userRole !== requiredRole) {
        return res.status(403).json({ error: `Доступ заборонено: потрібна роль ${requiredRole}` });
      }

      req.user = {
        user_id: Number(userId),
        role: userRole
      };
      next();
    } catch (error) {
      console.error('❌ Помилка перевірки ролі:', error);
      res.status(500).json({ error: 'Помилка перевірки ролі' });
    }
  };
}
