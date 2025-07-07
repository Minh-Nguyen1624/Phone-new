require("dotenv").config();

const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY
};

module.exports = stripeConfig;
