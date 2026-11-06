import React, { useState, useEffect } from 'react';
import { Camera, FileText, Download, Settings, RefreshCw, Edit3, AlertCircle, Key, Info } from 'lucide-react';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [loading, setLoading] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [fontFamily, setFontFamily] = useState('SutonnyMJ');
  const [customFont, setCustomFont] = useState('');
  const [fontSize, setFontSize] = useState('16px');
  const [textAlign, setTextAlign] = useState('left');
  const [authorName, setAuthorName] = useState('Abdur Rahman');
  const [base64Image, setBase64Image] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [scanCount, setScanCount] = useState(0);
  const DAILY_LIMIT = 10;
  const [quotaExceededMsg, setQuotaExceededMsg] = useState('');
  const [notice, setNotice] = useState(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const ADMIN_SECRET = 'admin123'; 
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const notify = (msg, isError = false) => {
    try {
      window.alert(msg);
    } catch {
      // safe fallback if iframe sandbox blocks window.alert
    }
    setNotice({ msg, isError });
    setTimeout(() => {
      setNotice((prev) => (prev?.msg === msg ? null : prev));
    }, 4500);
  };

  useEffect(() => {
    const adminStatus = sessionStorage.getItem('bangla_ocr_admin');
    if (adminStatus === 'true') {
      setIsAdmin(true);
    }

    const today = new Date().toDateString();
    const savedData = JSON.parse(localStorage.getItem('bangla_ocr_usage'));

    if (savedData && savedData.date === today) {
      setScanCount(savedData.count);
      if (savedData.count >= DAILY_LIMIT && adminStatus !== 'true') {
        setQuotaExceededMsg('কোটা এক্সিস্টিড! আজকের আপনার ফ্রি কোটা (১০টি ছবি) শেষ হয়ে গেছে। অনুগ্রহ করে আগামীকাল আবার চেষ্টা করুন।');
      }
    } else {
      localStorage.setItem('bangla_ocr_usage', JSON.stringify({ date: today, count: 0 }));
      setScanCount(0);
    }
  }, []);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminInput === ADMIN_SECRET) {
      setIsAdmin(true);
      sessionStorage.setItem('bangla_ocr_admin', 'true');
      setQuotaExceededMsg('');
      setShowAdminPanel(false);
      notify('অভিনন্দন! আপনি অ্যাডমিন মোডে প্রবেশ করেছেন। আপনার কোনো লিমিট নেই।');
    } else {
      notify('ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।', true);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      setBase64Image(base64String);
    };
    reader.readAsDataURL(file);
  };

  const performOCR = async () => {
    if (!isAdmin && scanCount >= DAILY_LIMIT) {
      setQuotaExceededMsg('কোটা এক্সিস্টিড! আজকের আপনার ফ্রি কোটা (১০টি ছবি) শেষ হয়ে গেছে। অনুগ্রহ করে আগামীকাল আবার চেষ্টা করুন।');
      return;
    }

    if (!base64Image) {
      notify('দয়া করে প্রথমে একটি ছবি সিলেক্ট করুন!', true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image })
      });

      const result = await response.json();
      if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
        setExtractedText(result.candidates[0].content.parts[0].text);
        setActiveTab('editor');

        if (!isAdmin) {
          const newCount = scanCount + 1;
          setScanCount(newCount);
          const today = new Date().toDateString();
          localStorage.setItem('bangla_ocr_usage', JSON.stringify({ date: today, count: newCount }));

          if (newCount >= DAILY_LIMIT) {
            setQuotaExceededMsg('কোটা এক্সিস্টিড! আজকের আপনার ফ্রি কোটা (১০টি ছবি) শেষ হয়ে গেছে। অনুগ্রহ করে আগামীকাল আবার চেষ্টা করুন।');
          }
        }

      } else if (result.error) {
        setExtractedText(`সমস্যা: ${result.error}`);
        notify(result.error, true);
      } else {
        setExtractedText('লেখা শনাক্ত করা যায়নি। পরিষ্কার ছবি দিয়ে আবার চেষ্টা করুন।');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      setExtractedText('সার্ভারে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const downloadWordDoc = () => {
    const activeFont = fontFamily === 'Custom' ? customFont : fontFamily;
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Bangla OCR Document</title>
      <style>
        body { font-family: '${activeFont}', 'SolaimanLipi', sans-serif; font-size: ${fontSize}; line-height: 1.6; text-align: ${textAlign}; direction: ltr; padding: 20px; }
        .footer { margin-top: 40px; font-size: 12px; color: #555; border-top: 1px solid #ccc; padding-top: 10px; }
      </style>
      </head>
      <body>
        <div>${extractedText.replace(/\n/g, '<br>')}</div>
        <div class="footer">Created by: ${authorName} | Generated via bangla-ocr</div>
      </body>
      </html>`;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bangla-ocr-document.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getFontFamilyCSS = () => {
    if (fontFamily === 'Custom') return customFont;
    if (fontFamily === 'SutonnyMJ') return 'SutonnyMJ, Kalpurush, sans-serif';
    if (fontFamily === 'SolaimanLipi') return 'SolaimanLipi, sans-serif';
    if (fontFamily === 'Kalpurush') return 'Kalpurush, sans-serif';
    return 'sans-serif';
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-indigo-700 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" /> bangla-ocr
        </h1>
        <div className="flex items-center gap-3">
          <div className="text-xs bg-indigo-800 px-3 py-1 rounded-full">
            {isAdmin ? '👑 অ্যাডমিন মোড (আনলিমিটেড)' : `ব্যবহার: ${scanCount}/10 টি`}
          </div>
          {!isAdmin && (
            <button 
              onClick={() => setShowAdminPanel(!showAdminPanel)} 
              className="text-xs bg-indigo-900 hover:bg-indigo-950 px-2.5 py-1 rounded transition"
            >
              🔐 Admin Login
            </button>
          )}
        </div>
      </header>

      {notice && (
        <div className={`p-3 text-sm flex items-center justify-between shadow-sm transition-all ${
          notice.isError ? 'bg-rose-50 text-rose-800 border-b border-rose-200' : 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
        }`}>
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full px-4">
            {notice.isError ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <Info className="w-4 h-4 flex-shrink-0" />}
            <span>{notice.msg}</span>
          </div>
        </div>
      )}

      {showAdminPanel && !isAdmin && (
        <div className="bg-indigo-50 border-b p-3 flex justify-center items-center gap-2 shadow-inner">
          <form onSubmit={handleAdminLogin} className="flex gap-2 items-center text-sm">
            <Key className="w-4 h-4 text-indigo-700" />
            <input 
              type="password" 
              placeholder="অ্যাডমিন পাসওয়ার্ড দিন..." 
              value={adminInput}
              onChange={(e) => setAdminInput(e.target.value)}
              className="border rounded px-2 py-1 outline-none text-sm"
            />
            <button type="submit" className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-indigo-700">
              লগইন
            </button>
          </form>
        </div>
      )}

      {quotaExceededMsg && !isAdmin && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 m-4 rounded-r-lg shadow-sm flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <p className="text-amber-800 text-sm font-medium">{quotaExceededMsg}</p>
        </div>
      )}

      <div className="flex bg-white border-b shadow-sm md:hidden">
        <button 
          onClick={() => setActiveTab('scan')} 
          className={`flex-1 py-3 text-center font-medium ${activeTab === 'scan' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
        >
          📷 ছবি ও স্ক্যান
        </button>
        <button 
          onClick={() => setActiveTab('editor')} 
          className={`flex-1 py-3 text-center font-medium ${activeTab === 'editor' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
        >
          📝 এডিটর ও পেজ সেটআপ
        </button>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`space-y-4 ${activeTab === 'scan' ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-600" /> ছবি আপলোড করুন
            </h2>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer mb-4" />
            
            {imagePreview && (
              <div className="mb-4 border rounded-lg overflow-hidden h-48 bg-slate-50 flex items-center justify-center">
                <img src={imagePreview} alt="Preview" className="max-h-full object-contain" />
              </div>
            )}

            <button 
              onClick={performOCR} 
              disabled={loading || (!isAdmin && scanCount >= DAILY_LIMIT) || !base64Image} 
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-slate-300 transition flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
              {loading ? 'লেখা শনাক্ত করা হচ্ছে...' : (!isAdmin && scanCount >= DAILY_LIMIT) ? 'কোটা শেষ (Limit Exceeded)' : 'টেক্সটে কনভার্ট করুন (OCR)'}
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" /> পেজ ও ক্রেডিট সেটিংস
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">ওয়েবসাইট বা ফাইলের ক্রেডিট (Author):</label>
              <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">ফন্ট স্টাইল:</label>
              <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="SutonnyMJ">SutonnyMJ (ডিফল্ট)</option>
                <option value="Kalpurush">Kalpurush</option>
                <option value="SolaimanLipi">SolaimanLipi</option>
                <option value="Custom">অন্যান্য (Custom Font)</option>
              </select>
            </div>
            {fontFamily === 'Custom' && (
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">আপনার কম্পিউটারের ফন্টের নাম লিখুন:</label>
                <input type="text" placeholder="যেমন: Arial বা Siyam Rupali" value={customFont} onChange={(e) => setCustomFont(e.target.value)} className="w-full border rounded-lg p-2 text-sm" />
              </div>
            )}
          </div>
        </div>

        <div className={`space-y-4 ${activeTab === 'editor' ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[650px]">
            <div className="flex justify-between items-center mb-3 pb-2 border-b">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" /> পেজ এডিটর ও প্রিভিউ
              </h2>
              <button onClick={downloadWordDoc} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-sm">
                <Download className="w-4 h-4" /> Word (.doc) ডাউনলোড
              </button>
            </div>

            <div className="flex gap-2 mb-3 bg-slate-50 p-2 rounded-lg text-sm">
              <select value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="border rounded px-2 py-1 bg-white">
                <option value="14px">ছোট (14px)</option>
                <option value="16px">সাধারণ (16px)</option>
                <option value="18px">বড় (18px)</option>
                <option value="22px">খুব বড় (22px)</option>
              </select>
              <select value={textAlign} onChange={(e) => setTextAlign(e.target.value)} className="border rounded px-2 py-1 bg-white">
                <option value="left">বাম দিক (Left)</option>
                <option value="center">মাঝখানে (Center)</option>
                <option value="right">ডান দিক (Right)</option>
                <option value="justify">উভয় পাশ (Justify)</option>
              </select>
            </div>

            <div className="flex-1 border rounded-lg p-6 bg-white shadow-inner overflow-y-auto">
              <div 
                contentEditable 
                suppressContentEditableWarning={true}
                onInput={(e) => setExtractedText(e.currentTarget.innerHTML)}
                style={{ fontFamily: getFontFamilyCSS(), fontSize: fontSize, textAlign: textAlign, minHeight: '100%', outline: 'none' }}
                dangerouslySetInnerHTML={{ __html: extractedText || '<span style="color: #94a3b8;">ছবি আপলোড করে OCR করলে অথবা এখানে সরাসরি টাইপ/কপি-পেস্ট করলে লেখা এখানে দেখাবে এবং এডিট করতে পারবেন...</span>' }}
              />
            </div>
            <div className="text-right text-xs text-slate-400 mt-2">
              Created by: {authorName}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
