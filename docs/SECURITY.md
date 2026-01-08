# Security Documentation

## Proxy Security Measures

The proxy system implements multiple layers of security to prevent abuse:

### 1. **SSRF Protection** (Server-Side Request Forgery)
- **IP Validation**: Resolves all hostnames and blocks requests to private/internal IPs
- **Blocked Ranges**:
  - Loopback: `127.0.0.0/8`, `::1`
  - Private networks: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
  - Link-local: `169.254.0.0/16` (prevents AWS metadata access)
  - IPv6 private: `fc00::/7`, `fe80::/10`
- **Pre-validation**: URLs are validated BEFORE making requests

### 2. **Whitelist-Only Proxying**
- Only registered external sites can be proxied
- Sites must be explicitly added by administrators
- Default allowed sites:
  - D&D Beyond (with auth)
  - Roll20 (with auth)
  - 5etools (public)
  - Foundry VTT (configurable)

### 3. **Cookie Security**
- **Domain Matching**: Only forwards cookies that match the target site's registered domains
- **No Cookie Leakage**: Cookies from other sites are never forwarded
- **Auth-Only**: Only forwards cookies for sites marked as `RequiresAuth`
- **Logging**: All cookie forwarding is logged for audit

### 4. **Request Security**
- **Timeout**: 30-second timeout prevents hanging connections
- **Redirect Limits**: Maximum 10 redirects to prevent redirect loops
- **Redirect Validation**: Each redirect URL is validated against whitelist
- **Safe Headers Only**: Only forwards safe headers (User-Agent, Accept, Accept-Language)
- **No Sensitive Headers**: Never forwards Authorization, Cookie, or other auth headers automatically

### 5. **Response Security**
- **Size Limiting**: Maximum 50MB response size to prevent memory exhaustion
- **Header Filtering**: Only forwards safe response headers (Content-Type, Cache-Control, etc.)
- **No Dangerous Headers**: Strips X-Frame-Options, CSP that would block embedding
- **Security Headers**: Adds X-Content-Type-Options: nosniff

### 6. **CORS Security**
- **Origin-Specific**: Returns the requesting origin, not wildcard `*`
- **Credentials**: Allows credentials only for authenticated requests
- **Method Restrictions**: Only GET and OPTIONS allowed

### 7. **Audit Logging**
All proxy requests are logged with:
- Target URL
- Client IP address
- Site ID
- Number of cookies forwarded
- Response size and status
- Any blocked attempts with reasons

### 8. **Rate Limiting**
- Global rate limiting applies to proxy endpoint
- Configured via `RATE_LIMIT_REQUESTS_PER_SECOND` and `RATE_LIMIT_BURST`

## Adding New Sites Securely

### Via Code (Recommended for permanent sites)
```go
m.RegisterSite(&ExternalSiteConfig{
    ID:            "mythweavers",
    Name:          "Myth-Weavers",
    BaseURL:       "https://www.myth-weavers.com",
    LoginURL:      "https://www.myth-weavers.com/login",
    RequiresAuth:  true,
    CookieDomains: []string{".myth-weavers.com"},
    Headers: map[string]string{
        "User-Agent": "Mozilla/5.0 ...",
    },
})
```

### Via API (Admin only)
```bash
POST /api/v1/admin/external-sites
Authorization: Bearer <admin-token>
{
  "id": "mythweavers",
  "name": "Myth-Weavers",
  "base_url": "https://www.myth-weavers.com",
  "requires_auth": true,
  "cookie_domains": [".myth-weavers.com"]
}
```

## Security Best Practices

1. **Review Sites**: Periodically review registered sites
2. **Monitor Logs**: Check proxy logs for suspicious activity
3. **Limit Cookie Domains**: Be specific with cookie domains
4. **Use HTTPS**: Only allow HTTPS sites in production
5. **Keep Updated**: Regularly update dependencies

## What's Protected Against

✅ **SSRF Attacks**: Cannot access internal services or AWS metadata  
✅ **Open Proxy Abuse**: Cannot proxy arbitrary URLs  
✅ **Cookie Theft**: Cookies are domain-matched and filtered  
✅ **DDoS Amplification**: Rate limited and size limited  
✅ **Memory Exhaustion**: Response size capped at 50MB  
✅ **Redirect Loops**: Limited to 10 redirects  
✅ **Port Scanning**: IP validation prevents internal scanning  

## What Users Should Know

- The proxy is **not anonymous** - all requests are logged
- Only **registered sites** can be proxied
- **Authentication cookies** are forwarded only to matching domains
- Admins can see **which sites you access** through the proxy
- The proxy **strips some headers** for security (X-Frame-Options, CSP)

## Transparency

All proxy activity is logged and auditable. Logs include:
- Timestamp
- Source IP
- Target URL
- HTTP status
- Bytes transferred
- Blocked attempts with reasons

Administrators should regularly review logs for security monitoring.
