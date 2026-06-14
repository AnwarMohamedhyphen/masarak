# 🧭 مسارك — دليل النشر الكامل

## ⚡ تشغيل محلي (للاختبار)

```bash
# 1. تثبيت المكتبات
npm install

# 2. إضافة مفتاح Anthropic
# افتح ملف .env.local وضع مفتاحك:
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxx

# 3. تشغيل
npm run dev
# افتح: http://localhost:3000
```

احصل على المفتاح من: https://console.anthropic.com/

---

## 🌐 النشر على Vercel (مجاني — الأسهل والأفضل)

### الطريقة الأولى: عبر GitHub (موصى بها)

**الخطوة 1 — ارفع المشروع على GitHub:**
```bash
git init
git add .
git commit -m "مسارك v1.0"
git branch -M main
git remote add origin https://github.com/اسمك/masarak.git
git push -u origin main
```

**الخطوة 2 — اربطه بـ Vercel:**
1. اذهب إلى https://vercel.com وسجّل دخول بـ GitHub
2. اضغط "Add New Project"
3. اختر مستودع masarak
4. اضغط "Deploy" — Vercel يكتشف Next.js تلقائياً

**الخطوة 3 — أضف مفتاح API:**
في Vercel Dashboard:
- Settings → Environment Variables
- أضف: `ANTHROPIC_API_KEY` = مفتاحك
- اضغط Save ثم أعد النشر (Redeploy)

**النتيجة:** رابط مثل `https://masarak.vercel.app` 🎉

---

### الطريقة الثانية: Vercel CLI مباشرة

```bash
npm install -g vercel
vercel login
vercel --prod
# اتبع التعليمات
```

ثم أضف المفتاح من Dashboard كما في الخطوة 3 أعلاه.

---

## 🔒 ملاحظات الأمان

- **المفتاح محمي**: يعمل فقط في السيرفر عبر `/api/chat`
- **Rate Limiting**: 10 طلبات/دقيقة لكل مستخدم (قابل للتغيير في `.env.local`)
- **Validation**: كل المدخلات تُتحقق منها قبل الإرسال
- **لا تشارك** ملف `.env.local` مع أحد أو ترفعه على GitHub

---

## 🎬 إضافة فيديو مقدمة خاص بك

ضع ملف الفيديو في:
```
public/video/intro.mp4
```
ثم في `MasarakApp.tsx` غيّر VIDEO_ID إلى رابط الفيديو المحلي:
```tsx
// بدلاً من YouTube:
<video src="/video/intro.mp4" autoPlay muted />
```

---

## 🌍 ربط دومين خاص

في Vercel Dashboard:
- Settings → Domains
- أضف دومينك: `masarak.com`
- اتبع تعليمات DNS

---

## 📊 متغيرات البيئة الكاملة

| المتغير | القيمة | الوصف |
|---------|--------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | **مطلوب** — مفتاح Claude |
| `RATE_LIMIT_PER_MINUTE` | `10` | اختياري — حد الطلبات |

---

© أنور جعفر — منصة مسارك 2026
