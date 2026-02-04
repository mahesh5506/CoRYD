package carpool.api.filter;

import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.security.Key;

@Component
public class JwtAuthenticationFilter extends AbstractGatewayFilterFactory<JwtAuthenticationFilter.Config> {

    // MUST MATCH the secret in UserService
    private static final String SECRET = "carpool_app_secret_key_must_be_long_enough_2024";
    private static final Key KEY = Keys.hmacShaKeyFor(SECRET.getBytes());

    public JwtAuthenticationFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            
            // 1. Check if header exists
            if (!exchange.getRequest().getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                return onError(exchange, "Missing Authorization Header");
            }

            // 2. Get the token
            String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return onError(exchange, "Invalid Authorization Header");
            }

            String token = authHeader.substring(7); // Remove "Bearer "

            // 3. Validate Token
            try {
                Jwts.parserBuilder().setSigningKey(KEY).build().parseClaimsJws(token);
                // If no exception, token is valid -> Forward Request
                return chain.filter(exchange);
                
            } catch (Exception e) {
                return onError(exchange, "Invalid Token: " + e.getMessage());
            }
        };
    }

    private Mono<Void> onError(ServerWebExchange exchange, String err) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }

    public static class Config {
        // Empty config class
    }
}
