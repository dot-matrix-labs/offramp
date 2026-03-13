import React from 'react';
import { Article } from 'core';
import { ExportModal } from './ExportModal';

interface Props {
    synopsis: string;
    setSynopsis: (val: string) => void;
    articles: Article[];
    onRemoveArticle: (id: string) => void;
    onSaveDraft: () => void;
    isSaving: boolean;
}

export const DraftEditor: React.FC<Props> = ({
    synopsis,
    setSynopsis,
    articles,
    onRemoveArticle,
    onSaveDraft,
    isSaving
}) => {
    return (
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
            {/* Editor Header */}
            <div className="p-8 border-b border-slate-100 shrink-0">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Weekly Recap Draft</h1>
                <p className="text-slate-500 font-medium">Refine your synopsis and curate up to 5 standard top articles for your email newsletter.</p>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-12">
                {/* Journalist Synopsis Section */}
                <section>
                    <div className="flex justify-between items-end mb-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Journalist Synopsis</label>
                        <span className="text-[10px] text-slate-300 font-bold">{synopsis.length} characters</span>
                    </div>
                    <textarea
                        className="w-full h-48 p-6 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:bg-white focus:border-slate-300 transition-all text-lg leading-relaxed shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                        placeholder="Start writing your insightful breakdown of this week's news..."
                        value={synopsis}
                        onChange={(e) => setSynopsis(e.target.value)}
                    />
                </section>

                {/* Selected Articles List */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Selected Articles ({articles.length} / 5)</label>
                    </div>

                    {articles.length === 0 ? (
                        <div className="py-8 px-6 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                            <p className="text-slate-400 font-medium mb-1">No articles selected yet.</p>
                            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Search headlines in the sidebar and click &quot;Add&quot;</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {articles.map((article, idx) => (
                                <div key={article.id} className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm items-start relative group transition-all hover:bg-white hover:border-slate-300">
                                    <div className="h-8 w-8 shrink-0 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xs shadow-md">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 pr-8">
                                        <h4 className="font-bold text-slate-900 mb-1 text-base leading-tight">
                                            {article.title}
                                        </h4>
                                        <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed mb-1">
                                            {article.snippet && article.snippet !== "No description available" ? article.snippet : "Description will be pulled automatically."}
                                        </p>
                                        <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-blue-600 hover:text-blue-800 break-all underline-offset-4 hover:underline">
                                            {article.link}
                                        </a>
                                    </div>
                                    <button
                                        onClick={() => onRemoveArticle(article.id)}
                                        className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                        title="Remove from draft"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Bottom Controls Bar */}
            <div className="h-24 px-8 border-t border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md shrink-0">
                <button
                    onClick={onSaveDraft}
                    disabled={isSaving}
                    className="px-6 py-3 bg-slate-100 text-slate-900 font-black uppercase tracking-widest text-xs rounded-xl hover:bg-slate-200 transition-all border border-slate-200 disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving ? (
                        <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
                    ) : null}
                    {isSaving ? "Saving..." : "Save Draft"}
                </button>

                <ExportModal synopsis={synopsis} articles={articles} />
            </div>
        </div>
    );
};
