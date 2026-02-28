import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import https from 'https';
import { supabase } from '@/lib/supabaseClient';

// Vercel Serverless Function configuration
export const maxDuration = 60; // Allow up to 60 seconds since Vision models can be slow

export async function POST(req: NextRequest) {
    // Initialize Gemini Library inside the handler so env vars are read at runtime
    const apiKey = process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
        return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const body = await req.json();
        const { imageUrl } = body;

        if (!imageUrl) {
            return NextResponse.json({ error: 'Missing imageUrl in request body' }, { status: 400 });
        }

        // Supabase often aliases edge domains which fail Node.js DNS resolution on Vercel
        // Force replace the known alias with the primary project domain
        const resolvedImageUrl = imageUrl.replace('mzhidknsjicxsyvttxix.supabase.co', 'vhzxriifwdjoitmxwstm.supabase.co');

        // Fetch the image from URL directly via Node native https to bypass Next.js/undici fetch caching bugs on Vercel
        const arrBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            https.get(resolvedImageUrl, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to fetch image. Status: ${res.statusCode}`));
                    return;
                }
                const data: Buffer[] = [];
                res.on('data', (chunk) => data.push(chunk));
                res.on('end', () => resolve(Buffer.concat(data).buffer as ArrayBuffer));
            }).on('error', (err) => reject(err));
        });

        const base64Image = Buffer.from(arrBuffer).toString('base64');
        const mimeType = 'image/png'; // We'll assume PNG for Gemini Vision

        // Prepare the model
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: `You are an expert transcriber of Korean and English choral sheet music.
Your sole job is to extract lyrics from sheet music images perfectly.
CRITICAL RULES:
1. Sheet music often breaks single words across notes/measures (e.g., "용 서 하여주 - 소 서" or "나 의 모"). You MUST combine these broken syllables back into natural, grammatically correct full words (e.g., "용서하여 주소서", "나의 모든").
2. DO NOT output lyrics blindly left-to-right. Combine them into flowing, natural sentences that make grammatical sense to read like a poem.
3. CHORAL ARRANGEMENTS (Call & Response): If different voice parts (e.g., Soprano vs. Alto/Tenor) sing different lyrics simultaneously or as a call-and-response, treat the MAIN melody as the primary text. Place the accompanying or responding secondary lyrics inside parentheses. (e.g., "사랑하는 나의 주님 (주님) 내 영혼이 (내 영혼이)").
4. Ignore ALL musical notations, tempos, dynamic marks (mf, p, f, cresc.), and composer names.
5. Output ONLY the final, cleaned-up lyrics text. No markdown formatting, no explanations.
6. CROSS-PAGE WORDS: Often, a word is cut in half at the very end of a page because the melody continues to the next page. If a word or sentence looks incomplete at the end of the page, output it EXACTLY as it is without trying to guess the missing half. The next page will contain the remaining letters.`
        });

        const prompt = "Please extract the lyrics from this page according to your system instructions.";

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType
            }
        };

        console.log("Calling Gemini Vision API...");
        let result;
        try {
            result = await model.generateContent([prompt, imagePart]);
        } catch (e: any) {
            console.error("Gemini API Error:", e);
            return NextResponse.json({ error: `Gemini API Failed: ${e.message}` }, { status: 502 });
        }

        const responseText = result.response.text();

        console.log("Lyrics Extracted:", responseText);

        return NextResponse.json({ lyrics: responseText }, { status: 200 });
    } catch (error: any) {
        console.error("Unknown API Route Error:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
