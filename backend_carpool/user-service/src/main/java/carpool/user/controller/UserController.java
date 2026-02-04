package carpool.user.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import carpool.user.dto.LoginRequest;
import carpool.user.dto.LoginResponse;
import carpool.user.dto.RegisterRequest;
import carpool.user.entity.User;
import carpool.user.service.UserService;

@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @Autowired
    private UserService userService;

    @Autowired
    private carpool.user.util.JwtUtil jwtUtil;
    
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            System.out.println("Register request received: " + request);
            System.out.println("Name: " + request.getName());
            System.out.println("Email: " + request.getEmail());
            System.out.println("Phone: " + request.getPhone());
            System.out.println("Password: " + request.getPassword());
            System.out.println("Role: " + request.getRole());
            System.out.println("Vehicle Number: " + request.getVehicleNumber());
            System.out.println("Vehicle Capacity: " + request.getVehicleCapacity());
            
            User user = userService.register(request);
            System.out.println("User registered successfully: " + user);
            System.out.println("User ID: " + user.getId());
            
            // Generate a valid JWT token
            String token = jwtUtil.generateToken(user);
            System.out.println("Generated JWT token: " + token);
            
            // Create response map
            Map<String, Object> response = new HashMap<>();
            response.put("user", user);
            response.put("token", token);
            
            System.out.println("Returning response with user and token");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            e.printStackTrace();
            System.out.println("Registration error: " + e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Registration failed");
            errorResponse.put("message", e.getMessage());
            errorResponse.put("details", e.getCause() != null ? e.getCause().toString() : "No details");
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("Unexpected error during registration: " + e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Registration failed");
            errorResponse.put("message", e.getMessage());
            errorResponse.put("details", e.getCause() != null ? e.getCause().toString() : "No details");
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            LoginResponse response = userService.login(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(@PathVariable Long id) {
        try {
            User user = userService.getUserById(id);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @PutMapping("/{id}/rating")
    public ResponseEntity<?> updateUserRating(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        System.out.println(" Received Rating Update Request for User " + id + ": " + payload);
        try {
            Double rating = ((Number) payload.get("rating")).doubleValue();
            Integer count = ((Number) payload.get("count")).intValue();
            User user = userService.updateRating(id, rating, count);
            System.out.println(" User rating updated successfully: " + user.getRating());
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            System.err.println("  Error updating user rating: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
