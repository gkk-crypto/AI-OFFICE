// =====================================================
// AI OFFICE - AI ENGINE
// =====================================================

async function runAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY غير موجود في Render");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      input: prompt
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error: ${errorText}`);
  }

  const data = await response.json();

  return data.output_text || "";
}


// =====================================================
// ORCHESTRATOR AI
// =====================================================

function selectEmployee(service, description) {

  const text = `${service} ${description}`.toLowerCase();

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
أنت موظف ذكاء اصطناعي محترف داخل نظام AI OFFICE.

الموظف المسؤول:
${employee}

الخدمة:
${order.service}

طلب العميل:
${order.description}

المطلوب:
نفذ طلب العميل بشكل احترافي ومباشر.

قواعد مهمة:
- اكتب باللغة العربية.
- لا تذكر أنك نموذج ذكاء اصطناعي.
- لا تشرح طريقة عمل النظام.
- قدم نتيجة جاهزة للتسليم للعميل.
- اجعل النتيجة منظمة واحترافية.
`;

  const result = await runAI(prompt);

  return {
    employee,
    result
  };
}


// =====================================================
// تنفيذ طلب AI يدويًا
// =====================================================

app.post(
  "/api/orders/:id/execute",
  async (req, res) => {

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
          message: "الطلب غير موجود"
        });

      }

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
