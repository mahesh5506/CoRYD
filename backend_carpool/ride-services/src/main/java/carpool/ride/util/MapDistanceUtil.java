package carpool.ride.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class MapDistanceUtil {
    
    @Value("${openrouteservice.api-key}")
    private String apiKey;
    
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * Calculate distance between two coordinates
     * @param fromLat Origin latitude
     * @param fromLng Origin longitude
     * @param toLat Destination latitude
     * @param toLng Destination longitude
     * @return Distance in kilometers
     */
    public double calculateDistance(double fromLat, double fromLng, double toLat, double toLng) {
        try {
            // OpenRouteService Directions API
            String url = String.format(
                "https://api.openrouteservice.org/v2/directions/driving-car?start=%f,%f&end=%f,%f",
                fromLng, fromLat, toLng, toLat
            );
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", apiKey);
            headers.set("Accept", "application/geo+json");
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                String.class
            );
            
            // Parse JSON response
            JsonNode root = objectMapper.readTree(response.getBody());
            double distanceInMeters = root.get("features")
                .get(0)
                .get("properties")
                .get("summary")
                .get("distance")
                .asDouble();
            
            double distanceInKm = distanceInMeters / 1000.0;
            
            System.out.println("Distance calculated: " + distanceInKm + " km");
            
            return Math.round(distanceInKm * 100.0) / 100.0; // Round to 2 decimals
            
        } catch (Exception e) {
            System.err.println(" Error calculating distance: " + e.getMessage());
            e.printStackTrace();
            return 0.0;
        }
    }
    
    /**
     * Calculate duration between two coordinates
     * @return Duration in minutes
     */
    public long calculateDuration(double fromLat, double fromLng, double toLat, double toLng) {
        try {
            String url = String.format(
                "https://api.openrouteservice.org/v2/directions/driving-car?start=%f,%f&end=%f,%f",
                fromLng, fromLat, toLng, toLat
            );
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", apiKey);
            headers.set("Accept", "application/geo+json");
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, String.class
            );
            
            JsonNode root = objectMapper.readTree(response.getBody());
            double durationInSeconds = root.get("features")
                .get(0)
                .get("properties")
                .get("summary")
                .get("duration")
                .asDouble();
            
            long durationInMinutes = Math.round(durationInSeconds / 60.0);
            
            System.out.println("Duration calculated: " + durationInMinutes + " min");
            
            return durationInMinutes;
            
        } catch (Exception e) {
            System.err.println(" Error calculating duration: " + e.getMessage());
            return 0L;
        }
    }
}