const express = require('express');
const mysql = require('mysql2/promise');

const app = express();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

app.get('/', async (req, res) => {
  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute('SELECT NOW() AS time');
  await conn.end();
  res.send(`<h2>✅ App is build by Dabster Inc & its running! DB time: ${rows[0].time}</h2>`);
});

app.listen(3000, () => console.log('App running on port 3000'));