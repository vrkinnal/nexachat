const express = require('express');
const cors = require('cors');
const path = require('path');

// Dynamically locate the .env file relative to this file's position
if (!process.env.VERCEL) {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}

const app = express();

// Enable CORS for your local dev server and your live Vercel frontend URL
app.use(cors({ 
  origin: [
    'http://localhost:4200',
    'https://nexachat-sepia.vercel.app'
  ] 
}));

app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(req.body)
    });

    console.log('Groq status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.log('Groq error:', error);
      return res.status(response.status).json({ error });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }

    res.end();

  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// For local development: Only spin up the port if we aren't deployed on Vercel
if (!process.env.VERCEL) {
  app.listen(3000, () => console.log('Proxy running on port 3000'));
}

// Crucial for Vercel: Export the app instance
module.exports = app;