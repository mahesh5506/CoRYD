package carpool.user.service;

import carpool.user.dto.LoginRequest;
import carpool.user.dto.LoginResponse;
import carpool.user.dto.RegisterRequest;
import carpool.user.entity.User;
import carpool.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Base64;

@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    
    @Autowired
    private carpool.user.util.JwtUtil jwtUtil;
    
    // Register new user
    public User register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        
        User user = new User();
        user.setEmail(request.getEmail());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword())); // Encrypted!
        user.setName(request.getName());
        user.setPhone(request.getPhone());
        user.setRole(request.getRole());
        
        if (request.getRole() == User.Role.DRIVER) {
            user.setVehicleNumber(request.getVehicleNumber());
            user.setVehicleCapacity(request.getVehicleCapacity());
        }
        
        return userRepository.save(user);
    }
    
    // Login user
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }
        
        // Generate JWT token 
        String token = jwtUtil.generateToken(user);
        
        LoginResponse response = new LoginResponse();
        response.setUser(user);
        response.setToken(token);
        return response;
    }
    
    // Get user by ID
    @SuppressWarnings("unchecked")
    public User getUserById(Long id) {
        return userRepository.findById(Long.valueOf(id))
            .orElseThrow(() -> new RuntimeException("User not found"));
    }
    
    // Update user rating
    public User updateRating(Long userId, Double newAverageRating, Integer ratingCount) {
        User user = getUserById(userId);
        user.setRating(newAverageRating);
        user.setRatingCount(ratingCount);
        return userRepository.save(user);
    }
    
    // Generate a simple token (Deprecated/Unused)
    /*
    private String generateToken(User user) {
        String payload = user.getId() + ":" + user.getEmail() + ":" + System.currentTimeMillis();
        return Base64.getEncoder().encodeToString(payload.getBytes());
    }
    */
}
