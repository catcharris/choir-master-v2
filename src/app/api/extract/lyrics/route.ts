import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini Library with API Key
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: NextRequest) {
    if (!apiKey) {
        return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { imageUrl } = body;

        if (!imageUrl) {
            return NextResponse.json({ error: 'Missing imageUrl in request body' }, { status: 400 });
        }

        console.log("Fetching image from URL:", imageUrl);

        // Fetch the image from the URL (Supabase storage public URL)
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            return NextResponse.json({ error: 'Failed to fetch the uploaded image.' }, { status: 400 });
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imageResponse.headers.get('content-type') || 'image/png';

        // Prepare the model
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = "Extract only the Korean and/or English lyrics from this sheet music image. Please format it line by line as it appears in the song. Do not include musical notations, tempos, or composer names. Just the lyrics text.";

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType
            }
        };

        console.log("Calling Gemini Vision API...");
        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();

        console.log("Lyrics Extracted:", responseText);

        return NextResponse.json({ lyrics: responseText }, { status: 200 });
    } catch (error: any) {
        console.error("Error extracting lyrics with Gemini:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
