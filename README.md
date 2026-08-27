# AI OFFICE

نظام AI OFFICE لإدارة الأعمال والخدمات الرقمية بالذكاء الاصطناعي

## الميزات

- 🤖 نظام موظفي ذكاء اصطناعي متخصصين
- 📋 إدارة شاملة للطلبات
- 💰 تتبع الإيرادات والمدفوعات
- 📊 لوحة معلومات تحليلية
- 🔄 سير عمل منظم من الاستقبال إلى التسليم
- 🌐 واجهة ويب عربية احترافية

## المتطلبات

- Node.js 16+
- npm أو yarn
- مفتاح API من OpenAI

## التثبيت والتشغيل

### 1. استنساخ المستودع
```bash
git clone https://github.com/gkk-crypto/AI-OFFICE.git
cd AI-OFFICE
```

### 2. تثبيت المكتبات
```bash
npm install
```

### 3. إعداد متغيرات البيئة
أنشئ ملف `.env` في جذر المشروع:
```bash
cp .env.example .env
```

ثم قم بتحرير ملف `.env` وأضف مفتاح API الخاص بك:
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo
PORT=10000
```

### 4. تشغيل الخادم
```bash
npm start
```

سيبدأ الخادم على `http://localhost:10000`

## API Endpoints

### Health Check
```
GET /api/health
```

### AI Status
```
GET /api/ai/status
```

### Dashboard
```
GET /api/dashboard
```

### Orders Management
```
GET /api/orders
GET /api/orders/:id
POST /api/orders
PUT /api/orders/:id
DELETE /api/orders/:id
POST /api/orders/:id/execute
```

### Order Status & Payment
```
PATCH /api/orders/:id/status
PATCH /api/orders/:id/payment
PATCH /api/orders/:id/quality
```

## التكوين على Render.com

```yaml
services:
  - type: web
    name: ai-office
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
```

### متغيرات البيئة المطلوبة على Render:
- `OPENAI_API_KEY`: مفتاح API من OpenAI
- `OPENAI_MODEL`: النموذج المستخدم (مثلاً: gpt-3.5-turbo)

## ملاحظات مهمة

- **لا تشارك مفتاح API الخاص بك علنًا**
- تأكد من أن لديك رصيد كافي في حسابك على OpenAI
- الحد الأقصى للطلب الواحد: 60 ثانية
- حد أقصى لحجم الملف: 20 ميجابايت

## الترخيص

هذا المشروع مفتوح المصدر
