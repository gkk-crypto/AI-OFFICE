const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

// ===============================
// إعدادات أساسية
// ===============================

app.use(cors());

app.use(express.json({
  limit: "10mb"
}));

app.use(express.urlencoded({
  extended: true
}));

// ===============================
// رفع الملفات
// ===============================

const uploadDir = "/tmp/ai-office-uploads";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}

const upload = multer({
  dest: uploadDir
});

// ===============================
// قاعدة البيانات
// ===============================

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

// ===============================
// قراءة الطلبات
// ===============================

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

// ===============================
// حفظ الطلبات
// ===============================

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

// ===============================
// تشغيل ملفات الموقع
// ===============================

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);

// ===============================
// فحص النظام
// ===============================

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      status: "online",
      service: "AI OFFICE",
      message: "AI OFFICE is running"
    });
  }
);

// ===============================
// لوحة الإحصائيات
// ===============================

app.get(
  "/api/dashboard",
  (req, res) => {

    const orders = getOrders();

    const revenue = orders.reduce(
      (total, order) => {
        return total +
          Number(order.price || 0);
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

    const qualityOrders =
      orders.filter(
        order =>
          order.quality !== undefined &&
          order.quality !== null
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
            ) / qualityOrders.length
          )
        : 0;

    res.json({
      success: true,
      totalOrders: orders.length,
      revenue: revenue,
      paidOrders: paidOrders,
      deliveredOrders: deliveredOrders,
      averageQuality: averageQuality
    });
  }
);

// ===============================
// جلب الطلبات
// ===============================

app.get(
  "/api/orders",
  (req, res) => {

    const orders = getOrders();

    res.json({
      success: true,
      orders: orders
    });
  }
);

// ===============================
// إنشاء طلب جديد
// ===============================

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

    const orders = getOrders();

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

      createdAt:
        now,

      updatedAt:
        now

    };

    orders.push(newOrder);

    saveOrders(orders);

    res.status(201).json({

      success: true,

      message:
        "تم إنشاء الطلب بنجاح",

      order:
        newOrder

    });
  }
);

// ===============================
// تحديث طلب
// ===============================

app.put(
  "/api/orders/:id",
  (req, res) => {

    const orders = getOrders();

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

    const allowedFields = [
      "status",
      "paymentStatus",
      "quality",
      "description"
    ];

    allowedFields.forEach(
      field => {

        if (
          req.body[field] !== undefined
        ) {

          if (field === "quality") {

            let quality =
              Number(
                req.body[field]
              );

            if (Number.isNaN(quality)) {
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

          } else {

            orders[index][field] =
              req.body[field];

          }
        }
      }
    );

    orders[index].updatedAt =
      new Date().toISOString();

    saveOrders(orders);

    res.json({

      success: true,

      message:
        "تم تحديث الطلب بنجاح",

      order:
        orders[index]

    });
  }
);

// ===============================
// حذف طلب
// ===============================

app.delete(
  "/api/orders/:id",
  (req, res) => {

    const orders = getOrders();

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
      orders.splice(index, 1)[0];

    saveOrders(orders);

    res.json({

      success: true,

      message:
        "تم حذف الطلب",

      order:
        deletedOrder

    });
  }
);

// ===============================
// رفع ملف
// ===============================

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

// ===============================
// الصفحة الرئيسية
// متوافق مع Express 5
// ===============================

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

// ===============================
// تشغيل الخادم
// ===============================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `AI OFFICE running on port ${PORT}`
    );

  }
);
