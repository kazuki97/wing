// main.js
import { initializeUI } from './ui.js';
import { initializeDatabase } from './db.js';

// 他の必要なインポート

document.addEventListener('DOMContentLoaded', () => {
    initializeDatabase();
});
