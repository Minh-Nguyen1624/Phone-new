const { convertVNDToUSD } = require("./currencyConverter");

const convertOrderToUSD = async (order) => {
  const convertedOrder = { ...order.toObject() };

  // Tính lại subTotal từ item.originalPrice
  const subTotal = convertedOrder.items.reduce(
    (total, item) => total + item.originalPrice * item.quantity,
    0
  );
  convertedOrder.subTotal = await convertVNDToUSD(subTotal);
  console.log(
    `Converted subTotal: ${subTotal} VND to ${convertedOrder.subTotal} USD`
  );

  // Chuyển đổi shippingFee
  convertedOrder.shippingFee = await convertVNDToUSD(order.shippingFee || 0);
  console.log(
    `Converted shippingFee: ${order.shippingFee} VND to ${convertedOrder.shippingFee} USD`
  );

  // Chuyển đổi discountAmount
  convertedOrder.discountAmount = await convertVNDToUSD(
    order.discountAmount || 0
  );
  console.log(
    `Converted discountAmount: ${order.discountAmount} VND to ${convertedOrder.discountAmount} USD`
  );

  // Tính lại totalAmount từ các giá trị đã chuyển đổi
  convertedOrder.totalAmount =
    convertedOrder.subTotal -
    (convertedOrder.discountAmount || 0) +
    (convertedOrder.shippingFee || 0);
  console.log(`Calculated totalAmount: ${convertedOrder.totalAmount} USD`);

  // Chuyển đổi giá của từng item
  convertedOrder.items = await Promise.all(
    convertedOrder.items.map(async (item) => {
      const convertedOriginalPrice = await convertVNDToUSD(item.originalPrice);
      const convertedPrice = await convertVNDToUSD(item.price);
      console.log(
        `Converted item originalPrice: ${item.originalPrice} VND to ${convertedOriginalPrice} USD`
      );
      console.log(
        `Converted item price: ${item.price} VND to ${convertedPrice} USD`
      );
      return {
        ...item,
        originalPrice: convertedOriginalPrice,
        price: convertedPrice,
        currency: "USD",
      };
    })
  );

  // Cập nhật currency của đơn hàng
  convertedOrder.currency = "USD";

  console.log("Converted order:", convertedOrder);
  return convertedOrder;
};

module.exports = { convertOrderToUSD };
