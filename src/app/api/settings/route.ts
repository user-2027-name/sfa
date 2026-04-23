import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    const settings = await sql`SELECT * FROM system_settings`;
    const settingsMap = settings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    return NextResponse.json(settingsMap);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { key, value } = await request.json();
    if (!key) return NextResponse.json({ error: 'Key is required' }, { status: 400 });

    if (!value || value.trim() === '') {
      if (key === 'default_shared_drive_url') {
        return NextResponse.json({ error: 'デフォルト設定を空にすることはできません。予期せぬ削除を防ぐため、値を入力してください。' }, { status: 400 });
      }
    }

    await sql`
      INSERT INTO system_settings (key, value) 
      VALUES (${key}, ${value}) 
      ON CONFLICT(key) DO UPDATE SET value = ${value}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
