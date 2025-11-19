import React, { useState } from 'react';
import JSZip from 'jszip';
import { scanForIntelligence, generateDeepDiveReport } from './services/geminiService';
import { Topic, ArticleContent, AppState } from './types';
import TopicList from './components/TopicList';
import ArticleModal from './components/ArticleModal';
import { IconRadar, IconNews, IconDownload, IconCPU } from './components/Icons';
import { PLATFORMS } from './constants';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [articleContent, setArticleContent] = useState<ArticleContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Cache for generated articles to avoid re-generation during batch export
  const [articleCache, setArticleCache] = useState<Record<string, ArticleContent>>({});
  
  // Batch Download State
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{current: number, total: number, currentTopic: string} | null>(null);

  const handleStartScan = async () => {
    setAppState(AppState.SCANNING);
    setError(null);
    try {
      const fetchedTopics = await scanForIntelligence();
      setTopics(fetchedTopics);
      setArticleCache({}); // Clear cache on new scan
      setAppState(AppState.VIEWING_LIST);
    } catch (err: any) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : "未知错误";
      setError(`情报扫描失败: ${errorMsg}。请检查 API Key 或稍后重试。`);
      setAppState(AppState.IDLE);
    }
  };

  const handleSelectTopic = async (topic: Topic) => {
    setSelectedTopic(topic);
    setArticleContent(null);
    setAppState(AppState.GENERATING_ARTICLE);
    
    // Check cache first
    if (articleCache[topic.id]) {
      setArticleContent(articleCache[topic.id]);
      setAppState(AppState.READING);
      return;
    }
    
    try {
      const content = await generateDeepDiveReport(topic);
      setArticleContent(content);
      setArticleCache(prev => ({ ...prev, [topic.id]: content })); // Save to cache
      setAppState(AppState.READING);
    } catch (err) {
      console.error(err);
      setError("无法生成该板块的深度报告。");
      setAppState(AppState.VIEWING_LIST);
      setSelectedTopic(null);
      alert("报告生成失败。");
    }
  };

  const handleCloseModal = () => {
    setSelectedTopic(null);
    setArticleContent(null);
    setAppState(AppState.VIEWING_LIST);
  };

  /**
   * Batch Generation & Zip Download
   */
  const handleDownloadArchive = async () => {
    if (topics.length === 0) return;
    
    setIsDownloading(true);
    setDownloadProgress({ current: 0, total: topics.length, currentTopic: '初始化归档系统...' });

    try {
      const zip = new JSZip();
      const dateStr = new Date().toISOString().split('T')[0];
      const rootFolder = zip.folder(`OmniIntel_Reports_${dateStr}`);
      
      if (!rootFolder) throw new Error("Failed to create zip folder");

      // Process topics sequentially to ensure stability (and respect API limits somewhat)
      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        setDownloadProgress({ 
          current: i + 1, 
          total: topics.length, 
          currentTopic: `正在生成: ${topic.title}` 
        });

        // 1. Get Content (From Cache or Generate)
        let content: ArticleContent;
        if (articleCache[topic.id]) {
          content = articleCache[topic.id];
        } else {
          // Generate on the fly
          content = await generateDeepDiveReport(topic);
          // Cache it for UI viewing later
          setArticleCache(prev => ({ ...prev, [topic.id]: content }));
        }

        // 2. Prepare File Paths
        // Sanitize folder/file names
        const safeCategory = topic.category.replace(/[\\/:*?"<>|]/g, "_").trim();
        const safeTitle = topic.title.replace(/[\\/:*?"<>|]/g, "_").trim();
        
        // Create Subdirectory: root / Category
        const categoryFolder = rootFolder.folder(safeCategory);
        if (categoryFolder) {
          let markdownContent = content.markdown;

          // 3. Handle Image (if exists)
          if (content.coverImageBase64) {
            // Save image as separate file
            categoryFolder.file(`${safeTitle}.png`, content.coverImageBase64, { base64: true });
            
            // Insert image reference at the top of Markdown
            // Using relative path so it works when folder is extracted
            markdownContent = `![Cover Image](${safeTitle}.png)\n\n` + markdownContent;
          }

          // 4. Save Markdown File
          categoryFolder.file(`${safeTitle}.md`, markdownContent);
        }
      }

      setDownloadProgress({ current: topics.length, total: topics.length, currentTopic: '正在打包压缩...' });

      // 5. Generate and Download Zip
      const content = await zip.generateAsync({ type: "blob" });
      
      // Create download link programmatically
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OmniIntel_Intelligence_Pack_${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      console.error("Batch download failed:", err);
      alert("归档过程中发生错误，请查看控制台。");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-cyan-500/30 selection:text-cyan-200 font-sans pb-20">
      
      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
               <IconRadar className="text-slate-900 w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              OMNI<span className="text-cyan-400">INTEL</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-mono text-slate-500">
            <span className="hidden md:inline">系统状态: {isDownloading ? '归档中...' : (appState === AppState.IDLE ? '待机' : '运行中')}</span>
            <span className={`w-2 h-2 rounded-full ${isDownloading ? 'bg-yellow-400 animate-ping' : 'bg-green-500 animate-pulse'}`}></span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        
        {/* Batch Download Progress Overlay */}
        {isDownloading && downloadProgress && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-md">
            <div className="w-full max-w-2xl p-8 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl text-center relative overflow-hidden">
              {/* Scanning grid effect */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
              
              <div className="relative z-10">
                <IconCPU className="w-16 h-16 text-cyan-400 mx-auto mb-6 animate-spin-slow" />
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                   正在生成离线归档
                </h3>
                <p className="text-slate-400 font-mono text-sm mb-8">
                  [BATCH_PROCESS] 正在并行调用 Gemini-3-Pro 生成深度报告...
                </p>

                <div className="mb-2 flex justify-between text-xs font-mono text-cyan-500 uppercase">
                  <span>Progress</span>
                  <span>{downloadProgress.current} / {downloadProgress.total}</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-6">
                   <div 
                     className="h-full bg-cyan-500 transition-all duration-500 ease-out relative"
                     style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
                   >
                     <div className="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_1s_infinite]"></div>
                   </div>
                </div>
                
                <div className="text-left bg-black/40 p-4 rounded border border-slate-800 font-mono text-xs text-slate-300 h-24 overflow-hidden flex flex-col justify-center">
                   <p className="opacity-50"> > mkdir ./OmniIntel_Reports/{new Date().toISOString().split('T')[0]}</p>
                   <p className="text-cyan-400 animate-pulse"> > processing: {downloadProgress.currentTopic}...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* IDLE STATE / HERO */}
        {appState === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-cyan-500 blur-[100px] opacity-20 rounded-full"></div>
              <IconNews className="relative w-24 h-24 text-slate-700" />
            </div>
            
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              全球 AI 情报 <br/> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
                收集与聚合系统
              </span>
            </h2>
            
            <p className="text-lg text-slate-400 max-w-2xl mb-10">
              全网扫描 B站、微信公众号、TechCrunch、Medium、BBC、X 等平台。
              自动生成包含数据表格与可视化图表的 10 份高价值 AI 简报。
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-12 opacity-70 max-w-3xl mx-auto">
               {PLATFORMS.map(p => (
                 <span key={p} className="px-3 py-1 rounded-full border border-slate-800 bg-slate-900 text-xs text-slate-500 font-mono">
                   {p}
                 </span>
               ))}
            </div>

            <button 
              onClick={handleStartScan}
              className="group relative px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all duration-200 hover:scale-105 shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:shadow-[0_0_40px_rgba(34,211,238,0.6)]"
            >
              <span className="flex items-center gap-3">
                <IconRadar className="w-5 h-5 animate-pulse-slow" />
                启动全网扫描 (Top 10)
              </span>
            </button>

            {error && (
              <div className="mt-8 p-4 bg-red-900/20 border border-red-900/50 text-red-400 rounded max-w-md">
                {error}
              </div>
            )}
          </div>
        )}

        {/* SCANNING STATE */}
        {appState === AppState.SCANNING && (
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-8"></div>
            <h3 className="text-2xl font-bold text-white mb-2">正在扫描全网...</h3>
            <p className="text-slate-400 font-mono">正在索引 B站, Medium, TechCrunch, BBC, X 等 10+ 平台</p>
            <div className="mt-8 w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 animate-[loading_2s_ease-in-out_infinite]" style={{width: '50%'}}></div>
            </div>
            <style>{`
              @keyframes loading {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(200%); }
              }
              @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
            `}</style>
          </div>
        )}

        {/* LIST VIEW */}
        {appState === AppState.VIEWING_LIST && (
          <div className="py-12 animate-fade-in">
            <div className="max-w-7xl mx-auto px-4 mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
              <div>
                <h2 className="text-3xl font-bold text-white">每日 AI 简报 (Top 10)</h2>
                <p className="text-slate-400 mt-2">全网数据聚合 | 包含图表与深度对比</p>
              </div>
              <div className="flex gap-3">
                  <button 
                    onClick={handleDownloadArchive}
                    disabled={isDownloading}
                    className="flex items-center gap-2 text-sm font-bold text-slate-900 bg-cyan-400 hover:bg-cyan-300 px-4 py-2 rounded transition-colors shadow-lg shadow-cyan-500/20"
                  >
                    <IconDownload className="w-4 h-4" />
                    生成离线归档 (.ZIP)
                  </button>
                  <button 
                    onClick={handleStartScan}
                    disabled={isDownloading}
                    className="text-sm text-cyan-400 hover:text-cyan-300 border border-cyan-900 bg-cyan-950/30 px-4 py-2 rounded transition-colors"
                  >
                    重新扫描
                  </button>
              </div>
            </div>
            
            <TopicList topics={topics} onSelectTopic={handleSelectTopic} />
          </div>
        )}

        {/* ARTICLE MODAL */}
        {(appState === AppState.GENERATING_ARTICLE || appState === AppState.READING) && selectedTopic && (
          <ArticleModal 
            topic={selectedTopic} 
            content={articleContent} 
            isLoading={appState === AppState.GENERATING_ARTICLE}
            onClose={handleCloseModal}
          />
        )}

      </main>
    </div>
  );
};

export default App;