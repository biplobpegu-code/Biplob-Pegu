import React, { useState, useEffect, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { OptionSelector } from './components/OptionSelector';
import { generateStyledImage, describeImageStyle, upscaleStyledImage } from './services/geminiService';
import { ASPECT_RATIOS, LIGHTING_STYLES, CAMERA_PERSPECTIVES } from './constants';
import { Header } from './components/Header';
import { GeneratedImageDisplay } from './components/GeneratedImageDisplay';
import { HistoryDisplay } from './components/HistoryDisplay';
import { ImagePreviewModal } from './components/ImagePreviewModal';

const App: React.FC = () => {
    const [productImages, setProductImages] = useState<File[]>([]);
    const [productImagePreviews, setProductImagePreviews] = useState<string[]>([]);
    const [styleImage, setStyleImage] = useState<File | null>(null);
    const [styleImagePreview, setStyleImagePreview] = useState<string | null>(null);

    const [aspectRatio, setAspectRatio] = useState<string>(ASPECT_RATIOS[0]);
    const [lightingStyle, setLightingStyle] = useState<string>(LIGHTING_STYLES[0]);
    const [cameraPerspective, setCameraPerspective] = useState<string>(CAMERA_PERSPECTIVES[0]);

    const [styleDescription, setStyleDescription] = useState<string>('');
    const [isDescribingStyle, setIsDescribingStyle] = useState<boolean>(false);
    const [styleAnalyzed, setStyleAnalyzed] = useState<boolean>(false);
    const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
    const [promptManuallyEdited, setPromptManuallyEdited] = useState<boolean>(false);
    const [finalImages, setFinalImages] = useState<string[] | null>(null);
    const [history, setHistory] = useState<string[][]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [upscalingImageSrc, setUpscalingImageSrc] = useState<string | null>(null); // Track which image is upscaling
    const [error, setError] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    useEffect(() => {
        if (!styleImage) {
            setStyleDescription('');
            setStyleAnalyzed(false);
            return;
        }

        const generateDescription = async () => {
            setIsDescribingStyle(true);
            setStyleAnalyzed(false);
            setError(null);
            try {
                const description = await describeImageStyle(styleImage);
                setStyleDescription(description);
                setStyleAnalyzed(true);
            } catch (err) {
                console.error("Failed to generate style description:", err);
                setError(err instanceof Error ? err.message : 'An unknown error occurred while analyzing the style image.');
                setStyleDescription('');
                setStyleAnalyzed(false);
            } finally {
                setIsDescribingStyle(false);
            }
        };

        generateDescription();
    }, [styleImage]);

    useEffect(() => {
        if (promptManuallyEdited) return;

        const createPrompt = () => {
            if (isDescribingStyle) {
                setGeneratedPrompt('Analyzing style image to generate a detailed prompt...');
                return;
            }
            
            const productCount = productImages.length;
            const coreTask = productCount > 1
                ? `Generate a single, professional, hyper-realistic, and photorealistic photograph featuring a composition of all ${productCount} provided product images. Arrange them naturally and aesthetically in the scene.`
                : `Generate a single, professional, hyper-realistic, and photorealistic product photograph based on the provided product image.`;
            
            const strictRules = `IMPORTANT RULES:
- The product(s) themselves MUST NOT be altered. Maintain the original product's shape, form, and identity.
- The product's colors, labels, logos, and any text MUST remain exactly as they appear in the original photo. Do NOT change them.
- The output MUST be a clean, high-resolution photograph suitable for professional e-commerce use.`;
    
            let stylisticGuidance = `STYLING:
- Aspect Ratio: ${aspectRatio}
- Lighting: ${lightingStyle}`;
    
            if (styleDescription) {
                stylisticGuidance += `
- Visual Style Replication (Color, Light, Angle): "${styleDescription.replace(/\n/g, ' ')}".
- INSTRUCTION: Strictly adhere to the analyzed Camera Angle, Lighting Configuration, and Color Palette described above. Replicate the exact photographic atmosphere, including light direction and color grading.`;
            } else {
                stylisticGuidance += `
- Camera Angle: ${cameraPerspective}`;
            }
            
            const finalPrompt = `${coreTask}\n\n${strictRules}\n\n${stylisticGuidance}`;
            
            setGeneratedPrompt(finalPrompt);
        };
        createPrompt();
    }, [aspectRatio, lightingStyle, cameraPerspective, styleDescription, isDescribingStyle, productImages.length, promptManuallyEdited]);

    const handleImageUpload = (files: File[], type: 'product' | 'style') => {
        if (type === 'product') {
            setProductImages(prev => [...prev, ...files]);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setProductImagePreviews(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        } else { // 'style'
            const file = files[0];
            if (!file) return;
            setStyleImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setStyleImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleClearProductImage = (indexToRemove: number) => {
        setProductImages(prev => prev.filter((_, index) => index !== indexToRemove));
        setProductImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleClearStyleImage = () => {
        setStyleImage(null);
        setStyleImagePreview(null);
        setStyleDescription('');
        setError(null);
        setStyleAnalyzed(false);
    };

    const handleGenerateClick = useCallback(async () => {
        if (productImages.length === 0 || isLoading) return;

        if (finalImages) {
            setHistory(prevHistory => [finalImages, ...prevHistory]);
        }

        setIsLoading(true);
        setError(null);
        setFinalImages(null);

        try {
            const newImages = await generateStyledImage(productImages, generatedPrompt, 4, aspectRatio);
            setFinalImages(newImages);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [productImages, generatedPrompt, isLoading, aspectRatio, finalImages]);

    const handleUpscaleClick = useCallback(async (imageSrc: string) => {
        if (upscalingImageSrc) return; // Prevent multiple concurrent upscales

        // Check for Paid API Key (Required for Pro model)
        // @ts-ignore - window.aistudio is injected
        if (window.aistudio && window.aistudio.hasSelectedApiKey && window.aistudio.openSelectKey) {
            // @ts-ignore
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                // @ts-ignore
                await window.aistudio.openSelectKey();
                // We proceed to try the call; if it fails we will catch it.
            }
        }

        setUpscalingImageSrc(imageSrc);
        setError(null);

        try {
            const upscaledImage = await upscaleStyledImage(imageSrc, generatedPrompt, aspectRatio);
            setZoomedImage(upscaledImage); // Open the upscaled result immediately
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            
            // Handle Permission Denied (403) or Not Found (404) for Pro model access
            if (errorMessage.includes("Requested entity was not found") || 
                errorMessage.includes("PERMISSION_DENIED") || 
                errorMessage.includes("403")) {
                 
                 // @ts-ignore
                 if (window.aistudio && window.aistudio.openSelectKey) {
                     // @ts-ignore
                     await window.aistudio.openSelectKey();
                     // Inform user they need to try again after selecting key
                     setError("Please select a valid paid API key to use the Pro Upscaler, then try again.");
                 } else {
                     setError("Permission denied. Please ensure you are using a valid paid API key.");
                 }
            } else {
                setError(errorMessage || 'Upscaling failed.');
            }
        } finally {
            setUpscalingImageSrc(null);
        }

    }, [generatedPrompt, aspectRatio, upscalingImageSrc]);

    const handleDownloadClick = useCallback((imageSrc: string, fileName: string) => {
        if (!imageSrc) return;

        const link = document.createElement('a');
        link.href = imageSrc;

        const mimeType = imageSrc.split(';')[0].split(':')[1];
        const extension = mimeType.split('/')[1] || 'png';
        link.download = `${fileName}.${extension}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    return (
        <div className="min-h-screen bg-slate-900 text-gray-200 font-sans">
            {zoomedImage && <ImagePreviewModal src={zoomedImage} onClose={() => setZoomedImage(null)} />}
            <Header />
            <main className="container mx-auto p-4 lg:p-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Controls Column */}
                    <div className="lg:w-1/2 flex flex-col gap-6">
                        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                            <h2 className="text-xl font-bold mb-4 text-white">1. Upload Photos</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="font-semibold text-slate-300">Product Photo(s)</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {productImagePreviews.map((preview, index) => (
                                            <div key={index} className="relative group aspect-square">
                                                <img src={preview} alt={`Product ${index + 1}`} className="w-full h-full object-contain rounded-lg bg-slate-700/50 p-1" />
                                                <button
                                                    onClick={() => handleClearProductImage(index)}
                                                    className="absolute top-1 right-1 bg-slate-900/70 text-white rounded-full p-1.5 hover:bg-red-500 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                                    aria-label={`Remove product ${index + 1}`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                        <ImageUploader
                                            id="product-photo"
                                            label=""
                                            onImageUpload={(files) => handleImageUpload(files, 'product')}
                                            onClear={() => {}}
                                            preview={null}
                                            multiple={true}
                                        />
                                    </div>
                                </div>
                                <ImageUploader
                                    id="style-photo"
                                    label="Style Reference (Optional)"
                                    onImageUpload={(files) => handleImageUpload(files, 'style')}
                                    onClear={handleClearStyleImage}
                                    preview={styleImagePreview}
                                    isAnalyzed={styleAnalyzed}
                                />
                            </div>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                            <h2 className="text-xl font-bold mb-4 text-white">2. Select Style Options</h2>
                            <div className="space-y-4">
                                <OptionSelector label="Aspect Ratio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} options={ASPECT_RATIOS} />
                                <OptionSelector label="Lighting Style" value={lightingStyle} onChange={(e) => setLightingStyle(e.target.value)} options={LIGHTING_STYLES} />
                                <OptionSelector label="Camera Perspective" value={cameraPerspective} onChange={(e) => setCameraPerspective(e.target.value)} options={CAMERA_PERSPECTIVES} />
                            </div>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-xl shadow-lg relative">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">3. Generated Prompt</h2>
                                {promptManuallyEdited && (
                                     <button
                                        onClick={() => setPromptManuallyEdited(false)}
                                        className="text-sm text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 transition-colors"
                                        aria-label="Reset to auto-generated prompt"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-11.664 0l3.181-3.183a8.25 8.25 0 00-11.664 0l3.181 3.183" />
                                        </svg>
                                        Regenerate Prompt
                                    </button>
                                )}
                            </div>
                            <textarea
                                value={generatedPrompt}
                                onChange={(e) => {
                                    setGeneratedPrompt(e.target.value);
                                    setPromptManuallyEdited(true);
                                }}
                                className="w-full h-48 p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 text-gray-300 disabled:bg-slate-700/50 disabled:text-slate-400"
                                placeholder="Prompt will be generated here..."
                            />
                             {isDescribingStyle && (
                                <div className="absolute inset-0 bg-slate-800/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
                                     <div className="flex items-center text-slate-300">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Analyzing style image...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Output Column */}
                    <div className="lg:w-1/2 flex flex-col gap-6">
                         <div className="bg-slate-800 p-6 rounded-xl shadow-lg flex-grow flex flex-col">
                             <h2 className="text-xl font-bold mb-4 text-white">4. Generate Image</h2>
                             <div className="flex-grow flex flex-col justify-between">
                                 <GeneratedImageDisplay 
                                    finalImages={finalImages} 
                                    isLoading={isLoading} 
                                    error={error} 
                                    onDownload={handleDownloadClick}
                                    onImageClick={setZoomedImage}
                                 />
                                 <div className="mt-4 flex flex-col gap-4">
                                     <button
                                        onClick={handleGenerateClick}
                                        disabled={productImages.length === 0 || isLoading}
                                        className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition duration-300 flex items-center justify-center shadow-md disabled:shadow-none"
                                    >
                                        {isLoading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Generating...
                                            </>
                                        ) : 'Generate Image'}
                                    </button>
                                 </div>
                             </div>
                         </div>
                         {history.length > 0 && (
                            <HistoryDisplay 
                                history={history} 
                                onDownload={handleDownloadClick} 
                                onImageClick={setZoomedImage}
                                onUpscale={handleUpscaleClick}
                                upscalingImageSrc={upscalingImageSrc}
                            />
                         )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;