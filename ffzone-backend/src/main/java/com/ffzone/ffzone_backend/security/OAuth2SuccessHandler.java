package com.ffzone.ffzone_backend.security;

import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.enums.AccountRole;
import com.ffzone.ffzone_backend.enums.AuthProvider;
import com.ffzone.ffzone_backend.repository.AccountRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final AccountRepository accountRepository;
    private final JwtUtil jwtUtil;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email      = oAuth2User.getAttribute("email");
        String name       = oAuth2User.getAttribute("name");
        String providerId = oAuth2User.getAttribute("sub");   // Google's unique user ID
        String avatarUrl  = oAuth2User.getAttribute("picture");

        // Find existing account or create new one
        Account account = accountRepository.findByEmail(email).orElse(null);

        if (account == null) {
            // New user — create with GOOGLE provider
            account = Account.builder()
                    .fullName(name != null ? name : email)
                    .email(email)
                    .provider(AuthProvider.GOOGLE)
                    .providerId(providerId)
                    .avatarUrl(avatarUrl)
                    .role(AccountRole.USER)
                    .isActive(true)
                    .build();
        } else {
            // Existing user — update provider info if needed
            if (account.getProvider() == AuthProvider.LOCAL) {
                account.setProvider(AuthProvider.GOOGLE);
            }
            if (account.getProviderId() == null) {
                account.setProviderId(providerId);
            }
            if (account.getAvatarUrl() == null && avatarUrl != null) {
                account.setAvatarUrl(avatarUrl);
            }
        }

        account = accountRepository.save(account);

        if (!account.getIsActive()) {
            String redirectUrl = "http://localhost:5173/login?error="
                    + URLEncoder.encode("Tài khoản đã bị khóa", StandardCharsets.UTF_8);
            getRedirectStrategy().sendRedirect(request, response, redirectUrl);
            return;
        }

        String token = jwtUtil.generateToken(
                account.getEmail(),
                account.getRole().name(),
                account.getId().toString()
        );

        String redirectUrl = "http://localhost:5173/oauth2/callback?token="
                + URLEncoder.encode(token, StandardCharsets.UTF_8);
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}
