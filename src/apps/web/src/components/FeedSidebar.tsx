import React, { useState, useEffect } from 'react';
import { Article } from 'core';

interface Props {
    onAddArticle: (article: Article) => void;
    onLoadDraft: (draft: { id: string; synopsis: string; articles: Article[] }) => void;
}

export const FeedSidebar: React.FC<Props> = ({ onAddArticle }) => {
    const [source, setSource] = useState<'yahoo' | 'bloomberg'>('bloomberg');
    const [query, setQuery] = useState('');
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let active = true;
        setLoading(true);

        fetch(`/api/feeds?source=${source}`)
            .then(res => res.json())
            .then(data => {
                if (active) {
                    setArticles(Array.isArray(data) ? data : []);
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error(err);
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, [source]);

    const filteredArticles = articles.filter(a =>
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.snippet.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="w-[400px] bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden shadow-[inset_-1px_0_0_rgba(0,0,0,0.05)]">
            <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">News Source</h2>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${source === 'bloomberg' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setSource('bloomberg')}
                        >
                            BBG
                        </button>
                        <button
                            className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${source === 'yahoo' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setSource('yahoo')}
                        >
                            Yahoo
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="Filter headlines..."
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                        <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-3"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Refreshing...</span>
                    </div>
                ) : filteredArticles.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No articles found</p>
                    </div>
                ) : (
                    filteredArticles.map(article => (
                        <div key={article.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-slate-300 group">
                            <h3 className="font-bold text-slate-900 mb-2 leading-tight text-sm">
                                <a href={article.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                                    {article.title}
                                </a>
                            </h3>
                            {article.snippet && article.snippet !== "No description available" && (
                                <p className="text-[13px] text-slate-500 line-clamp-2 mb-4 leading-relaxed">{article.snippet}</p>
                            )}
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                    {new Date(article.pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                <button
                                    onClick={() => onAddArticle(article)}
                                    className="px-3 py-1.5 bg-slate-50 text-slate-600 text-[11px] font-black uppercase tracking-widest rounded hover:bg-slate-900 hover:text-white transition-all border border-slate-200"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

