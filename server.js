import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Разрешаем запросы с VK Mini Apps
app.use(cors({
  origin: ['https://vk.com', 'https://*.vkapps.ru', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

const SHOP_ID = process.env.YOOKASSA_SHOP_ID;      
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

// Создание платежа
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description } = req.body;

    if (!amount) return res.status(400).json({ error: "Не указана сумма" });

    const idempotenceKey = Math.random().toString(36).substring(2);

    const response = await axios.post(
      "https://api.yookassa.ru/v3/payments",
      {
        amount: { value: Number(amount).toFixed(2), currency: "RUB" },
        capture: true,
        description: description || "Оплата подписки"
        // confirmation убрали, VK Bridge будет открывать форму
      },
      {
        auth: { username: SHOP_ID, password: SECRET_KEY },
        headers: { "Idempotence-Key": idempotenceKey, "Content-Type": "application/json" }
      }
    );

    res.json({
      paymentId: response.data.id,
      amount: response.data.amount.value
    });

  } catch (error) {
    console.error("Ошибка создания платежа full:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Проверка статуса платежа
app.get("/payment-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(`https://api.yookassa.ru/v3/payments/${id}`, {
      auth: { username: SHOP_ID, password: SECRET_KEY }
    });
    res.json(response.data);
  } catch (error) {
    console.error("Ошибка проверки платежа:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
