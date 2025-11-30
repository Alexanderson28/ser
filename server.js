import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// ЮKassa credentials from Render Environment
const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

// Create payment
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description, return_url } = req.body;

    if (!amount || !return_url) {
      return res.status(400).json({ error: "Не указаны обязательные параметры" });
    }

    const idempotenceKey = Math.random().toString(36).substring(2);

    const response = await axios.post(
      "https://api.yookassa.ru/v3/payments",
      {
        amount: {
          value: Number(amount).toFixed(2),
          currency: "RUB"
        },
        confirmation: {
          type: "redirect",
          return_url
        },
        capture: true,
        description: description || "Оплата подписки"
      },
      {
        auth: {
          username: SHOP_ID,
          password: SECRET_KEY
        },
        headers: {
          "Idempotence-Key": idempotenceKey,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      confirmationUrl: response.data.confirmation.confirmation_url,
      paymentId: response.data.id
    });

  } catch (error) {
    console.error("ЮKassa error:", error.response?.data || error.message);
    res.status(500).json({ error: "Ошибка создания платежа" });
  }
});

// Check payment status
app.get("/payment-status/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const response = await axios.get(
      `https://api.yookassa.ru/v3/payments/${id}`,
      {
        auth: {
          username: SHOP_ID,
          password: SECRET_KEY
        }
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error("Статус платежа ошибка:", error.response?.data || error.message);
    res.status(500).json({ error: "Ошибка проверки платежа" });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
