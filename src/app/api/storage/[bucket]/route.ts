import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const ALLOWED_BUCKETS = ['receipts', 'medical-certs', 'avatars', 'documents'];

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

  if (!ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json({ error: 'Invalid bucket' }, { status: 403 });
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: athlete, error: athleteError } = await supabase
    .from('athletes')
    .select('role, payment_receipt_url, apto_medico_url, documento_url, avatar_url')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (athleteError || !athlete) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const isAdmin = athlete.role === 'admin';
  const ownedFiles = [
    athlete.payment_receipt_url,
    athlete.apto_medico_url,
    athlete.documento_url,
    athlete.avatar_url,
  ].filter(Boolean);

  if (!isAdmin && !ownedFiles.includes(filename)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
                     filename.endsWith('.webp') ? 'image/webp' :
                     'application/octet-stream';

  return new NextResponse(data, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
