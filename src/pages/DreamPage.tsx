import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDreamStorage } from '../hooks/useDreamStorage';
import { EmotionTag, DreamAnalysis, EndingType, StoryNode, DreamVersion, BranchDecisionPoint, PainPointResult, QuestionAnswer, CyberAnalysisResult, DreamerBase } from '../types';
import { callPainPointDetective, callCyberJudge, getDreamerBase, saveDreamerBase } from '../services/analysisAI';
import { callDreamContinuation, callDecisionPoints, callDreamBranch } from '../services/rewriteAI';
import { generateDreamImage } from '../services/imageGeneration';
import '../styles/DreamPage.css';
import '../styles/themes.css';

const EMOTION_TAGS: EmotionTag[] = ['疲惫', '焦虑', '期待', '平静', '心碎', '破防'];

export function DreamPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { getDream, saveDream, loading } = useDreamStorage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [dream, setDream] = useState<ReturnType<typeof getDream>>(undefined);

  // Analysis modal state (赛博心理判官)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<'dreamer-base' | 'pain-points' | 'generating' | 'cyber-result'>('dreamer-base');
  const [dayResidueText, setDayResidueText] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionTag | null>(null);
  const [analysis, setAnalysis] = useState<DreamAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 做梦者基底状态
  const [dreamerBase, setDreamerBase] = useState<DreamerBase>({});

  // 刺点侦探状态
  const [painPointResult, setPainPointResult] = useState<PainPointResult | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionTextInputs, setQuestionTextInputs] = useState<string[]>([]);
  const [questionTagSelections, setQuestionTagSelections] = useState<string[]>([]);

  // 赛博判官结果
  const [cyberAnalysis, setCyberAnalysis] = useState<CyberAnalysisResult | null>(null);

  // Dream rewrite system state
  const [rewriteMode, setRewriteMode] = useState<'none' | 'continue' | 'ending' | 'branch'>('none');
  const [continueInput, setContinueInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedEnding, setSelectedEnding] = useState<EndingType | null>(null);
  const [originalStoryLength, setOriginalStoryLength] = useState(0);
  const [continuationMode, setContinuationMode] = useState<'auto' | 'manual' | null>(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  // Continuation Modal States
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [continueModalStep, setContinueModalStep] = useState<'input' | 'preview' | 'generating'>('input');
  const [previewNodes, setPreviewNodes] = useState<StoryNode[]>([]);
  // Cache for continuation history
  const [cachedPreviewNodes, setCachedPreviewNodes] = useState<StoryNode[]>([]);
  const [cachedMode, setCachedMode] = useState<'auto' | 'manual' | null>(null);
  const [cachedInput, setCachedInput] = useState<string>('');

  // Branch feature states
  const [isBranchScanMode, setIsBranchScanMode] = useState(false);
  const [branchDecisionPoint, setBranchDecisionPoint] = useState<BranchDecisionPoint | null>(null);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [customBranchInput, setCustomBranchInput] = useState('');
  const [branchPreviewNodes, setBranchPreviewNodes] = useState<StoryNode[]>([]);
  const [branchModalStep, setBranchModalStep] = useState<'menu' | 'generating' | 'preview'>('menu');
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [selectedBranchOption, setSelectedBranchOption] = useState<string>('');

  // Dream tree drawer state
  const [showDreamTreeDrawer, setShowDreamTreeDrawer] = useState(false);

  // Image generation state
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const isGeneratingRef = useRef(false);
  const dreamIdRef = useRef<string | null>(null);

  useEffect(() => {
    // 等待数据加载完成
    if (loading) return;

    if (!id) {
      navigate('/');
      return;
    }

    // 优先从路由 state 里拿 dream！！！这是最可靠的方式
    const dreamFromState = location.state?.dream;
    if (dreamFromState && dreamFromState.id === id) {
      setDream(dreamFromState);
      if (dreamFromState.analysis) {
        setAnalysis(dreamFromState.analysis);
      }
      if (dreamFromState.versions && dreamFromState.versions.length > 0) {
        const originalVersion = dreamFromState.versions.find((v: DreamVersion) => v.versionType === 'original');
        if (originalVersion) {
          setOriginalStoryLength(originalVersion.story.length);
        } else {
          setOriginalStoryLength(dreamFromState.versions[0].story.length);
        }
      } else {
        setOriginalStoryLength(dreamFromState.story.length);
      }
      return;
    }

    // state 里没有的话，再从 storage 找
    const foundDream = getDream(id);
    if (foundDream) {
      setDream(foundDream);
      if (foundDream.analysis) {
        setAnalysis(foundDream.analysis);
      }
      if (foundDream.versions && foundDream.versions.length > 0) {
        const originalVersion = foundDream.versions.find(v => v.versionType === 'original');
        if (originalVersion) {
          setOriginalStoryLength(originalVersion.story.length);
        } else {
          setOriginalStoryLength(foundDream.versions[0].story.length);
        }
      } else {
        setOriginalStoryLength(foundDream.story.length);
      }
      return;
    }

    // 都找不到才跳转
    navigate('/');
  }, [id, getDream, navigate, loading, location.state]);

  // Background image generation
  useEffect(() => {
    if (!dream || !dream.story || dream.story.length === 0) return;
    if (dreamIdRef.current === dream.id) return;
    if (isGeneratingRef.current) return;

    dreamIdRef.current = dream.id;
    isGeneratingRef.current = true;

    const generateImages = async () => {
      // 先创建一个本地副本，避免频繁更新 state
      const storyCopy = [...dream.story];
      const newLoadedImages = new Set(loadedImages);
      let needsSave = false;

      for (let i = 0; i < storyCopy.length; i++) {
        const node = storyCopy[i];
        // Skip if already has a real image (not placeholder)
        if (node.imageUrl && !node.imageUrl.includes('picsum.photos')) {
          newLoadedImages.add(i);
          continue;
        }

        // Skip if no visual prompt
        if (!node.visualPrompt) {
          continue;
        }

        try {
          const imageUrl = await generateDreamImage(node.visualPrompt);
          storyCopy[i] = { ...node, imageUrl };
          newLoadedImages.add(i);
          needsSave = true;
        } catch (error) {
          console.error(`Failed to generate image for node ${i}:`, error);
        }

        // Add delay between requests
        if (i < storyCopy.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }

      // 最后一次性更新 state 和 storage
      if (needsSave) {
        setDream(prev => prev ? { ...prev, story: storyCopy } : prev);
        const currentDream = getDream(dream.id);
        if (currentDream) {
          saveDream({ ...currentDream, story: storyCopy });
        }
      }
      setLoadedImages(newLoadedImages);
      isGeneratingRef.current = false;
    };

    generateImages();
  }, [dream?.id, dream?.story.length]);

  const nextSlide = useCallback(() => {
    if (!dream || currentIndex >= dream.story.length - 1) return;

    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setIsTransitioning(false);
    }, 800);
  }, [currentIndex, dream]);

  const prevSlide = useCallback(() => {
    if (currentIndex <= 0) return;

    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(prev => prev - 1);
      setIsTransitioning(false);
    }, 800);
  }, [currentIndex]);

  useEffect(() => {
    if (!dream) return;

    const timer = setTimeout(() => {
      if (currentIndex < dream.story.length - 1) {
        nextSlide();
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [currentIndex, dream, nextSlide]);

  const handleOpenAnalysis = () => {
    // 如果已有分析结果，直接显示（兼容旧版）
    if (dream?.analysis) {
      setAnalysis(dream.analysis);
      // 检查是否有新版赛博分析
      if (dream.analysis.cyberAnalysis) {
        setCyberAnalysis(dream.analysis.cyberAnalysis);
        setAnalysisStep('cyber-result');
      } else {
        // 旧版分析，重新走流程
        startAnalysisFlow();
      }
      setShowAnalysisModal(true);
      return;
    }

    startAnalysisFlow();
  };

  const startAnalysisFlow = () => {
    // 检查是否已有做梦者基底
    const savedBase = getDreamerBase();
    if (savedBase) {
      // 保留年龄、性别、MBTI，清空今日状态
      setDreamerBase({
        age: savedBase.age,
        gender: savedBase.gender,
        mbti: savedBase.mbti
      });
    }
    setAnalysisStep('dreamer-base');
    setShowAnalysisModal(true);
  };

  // 做梦者基底收集
  const handleSaveDreamerBase = () => {
    saveDreamerBase(dreamerBase);
    startPainPointDetection();
  };

  // 启动刺点侦探
  const startPainPointDetection = async () => {
    if (!dream) return;
    setIsAnalyzing(true);
    setAnalysisStep('generating');

    try {
      const result = await callPainPointDetective(dream.originalText);
      setPainPointResult(result);
      setCurrentQuestionIndex(0);
      setQuestionTextInputs(new Array(result.questions.length).fill(''));
      setQuestionTagSelections(new Array(result.questions.length).fill(''));
      setAnalysisStep('pain-points');
    } catch (error) {
      console.error('Pain point detection failed:', error);
      alert('刺点检测失败，请重试');
      setAnalysisStep('dreamer-base');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 切换上一题
  const handlePrevQuestion = () => {
    if (currentQuestionIndex <= 0) return;
    setCurrentQuestionIndex(currentQuestionIndex - 1);
  };

  // 切换下一题
  const handleNextQuestion = () => {
    if (!painPointResult) return;

    if (currentQuestionIndex < painPointResult.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // 最后一题，收集所有答案并生成
      const answers: QuestionAnswer[] = questionTextInputs.map((text, idx) => ({
        questionIndex: idx,
        textAnswer: text || undefined,
        selectedTag: questionTagSelections[idx] || undefined
      }));
      generateCyberAnalysis(answers);
    }
  };

  // 更新当前问题的文本输入
  const handleQuestionTextChange = (text: string) => {
    const newInputs = [...questionTextInputs];
    newInputs[currentQuestionIndex] = text;
    setQuestionTextInputs(newInputs);
  };

  // 更新当前问题的Tag选择
  const handleQuestionTagSelect = (tag: string) => {
    const newTags = [...questionTagSelections];
    newTags[currentQuestionIndex] = tag;
    setQuestionTagSelections(newTags);
  };

  // 生成赛博判官分析
  const generateCyberAnalysis = async (answers: QuestionAnswer[]) => {
    if (!dream) return;

    setIsAnalyzing(true);
    setAnalysisStep('generating');

    try {
      const dayContext = `${dayResidueText || ''} ${selectedEmotion ? `情绪：${selectedEmotion}` : ''}`.trim();
      const savedBase = getDreamerBase() || dreamerBase;

      const result = await callCyberJudge(
        savedBase,
        dayContext,
        dream.originalText,
        answers
      );

      setCyberAnalysis(result);

      // 兼容旧版分析存储
      const legacyAnalysis: DreamAnalysis = {
        vibe_tag: result.title_tag,
        reality_mirror: result.symbols_decoded[0]?.meaning || '',
        symbols_decoded: result.symbols_decoded.map(s => ({ symbol: s.symbol, meaning: s.meaning })),
        soul_message: result.cyber_diagnosis,
        actionable_advice: result.electronic_ibuprofen,
        cyberAnalysis: result
      };

      setAnalysis(legacyAnalysis);
      const updatedDream = { ...dream, analysis: legacyAnalysis };
      saveDream(updatedDream);
      setDream(updatedDream);

      setAnalysisStep('cyber-result');
    } catch (error) {
      console.error('Cyber analysis failed:', error);
      alert('赛博判官解析失败，请重试');
      setAnalysisStep('pain-points');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCloseModal = () => {
    setShowAnalysisModal(false);
    setTimeout(() => {
      setAnalysisStep('dreamer-base');
      setDayResidueText('');
      setSelectedEmotion(null);
      setPainPointResult(null);
      setCurrentQuestionIndex(0);
      setQuestionTextInputs([]);
      setQuestionTagSelections([]);
      setCyberAnalysis(null);
    }, 300);
  };

  const handleOpenContinue = () => {
    setShowContinueModal(true);
    setContinueModalStep('input');
    setContinueInput(cachedInput);
    setContinuationMode(null);
  };

  const handleCloseContinueModal = (clearStateOrEvent?: boolean | React.MouseEvent) => {
    const clearState = typeof clearStateOrEvent === 'boolean' ? clearStateOrEvent : false;
    setShowContinueModal(false);
    setTimeout(() => {
      setIsGenerating(false);
      if (clearState) {
        setContinueModalStep('input');
        setContinueInput('');
        setContinuationMode(null);
        setPreviewNodes([]);
      }
    }, 300);
  };

  const handleGeneratePreviewActual = async (mode: 'auto' | 'manual') => {
    if (!dream) return;

    setContinuationMode(mode);
    setIsGenerating(true);
    setContinueModalStep('generating');

    try {
      const userHint = mode === 'auto' ? '' : continueInput;
      const result = await callDreamContinuation(dream.story, userHint);

      const nodes: StoryNode[] = result.continuation_nodes.map((node, idx) => ({
        nodeId: dream!.story.length + idx + 1,
        nodeType: '转场' as const,
        narrativeText: node.narrative_text,
        decisionAnchor: null,
        sceneDescription: '',
        visualKeywords: node.visual_keywords,
        visualPrompt: node.visual_keywords,
        imageUrl: 'https://picsum.photos/seed/' + Math.random().toString(36).substr(2, 9) + '/800/450'
      }));

      // 更新缓存
      setCachedPreviewNodes(nodes);
      setCachedMode(mode);
      setCachedInput(continueInput);

      setPreviewNodes(nodes);
      setContinueModalStep('preview');
    } catch (error) {
      console.error('Preview generation failed:', error);
      alert('生成预览失败，请重试');
      setContinueModalStep('input');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePreview = async (mode: 'auto' | 'manual') => {
    if (!dream) return;

    setContinuationMode(mode);

    // 检查是否有缓存的结果可以直接使用
    const hasCache = cachedPreviewNodes.length > 0 &&
                     cachedMode === mode &&
                     (mode === 'auto' || cachedInput === continueInput);

    if (hasCache) {
      // 使用缓存的结果
      setPreviewNodes(cachedPreviewNodes);
      setContinueModalStep('preview');
      return;
    }

    // 没有缓存，需要重新生成
    await handleGeneratePreviewActual(mode);
  };

  const handleRegenerate = () => {
    if (continuationMode) {
      // 清除缓存后重新生成
      setCachedPreviewNodes([]);
      setCachedMode(null);
      setCachedInput('');
      handleGeneratePreviewActual(continuationMode);
    }
  };

  const handleConfirmContinuation = () => {
    if (!dream || previewNodes.length === 0) return;

    const updatedDream = { ...dream, story: [...dream.story, ...previewNodes] };

    if (!updatedDream.versions || updatedDream.versions.length === 0) {
      const originalVersion: DreamVersion = {
        versionId: 'version-original-' + updatedDream.createdAt,
        versionName: '原始梦境',
        versionType: 'original',
        story: [...dream.story],
        createdAt: dream.createdAt
      };
      updatedDream.versions = [originalVersion];
    }

    const newVersion: DreamVersion = {
      versionId: 'version-' + Date.now(),
      versionName: '梦境延续 · 第II幕',
      versionType: 'continued',
      story: [...updatedDream.story],
      createdAt: Date.now(),
      parentVersionId: dream.currentVersionId
    };

    updatedDream.versions.push(newVersion);
    updatedDream.currentVersionId = newVersion.versionId;

    saveDream(updatedDream);
    setDream(updatedDream);

    handleCloseContinueModal(true);

    setTimeout(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(updatedDream.story.length - 1);
        setIsTransitioning(false);
      }, 600);
    }, 400);
  };

  const handleDeleteContinuation = () => {
    if (!dream || !dream.versions) return;
    const originalVersion = dream.versions.find(v => v.versionType === 'original');
    if (originalVersion) {
      const updatedDream = {
        ...dream,
        story: originalVersion.story,
        currentVersionId: originalVersion.versionId
      };
      saveDream(updatedDream);
      setDream(updatedDream);
      if (currentIndex >= originalVersion.story.length) {
        setCurrentIndex(originalVersion.story.length - 1);
      }
    }
    setShowDeleteMenu(false);
  };

  // === Branch Feature Handlers ===

  const handleOpenBranchScan = async () => {
    if (!dream) return;

    setIsBranchScanMode(true);
    setIsGenerating(true);

    try {
      const result = await callDecisionPoints(dream.story);
      setBranchDecisionPoint({
        highlight_text: result.highlight_text,
        story_index: result.story_index,
        branch_options: result.branch_options
      });
    } catch (error) {
      console.error('Failed to get decision points:', error);
      alert('解析决策点失败，请重试');
      setIsBranchScanMode(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExitBranchScan = () => {
    setIsBranchScanMode(false);
    setBranchDecisionPoint(null);
    setShowBranchMenu(false);
  };

  const handleHighlightClick = () => {
    if (branchDecisionPoint) {
      setShowBranchModal(true);
      setBranchModalStep('menu');
    }
  };

  const handleSelectBranchOption = async (option: string) => {
    if (!dream || !branchDecisionPoint) return;

    setSelectedBranchOption(option);
    setBranchModalStep('generating');
    setIsGenerating(true);

    try {
      const result = await callDreamBranch(
        dream.story,
        branchDecisionPoint.story_index,
        option
      );

      const nodes: StoryNode[] = result.branch_nodes.map((node, idx) => ({
        nodeId: branchDecisionPoint!.story_index + idx + 1,
        nodeType: '抉择行动' as const,
        narrativeText: node.narrative_text,
        decisionAnchor: null,
        sceneDescription: '',
        visualKeywords: node.visual_keywords,
        visualPrompt: node.visual_keywords,
        imageUrl: 'https://picsum.photos/seed/' + Math.random().toString(36).substr(2, 9) + '/800/450'
      }));

      setBranchPreviewNodes(nodes);
      setBranchModalStep('preview');
    } catch (error) {
      console.error('Branch generation failed:', error);
      alert('生成分支失败，请重试');
      setBranchModalStep('menu');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmBranch = () => {
    if (!dream || !branchDecisionPoint || branchPreviewNodes.length === 0) return;

    // Create new story up to branch point, then add branch nodes
    const storyUpToBranch = dream.story.slice(0, branchDecisionPoint.story_index + 1);
    const updatedStory = [...storyUpToBranch, ...branchPreviewNodes];

    const updatedDream = { ...dream, story: updatedStory };

    if (!updatedDream.versions || updatedDream.versions.length === 0) {
      const originalVersion: DreamVersion = {
        versionId: 'version-original-' + updatedDream.createdAt,
        versionName: '原始梦境',
        versionType: 'original',
        story: [...dream.story],
        createdAt: dream.createdAt
      };
      updatedDream.versions = [originalVersion];
    }

    const newVersion: DreamVersion = {
      versionId: 'version-' + Date.now(),
      versionName: '平行选择 · 分支',
      versionType: 'branch',
      story: updatedStory,
      createdAt: Date.now(),
      parentVersionId: dream.currentVersionId,
      branchPoint: branchDecisionPoint.story_index
    };

    updatedDream.versions.push(newVersion);
    updatedDream.currentVersionId = newVersion.versionId;

    saveDream(updatedDream);
    setDream(updatedDream);

    handleCloseBranchModal();
    handleExitBranchScan();

    setTimeout(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(storyUpToBranch.length);
        setIsTransitioning(false);
      }, 600);
    }, 400);
  };

  const handleCloseBranchModal = () => {
    setShowBranchModal(false);
    setTimeout(() => {
      setBranchModalStep('menu');
      setBranchPreviewNodes([]);
      setSelectedBranchOption('');
      setCustomBranchInput('');
      setIsGenerating(false);
    }, 300);
  };

  const handleSwitchVersion = (version: DreamVersion) => {
    if (!dream) return;
    const updatedDream = { ...dream, story: version.story, currentVersionId: version.versionId };
    saveDream(updatedDream);
    setDream(updatedDream);
    setCurrentIndex(0);
    setShowDreamTreeDrawer(false);
  };

  // 显示加载状态
  if (loading || !dream) {
    return (
      <div className="dream-page">
        <div className="fog-overlay"></div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: 'var(--text-muted)'
        }}>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  const currentNode = dream?.story?.[currentIndex];
  const isContinuedNode = dream && currentIndex >= originalStoryLength;

  return (
    <div className={`dream-page ${isBranchScanMode ? 'branch-scan-mode' : ''}`}>
      {/* Dream Tree Drawer Tab */}
      <button
        className={`dream-tree-tab ${showDreamTreeDrawer ? 'open' : ''}`}
        onClick={() => setShowDreamTreeDrawer(!showDreamTreeDrawer)}
      >
        <span className="dream-tree-tab-icon">🌌</span>
        <span className="dream-tree-tab-text">梦境树</span>
      </button>

      {/* Branch Scan Mode Exit Button */}
      {isBranchScanMode && (
        <button className="exit-branch-scan-btn" onClick={handleExitBranchScan}>
          ✕ 退出
        </button>
      )}

      <div className="fog-overlay"></div>

      <div className="dream-layout">
        {/* Left panel - 2/3 */}
        <div className="dream-left-panel">
          <div className="top-bar">
            <button onClick={() => navigate('/')} className="back-button">
              ←
            </button>
            <div className="dream-header-inline">
              <h1 className="dream-title">{dream.dreamTitle}</h1>
            </div>
            <div className="top-bar-spacer"></div>
          </div>

          <div className="core-imagery">
            {(dream.tags || dream.coreImagery).map((tag, i) => (
              <span key={i} className="imagery-tag">
                {tag}
              </span>
            ))}
          </div>

          <div className="dream-gallery-left">
            <div className="slide-header-wrapper">
              {isContinuedNode && (
                <div className="act-two-header">
                  <span className="act-two-star">✦</span>
                  <span className="act-two-title">第 II 幕：梦境延续</span>
                  <div className="act-two-menu">
                    <button
                      className="menu-dots"
                      onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                    >
                      ⋮
                    </button>
                    {showDeleteMenu && (
                      <div className="menu-dropdown">
                        <button
                          className="delete-continuation-btn"
                          onClick={handleDeleteContinuation}
                        >
                          删除续写
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="dream-gallery-wrapper">
              <button
                onClick={prevSlide}
                disabled={currentIndex === 0}
                className="nav-button-outside nav-button-left-out"
              >
                &lt;
              </button>
              <div className={`slide-container ${isTransitioning ? 'blur-out' : 'blur-in'}`}>
                {currentNode ? (
                  <>
                    {!loadedImages.has(currentIndex) && currentNode.imageUrl?.includes('picsum.photos') ? (
                      <div className="dream-image-placeholder"></div>
                    ) : (
                      <img
                        src={currentNode.imageUrl}
                        alt=""
                        className={`dream-image ${isContinuedNode ? 'continued' : ''} loaded`}
                      />
                    )}
                  </>
                ) : (
                  <div className="dream-image-placeholder"></div>
                )}
                <div className="dream-vignette"></div>
              </div>
              <button
                onClick={nextSlide}
                disabled={!dream || currentIndex === dream.story.length - 1}
                className="nav-button-outside nav-button-right-out"
              >
                &gt;
              </button>
            </div>

            <p className={`dream-text-overlay ${isContinuedNode ? 'continued' : ''}`}>
              {currentNode ? (
                isBranchScanMode && branchDecisionPoint && currentIndex === branchDecisionPoint.story_index ? (
                  <span
                    className="branch-highlight"
                    onClick={handleHighlightClick}
                  >
                    {currentNode.narrativeText}
                  </span>
                ) : (
                  currentNode.narrativeText
                )
              ) : null}
            </p>

            <div className="progress-bar">
              {dream.story.map((_, index) => {
                const isContinued = index >= originalStoryLength;
                return (
                  <div
                    key={index}
                    className={`progress-dot ${index === currentIndex ? 'active' : index < currentIndex ? 'past' : ''} ${isContinued ? 'continued-dot' : ''}`}
                    onClick={() => {
                      if (index !== currentIndex) {
                        setIsTransitioning(true);
                        setTimeout(() => {
                          setCurrentIndex(index);
                          setIsTransitioning(false);
                        }, 600);
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Right panel - 1/3 */}
        <div className="dream-right-panel">
          <div className="top-bar-right">
            <div className="top-bar-spacer-right"></div>
            <button onClick={handleOpenAnalysis} className="research-button">
              ✨ Research
            </button>
          </div>
          <div className="you-write-section">
            <div className="original-text-box">
              <p className="your-memory-label">YOUR MEMORY</p>
              <p className="original-text-content">{dream.originalText}</p>
            </div>

            <div className="rewrite-buttons">
              <button
                className="rewrite-button continue-btn disabled"
                disabled
              >
                <span className="btn-icon">📖</span>
                <span className="btn-text">延伸梦境</span>
              </button>
              <button
                className="rewrite-button branch-btn disabled"
                disabled
              >
                <span className="btn-icon">🔀</span>
                <span className="btn-text">平行选择</span>
              </button>
              <button
                className="rewrite-button ending-btn disabled"
                disabled
              >
                <span className="btn-icon">✨</span>
                <span className="btn-text">重塑结局</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Continuation Modal */}
      {showContinueModal && (
        <div className="continue-modal-overlay" onClick={handleCloseContinueModal}>
          <div
            className={`continue-modal ${continueModalStep === 'preview' ? 'preview-expanded' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={handleCloseContinueModal}>×</button>

            {/* Input Step */}
            {continueModalStep === 'input' && (
              <div className="continue-step input-step">
                <h2 className="continue-modal-title">梦还没有醒，接下来你觉得会发生什么……</h2>
                <textarea
                  className="continue-modal-textarea"
                  placeholder="在这里输入你的念头..."
                  value={continueInput}
                  onChange={(e) => setContinueInput(e.target.value)}
                />
                <div className="continue-modal-buttons">
                  <button
                    className="continue-modal-btn auto-btn"
                    onClick={() => handleGeneratePreview('auto')}
                  >
                    🎲 潜意识自由发挥
                  </button>
                  <span className="continue-modal-divider">|</span>
                  <button
                    className="continue-modal-btn inject-btn"
                    onClick={() => handleGeneratePreview('manual')}
                    disabled={!continueInput.trim()}
                  >
                    ➤ 注入我的念头
                  </button>
                </div>
              </div>
            )}

            {/* Generating Step */}
            {continueModalStep === 'generating' && (
              <div className="continue-step generating-step">
                <div className="generating-fog-modal">
                  <div className="fog-particle-modal"></div>
                  <div className="fog-particle-modal"></div>
                  <div className="fog-particle-modal"></div>
                </div>
                <p className="generating-text-modal">潜意识正在编织新的梦境...</p>
              </div>
            )}

            {/* Preview Step */}
            {continueModalStep === 'preview' && (
              <div className="continue-step preview-step">
                <button className="modal-back" onClick={() => setContinueModalStep('input')}>←</button>
                <h3 className="preview-title">预览你的梦境延续</h3>
                <div className="preview-content">
                  {previewNodes.map((node, idx) => (
                    <div key={idx} className="preview-item">
                      <div className="preview-item-header">
                        <span className="preview-item-number">第 {idx + 1} 段</span>
                      </div>
                      <p className="preview-item-text">{node.narrativeText}</p>
                    </div>
                  ))}
                </div>
                <div className="preview-buttons">
                  <button
                    className="preview-btn regen-btn"
                    onClick={handleRegenerate}
                  >
                    ↺ 感觉不对，重新生成
                  </button>
                  <button
                    className="preview-btn confirm-btn"
                    onClick={handleConfirmContinuation}
                  >
                    ✨ 确认续写，融入梦境
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Branch Modal */}
      {showBranchModal && (
        <div className="branch-modal-overlay" onClick={handleCloseBranchModal}>
          <div
            className="branch-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={handleCloseBranchModal}>×</button>

            {/* Menu Step */}
            {branchModalStep === 'menu' && branchDecisionPoint && (
              <div className="branch-step menu-step">
                <h2 className="branch-modal-title">如果不…而是…</h2>
                <div className="branch-options">
                  {branchDecisionPoint.branch_options.map((option, idx) => (
                    <button
                      key={idx}
                      className="branch-option-btn"
                      onClick={() => handleSelectBranchOption(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <div className="custom-branch-section">
                  <textarea
                    className="custom-branch-input"
                    placeholder="✍️ 自定义新选择..."
                    value={customBranchInput}
                    onChange={(e) => setCustomBranchInput(e.target.value)}
                  />
                  <button
                    className="custom-branch-btn"
                    onClick={() => customBranchInput.trim() && handleSelectBranchOption(`⑂ ${customBranchInput.trim()}`)}
                    disabled={!customBranchInput.trim()}
                  >
                    使用自定义选择
                  </button>
                </div>
              </div>
            )}

            {/* Generating Step */}
            {branchModalStep === 'generating' && (
              <div className="branch-step generating-step">
                <div className="generating-fog-modal">
                  <div className="fog-particle-modal"></div>
                  <div className="fog-particle-modal"></div>
                  <div className="fog-particle-modal"></div>
                </div>
                <p className="generating-text-modal">平行宇宙正在探索...</p>
              </div>
            )}

            {/* Preview Step */}
            {branchModalStep === 'preview' && (
              <div className="branch-step preview-step">
                <button className="modal-back" onClick={() => setBranchModalStep('menu')}>←</button>
                <h3 className="preview-title">预览你的平行梦境</h3>
                <div className="preview-content">
                  {branchPreviewNodes.map((node, idx) => (
                    <div key={idx} className="preview-item">
                      <div className="preview-item-header">
                        <span className="preview-item-number">第 {idx + 1} 段</span>
                      </div>
                      <p className="preview-item-text">{node.narrativeText}</p>
                    </div>
                  ))}
                </div>
                <div className="preview-buttons">
                  <button
                    className="preview-btn regen-btn"
                    onClick={() => setBranchModalStep('menu')}
                  >
                    ↺ 回到选择
                  </button>
                  <button
                    className="preview-btn confirm-btn"
                    onClick={handleConfirmBranch}
                  >
                    ✨ 确认分支，进入平行宇宙
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dream Tree Drawer */}
      <div className={`dream-tree-drawer ${showDreamTreeDrawer ? 'open' : ''}`}>
        <div className="dream-tree-header">
          <h2 className="dream-tree-title">🌌 梦境树</h2>
          <button className="modal-close" onClick={() => setShowDreamTreeDrawer(false)}>×</button>
        </div>
        <div className="dream-tree-content">
          <div className="tree-timeline">
            <div className="tree-line-main"></div>
            {dream.versions && dream.versions.length > 0 ? (
              dream.versions.map((version, idx) => {
                const isCurrent = dream.currentVersionId === version.versionId;
                const isBranch = version.versionType === 'branch';
                return (
                  <div key={version.versionId} className="tree-node-wrapper">
                    {isBranch && <div className="tree-line-branch" style={{ top: `${idx * 60 + 20}px` }}></div>}
                    <button
                      className={`tree-node ${isCurrent ? 'current' : ''} ${isBranch ? 'branch' : 'main'}`}
                      onClick={() => handleSwitchVersion(version)}
                    >
                      <span className="tree-node-dot"></span>
                      <span className="tree-node-name">{version.versionName}</span>
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="tree-node-wrapper">
                <button
                  className="tree-node current main"
                >
                  <span className="tree-node-dot"></span>
                  <span className="tree-node-name">{dream.dreamTitle}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Modal - 赛博心理判官 */}
      {showAnalysisModal && (
        <div className="analysis-modal-overlay" onClick={handleCloseModal}>
          <div className="analysis-modal cyber-judge-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>×</button>

            {/* Step 1: 做梦者基底收集 */}
            {analysisStep === 'dreamer-base' && (
              <div className="analysis-step dreamer-base-step">
                <div className="step-icon">🧠</div>
                <h2 className="step-title">在开始精神分析之前，让我简单了解一下你</h2>

                <div className="dreamer-base-form">
                  <div className="form-section">
                    <label>年龄</label>
                    <input
                      type="number"
                      placeholder="比如：25"
                      value={dreamerBase.age || ''}
                      onChange={(e) => setDreamerBase({...dreamerBase, age: parseInt(e.target.value) || undefined})}
                    />
                  </div>

                  <div className="form-section">
                    <label>性别</label>
                    <div className="gender-options">
                      {['男', '女', '其他'].map((g) => (
                        <button
                          key={g}
                          className={`gender-option ${dreamerBase.gender === g ? 'selected' : ''}`}
                          onClick={() => setDreamerBase({...dreamerBase, gender: g})}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-section">
                    <label>MBTI 人格</label>
                    <div className="mbti-grid">
                      {['INFP', 'INFJ', 'ENFP', 'ENFJ', 'INTJ', 'INTP', 'ENTJ', 'ENTP', 'ISFP', 'ISFJ', 'ESFP', 'ESFJ', 'ISTP', 'ISTJ', 'ESTP', 'ESTJ'].map((mbti) => (
                        <button
                          key={mbti}
                          className={`mbti-option ${dreamerBase.mbti === mbti ? 'selected' : ''}`}
                          onClick={() => setDreamerBase({...dreamerBase, mbti})}
                        >
                          {mbti}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-section">
                    <label>当前社会角色</label>
                    <div className="role-options">
                      {[
                        { key: 'student', label: '学生党' },
                        { key: 'worker', label: '职场牛马' },
                        { key: 'freelance', label: '自由职业' },
                        { key: 'gap', label: 'Gap期' }
                      ].map((role) => (
                        <button
                          key={role.key}
                          className={`role-option ${dreamerBase.socialRole === role.key ? 'selected' : ''}`}
                          onClick={() => setDreamerBase({...dreamerBase, socialRole: role.key as any})}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-section">
                    <label>近期精神电量</label>
                    <div className="energy-options">
                      {[
                        { key: 'full', label: '满格 🔋' },
                        { key: 'tired', label: '经常疲惫 🪫' },
                        { key: 'draining', label: '精神内耗 ⚡' },
                        { key: 'broken', label: '随时碎掉 💔' }
                      ].map((energy) => (
                        <button
                          key={energy.key}
                          className={`energy-option ${dreamerBase.energyLevel === energy.key ? 'selected' : ''}`}
                          onClick={() => setDreamerBase({...dreamerBase, energyLevel: energy.key as any})}
                        >
                          {energy.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="step-buttons">
                  <button
                    className="skip-button"
                    onClick={startPainPointDetection}
                  >
                    跳过，直接进入
                  </button>
                  <button
                    className="analyze-button"
                    onClick={handleSaveDreamerBase}
                  >
                    保存并开始分析
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: 刺点侦探 - 横向滑动问题卡片 */}
            {analysisStep === 'pain-points' && painPointResult && (
              <div className="analysis-step pain-points-step">
                <div className="step-icon">🎯</div>
                <h2 className="step-title">在潜意识为你放映这部电影之前……</h2>

                <div className="day-residue-section">
                  <label>昨天发生了什么特别的事，或产生了什么情绪吗？</label>
                  <textarea
                    className="day-residue-input"
                    placeholder="简单说说..."
                    value={dayResidueText}
                    onChange={(e) => setDayResidueText(e.target.value)}
                  />
                  <div className="emotion-tags">
                    {EMOTION_TAGS.map((tag) => (
                      <button
                        key={tag}
                        className={`emotion-tag ${selectedEmotion === tag ? 'selected' : ''}`}
                        onClick={() => setSelectedEmotion(selectedEmotion === tag ? null : tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="questions-swiper">
                  <div className="question-card">
                    <div className="question-progress">
                      {currentQuestionIndex + 1} / {painPointResult.questions.length}
                    </div>
                    <div className="question-target">
                      <span className="target-type">
                        {painPointResult.questions[currentQuestionIndex].target_type === 'character' ? '👤' : '🎨'}
                      </span>
                      <span className="target-name">
                        {painPointResult.questions[currentQuestionIndex].target_name}
                      </span>
                    </div>
                    <p className="question-text">
                      {painPointResult.questions[currentQuestionIndex].question_text}
                    </p>

                    <textarea
                      className="question-textarea"
                      placeholder="简单说说，或者跳过这题..."
                      value={questionTextInputs[currentQuestionIndex] || ''}
                      onChange={(e) => handleQuestionTextChange(e.target.value)}
                    />

                    <div className="quick-tags">
                      {painPointResult.questions[currentQuestionIndex].quick_tags.map((tag, idx) => (
                        <button
                          key={idx}
                          className={`quick-tag ${questionTagSelections[currentQuestionIndex] === tag ? 'selected' : ''}`}
                          onClick={() => handleQuestionTagSelect(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>

                    <div className="question-nav-buttons">
                      <button
                        className="nav-question-btn prev-btn"
                        onClick={handlePrevQuestion}
                        disabled={currentQuestionIndex === 0}
                      >
                        ← 上一题
                      </button>
                      <button
                        className="nav-question-btn next-btn"
                        onClick={handleNextQuestion}
                      >
                        {currentQuestionIndex < painPointResult.questions.length - 1 ? '下一题 →' : '提交并生成'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="swiper-pagination">
                  {painPointResult.questions.map((_, idx) => (
                    <div
                      key={idx}
                      className={`pagination-dot ${idx === currentQuestionIndex ? 'active' : idx < currentQuestionIndex ? 'answered' : ''}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: 生成中 */}
            {analysisStep === 'generating' && (
              <div className="analysis-step generating-step cyber-generating">
                <div className="generating-spinner">
                  <span className="spinner-dot"></span>
                  <span className="spinner-dot"></span>
                  <span className="spinner-dot"></span>
                </div>
                <p className="generating-text">赛博大夫正在为您把脉...</p>
              </div>
            )}

            {/* Step 4: 赛博判官结果 - 简化一栏布局 */}
            {analysisStep === 'cyber-result' && (analysis || cyberAnalysis) && (
              <div className="analysis-step cyber-result-step">
                <div className="cyber-result-receipt">
                  {/* 标题 */}
                  <h2 className="cyber-simple-title">
                    <span className="title-emoji">📋</span>
                    {cyberAnalysis?.title_tag || analysis?.vibe_tag || '潜意识回执单'}
                  </h2>

                  {/* 赛博把脉 */}
                  <div className="cyber-simple-section">
                    <h3 className="cyber-simple-section-title">
                      <span className="section-emoji">🧠</span>
                      赛博把脉
                    </h3>
                    <p className="cyber-simple-text">
                      {cyberAnalysis?.cyber_diagnosis || analysis?.soul_message}
                    </p>
                  </div>

                  {/* 地球online底层代码 */}
                  <div className="cyber-simple-section">
                    <h3 className="cyber-simple-section-title">
                      <span className="section-emoji">🔍</span>
                      地球online底层代码
                    </h3>
                    <div className="cyber-simple-symbols">
                      {(cyberAnalysis?.symbols_decoded || analysis?.symbols_decoded || []).map((symbol, i) => (
                        <div key={i} className="cyber-simple-symbol-item">
                          <span className="simple-symbol-name">{symbol.symbol}</span>
                          <span className="simple-symbol-meaning">{symbol.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 专家这样说 */}
                  <div className="cyber-simple-section">
                    <h3 className="cyber-simple-section-title">
                      <span className="section-emoji">💭</span>
                      专家这样说
                    </h3>
                    <p className="cyber-simple-text">
                      {cyberAnalysis?.master_review}
                    </p>
                  </div>

                  {/* 电子布洛芬 */}
                  <div className="cyber-simple-section">
                    <h3 className="cyber-simple-section-title">
                      <span className="section-emoji">💊</span>
                      电子布洛芬
                    </h3>
                    <p className="cyber-simple-text">
                      {cyberAnalysis?.electronic_ibuprofen || analysis?.actionable_advice}
                    </p>
                  </div>

                  {/* 底部落款 */}
                  <div className="cyber-simple-footer">
                    <span className="cyber-simple-date">{new Date().toLocaleDateString('zh-CN')}</span>
                    <span className="cyber-simple-stamp">DREAM DAILY</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
