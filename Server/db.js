// db.js
import mysql from 'mysql2/promise';

export const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', // ← порожній рядок
    database: 'pavlenko_shop',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});