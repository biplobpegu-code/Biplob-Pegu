import React from 'react';

interface GeneratedImageDisplayProps {
    finalImages: string[] | null;
    isLoading: boolean;
    error: string | null;
    onDownload: (imageSrc: string, fileName: string) => void;
    onImageClick: (imageSrc: string) => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex flex-col items-center justify-center text-slate-400">
        <svg className="animate-spin h-10 w-10 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-lg">Generating your masterpieces...</p>
        <p className="text-sm">This may take a moment.</p>
    </div>
);

const Placeholder: React.FC = () => (
    <div className="text-center text-slate-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 00-4.136 1.162M16.5 20.896L18.75 18a2.25 2.25 0 00.659-1.591V8.25M16.5 20.896a24.301 24.301 0 00-4.136-1.162M16.5 20.896L19.5 19.5m0 0a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5m15-15l-3.75 3.75" />
        </svg>
        <p className="mt-4 text-lg">Your generated images will appear here.</p>
        <p className="text-sm">Configure your settings and click "Generate".</p>
    </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
    <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">
        <h3 className="font-bold text-lg">Generation Failed</h3>
        <p className="text-sm">{message}</p>
    </div>
);

export const GeneratedImageDisplay: React.FC<GeneratedImageDisplayProps> = ({ finalImages, isLoading, error, onDownload, onImageClick }) => {
    
    return (
        <div className="w-full bg-slate-700/50 rounded-lg border-2 border-slate-700 flex items-center justify-center p-2">
            {isLoading ? (
                <LoadingSpinner />
            ) : error ? (
                <ErrorDisplay message={error} />
            ) : finalImages && finalImages.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 w-full h-full">
                    {finalImages.map((imageSrc, index) => (
                        <div key={index} className="relative group aspect-square">
                            <button
                                onClick={() => onImageClick(imageSrc)}
                                className="w-full h-full rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500"
                                aria-label={`Preview generated variant ${index + 1}`}
                            >
                                <img src={imageSrc} alt={`Generated product variant ${index + 1}`} className="w-full h-full object-contain rounded-md" />
                            </button>
                            <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                <button
                                    onClick={() => onDownload(imageSrc, `ai-product-photo-variant-${index + 1}`)}
                                    className="bg-slate-900/80 text-white rounded-full p-2 hover:bg-green-600 transition-colors"
                                    aria-label={`Download variant ${index + 1}`}
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <Placeholder />
            )}
        </div>
    );
};