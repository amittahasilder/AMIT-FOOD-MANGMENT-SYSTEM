
const isLive = process.env.SSLCOMMERZ_IS_LIVE === "true";

export const getPaymentConfig = () => {
  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
  const backendUrl = process.env.BACKEND_URL;
  const clientUrl = process.env.CLIENT_URL;

  if (!storeId || !storePassword || !backendUrl || !clientUrl) {
    throw new Error("SSLCommerz environment variables are missing");
  }

  return {
    storeId,
    storePassword,
    isLive,

    sessionUrl: isLive
      ? "https://securepay.sslcommerz.com/gwprocess/v4/api.php"
      : "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",

    validationUrl: isLive
      ? "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php"
      : "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php",

    successUrl: `${backendUrl}/api/payments/success`,
    failUrl: `${backendUrl}/api/payments/fail`,
    cancelUrl: `${backendUrl}/api/payments/cancel`,
    ipnUrl: `${backendUrl}/api/payments/ipn`,

    clientUrl,
  };
};
