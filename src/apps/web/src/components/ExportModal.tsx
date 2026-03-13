import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Article } from 'core';

interface Props {
    synopsis: string;
    articles: Article[];
}

export const ExportModal: React.FC<Props> = ({ synopsis, articles }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateHTML = () => {
        const formattedSynopsis = synopsis.split('\n').map(p => `<p style="margin-bottom: 1em; line-height: 1.6; color: #333; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${p}</p>`).join('');

        const formattedArticles = articles.map(a => `
      <div style="margin-bottom: 24px; padding: 16px; border-left: 4px solid #3b82f6; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <h3 style="margin: 0 0 8px 0; font-size: 18px;">
          <a href="${a.link}" style="color: #2563eb; text-decoration: none; font-weight: bold;">${a.title}</a>
        </h3>
        <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5; color: #4b5563;">${a.snippet}</p>
        <span style="font-size: 12px; color: #9ca3af; text-transform: uppercase;">VIA ${a.source.toUpperCase()}</span>
      </div>
    `).join('');

        return `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="margin-bottom: 32px;">
          ${formattedSynopsis}
        </div>
        <div style="border-top: 2px solid #e5e7eb; padding-top: 24px;">
          <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">This Week's Top Stories</h2>
          ${formattedArticles}
        </div>
      </div>
    `;
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generateHTML());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="px-8 py-3 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-slate-200 active:scale-95"
            >
                Preview & Export
            </button>
        );
    }

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Preview Newsletter</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Review the final layout before exporting to Substack</p>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-50 rounded-full"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-slate-50/50 flex justify-center">
                    <div className="bg-white shadow-xl border border-slate-200 p-4 md:p-10 w-full max-w-[720px] min-h-full overflow-x-hidden break-words" dangerouslySetInnerHTML={{ __html: generateHTML() }} />
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-white rounded-b-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-xs text-slate-500 font-medium max-w-xs">HTML is optimized for Substack and other major email providers.</p>
                    </div>
                    <button
                        onClick={handleCopy}
                        className={`px-8 py-3 rounded-xl flex items-center font-black uppercase tracking-widest text-xs transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-slate-200'}`}
                    >
                        {copied ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Copied!
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Copy HTML Source
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
