import React from 'react';

const Pay = ({ id, go }) => {

  const handlePayment = async () => {
    try {
      const response = await fetch("https://ser-hyfd.onrender.com/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 990, // сумма в рублях
          description: "Подписка Арины (1 месяц)",
          return_url: "https://vk.com/app54348330_-234056692?ref=group_menu"
        })
      });

      const data = await response.json();

      if (data.confirmationUrl) {
        // Редирект на страницу оплаты ЮKassa
        window.location.href = data.confirmationUrl;
      } else {
        alert("Ошибка: не получили URL для оплаты");
      }

    } catch (error) {
      console.error("Ошибка при создании платежа:", error);
      alert("Ошибка при создании платежа. Попробуйте позже.");
    }
  };

  return (
    <div id={id} className="panel-container">
      <div className="panel-title">Платёжный экран</div>
      <div className="panel-subtitle">
        Оплатите подписку, чтобы получить доступ к ИИ-ассистенту Арины на 1 месяц.
      </div>

      <button className="button-main" onClick={handlePayment}>
        Оплатить 990 ₽
      </button>

      <button className="button-secondary" onClick={() => go('subscribe')}>
        Назад
      </button>
    </div>
  );
};

export default Pay;
