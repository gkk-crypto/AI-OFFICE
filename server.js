const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 10000;

// =====================================================
// AI OFFICE - SERVER
// =====================================================

// -------------------------
// الإعدادات الأساسية
// -------------------------

app.use(cors());

app.use(
  express.json({
    limit: "10mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
  })
);

// =====================================================
// OPENAI
// =====================================================

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  : null;

const AI_MODEL =
  process.env.OPENAI_MODEL || "gpt-5.6-luna";

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
// قاعدة البيانات البسيطة
// =====================================================

const dataDir = path.join(
  __dirname,
  "data"
);

const ordersFile = path.join(
  dataDir,
  "orders.json"
);

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
// AI OFFICE - ORCHESTRATOR
// =====================================================

async function runOrchestrator(order) {
  if (!openai) {
    return {
      success: false,
      available: false,
      message:
        "OPENAI_API_KEY غير موجود في إعدادات الخادم."
    };
  }

  const prompt = `
أنت Orchestrator AI في نظام AI OFFICE.

مهمتك تحليل طلب العميل وتحديد أفضل طريقة لتنفيذه.

بيانات الطلب:

اسم العميل:
${order.customerName}

الخدمة:
${order.service}

وصف الطلب:
${order.description}

السعر:
${order.price} ريال

قم بالآتي:

1. فهم طلب العميل.
2. تحديد الموظف المناسب من فريق AI OFFICE.
3. تحديد خطوات التنفيذ.
4. تنفيذ المهمة المطلوبة قدر الإمكان.
5. إنشاء نتيجة احترافية جاهزة للعميل.
6. اقتراح درجة جودة من 0 إلى 100.

موظفو AI OFFICE:

- Letters AI: الخطابات والمراسلات.
- Reports AI: التقارير.
- Data AI: تحليل البيانات.
- Meetings AI: الاجتماعات.
- Finance AI: المالية.
- Sales AI: المبيعات والتسويق.
- Operations AI: العمليات.
- Quality AI: مراجعة الجودة.
- Customer Success AI: خدمة العملاء.

أعد النتيجة باللغة العربية.

اجعل الرد عمليًا ومباشرًا وجاهزًا للاستخدام.
`;

  try {
    const response =
      await openai.responses.create({
        model: AI_MODEL,

        instructions:
          "أنت نظام تشغيل داخلي احترافي اسمه AI OFFICE. تعامل مع طلبات العملاء باحترافية، ولا تخترع معلومات غير موجودة.",

        input: prompt,

        text: {
          verbosity: "medium"
        },

        max_output_tokens: 1800
      });

    const output =
      response.output_text ||
      "";

    return {
      success: true,
      available: true,
      model: AI_MODEL,
      result: output.trim()
    };
  } catch (error) {
    console.error(
      "OpenAI error:",
      error
    );

    return {
      success: false,
      available: true,
      message:
        error?.message ||
        "حدث خطأ أثناء تشغيل الذكاء الاصطناعي."
    };
  }
}

// =====================================================
// Health Check
// =====================================================

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      status: "online",
      service: "AI OFFICE",
      ai:
        openai
          ? "connected"
          : "not_configured",
      model: AI_MODEL,
      time:
        new Date().toISOString()
    });
  }
);

// =====================================================
// AI TEST
// =====================================================

app.get(
  "/api/ai/status",
  (req, res) => {
    res.json({
      success: true,
      aiConfigured:
        Boolean(openai),
      model:
        AI_MODEL,
      message:
        openai
          ? "AI OFFICE AI متصل وجاهز."
          : "أضف OPENAI_API_KEY في Render."
    });
  }
);

// =====================================================
// لوحة الإحصائيات
// =====================================================

app.get(
  "/api/dashboard",
  (req, res) => {
    const orders = getOrders();

    const revenue =
      orders.reduce(
        (total, order) => {
          return (
            total +
            Number(
              order.price || 0
            )
          );
        },
        0
      );

    const paidOrders =
      orders.filter(
        order =>
          order.paymentStatus ===
          "paid"
      ).length;

    const deliveredOrders =
      orders.filter(
        order =>
          order.status ===
            "delivered" ||
          order.status ===
            "completed"
      ).length;

    const processingOrders =
      orders.filter(
        order =>
          order.status ===
          "processing"
      ).length;

    const newOrders =
      orders.filter(
        order =>
          order.status ===
          "new"
      ).length;

    const reviewOrders =
      orders.filter(
        order =>
          order.status ===
          "review"
      ).length;

    const qualityOrders =
      orders.filter(
        order =>
          order.quality !==
            undefined &&
          order.quality !==
            null &&
          Number(
            order.quality
          ) > 0
      );

    const averageQuality =
      qualityOrders.length >
      0
        ? Math.round(
            qualityOrders.reduce(
              (sum, order) =>
                sum +
                Number(
                  order.quality ||
                    0
                ),
              0
            ) /
              qualityOrders.length
          )
        : 0;

    res.json({
      success: true,
      totalOrders:
        orders.length,
      revenue:
        revenue,
      paidOrders:
        paidOrders,
      deliveredOrders:
        deliveredOrders,
      processingOrders:
        processingOrders,
      newOrders:
        newOrders,
      reviewOrders:
        reviewOrders,
      averageQuality:
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
      ).trim();

    const paymentStatus =
      String(
        req.query.paymentStatus ||
          ""
      ).trim();

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
                order.description
              ]
                .join(" ")
                .toLowerCase();

            return text.includes(
              search
            );
          }
        );
    }

    if (status) {
      orders =
        orders.filter(
          order =>
            order.status ===
            status
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
      count:
        orders.length,
      orders:
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
          String(
            req.params.id
          )
      );

    if (!order) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "الطلب غير موجود"
        });
    }

    res.json({
      success: true,
      order:
        order
    });
  }
);

// =====================================================
// إنشاء طلب جديد + تشغيل AI
// =====================================================

app.post(
  "/api/orders",
  async (req, res) => {
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
      return res
        .status(400)
        .json({
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
        String(
          customerName
        ).trim(),

      customerEmail:
        String(
          customerEmail
        ).trim(),

      service:
        String(
          service
        ).trim(),

      price:
        Number(
          price || 0
        ),

      description:
        String(
          description || ""
        ).trim(),

      status:
        "processing",

      paymentStatus:
        "unpaid",

      quality:
        0,

      aiStatus:
        "processing",

      aiEmployee:
        "Orchestrator AI",

      aiResult:
        "",

      createdAt:
        now,

      updatedAt:
        now
    };

    // حفظ الطلب أولًا
    orders.push(
      newOrder
    );

    saveOrders(
      orders
    );

    // تشغيل الذكاء الاصطناعي
    const aiResult =
      await runOrchestrator(
        newOrder
      );

    const index =
      orders.findIndex(
        order =>
          String(order.id) ===
          String(newOrder.id)
      );

    if (index !== -1) {
      if (
        aiResult.success
      ) {
        orders[index].aiStatus =
          "completed";

        orders[index].aiResult =
          aiResult.result;

        orders[index].aiModel =
          aiResult.model;

        orders[index].status =
          "review";

        orders[index].updatedAt =
          new Date().toISOString();
      } else {
        orders[index].aiStatus =
          "error";

        orders[index].aiError =
          aiResult.message;

        orders[index].status =
          "new";

        orders[index].updatedAt =
          new Date().toISOString();
      }

      saveOrders(
        orders
      );
    }

    const finalOrder =
      orders[index] ||
      newOrder;

    res.status(201).json({
      success: true,

      message:
        aiResult.success
          ? "تم إنشاء الطلب وتنفيذه بواسطة AI OFFICE"
          : "تم إنشاء الطلب، لكن تعذر تشغيل الذكاء الاصطناعي",

      order:
        finalOrder
    });
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
          String(
            req.params.id
          )
      );

    if (index === -1) {
      return res
        .status(404)
        .json({
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
        Number.isNaN(
          quality
        )
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
// إعادة تشغيل AI لطلب موجود
// =====================================================

app.post(
  "/api/orders/:id/run-ai",
  async (req, res) => {
    const orders =
      getOrders();

    const index =
      orders.findIndex(
        order =>
          String(order.id) ===
          String(
            req.params.id
          )
      );

    if (index === -1) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "الطلب غير موجود"
        });
    }

    orders[index].aiStatus =
      "processing";

    orders[index].status =
      "processing";

    saveOrders(
      orders
    );

    const result =
      await runOrchestrator(
        orders[index]
      );

    if (result.success) {
      orders[index].aiStatus =
        "completed";

      orders[index].aiResult =
        result.result;

      orders[index].aiModel =
        result.model;

      orders[index].status =
        "review";

      orders[index].updatedAt =
        new Date().toISOString();
    } else {
      orders[index].aiStatus =
        "error";

      orders[index].aiError =
        result.message;

      orders[index].status =
        "new";

      orders[index].updatedAt =
        new Date().toISOString();
    }

    saveOrders(
      orders
    );

    res.json({
      success:
        result.success,

      message:
        result.success
          ? "تم تشغيل AI بنجاح"
          : result.message,

      order:
        orders[index]
    });
  }
);

// =====================================================
// تغيير حالة الطلب بسرعة
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
      return res
        .status(400)
        .json({
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
          String(
            req.params.id
          )
      );

    if (index === -1) {
      return res
        .status(404)
        .json({
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
      return res
        .status(400)
        .json({
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
          String(
            req.params.id
          )
      );

    if (index === -1) {
      return res
        .status(404)
        .json({
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
      Number.isNaN(
        quality
      )
    ) {
      return res
        .status(400)
        .json({
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
          String(
            req.params.id
          )
      );

    if (index === -1) {
      return res
        .status(404)
        .json({
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
          String(
            req.params.id
          )
      );

    if (index === -1) {
      return res
        .status(404)
        .json({
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
      return res
        .status(400)
        .json({
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
// Express 5
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

    console.log(
      `AI configured: ${Boolean(
        openai
      )}`
    );

    console.log(
      `AI model: ${AI_MODEL}`
    );
  }
);
