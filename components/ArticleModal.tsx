import React from 'react';
import { Topic, ArticleContent } from '../types';
import { IconClose, IconExternal, IconCPU } from './Icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ArticleModalProps {
  topic: Topic;
  content: ArticleContent | null;
  onClose: () => void;
  isLoading: boolean;
}

const ArticleModal: React.FC<ArticleModalProps> = ({ topic, content, onClose, isLoading }) => {
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6">
      <div className="bg-slate-900 w-full max-w-5xl h-[95vh] rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden relative ring-1 ring-cyan-500/20">
        
        {/* Header Actions */}
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={onClose}
            className="p-2 bg-black/50 backdrop-blur text-slate-300 hover:text-white hover:bg-red-500/80 rounded-full transition-all border border-slate-700 hover:border-red-400"
          >
            <IconClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center h-full space-y-8 p-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-20 animate-pulse"></div>
                  <IconCPU className="w-20 h-20 text-cyan-400 animate-spin-slow" />
                </div>
                <div className="text-center max-w-md">
                  <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">情报合成中</h3>
                  <div className="space-y-2 font-mono text-sm text-cyan-500/80">
                      <p className="animate-pulse">[SYS] 正在扫描全球知识库...</p>
                      <p className="animate-pulse delay-100">[IMG] 正在渲染全息封面...</p>
                      <p className="animate-pulse delay-200">[DAT] 正在构建对比数据表...</p>
                      <p className="animate-pulse delay-300">[EXP] 正在连线技术专家...</p>
                  </div>
                </div>
             </div>
          ) : content ? (
            <div className="flex flex-col">
               {/* Hero Image Section */}
               {content.coverImageBase64 && (
                 <div className="relative h-64 md:h-80 w-full bg-slate-950">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10"></div>
                    <img 
                      src={`data:image/png;base64,${content.coverImageBase64}`} 
                      alt={topic.title}
                      className="w-full h-full object-cover opacity-90"
                    />
                    <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                        <div className="flex gap-3 mb-3">
                            <span className="px-2 py-1 rounded bg-cyan-500 text-black text-xs font-bold uppercase tracking-wider">AI Intelligence</span>
                            <span className="px-2 py-1 rounded bg-black/60 text-cyan-400 border border-cyan-500/30 text-xs font-mono">{new Date().toLocaleDateString()}</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight shadow-black drop-shadow-lg">
                            {topic.title}
                        </h1>
                    </div>
                 </div>
               )}

               {/* Main Body */}
               <div className="p-8 md:p-12 max-w-4xl mx-auto w-full">
                   
                   {!content.coverImageBase64 && (
                        <h1 className="text-3xl font-bold text-white mb-8 border-b border-slate-700 pb-6">{topic.title}</h1>
                   )}

                   <div className="prose prose-invert prose-lg prose-cyan max-w-none markdown-table">
                     <ReactMarkdown 
                       remarkPlugins={[remarkGfm]}
                       components={{
                         h1: ({node, ...props}) => <h1 className="hidden" {...props} />, // Hide h1 as we used Hero title
                         h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-cyan-400 mt-10 mb-6 flex items-center border-b border-slate-800 pb-2" {...props} />,
                         h3: ({node, ...props}) => <h3 className="text-xl font-semibold text-slate-200 mt-8 mb-4" {...props} />,
                         p: ({node, ...props}) => <p className="text-slate-300 leading-relaxed mb-6 text-justify" {...props} />,
                         ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-2 mb-6 text-slate-300" {...props} />,
                         strong: ({node, ...props}) => <strong className="text-cyan-100 font-bold" {...props} />,
                         // Enhanced Blockquote for "Guru View"
                         blockquote: ({node, ...props}) => (
                           <div className="relative my-8 pl-6 py-4 bg-slate-800/40 border-l-4 border-cyan-500 rounded-r-lg shadow-sm">
                               <div className="absolute -top-3 left-4 bg-slate-900 px-2 text-cyan-400 text-xl">❝</div>
                               <blockquote className="italic text-slate-300 font-serif" {...props} />
                           </div>
                         ),
                       }}
                     >
                       {content.markdown}
                     </ReactMarkdown>
                   </div>

                   {/* Sources Section */}
                   <div className="mt-16 pt-10 border-t border-slate-800">
                     <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center">
                       <IconExternal className="w-4 h-4 mr-2" /> 情报索引 (Indexed Sources)
                     </h3>
                     {content.sources.length > 0 ? (
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         {content.sources.map((source, idx) => (
                           <a 
                             key={idx} 
                             href={source.uri} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="flex items-start p-4 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 transition-all group"
                           >
                             <span className="text-cyan-500 font-mono text-xs mr-3 mt-0.5">0{idx+1}</span>
                             <span className="text-sm text-slate-400 group-hover:text-cyan-200 transition-colors line-clamp-1 font-medium">
                               {source.title || "外部链接"}
                             </span>
                           </a>
                         ))}
                       </div>
                     ) : (
                       <p className="text-sm text-slate-600 italic">未检索到直接的外部链接。</p>
                     )}
                   </div>
               </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-red-400">
                <p>无法加载情报报告。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArticleModal;