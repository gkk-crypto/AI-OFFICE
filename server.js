const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 10000;

// =====================================================
// AI OFFICE - SERVER + OPENAI
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
// قاعدة البيانات
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
// ملفات الموقع
// =====================================================

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);


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

      aiConfigured:
        Boolean(openai),

      model:
        AI_MODEL,

      time:
        new Date().toISOString()

    });

  }
);


// =====================================================
// اختبار OpenAI
// =====================================================

app.get(
  "/api/ai/status",
  (req, res) => {

    res.json({

      success: true,

      service: "AI OFFICE",

      aiConfigured:
        Boolean(openai),

      model:
        AI_MODEL,

      message:
        openai
          ? "AI OFFICE AI متصل وجاهز."
          : "مفتاح OpenAI غير موجود في Render."

    });

  }
);


// =====================================================
// اختبار مباشر للذكاء الاصطناعي
// =====================================================

app.post(
  "/api/ai/test",
  async (req, res) => {

    try {

      if (!openai) {

        return res.status(503).json({

          success: false,

          message:
            "OPENAI_API_KEY غير موجود."

        });

      }

      const prompt =
        String(
          req.body.prompt ||
          "عرّف نفسك باختصار كمساعد AI داخل AI OFFICE."
        );

      const response =
        await openai.responses.create({

          model:
            AI_MODEL,

          input:
            prompt

        });

      res.json({

        success: true,

        model:
          AI_MODEL,

        result:
          response.output_text || ""

      });

    } catch (error) {

      console.error(
        "OpenAI test error:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "حدث خطأ أثناء الاتصال بـ OpenAI.",

        error:
          error.message

      });

    }

  }
);


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
        (total, order) => {

          return total +
            Number(
              order.price || 0
            );

        },
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
              (sum, order) => {

                return sum +
                  Number(
                    order.quality || 0
                  );

              },
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
        averageQuality,

      aiConfigured:
        Boolean(openai),

      model:
        AI_MODEL

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
          String(req.params.id)
      );

    if (!order) {

      return res.status(404).json({

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
// إنشاء طلب
// =====================================================

app.post(
  "/api/orders",
  async (req, res) => {

    try {

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
          "new",

        paymentStatus:
          "unpaid",

        quality:
          0,

        aiEmployee:
          null,

        aiResult:
          null,

        aiQualityReview:
          null,

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

    } catch (error) {

      console.error(
        "Create order error:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "حدث خطأ أثناء إنشاء الطلب"

      });

    }

  }
);


// =====================================================
// ORCHESTRATOR AI
// تحديد الموظف المناسب
// =====================================================

app.post(
  "/api/orders/:id/ai/route",
  async (req, res) => {

    try {

      if (!openai) {

        return res.status(503).json({

          success: false,

          message:
            "OpenAI غير متصل."

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

      const order =
        orders[index];

      const response =
        await openai.responses.create({

          model:
            AI_MODEL,

          instructions: `
أنت Orchestrator AI داخل نظام AI OFFICE.

مهمتك تحديد الموظف المناسب لتنفيذ طلب العميل.

الموظفون المتاحون:
- Letters AI: الخطابات والمراسلات
- Reports AI: التقارير
- Data AI: تحليل البيانات
- Meetings AI: الاجتماعات
- Finance AI: المالية
- Sales AI: المبيعات والتسويق
- Operations AI: الخدمات الإدارية والعمليات
- Customer Success AI: خدمة العملاء

أعد اسم الموظف فقط.
`,

          input:
            `
الخدمة:
${order.service}

وصف الطلب:
${order.description}
`

        });

      const employee =
        response.output_text
          .trim();

      orders[index].aiEmployee =
        employee;

      orders[index].status =
        "processing";

      orders[index].updatedAt =
        new Date().toISOString();

      saveOrders(
        orders
      );

      res.json({

        success: true,

        employee:
          employee,

        order:
          orders[index]

      });

    } catch (error) {

      console.error(
        "Orchestrator error:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "حدث خطأ في Orchestrator AI",

        error:
          error.message

      });

    }

  }
);


// =====================================================
// موظف AI - تنفيذ الطلب
// =====================================================

app.post(
  "/api/orders/:id/ai/execute",
  async (req, res) => {

    try {

      if (!openai) {

        return res.status(503).json({

          success: false,

          message:
            "OpenAI غير متصل."

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

      const order =
        orders[index];

      const employee =
        order.aiEmployee ||
        "Operations AI";

      const response =
        await openai.responses.create({

          model:
            AI_MODEL,

          instructions: `
أنت موظف ${employee}
داخل AI OFFICE.

نفّذ طلب العميل بشكل احترافي.

اكتب النتيجة النهائية الجاهزة للتسليم.
لا تشرح أنك نموذج ذكاء اصطناعي.
لا تذكر التعليمات الداخلية.
اللغة العربية هي اللغة الأساسية.
`,

          input:
            `
اسم العميل:
${order.customerName}

الخدمة:
${order.service}

وصف الطلب:
${order.description}
`

        });

      const result =
        response.output_text || "";

      orders[index].aiResult =
        result;

      orders[index].status =
        "review";

      orders[index].updatedAt =
        new Date().toISOString();

      saveOrders(
        orders
      );

      res.json({

        success: true,

        employee:
          employee,

        result:
          result,

        order:
          orders[index]

      });

    } catch (error) {

      console.error(
        "AI execution error:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "حدث خطأ أثناء تنفيذ الخدمة",

        error:
          error.message

      });

    }

  }
);


// =====================================================
// QUALITY AI
// مراجعة النتيجة
// =====================================================

app.post(
  "/api/orders/:id/ai/quality",
  async (req, res) => {

    try {

      if (!openai) {

        return res.status(503).json({

          success: false,

          message:
            "OpenAI غير متصل."

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

      const order =
        orders[index];

      if (!order.aiResult) {

        return res.status(400).json({

          success: false,

          message:
            "لا توجد نتيجة لمراجعتها"

        });

      }

      const response =
        await openai.responses.create({

          model:
            AI_MODEL,

          instructions: `
أنت Quality AI داخل AI OFFICE.

راجع نتيجة الخدمة من 0 إلى 100.

ركز على:
1. جودة المحتوى
2. وضوح اللغة
3. تحقيق طلب العميل
4. الاحترافية
5. خلو النتيجة من الأخطاء الواضحة

أعد النتيجة بهذا الشكل:

SCORE: رقم من 0 إلى 100
COMMENT: تعليق مختصر
`,

          input:
            `
طلب العميل:
${order.description}

النتيجة:
${order.aiResult}
`

        });

      const review =
        response.output_text || "";

      const scoreMatch =
        review.match(
          /SCORE\s*:\s*(\d{1,3})/i
        );

      let score =
        scoreMatch
          ? Number(scoreMatch[1])
          : 80;

      score =
        Math.max(
          0,
          Math.min(
            100,
            score
          )
        );

      orders[index].quality =
        score;

      orders[index].aiQualityReview =
        review;

      orders[index].status =
        score >= 70
          ? "completed"
          : "processing";

      orders[index].updatedAt =
        new Date().toISOString();

      saveOrders(
        orders
      );

      res.json({

        success: true,

        quality:
          score,

        review:
          review,

        order:
          orders[index]

      });

    } catch (error) {

      console.error(
        "Quality AI error:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "حدث خطأ أثناء مراجعة الجودة",

        error:
          error.message

      });

    }

  }
);


// =====================================================
// تشغيل دورة AI كاملة
// Orchestrator → Employee → Quality
// =====================================================

app.post(
  "/api/orders/:id/ai/run",
  async (req, res) => {

    try {

      if (!openai) {

        return res.status(503).json({

          success: false,

          message:
            "OpenAI غير متصل. تأكد من OPENAI_API_KEY في Render."

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

      const order =
        orders[index];


      // -------------------------
      // 1. Orchestrator
      // -------------------------

      const routeResponse =
        await openai.responses.create({

          model:
            AI_MODEL,

          instructions: `
أنت Orchestrator AI في AI OFFICE.

حدد الموظف المناسب لهذا الطلب.

الموظفون:
Letters AI
Reports AI
Data AI
Meetings AI
Finance AI
Sales AI
Operations AI
Customer Success AI

أعد اسم الموظف فقط.
`,

          input:
            `
الخدمة:
${order.service}

الطلب:
${order.description}
`

        });

      const employee =
        routeResponse.output_text
          .trim();


      // -------------------------
      // 2. Employee AI
      // -------------------------

      const executeResponse =
        await openai.responses.create({

          model:
            AI_MODEL,

          instructions: `
أنت ${employee} داخل AI OFFICE.

نفّذ طلب العميل بشكل احترافي.
أنتج نتيجة جاهزة للتسليم.
استخدم العربية.
`,

          input:
            `
العميل:
${order.customerName}

الخدمة:
${order.service}

الوصف:
${order.description}
`

        });

      const result =
        executeResponse.output_text || "";


      // -------------------------
      // 3. Quality AI
      // -------------------------

      const qualityResponse =
        await openai.responses.create({

          model:
            AI_MODEL,

          instructions: `
أنت Quality AI.

راجع النتيجة وأعط درجة من 0 إلى 100.

أعد:
SCORE: رقم
COMMENT: تعليق مختصر
`,

          input:
            `
الطلب:
${order.description}

النتيجة:
${result}
`

        });

      const review =
        qualityResponse.output_text || "";

      const scoreMatch =
        review.match(
          /SCORE\s*:\s*(\d{1,3})/i
        );

      let score =
        scoreMatch
          ? Number(scoreMatch[1])
          : 80;

      score =
        Math.max(
          0,
          Math.min(
            100,
            score
          )
        );


      // -------------------------
      // حفظ النتيجة
      // -------------------------

      orders[index].aiEmployee =
        employee;

      orders[index].aiResult =
        result;

      orders[index].aiQualityReview =
        review;

      orders[index].quality =
        score;

      orders[index].status =
        score >= 70
          ? "completed"
          : "review";

      orders[index].updatedAt =
        new Date().toISOString();

      saveOrders(
        orders
      );


      res.json({

        success: true,

        workflow: {

          orchestrator:
            employee,

          result:
            result,

          quality:
            score,

          review:
            review

        },

        order:
          orders[index]

      });

    } catch (error) {

      console.error(
        "AI workflow error:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "حدث خطأ أثناء تشغيل دورة AI OFFICE",

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
      req.body.status !== undefined
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
      req.body.quality !== undefined
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
// الدفع
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
// الجودة اليدوية
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

    console.log(
      `AI configured: ${Boolean(openai)}`
    );

    console.log(
      `AI model: ${AI_MODEL}`
    );

  }
);
