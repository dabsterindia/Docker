const express = require('express');
const mysql = require('mysql2/promise');

const app = express();

// Database connection config — uses environment variables
// Container name 'mysql-db' works as hostname thanks to Docker DNS!
const dbConfig = {
  host: process.env.DB_HOST,       // 'mysql-db' — resolved by Docker DNS
  user: process.env.DB_USER,       // 'root'
  password: process.env.DB_PASSWORD, // 'secret'
  database: process.env.DB_NAME,   // 'appdb'
};

// Home route — queries the database
app.get('/', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT NOW() AS current_server_time');
//    const [rows] = await connection.execute('SELECT NOW()');

    await connection.end();
    res.send(`
      <h2>🐳 Docker Networking Demo</h2>
      <p>✅ Web app is running!</p>
      <p>✅ Connected to MySQL via hostname: <b>${process.env.DB_HOST}</b></p>
      <p>🕐 Database server time: <b>${rows[0].current_server_time}</b></p>
    `);
  } catch (err) {
    res.status(500).send(`❌ Database error: ${err.message}`);
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'web-app' });
});

app.listen(3000, () => {
  console.log('🌐 Web app running on port 3000');
  console.log(`📡 Connecting to DB at: ${process.env.DB_HOST}`);
});