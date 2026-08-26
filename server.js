const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

// ==========================================
// إعدادات أساسية
// ==========================================

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

// ==========================================
// مجلد رفع الملفات
// ==========================================

const uploadDir = "/tmp/ai-office-uploads";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

// ==========================================
// قاعدة البيانات البسيطة
// ==========================================

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

// ==========================================
// قراءة الطلبات
// ==========================================

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

// ==========================================
// حفظ الطلبات
// ==========================================

function saveOrders(orders) {
  try {
    fs.writeFileSync(
      ordersFile,
      JSON.stringify(
        orders,
        null,
        2
      ),
      "utf8"
    );

    return true;
  } catch (error) {
    console.error(
      "Error saving orders:",
      error
    );

    return false;
  }
}

// ==========================================
// تنظيف النصوص
// ==========================================

function cleanText(value) {
  return String(
    value === undefined ||
    value === null
      ? ""
      : value
  ).trim();
}

// ==========================================
// تشغيل ملفات الموقع
// ==========================================

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);

// ==========================================
// فحص حالة النظام
// ==========================================

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      status: "online",
      service: "AI OFFICE",
      message: "AI OFFICE is running",
      time: new Date().toISOString()
    });
  }
);

// ==========================================
// لوحة الإحصائيات
// ==========================================

app.get(
  "/api/dashboard",
  (req, res) => {
    try {
      const orders = getOrders();

      const revenue = orders.reduce(
        (total, order) => {
          return (
            total +
            Number(order.price || 0)
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
                  return (
                    sum +
                    Number(
                      order.quality || 0
                    )
                  );
                },
                0
              ) /
                qualityOrders.length
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
    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "حدث خطأ أثناء تحميل لوحة الإحصائيات"
      });
    }
  }
);

// ==========================================
// جلب جميع الطلبات
// ==========================================

app.get(
  "/api/orders",
  (req, res) => {
    try {
      const orders = getOrders();

      res.json({
        success: true,
        orders: orders
      });
    } catch (error) {
      console.error(
        "Orders error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "تعذر تحميل الطلبات"
      });
    }
  }
);

// ==========================================
// جلب طلب واحد
// ==========================================

app.get(
  "/api/orders/:id",
  (req, res) => {
    const orders = getOrders();

    const order = orders.find(
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
      order: order
    });
  }
);

// ==========================================
// إنشاء طلب جديد
// ==========================================

app.post(
  "/api/orders",
  (req, res) => {
    try {
      const customerName =
        cleanText(
          req.body.customerName
        );

      const customerEmail =
        cleanText(
          req.body.customerEmail
        );

      const service =
        cleanText(
          req.body.service
        );

      const description =
        cleanText(
          req.body.description
        );

      const price =
        Number(
          req.body.price || 0
        );

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

      if (
        Number.isNaN(price) ||
        price < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "السعر غير صحيح"
        });
      }

      const orders = getOrders();

      const now =
        new Date().toISOString();

      const newOrder = {
        id:
          Date.now().toString(),

        customerName:
          customerName,

        customerEmail:
          customerEmail,

        service:
          service,

        price:
          price,

        description:
          description,

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

      const saved =
        saveOrders(orders);

      if (!saved) {
        return res.status(500).json({
          success: false,
          message:
            "تعذر حفظ الطلب"
        });
      }

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

// ==========================================
// تحديث طلب
// ==========================================

app.put(
  "/api/orders/:id",
  (req, res) => {
    try {
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
            req.body[field] !==
            undefined
          ) {
            if (
              field === "quality"
            ) {
              let quality =
                Number(
                  req.body[field]
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
            } else {
              orders[index][field] =
                cleanText(
                  req.body[field]
                );
            }
          }
        }
      );

      orders[index].updatedAt =
        new Date().toISOString();

      const saved =
        saveOrders(orders);

      if (!saved) {
        return res.status(500).json({
          success: false,
          message:
            "تعذر حفظ التحديث"
        });
      }

      res.json({
        success: true,
        message:
          "تم تحديث الطلب بنجاح",
        order:
          orders[index]
      });
    } catch (error) {
      console.error(
        "Update order error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "حدث خطأ أثناء تحديث الطلب"
      });
    }
  }
);

// ==========================================
// حذف طلب
// ==========================================

app.delete(
  "/api/orders/:id",
  (req, res) => {
    try {
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
        orders.splice(
          index,
          1
        )[0];

      const saved =
        saveOrders(orders);

      if (!saved) {
        return res.status(500).json({
          success: false,
          message:
            "تعذر حذف الطلب"
        });
      }

      res.json({
        success: true,
        message:
          "تم حذف الطلب بنجاح",
        order:
          deletedOrder
      });
    } catch (error) {
      console.error(
        "Delete order error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "حدث خطأ أثناء حذف الطلب"
      });
    }
  }
);

// ==========================================
// رفع ملف
// ==========================================

app.post(
  "/api/upload",
  upload.single("file"),
  (req, res) => {
    try {
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
    } catch (error) {
      console.error(
        "Upload error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "حدث خطأ أثناء رفع الملف"
      });
    }
  }
);

// ==========================================
// معالجة أخطاء رفع الملفات
// ==========================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    if (
      error instanceof
      multer.MulterError
    ) {
      return res.status(400).json({
        success: false,
        message:
          "حجم الملف كبير أو حدث خطأ في الرفع"
      });
    }

    if (error) {
      console.error(
        "Server error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "حدث خطأ في الخادم"
      });
    }

    next();
  }
);

// ==========================================
// الصفحة الرئيسية
// متوافق مع Express 5
// ==========================================

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

// ==========================================
// تشغيل الخادم
// ==========================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `AI OFFICE running on port ${PORT}`
    );
  }
);
