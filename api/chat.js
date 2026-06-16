const express = require('express');
const cors = require('cors');
const path = require('path');

// Load .env only for local development
if (!process.env.VERCEL) {
  require('dotenv').config({
    path: path.resolve(__dirname, '../.env')
  });
}

const app = express();

app.use(cors({
  origin: [
    'http://localhost:4200',
    'https://nexachat-sepia.vercel.app'
  ]
}));

app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'OPENAI_API_KEY is not configured'
      });
    }

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(req.body)
      }
    );

    console.log('Groq status:', response.status);

    if (!response.ok) {
      const error = await response.text();

      console.error('Groq error:', error);

      return res.status(response.status).json({
        error: `Groq request failed (${response.status})`,
        details: error
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      res.write(decoder.decode(value));
    }

    res.end();
  } catch (error) {
    console.error('Proxy error:', error);

    res.status(500).json({
      error: error.message
    });
  }
});

module.exports = app;