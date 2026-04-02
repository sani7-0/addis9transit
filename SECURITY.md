# Security Configuration Guide

## Overview

This document outlines the security measures implemented in the AddisTransit backend and provides guidance for production deployment.

## Implemented Security Features

### 1. Authentication & Authorization

#### JWT Authentication (Admin APIs)
- **Mechanism**: Bearer token authentication using JSON Web Tokens
- **Token Lifetime**: Configurable via `JWT_EXPIRES_IN` (default: 1h)
- **Algorithm**: HS256 with strong secret
- **Endpoints Protected**: All `/api/v1/admin/*` endpoints
- **Implementation**: `JwtAuthGuard` with `@nestjs/passport`

#### API Key Authentication (Vehicle APIs)
- **Mechanism**: SHA256 hashed API keys in `X-API-Key` header
- **Key Format**: `at_[48 random alphanumeric characters]`
- **Hash Storage**: Only SHA256 hash stored in database
- **Key Display**: Only first 10 characters shown to users
- **Expiration**: Configurable per key
- **Endpoints Protected**: All `/api/v1/vehicles/*` endpoints
- **Implementation**: `ApiKeyGuard` with device/bus validation

### 2. Rate Limiting

Implemented using `@nestjs/throttler`:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Public APIs | 100 requests | 60 seconds |
| Admin APIs | 100 requests | 60 seconds |
| Vehicle APIs | 60 requests | 60 seconds |
| Login Endpoint | 5 requests | 60 seconds |

**Configuration**:
- Enable: `RATE_LIMIT_ENABLED=true`
- Default TTL: `THROTTLE_TTL=60000` (60 seconds)
- Default Limit: `THROTTLE_LIMIT=100`

### 3. Input Validation

#### ValidationPipe Configuration
```typescript
{
  whitelist: true,                    // Strip non-DTO properties
  forbidNonWhitelisted: true,         // Reject requests with extra properties
  transform: true,                    // Auto-transform to DTO instances
  disableErrorMessages: true,         // In production (hide internals)
  validationError: {
    target: false,                    // Don't expose target object
    value: false,                     // Don't expose invalid values
  }
}
```

#### DTO Validation Examples
- **Latitude**: `-90` to `90` (using `@Min()` and `@Max()`)
- **Longitude**: `-180` to `180`
- **Speed**: `0` to `200` km/h
- **Bus Capacity**: `10` to `200`
- **Year**: Minimum `1990`
- **Enum Validation**: Status values validated against enums

### 4. SQL Injection Protection

All database queries use TypeORM protections:
- ✅ Parameterized queries via Repository methods
- ✅ QueryBuilder with named parameters (`:paramName`)
- ✅ Entity relationships with eager loading
- ✅ No raw SQL with user input (except static queries)

### 5. Security Headers (Helmet)

Implemented headers:
- **Content-Security-Policy**: Restricts resource loading
- **Strict-Transport-Security (HSTS)**: HTTPS enforcement (production)
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: Browser XSS filter
- **Referrer-Policy**: Controls referrer information
- **DNS-Prefetch-Control**: Disables DNS prefetching
- **Hide-Powered-By**: Removes Express/X-Powered-By header

### 6. CORS Configuration

**Development Mode**:
- Origin: `*` (all origins allowed)
- Methods: GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS
- Credentials: true

**Production Mode**:
- Origin: Configurable via `CORS_ORIGIN` (comma-separated list)
- If not set: CORS disabled (same-origin only)
- Max Age: 24 hours (preflight caching)
- Allowed Headers: Content-Type, Accept, Authorization, X-API-Key

**⚠️ CRITICAL**: Always set `CORS_ORIGIN` in production to specific domains!

### 7. Request Size Limits

- **JSON Payload**: 10MB maximum
- **URL Encoded**: 10MB maximum
- **Prevents**: DoS attacks via large payloads

### 8. Password Security

- **Hashing Algorithm**: bcrypt
- **Salt Rounds**: 10
- **Storage**: Only password hash stored (never plaintext)
- **API Keys**: SHA256 hashed before storage

### 9. Environment-Based Security

| Feature | Development | Production |
|---------|------------|------------|
| Swagger UI | ✅ Enabled | ⚠️ Configurable (default: disabled) |
| Rate Limiting | ❌ Disabled | ✅ Enabled |
| Error Messages | ✅ Detailed | ❌ Minimal |
| CORS | ✅ Permissive | 🔒 Restricted |
| HSTS | ❌ Disabled | ✅ Enabled (1 year) |
| Request Logging | ✅ Verbose | ⚠️ Configurable |

## Production Deployment Checklist

### Environment Variables

```bash
# Required Production Settings
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
SWAGGER_ENABLED=false
RATE_LIMIT_ENABLED=true
DATABASE_SSL=true

# Security Secrets (generate strong random values)
JWT_SECRET=<64+ character random hex string>
API_KEY_SALT=<32+ character random hex string>
```

### Database Security

- ✅ Use SSL/TLS for database connections
- ✅ Database user with minimal required permissions
- ✅ Regular database backups
- ✅ Connection pooling (max 20 connections)
- ✅ Connection timeout (10 seconds)

### Network Security

- ✅ HTTPS only (HSTS enabled)
- ✅ Firewall rules (allow only necessary ports)
- ✅ Rate limiting enabled
- ✅ DDoS protection (via cloud provider)
- ✅ Web Application Firewall (WAF) recommended

### Monitoring & Logging

- ✅ Failed authentication attempts logged
- ✅ Admin actions logged
- ✅ Vehicle position updates logged (sampled)
- ✅ Error tracking (Sentry/DataDog recommended)
- ✅ Performance monitoring

### Secrets Management

**NEVER**:
- ❌ Commit secrets to version control
- ❌ Use default or weak secrets
- ❌ Share secrets in plain text
- ❌ Log secrets or API keys

**ALWAYS**:
- ✅ Use environment variables for secrets
- ✅ Rotate secrets regularly (every 90 days)
- ✅ Use secrets manager (AWS Secrets Manager, Azure Key Vault, etc.)
- ✅ Different secrets for different environments

## Security Testing

### Manual Testing

1. **Authentication Bypass**:
   ```bash
   # Try accessing admin endpoint without token
   curl http://localhost:3000/api/v1/admin/buses
   # Should return 401 Unauthorized
   ```

2. **API Key Validation**:
   ```bash
   # Try accessing vehicle endpoint without key
   curl http://localhost:3000/api/v1/vehicles/position \
     -X POST \
     -d '{"latitude": 9.0, "longitude": 38.7}'
   # Should return 401 Unauthorized
   ```

3. **Rate Limiting**:
   ```bash
   # Send 101 requests in 60 seconds
   for i in {1..101}; do
     curl http://localhost:3000/api/public/routes
   done
   # Should return 429 Too Many Requests
   ```

4. **Input Validation**:
   ```bash
   # Try invalid latitude
   curl http://localhost:3000/api/v1/vehicles/position \
     -X POST \
     -H "X-API-Key: your-key" \
     -d '{"latitude": 999, "longitude": 38.7}'
   # Should return 400 Bad Request
   ```

5. **SQL Injection**:
   ```bash
   # Try SQL injection in route ID
   curl "http://localhost:3000/api/public/routes/1' OR '1'='1"
   # Should return 404 (safe parameterized query)
   ```

### Automated Testing

```bash
# Run security-focused tests
npm run test:security

# Run all tests
npm run test
```

## Incident Response

### If API Key is Compromised

1. Immediately revoke the key:
   ```sql
   UPDATE api_keys SET is_active = false WHERE key_id = 'compromised-key-id';
   ```

2. Generate new key for the device

3. Update device with new key

4. Review access logs for unauthorized usage

### If Admin Account is Compromised

1. Immediately disable the account:
   ```sql
   UPDATE admin_users SET is_active = false WHERE user_id = 'compromised-user-id';
   ```

2. Force password reset

3. Review admin action logs

4. Check for unauthorized data modifications

### If Database is Breached

1. Rotate all database credentials
2. Rotate all JWT secrets
3. Rotate all API key salts
4. Force password reset for all admin users
5. Regenerate all API keys
6. Review audit logs

## Compliance Notes

### Data Protection

- **GDPR**: If serving EU users, implement data retention policies
- **Personal Data**: Minimize collection of personal data
- **Encryption**: All sensitive data encrypted in transit (TLS 1.2+)
- **Audit Trail**: All admin actions logged with timestamps

### Data Retention

Recommended retention periods:
- **Vehicle Positions**: 30 days (for real-time tracking)
- **API Access Logs**: 90 days
- **Admin Action Logs**: 1 year
- **Error Logs**: 30 days

## Contact & Support

For security issues or questions:
- Email: security@addistransit.et
- Issue Tracker: [GitHub Issues]

---

**Last Updated**: 2026-02-09
**Version**: 1.0.0
**Classification**: Internal Use
