// Vercel Blob direct-upload helper. The client (admin page) calls this
// endpoint with the filename to get a one-time upload token; it then PUTs
// the file bytes directly to Blob, bypassing our function body (and its
// 4.5 MB limit). After the upload completes, the client POSTs to
// /api/admin/images with the resulting URL + Blob pathname to insert the
// metadata row.
//
// Reference: https://vercel.com/docs/storage/vercel-blob/client-upload

import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ivana2026';
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB — comfortable for phone JPEGs

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Auth happens here. The client sends the admin password via
        // `clientPayload` because Vercel's blob client doesn't expose
        // request headers. We refuse to sign a token without it.
        let payload: { password?: string } = {};
        try {
          payload = clientPayload ? JSON.parse(clientPayload) : {};
        } catch { /* not JSON, treat as no password */ }
        if (payload.password !== ADMIN_PASSWORD) {
          throw new Error('Unauthorized');
        }
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: MAX_BYTES,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async () => {
        // Client posts metadata to /api/admin/images directly after.
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    const status = (e instanceof Error && e.message === 'Unauthorized') ? 401 : 400;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'upload failed' },
      { status }
    );
  }
}
