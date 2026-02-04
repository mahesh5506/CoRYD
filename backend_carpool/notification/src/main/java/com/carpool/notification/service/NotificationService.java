package com.carpool.notification.service;

import com.carpool.notification.dto.SendNotificationDTO;
import com.carpool.notification.model.Notification;
import com.carpool.notification.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {
    
    @Autowired
    private NotificationRepository notificationRepository;
    
    // Send notification to user
    public Notification sendNotification(SendNotificationDTO dto) {
        Notification notification = new Notification();
        notification.setUserId(dto.getUserId());
        notification.setMessage(dto.getMessage());
        notification.setType(dto.getType());
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());
        
        Notification saved = notificationRepository.save(notification);
        
        // In production: Send push notification, SMS, email etc.
        System.out.println(" NOTIFICATION SENT to User " + dto.getUserId() + ": " + dto.getMessage());
        
        return saved;
    }
    
    // Get all notifications for a user
    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
    
    // Get unread notifications
    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalse(userId);
    }
    
    // Mark notification as read
    public Notification markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        notification.setRead(true);
        return notificationRepository.save(notification);
    }
}