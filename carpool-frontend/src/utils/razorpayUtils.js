/**
 * Razorpay Payment Integration Utility
 * Handles payment processing through Razorpay
 */

import axios from "axios";
import { API_BASE_URL } from "./constants";

// Razorpay Key ID (should be in environment variables in production)
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_YOUR_KEY_ID";

/**
 * Load Razorpay script dynamically
 * @returns {Promise<boolean>} True if script loaded successfully
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }


    
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Verify payment with backend
 * Called after successful Razorpay checkout
 * @param {Object} paymentData - Payment response from Razorpay
 * @returns {Promise<Object>} Backend verification response
 */
export const verifyPaymentWithBackend = async (paymentData) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `${API_BASE_URL}/payments/verify`,
      {
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("✅ Payment verified successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Payment verification failed:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.message || "Payment verification failed"
    );
  }
};

/**
 * Initiate Razorpay payment
 * @param {Object} options - Payment options
 * @param {string} options.orderId - Order/Payment ID from backend
 * @param {number} options.amount - Amount in paise (100 paise = 1 rupee)
 * @param {string} options.currency - Currency code (default: INR)
 * @param {string} options.description - Payment description
 * @param {string} options.passengerName - Passenger name
 * @param {string} options.passengerEmail - Passenger email
 * @param {string} options.passengerPhone - Passenger phone
 * @param {Function} options.onSuccess - Callback on successful payment
 * @param {Function} options.onError - Callback on payment error
 */
export const initiatePayment = async ({
  orderId,
  amount,
  currency = "INR",
  description,
  passengerName,
  passengerEmail,
  passengerPhone,
  onSuccess,
  onError,
}) => {
  try {
    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded) {
      onError?.("Failed to load payment gateway. Please try again.");
      return;
    }

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: amount, // Amount in paise
      currency: currency,
      name: "CoRYD",
      description: description,
      order_id: orderId,
      prefill: {
        name: passengerName,
        email: passengerEmail,
        contact: passengerPhone,
      },
      theme: {
        color: "#0066cc",
      },
      handler: async function (response) {
        try {
          // Verify payment with backend
          const verificationResult = await verifyPaymentWithBackend(response);

          if (verificationResult.success) {
            console.log("✅ Payment successful and verified");
            onSuccess?.(verificationResult);
          } else {
            console.error("❌ Payment verification failed");
            onError?.(
              verificationResult.message || "Payment verification failed"
            );
          }
        } catch (error) {
          console.error("❌ Error during payment verification:", error);
          onError?.(error.message);
        }
      },
      modal: {
        ondismiss: function () {
          onError?.("Payment cancelled by user");
        },
      },
    };

    const rzp1 = new window.Razorpay(options);
    rzp1.open();

    rzp1.on("payment.failed", function (response) {
      onError?.(response.error.description);
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    onError?.(error.message || "An error occurred while processing payment");
  }
};

/**
 * Format amount from rupees to paise for Razorpay
 * @param {number} amountInRupees - Amount in rupees
 * @returns {number} Amount in paise
 */
export const convertToPaise = (amountInRupees) => {
  return Math.round(amountInRupees * 100);
};

/**
 * Format amount from paise to rupees for display
 * @param {number} amountInPaise - Amount in paise
 * @returns {number} Amount in rupees
 */
export const convertToRupees = (amountInPaise) => {
  return (amountInPaise / 100).toFixed(2);
};
