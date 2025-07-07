// require("dotenv").config();

// const zalopayConfig = {
//     appId: process.env.ZALOPAY_APP_ID,
//     key1: process.env.ZALOPAY_KEY1,
//     key2: process.env.ZALOPAY_KEY2,
//     // endpoint: process.env.ZALOPAY_MODE === 'real' 
//     // ? process.env.ZALOPAY_ENDPOINT_REAL
//     // : process.env.ZALOPAY_ENDPOINT_SANDBOX,
//     endpoint: process.env.ZALOPAY_ENDPOINT_SANDBOX,
// };

// console.log("ZaloPay Config: ", zalopayConfig);
// module.exports = zalopayConfig;
require("dotenv").config();

const zalopayConfig = {
    appId: process.env.ZALOPAY_APP_ID || "2553",
    key1: process.env.ZALOPAY_KEY1 || "sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn",
    key2: process.env.ZALOPAY_KEY2 || "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf",
    endpoint: process.env.ZALOPAY_MODE === "real"
        ? process.env.ZALOPAY_ENDPOINT_REAL || "https://openapi.zalopay.vn/v2/create"
        : process.env.ZALOPAY_ENDPOINT_SANDBOX || "https://sb-openapi.zalopay.vn/v2/create",
    bankCode: process.env.ZALOPAY_BANK_CODE || "", // Để trống nếu không cần chỉ định ngân hàng
};

console.log("ZaloPay Config: ", zalopayConfig);
module.exports = zalopayConfig;