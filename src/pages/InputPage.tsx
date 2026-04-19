import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDreamStorage } from '../hooks/useDreamStorage';
import { processDream } from '../services/mockAI';
import { Dream } from '../types';
import '../styles/InputPage.css';

const PROMPTS = [
  "Write down whatever you remember",
  "It doesn't have to be complete",
  "Fragments are okay",
  "Just a feeling is enough",
];

const AI_PROMPTS = [
  "How did it feel?",
  "Was there a specific image?",
  "What color was it?",
  "Were you alone?",
];

export function InputPage() {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [aiPromptIndex, setAiPromptIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { saveDream } = useDreamStorage();

  useEffect(() => {
    const timer = setInterval(() => {
      setPromptIndex(prev => (prev + 1) % PROMPTS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (text.length <= 20) {
      return;
    }
    const timer = setInterval(() => {
      setAiPromptIndex(prev => (prev + 1) % AI_PROMPTS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [text.length > 20]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsProcessing(true);

    try {
      const result = await processDream(text);

      // Check if we're recording for a specific date
      const selectedTimestamp = location.state?.selectedDate;
      const createdAt = selectedTimestamp || Date.now();

      const dream: Dream = {
        id: Date.now().toString(),
        createdAt: createdAt,
        originalText: text,
        dreamTitle: result.dreamTitle,
        coreImagery: result.tags,  // 向后兼容
        tags: result.tags,         // 新版
        story: result.storyNodes.map(node => ({
          ...node,
          imageUrl: node.imageUrl || `https://picsum.photos/seed/${Date.now()}-${Math.random()}/1280/720`
        })),
      };

      // 确保 saveDream 完成
      await saveDream(dream);

      // 直接跳转，并把 dream 对象通过 state 传递！！！
      navigate(`/dream/${dream.id}`, {
        replace: true,
        state: { dream }
      });
    } catch (error) {
      console.error('Failed to process dream:', error);
      alert('Something happened... try again');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="input-page">
      <div className="fog-overlay"></div>

      <button onClick={() => navigate(location.state?.selectedDate ? '/history' : '/')} className="back-button">
        ←
      </button>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-container">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder=""
            disabled={isProcessing}
            className="dream-input"
            autoFocus
          />

          <div className="placeholder-container">
            <span className={`placeholder-text ${text ? 'hidden' : ''}`}>
              {PROMPTS[promptIndex]}
            </span>
          </div>

          {text.length > 20 && (
            <div className="ai-prompt">
              <span className="ai-dot"></span>
              {AI_PROMPTS[aiPromptIndex]}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!text.trim() || isProcessing}
          className="submit-button"
        >
          {isProcessing ? (
            <>
              <span className="spinner-dot"></span>
              <span className="spinner-dot"></span>
              <span className="spinner-dot"></span>
            </>
          ) : (
            <span>It will be remembered</span>
          )}
        </button>
      </form>
    </div>
  );
}
