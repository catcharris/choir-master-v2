import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Use Edge for lowest latency response
export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET() {
    return NextResponse.json({
        serverTime: Date.now()
    }, {
        headers: {
            // Prevent caching at all levels
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            // Allow cross-origin if strictly needed, though it's same-origin by default
            'Access-Control-Allow-Origin': '*'
        }
    });
}
