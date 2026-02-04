package carpool.matching.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class LocationService {
    
    @Value("${openrouteservice.api-key}")
    private String apiKey;
    
    @Value("${openrouteservice.directions-url}")
    private String directionsUrl;
    
    @Value("${matching.max-radius-km:15.0}")
    private double maxRadiusKm;
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    private static final String NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
    private static final String USER_AGENT = "CarpoolApp/1.0";
    
    public LocationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
        this.objectMapper = new ObjectMapper();
    }
    
    /**
     * Calculate distance between two locations in kilometers
     */
    public double calculateDistance(String location1, String location2) {
        try {
            // Geocode both locations using Nominatim
            double[] coords1 = geocodeLocationNominatim(location1);
            double[] coords2 = geocodeLocationNominatim(location2);
            
            if (coords1 == null || coords2 == null) {
                System.err.println(" Geocoding failed for one or both locations");
                return -1;
            }
            
            // Get directions using OpenRouteService
            String directionsResponse = getDirections(coords1, coords2);
            JsonNode root = objectMapper.readTree(directionsResponse);
            
            if (root.has("routes") && root.get("routes").size() > 0) {
                JsonNode summary = root.get("routes").get(0).get("summary");
                double distanceInMeters = summary.get("distance").asDouble();
                return Math.round(distanceInMeters / 10.0) / 100.0; // Convert to km
            }
            
            return -1;
            
        } catch (Exception e) {
            System.err.println("Error calculating distance: " + e.getMessage());
            return -1;
        }
    }
    
    /**
     * Geocode location using Nominatim with India filter
     */
    private double[] geocodeLocationNominatim(String location) {
        try {
            String url = NOMINATIM_URL + 
                "?q=" + URLEncoder.encode(location, StandardCharsets.UTF_8) +
                "&format=json" +
                "&limit=1" +
                "&countrycodes=in";
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", USER_AGENT);
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, String.class
            );
            
            JsonNode results = objectMapper.readTree(response.getBody());
            
            if (results.isArray() && results.size() > 0) {
                JsonNode firstResult = results.get(0);
                double lat = firstResult.get("lat").asDouble();
                double lon = firstResult.get("lon").asDouble();
                
                // Validate India bounds
                if (lat < 8 || lat > 37 || lon < 68 || lon > 97) {
                    return null;
                }
                
                return new double[]{lon, lat};
            }
            
            return null;
            
        } catch (Exception e) {
            System.err.println(" Geocoding error: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * Get directions from OpenRouteService
     */
    private String getDirections(double[] origin, double[] destination) throws Exception {
        String coordinates = String.format("[[%f,%f],[%f,%f]]", 
            origin[0], origin[1], destination[0], destination[1]);
        
        String requestBody = "{\"coordinates\":" + coordinates + "}";
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", apiKey);
        headers.set("Content-Type", "application/json");
        
        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
        
        ResponseEntity<String> response = restTemplate.exchange(
            directionsUrl, HttpMethod.POST, entity, String.class
        );
        
        return response.getBody();
    }
    
    /**
     * Check if pickup is within radius
     */
    public boolean isPickupWithinRadius(String riderPickup, String driverPickup) {
        double distance = calculateDistance(riderPickup, driverPickup);
        
        if (distance < 0) {
            // Fall back to string matching
            boolean matches = normalizeLocation(riderPickup).equals(normalizeLocation(driverPickup));
            System.out.println("   Pickup (geocoding failed, string match): " + riderPickup + " vs " + driverPickup + " = " + matches);
            return matches;
        }
        
        boolean withinRadius = distance <= maxRadiusKm;
        System.out.println("   Pickup: " + riderPickup + " vs " + driverPickup);
        System.out.println("     Distance: " + String.format("%.2f", distance) + " km (max: " + maxRadiusKm + " km) = " + withinRadius);
        return withinRadius;
    }
    
    /**
     * Check if drop is within radius
     */
    public boolean isDropWithinRadius(String riderDrop, String driverDrop) {
        double distance = calculateDistance(riderDrop, driverDrop);
        
        if (distance < 0) {
            boolean matches = normalizeLocation(riderDrop).equals(normalizeLocation(driverDrop));
            System.out.println("   Drop (geocoding failed, string match): " + riderDrop + " vs " + driverDrop + " = " + matches);
            return matches;
        }
        
        boolean withinRadius = distance <= maxRadiusKm;
        System.out.println("   Drop: " + riderDrop + " vs " + driverDrop);
        System.out.println("     Distance: " + String.format("%.2f", distance) + " km (max: " + maxRadiusKm + " km) = " + withinRadius);
        return withinRadius;
    }
    
    /**
     * Check if complete route matches
     */
    public boolean isCompleteRouteMatch(String riderPickup, String riderDrop, 
                                       String driverPickup, String driverDrop) {
        System.out.println("\n=== LOCATION MATCHING DEBUG ===");
        System.out.println("Rider: " + riderPickup + " → " + riderDrop);
        System.out.println("Driver: " + driverPickup + " → " + driverDrop);
        
        boolean pickupMatch = isPickupWithinRadius(riderPickup, driverPickup);
        System.out.println("Pickup match: " + pickupMatch);
        
        boolean dropMatch = isDropWithinRadius(riderDrop, driverDrop);
        System.out.println("Drop match: " + dropMatch);
        
        System.out.println("Overall route match: " + (pickupMatch && dropMatch));
        System.out.println("===========================\n");
        
        return pickupMatch && dropMatch;
    }
    
    /**
     * Calculate matching score (0-100)
     */
    public int calculateMatchingScore(String riderPickup, String riderDrop, 
                                     String driverPickup, String driverDrop) {
        double pickupDistance = calculateDistance(riderPickup, driverPickup);
        double dropDistance = calculateDistance(riderDrop, driverDrop);
        
        if (pickupDistance < 0 || dropDistance < 0) {
            return 50;
        }
        
        double totalDistance = pickupDistance + dropDistance;
        
        if (totalDistance == 0) {
            return 100;
        }
        
        int score = (int) Math.max(0, 100 - (totalDistance * 10));
        
        System.out.println(" Matching score: " + score + "/100 (pickup: " + 
                          pickupDistance + " km, drop: " + dropDistance + " km)");
        
        return score;
    }
    
    /**
     * Normalize location string for comparison
     */
    private String normalizeLocation(String location) {
        return location.toLowerCase()
            .replaceAll("[,\\s]+", "")
            .replaceAll("phase\\d+", "")
            .replaceAll("maharashtra", "")
            .replaceAll("india", "");
    }
}