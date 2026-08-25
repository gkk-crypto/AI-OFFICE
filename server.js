const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({
  dest: "/tmp/ai-office-uploads"
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "AI OFFICE",
    message: "AI OFFICE is running"
  });
});

app.post("/api/upload", upload.single("file"), (req, res) => {
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
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI OFFICE running on port ${PORT}`);
});
