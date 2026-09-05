// server.js
// Tiny Express server: serves the quiz's static frontend AND proxies scoring
// requests to the Anthropic API, so the API key never has to sit in the browser.
//
// Local run:   ANTHROPIC_API_KEY=sk-ant-xxxx node server.js
// Render run:  set ANTHROPIC_API_KEY in the service's Environment tab (see README.md)

const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

function buildJudgePrompt(guess, actual) {
  return (
    'You are judging a "reverse video challenge" game. A player watched an AI-generated ' +
    'video clip and guessed the text prompt that created it. Compare their guess to the real ' +
    'prompt and score how well they captured the same subject, action, style, and key visual ' +
    'details (not exact wording).\n\n' +
    'Real prompt: "' + actual.replace(/"/g, '\\"') + '"\n' +
    'Player guess: "' + guess.replace(/"/g, '\\"') + '"\n\n' +
    'Respond with ONLY a JSON object, no markdown, no preamble, in this exact shape: ' +
    '{"score": <integer 0-100>, "feedback": "<one short sentence, under 20 words, on what they got right or missed>"}'
  );
}

app.post('/api/score', async (req, res) => {
  const { guess, actual } = req.body || {};

  if (!actual || typeof actual !== 'string') {
    return res.status(400).json({ error: 'missing_actual_prompt' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'server_missing_api_key' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages: [{ role: 'user', content: buildJudgePrompt(String(guess || ''), actual) }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return res.status(502).json({ error: 'anthropic_api_error' });
    }

    const data = await response.json();
    const textBlock = (data.content || []).find(b => b.type === 'text');
    if (!textBlock) throw new Error('no text block in response');

    const clean = textBlock.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (typeof parsed.score !== 'number') throw new Error('unexpected response shape');

    return res.json({
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      feedback: parsed.feedback || ''
    });
  } catch (err) {
    console.error('Scoring error:', err.message);
    return res.status(500).json({ error: 'scoring_failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Video quiz server running on port ' + PORT));
