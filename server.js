import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "https://vk.com",
    "https://*.vkapps.ru",
    "https://alexanderson28.github.io",
    "http://localhost:3000",
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Idempotence-Key"],
  credentials: true
}));

app.use(express.json());

const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

// 🔥 Создание платежа (embedded widget)
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description } = req.body;

    const idempotenceKey = Math.random().toString(36).substring(2);

    const response = await axios.post(
      "https://api.yookassa.ru/v3/payments",
      {
        amount: {
          value: Number(amount).toFixed(2),
          currency: "RUB"
        },
        confirmation: {
          type: "embedded"
        },
        capture: true,
        description: description || "Подписка"
      },
      {
        auth: { username: SHOP_ID, password: SECRET_KEY },
        headers: {
          "Content-Type": "application/json",
          "Idempotence-Key": idempotenceKey
        }
      }
    );

    res.json({
      paymentId: response.data.id,
      confirmation_token: response.data.confirmation.confirmation_token,
      amount: response.data.amount.value
    });

  } catch (error) {
    console.error("Ошибка create-payment:", error.response?.data || error.message);
    res.status(500).json({ error: "Ошибка платежа" });
  }
});

// 🔍 Проверка статуса
app.get("/payment-status/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const response = await axios.get(
      `https://api.yookassa.ru/v3/payments/${id}`,
      {
        auth: { username: SHOP_ID, password: SECRET_KEY }
      }
    );

    res.json({ status: response.data.status });

  } catch (error) {
    console.error("Ошибка payment-status:", error.response?.data || error.message);
    res.status(500).json({ error: "Ошибка проверки" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
