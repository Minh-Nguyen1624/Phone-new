const Payment = require("../model/Payment");
const paypalService = require("../services/paypalService");
const momoService = require("../services/momoService");
const zalopayService = require("../services/zalopayService");
const stripeService = require("../services/stripeService");

const handleWebhook = async (req, res) => {
  const { provider, event } = req.body;

  try {
    switch (provider) {
      case "paypal":
        await paypalService.handleWebhook(event);
        break;
      case "momo":
        await momoService.handleWebhook(event);
        break;
      case "zalopay":
        await zalopayService.handleWebhook(event);
        break;
      case "stripe":
        await stripeService.handleWebhook(event);
        break;
      default:
        console.log(`Không hỗ trợ webhook cho provider: ${provider}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { handleWebhook };
