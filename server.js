require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const app     = express();

const HISTORY_FILE = path.join(__dirname, 'chat_history.json');

// ── FILE-BASED HISTORY HELPERS ──
function readHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch { return []; }
}
function writeHistory(data) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), 'utf8');
}

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // serves index.html from /public folder

// ── GET all chat history ──
app.get('/api/history', (req, res) => {
  res.json(readHistory());
});

// ── SAVE / UPDATE all chats ──
app.post('/api/history', (req, res) => {
  const chats = req.body;
  if (!Array.isArray(chats)) return res.status(400).json({ error: 'Expected an array' });
  writeHistory(chats);
  res.json({ ok: true });
});

// ── DELETE a single chat ──
app.delete('/api/history/:id', (req, res) => {
  const chats = readHistory().filter(c => c.id !== req.params.id);
  writeHistory(chats);
  res.json({ ok: true });
});

// ── PROXY ROUTE — hides your API key from the browser ──
app.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}` // ✅ key stays on server
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);

  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: { message: err.message } });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🔑 API Key loaded: ${process.env.GROQ_API_KEY ? 'YES ✅' : 'NO ❌ — check your .env file'}`);
  console.log(`💾 Chat history stored at: ${HISTORY_FILE}`);
});