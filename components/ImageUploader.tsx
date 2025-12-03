import React, { useRef, useState } from 'react';

interface ImageUploaderProps {
    id: string;
    label: string;
    onImageUpload: (files: File[]) => void;
    onClear: () => void;
    preview: string | null;
    isAnalyzed?: boolean;
    multiple?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, onImageUpload, preview, onClear, isAnalyzed, multiple = false }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            onImageUpload(Array.from(files));
        }
    };
    
    const handleClearClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClear();
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    }

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation(); // Necessary to allow drop
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            // FIX: Explicitly type `file` as `File` to resolve TypeScript error.
            let acceptedFiles = Array.from(files).filter((file: File) => 
                ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
            );
            
            if (acceptedFiles.length > 0) {
                if (!multiple) {
                    acceptedFiles = [acceptedFiles[0]];
                }
                onImageUpload(acceptedFiles);
            }
        }
    };


    return (
        <div className="flex flex-col gap-2 h-full">
            {label && <label htmlFor={id} className="font-semibold text-slate-300">{label}</label>}
            <div
                className={`relative w-full h-full aspect-square bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-600 hover:border-indigo-500 transition-colors duration-200 flex items-center justify-center cursor-pointer group ${isDragging ? 'border-indigo-400' : ''}`}
                onClick={() => inputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    id={id}
                    ref={inputRef}
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                    multiple={multiple}
                    onChange={handleFileChange}
                />
                {preview ? (
                    <>
                        <img src={preview} alt={label} className={`w-full h-full object-contain rounded-lg p-2 transition-opacity duration-300 ${isAnalyzed ? 'opacity-30' : 'opacity-100'}`} />
                        <button 
                            onClick={handleClearClick}
                            className="absolute top-2 right-2 bg-slate-900/70 text-white rounded-full p-1.5 hover:bg-red-500 transition-all duration-200 opacity-0 group-hover:opacity-100"
                            aria-label="Clear image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        {isAnalyzed && (
                             <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white bg-slate-900/50 rounded-lg pointer-events-none">
                                <div className="bg-green-500/80 rounded-full p-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="font-bold mt-2 text-sm">Style Analyzed</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center text-slate-400 p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <p className="mt-2 text-sm">Add Photo(s)</p>
                    </div>
                )}
                 {isDragging && (
                    <div className="absolute inset-0 bg-indigo-900/50 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center text-center text-white pointer-events-none transition-opacity duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                        <p className="font-bold mt-2 text-sm">Drop to Upload</p>
                    </div>
                )}
            </div>
        </div>
    );
};