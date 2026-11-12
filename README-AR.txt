النشر على GitHub وVercel — NOX CFW

هذه النسخة تعمل على الاستضافة دون تشغيل الكمبيوتر.
لا تستخدم start.bat ولا ترفع النسخة المحلية القديمة أو الخاصة.
التصميم والمنتجات نفسها، لكن الجلسات والحالات محفوظة في Upstash Redis.
لا يوجد دخول مسؤول بكلمة مرور محلية في هذه النسخة. الإدارة عبر رتبة Discord فقط.
لا تتضمن الحزمة .env أو مفاتيحك أو private-files أو ملفات Node المحمولة.

1. GitHub
افتح https://github.com وسجّل الدخول.
اضغط + ثم New repository. الاسم المقترح nox-cfw. اختر Private ثم Create repository.
فك ZIP وافتح مجلد nox-vercel.
ارفع محتوياته داخل المستودع: api وlib وscripts وsite-assets وtests وpackage.json وvercel.json.
يجب أن يظهر package.json وvercel.json مباشرة في جذر المستودع، وليس داخل مجلد إضافي.
استخدم Upload files ثم Commit changes. إذا رفض عدد الملفات، ارفعها على دفعات مع الحفاظ على المجلدات.
لا ترفع .env الحقيقي أو LOCAL-ADMIN.txt أو ملفات النسخ القديمة.

2. التخزين السحابي
افتح https://console.upstash.com وأنشئ حساباً ثم Redis database.
اختر المنطقة والخطة المناسبة لاستخدامك وراجع الحدود والتكلفة قبل الإنشاء.
من صفحة القاعدة انسخ UPSTASH_REDIS_REST_URL وUPSTASH_REDIS_REST_TOKEN.
احتفظ بهما لإعدادات Vercel. لا تضعهما في ملفات GitHub.

3. إنشاء مشروع Vercel
افتح https://vercel.com وسجل الدخول باستخدام GitHub.
اختر Add New ثم Project، ثم Import للمستودع nox-cfw.
Framework Preset: Other.
Root Directory: المجلد الرئيسي الذي يحتوي package.json.
لا تحتاج تعديل أوامر البناء أو مجلد الناتج؛ مضبوطة في vercel.json.
اسم المشروع المقترح nox-cfw-store، وقد يكون محجوزاً؛ اختر اسماً متاحاً.
اختر الخطة المناسبة وفق شروط Vercel الحالية؛ هذه التعليمات لا تضمن أن المتجر مجاني.

4. Environment Variables في Vercel
أدخل هذه القيم في Production:
PUBLIC_URL = https://اسم-مشروعك.vercel.app
DISCORD_CLIENT_ID = معرّف تطبيقك
DISCORD_CLIENT_SECRET = السر الحالي لتطبيقك
DISCORD_BOT_TOKEN = توكن البوت الموجود في السيرفر
UPSTASH_REDIS_REST_URL = رابط REST من Upstash
UPSTASH_REDIS_REST_TOKEN = توكن REST من Upstash
REDIS_PREFIX = nox:production:

PUBLIC_URL يجب أن يطابق رابط Production الثابت في Domains، دون / أخيرة.
لا تستخدم رابط المعاينة المتغير ولا localhost.
إذا لم تعرف الرابط بعد، انشر أول مرة ثم انسخه من Domains وأضفه في الإعدادات وأعد النشر.
لا تضف القيم السابقة إلى GitHub، ولا تستخدم بادئة NEXT_PUBLIC_ للمفاتيح.

5. Discord
افتح https://discord.com/developers/applications واختر تطبيقك.
في OAuth2 ثم Redirects أضف:
https://اسم-مشروعك.vercel.app/auth/callback
واضغط Save Changes.
اترك البوت في السيرفر. رتبة الإدارة المطلوبة: 1541289675862573206.
إذا تغيرت مفاتيح Discord استخدم القيم الجديدة في Vercel.

6. Deploy
اضغط Deploy وانتظر Ready.
إذا عدلت Environment Variables بعد النشر، من Deployments اختر Redeploy.
افتح رابط Production من نافذة خاصة ومن الجوال، وسجل بحساب Discord.
اختبر حساباً عادياً وحساباً يحمل رتبة الإدارة.
إذا طلب من الزائر تسجيل الدخول في Vercel نفسه، راجع Settings ثم Deployment Protection
وأوقف حماية منصة Vercel عن Production إذا كانت مفعلة، مع إبقاء حماية الموقع عبر Discord.

الكمبيوتر يمكن إغلاقه بعد رفع الملفات؛ الموقع يعمل لدى Vercel والتخزين لدى Upstash.
اسم نطاق مخصص اختياري. عند تغييره عدّل PUBLIC_URL وOAuth2 Redirects ثم أعد النشر.
جلسات الدخول تنتهي بعد 8 ساعات. عدد الأعضاء تقريبي من Discord ويُخزن دقيقة واحدة.
تعذر التخزين يرفض العمليات؛ تعذر قراءة رتبة Discord يرفض الحفظ الإداري.
ملفات المعاينة موجودة ضمن site-assets وتُقدم بعد الدخول. زر الطلب يفتح سيرفر Discord.
التسليم والدفع يدويان؛ لا توجد بوابة تحصيل أو تسليم تلقائي.

التحقق المنجز:
node tests/cloud-auth.mjs
الاختبارات تستخدم تخزيناً وردود Discord محاكاة. لم يُنفَّذ نشر حي إلى حسابك.
الاختبار يشمل الدخول بين نسختين من الخادم، الحالة المشتركة، رفض إعادة استخدام OAuth،
إزالة الرتبة، مغادرة السيرفر، انقطاع التحقق، منع CSRF وإبطال جلسة الخروج عبر النسخ.

مراجع:
https://vercel.com/docs/functions/runtimes/node-js
https://vercel.com/docs/project-configuration/vercel-json
https://upstash.com/docs/redis/features/restapi
https://docs.discord.com/developers/topics/oauth2
