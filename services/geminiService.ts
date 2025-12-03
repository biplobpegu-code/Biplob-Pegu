import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper function for API calls with retry logic
const generateContentWithRetry = async (
    params: {
        model: string;
        contents: { parts: any[] };
        config?: any;
    },
    retries = 3,
    initialDelay = 1000
): Promise<GenerateContentResponse> => {
    // Re-instantiate AI client to ensure we use the latest key (important for Pro model switching)
    const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let lastError: Error | undefined;
    for (let i = 0; i < retries; i++) {
        try {
            return await currentAi.models.generateContent(params);
        } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            
            // Fail fast on permission errors (403) or Not Found (404) to trigger UI key selection immediately
            if (lastError.message.includes("403") || 
                lastError.message.includes("PERMISSION_DENIED") || 
                lastError.message.includes("404") ||
                lastError.message.includes("Requested entity was not found")) {
                throw lastError;
            }

            console.warn(`API call attempt ${i + 1} of ${retries} failed: ${lastError.message}`);
            if (i < retries - 1) {
                // Using exponential backoff for subsequent retries
                const delay = initialDelay * Math.pow(2, i);
                await new Promise(res => setTimeout(res, delay)); 
            }
        }
    }
    console.error("API call failed after all retries.", lastError);
    // @ts-ignore
    throw lastError;
};


const resizeImage = (file: File, maxWidth: number, maxHeight: number, aspectRatio?: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = document.createElement('img');
        const reader = new FileReader();

        reader.onload = (e) => {
            if (e.target?.result) {
                img.src = e.target.result as string;
            } else {
                reject(new Error('Failed to read file for resizing.'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            // 1. Calculate scaled dimensions, preserving original aspect ratio
            let scaledWidth = img.width;
            let scaledHeight = img.height;

            if (scaledWidth > scaledHeight) {
                if (scaledWidth > maxWidth) {
                    scaledHeight = Math.round((scaledHeight * maxWidth) / scaledWidth);
                    scaledWidth = maxWidth;
                }
            } else {
                if (scaledHeight > maxHeight) {
                    scaledWidth = Math.round((scaledWidth * maxHeight) / scaledHeight);
                    scaledHeight = maxHeight;
                }
            }

            // 2. If aspect ratio is provided, re-canvas the image
            if (aspectRatio) {
                const [w, h] = aspectRatio.split(':').map(Number);
                if (!w || !h) return reject(new Error('Invalid aspect ratio format'));
                const targetRatio = w / h;

                let canvasWidth = scaledWidth;
                let canvasHeight = scaledHeight;
                
                // Determine the new canvas size to contain the image within the target aspect ratio
                if (scaledWidth / scaledHeight > targetRatio) {
                    // Image is wider than target, so canvas height needs to expand
                    canvasHeight = scaledWidth / targetRatio;
                } else {
                    // Image is taller than target, so canvas width needs to expand
                    canvasWidth = scaledHeight * targetRatio;
                }
                
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;

                // Fill with a white background
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Center the original scaled image on the new canvas
                const dx = (canvas.width - scaledWidth) / 2;
                const dy = (canvas.height - scaledHeight) / 2;
                ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, scaledWidth, scaledHeight);
            } else {
                // Original behavior: just create a canvas of the scaled image size
                canvas.width = scaledWidth;
                canvas.height = scaledHeight;
                ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
            }


            canvas.toBlob((blob) => {
                if (!blob) {
                    return reject(new Error('Canvas to Blob conversion failed'));
                }
                const resizedFile = new File([blob], file.name, {
                    type: 'image/jpeg', // Force jpeg for consistency
                    lastModified: Date.now(),
                });
                resolve(resizedFile);
            }, 'image/jpeg', 0.9);
        };
        img.onerror = reject;
    });
};


const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

export const describeImageStyle = async (styleImage: File): Promise<string> => {
    // For style images, we just resize, no re-canvasing.
    const resizedImage = await resizeImage(styleImage, 1024, 1024);
    const styleImageBase64 = await fileToBase64(resizedImage);
    const styleImagePart = {
        inlineData: {
            data: styleImageBase64,
            mimeType: resizedImage.type,
        },
    };
    
    // Enhanced prompt for detailed lighting and color analysis
    const textPart = {
        text: `Analyze the provided image with technical precision, focusing on these key aspects:
1. **Camera Angle & Perspective**: Describe the exact camera position (e.g., 'low-angle looking up', 'isometric 45-degree', 'flat lay top-down'). Mention focal length appearance if discernable.
2. **Lighting Configuration**: Identify the lighting setup (e.g., 'single softbox from left', 'hard sunlight with deep shadows', 'rim lighting', 'diffused window light'). Describe the quality of light (hard/soft), direction, and contrast ratio.
3. **Color Palette & Tones**: List the dominant colors, specific hex codes or names if possible, and accent tones. Describe the color temperature (warm/cool) and saturation levels (vibrant/muted/monochromatic).
4. **Material & Texture Rendering**: How are surfaces rendered? (e.g., 'glossy reflections', 'matte finish', 'high detail texture').

Synthesize this into a cohesive style description that instructs an AI to replicate this exact photographic look, lighting, and color grading.`,
    };

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.5-flash',
            contents: { parts: [styleImagePart, textPart] },
        });

        const description = response.text;
        if (description) {
            return description;
        } else {
            throw new Error('API did not return a description.');
        }
    } catch (e) {
        console.error("Gemini API call for description failed after retries:", e);
        throw new Error("Failed to analyze the style image. The AI model might be temporarily unavailable. Please try again later.");
    }
};


export const generateStyledImage = async (
    productImages: File[],
    prompt: string,
    variantCount: number = 1,
    aspectRatio: string,
): Promise<string[]> => {
    
    const imagePartsPromises = productImages.map(async (productImage) => {
        const resizedImage = await resizeImage(productImage, 1024, 1024, aspectRatio);
        const productImageBase64 = await fileToBase64(resizedImage);
        return {
            inlineData: {
                data: productImageBase64,
                mimeType: resizedImage.type,
            },
        };
    });

    const productImageParts = await Promise.all(imagePartsPromises);

    try {
        const generatedUrls: string[] = [];
        
        for (let i = 0; i < variantCount; i++) {
            const modifiedPrompt = `${prompt}\n\n(Artistic variation #${i + 1})`;
            const textPart = { text: modifiedPrompt };
            const parts: any[] = [...productImageParts, textPart];

            const response = await generateContentWithRetry({
                model: 'gemini-2.5-flash-image',
                contents: { parts: parts },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
            if (imagePart && imagePart.inlineData) {
                generatedUrls.push(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
            } else {
                const textResponse = response.text;
                console.warn(`API did not return an image for variant #${i + 1}. Response: ${textResponse || 'No text response'}`);
            }
        }

        if (generatedUrls.length === 0) {
            throw new Error("API failed to return any images for all variants.");
        }

        return generatedUrls;

    } catch(e) {
        console.error("Gemini API call for image generation failed after retries:", e);
        throw new Error("Failed to generate images. The AI model might be temporarily unavailable. Please check your API key and try again.");
    }
};

// Function for upscaling to 4K using Nano Banana Pro (Gemini 3 Pro)
export const upscaleStyledImage = async (
    imageBase64Url: string,
    originalPrompt: string,
    aspectRatio: string
): Promise<string> => {
    try {
        // Strip the data URL prefix to get raw base64
        const base64Data = imageBase64Url.split(',')[1];
        const mimeType = imageBase64Url.split(';')[0].split(':')[1];

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType,
            },
        };

        // Prompt engineered for high fidelity upscaling and text preservation
        const upscalePrompt = `
        Perform a high-fidelity upscale of this image to 4K resolution using the Pro model.
        
        CRITICAL INSTRUCTIONS:
        1. **TEXT & LABEL ACCURACY**: Ensure all product labels, brand names, logos, and text are perfectly sharp, legible, and have ZERO DISTORTION. This is a product photo, so branding MUST be flawless.
        2. **RESOLUTION**: The output must be crystal clear 4K quality.
        3. **FIDELITY**: Maintain the exact composition, lighting, shadows, and aesthetic of the input image. Do not change the scene content or product details, only enhance the quality and sharpness.
        4. **STYLE**: Photorealistic, professional commercial photography.
        
        Original Generation Context: ${originalPrompt}
        `;

        const response = await generateContentWithRetry({
            model: 'gemini-3-pro-image-preview', // "Nano Banana Pro" equivalent
            contents: { parts: [imagePart, { text: upscalePrompt }] },
            config: {
                imageConfig: {
                    imageSize: '4K', // Request 4K resolution
                    aspectRatio: aspectRatio
                },
                responseModalities: [Modality.IMAGE],
            }
        });

        const outputImagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        
        if (outputImagePart && outputImagePart.inlineData) {
            return `data:${outputImagePart.inlineData.mimeType};base64,${outputImagePart.inlineData.data}`;
        } else {
            throw new Error("Upscaling failed: No image returned from the API.");
        }

    } catch (e) {
        console.error("Upscale failed:", e);
        // Throw specific errors to be handled by UI
        throw e;
    }
};