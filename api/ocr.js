export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { base64Image } = req.body;
  const apiKey = process.env.GEMINI_API_KEY; 

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key পাওয়া যায়নি' });
  }

  try {
    const prompt = `আপনি একজন বিশেষজ্ঞ বাংলা OCR সিস্টেম। এই ছবিতে থাকা সমস্ত বাংলা (এবং যদি কোনো ইংরেজি থাকে) লেখা সঠিকভাবে পড়ে লিখুন। 
গুরুত্বপূর্ণ নির্দেশনা:
১. মূল ছবিতে যেভাবে প্যারাগ্রাফ, লাইন ব্রেক, হেডার বা তালিকা সাজানো রয়েছে, হুবহু সেই লেআউট ও ফরমেট ধরে রাখুন।
২. হাতের লেখা আঁকাবাঁকা হলেও অর্থ বুঝে সঠিক বানান শনাক্ত করুন।
৩. শুধুমাত্র ছবিতে থাকা টেক্সটটুকু আউটপুট হিসেবে দিন, কোনো অতিরিক্ত ব্যাখ্যা বা ভূমিকা দেবেন না।`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'OCR প্রক্রিয়া সম্পন্ন করতে সমস্যা হয়েছে' });
  }
}
