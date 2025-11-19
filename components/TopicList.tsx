import React from 'react';
import { Topic } from '../types';
import { IconArrowRight } from './Icons';

interface TopicListProps {
  topics: Topic[];
  onSelectTopic: (topic: Topic) => void;
}

const TopicList: React.FC<TopicListProps> = ({ topics, onSelectTopic }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-4 max-w-7xl mx-auto">
      {topics.map((topic, index) => (
        <div 
          key={topic.id} 
          onClick={() => onSelectTopic(topic)}
          className="group cursor-pointer flex flex-col bg-slate-850 border border-slate-700 hover:border-cyan-450/50 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(34,211,238,0.15)] relative overflow-hidden h-full"
        >
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-cyan-500/10"></div>

          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex flex-col">
                <span className="text-5xl font-bold font-mono text-slate-700 group-hover:text-cyan-500/20 transition-colors">
                    0{index + 1}
                </span>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-cyan-400 border border-slate-600 shadow-sm">
              {topic.category}
            </span>
          </div>

          <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors leading-tight">
            {topic.title}
          </h3>
          
          <p className="text-slate-400 text-sm mb-6 leading-relaxed flex-grow">
            {topic.summary}
          </p>

          <div className="mt-auto space-y-4">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
               <div 
                 className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full" 
                 style={{ width: `${topic.impactScore}%` }}
               />
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="flex gap-2">
                     {topic.platformTags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] uppercase tracking-wider text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">
                            {tag}
                        </span>
                     ))}
                </div>
                <button className="text-cyan-400 group-hover:text-cyan-300 flex items-center text-sm font-bold tracking-wide">
                  深度报告 <IconArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TopicList;