/**
 * 🧪 Integration Test for Employee Predictions Endpoint
 *
 * This script tests the employee predictions endpoints to verify
 * individual employee absence predictions with explanations.
 *
 * Test Steps:
 * 1. Call GET /ai-predictive/employee-predictions
 * 2. Verify all employees have likelihood scores
 * 3. Call GET /ai-predictive/employee-predictions/:id
 * 4. Verify explanation is provided with contributing factors
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
 * Test 1: Get All Employee Predictions
 */
async function testGetAllEmployeePredictions() {
  console.log('\n🎯 Test 1: Getting All Employee Predictions...');

  try {
    const response = await makeRequest({
      url: '/ai-predictive/employee-predictions',
      method: 'GET'
    });

    console.log(`   Status Code: ${response.statusCode}`);

    // Verify status code
    if (response.statusCode === 200) {
      results.passed.push('✅ Employee predictions endpoint returned success status');
    } else if (response.statusCode === 401) {
      results.warnings.push('⚠️  Authentication required - need valid token');
      return null;
    } else {
      results.failed.push(`❌ Expected 200, got ${response.statusCode}`);
      return null;
    }

    // Verify response structure
    const data = response.data.data || response.data;

    if (data.success !== undefined) {
      if (data.success) {
        results.passed.push('✅ Predictions request reported success');
      } else {
        results.failed.push(`❌ Predictions request failed: ${data.message || 'unknown error'}`);
        return null;
      }
    }

    // Check for predictions array
    if (!data.predictions || !Array.isArray(data.predictions)) {
      results.failed.push('❌ Response missing predictions array');
      return null;
    }

    const predictions = data.predictions;

    if (predictions.length === 0) {
      results.warnings.push('⚠️  No predictions found (no employees or model not trained)');
      return null;
    }

    results.passed.push(`✅ Found predictions for ${predictions.length} employees`);

    // Verify each prediction has required fields
    let allHaveLikelihood = true;
    let allHaveRiskLevel = true;
    let allHaveContributingFactors = true;

    for (const prediction of predictions) {
      if (prediction.absenceLikelihood === undefined) {
        allHaveLikelihood = false;
      }
      if (!prediction.riskLevel) {
        allHaveRiskLevel = false;
      }
      if (!prediction.contributingFactors || !Array.isArray(prediction.contributingFactors)) {
        allHaveContributingFactors = false;
      }
    }

    if (allHaveLikelihood) {
      results.passed.push('✅ All employees have absence likelihood scores');
    } else {
      results.failed.push('❌ Some employees missing absence likelihood scores');
    }

    if (allHaveRiskLevel) {
      results.passed.push('✅ All employees have risk levels');
    } else {
      results.failed.push('❌ Some employees missing risk levels');
    }

    if (allHaveContributingFactors) {
      results.passed.push('✅ All employees have contributing factors');
    } else {
      results.failed.push('❌ Some employees missing contributing factors');
    }

    // Display sample prediction
    const sample = predictions[0];
    console.log(`   Sample Prediction:`);
    console.log(`     - Employee: ${sample.employeeName || sample.userId}`);
    console.log(`     - Likelihood: ${sample.absenceLikelihood}%`);
    console.log(`     - Risk Level: ${sample.riskLevel}`);
    console.log(`     - Contributing Factors: ${sample.contributingFactors.length} factors`);

    // Check likelihood score range (0-100)
    const validLikelihood = predictions.every(p =>
      p.absenceLikelihood >= 0 && p.absenceLikelihood <= 100
    );

    if (validLikelihood) {
      results.passed.push('✅ All likelihood scores in valid range (0-100)');
    } else {
      results.failed.push('❌ Some likelihood scores out of valid range');
    }

    // Check risk level values
    const validRiskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const validRisks = predictions.every(p =>
      validRiskLevels.includes(p.riskLevel)
    );

    if (validRisks) {
      results.passed.push('✅ All risk levels are valid (LOW/MEDIUM/HIGH/CRITICAL)');
    } else {
      results.failed.push('❌ Some risk levels have invalid values');
    }

    return predictions;

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      results.warnings.push('⚠️  Backend server not running (Connection refused)');
      results.warnings.push(`   Expected server at: ${BASE_URL}`);
    } else {
      results.failed.push(`❌ Error getting predictions: ${error.message}`);
    }
    return null;
  }
}

/**
 * Test 2: Get Individual Employee Prediction with Explanation
 */
async function testGetEmployeePredictionWithExplanation(predictions) {
  console.log('\n📖 Test 2: Getting Individual Employee Prediction with Explanation...');

  if (!predictions || predictions.length === 0) {
    results.warnings.push('⚠️  Skipping individual prediction test (no predictions available)');
    return;
  }

  try {
    // Get first employee's ID
    const employeeId = predictions[0].userId;

    const response = await makeRequest({
      url: `/ai-predictive/employee-predictions/${employeeId}`,
      method: 'GET'
    });

    console.log(`   Status Code: ${response.statusCode}`);
    console.log(`   Testing employee ID: ${employeeId}`);

    // Verify status code
    if (response.statusCode === 200) {
      results.passed.push('✅ Individual employee prediction endpoint returned success status');
    } else if (response.statusCode === 401) {
      results.warnings.push('⚠️  Authentication required for individual prediction');
      return;
    } else {
      results.failed.push(`❌ Expected 200, got ${response.statusCode}`);
      return;
    }

    // Verify response structure
    const data = response.data.data || response.data;

    if (data.success !== undefined) {
      if (data.success) {
        results.passed.push('✅ Individual prediction request reported success');
      } else {
        results.failed.push(`❌ Individual prediction request failed: ${data.message || 'unknown error'}`);
        return;
      }
    }

    // Check for prediction object
    if (!data.prediction) {
      results.failed.push('❌ Response missing prediction object');
      return;
    }

    results.passed.push('✅ Prediction object present in response');

    // Check for explanation object
    if (!data.explanation) {
      results.failed.push('❌ Response missing explanation object');
      return;
    }

    results.passed.push('✅ Explanation object present in response');

    const explanation = data.explanation;

    // Verify explanation structure
    if (explanation.summary) {
      results.passed.push('✅ Explanation includes summary');
    } else {
      results.failed.push('❌ Explanation missing summary');
    }

    if (explanation.riskLevel) {
      results.passed.push('✅ Explanation includes risk level');
    } else {
      results.failed.push('❌ Explanation missing risk level');
    }

    if (explanation.likelihood !== undefined) {
      results.passed.push('✅ Explanation includes likelihood score');
    } else {
      results.failed.push('❌ Explanation missing likelihood score');
    }

    // Check for top factors (feature importance)
    if (explanation.topFactors && Array.isArray(explanation.topFactors)) {
      if (explanation.topFactors.length > 0) {
        results.passed.push(`✅ Explanation includes ${explanation.topFactors.length} top contributing factors`);

        // Verify factor structure
        const factor = explanation.topFactors[0];
        if (factor.feature && factor.impact && factor.description) {
          results.passed.push('✅ Contributing factors have proper structure (feature, impact, description)');
        } else {
          results.warnings.push('⚠️  Contributing factors missing some fields');
        }

        // Display sample factors
        console.log(`   Top Contributing Factors:`);
        explanation.topFactors.slice(0, 3).forEach((factor, idx) => {
          console.log(`     ${idx + 1}. ${factor.feature} (${factor.impact})`);
          console.log(`        ${factor.description}`);
        });
      } else {
        results.warnings.push('⚠️  No top factors found in explanation');
      }
    } else {
      results.failed.push('❌ Explanation missing topFactors array');
    }

    // Check for detailed explanation
    if (explanation.detailedExplanation) {
      results.passed.push('✅ Detailed explanation provided');

      if (explanation.detailedExplanation.length > 50) {
        results.passed.push('✅ Detailed explanation is comprehensive (>50 characters)');
      } else {
        results.warnings.push('⚠️  Detailed explanation seems too short');
      }
    } else {
      results.failed.push('❌ Explanation missing detailed explanation text');
    }

    // Check for recommendations
    if (explanation.recommendations && Array.isArray(explanation.recommendations)) {
      if (explanation.recommendations.length > 0) {
        results.passed.push(`✅ Explanation includes ${explanation.recommendations.length} recommendations`);

        console.log(`   Recommendations:`);
        explanation.recommendations.forEach((rec, idx) => {
          console.log(`     ${idx + 1}. ${rec}`);
        });
      } else {
        results.warnings.push('⚠️  No recommendations in explanation');
      }
    } else {
      results.warnings.push('⚠️  Explanation missing recommendations array');
    }

  } catch (error) {
    if (error.code !== 'ECONNREFUSED') {
      results.failed.push(`❌ Error getting individual prediction: ${error.message}`);
    }
  }
}

/**
 * Test 3: Verify Explanation Quality
 */
async function testExplanationQuality(predictions) {
  console.log('\n🔍 Test 3: Verifying Explanation Quality...');

  if (!predictions || predictions.length === 0) {
    results.warnings.push('⚠️  Skipping explanation quality test (no predictions available)');
    return;
  }

  try {
    // Test multiple employees if available
    const employeesToTest = predictions.slice(0, Math.min(3, predictions.length));
    let allHaveExplanations = true;
    let allHaveHumanReadable = true;

    for (const prediction of employeesToTest) {
      const response = await makeRequest({
        url: `/ai-predictive/employee-predictions/${prediction.userId}`,
        method: 'GET'
      });

      if (response.statusCode === 200) {
        const data = response.data.data || response.data;

        if (!data.explanation) {
          allHaveExplanations = false;
        } else {
          // Check if explanation is human-readable (has Arabic text or descriptive English)
          const exp = data.explanation;
          if (exp.detailedExplanation && exp.detailedExplanation.length > 20) {
            // OK
          } else {
            allHaveHumanReadable = false;
          }
        }
      }
    }

    if (allHaveExplanations) {
      results.passed.push('✅ All tested employees have explanations');
    } else {
      results.failed.push('❌ Some employees missing explanations');
    }

    if (allHaveHumanReadable) {
      results.passed.push('✅ Explanations are human-readable (not black box)');
    } else {
      results.failed.push('❌ Some explanations are not sufficiently detailed');
    }

  } catch (error) {
    if (error.code !== 'ECONNREFUSED') {
      results.warnings.push(`⚠️  Could not verify explanation quality: ${error.message}`);
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
  console.log('🧪 Employee Predictions Integration Test');
  console.log('=========================================\n');
  console.log(`Testing endpoint: ${BASE_URL}/ai-predictive/employee-predictions`);
  console.log(`Auth Token: ${AUTH_TOKEN ? 'Provided' : 'Not provided (may cause 401 errors)'}\n`);

  // Run tests
  const predictions = await testGetAllEmployeePredictions();
  await testGetEmployeePredictionWithExplanation(predictions);
  await testExplanationQuality(predictions);

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
    console.log('   3. Run: TEST_AUTH_TOKEN=your_token node test-employee-predictions.js');
    console.log('');
  }

  if (results.warnings.some(w => w.includes('model not trained'))) {
    console.log('💡 To train the ML model first:');
    console.log('   curl -X POST http://localhost:3001/ai-predictive/train-model \\');
    console.log('     -H "Authorization: Bearer YOUR_TOKEN"');
    console.log('');
  }

  process.exit(exitCode);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
