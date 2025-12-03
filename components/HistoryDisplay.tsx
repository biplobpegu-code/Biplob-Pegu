import React from 'react';

interface HistoryDisplayProps {
    history: string[][];
    onDownload: (imageSrc: string, fileName: string) => void;
    onImageClick: (imageSrc: string) => void;
    onUpscale: (imageSrc: string) => void;
    upscalingImageSrc: string | null;
}

export const HistoryDisplay: React.FC<HistoryDisplayProps> = ({ history, onDownload, onImageClick, onUpscale, upscalingImageSrc }) => {
    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg flex-grow flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-white">Generation History</h2>
            <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2">
                {history.map((imageSet, historyIndex) => (
                     <div key={historyIndex} className="bg-slate-700/50 p-2 rounded-lg">
                         <div className="grid grid-cols-4 gap-2 w-full h-full">
                            {imageSet.map((imageSrc, imageIndex) => (
                                <div key={imageIndex} className="relative group aspect-square">
                                    <button
                                        onClick={() => onImageClick(imageSrc)}
                                        className="w-full h-full rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500"
                                        aria-label={`Preview history item ${historyIndex + 1}, variant ${imageIndex + 1}`}
                                    >
                                        <img 
                                            src={imageSrc} 
                                            alt={`History item ${historyIndex + 1}, variant ${imageIndex + 1}`} 
                                            className="w-full h-full object-contain rounded-md" 
                                        />
                                    </button>
                                    <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                         <button
                                            onClick={() => onUpscale(imageSrc)}
                                            disabled={!!upscalingImageSrc}
                                            className="bg-slate-900/80 text-amber-400 rounded-full p-1.5 hover:bg-amber-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Upscale to 4K (Pro)"
                                            aria-label={`Upscale history variant to 4K`}
                                        >
                                            {upscalingImageSrc === imageSrc ? (
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => onDownload(imageSrc, `history-${historyIndex + 1}-variant-${imageIndex + 1}`)}
                                            className="bg-slate-900/80 text-white rounded-full p-1.5 hover:bg-green-600 transition-all duration-200"
                                            aria-label={`Download history variant`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                ))}
            </div>
        </div>
    );
};