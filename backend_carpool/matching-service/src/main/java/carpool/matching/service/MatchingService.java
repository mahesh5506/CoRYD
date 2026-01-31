package carpool.matching.service;

import carpool.matching.dto.MatchRequestDTO;
import carpool.matching.entity.Match;
import carpool.matching.repository.MatchRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class MatchingService {
    
    @Autowired
    private MatchRepository matchRepository;
    
    @Autowired
    private RestTemplate restTemplate;
    
    // NEW: Inject LocationService for distance-based matching
    @Autowired
    private LocationService locationService;
    
    /**
     * Find matching ride for a ride request using intelligent distance-based algorithm
     */
    public Match findMatch(MatchRequestDTO dto) {
        try {
            // Get all active rides from Ride Service
            String rideServiceUrl = "http://localhost:8082/api/rides/active";
            
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                rideServiceUrl,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            
            List<Map<String, Object>> activeRides = response.getBody();
            
            if (activeRides == null || activeRides.isEmpty()) {
                throw new RuntimeException("No active rides available");
            }
            
            System.out.println("🔍 Found " + activeRides.size() + " active rides. Searching for best match...");
            
            // NEW: Find best match using distance-based algorithm
            Map<String, Object> bestMatch = findBestMatchByDistance(dto, activeRides);
            
            if (bestMatch != null) {
                // Create match record
                Match match = createMatchRecord(dto, bestMatch);
                                // Update the RideRequest in Ride Service to set matchedRideId
                try {
                    String rideServiceSetMatchUrl = "http://localhost:8082/api/rides/request/" + dto.getRequestId() + "/set-matched/" + getLongValue(bestMatch.get("id"));
                    restTemplate.put(rideServiceSetMatchUrl, null);
                    System.out.println("🔁 Notified ride-service to set matchedRideId for request " + dto.getRequestId());
                } catch (Exception e) {
                    System.err.println("⚠️ Failed to update RideRequest matchedRideId: " + e.getMessage());
                }
                // Notify driver via Notification Service
                notifyDriver(match);
                
                return match;
            }
            
            throw new RuntimeException("No suitable rides found within acceptable distance");
            
        } catch (Exception e) {
            System.err.println("❌ Matching failed: " + e.getMessage());
            throw new RuntimeException("Matching failed: " + e.getMessage());
        }
    }
    
    /**
     * NEW: Find best matching ride based on distance and scoring
     */
    private Map<String, Object> findBestMatchByDistance(MatchRequestDTO dto, List<Map<String, Object>> rides) {
        Map<String, Object> bestRide = null;
        int highestScore = 0;
        
        String riderPickup = dto.getPickupLocation();
        String riderDrop = dto.getDropLocation();
        
        for (Map<String, Object> ride : rides) {
            String driverPickup = (String) ride.get("pickupLocation");
            String driverDrop = (String) ride.get("dropLocation");
            Integer availableSeats = (Integer) ride.get("availableSeats");
            
            // Check if seats available
            if (availableSeats == null || availableSeats <= 0) {
                continue;
            }
            
            System.out.println("\n🚗 Checking ride #" + ride.get("id") + 
                             " (" + driverPickup + " → " + driverDrop + ")");
            
            // NEW: Use LocationService to check if route matches
            boolean routeMatches = locationService.isCompleteRouteMatch(
                riderPickup, riderDrop, 
                driverPickup, driverDrop
            );
            
            if (routeMatches) {
                // Calculate matching score
                int score = locationService.calculateMatchingScore(
                    riderPickup, riderDrop,
                    driverPickup, driverDrop
                );
                
                System.out.println("✅ Route matches! Score: " + score);
                
                // Keep track of best match (highest score)
                if (score > highestScore) {
                    highestScore = score;
                    bestRide = ride;
                }
            } else {
                System.out.println("❌ Route doesn't match (outside radius)");
            }
        }
        
        if (bestRide != null) {
            System.out.println("\n🎯 Best match found: Ride #" + bestRide.get("id") + 
                             " with score " + highestScore + "/100");
        }
        
        return bestRide;
    }
    
    /**
     * Create match record in database
     */
    private Match createMatchRecord(MatchRequestDTO dto, Map<String, Object> ride) {
        Match match = new Match();
        match.setRideRequestId(dto.getRequestId());
        match.setRideId(getLongValue(ride.get("id")));
        match.setDriverId(getLongValue(ride.get("driverId")));
        match.setStatus(Match.MatchStatus.MATCHED);
        match.setMatchedAt(LocalDateTime.now());
        
        return matchRepository.save(match);
    }
    
    /**
     * Helper method to safely convert Object to Long
     */
    private Long getLongValue(Object value) {
        if (value instanceof Integer) {
            return ((Integer) value).longValue();
        } else if (value instanceof Long) {
            return (Long) value;
        }
        return null;
    }
    
    /**
     * Notify driver about match via Notification Service
     */
    private void notifyDriver(Match match) {
        String notificationServiceUrl = "http://localhost:8084/api/notifications/send";
        
        Map<String, Object> notification = new HashMap<>();
        notification.put("userId", match.getDriverId());
        notification.put("message", "🚗 New rider matched to your ride! Request ID: " + match.getRideRequestId());
        notification.put("type", "MATCH_FOUND");
        
        // Async notification
        new Thread(() -> {
            try {
                restTemplate.postForObject(notificationServiceUrl, notification, Map.class);
                System.out.println("📢 Notification sent to driver #" + match.getDriverId());
            } catch (Exception e) {
                System.err.println("⚠️ Notification service unavailable: " + e.getMessage());
            }
        }).start();
    }
    
    /**
     * Accept match
     */
    public Match acceptMatch(Long matchId) {
        Match match = matchRepository.findById(matchId)
            .orElseThrow(() -> new RuntimeException("Match not found"));
        
        match.setStatus(Match.MatchStatus.ACCEPTED);
        return matchRepository.save(match);
    }
    
    /**
     * Get matches for a driver
     */
    public List<Match> getDriverMatches(Long driverId) {
        return matchRepository.findByDriverIdAndStatus(driverId, Match.MatchStatus.PENDING);
    }
}