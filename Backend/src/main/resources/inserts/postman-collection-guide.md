# 📋 POSTMAN COLLECTION GUIDE - Property CRUD Testing

## 🚀 **Quick Start Guide**

### 1. **Setup Postman Environment**
Create a new environment in Postman with these variables:
```
baseUrl: http://localhost:9010/api
token: [Your JWT token from login]
propertyId: [Will be set after creating property]
landmarkId: [Will be set after creating landmark]
boundaryId: [Will be set after creating boundary]
standardId: [Your memorial standard ID]
```

### 2. **Authentication First**
```json
POST {{baseUrl}}/auth/login
{
  "email": "admin@geolimites.com",
  "password": "your_password"
}
```
Copy the token from response and set in environment variable.

---

## 📁 **Test Files Overview**

### 🏠 **property-test-data.json**
- **Purpose**: Test Property CRUD operations
- **Contains**: 3 different property types (Residential, Commercial, Rural)
- **Features**: Create, Update, Search, List, Delete operations

### 📍 **property-landmarks-test-data.json**
- **Purpose**: Test Property Landmarks CRUD
- **Contains**: 6 different landmark examples
- **Features**: Landmarks, Vertices, Reference Points with UTM coordinates

### 🌍 **property-boundaries-test-data.json**
- **Purpose**: Test Property Boundaries CRUD
- **Contains**: 7 different boundary types
- **Features**: All directions, various adjacent types

### 📄 **property-documents-test-data.json**
- **Purpose**: Test Property Documents CRUD
- **Contains**: 8 different document types
- **Features**: DEED, REGISTRATION, PLAN, PHOTO, SURVEY, etc.

### 🔗 **memorial-integration-test-data.json**
- **Purpose**: Test complete integration with Memorial generation
- **Contains**: Complete property setup + memorial generation
- **Features**: End-to-end testing workflow

---

## 🧪 **Testing Workflow**

### **Phase 1: Basic Property CRUD**
1. **Create Property**
   ```
   POST /api/properties
   Use: property-test-data.json -> createProperty
   ```

2. **Get Property**
   ```
   GET /api/properties/{propertyId}
   Save propertyId from step 1
   ```

3. **Update Property**
   ```
   PUT /api/properties/{propertyId}
   Use: property-test-data.json -> updateProperty
   ```

4. **Search Properties**
   ```
   GET /api/properties/search?name=Residential
   Use: property-test-data.json -> searchExamples
   ```

### **Phase 2: Landmarks Testing**
1. **Create Multiple Landmarks**
   ```
   POST /api/properties/{propertyId}/landmarks
   Use: property-landmarks-test-data.json -> createLandmark1-6
   ```

2. **List Landmarks**
   ```
   GET /api/properties/{propertyId}/landmarks
   ```

3. **Update Landmark**
   ```
   PUT /api/properties/{propertyId}/landmarks/{landmarkId}
   Use: property-landmarks-test-data.json -> updateLandmark
   ```

### **Phase 3: Boundaries Testing**
1. **Create Boundaries**
   ```
   POST /api/properties/{propertyId}/boundaries
   Use: property-boundaries-test-data.json -> createNorthBoundary, etc.
   ```

2. **List Boundaries**
   ```
   GET /api/properties/{propertyId}/boundaries
   ```

### **Phase 4: Documents Testing**
1. **Create Documents**
   ```
   POST /api/properties/{propertyId}/documents
   Use: property-documents-test-data.json -> createDeedDocument, etc.
   ```

2. **List Documents**
   ```
   GET /api/properties/{propertyId}/documents
   ```

3. **Filter by Type**
   ```
   GET /api/properties/{propertyId}/documents/type/DEED
   ```

### **Phase 5: Integration Testing**
1. **Complete Setup**
   ```
   Use: memorial-integration-test-data.json
   Follow step1 -> step2 -> step3 sequence
   ```

2. **Generate Memorial**
   ```
  POST /api/memorial/generate-gpt
   Use: memorial-integration-test-data.json -> generateMemorialWithProperty
   ```

---

## 🎯 **Expected Results**

### ✅ **Successful Property Creation**
```json
{
  "propertyId": "uuid-here",
  "name": "Residential Lot 15 - Block B",
  "ownerName": "John Silva Santos",
  "city": "São Paulo",
  "totalArea": 450.75,
  "active": true,
  "createdAt": "2024-11-10T..."
}
```

### ✅ **Successful Landmark Creation**
```json
{
  "landmarkId": "uuid-here",
  "landmarkName": "M1",
  "landmarkType": "LANDMARK",
  "coordinateX": 323456.78,
  "coordinateY": 7654321.09,
  "sequenceOrder": 1
}
```

### ✅ **Successful Boundary Creation**
```json
{
  "boundaryId": "uuid-here",
  "direction": "NORTH",
  "extension": 15.50,
  "adjacentType": "STREET",
  "adjacentName": "Flowers Street",
  "sequenceOrder": 1
}
```

---

## 🔍 **Troubleshooting**

### **Common Issues**

1. **401 Unauthorized**
   - Check if token is valid and not expired
   - Ensure Authorization header: `Bearer {token}`

2. **404 Property Not Found**
   - Verify propertyId exists and belongs to authenticated user
   - Check if property is active (not soft deleted)

3. **400 Bad Request**
   - Validate JSON format
   - Check required fields are present
   - Verify data types (UUID, numbers, strings)

4. **500 Internal Server Error**
   - Check server logs
   - Verify database connection
   - Ensure all tables are created

### **Validation Rules**

- **Property**: name, ownerName, street, neighborhood, city, state are required
- **Landmark**: landmarkName, landmarkType, coordinateX, coordinateY are required
- **Boundary**: direction, extension, adjacentType, adjacentName are required
- **Coordinates**: Use UTM format (X: 200k-800k, Y: 7M-8M range for Brazil)
- **Azimuth**: 0.0000 to 359.9999 degrees

---

## 📊 **Performance Testing**

### **Load Testing Scenarios**
1. Create 100 properties simultaneously
2. Create 1000 landmarks for single property
3. Search with various filters
4. Generate memorial with large property dataset

### **Monitoring Points**
- Response times for CRUD operations
- Database query performance
- Memory usage during bulk operations
- Memorial generation time with property data

---

## 🔧 **Advanced Testing**

### **Edge Cases**
- Properties with no landmarks/boundaries
- Landmarks with missing coordinates
- Boundaries with invalid directions
- Very large coordinate values
- Special characters in names
- Duplicate landmark names

### **Security Testing**
- Access other users' properties
- Invalid JWT tokens
- SQL injection attempts
- XSS in text fields

---

## 📝 **Test Results Template**

```
PROPERTY CRUD TESTING RESULTS
============================

✅ Property Creation: PASS/FAIL
✅ Property Update: PASS/FAIL  
✅ Property Search: PASS/FAIL
✅ Property Delete: PASS/FAIL

✅ Landmark Creation: PASS/FAIL
✅ Landmark Update: PASS/FAIL
✅ Landmark Delete: PASS/FAIL

✅ Boundary Creation: PASS/FAIL
✅ Boundary Update: PASS/FAIL
✅ Boundary Delete: PASS/FAIL

✅ Memorial Integration: PASS/FAIL

Notes:
- Performance: Average response time
- Issues found: List any problems
- Recommendations: Improvements needed
```
