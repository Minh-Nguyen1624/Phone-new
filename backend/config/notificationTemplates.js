// config/notificationTemplates.js
const notificationTemplates = {
  paymentSuccess: {
    type: "success",
    priority: "high",
    title: "Payment Successful",
    message: ({ amount, orderId }) =>
      `Your payment of ${amount} VND for order ${orderId} was successful.`,
    actionUrl: ({ orderId }) => `/order/${orderId}`,
  },
  paymentFailedOutOfStock: {
    type: "error",
    priority: "high",
    title: "Payment Failed - Out of Stock",
    message: ({ productName, orderId }) =>
      `We are sorry, but the product "${productName}" is out of stock. Please adjust your order.`,
    actionUrl: ({ orderId }) => `/order/${orderId}`,
  },
  newOrderForAdmin: {
    type: "info",
    priority: "medium",
    title: "New Order to Process",
    message: ({ orderId, amount }) =>
      `Order ${orderId} is ready for processing. Payment of ${amount} VND completed.`,
    actionUrl: ({ orderId }) => `/admin/order/${orderId}`,
  },
};

module.exports = notificationTemplates;
