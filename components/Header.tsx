import React from 'react';

export const Header: React.FC = () => {
    return (
        <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
            <div className="container mx-auto px-4 lg:px-8 py-4">
                <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                    <span className="text-indigo-400">AI</span> Product Photo Studio
                </h1>
                {/* FIX: Updated "Gemini Nano Banana" to "Gemini" for more standard branding. */}
                <p className="text-sm text-slate-400 mt-1">Powered by Gemini</p>
            </div>
        </header>
    );
};