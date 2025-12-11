import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ----------------------
// CORS
// ----------------------
app.use(cors({
  origin: [
    "https://vk.com",
    "https://*.vkapps.ru",
    "http://localhost:3000",
    "https://alexanderson28.github.io"
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Idempotence-Key"],
  credentials: true
}));

app.use(express.json());

// ----------------------
// YooKassa credentials
// ----------------------
const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

// ----------------------
// In-memory база подписок
// ----------------------
const subscriptions = {}; // { vk_id: { paymentId, status, endDate } }

// ----------------------
// Создание платежа
// ----------------------
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description, vk_id } = req.body;

    if (!amount || !vk_id) return res.status(400).json({ error: "Не указана сумма или VK ID" });

    const idempotenceKey = Math.random().toString(36).substring(2);

    const response = await axios.post(
      "https://api.yookassa.ru/v3/payments",
      {
        amount: { value: Number(amount).toFixed(2), currency: "RUB" },
        confirmation: { type: "embedded" }, // Для VK Mini Apps
        capture: true,
        description: description || "Оплата подписки"
      },
      {
        auth: { username: SHOP_ID, password: SECRET_KEY },
        headers: {
          "Idempotence-Key": idempotenceKey,
          "Content-Type": "application/json"
        }
      }
    );

    // Сохраняем подписку временно в памяти
    subscriptions[vk_id] = {
      paymentId: response.data.id,
      status: response.data.status,
      endDate: null
    };

    res.json({
      type: "embedded",
      paymentId: response.data.id,
      confirmation_token: response.data.confirmation.confirmation_token,
      amount: response.data.amount.value
    });

  } catch (error) {
    console.error("Ошибка создания платежа:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// ----------------------
// Проверка статуса платежа
// ----------------------
app.get("/payment-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const vk_id = req.query.vk_id;

    if (!vk_id || !subscriptions[vk_id]) return res.status(400).json({ error: "VK ID не найден" });

    const response = await axios.get(
      `https://api.yookassa.ru/v3/payments/${id}`,
      {
        auth: { username: SHOP_ID, password: SECRET_KEY }
      }
    );

    const status = response.data.status;

    // Если платеж успешен и еще не обновляли подписку
    if (status === "succeeded" && !subscriptions[vk_id].endDate) {
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      subscriptions[vk_id].status = "succeeded";
      subscriptions[vk_id].endDate = end.toISOString();
    } else {
      subscriptions[vk_id].status = status;
    }

    res.json({
      status: subscriptions[vk_id].status,
      endDate: subscriptions[vk_id].endDate
    });

  } catch (error) {
    console.error("Ошибка проверки платежа:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
