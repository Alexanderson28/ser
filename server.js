import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({
  origin: ['https://vk.com', 'https://*.vkapps.ru', 'http://localhost:3000', '*'],
  credentials: true
}));
app.use(express.json());

const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

const RETURN_URL = "https://vk.com/app54348330"; // твой мини-апп ID

// Универсальный платёж: сначала embedded, если не работает — redirect
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description } = req.body;
    const idempotenceKey = Math.random().toString(36).substring(2);

    if (!amount) {
      return res.status(400).json({ error: "Не указана сумма" });
    }

    // 1️⃣ Embedded
    try {
      const embedded = await axios.post(
        "https://api.yookassa.ru/v3/payments",
        {
          amount: { value: Number(amount).toFixed(2), currency: "RUB" },
          capture: true,
          description: description || "Оплата подписки",
          confirmation: { type: "embedded" }
        },
        {
          auth: { username: SHOP_ID, password: SECRET_KEY },
          headers: { "Idempotence-Key": idempotenceKey }
        }
      );

      return res.json({
        type: "embedded",
        paymentId: embedded.data.id,
        confirmation_token: embedded.data.confirmation.confirmation_token
      });
    } catch (e) {
      console.log("Embedded недоступен, переключаемся на redirect");
    }

    // 2️⃣ Redirect
    const redirect = await axios.post(
      "https://api.yookassa.ru/v3/payments",
      {
        amount: { value: Number(amount).toFixed(2), currency: "RUB" },
        capture: true,
        description: description || "Оплата подписки",
        confirmation: {
          type: "redirect",
          return_url: RETURN_URL
        }
      },
      {
        auth: { username: SHOP_ID, password: SECRET_KEY },
        headers: { "Idempotence-Key": idempotenceKey }
      }
    );

    return res.json({
      type: "redirect",
      paymentId: redirect.data.id,
      confirmation_url: redirect.data.confirmation.confirmation_url
    });

  } catch (error) {
    console.error("Ошибка создания платежа:", error.response?.data || error);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Проверка статуса
app.get("/payment-status/:id", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.yookassa.ru/v3/payments/${req.params.id}`,
      {
        auth: { username: SHOP_ID, password: SECRET_KEY }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
