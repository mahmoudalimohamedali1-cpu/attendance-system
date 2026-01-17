# 🧪 ML Training Integration Test Instructions

## Overview

This document provides instructions for testing the AI Predictive ML Training functionality (Subtask 7-1).

## Test Objectives

1. ✅ Call POST /ai-predictive/train-model
2. ✅ Verify model trains successfully
3. ✅ Check accuracy metrics are calculated (accuracy, precision, recall, F1 score)
4. ✅ Verify predictions are generated for employees

## Prerequisites

### 1. Environment Setup

Ensure you have:
- Node.js installed (v18+ recommended)
- PostgreSQL database running
- Backend dependencies installed

### 2. Database Setup

The following Prisma models must be migrated to the database:
- `AbsencePrediction` - Stores employee absence predictions
- `PredictionAccuracy` - Stores model performance metrics
- `AbsencePattern` - Stores detected absence patterns

Run the migration:
```bash
cd backend
npx prisma migrate dev --name add-ai-predictive-models
```

Or in production:
```bash
cd backend
npx prisma migrate deploy
```

### 3. Environment Variables

Create a `.env` file in the `backend` directory with:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/attendance_db"
JWT_SECRET="your-secret-key"
PORT=3001
```

### 4. Historical Data

The ML training requires historical attendance data. Ensure your database has:
- At least 180 days of attendance records
- Multiple employees with varied attendance patterns
- Actual absence records (status = ABSENT, LATE, etc.)

If you don't have sufficient data, you may need to seed test data.

## Running the Tests

### Option 1: Using Node.js Test Script

```bash
cd backend

# Without authentication (may get 401 errors)
node test-ml-training.js

# With authentication token
TEST_AUTH_TOKEN=your_jwt_token node test-ml-training.js
```

### Option 2: Using Bash/Curl Test Script

```bash
cd backend

# Without authentication
./test-ml-training.sh

# With authentication token
./test-ml-training.sh your_jwt_token
```

### Option 3: Manual Testing with curl

#### Step 1: Train the Model

```bash
curl -X POST http://localhost:3001/ai-predictive/train-model \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{}'
```

Expected Response:
```json
{
  "success": true,
  "message": "تم تدريب النموذج بنجاح",
  "modelVersion": "v1.0_20260117",
  "accuracy": 0.85,
  "precision": 0.82,
  "recall": 0.88,
  "f1Score": 0.85,
  "timestamp": "2026-01-17T20:00:00.000Z"
}
```

#### Step 2: Verify Accuracy Metrics

```bash
curl -X GET http://localhost:3001/ai-predictive/model-accuracy \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected Response:
```json
{
  "success": true,
  "accuracy": 0.85,
  "precision": 0.82,
  "recall": 0.88,
  "f1Score": 0.85,
  "modelVersion": "v1.0_20260117",
  "evaluatedAt": "2026-01-17T20:00:00.000Z",
  "predictionCount": 1000
}
```

#### Step 3: Verify Predictions Generated

```bash
curl -X GET http://localhost:3001/ai-predictive/employee-predictions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected Response:
```json
{
  "success": true,
  "predictions": [
    {
      "userId": "user-id-123",
      "employeeName": "أحمد محمد",
      "absenceLikelihood": 75.5,
      "riskLevel": "HIGH",
      "contributingFactors": [
        "معدل غياب تاريخي مرتفع (40%)",
        "اتجاه متزايد في الفترة الأخيرة",
        "رصيد إجازات منخفض"
      ],
      "departmentComparison": "أعلى من متوسط القسم بـ 15%",
      "predictionDate": "2026-01-18T00:00:00.000Z"
    },
    // ... more predictions
  ],
  "count": 50,
  "generatedAt": "2026-01-17T20:00:00.000Z"
}
```

## Getting an Authentication Token

To get a JWT token for testing:

### 1. Start the Backend Server

```bash
cd backend
npm install
npm run start:dev
```

### 2. Login via API

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "your_password"
  }'
```

The response will include an `accessToken` field. Use this token for authenticated requests.

## Expected Test Results

### ✅ Success Criteria

The test passes if:

1. **Model Training**
   - POST /ai-predictive/train-model returns 200/201
   - Response includes `success: true`
   - Model version is generated
   - All 4 accuracy metrics are present:
     - Accuracy (overall correctness)
     - Precision (true positive rate)
     - Recall (sensitivity)
     - F1 Score (harmonic mean)

2. **Accuracy Metrics Stored**
   - GET /ai-predictive/model-accuracy returns 200
   - Metrics are persisted in database
   - Can be retrieved after training

3. **Predictions Generated**
   - GET /ai-predictive/employee-predictions returns 200
   - Array of predictions is returned
   - Each prediction includes:
     - absenceLikelihood (0-100)
     - riskLevel (LOW/MEDIUM/HIGH/CRITICAL)
     - contributingFactors (array of reasons)

### ⚠️ Common Issues

#### Issue: "Backend server not running"
**Solution:** Start the backend server:
```bash
cd backend
npm run start:dev
```

#### Issue: "Authentication required (401)"
**Solution:** Provide a valid JWT token (see "Getting an Authentication Token" above)

#### Issue: "No accuracy metrics found"
**Solution:**
- Ensure the model has been trained at least once
- Check database for PredictionAccuracy records
- Verify sufficient historical data exists (180+ days)

#### Issue: "No predictions found"
**Solution:**
- Ensure employees exist in the database
- Verify attendance records exist
- Check that predictions were generated after training

#### Issue: "Insufficient historical data"
**Solution:**
- Seed the database with test attendance records
- Or wait for real data to accumulate
- Minimum recommended: 90 days of data for 10+ employees

## Verification Checklist

After running the tests, verify:

- [ ] Model training completes without errors
- [ ] Accuracy metrics are calculated and within reasonable range (0-1)
- [ ] Metrics are stored in `PredictionAccuracy` table
- [ ] Predictions are generated for all active employees
- [ ] Predictions include likelihood scores (0-100)
- [ ] Predictions include risk levels (LOW/MEDIUM/HIGH/CRITICAL)
- [ ] Contributing factors are identified and explained
- [ ] All API endpoints return proper status codes
- [ ] No server errors in backend logs

## Database Verification

To manually verify the data in the database:

```sql
-- Check prediction accuracy records
SELECT * FROM "PredictionAccuracy" ORDER BY "evaluatedAt" DESC LIMIT 1;

-- Check absence predictions
SELECT * FROM "AbsencePrediction" ORDER BY "createdAt" DESC LIMIT 10;

-- Count predictions by risk level
SELECT "riskLevel", COUNT(*)
FROM "AbsencePrediction"
GROUP BY "riskLevel";
```

Or use Prisma Studio:
```bash
cd backend
npx prisma studio
```

## Next Steps

After successful testing:

1. ✅ Mark subtask-7-1 as completed
2. ✅ Update implementation_plan.json status
3. ✅ Commit test scripts and documentation
4. ➡️ Proceed to subtask-7-2: Test individual employee predictions with explanations

## Test Scripts Included

- `test-ml-training.js` - Node.js test script with detailed checks
- `test-ml-training.sh` - Bash/curl test script for Unix systems
- `TEST_INSTRUCTIONS.md` - This documentation file

## Support

If you encounter issues:
1. Check backend logs for detailed error messages
2. Verify database connection and migrations
3. Ensure sufficient historical data exists
4. Check authentication token validity
5. Review the implementation in:
   - `backend/src/modules/ai-predictive/services/ml-training.service.ts`
   - `backend/src/modules/ai-predictive/ai-predictive.controller.ts`
