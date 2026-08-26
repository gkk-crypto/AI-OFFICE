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

app.use(express.json({
  limit: "10mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "10mb"
}));

// =====================================================
// رفع الملفات
// =====================================================

const uploadDir = "/tmp/ai-office-uploads";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

// =====================================================
// قاعدة البيانات
// =====================================================

const dataDir = path.join(__dirname, "data");
const ordersFile = path.join(dataDir, "orders.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, {
    recursive: true
  });
}

if (!fs.existsSync(ordersFile)) {
  fs.writeFileSync(
    ordersFile,
    "[]",
    "utf8"
  );
}

// =====================================================
// وظائف قاعدة البيانات
// =====================================================

function getOrders() {
  try {
    const data = fs.readFileSync(
      ordersFile,
      "utf8"
    );

    const orders = JSON.parse(data);

    return Array.isArray(orders)
      ? orders
      : [];

  } catch (error) {
    console.error(
      "Error reading orders:",
      error
    );

    return [];
  }
}

function saveOrders(orders) {
  fs.writeFileSync(
    ordersFile,
    JSON.stringify(
      orders,
      null,
      2
    ),
    "utf8"
  );
}

// =====================================================
// ملفات الموقع
// =====================================================

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
  "/api/health",
  (req, res) => {

    res.json({
      success: true,
      status: "online",
      service: "AI OFFICE",
      aiConfigured: Boolean(
        process.env.OPENAI_API_KEY
      ),
      time: new Date().toISOString()
    });

  }
);

// =====================================================
// AI ENGINE
// =====================================================

async function runAI(prompt) {

  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY غير موجود في Render"
    );
  }

  const model =
    process.env.OPENAI_MODEL ||
    "gpt-5.4";

  const response =
    await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${apiKey}`
        },

        body: JSON.stringify({
          model: model,

          input: prompt
        })
      }
    );

  const data =
    await response.json();

  if (!response.ok) {

    console.error(
      "OpenAI API Error:",
      data
    );

    throw new Error(
      data?.error?.message ||
      "OpenAI API Error"
    );
  }

  if (
    typeof data.output_text ===
    "string"
  ) {
    return data.output_text;
  }

  // احتياط إذا لم يرجع output_text
  if (Array.isArray(data.output)) {

    const text =
      data.output
        .flatMap(item =>
          Array.isArray(item.content)
            ? item.content
            : []
        )
        .map(content =>
          content.text || ""
        )
        .filter(Boolean)
        .join("\n");

    if (text) {
      return text;
    }
  }

  return "";
}

// =====================================================
// ORCHESTRATOR AI
// =====================================================

function selectEmployee(
  service,
  description
) {

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
    text.includes("بحث")
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
    text.includes("تسويق")
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

  const employee =
    selectEmployee(
      order.service,
      order.description
    );

  const prompt = `
أنت موظف متخصص داخل نظام AI OFFICE.

اسم الموظف:
${employee}

نوع الخدمة:
${order.service}

وصف طلب العميل:
${order.description}

نفذ الطلب المطلوب الآن.

التعليمات:
- اكتب باللغة العربية.
- قدم نتيجة جاهزة للتسليم.
- كن احترافيًا وواضحًا.
- لا تتحدث عن التعليمات الداخلية.
- لا تذكر مفاتيح API.
- لا تقل للعميل إنك لا تستطيع تنفيذ الطلب إذا كان بإمكانك تقديم نتيجة مفيدة.
- استخدم عناوين ونقاط عند الحاجة.
- إذا كان الطلب كتابة محتوى، اكتب المحتوى كاملًا.
- إذا كان تقريرًا، اجعله منظمًا.
- إذا كان خطابًا، اجعله رسميًا.
- إذا كان وصفًا تسويقيًا، اجعله مناسبًا للإعلان.

أخرج النتيجة النهائية فقط.
`;

  const result =
    await runAI(prompt);

  return {
    employee,
    result
  };
}

// =====================================================
// لوحة الإحصائيات
// =====================================================

app.get(
  "/api/dashboard",
  (req, res) => {

    const orders =
      getOrders();

    const revenue =
      orders.reduce(
        (total, order) =>
          total +
          Number(order.price || 0),
        0
      );

    const paidOrders =
      orders.filter(
        order =>
          order.paymentStatus === "paid"
      ).length;

    const deliveredOrders =
      orders.filter(
        order =>
          order.status === "delivered" ||
          order.status === "completed"
      ).length;

    const processingOrders =
      orders.filter(
        order =>
          order.status === "processing"
      ).length;

    const newOrders =
      orders.filter(
        order =>
          order.status === "new"
      ).length;

    const reviewOrders =
      orders.filter(
        order =>
          order.status === "review"
      ).length;

    const qualityOrders =
      orders.filter(
        order =>
          order.quality !== undefined &&
          order.quality !== null &&
          Number(order.quality) > 0
      );

    const averageQuality =
      qualityOrders.length > 0
        ? Math.round(
            qualityOrders.reduce(
              (sum, order) =>
                sum +
                Number(order.quality || 0),
              0
            ) /
            qualityOrders.length
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

  }
);

// =====================================================
// جلب الطلبات
// =====================================================

app.get(
  "/api/orders",
  (req, res) => {

    let orders =
      getOrders();

    const search =
      String(
        req.query.search || ""
      )
      .trim()
      .toLowerCase();

    const status =
      String(
        req.query.status || ""
      )
      .trim();

    const paymentStatus =
      String(
        req.query.paymentStatus || ""
      )
      .trim();

    if (search) {

      orders =
        orders.filter(
          order => {

            const text =
              [
                order.id,
                order.customerName,
                order.customerEmail,
                order.service,
                order.description,
                order.aiResult
              ]
              .join(" ")
              .toLowerCase();

            return text.includes(search);
          }
        );
    }

    if (status) {

      orders =
        orders.filter(
          order =>
            order.status === status
        );
    }

    if (paymentStatus) {

      orders =
        orders.filter(
          order =>
            order.paymentStatus ===
            paymentStatus
        );
    }

    res.json({
      success: true,
      count: orders.length,
      orders
    });

  }
);

// =====================================================
// جلب طلب واحد
// =====================================================

app.get(
  "/api/orders/:id",
  (req, res) => {

    const orders =
      getOrders();

    const order =
      orders.find(
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

  }
);

// =====================================================
// إنشاء طلب
// =====================================================

app.post(
  "/api/orders",
  (req, res) => {

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
          "يرجى تعبئة بيانات العميل والخدمة"
      });

    }

    const orders =
      getOrders();

    const now =
      new Date().toISOString();

    const newOrder = {

      id:
        Date.now().toString(),

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

      status:
        "new",

      paymentStatus:
        "unpaid",

      quality:
        0,

      assignedEmployee:
        null,

      aiResult:
        "",

      createdAt:
        now,

      updatedAt:
        now

    };

    orders.push(
      newOrder
    );

    saveOrders(
      orders
    );

    res.status(201).json({
      success: true,
      message:
        "تم إنشاء الطلب بنجاح",
      order:
        newOrder
    });

  }
);

// =====================================================
// تنفيذ طلب بواسطة AI
// =====================================================

app.post(
  "/api/orders/:id/execute",
  async (req, res) => {

    try {

      const orders =
        getOrders();

      const index =
        orders.findIndex(
          order =>
            String(order.id) ===
            String(req.params.id)
        );

      if (index === -1) {

        return res.status(404).json({
          success: false,
          message:
            "الطلب غير موجود"
        });

      }

      const order =
        orders[index];

      // بدء التنفيذ
      orders[index].status =
        "processing";

      orders[index].assignedEmployee =
        selectEmployee(
          order.service,
          order.description
        );

      orders[index].updatedAt =
        new Date().toISOString();

      saveOrders(
        orders
      );

      // تنفيذ AI
      const aiResult =
        await executeAIOrder(
          order
        );

      // حفظ النتيجة
      orders[index].aiResult =
        aiResult.result;

      orders[index].assignedEmployee =
        aiResult.employee;

      orders[index].status =
        "review";

      orders[index].quality =
        0;

      orders[index].updatedAt =
        new Date().toISOString();

      saveOrders(
        orders
      );

      res.json({
        success: true,
        message:
          "تم تنفيذ الطلب بواسطة AI بنجاح",
        order:
          orders[index]
      });

    } catch (error) {

      console.error(
        "AI execution error:",
        error
      );

      // إذا فشل AI نحاول إعادة الطلب لحالة جديدة
      try {

        const orders =
          getOrders();

        const index =
          orders.findIndex(
            order =>
              String(order.id) ===
              String(req.params.id)
          );

        if (index !== -1) {

          orders[index].status =
            "new";

          orders[index].updatedAt =
            new Date().toISOString();

          saveOrders(
            orders
          );
        }

      } catch (saveError) {

        console.error(
          "Error restoring order:",
          saveError
        );
      }

      res.status(500).json({
        success: false,
        message:
          "حدث خطأ أثناء تنفيذ الطلب بواسطة AI",
        error:
          error.message
      });

    }

  }
);

// =====================================================
// تحديث طلب
// =====================================================

app.put(
  "/api/orders/:id",
  (req, res) => {

    const orders =
      getOrders();

    const index =
      orders.findIndex(
        order =>
          String(order.id) ===
          String(req.params.id)
      );

    if (index === -1) {

      return res.status(404).json({
        success: false,
        message:
          "الطلب غير موجود"
      });

    }

    if (
      req.body.status !==
      undefined
    ) {

      const allowedStatuses = [
        "new",
        "processing",
        "review",
        "delivered",
        "completed",
        "cancelled"
      ];

      if (
        allowedStatuses.includes(
          req.body.status
        )
      ) {

        orders[index].status =
          req.body.status;

      }
    }

    if (
      req.body.paymentStatus !==
      undefined
    ) {

      const allowedPayments = [
        "unpaid",
        "paid",
        "refunded",
        "pending"
      ];

      if (
        allowedPayments.includes(
          req.body.paymentStatus
        )
      ) {

        orders[index].paymentStatus =
          req.body.paymentStatus;

      }
    }

    if (
      req.body.quality !==
      undefined
    ) {

      let quality =
        Number(
          req.body.quality
        );

      if (
        Number.isNaN(quality)
      ) {
        quality = 0;
      }

      quality =
        Math.max(
          0,
          Math.min(
            100,
            quality
          )
        );

      orders[index].quality =
        quality;
    }

    if (
      req.body.description !==
      undefined
    ) {

      orders[index].description =
        String(
          req.body.description
        ).trim();

    }

    if (
      req.body.aiResult !==
      undefined
    ) {

      orders[index].aiResult =
        String(
          req.body.aiResult
        );

    }

    orders[index].updatedAt =
      new Date().toISOString();

    saveOrders(
      orders
    );

    res.json({
      success: true,
      message:
        "تم تحديث الطلب بنجاح",
      order:
        orders[index]
    });

  }
);

// =====================================================
// تغيير حالة الطلب
// =====================================================

app.patch(
  "/api/orders/:id/status",
  (req, res) => {

    const {
      status
    } = req.body;

    const allowedStatuses = [
      "new",
      "processing",
      "review",
      "delivered",
      "completed",
      "cancelled"
    ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {

      return res.status(400).json({
        success: false,
        message:
          "حالة الطلب غير صحيحة"
      });

    }

    const orders =
      getOrders();

    const index =
      orders.findIndex(
        order =>
          String(order.id) ===
          String(req.params.id)
      );

    if (index === -1) {

      return res.status(404).json({
        success: false,
        message:
          "الطلب غير موجود"
      });

    }

    orders[index].status =
      status;

    orders[index].updatedAt =
      new Date().toISOString();

    saveOrders(
      orders
    );

    res.json({
      success: true,
      message:
        "تم تغيير حالة الطلب",
      order:
        orders[index]
    });

  }
);

// =====================================================
// تغيير حالة الدفع
// =====================================================

app.patch(
  "/api/orders/:id/payment",
  (req, res) => {

    const {
      paymentStatus
    } = req.body;

    const allowedPayments = [
      "unpaid",
      "paid",
      "pending",
      "refunded"
    ];

    if (
      !allowedPayments.includes(
        paymentStatus
      )
    ) {

      return res.status(400).json({
        success: false,
        message:
          "حالة الدفع غير صحيحة"
      });

    }

    const orders =
      getOrders();

    const index =
      orders.findIndex(
        order =>
          String(order.id) ===
          String(req.params.id)
      );

    if (index === -1) {

      return res.status(404).json({
        success: false,
        message:
          "الطلب غير موجود"
      });

    }

    orders[index].paymentStatus =
      paymentStatus;

    orders[index].updatedAt =
      new Date().toISOString();

    saveOrders(
      orders
    );

    res.json({
      success: true,
      message:
        "تم تحديث حالة الدفع",
      order:
        orders[index]
    });

  }
);

// =====================================================
// تحديث الجودة
// =====================================================

app.patch(
  "/api/orders/:id/quality",
  (req, res) => {

    let quality =
      Number(
        req.body.quality
      );

    if (
      Number.isNaN(quality)
    ) {

      return res.status(400).json({
        success: false,
        message:
          "قيمة الجودة غير صحيحة"
      });

    }

    quality =
      Math.max(
        0,
        Math.min(
          100,
          quality
        )
      );

    const orders =
      getOrders();

    const index =
      orders.findIndex(
        order =>
          String(order.id) ===
          String(req.params.id)
      );

    if (index === -1) {

      return res.status(404).json({
        success: false,
        message:
          "الطلب غير موجود"
      });

    }

    orders[index].quality =
      quality;

    orders[index].updatedAt =
      new Date().toISOString();

    saveOrders(
      orders
    );

    res.json({
      success: true,
      message:
        "تم تحديث جودة الطلب",
      order:
        orders[index]
    });

  }
);

// =====================================================
// حذف طلب
// =====================================================

app.delete(
  "/api/orders/:id",
  (req, res) => {

    const orders =
      getOrders();

    const index =
      orders.findIndex(
        order =>
          String(order.id) ===
          String(req.params.id)
      );

    if (index === -1) {

      return res.status(404).json({
        success: false,
        message:
          "الطلب غير موجود"
      });

    }

    const deletedOrder =
      orders.splice(
        index,
        1
      )[0];

    saveOrders(
      orders
    );

    res.json({
      success: true,
      message:
        "تم حذف الطلب بنجاح",
      order:
        deletedOrder
    });

  }
);

// =====================================================
// رفع ملف
// =====================================================

app.post(
  "/api/upload",
  upload.single("file"),
  (req, res) => {

    if (!req.file) {

      return res.status(400).json({
        success: false,
        message:
          "لم يتم رفع ملف"
      });

    }

    res.json({
      success: true,
      message:
        "تم استلام الملف بنجاح",
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
// الصفحة الرئيسية
// =====================================================

app.get(
  "/{*splat}",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );

  }
);

// =====================================================
// تشغيل الخادم
// =====================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `AI OFFICE running on port ${PORT}`
    );

  }
);
