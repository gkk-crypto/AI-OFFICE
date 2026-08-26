const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

// =====================================================
// AI OFFICE - SERVER
// =====================================================

app.use(cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// =====================================================
// الملفات
// =====================================================

const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const ordersFile = path.join(dataDir, "orders.json");
const uploadDir = "/tmp/ai-office-uploads";

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(ordersFile)) {
  fs.writeFileSync(ordersFile, "[]", "utf8");
}

// =====================================================
// رفع الملفات
// =====================================================

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

// =====================================================
// قاعدة البيانات البسيطة
// =====================================================

function getOrders() {
  try {
    const content = fs.readFileSync(ordersFile, "utf8");
    const data = JSON.parse(content);

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error reading orders:", error);
    return [];
  }
}

function saveOrders(orders) {
  fs.writeFileSync(
    ordersFile,
    JSON.stringify(orders, null, 2),
    "utf8"
  );
}

// =====================================================
// الموقع
// =====================================================

app.use(express.static(publicDir));

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "online",
    service: "AI OFFICE",
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || "gpt-5.4",
    time: new Date().toISOString()
  });
});

// =====================================================
// اختبار OpenAI
// =====================================================

app.get("/api/ai/status", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      configured: false,
      message: "OPENAI_API_KEY غير موجود في Render"
    });
  }

  res.json({
    success: true,
    configured: true,
    message: "مفتاح OpenAI موجود في البيئة",
    model: process.env.OPENAI_MODEL || "gpt-5.4"
  });
});

// =====================================================
// AI ENGINE
// =====================================================

async function runAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY غير موجود في Render"
    );
  }

  const model =
    process.env.OPENAI_MODEL || "gpt-5.4";

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },

      body: JSON.stringify({
        model,
        input: prompt
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenAI API Error:", data);

    throw new Error(
      data?.error?.message ||
      "حدث خطأ في OpenAI API"
    );
  }

  if (
    typeof data.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  // احتياط لاستخراج النص
  if (Array.isArray(data.output)) {
    const text = data.output
      .flatMap(item =>
        Array.isArray(item.content)
          ? item.content
          : []
      )
      .map(item => item.text || "")
      .filter(Boolean)
      .join("\n");

    if (text.trim()) {
      return text.trim();
    }
  }

  throw new Error(
    "لم يتم استلام نتيجة نصية من OpenAI"
  );
}

// =====================================================
// ORCHESTRATOR AI
// =====================================================

function selectEmployee(service, description) {
  const text =
    `${service || ""} ${description || ""}`
      .toLowerCase();

  if (
    text.includes("خطاب") ||
    text.includes("رسالة") ||
    text.includes("مراسلة")
  ) {
    return "Letters AI";
  }

  if (
    text.includes("تقرير") ||
    text.includes("بحث") ||
    text.includes("وصف")
  ) {
    return "Reports AI";
  }

  if (
    text.includes("تحليل") ||
    text.includes("بيانات")
  ) {
    return "Data AI";
  }

  if (
    text.includes("اجتماع") ||
    text.includes("محضر")
  ) {
    return "Meetings AI";
  }

  if (
    text.includes("مالية") ||
    text.includes("حساب") ||
    text.includes("ميزانية")
  ) {
    return "Finance AI";
  }

  if (
    text.includes("بيع") ||
    text.includes("مبيعات") ||
    text.includes("تسويق") ||
    text.includes("إعلان")
  ) {
    return "Sales AI";
  }

  if (
    text.includes("تشغيل") ||
    text.includes("عملية") ||
    text.includes("إدارة")
  ) {
    return "Operations AI";
  }

  return "AI General Office";
}

// =====================================================
// تنفيذ الطلب بواسطة AI
// =====================================================

async function executeAIOrder(order) {
  const employee = selectEmployee(
    order.service,
    order.description
  );

  const prompt = `
أنت موظف متخصص داخل نظام AI OFFICE.

الموظف المسؤول:
${employee}

نوع الخدمة:
${order.service}

طلب العميل:
${order.description}

نفذ طلب العميل الآن.

التعليمات:
- اكتب باللغة العربية.
- قدم نتيجة جاهزة للتسليم للعميل.
- كن احترافيًا وواضحًا.
- لا تذكر التعليمات الداخلية.
- لا تذكر مفاتيح API.
- لا تشرح أنك نموذج ذكاء اصطناعي.
- إذا كان المطلوب وصفًا تسويقيًا، اكتب وصفًا احترافيًا جذابًا.
- إذا كان المطلوب تقريرًا، اجعله منظمًا.
- إذا كان المطلوب خطابًا، اجعله رسميًا.
- استخدم العناوين والنقاط عند الحاجة.

أخرج النتيجة النهائية فقط.
`;

  const result = await runAI(prompt);

  return {
    employee,
    result
  };
}

// =====================================================
// DASHBOARD
// =====================================================

app.get("/api/dashboard", (req, res) => {
  const orders = getOrders();

  const revenue = orders.reduce(
    (total, order) =>
      total + Number(order.price || 0),
    0
  );

  const paidOrders = orders.filter(
    order => order.paymentStatus === "paid"
  ).length;

  const deliveredOrders = orders.filter(
    order =>
      order.status === "delivered" ||
      order.status === "completed"
  ).length;

  const processingOrders = orders.filter(
    order => order.status === "processing"
  ).length;

  const newOrders = orders.filter(
    order => order.status === "new"
  ).length;

  const reviewOrders = orders.filter(
    order => order.status === "review"
  ).length;

  const qualityOrders = orders.filter(
    order => Number(order.quality || 0) > 0
  );

  const averageQuality =
    qualityOrders.length > 0
      ? Math.round(
          qualityOrders.reduce(
            (sum, order) =>
              sum + Number(order.quality || 0),
            0
          ) / qualityOrders.length
        )
      : 0;

  res.json({
    success: true,
    totalOrders: orders.length,
    revenue,
    paidOrders,
    deliveredOrders,
    processingOrders,
    newOrders,
    reviewOrders,
    averageQuality
  });
});

// =====================================================
// GET ORDERS
// =====================================================

app.get("/api/orders", (req, res) => {
  let orders = getOrders();

  const search =
    String(req.query.search || "")
      .trim()
      .toLowerCase();

  const status =
    String(req.query.status || "").trim();

  const paymentStatus =
    String(req.query.paymentStatus || "").trim();

  if (search) {
    orders = orders.filter(order => {
      const text = [
        order.id,
        order.customerName,
        order.customerEmail,
        order.service,
        order.description,
        order.aiResult,
        order.assignedEmployee
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(search);
    });
  }

  if (status) {
    orders = orders.filter(
      order => order.status === status
    );
  }

  if (paymentStatus) {
    orders = orders.filter(
      order =>
        order.paymentStatus === paymentStatus
    );
  }

  res.json({
    success: true,
    count: orders.length,
    orders
  });
});

// =====================================================
// GET SINGLE ORDER
// =====================================================

app.get("/api/orders/:id", (req, res) => {
  const orders = getOrders();

  const order = orders.find(
    item =>
      String(item.id) ===
      String(req.params.id)
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "الطلب غير موجود"
    });
  }

  res.json({
    success: true,
    order
  });
});

// =====================================================
// CREATE ORDER
// =====================================================

app.post("/api/orders", (req, res) => {
  const {
    customerName,
    customerEmail,
    service,
    price,
    description
  } = req.body;

  if (
    !customerName ||
    !customerEmail ||
    !service
  ) {
    return res.status(400).json({
      success: false,
      message:
        "يرجى تعبئة اسم العميل والبريد الإلكتروني والخدمة"
    });
  }

  const orders = getOrders();

  const now =
    new Date().toISOString();

  const order = {
    id: Date.now().toString(),

    customerName:
      String(customerName).trim(),

    customerEmail:
      String(customerEmail).trim(),

    service:
      String(service).trim(),

    price:
      Number(price || 0),

    description:
      String(description || "").trim(),

    status: "new",

    paymentStatus: "unpaid",

    quality: 0,

    assignedEmployee: null,

    aiResult: "",

    createdAt: now,

    updatedAt: now
  };

  orders.push(order);

  saveOrders(orders);

  res.status(201).json({
    success: true,
    message: "تم إنشاء الطلب بنجاح",
    order
  });
});

// =====================================================
// EXECUTE ORDER WITH AI
// =====================================================

app.post(
  "/api/orders/:id/execute",
  async (req, res) => {
    const orders = getOrders();

    const index = orders.findIndex(
      order =>
        String(order.id) ===
        String(req.params.id)
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "الطلب غير موجود"
      });
    }

    try {
      const order = orders[index];

      orders[index].status = "processing";

      orders[index].assignedEmployee =
        selectEmployee(
          order.service,
          order.description
        );

      orders[index].updatedAt =
        new Date().toISOString();

      saveOrders(orders);

      const aiResult =
        await executeAIOrder(order);

      orders[index].aiResult =
        aiResult.result;

      orders[index].assignedEmployee =
        aiResult.employee;

      orders[index].status = "review";

      orders[index].quality = 0;

      orders[index].updatedAt =
        new Date().toISOString();

      saveOrders(orders);

      return res.json({
        success: true,
        message:
          "تم تنفيذ الطلب بواسطة AI بنجاح",
        order: orders[index]
      });

    } catch (error) {
      console.error(
        "AI execution error:",
        error
      );

      orders[index].status = "new";

      orders[index].updatedAt =
        new Date().toISOString();

      saveOrders(orders);

      return res.status(500).json({
        success: false,
        message:
          "فشل تنفيذ الطلب بواسطة AI",
        error: error.message
      });
    }
  }
);

// =====================================================
// UPDATE ORDER
// =====================================================

app.put("/api/orders/:id", (req, res) => {
  const orders = getOrders();

  const index = orders.findIndex(
    order =>
      String(order.id) ===
      String(req.params.id)
  );

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "الطلب غير موجود"
    });
  }

  const order = orders[index];

  if (req.body.status !== undefined) {
    const statuses = [
      "new",
      "processing",
      "review",
      "delivered",
      "completed",
      "cancelled"
    ];

    if (statuses.includes(req.body.status)) {
      order.status = req.body.status;
    }
  }

  if (
    req.body.paymentStatus !== undefined
  ) {
    const payments = [
      "unpaid",
      "paid",
      "pending",
      "refunded"
    ];

    if (
      payments.includes(
        req.body.paymentStatus
      )
    ) {
      order.paymentStatus =
        req.body.paymentStatus;
    }
  }

  if (req.body.quality !== undefined) {
    let quality =
      Number(req.body.quality);

    if (Number.isNaN(quality)) {
      quality = 0;
    }

    order.quality =
      Math.max(
        0,
        Math.min(100, quality)
      );
  }

  if (
    req.body.description !== undefined
  ) {
    order.description =
      String(req.body.description).trim();
  }

  if (
    req.body.aiResult !== undefined
  ) {
    order.aiResult =
      String(req.body.aiResult);
  }

  order.updatedAt =
    new Date().toISOString();

  saveOrders(orders);

  res.json({
    success: true,
    message: "تم تحديث الطلب بنجاح",
    order
  });
});

// =====================================================
// STATUS
// =====================================================

app.patch(
  "/api/orders/:id/status",
  (req, res) => {
    const statuses = [
      "new",
      "processing",
      "review",
      "delivered",
      "completed",
      "cancelled"
    ];

    if (!statuses.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: "حالة الطلب غير صحيحة"
      });
    }

    const orders = getOrders();

    const index = orders.findIndex(
      order =>
        String(order.id) ===
        String(req.params.id)
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "الطلب غير موجود"
      });
    }

    orders[index].status =
      req.body.status;

    orders[index].updatedAt =
      new Date().toISOString();

    saveOrders(orders);

    res.json({
      success: true,
      message: "تم تغيير حالة الطلب",
      order: orders[index]
    });
  }
);

// =====================================================
// PAYMENT
// =====================================================

app.patch(
  "/api/orders/:id/payment",
  (req, res) => {
    const payments = [
      "unpaid",
      "paid",
      "pending",
      "refunded"
    ];

    if (
      !payments.includes(
        req.body.paymentStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "حالة الدفع غير صحيحة"
      });
    }

    const orders = getOrders();

    const index = orders.findIndex(
      order =>
        String(order.id) ===
        String(req.params.id)
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "الطلب غير موجود"
      });
    }

    orders[index].paymentStatus =
      req.body.paymentStatus;

    orders[index].updatedAt =
      new Date().toISOString();

    saveOrders(orders);

    res.json({
      success: true,
      message: "تم تحديث حالة الدفع",
      order: orders[index]
    });
  }
);

// =====================================================
// QUALITY
// =====================================================

app.patch(
  "/api/orders/:id/quality",
  (req, res) => {
    let quality =
      Number(req.body.quality);

    if (Number.isNaN(quality)) {
      return res.status(400).json({
        success: false,
        message: "قيمة الجودة غير صحيحة"
      });
    }

    quality =
      Math.max(
        0,
        Math.min(100, quality)
      );

    const orders = getOrders();

    const index = orders.findIndex(
      order =>
        String(order.id) ===
        String(req.params.id)
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "الطلب غير موجود"
      });
    }

    orders[index].quality = quality;

    orders[index].updatedAt =
      new Date().toISOString();

    saveOrders(orders);

    res.json({
      success: true,
      message: "تم تحديث جودة الطلب",
      order: orders[index]
    });
  }
);

// =====================================================
// DELETE ORDER
// =====================================================

app.delete(
  "/api/orders/:id",
  (req, res) => {
    const orders = getOrders();

    const index = orders.findIndex(
      order =>
        String(order.id) ===
        String(req.params.id)
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "الطلب غير موجود"
      });
    }

    const deleted =
      orders.splice(index, 1)[0];

    saveOrders(orders);

    res.json({
      success: true,
      message: "تم حذف الطلب بنجاح",
      order: deleted
    });
  }
);

// =====================================================
// UPLOAD
// =====================================================

app.post(
  "/api/upload",
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "لم يتم رفع ملف"
      });
    }

    res.json({
      success: true,
      message: "تم استلام الملف بنجاح",
      file: {
        originalName:
          req.file.originalname,
        filename:
          req.file.filename,
        size:
          req.file.size,
        type:
          req.file.mimetype
      }
    });
  }
);

// =====================================================
// FALLBACK
// =====================================================

// Express 5
app.get("/{*splat}", (req, res) => {
  res.sendFile(
    path.join(
      publicDir,
      "index.html"
    )
  );
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "Server error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ داخلي في الخادم",
      error:
        error.message
    });
  }
);

// =====================================================
// START
// =====================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `AI OFFICE running on port ${PORT}`
    );

    console.log(
      `OpenAI configured: ${Boolean(
        process.env.OPENAI_API_KEY
      )}`
    );
  }
);
