package com.carpool.payment.controller;

import com.carpool.payment.dto.ProcessPaymentDTO;
import com.carpool.payment.dto.SubmitRatingDTO;
import com.carpool.payment.model.Payment;
import com.carpool.payment.model.Rating;
import com.carpool.payment.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    
    @Autowired
    private PaymentService paymentService;
    
    @PostMapping("/process")
    public ResponseEntity<?> processPayment(@RequestBody Map<String, Object> payload) {
        try {
            Long rideId = ((Number) payload.get("rideId")).longValue();
            Long riderId = ((Number) payload.get("riderId")).longValue();
            Long driverId = ((Number) payload.get("driverId")).longValue();
            Double amount = ((Number) payload.get("amount")).doubleValue();
            String methodStr = (String) payload.get("method");
            
            // Validate required fields
            if (rideId == null || riderId == null || driverId == null || amount == null || methodStr == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Missing required fields: rideId, riderId, driverId, amount, method"
                ));
            }
            
            // Create DTO manually
            ProcessPaymentDTO dto = new ProcessPaymentDTO();
            dto.setRideId(rideId);
            dto.setRiderId(riderId);
            dto.setDriverId(driverId);
            dto.setAmount(amount);
            
            // Convert string method to enum safely
            try {
                Payment.PaymentMethod method = Payment.PaymentMethod.valueOf(methodStr.toUpperCase());
                dto.setMethod(method);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Invalid payment method: " + methodStr + ". Must be one of: CARD, UPI, WALLET, CASH"
                ));
            }
            
            Payment payment = paymentService.processPayment(dto);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Payment processed successfully",
                "payment", payment
            ));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Invalid number format: " + e.getMessage()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Payment failed: " + e.getMessage()
            ));
        }
    }

    /**
     * Create a payment order (prepare for Razorpay checkout)
     * POST /api/payments/order
     * Creates a PENDING payment record with unique order ID
     */
    @PostMapping("/order")
    public ResponseEntity<?> createPaymentOrder(@RequestBody Map<String, Object> payload) {
        try {
            Long rideId = ((Number) payload.get("rideId")).longValue();
            Long riderId = ((Number) payload.get("riderId")).longValue();
            Long driverId = ((Number) payload.get("driverId")).longValue();
            Double amount = ((Number) payload.get("amount")).doubleValue();
            String description = (String) payload.get("description");
            
            Payment payment = paymentService.createPaymentOrder(
                rideId, riderId, driverId, amount, description
            );
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "orderId", payment.getId().toString(),
                "amount", payment.getAmount(),
                "payment", payment
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Verify Razorpay payment and update status
     * Called after successful Razorpay checkout from frontend
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@RequestBody Map<String, String> payload) {
        try {
            String razorpayOrderId = payload.get("razorpayOrderId");
            String razorpayPaymentId = payload.get("razorpayPaymentId");
            String razorpaySignature = payload.get("razorpaySignature");
            
            Payment payment = paymentService.verifyAndCompletePayment(
                razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature
            );
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Payment verified successfully",
                "payment", payment
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }
    
    @PostMapping("/rating")
    public ResponseEntity<?> submitRating(@RequestBody SubmitRatingDTO dto) {
        try {
            Rating rating = paymentService.submitRating(dto);
            return ResponseEntity.ok(rating);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @GetMapping("/rating/{userId}")
    public ResponseEntity<?> getUserRating(@PathVariable Long userId) {
        try {
            Map<String, Object> rating = paymentService.getUserRating(userId);
            return ResponseEntity.ok(rating);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Get payments for a rider
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getPaymentsForUser(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(paymentService.getPaymentsForRider(userId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Get payments for a driver
    @GetMapping("/driver/{driverId}")
    public ResponseEntity<?> getPaymentsForDriver(@PathVariable Long driverId) {
        try {
            return ResponseEntity.ok(paymentService.getPaymentsForDriver(driverId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}