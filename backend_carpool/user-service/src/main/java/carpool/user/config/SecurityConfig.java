package carpool.user.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // Disable CSRF for APIs
            .authorizeHttpRequests(auth -> auth
                // Allow public access to register and login
                .requestMatchers("/api/users/register", "/api/users/login", "/api/users/{id}", "/api/users/{id}/rating", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                // Require authentication for everything else (though Gateway handles most protections)
                .anyRequest().authenticated()
            );
        return http.build();
    }
}
