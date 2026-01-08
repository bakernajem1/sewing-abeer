
import React, { useState } from 'react';
import { Send, Sparkles, Loader2, Info } from 'lucide-react';
import { parseNaturalLanguage } from '../services/geminiService';
import { AIDataResponse } from '../types';

interface Props {
  onDataExtracted: (data: AIDataResponse) => void;
}

const AIInput: React.FC<Props> = ({ onDataExtracted }) => {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelper, setShowHelper] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await parseNaturalLanguage(text);
      onDataExtracted(result);
      setText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-3xl shadow-lg text-white mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles size={120} />
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded-xl">
              <Sparkles size={20} className="text-blue-100" />
            </div>
            <h2 className="text-lg font-bold">المدخل الذكي (Gemini)</h2>
          </div>
          <button onClick={() => setShowHelper(!showHelper)} className="text-blue-100 hover:text-white">
            <Info size={20} />
          </button>
        </div>

        {showHelper && (
          <div className="bg-white/10 p-3 rounded-xl mb-4 text-xs space-y-1 animate-in fade-in slide-in-from-top-2">
            <p>أمثلة لما يمكنك قوله:</p>
            <ul className="list-disc list-inside opacity-80">
              <li>"حنان عملت 200 قبة بسعر 0.1 وسعر المورد 0.5"</li>
              <li>"سلفة لسميرة مبلغ 100 شيكل"</li>
              <li>"فاتورة خيوط بقيمة 50 شيكل"</li>
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب هنا.. مثلاً: سميرة 50 سحاب بسعر 0.2"
            className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pr-4 pl-14 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm transition-all"
          />
          <button
            type="submit"
            disabled={isProcessing || !text.trim()}
            className="absolute left-2 top-2 bottom-2 bg-white text-blue-700 px-4 rounded-xl font-bold flex items-center justify-center hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIInput;
