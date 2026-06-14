package com.ffzone.ffzone_backend.config;

import com.ffzone.ffzone_backend.security.JwtFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity // bật @PreAuthorize
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth

                        // ── Public (không cần login) ──────────────────────────────
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/fields/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/field-slots/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/services/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/vouchers/available").permitAll()

                        // ── Booking: User tạo + xem của mình ─────────────────────
                        .requestMatchers(HttpMethod.POST, "/api/bookings").hasRole("USER")
                        .requestMatchers(HttpMethod.GET, "/api/bookings/my/**").hasRole("USER")
                        .requestMatchers(HttpMethod.GET, "/api/bookings/my").hasRole("USER")
                        .requestMatchers(HttpMethod.POST, "/api/bookings/*/cancel").hasRole("USER")

                        // ── Booking: Staff / IT_ADMIN quản lý ────────────────────
                        .requestMatchers(HttpMethod.GET, "/api/bookings").hasAnyRole("STAFF", "IT_ADMIN", "OWNER")
                        .requestMatchers(HttpMethod.GET, "/api/bookings/*").hasAnyRole("STAFF", "IT_ADMIN", "OWNER")
                        .requestMatchers(HttpMethod.POST, "/api/bookings/*/checkin").hasRole("STAFF")
                        .requestMatchers(HttpMethod.POST, "/api/bookings/*/checkout").hasRole("STAFF")

                        // ── IT_ADMIN only ─────────────────────────────────────────
                        .requestMatchers("/api/accounts/**").hasRole("IT_ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/fields/**").hasRole("IT_ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/fields/**").hasRole("IT_ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/fields/**").hasRole("IT_ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/field-pricings/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/field-pricings/**").hasRole("IT_ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/field-pricings/**").hasRole("IT_ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/field-pricings/**").hasRole("IT_ADMIN")

                        // ── IT_ADMIN hoặc OWNER ───────────────────────────────────
                        .requestMatchers("/api/vouchers/**").hasAnyRole("IT_ADMIN", "OWNER")

                        // ── Còn lại phải đăng nhập ────────────────────────────────
                        .anyRequest().authenticated())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://localhost:3000"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
