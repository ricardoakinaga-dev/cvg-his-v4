import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Same-Origin API Proxy for his-web
 * 
 * Proxies all requests going to /api/backend/* to the internal backend url
 * This eliminates CORS issues and standardizes the API client usage.
 */

async function proxyRequest(request: NextRequest, { params }: { params: { path?: string[] } }) {
    const path = params.path?.join('/') || '';
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';

    const internalUrl = process.env.HIS_API_INTERNAL_URL;
    if (!internalUrl) {
        console.error('[proxyRequest] HIS_API_INTERNAL_URL is not set!');
        return NextResponse.json({ error: 'Internal server proxy configuration error' }, { status: 500 });
    }

    const backendUrl = `${internalUrl}/${path}${queryString}`;

    const proxyHeaders = new Headers();
    const allowedHeaders = ['content-type', 'authorization', 'x-account-id', 'x-user-id'];

    request.headers.forEach((value, key) => {
        if (allowedHeaders.includes(key.toLowerCase())) {
            proxyHeaders.set(key, value);
        }
    });

    const requestOptions: RequestInit = {
        method: request.method,
        headers: proxyHeaders,
        redirect: 'manual',
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
        requestOptions.body = request.body;
        // We need to tell Next.js to not parse the body, just stream it
        // Using @ts-ignore because NextRequest.body is ReadableStream, which RequestInit accepts in Node 18+
        // @ts-ignore
        requestOptions.duplex = 'half';
    }

    try {
        const upstreamResponse = await fetch(backendUrl, requestOptions);

        const responseHeaders = new Headers();
        upstreamResponse.headers.forEach((value, key) => {
            responseHeaders.set(key, value);
        });

        return new NextResponse(upstreamResponse.body, {
            status: upstreamResponse.status,
            statusText: upstreamResponse.statusText,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error(`[proxyRequest] Error proxying to ${backendUrl}:`, error);
        return NextResponse.json({ error: 'Bad Gateway' }, { status: 502 });
    }
}

export async function GET(request: NextRequest, context: { params: { path?: string[] } }) {
    return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: { path?: string[] } }) {
    return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: { path?: string[] } }) {
    return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { path?: string[] } }) {
    return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { path?: string[] } }) {
    return proxyRequest(request, context);
}
