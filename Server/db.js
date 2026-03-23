// db.js
import mysql from 'mysql2/promise';

export const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', // ← порожній рядок
    database: 'textiles_p',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});