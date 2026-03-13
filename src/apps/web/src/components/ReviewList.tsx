import React, { useState, useEffect } from 'react';
import { Article } from 'core';

interface Draft {
    id: string;
    synopsis: string;
    articles: Article[];
    updated_at: string;
}

interface Props {
    onLoadDraft: (draft: Draft) => void;
}

export const ReviewList: React.FC<Props> = ({ onLoadDraft }) => {
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/drafts', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                setDrafts(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-gray-50 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">Saved Drafts</h1>
                    <p className="text-slate-500">Manage and resume your previous newsletter editions.</p>
                </header>

                {drafts.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm font-medium">
                        You haven&apos;t saved any drafts yet. Start writing to see them here.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {drafts.map(draft => (
                            <div
                                key={draft.id}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex justify-between items-center group"
                                onClick={() => onLoadDraft(draft)}
                            >
                                <div className="flex-1 pr-6">
                                    <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                                        {new Date(draft.updated_at).toLocaleString(undefined, {
                                            dateStyle: 'long',
                                            timeStyle: 'short'
                                        })}
                                    </h3>
                                    <p className="text-slate-600 line-clamp-2 text-sm leading-relaxed">
                                        {draft.synopsis || "No synopsis recorded for this draft."}
                                    </p>
                                    <div className="mt-3 flex items-center gap-4">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                            {draft.articles.length} Articles Selected
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                                    >
                                        Edit Draft
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
