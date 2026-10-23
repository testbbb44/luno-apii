# Crypto Investment API - Complete Documentation

## 🔐 Authentication Endpoints

### 1. User Signup
**POST** `/api/auth/signup`

**Request Body:**
\`\`\`json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john.doe@example.com",
  "phoneNumber": "+1234567890",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Account created successfully! You can now login.",
  "data": {
    "userId": "user_document_id",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

### 2. User Login
**POST** `/api/auth/login`

**Request Body:**
\`\`\`json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Login successful!",
  "data": {
    "userId": "user_document_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "registeredAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-01T10:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

---

## 👤 User Profile Endpoints

### 1. View User Profile
**GET** `/api/user/profile/{userId}`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "userId": "user_document_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "+1234567890",
    "tier": "tier1",
    "isEmailVerified": true,
    "registeredAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-01T10:00:00.000Z",
    "tierUpgradeStatus": null,
    "tierUpgradeRequestedAt": null,
    "profileCompleteness": 75,
    "canUpgradeToTier2": true,
    "uploadedImages": []
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

### 2. Upgrade Account to Tier 2
**POST** `/api/user/upgrade-tier`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `userId`: string (required)
- `socialSecurityNumber`: string (required, format: XXX-XX-XXXX or XXXXXXXXX)
- `idCardFront`: file (required, image: JPG/PNG/PDF, max 10MB)
- `idCardBack`: file (required, image: JPG/PNG/PDF, max 10MB)

**Example using curl:**
\`\`\`bash
curl -X POST http://localhost:3000/api/user/upgrade-tier \
  -F "userId=user_document_id" \
  -F "socialSecurityNumber=123-45-6789" \
  -F "idCardFront=@/path/to/front.jpg" \
  -F "idCardBack=@/path/to/back.jpg"
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Tier upgrade request submitted successfully! Your request is pending admin approval.",
  "data": {
    "userId": "user_document_id",
    "tierUpgradeStatus": "pending",
    "submittedAt": "2024-01-01T00:00:00.000Z",
    "documentsUploaded": {
      "idCardFront": {
        "imageId": "image_document_id_1",
        "originalName": "front.jpg",
        "fileSize": 245760
      },
      "idCardBack": {
        "imageId": "image_document_id_2", 
        "originalName": "back.jpg",
        "fileSize": 198432
      }
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

---

## 👨‍💼 Admin Endpoints

### 1. Get All Users
**GET** `/api/admin/users?page=1&limit=50&tier=all&search=John`

**Query Parameters:**
- `page`: number (optional, default: 1)
- `limit`: number (optional, default: 50, max: 100)
- `tier`: string (optional, values: "tier1", "tier2", "all")
- `search`: string (optional, searches name, email, phone)

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "userId": "user_document_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phoneNumber": "+1234567890",
        "tier": "tier1",
        "tierUpgradeStatus": "pending",
        "registeredAt": "2024-01-01T00:00:00.000Z",
        "lastLogin": "2024-01-01T10:00:00.000Z",
        "hasIdDocuments": true
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 250,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "tier": "all",
      "search": ""
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

### 2. Get User by ID (Admin View)
**GET** `/api/admin/users/{userId}`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "User details retrieved successfully",
  "data": {
    "userId": "user_document_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "+1234567890",
    "tier": "tier1",
    "tierUpgradeStatus": "pending",
    "tierUpgradeRequestedAt": "2024-01-01T00:00:00.000Z",
    "isEmailVerified": true,
    "registeredAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-01T10:00:00.000Z",
    "socialSecurityNumber": "123-45-6789",
    "idCardFrontImage": {
      "imageId": "image_document_id_1",
      "originalName": "front.jpg",
      "fileSize": 245760,
      "uploadedAt": "2024-01-01T00:00:00.000Z",
      "dataUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
    },
    "idCardBackImage": {
      "imageId": "image_document_id_2",
      "originalName": "back.jpg", 
      "fileSize": 198432,
      "uploadedAt": "2024-01-01T00:00:00.000Z",
      "dataUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
    },
    "profileCompleteness": 100,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

### 3. Get Pending Tier Upgrades
**GET** `/api/admin/pending-tier-upgrades?page=1&limit=50`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Pending tier upgrades retrieved successfully",
  "data": {
    "pendingUpgrades": [
      {
        "userId": "user_document_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phoneNumber": "+1234567890",
        "currentTier": "tier1",
        "tierUpgradeRequestedAt": "2024-01-01T00:00:00.000Z",
        "socialSecurityNumber": "123-45-6789",
        "idCardFrontImage": {
          "imageId": "image_document_id_1",
          "originalName": "front.jpg",
          "fileSize": 245760,
          "dataUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
        },
        "idCardBackImage": {
          "imageId": "image_document_id_2",
          "originalName": "back.jpg",
          "fileSize": 198432,
          "dataUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalCount": 15,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

### 4. Approve/Decline Tier Upgrade
**POST** `/api/admin/approve-tier-upgrade`

**Request Body:**
\`\`\`json
{
  "userId": "user_document_id",
  "approved": true,
  "adminNote": "Documents verified successfully"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Tier upgrade approved successfully",
  "data": {
    "userId": "user_document_id",
    "newTier": "tier2",
    "status": "approved",
    "adminNote": "Documents verified successfully",
    "processedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

---

## 🖼️ Image Management Endpoints

### 1. Get Image Data
**GET** `/api/images/{imageId}`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Image retrieved successfully",
  "data": {
    "imageId": "image_document_id",
    "userId": "user_document_id",
    "fileType": "id-card-front",
    "originalName": "front.jpg",
    "fileName": "id-card-front_abc123.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 245760,
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "dataUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

### 2. Get Image as File
**GET** `/api/images/{imageId}/file`

Returns the actual image file with proper headers for display in browser.

### 3. Get User Images
**GET** `/api/images/user/{userId}`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "User images retrieved successfully",
  "data": {
    "userId": "user_document_id",
    "images": [
      {
        "imageId": "image_document_id_1",
        "fileName": "id-card-front_abc123.jpg",
        "originalName": "front.jpg",
        "fileType": "id-card-front",
        "mimeType": "image/jpeg",
        "fileSize": 245760,
        "uploadedAt": "2024-01-01T00:00:00.000Z",
        "hasData": true
      }
    ],
    "totalImages": 1
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

---

##  Validation Rules

### Social Security Number
- Format: XXX-XX-XXXX or XXXXXXXXX
- Must be exactly 9 digits
- Cannot be all zeros, all same digits, or sequential
- Area number cannot be 000, 666, or start with 9
- Group number cannot be 00
- Serial number cannot be 0000

### File Upload Requirements
- **Supported formats:** JPG, JPEG, PNG, PDF
- **Maximum file size:** 10MB per file
- **Required files for tier upgrade:** ID card front AND back
- **File validation:** Content type and extension validation

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- At least one special character (@$!%*?&)

---

## 📊 Error Responses

All endpoints return consistent error responses:

\`\`\`json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## 🚀 Quick Start Examples

### Complete User Flow Example

\`\`\`bash
# 1. User Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "+1234567890",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!"
  }'

# 2. User Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'

# 3. View Profile
curl http://localhost:3000/api/user/profile/USER_ID_HERE

# 4. Upgrade to Tier 2
curl -X POST http://localhost:3000/api/user/upgrade-tier \
  -F "userId=USER_ID_HERE" \
  -F "socialSecurityNumber=123-45-6789" \
  -F "idCardFront=@/path/to/front.jpg" \
  -F "idCardBack=@/path/to/back.jpg"

# 5. Admin: View all users
curl http://localhost:3000/api/admin/users

# 6. Admin: View specific user
curl http://localhost:3000/api/admin/users/USER_ID_HERE

# 7. Admin: View pending upgrades
curl http://localhost:3000/api/admin/pending-tier-upgrades

# 8. Admin: Approve upgrade
curl -X POST http://localhost:3000/api/admin/approve-tier-upgrade \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_HERE",
    "approved": true,
    "adminNote": "Documents verified successfully"
  }'
\`\`\`

---

## 🔧 Rate Limiting

- **General API:** 100 requests per 15 minutes
- **Auth endpoints:** 5 requests per 15 minutes  
- **User endpoints:** 30 requests per 15 minutes
- **Admin endpoints:** 50 requests per 15 minutes
- **Image endpoints:** 100 requests per 15 minutes

---

## 💾 Database Collections

### Users Collection
\`\`\`javascript
{
  firstName: "string",
  lastName: "string", 
  email: "string",
  phoneNumber: "string",
  password: "string", // hashed
  tier: "tier1" | "tier2",
  tierUpgradeStatus: "pending" | "approved" | "rejected",
  tierUpgradeRequestedAt: "timestamp",
  tierUpgradeProcessedAt: "timestamp", 
  tierUpgradeAdminNote: "string",
  socialSecurityNumber: "string", // formatted XXX-XX-XXXX
  idCardFrontImageId: "string", // reference to images collection
  idCardBackImageId: "string", // reference to images collection
  isEmailVerified: "boolean",
  registeredAt: "timestamp",
  lastLogin: "timestamp",
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
\`\`\`

### Images Collection
\`\`\`javascript
{
  userId: "string",
  fileType: "id-card-front" | "id-card-back" | "profile",
  originalName: "string",
  fileName: "string", 
  mimeType: "string",
  fileSize: "number",
  base64Data: "string", // base64 encoded image
  uploadedAt: "timestamp",
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
