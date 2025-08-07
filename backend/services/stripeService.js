const Stripe = require("stripe");
const stripeConfig = require("../config/stripeConfig");
const stripe = new Stripe(stripeConfig.secretKey);

const createStripePaymentIntent = async (
  orderId,
  amount,
  currency,
  successUrl,
  cancelUrl
) => {
  try {
    if (amount <= 0) {
      throw new Error("Số tiền thanh toán phải lớn hơn 0");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "paypal", "bancontact"], // Hỗ trợ nhiều phương thức
      line_items: [
        {
          price_data: {
            currency: currency || "usd",
            product_data: {
              name: `Thanh toán đơn hàng #${orderId}`,
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { orderId }, // Lưu thông tin đơn hàng
    });

    return session;
  } catch (error) {
    console.error("Lỗi tạo thanh toán Stripe:", error.message);
    throw new Error("Không thể kết nối đến Stripe");
  }
};

module.exports = { createStripePaymentIntent };
