# App Encryption Compliance Document

## App Information
- **App Name**: Czar AI
- **Bundle ID**: com.aiagentmaker.charismachat
- **App Version**: 1.0.2

## Encryption Usage Summary
This application uses standard, industry-accepted encryption algorithms and protocols for secure data transmission and storage. All encryption used is exempt under ITAR (International Traffic in Arms Regulations) and does not require export authorization.

## 1. Network Communication Encryption

### HTTPS/TLS (Transport Layer Security)
- **Purpose**: Secure data transmission between app and backend services
- **Implementation**: Uses Apple's built-in networking stack with TLS 1.2/1.3
- **Standard**: RFC 5246 (TLS 1.2), RFC 8446 (TLS 1.3)
- **Status**: ✅ Uses Apple's operating system encryption (exempt)

### Supabase Client
- **Library**: @supabase/supabase-js v2.39.0
- **Purpose**: Backend data communication
- **Encryption**: HTTPS/TLS via standard fetch API
- **Key Exchange**: ECDHE (Elliptic Curve Diffie-Hellman Ephemeral)
- **Cipher Suites**: Standard TLS 1.2/1.3 cipher suites
- **Status**: ✅ Uses Apple's operating system encryption (exempt)

## 2. Payment Processing Encryption

### Stripe SDK
- **Library**: @stripe/stripe-react-native v0.50.3
- **Purpose**: Secure payment processing
- **Encryption**: PCI DSS compliant encryption
- **Implementation**: Uses Apple's built-in Security framework
- **Status**: ✅ Uses Apple's operating system encryption (exempt)

## 3. Local Data Encryption

### Encrypted Storage
- **Library**: react-native-encrypted-storage
- **Purpose**: Secure local storage of sensitive data (auth tokens, user data)
- **Implementation**: 
  - iOS: Uses Keychain Services (Apple's secure storage)
  - Android: Uses Android Keystore System
- **Standard**: 
  - iOS: AES-256-GCM via Security framework
  - Android: AES-256-GCM via Keystore
- **Status**: ✅ Uses Apple's operating system encryption (exempt)

### Fallback Storage
- **Library**: @react-native-async-storage/async-storage
- **Purpose**: Non-sensitive data storage
- **Encryption**: None (non-sensitive data only)
- **Status**: N/A (no encryption used)

## 4. Cryptographic Libraries

### crypto-js
- **Library**: crypto-js v4.2.0
- **Purpose**: Client-side cryptographic operations (hashing, encoding)
- **Algorithms Used**:
  - SHA-256 (Secure Hash Algorithm 256-bit)
  - MD5 (Message Digest Algorithm 5)
  - Base64 encoding
- **Standard**: FIPS 180-4 (SHA-256), RFC 1321 (MD5)
- **Status**: ✅ Standard, internationally accepted algorithms (exempt)

### expo-crypto
- **Library**: expo-crypto v15.0.8
- **Purpose**: Cryptographic operations via Expo
- **Implementation**: Uses platform-native cryptographic APIs
- **Status**: ✅ Uses Apple's operating system encryption (exempt)

## 5. Encryption Exemption Status

### ITAR Exemption
All encryption used in this application falls under the following ITAR exemptions:

1. **Category 5, Part 2 - Information Security**
   - 5A002.a.1: "Symmetric algorithms" using key lengths not exceeding 128 bits
   - 5A002.a.2: "Asymmetric algorithms" using key lengths not exceeding 1024 bits
   - 5A002.a.3: "Discrete logarithm based cryptography" using key lengths not exceeding 512 bits

2. **Publicly Available Encryption**
   - All cryptographic algorithms used are publicly available and widely documented
   - No proprietary or custom encryption implementations

3. **Mass Market Software**
   - Application is intended for mass market distribution
   - No restrictions on end-users or geographic distribution

## 6. Compliance Statement

### ITSAppUsesNonExemptEncryption
- **Value**: `false`
- **Justification**: 
  - All encryption uses Apple's built-in Security framework
  - Standard, internationally accepted algorithms only
  - No proprietary or custom encryption implementations
  - Key lengths within ITAR exemption limits
  - No encryption capabilities that require export authorization

## 7. Third-Party Services Encryption

### Google Generative AI
- **Service**: @google/generative-ai v0.24.1
- **Encryption**: HTTPS/TLS
- **Status**: ✅ Uses Apple's operating system encryption (exempt)

### RevenueCat
- **Service**: Subscription management
- **Encryption**: HTTPS/TLS
- **Status**: ✅ Uses Apple's operating system encryption (exempt)

## 8. Summary

This application:
- ✅ Uses only standard, internationally accepted encryption algorithms
- ✅ Leverages Apple's built-in Security framework where possible
- ✅ Does not implement any proprietary or custom encryption
- ✅ All encryption is exempt under ITAR Category 5, Part 2
- ✅ No export authorization required
- ✅ Complies with Apple's App Store encryption policies

## Contact Information
For questions regarding encryption in this application, contact:
- **Developer**: VAL AMOR CASTIL
- **Email**: [Your email]
- **Date**: April 12, 2026
