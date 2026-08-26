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

// -------------------------
// الإعدادات الأساسية
// -------------------------

app.use(cors());

app.use(express.json({
  limit: "10mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "10mb"
}));

// -------------------------
// رفع الملفات
// -------------------------

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

// -------------------------
// قاعدة البيانات البسيطة
// -------------------------

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
// تشغيل ملفات الموقع
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

      message:
        "AI OFFICE is running",

      time:
        new Date().toISOString()

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

    let orders = getOrders();


    // البحث
    const search =
      String(
        req.query.search || ""
      )
      .trim()
      .toLowerCase();


    // فلترة الحالة
    const status =
      String(
        req.query.status || ""
      )
      .trim();


    // فلترة الدفع
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
                order.description
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

    const orders = getOrders();

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
// إنشاء طلب جديد
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


    // -------------------------
    // الحالة
    // -------------------------

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


    // -------------------------
    // حالة الدفع
    // -------------------------

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


    // -------------------------
    // الجودة
    // -------------------------

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


    // -------------------------
    // الوصف
    // -------------------------

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

  }
);
