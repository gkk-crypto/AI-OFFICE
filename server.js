const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = "/tmp/ai-office-uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

const dataDir = path.join(__dirname, "data");
const ordersFile = path.join(dataDir, "orders.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(ordersFile)) {
  fs.writeFileSync(ordersFile, "[]", "utf8");
}

function getOrders() {
  try {
    return JSON.parse(fs.readFileSync(ordersFile, "utf8"));
  } catch {
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

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "online",
    service: "AI OFFICE"
  });
});

app.get("/api/dashboard", (req, res) => {
  const orders = getOrders();

  const revenue = orders.reduce(
    (total, order) => total + Number(order.price || 0),
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

  const qualityOrders = orders.filter(
    order => Number(order.quality) > 0
  );

  const averageQuality =
    qualityOrders.length > 0
      ? Math.round(
          qualityOrders.reduce(
            (total, order) =>
              total + Number(order.quality || 0),
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
    averageQuality
  });
});

app.post("/api/orders", (req, res) => {
  const {
    customerName,
    customerEmail,
    service,
    price,
    description
  } = req.body;

  if (!customerName || !customerEmail || !service) {
    return res.status(400).json({
      success: false,
      message: "يرجى تعبئة البيانات المطلوبة"
    });
  }

  const orders = getOrders();

  const order = {
    id: Date.now().toString(),
    customerName,
    customerEmail,
    service,
    price: Number(price || 0),
    description: description || "",
    status: "new",
    paymentStatus: "unpaid",
    quality: 0,
    createdAt: new Date().toISOString()
  };

  orders.push(order);
  saveOrders(orders);

  res.status(201).json({
    success: true,
    message: "تم إنشاء الطلب بنجاح",
    order
  });
});

app.get("/api/orders", (req, res) => {
  res.json({
    success: true,
    orders: getOrders()
  });
});

app.get("/api/orders/:id", (req, res) => {
  const order = getOrders().find(
    item => item.id === req.params.id
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

app.patch("/api/orders/:id", (req, res) => {
  const orders = getOrders();

  const index = orders.findIndex(
    item => item.id === req.params.id
  );

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "الطلب غير موجود"
    });
  }

  if (req.body.status !== undefined) {
    orders[index].status = req.body.status;
  }

  if (req.body.paymentStatus !== undefined) {
    orders[index].paymentStatus = req.body.paymentStatus;
  }

  if (req.body.quality !== undefined) {
    orders[index].quality = Number(req.body.quality);
  }

  orders[index].updatedAt = new Date().toISOString();

  saveOrders(orders);

  res.json({
    success: true,
    message: "تم تحديث الطلب",
    order: orders[index]
  });
});

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
        originalName: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      }
    });
  }
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI OFFICE running on port ${PORT}`);
});
