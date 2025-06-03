import express from 'express';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

const MESSAGES_FILE = path.resolve(process.cwd(), 'output', 'messages.json');

app.get('/', (req, res) => {
  if (!fs.existsSync(MESSAGES_FILE)) {
    return res.status(404).json({ error: 'messages.json not found' });
  }
  const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
  try {
    const messages = JSON.parse(data);
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: 'Invalid JSON' });
  }
});

app.listen(PORT, () => {
  console.log(`API сервер запущен на http://localhost:${PORT}`);
}); 