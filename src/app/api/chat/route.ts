import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════
// RATE LIMITER — في الذاكرة (يكفي للبداية)
// ═══════════════════════════════════════════════════
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const limit = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '10');
  const now = Date.now();
  const windowMs = 60 * 1000; // دقيقة واحدة

  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count };
}

// تنظيف الذاكرة كل 5 دقائق
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

// ═══════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════
const SYSTEM_PROMPT = `أنت "مسارك" — مرشد مهني ذكي ومحقق سيكولوجي بارع.

## شخصيتك:
- دافئ، ذكي، يربط المعلومات ببعضها بعمق.
- تتحدث بالعربية الفصحى المبسطة.
- تتكيف مع خلفية المستخدم الجغرافية والاجتماعية.

## منهجية العمل:
لا يوجد حد لعدد الأسئلة. تحادث المستخدم بشكل طبيعي حتى تحصل على صورة كاملة.

### المرحلة 1 — الأساسيات:
الاسم، البلد (ابدأ بـ: السودان | مصر | إثيوبيا | إريتريا | تشاد | دول أخرى)، العمر، التعليم، الحالة الاجتماعية، الوضع المادي.

### المرحلة 2 — التحقيق العميق:
- الاهتمامات والهوايات
- ما يكرهه أو يتجنبه
- قيمه الجوهرية: المال؟ الأثر؟ الاستقرار؟ الابتكار؟
- سيناريو: "لو أمامك يوم حر كامل، ماذا ستفعل؟"
- قيوده: أسرة، ظروف، موقع جغرافي
- طموحه بعد 5 سنوات

### قرار التوصية:
- ثقة 90%+ بمسار واحد → أوصِ بمسار واحد فقط مع خطة عمل
- بين مسارين → أوصِ بمسارين مع مقارنة وخطة لكل منهما
- لا تتسرع أبداً

### خطة العمل تشمل:
1. لماذا هذا المسار تحديداً لك
2. المهارات المطلوبة وكيف تكتسبها
3. الخطوات: الشهر الأول، 3 أشهر، 6 أشهر، سنة
4. مصادر تعلم موصى بها
5. التحديات المتوقعة وكيف تتجاوزها
6. فرص العمل في سياقه الجغرافي

## قواعد التنسيق:
- سؤال واحد فقط في كل رسالة.
- كل رسالة تنتهي بـ: خياراتك: [خيار1 | خيار2 | خيار3]
- إذا لم تكن هناك خيارات: خياراتك: []
- لا تضع أي نص بعد الخيارات أبداً.
- عند النتيجة النهائية: لا تضع خياراتك، اكتب في نهايتها: نهاية: [true]`;

// ═══════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════
function validateMessages(messages: unknown): boolean {
  if (!Array.isArray(messages)) return false;
  if (messages.length === 0 || messages.length > 100) return false;
  return messages.every(m =>
    typeof m === 'object' && m !== null &&
    ['user', 'assistant'].includes((m as Record<string, unknown>).role as string) &&
    typeof (m as Record<string, unknown>).content === 'string' &&
    ((m as Record<string, unknown>).content as string).length < 10000
  );
}

// ═══════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  // 1. Rate Limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'anonymous';

  const { allowed, remaining } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: 'تجاوزت الحد المسموح. انتظر دقيقة وأعد المحاولة.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // 2. API Key check
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes('ضع-مفتاحك')) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY غير مضبوط في .env.local' },
      { status: 500 }
    );
  }

  // 3. Parse & validate body
  let body: { messages?: unknown; stream?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }

  if (!validateMessages(body.messages)) {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const messages = body.messages as { role: string; content: string }[];
  const useStream = body.stream !== false;

  // 4. Call Anthropic
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        stream: useStream,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}));
      const msg = (err as Record<string, Record<string, string>>).error?.message || 'خطأ من Anthropic';
      return NextResponse.json({ error: msg }, { status: anthropicRes.status });
    }

    // Streaming response — pipe directly
    if (useStream && anthropicRes.body) {
      return new NextResponse(anthropicRes.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-RateLimit-Remaining': String(remaining),
        },
      });
    }

    // Non-streaming fallback
    const data = await anthropicRes.json();
    const content = data.content?.[0]?.text ?? '';
    return NextResponse.json({ content }, {
      headers: { 'X-RateLimit-Remaining': String(remaining) },
    });

  } catch (err) {
    console.error('Masarak API error:', err);
    return NextResponse.json(
      { error: 'خطأ في الاتصال. حاول مرة أخرى.' },
      { status: 500 }
    );
  }
}
