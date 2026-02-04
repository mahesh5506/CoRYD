package com.carpool.payment.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

/**
 * Utility class for Razorpay payment verification
 * Verifies signatures from Razorpay webhooks/callbacks
 */
public class RazorpayVerificationUtil {
    
    // Razorpay Key Secret (in production, store in environment variables)
    private static final String RAZORPAY_KEY_SECRET = "test_secret"; // TODO: Move to application.properties
    
    /**
     * Verify Razorpay payment signature
     * 
     * @param razorpayOrderId - Order ID from Razorpay
     * @param razorpayPaymentId - Payment ID from Razorpay
     * @param signature - Signature from Razorpay
     * @return true if signature is valid
     */
    public static boolean verifyRazorpaySignature(
            String razorpayOrderId,
            String razorpayPaymentId,
            String signature) {
        
        try {
            // Construct the string to verify: orderId|paymentId
            String payload = razorpayOrderId + "|" + razorpayPaymentId;
            
            // Generate HMAC-SHA256
            String expectedSignature = generateHMAC(payload, RAZORPAY_KEY_SECRET);
            
            // Compare with provided signature
            return signature.equals(expectedSignature);
            
        } catch (Exception e) {
            System.err.println(" Signature verification failed: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * Generate HMAC-SHA256 hash
     */
    private static String generateHMAC(String message, String secret)
            throws NoSuchAlgorithmException, InvalidKeyException {
        
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(
            secret.getBytes(StandardCharsets.UTF_8),
            0,
            secret.getBytes(StandardCharsets.UTF_8).length,
            "HmacSHA256"
        );
        mac.init(secretKey);
        
        byte[] hash = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
        
        // Convert bytes to hex string
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        
        return hexString.toString();
    }
    
    /**
     * Set Razorpay Key Secret (for configuration)
     * In production, this should be injected from properties
     */
    public static void setRazorpayKeySecret(String keySecret) {
        // Note: This would need to be refactored to use a static field
        // For now, we'll hardcode, but in production use @Value("${razorpay.key.secret}")
    }
}
