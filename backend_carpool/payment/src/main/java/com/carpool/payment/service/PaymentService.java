package com.carpool.payment.service;

import com.carpool.payment.dto.ProcessPaymentDTO;
import com.carpool.payment.dto.SubmitRatingDTO;
import com.carpool.payment.model.Payment;
import com.carpool.payment.model.Rating;
import com.carpool.payment.repository.PaymentRepository;
import com.carpool.payment.repository.RatingRepository;
import com.carpool.payment.util.RazorpayVerificationUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {
    
    @Autowired
    private PaymentRepository paymentRepository;
    
    @Autowired
    private RatingRepository ratingRepository;
    
    @Autowired
    private RestTemplate restTemplate;
    
    // Process payment
    public Payment processPayment(ProcessPaymentDTO dto) {
        try {
            Payment payment = new Payment();
            payment.setRideId(dto.getRideId());
            payment.setRiderId(dto.getRiderId());
            payment.setDriverId(dto.getDriverId());
            payment.setAmount(dto.getAmount());
            payment.setMethod(dto.getMethod());
            payment.setStatus(Payment.PaymentStatus.COMPLETED);
            payment.setCreatedAt(LocalDateTime.now());
            payment.setCompletedAt(LocalDateTime.now());
            payment.setTransactionId("txn_" + UUID.randomUUID().toString());
            
            System.out.println("Payment processed: " + dto.getAmount() + " for Ride " + dto.getRideId());
            
            return paymentRepository.save(payment);
        } catch (Exception e) {
            System.out.println(" Payment processing failed: " + e.getMessage());
            throw new RuntimeException("Payment processing failed: " + e.getMessage());
        }
    }

    /**
     * Create a payment order for Razorpay checkout
     * Generates a unique order ID and stores payment in PENDING state
     */
    public Payment createPaymentOrder(
            Long rideId,
            Long riderId,
            Long driverId,
            Double amount,
            String description) {
        
        System.out.println(" Creating payment order - Ride: " + rideId + ", Amount: " + amount);
        
        Payment payment = new Payment();
        payment.setRideId(rideId);
        payment.setRiderId(riderId);
        payment.setDriverId(driverId);
        payment.setAmount(amount);
        payment.setMethod(Payment.PaymentMethod.UPI);
        payment.setStatus(Payment.PaymentStatus.PENDING);
        payment.setCreatedAt(LocalDateTime.now());
        
        // Save initially to get ID (which acts as order ID)
        payment = paymentRepository.save(payment);
        
        // Use the saved ID as Razorpay order ID
        payment.setRazorpayOrderId("order_" + payment.getId());
        payment = paymentRepository.save(payment);
        
        System.out.println(" Payment order created with ID: " + payment.getRazorpayOrderId());
        
        return payment;
    }

    /**
     * Verify Razorpay signature and mark payment as COMPLETED
     * @param razorpayOrderId Order ID from Razorpay
     * @param razorpayPaymentId Payment ID from Razorpay  
     * @param razorpaySignature Signature from Razorpay
     * @return Updated Payment object
     */
    public Payment verifyAndCompletePayment(
            String razorpayOrderId,
            String razorpayPaymentId,
            String razorpaySignature) {
        
        // Verify Razorpay signature
        boolean isValid = RazorpayVerificationUtil.verifyRazorpaySignature(
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        );
        
        if (!isValid) {
            throw new RuntimeException("Invalid Razorpay signature");
        }
        
        // Find payment by Razorpay Order ID
        List<Payment> allPayments = paymentRepository.findAll();
        Payment payment = allPayments.stream()
            .filter(p -> razorpayOrderId.equals(p.getRazorpayOrderId()))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Payment not found for order: " + razorpayOrderId));
        
        // Update payment with Razorpay details
        payment.setRazorpayPaymentId(razorpayPaymentId);
        payment.setRazorpaySignature(razorpaySignature);
        payment.setStatus(Payment.PaymentStatus.COMPLETED);
        payment.setCompletedAt(LocalDateTime.now());
        payment.setTransactionId(razorpayPaymentId);
        
        System.out.println(" Payment verified and completed: " + razorpayPaymentId);
        
        // Notify user
        notifyPaymentSuccess(payment.getRiderId());
        
        return paymentRepository.save(payment);
    }
    
    // Notify payment success
    private void notifyPaymentSuccess(Long userId) {
        String notificationServiceUrl = "http://localhost:8084/api/notifications/send";
        
        Map<String, Object> notification = new HashMap<>();
        notification.put("userId", userId);
        notification.put("message", "Payment successful! Thank you for using our service.");
        notification.put("type", "PAYMENT_RECEIVED");
        
        new Thread(() -> {
            try {
                restTemplate.postForObject(notificationServiceUrl, notification, Map.class);
            } catch (Exception e) {
                System.out.println("Notification service unavailable");
            }
        }).start();
    }
    
    // Submit rating
    public Rating submitRating(SubmitRatingDTO dto) {
        if (dto.getStars() < 1 || dto.getStars() > 5) {
            throw new RuntimeException("Rating must be between 1 and 5");
        }
        
        Rating rating = new Rating();
        rating.setRideId(dto.getRideId());
        rating.setFromUserId(dto.getFromUserId());
        rating.setToUserId(dto.getToUserId());
        rating.setType(dto.getType());
        rating.setStars(dto.getStars());
        rating.setComment(dto.getComment());
        rating.setCreatedAt(LocalDateTime.now());
        
        Rating savedRating = ratingRepository.save(rating);
        
        // Sync with User Service
        updateUserRatingInProfile(dto.getToUserId());
        
        return savedRating;
    }
    
    // Update User Profile Rating
    private void updateUserRatingInProfile(Long userId) {
        try {
            Double avg = ratingRepository.getAverageRating(userId);
            if (avg == null) avg = 0.0;
            
            // Count total ratings
            List<Rating> ratings = ratingRepository.findByToUserId(userId);
            int count = ratings.size();
            
            String url = "http://localhost:8081/api/users/" + userId + "/rating";
            Map<String, Object> payload = new HashMap<>();
            payload.put("rating", avg);
            payload.put("count", count);
            
            System.out.println(" Syncing rating with User Service: " + url + " Payload: " + payload);
            
            // Use exchange to get response
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            org.springframework.http.HttpEntity<Map<String, Object>> entity = new org.springframework.http.HttpEntity<>(payload, headers);
            
            org.springframework.http.ResponseEntity<String> response = restTemplate.exchange(
                url, 
                org.springframework.http.HttpMethod.PUT, 
                entity, 
                String.class
            );
            
            if (response.getStatusCode().is2xxSuccessful()) {
                System.out.println(" Updated User Profile Rating: " + avg + " (" + count + ")");
            } else {
                System.err.println(" Failed to update User Profile Rating. Status: " + response.getStatusCode());
            }

        } catch (Exception e) {
            System.err.println(" Failed to update User Profile Rating: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    // Get user's average rating
    public Map<String, Object> getUserRating(Long userId) {
        Double avgRating = ratingRepository.getAverageRating(userId);
        List<Rating> ratings = ratingRepository.findByToUserId(userId);
        
        Map<String, Object> result = new HashMap<>();
        result.put("averageRating", avgRating != null ? avgRating : 0.0);
        result.put("totalRatings", ratings.size());
        result.put("ratings", ratings);
        
        return result;
    }

    // Get payments for a rider
    public List<Payment> getPaymentsForRider(Long riderId) {
        return paymentRepository.findByRiderId(riderId);
    }

    /**
     * Get COMPLETED payments for a driver (earnings)
     * Only return COMPLETED status payments so earnings are accurate
     */
    public List<Payment> getPaymentsForDriver(Long driverId) {
        // Get all COMPLETED payments for this driver
        List<Payment> payments = paymentRepository.findByDriverId(driverId);
        
        // Filter only COMPLETED payments
        payments = payments.stream()
            .filter(p -> p.getStatus() == Payment.PaymentStatus.COMPLETED)
            .toList();
        
        System.out.println(" Driver " + driverId + " earnings from " + payments.size() + " completed payments");
        
        return payments;
    }
}
