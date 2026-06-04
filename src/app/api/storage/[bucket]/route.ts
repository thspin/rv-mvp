import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bucket: string }> }
) {
  const { bucket } = await params;
  const searchParams = request.nextUrl.searchParams;
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: 'Filename required' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(filename);

  if (error) {
    console.error('Storage download error:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const contentType = filename.endsWith('.pdf') ? 'application/pdf' :
                     filename.endsWith('.png') ? 'image/png' :
                     filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' :
                     'application/octet-stream';

  return new NextResponse(data, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
