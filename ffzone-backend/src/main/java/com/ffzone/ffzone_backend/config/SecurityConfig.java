package com.ffzone.ffzone_backend.config;
 
import com.ffzone.ffzone_backend.security.JwtFilter;
import com.ffzone.ffzone_backend.security.OAuth2SuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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
@RequiredArgsConstructor
public class SecurityConfig {
 
    private final JwtFilter jwtFilter;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
 
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // OAuth2 requires session for the authorization code flow; JWT APIs stay stateless
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // ── OAuth2 endpoints ──────────────────────────────────────
                .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()

                // ── Public (không cần login) ──────────────────────────────
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/fields/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/field-images/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/field-slots/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/services/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/vouchers/available").permitAll()
                .requestMatchers("/uploads/**").permitAll()

                // GET field-pricings là public (BookingPage dùng để tính giá)
                .requestMatchers(HttpMethod.GET, "/api/field-pricings/**").permitAll()

                // Holiday APIs
                .requestMatchers(HttpMethod.POST, "/api/field-slots/apply-holiday").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/field-pricings/bulk-apply").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/field-pricings/holiday/update-dates").hasRole("IT_ADMIN")

                // ── VNPay callback — public ───────────────────────────────
                .requestMatchers("/api/payments/vnpay-return").permitAll()
                .requestMatchers("/api/payments/vnpay-ipn").permitAll()

                // ── Self-service profile ──────────────────────────────────
                .requestMatchers(HttpMethod.PUT, "/api/accounts/me/profile").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/accounts/me/password").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/accounts/me/avatar").authenticated()

                // ── IT_ADMIN only ─────────────────────────────────────────
                .requestMatchers("/api/accounts/**").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/fields/**").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/fields/**").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/fields/**").hasRole("IT_ADMIN")

                .requestMatchers(HttpMethod.POST, "/api/field-pricings/**").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/field-pricings/**").hasRole("IT_ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/field-pricings/**").hasRole("IT_ADMIN")

                // ── IT_ADMIN hoặc OWNER ───────────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/field-images/**").hasAnyRole("IT_ADMIN", "OWNER")
                .requestMatchers(HttpMethod.PUT, "/api/field-images/**").hasAnyRole("IT_ADMIN", "OWNER")
                .requestMatchers(HttpMethod.DELETE, "/api/field-images/**").hasAnyRole("IT_ADMIN", "OWNER")

                .requestMatchers(HttpMethod.POST, "/api/user-vouchers/claim/**").hasRole("USER")
                .requestMatchers(HttpMethod.GET, "/api/user-vouchers/my").hasRole("USER")

                .requestMatchers("/api/vouchers/**").hasAnyRole("IT_ADMIN", "OWNER")

                // ── Service CRUD ──────────────────────────────────────────
                .requestMatchers(HttpMethod.POST, "/api/services/**").hasAnyRole("IT_ADMIN", "OWNER")
                .requestMatchers(HttpMethod.PUT, "/api/services/**").hasAnyRole("IT_ADMIN", "OWNER")
                .requestMatchers(HttpMethod.PATCH, "/api/services/**").hasAnyRole("IT_ADMIN", "OWNER")
                .requestMatchers(HttpMethod.DELETE, "/api/services/**").hasAnyRole("IT_ADMIN", "OWNER")

                // ── Cart ──────────────────────────────────────────────────
                .requestMatchers("/api/cart/**").authenticated()

                // ── Booking ───────────────────────────────────────────────
                .requestMatchers("/api/bookings/**").authenticated()

                // ── Payment ───────────────────────────────────────────────
                .requestMatchers("/api/payments/**").authenticated()

                // ── Refund ────────────────────────────────────────────────
                .requestMatchers("/api/refunds/**")
                    .hasAnyRole("STAFF", "OWNER", "IT_ADMIN")

                // ── Owner APIs ────────────────────────────────────────────
                .requestMatchers("/api/owner/**")
                    .hasAnyRole("OWNER", "IT_ADMIN")

                // ── Còn lại phải login ────────────────────────────────────
                .anyRequest().authenticated()

                )

            // ── Google OAuth2 login ───────────────────────────────────────
            .oauth2Login(oauth2 -> oauth2
                .successHandler(oAuth2SuccessHandler)
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
 
        return http.build();
    }
 
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("http://localhost:*", "http://127.0.0.1:*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
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