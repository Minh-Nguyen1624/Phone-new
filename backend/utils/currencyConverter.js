// currencyConverter.js
const EXCHANGE_RATE_VND_TO_USD = 0.00004;

const convertVNDToUSD = async (amountInVND) => {
  if (typeof amountInVND !== "number" || isNaN(amountInVND)) {
    throw new Error("Amount must be a valid number");
  }
  const amountInUSD = Number(
    (amountInVND * EXCHANGE_RATE_VND_TO_USD).toFixed(2)
  );
  // console.log(`Converted ${amountInVND} VND to ${amountInUSD} USD`);
  return amountInUSD;
};

module.exports = { convertVNDToUSD };
