# License System Test Plan

## Overview
Comprehensive test plan for the dental clinic license activation system to ensure all functionality works correctly across different scenarios.

## Test Environment Setup

### Prerequisites
1. Node.js and npm installed
2. Dental clinic application built and ready
3. Test license keys generated using `scripts/licenseGenerator.js`
4. Clean application state (no existing license data)

### Test Data
Generate test license keys:
```bash
node scripts/licenseGenerator.js 10
```

## Test Scenarios

### 1. First Run Experience
**Objective**: Verify license entry screen appears on first application launch

**Steps**:
1. Clear any existing license data: `node scripts/licenseReset.js reset`
2. Launch the application
3. Verify license entry screen is displayed
4. Verify no other UI components are accessible
5. Verify theme toggle works on license screen
6. Verify machine info panel can be toggled

**Expected Results**:
- License entry screen appears immediately
- Full-screen modal prevents access to other features
- Machine info displays correctly
- Theme toggle functions properly

### 2. License Key Validation
**Objective**: Test license key format validation

**Test Cases**:
- Valid format: `ABCDE-12345-FGHIJ-67890`
- Invalid format: `ABCD-12345-FGHIJ-67890` (4 chars in first segment)
- Invalid format: `ABCDE-12345-FGHIJ` (missing segment)
- Invalid format: `abcde-12345-fghij-67890` (lowercase)
- Invalid format: `ABCDE-12345-FGHIJ-6789@` (special character)
- Empty input
- Whitespace only

**Expected Results**:
- Valid format shows green checkmark
- Invalid formats show appropriate error messages
- Submit button disabled for invalid formats
- Real-time validation feedback

### 3. License Activation
**Objective**: Test successful license activation

**Steps**:
1. Enter a valid test license key
2. Click "تفعيل الترخيص" (Activate License)
3. Verify activation success
4. Verify application proceeds to authentication/main interface

**Expected Results**:
- Activation succeeds with valid key
- Success toast notification appears
- Application transitions to next screen
- License data stored securely

### 4. Hardware Binding
**Objective**: Verify license is bound to specific hardware

**Steps**:
1. Activate license on machine A
2. Copy license data to machine B (simulate)
3. Verify license fails validation on machine B
4. Verify appropriate error message

**Expected Results**:
- License works only on activation machine
- Clear error message about hardware binding
- Security maintained across different machines

### 5. License Persistence
**Objective**: Test license data persistence across app restarts

**Steps**:
1. Activate a valid license
2. Close application completely
3. Restart application
4. Verify license is still valid
5. Verify no re-activation required

**Expected Results**:
- License remains valid after restart
- Application starts normally
- No license entry screen on subsequent launches

### 6. Error Handling
**Objective**: Test various error scenarios

**Test Cases**:
- Network/IPC communication errors
- Corrupted license data
- Invalid license format submission
- Hardware ID generation failure
- Encryption/decryption errors

**Expected Results**:
- Graceful error handling
- Clear error messages in Arabic
- Application remains stable
- Recovery options available

### 7. Development Tools
**Objective**: Test development and debugging tools

**Steps**:
1. Enable development mode
2. Access license debug panel
3. Test license data clearing
4. Test license status refresh
5. Verify sensitive data hiding/showing

**Expected Results**:
- Debug panel only visible in development
- All debug functions work correctly
- Sensitive data properly masked
- Clear license data function works

### 8. Integration with Authentication
**Objective**: Verify license system integrates properly with existing auth

**Steps**:
1. Activate license successfully
2. If password protection enabled, verify login screen appears
3. If no password protection, verify direct access to main app
4. Test logout and re-login flow

**Expected Results**:
- License check happens before authentication
- Authentication flow works normally after license validation
- No conflicts between license and auth systems

### 9. Performance Testing
**Objective**: Ensure license system doesn't impact app performance

**Metrics to Monitor**:
- Application startup time
- License validation time
- Memory usage
- CPU usage during license operations

**Expected Results**:
- Minimal impact on startup time (<2 seconds additional)
- License validation completes quickly (<1 second)
- No memory leaks
- Low CPU usage

### 10. Security Testing
**Objective**: Verify security measures are effective

**Test Cases**:
- Attempt to bypass license screen
- Try to access encrypted license data
- Test license data tampering
- Verify HWID cannot be spoofed easily

**Expected Results**:
- License screen cannot be bypassed
- License data properly encrypted
- Tampered data detected and rejected
- HWID provides adequate machine identification

## Automated Test Scripts

### License Generator Test
```bash
# Test license generation
node scripts/licenseGenerator.js 1
node scripts/licenseGenerator.js 5
```

### License Reset Test
```bash
# Test license reset functionality
node scripts/licenseReset.js status
node scripts/licenseReset.js reset
node scripts/licenseReset.js status
```

### Format Validation Test
Create a simple validation test script to verify license format checking.

## Test Data

### Valid Test License Keys
- `TEST1-ABCDE-12345-FGHIJ`
- `DEMO1-KLMNO-67890-PQRST`
- `TRIAL-UVWXY-13579-ZABCD`

### Invalid Test License Keys
- `INVALID-FORMAT-KEY` (wrong format)
- `ABCD-12345-FGHIJ-67890` (wrong segment length)
- `abcde-12345-fghij-67890` (lowercase)

## Success Criteria

### Must Pass
- [ ] First run shows license entry screen
- [ ] Valid license keys activate successfully
- [ ] Invalid license keys are rejected with clear errors
- [ ] License persists across app restarts
- [ ] Hardware binding prevents license sharing
- [ ] Integration with authentication works correctly
- [ ] Development tools function properly

### Should Pass
- [ ] Performance impact is minimal
- [ ] Error handling is graceful
- [ ] Security measures are effective
- [ ] User experience is smooth

## Test Execution Log

### Test Run 1: [Date]
- Tester: [Name]
- Environment: [Details]
- Results: [Pass/Fail for each test]
- Issues Found: [List any issues]
- Notes: [Additional observations]

## Known Issues and Limitations

### Current Issues
- Build error with core-js dependency (does not affect license functionality)
- [Add any other known issues]

### Limitations
- License validation is format-based (no server validation)
- Hardware binding uses machine ID (can be reset in some cases)
- Development tools only available in dev mode

## Recommendations

### For Production
1. Implement server-based license validation
2. Add license expiration dates if needed
3. Implement license revocation mechanism
4. Add audit logging for license operations

### For Development
1. Create automated test suite
2. Add more comprehensive error scenarios
3. Implement license analytics
4. Add license usage tracking
