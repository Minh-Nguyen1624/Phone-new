// const axios = require("axios");
// const {
//   PAYPAL_API_URL,
//   clientId,
//   clientSecret,
//   redisClient,
// } = require("../config/paypalConfig");

// // 📌 Hàm lấy Access Token từ PayPal
// const getPayPalAccessToken = async () => {
//   // Kiểm tra token trong Redis
//   const redisKey = "paypal_access_token";
//   const cachedTokenData = await redisClient.get(redisKey);
//   if (cachedTokenData) {
//     const { token, expiration } = JSON.parse(cachedTokenData);
//     if (Date.now() < expiration - 60000) {
//       console.log("✅ Using cached PayPal Access Token from Redis");
//       console.log("✅ PayPal Access Token:", token); // Hiển thị token
//       return token;
//     }
//   }

//   try {
//     const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

//     const response = await axios.post(
//       `${PAYPAL_API_URL}/v1/oauth2/token`,
//       "grant_type=client_credentials",
//       {
//         headers: {
//           Authorization: `Basic ${auth}`,
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//       }
//     );

//     const token = response.data.access_token;
//     const expiration = Date.now() + (response.data.expires_in - 60) * 1000;

//     await redisClient.set(redisKey, JSON.stringify({ token, expiration }), {
//       EX: response.data.expires_in - 60,
//     });

//     console.log(
//       "✅ Fetched new PayPal Access Token and stored in Redis:",
//       token
//     );
//     return token;
//   } catch (error) {
//     console.error(
//       "❌ Lỗi khi lấy Access Token từ PayPal:",
//       error.response?.data || error.message
//     );
//     throw new Error("Không thể lấy Access Token từ PayPal");
//   }
// };

// // 📌 Hàm tạo đơn hàng thanh toán PayPal
// const createPayPalPayment = async (
//   amount,
//   currency,
//   returnUrl,
//   cancelUrl,
//   orderTotal,
//   finalCurrency
// ) => {
//   const accessToken = await getPayPalAccessToken();

//   // Log để xác nhận token đang được sử dụng
//   console.log("✅ Using Access Token in createPayPalPayment:", accessToken);

//   console.log("createPayPalPayment inputs:", {
//     amount,
//     currency,
//     orderTotal,
//     finalCurrency,
//   });

//   if (Math.abs(amount - orderTotal) > 0.01) {
//     throw new Error(
//       `Payment amount (${amount.toFixed(
//         2
//       )} ${currency}) does not match order total (${orderTotal.toFixed(
//         2
//       )} ${currency})`
//     );
//   }

//   try {
//     const response = await axios.post(
//       `${PAYPAL_API_URL}/v2/checkout/orders`,
//       {
//         intent: process.env.PAYPAL_INTENT || "CAPTURE",
//         purchase_units: [
//           {
//             amount: {
//               currency_code: currency,
//               value: amount.toFixed(2),
//             },
//           },
//         ],
//         application_context: {
//           brand_name: process.env.BRAND_NAME || "WebPhone",
//           locale: process.env.PAYPAL_LOCALE || "en-US",
//           return_url: returnUrl,
//           cancel_url: cancelUrl,
//           user_action: "PAY_NOW",
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     console.log("PayPal API Response:", response.data);

//     const transactionId = response.data.id;
//     if (!transactionId) {
//       throw new Error("Transaction ID not found in PayPal response");
//     }

//     const approvalUrl = response.data.links.find(
//       (link) => link.rel === "approve"
//     )?.href;
//     if (!approvalUrl) {
//       throw new Error("Approval URL not found in PayPal response");
//     }

//     return {
//       transactionId,
//       approvalUrl,
//       gatewayResponse: response.data,
//     };
//   } catch (error) {
//     console.error(
//       "❌ Lỗi khi tạo thanh toán PayPal:",
//       error.response?.data || error.message
//     );
//     throw new Error(`Không thể tạo thanh toán PayPal: ${error.message}`);
//   }
// };

// // 📌 Hàm capture đơn hàng PayPal
// const capturePayPalPayment = async (orderID) => {
//   const accessToken = await getPayPalAccessToken();

//   // Log để xác nhận token đang được sử dụng
//   console.log("✅ Using Access Token in capturePayPalPayment:", accessToken);

//   try {
//     const response = await axios.post(
//       `${PAYPAL_API_URL}/v2/checkout/orders/${orderID}/capture`,
//       {},
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     console.log("PayPal Capture Response:", response.data);

//     if (response.data.status !== "COMPLETED") {
//       throw new Error("Failed to capture PayPal order");
//     }

//     return response.data;
//   } catch (error) {
//     console.error(
//       "❌ Lỗi khi capture thanh toán PayPal:",
//       error.response?.data || error.message
//     );
//     throw new Error(`Không thể capture thanh toán PayPal: ${error.message}`);
//   }
// };

// module.exports = {
//   getPayPalAccessToken,
//   createPayPalPayment,
//   capturePayPalPayment,
// };

const axios = require("axios");
const {
  PAYPAL_API_URL,
  clientId,
  clientSecret,
  redisClient,
  isSandbox,
} = require("../config/paypalConfig");

// 📌 Hàm lấy Access Token từ PayPal
const getPayPalAccessToken = async () => {
  const redisKey = "paypal_access_token";
  const environmentKey = `paypal_environment:${isSandbox ? "sandbox" : "live"}`;

  // Kiểm tra môi trường hiện tại so với môi trường đã lưu
  const storedEnvironment = await redisClient.get(environmentKey);
  if (
    storedEnvironment &&
    storedEnvironment !== (isSandbox ? "sandbox" : "live")
  ) {
    await redisClient.del(redisKey);
    console.log("✅ Cleared old PayPal access token due to environment change");
  }

  await redisClient.set(environmentKey, isSandbox ? "sandbox" : "live");

  // Kiểm tra token trong Redis
  const cachedTokenData = await redisClient.get(redisKey);
  if (cachedTokenData) {
    const { token, expiration } = JSON.parse(cachedTokenData);
    if (Date.now() < expiration - 60000) {
      console.log("✅ Using cached PayPal Access Token from Redis");
      console.log("✅ PayPal Access Token:", token);
      return token;
    }
  }

  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await axios.post(
      `${PAYPAL_API_URL}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const token = response.data.access_token;
    const expiration = Date.now() + (response.data.expires_in - 60) * 1000;

    // Lưu token mới vào Redis
    await redisClient.set(redisKey, JSON.stringify({ token, expiration }), {
      EX: response.data.expires_in - 60,
    });

    console.log(
      "✅ Fetched new PayPal Access Token and stored in Redis:",
      token
    );
    return token;
  } catch (error) {
    console.error(
      "❌ Lỗi khi lấy Access Token từ PayPal:",
      error.response?.data || error.message
    );
    throw new Error("Không thể lấy Access Token từ PayPal");
  }
};

// 📌 Hàm tạo đơn hàng thanh toán PayPal
const createPayPalPayment = async (
  amount,
  currency,
  returnUrl,
  cancelUrl,
  orderTotal,
  finalCurrency
) => {
  const accessToken = await getPayPalAccessToken();

  console.log("✅ Using Access Token in createPayPalPayment:", accessToken);

  console.log("createPayPalPayment inputs:", {
    amount,
    currency,
    orderTotal,
    finalCurrency,
  });

  if (Math.abs(amount - orderTotal) > 0.01) {
    throw new Error(
      `Payment amount (${amount.toFixed(
        2
      )} ${currency}) does not match order total (${orderTotal.toFixed(
        2
      )} ${currency})`
    );
  }

  try {
    const response = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders`,
      {
        intent: process.env.PAYPAL_INTENT || "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: process.env.BRAND_NAME || "WebPhone",
          locale: process.env.PAYPAL_LOCALE || "en-US",
          return_url: returnUrl,
          cancel_url: cancelUrl,
          user_action: "PAY_NOW",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("PayPal API Response:", response.data);

    const transactionId = response.data.id;
    if (!transactionId) {
      throw new Error("Transaction ID not found in PayPal response");
    }

    const approvalUrl = response.data.links.find(
      (link) => link.rel === "approve"
    )?.href;
    if (!approvalUrl) {
      throw new Error("Approval URL not found in PayPal response");
    }

    return {
      transactionId,
      approvalUrl,
      gatewayResponse: response.data,
    };
  } catch (error) {
    console.error(
      "❌ Lỗi khi tạo thanh toán PayPal:",
      error.response?.data || error.message
    );
    throw new Error(`Không thể tạo thanh toán PayPal: ${error.message}`);
  }
};

// 📌 Hàm capture đơn hàng PayPal
const capturePayPalPayment = async (orderID) => {
  const accessToken = await getPayPalAccessToken();

  console.log("✅ Using Access Token in capturePayPalPayment:", accessToken);

  try {
    const response = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders/${orderID}/capture`,
      null, // Đảm bảo body là null
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    console.log("PayPal Capture Response:", response.data);

    if (response.data.status !== "COMPLETED") {
      throw new Error("Failed to capture PayPal order");
    }

    return response.data;
  } catch (error) {
    console.error(
      "❌ Lỗi khi capture thanh toán PayPal:",
      error.response?.data || error.message
    );
    throw new Error(`Không thể capture thanh toán PayPal: ${error.message}`);
  }
};

getPayPalAccessToken()
  .then((token) => {
    console.log("✅ PayPal Access Token:", token);
  })
  .catch((error) => {
    console.error("❌ Lỗi khi lấy PayPal Access Token:", error.message);
  });

module.exports = {
  getPayPalAccessToken,
  createPayPalPayment,
  capturePayPalPayment,
};
