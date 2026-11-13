import { GoogleGenAI } from '@google/genai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

async function withRetry(fn, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || '');
      const busy = err?.status === 503 || msg.includes('"code":503') || msg.includes('UNAVAILABLE');
      if (!busy || i === tries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function generateWithFallback(ai, params) {
  const models = [
    process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
  ];
  let lastErr;
  for (const model of models) {
    try {
      return await withRetry(() => ai.models.generateContent({ ...params, model }), 1);
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || '');
      const switchable = err?.status === 503 || err?.status === 404 || msg.includes('"code":503') || msg.includes('"code":404') || msg.includes('UNAVAILABLE') || msg.includes('NOT_FOUND');
      if (!switchable) throw err;
    }
  }
  throw lastErr;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { base64Image } = req.body;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API Key পাওয়া যায়নি। Settings > Secrets প্যানেলে GEMINI_API_KEY সেট করুন (অথবা Vercel Environment Variables-এ যুক্ত করুন)।' 
    });
  }

  try {
    const prompt = `আপনি একজন বিশেষজ্ঞ বাংলা OCR সিস্টেম। এই ছবিতে থাকা সমস্ত বাংলা (এবং যদি কোনো ইংরেজি থাকে) লেখা সঠিকভাবে পড়ে লিখুন। 
গুরুত্বপূর্ণ নির্দেশনা:
১. মূল ছবিতে যেভাবে প্যারাগ্রাফ, লাইন ব্রেক, হেডার বা তালিকা সাজানো রয়েছে, হুবহু সেই লেআউট ও ফরমেট ধরে রাখুন।
২. হাতের লেখা আঁকাবাঁকা হলেও অর্থ বুঝে সঠিক বানান শনাক্ত করুন।
৩. শুধুমাত্র ছবিতে থাকা টেক্সটটুকু আউটপুট হিসেবে দিন, কোনো অতিরিক্ত ব্যাখ্যা বা ভূমিকা দেবেন না।`;

    const cleanBase64 = base64Image.includes(',')
      ? base64Image.split(',')[1]
      : base64Image;

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    const response = await generateWithFallback(ai, {
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64,
          },
        },
      ],
    });

    const textOutput = response.text || '';

    return res.status(200).json({
      text: textOutput,
      candidates: [
        {
          content: {
            parts: [{ text: textOutput }],
          },
        },
      ],
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'OCR প্রক্রিয়া সম্পন্ন করতে সমস্যা হয়েছে',
    });
  }
    }
