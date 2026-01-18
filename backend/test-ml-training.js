/**
 * 🧪 Integration Test for ML Training Endpoint
 *
 * This script tests the POST /ai-predictive/train-model endpoint
 * to verify ML model training with historical data.
 *
 * Test Steps:
 * 1. Call POST /ai-predictive/train-model
 * 2. Verify model trains successfully
 * 3. Check accuracy metrics are calculated
 * 4. Verify predictions can be generated
 */

const http = require('http');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * Make HTTP request
 */
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url, BASE_URL);

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(JSON.stringify(postData));
    }

    req.end();
  });
}

/**
 * Test 1: Train ML Model
 */
async function testTrainModel() {
  console.log('\n📊 Test 1: Training ML Model...');

  try {
    const response = await makeRequest({
      url: '/ai-predictive/train-model',
      method: 'POST'
    }, {});

    console.log(`   Status Code: ${response.statusCode}`);
    console.log(`   Response:`, JSON.stringify(response.data, null, 2));

    // Verify status code
    if (response.statusCode === 201 || response.statusCode === 200) {
      results.passed.push('✅ Model training endpoint returned success status');
    } else if (response.statusCode === 401) {
      results.warnings.push('⚠️  Authentication required - need valid token');
      return null;
    } else {
      results.failed.push(`❌ Expected 200/201, got ${response.statusCode}`);
      return null;
    }

    // Verify response structure
    const data = response.data.data || response.data;

    if (data.success !== undefined) {
      if (data.success) {
        results.passed.push('✅ Model training reported success');
      } else {
        results.failed.push(`❌ Model training failed: ${data.message}`);
        return null;
      }
    }

    // Check for model version
    if (data.modelVersion) {
      results.passed.push(`✅ Model version generated: ${data.modelVersion}`);
    } else {
      results.warnings.push('⚠️  No model version in response');
    }

    // Check for accuracy metrics
    if (data.accuracy !== undefined) {
      results.passed.push(`✅ Accuracy metric calculated: ${(data.accuracy * 100).toFixed(2)}%`);

      if (data.precision !== undefined) {
        results.passed.push(`✅ Precision metric: ${(data.precision * 100).toFixed(2)}%`);
      }
      if (data.recall !== undefined) {
        results.passed.push(`✅ Recall metric: ${(data.recall * 100).toFixed(2)}%`);
      }
      if (data.f1Score !== undefined) {
        results.passed.push(`✅ F1 Score metric: ${(data.f1Score * 100).toFixed(2)}%`);
      }
    } else {
      results.failed.push('❌ No accuracy metrics in response');
    }

    return data;

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      results.warnings.push('⚠️  Backend server not running (Connection refused)');
      results.warnings.push(`   Expected server at: ${BASE_URL}`);
    } else {
      results.failed.push(`❌ Error training model: ${error.message}`);
    }
    return null;
  }
}

/**
 * Test 2: Verify Accuracy Metrics Stored
 */
async function testGetModelAccuracy() {
  console.log('\n📈 Test 2: Checking Model Accuracy Metrics...');

  try {
    const response = await makeRequest({
      url: '/ai-predictive/model-accuracy',
      method: 'GET'
    });

    console.log(`   Status Code: ${response.statusCode}`);

    if (response.statusCode === 401) {
      results.warnings.push('⚠️  Authentication required for accuracy endpoint');
      return;
    }

    if (response.statusCode === 200) {
      results.passed.push('✅ Model accuracy endpoint accessible');

      const data = response.data.data || response.data;

      if (data.accuracy !== undefined) {
        results.passed.push('✅ Accuracy metrics stored and retrievable');
      } else {
        results.warnings.push('⚠️  No accuracy metrics found (model may not be trained yet)');
      }
    }

  } catch (error) {
    if (error.code !== 'ECONNREFUSED') {
      results.warnings.push(`⚠️  Could not verify accuracy metrics: ${error.message}`);
    }
  }
}

/**
 * Test 3: Verify Predictions Generated
 */
async function testGetPredictions() {
  console.log('\n🎯 Test 3: Verifying Predictions Generated...');

  try {
    const response = await makeRequest({
      url: '/ai-predictive/employee-predictions',
      method: 'GET'
    });

    console.log(`   Status Code: ${response.statusCode}`);

    if (response.statusCode === 401) {
      results.warnings.push('⚠️  Authentication required for predictions endpoint');
      return;
    }

    if (response.statusCode === 200) {
      results.passed.push('✅ Employee predictions endpoint accessible');

      const data = response.data.data || response.data;

      if (data.predictions && Array.isArray(data.predictions)) {
        if (data.predictions.length > 0) {
          results.passed.push(`✅ Predictions generated for ${data.predictions.length} employees`);

          // Verify prediction structure
          const sample = data.predictions[0];
          if (sample.absenceLikelihood !== undefined) {
            results.passed.push('✅ Predictions include absence likelihood scores');
          }
          if (sample.riskLevel) {
            results.passed.push('✅ Predictions include risk levels');
          }
          if (sample.contributingFactors) {
            results.passed.push('✅ Predictions include contributing factors');
          }
        } else {
          results.warnings.push('⚠️  No predictions found (no employees or insufficient data)');
        }
      } else {
        results.warnings.push('⚠️  Unexpected predictions response format');
      }
    }

  } catch (error) {
    if (error.code !== 'ECONNREFUSED') {
      results.warnings.push(`⚠️  Could not verify predictions: ${error.message}`);
    }
  }
}

/**
 * Print Test Results
 */
function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  if (results.passed.length > 0) {
    console.log('\n✅ PASSED TESTS:');
    results.passed.forEach(msg => console.log(`   ${msg}`));
  }

  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.failed.forEach(msg => console.log(`   ${msg}`));
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    results.warnings.forEach(msg => console.log(`   ${msg}`));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${results.passed.length} passed, ${results.failed.length} failed, ${results.warnings.length} warnings`);
  console.log('='.repeat(60) + '\n');

  // Return exit code
  return results.failed.length === 0 ? 0 : 1;
}

/**
 * Main Test Runner
 */
async function runTests() {
  console.log('🧪 ML Training Integration Test');
  console.log('================================\n');
  console.log(`Testing endpoint: ${BASE_URL}/ai-predictive/train-model`);
  console.log(`Auth Token: ${AUTH_TOKEN ? 'Provided' : 'Not provided (may cause 401 errors)'}\n`);

  // Run tests
  await testTrainModel();
  await testGetModelAccuracy();
  await testGetPredictions();

  // Print results
  const exitCode = printResults();

  // Provide guidance
  if (results.warnings.some(w => w.includes('not running'))) {
    console.log('💡 To run the backend server:');
    console.log('   cd backend');
    console.log('   npm run start:dev');
    console.log('');
  }

  if (results.warnings.some(w => w.includes('Authentication required'))) {
    console.log('💡 To test with authentication:');
    console.log('   1. Start the backend server');
    console.log('   2. Login and get an auth token');
    console.log('   3. Run: TEST_AUTH_TOKEN=your_token node test-ml-training.js');
    console.log('');
  }

  process.exit(exitCode);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
