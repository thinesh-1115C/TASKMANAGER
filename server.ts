import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Lazy initialize Gemini client
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not configured.');
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return aiClient;
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Gemini API endpoint: analyze task title & description to suggest the best category and tags
  app.post('/api/gemini/suggest-category', async (req, res) => {
    try {
      const { title, description, existingCategories } = req.body;

      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Task title is required for AI category suggestion.' });
      }

      const availableCats =
        Array.isArray(existingCategories) && existingCategories.length > 0
          ? existingCategories.join(', ')
          : 'Work, Personal, Projects, Learning';

      const prompt = `You are an expert productivity assistant.
Analyze the following task and determine the single best category and most relevant tags.

Task Title: ${title.trim()}
Task Description: ${(description || '').trim() || 'None provided'}

Available user categories: [${availableCats}]

Instructions:
1. Select the single best matching category. Prefer one of the available user categories if it is an appropriate fit. If none fit well, propose a concise, high-quality category name (1-2 words, Capitalized, e.g., "Finance", "Health", "Errands", "Design").
2. Suggest 1 to 4 relevant, concise tags (in lowercase, without "#", e.g. "meeting", "roadmap", "ui", "budget").
3. Provide a brief 1-sentence reason explaining why this category and tags were selected.`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: 'The best matching category name.',
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '1 to 4 relevant tags for the task.',
              },
              reasoning: {
                type: Type.STRING,
                description: 'A brief 1-sentence reason for the recommendation.',
              },
            },
            required: ['category'],
          },
        },
      });

      const text = response.text;
      if (!text) {
        return res.status(500).json({ error: 'Received empty response from Gemini API.' });
      }

      let parsedResult;
      try {
        parsedResult = JSON.parse(text);
      } catch (parseErr) {
        return res.status(500).json({ error: 'Failed to parse Gemini JSON output.' });
      }

      return res.json({
        category: parsedResult.category || 'Work',
        tags: Array.isArray(parsedResult.tags) ? parsedResult.tags : [],
        reasoning: parsedResult.reasoning || '',
      });
    } catch (error: any) {
      console.error('Error in /api/gemini/suggest-category:', error);
      return res.status(500).json({
        error: error.message || 'An error occurred while analyzing the task with Gemini.',
      });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
