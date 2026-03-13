/**
 * @file overview
 * The root Application component for the Weekly Recap Newsletter frontend.
 * This component will eventually host the WYSIWYG editor, the dynamic
 * feed views for Yahoo/Bloomberg, and the template preview layout.
 */

import React, { useState } from 'react';
import { Article } from 'core';
import { FeedSidebar } from './components/FeedSidebar';
import { DraftEditor } from './components/DraftEditor';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { ReviewList } from './components/ReviewList';

function App() {
    const { user, logout, loading } = useAuth();
    const [view, setView] = useState<'write' | 'review'>('write');

    // Global draft state to persist between view switches
    const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(undefined);
    const [synopsis, setSynopsis] = useState('');
    const [selectedArticles, setSelectedArticles] = useState<Article[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

    const handleSaveDraft = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    id: currentDraftId,
                    synopsis,
                    articles: selectedArticles
                })
            });
            const data = await res.json();
            if (data.id && !currentDraftId) setCurrentDraftId(data.id);
            alert('Draft saved successfully!');
        } catch (err) {
            alert('Failed to save draft');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadDraft = (draft: { id: string; synopsis: string; articles: Article[] }) => {
        setCurrentDraftId(draft.id);
        setSynopsis(draft.synopsis);
        setSelectedArticles(draft.articles || []);
        setView('write');
    };

    const handleAddArticle = (article: Article) => {
        if (selectedArticles.length >= 5) {
            alert("You can only select up to 5 articles for the weekly recap.");
            return;
        }
        if (selectedArticles.find(a => a.id === article.id)) {
            return;
        }
        setSelectedArticles([...selectedArticles, article]);
    };

    const handleRemoveArticle = (id: string) => {
        setSelectedArticles(selectedArticles.filter(a => a.id !== id));
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
            {/* Top Navigation Bar */}
            <nav className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50">
                <div className="flex items-center gap-8">
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-slate-900 tracking-tight">CALYPSO</span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Weekly</span>
                    </div>
                    <div className="flex h-16">
                        <button
                            onClick={() => setView('write')}
                            className={`px-4 flex items-center text-sm font-bold transition-all border-b-2 ${view === 'write' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                        >
                            Write
                        </button>
                        <button
                            onClick={() => setView('review')}
                            className={`px-4 flex items-center text-sm font-bold transition-all border-b-2 ${view === 'review' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                        >
                            Review
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                        <span className="text-xs font-bold text-slate-700">👤 {user.username}</span>
                    </div>
                    <button
                        onClick={logout}
                        className="text-xs font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </nav>

            {/* View Content */}
            <main className="flex-1 flex overflow-hidden">
                {view === 'write' ? (
                    <>
                        <FeedSidebar
                            onAddArticle={handleAddArticle}
                            onLoadDraft={handleLoadDraft}
                        />
                        <DraftEditor
                            synopsis={synopsis}
                            setSynopsis={setSynopsis}
                            articles={selectedArticles}
                            onRemoveArticle={handleRemoveArticle}
                            onSaveDraft={handleSaveDraft}
                            isSaving={isSaving}
                        />
                        {/* ExportModal is not explicitly included in the new structure for the 'write' view. */}
                        {/* If it's still needed, it should be placed here or within DraftEditor. */}
                        {/* <ExportModal synopsis={synopsis} articles={selectedArticles} /> */}
                    </>
                ) : (
                    <ReviewList onLoadDraft={handleLoadDraft} />
                )}
            </main>
        </div>
    );
}

export default function Root() {
    return (
        <AuthProvider>
            <App />
        </AuthProvider>
    );
}
