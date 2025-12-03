import React, { useEffect } from 'react';

interface ImagePreviewModalProps {
    src: string;
    onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ src, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-white/20 transition-colors"
                aria-label="Close image preview"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <div
                className="relative max-w-4xl max-h-[90vh] animate-scale-in"
                onClick={(e) => e.stopPropagation()} 
            >
                <img src={src} alt="Zoomed preview" className="object-contain w-full h-full rounded-lg shadow-2xl" />
            </div>
        </div>
    );
};