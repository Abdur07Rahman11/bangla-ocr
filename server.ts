import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.post('/api/ocr', async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: 'ছবি প্রদান করা হয়নি (No image provided)' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'API Key পাওয়া যায়নি (GEMINI_API_KEY environment variable is not set)' 
      });
    }

    const prompt = `আপনি একজন বিশেষজ্ঞ বাংলা OCR সিস্টেম। এই ছবিতে থাকা সমস্ত বাংলা (এবং যদি কোনো ইংরেজি থাকে) লেখা সঠিকভাবে পড়ে লিখুন। 
গুরুত্বপূর্ণ নির্দেশনা:
১. মূল ছবিতে যেভাবে প্যারাগ্রাফ, লাইন ব্রেক, হেডার বা তালিকা সাজানো রয়েছে, হুবহু সেই লেআউট ও ফরমেট ধরে রাখুন।
২. হাতের লেখা আঁকাবাঁকা হলেও অর্থ বুঝে সঠিক বানান শনাক্ত করুন।
৩. শুধুমাত্র ছবিতে থাকা টেক্সটটুকু আউটপুট হিসেবে দিন, কোনো অতিরিক্ত ব্যাখ্যা বা ভূমিকা দেবেন না।`;

    const ai = new GoogleGenAI({ apiKey });
    
    // Clean base64 string if it contains data URI prefix
    const cleanBase64 = base64Image.includes(',') 
      ? base64Image.split(',')[1] 
      : base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64
          }
        }
      ]
    });

    const textOutput = response.text || '';

    return res.status(200).json({
      text: textOutput,
      candidates: [
        {
          content: {
            parts: [
              { text: textOutput }
            ]
          }
        }
      ]
    });
  } catch (error: any) {
    console.error('OCR Processing error:', error);
    return res.status(500).json({ 
      error: error?.message || 'OCR প্রক্রিয়া সম্পন্ন করতে সমস্যা হয়েছে' 
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
