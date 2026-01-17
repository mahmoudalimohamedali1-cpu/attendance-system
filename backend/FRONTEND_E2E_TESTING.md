# Frontend Dashboard End-to-End Testing Guide

## 🎯 Purpose
This document provides comprehensive end-to-end testing instructions for the AI Predictive Absence Analytics frontend dashboard.

## 📋 Subtask 7-4 Verification Steps

### Prerequisites
Before testing, ensure the following are ready:

1. **Backend Server Running**
   ```bash
   cd backend
   npm run start:dev
   ```
   - Should be running on http://localhost:3001
   - Database migrations applied: `npx prisma migrate dev`

2. **Frontend Development Server Running**
   ```bash
   cd web-admin
   npm run dev
   ```
   - Should be running on http://localhost:5173

3. **Test Data Available**
   - Historical attendance data (90+ days recommended)
   - At least 5-10 employees with attendance records
   - Some approved leave requests for post-holiday pattern detection
   - ML model trained (call POST /ai-predictive/train-model)

4. **Authentication**
   - Valid user account (ADMIN, HR, or MANAGER role)
   - Able to log in to web-admin

---

## 🧪 Test Cases

### Test Case 1: Open AI Predictive Page in Browser
**Verification Step 1**

**Steps:**
1. Navigate to http://localhost:5173
2. Log in with valid credentials (ADMIN, HR, or MANAGER)
3. Locate the navigation menu in the sidebar
4. Click on "📊 التحليلات التنبؤية" (Predictive Analytics)
5. Verify the URL changes to http://localhost:5173/ai-predictive

**Expected Results:**
- ✅ Menu item "📊 التحليلات التنبؤية" is visible in sidebar
- ✅ Clicking navigates to /ai-predictive route
- ✅ Page loads without errors
- ✅ Page header displays: "🤖 التحليلات التنبؤية بالذكاء الاصطناعي"
- ✅ Page subtitle shows: "AI-Powered Predictive Absence Analytics"
- ✅ No console errors in browser DevTools
- ✅ Loading states display while data is fetching

**Potential Issues:**
- If menu item not visible: Check MainLayout.tsx allMenuItems array
- If route doesn't work: Check App.tsx route configuration
- If page doesn't render: Check browser console for errors

---

### Test Case 2: Verify Absence Forecast Shows
**Verification Step 2**

**Component:** AbsenceForecast

**Steps:**
1. Ensure you're on the AI Predictive page
2. Locate the "Absence Forecast" section at the top of the page
3. Verify all 4 metric cards are visible:
   - Expected Attendance Rate (%)
   - Expected Absences
   - High-Risk Employees
   - Average Absence Likelihood

**Expected Results:**
- ✅ AbsenceForecast component renders at the top (full width)
- ✅ 4 metric cards display with appropriate icons and values
- ✅ Expected Attendance Rate shows percentage with green progress bar
- ✅ Expected Absences shows count with total employees context
- ✅ High-Risk Employees shows count with color-coded chip (red if high, green if low)
- ✅ Average Absence Likelihood shows percentage with trend indicator (↑/↓/-)
- ✅ Risk Distribution pie chart renders with color coding:
   - Green for LOW risk
   - Orange for MEDIUM risk
   - Red for HIGH risk
- ✅ AI Insights section displays with context-aware alerts:
   - Success (green) if metrics are within normal range
   - Warning (yellow) if >15% high-risk or >30% medium-risk
   - Error (red) if average likelihood >25%
- ✅ Generation timestamp shown in Arabic at bottom
- ✅ Data auto-refreshes every 5 minutes

**Potential Issues:**
- If "No predictions available" shows: Train ML model first (POST /ai-predictive/train-model)
- If error message shows: Check backend API is running and accessible
- If loading forever: Check network tab for API call errors
- If pie chart not rendering: Check Recharts library is installed

---

### Test Case 3: Verify Employee Risk Scores Table Populates
**Verification Step 3**

**Component:** EmployeeRiskScores

**Steps:**
1. Scroll down to the "Employee Risk Scores" section (left column, large width)
2. Verify the table header shows columns:
   - Employee Name (sortable)
   - Absence Likelihood (sortable)
   - Risk Level (sortable)
   - Contributing Factors
   - Details (expand icon)
3. Click on column headers to test sorting
4. Click on expand icon for one or more employees

**Expected Results:**
- ✅ EmployeeRiskScores component renders with Material-UI table
- ✅ Table displays list of employees with predictions
- ✅ Default sort: Highest absence likelihood first (descending)
- ✅ Employee Name column shows full employee names
- ✅ Absence Likelihood column shows:
   - Percentage value (0-100%)
   - Color coding (red ≥60%, orange 30-60%, green <30%)
   - Trend icon (↑ for high, ↓ for low, - for medium)
- ✅ Risk Level column shows color-coded chips:
   - GREEN chip for "منخفض" (LOW)
   - ORANGE chip for "متوسط" (MEDIUM)
   - RED chip for "عالي" (HIGH)
   - DARK RED chip for "حرج" (CRITICAL)
- ✅ Contributing Factors column shows count (e.g., "5 عوامل")
- ✅ Clicking table headers sorts data correctly:
   - Name: Alphabetical (A-Z / Z-A)
   - Likelihood: Numeric (High-Low / Low-High)
   - Risk Level: Severity (HIGH-LOW / LOW-HIGH)
- ✅ Clicking expand icon reveals:
   - Full list of contributing factors in Arabic
   - Department comparison text (if available)
   - Clean, indented layout with background color
- ✅ Pagination controls work (if >10 employees)
- ✅ Rows per page selector works (10, 25, 50)
- ✅ Empty state shows if no predictions: "لا توجد توقعات متاحة"

**Potential Issues:**
- If empty table shows: Verify predictions were generated (GET /ai-predictive/employee-predictions)
- If sorting doesn't work: Check TableSortLabel configuration
- If expand doesn't work: Check expandedRows state management
- If contributing factors empty: Check backend prediction service returns contributingFactors array

---

### Test Case 4: Verify Patterns Are Displayed
**Verification Step 4**

**Component:** PatternInsights

**Steps:**
1. Scroll down to the "Detected Patterns" section at the bottom (full width)
2. Verify pattern cards are displayed
3. Check each pattern shows appropriate information
4. Verify different pattern types are color-coded

**Expected Results:**
- ✅ PatternInsights component renders with grid of pattern cards
- ✅ Summary card at top shows:
   - Total patterns detected count
   - Last update timestamp in Arabic
- ✅ Each pattern card displays:
   - Pattern type icon (Calendar, TrendingUp, Loop, BusinessCenter, People)
   - Pattern type label in Arabic:
     * "أيام الأسبوع" (Weekday patterns)
     * "ما بعد الإجازة" (Post-holiday)
     * "موسمي" (Seasonal)
     * "القسم" (Department)
     * "متكرر" (Repeated)
   - Confidence chip with color coding:
     * GREEN (success) for ≥80% confidence
     * ORANGE (warning) for 60-79% confidence
     * RED (error) for <60% confidence
   - Pattern description in Arabic
   - Affected employees count with People icon
   - Confidence percentage
   - Insights and recommendations as bullet points
   - Detection timestamp with Arabic date format
- ✅ Grid layout: 2 columns on medium+ screens, 1 column on small screens
- ✅ Empty state if no patterns: Info message "لم يتم اكتشاف أنماط بعد"
- ✅ Data auto-refreshes every 5 minutes

**Expected Pattern Types:**
1. **WEEKDAY** - Weekend-adjacent patterns (Monday/Friday absences)
2. **POST_HOLIDAY** - Post-holiday absence patterns
3. **SEASONAL** - Monthly/seasonal trend variations
4. **DEPARTMENT** - Department-specific patterns
5. **REPEATED** - Repeated absence sequences

**Potential Issues:**
- If "No patterns detected" shows: Backend may need more historical data (90+ days)
- If error shows: Check GET /ai-predictive/patterns endpoint
- If loading forever: Check network tab for API errors
- If confidence values wrong: Verify backend pattern-detection service

---

### Test Case 5: Verify Accuracy Metrics Are Shown
**Verification Step 5**

**Component:** ModelAccuracy

**Steps:**
1. Locate the "Model Accuracy" section (right column, small width on large screens)
2. Verify all 4 metrics are displayed with progress bars
3. Check quality status chip
4. Verify model information section

**Expected Results:**
- ✅ ModelAccuracy component renders in right column
- ✅ Quality status chip displays at top:
   - "ممتاز" (Excellent) - Green for ≥85% accuracy
   - "جيد" (Good) - Blue for 75-84% accuracy
   - "مقبول" (Acceptable) - Orange for 65-74% accuracy
   - "يحتاج تحسين" (Needs Improvement) - Red for <65% accuracy
- ✅ All 4 metrics display with LinearProgress bars:
   1. **Accuracy (الدقة الإجمالية)** - Blue/primary color
      - Percentage value (0-100%)
      - Caption: "نسبة التوقعات الصحيحة من إجمالي التوقعات"
   2. **Precision (الدقة الموجبة)** - Cyan/info color
      - Percentage value (0-100%)
      - Caption: "نسبة الغيابات المتوقعة التي حدثت فعلاً"
   3. **Recall (الاستدعاء)** - Purple/secondary color
      - Percentage value (0-100%)
      - Caption: "نسبة الغيابات الفعلية التي تم التنبؤ بها"
   4. **F1 Score (درجة F1)** - Orange/warning color
      - Percentage value (0-100%)
      - Caption: "المتوسط التوافقي للدقة والاستدعاء"
- ✅ Progress bars have 8px height and show value visually
- ✅ Grid layout: 2x2 (2 metrics per row)
- ✅ Model Information section shows:
   - Model Version with Info icon (e.g., "v1.0_20260117")
   - Last Evaluation date with Update icon (Arabic formatted date)
   - Prediction Count with Analytics icon (Arabic number format)
- ✅ Contextual Insights display based on accuracy:
   - Success alert (≥85%): Model reliable for decision-making
   - Info alert (75-84%): Good, can improve with more data
   - Warning alert (<75%): Needs improvement, retrain recommended
- ✅ Empty state if model not trained: "لم يتم تدريب النموذج بعد"
- ✅ Data auto-refreshes every 5 minutes

**Potential Issues:**
- If "Model not trained" shows: Train model first (POST /ai-predictive/train-model)
- If metrics show 0%: Backend may not have sufficient data for evaluation
- If error shows: Check GET /ai-predictive/model-accuracy endpoint
- If progress bars not rendering: Check Material-UI LinearProgress component

---

### Test Case 6: Click on Employee to See Explanation
**Verification Step 6**

**Component:** EmployeeRiskScores (expandable rows)

**Steps:**
1. In the Employee Risk Scores table, locate an employee row
2. Click the expand icon (chevron) on the right side of the row
3. Verify the row expands to show additional details
4. Review the contributing factors and department comparison
5. Click the expand icon again to collapse

**Expected Results:**
- ✅ Clicking expand icon toggles row expansion smoothly
- ✅ Expanded row shows:
   - **Contributing Factors section:**
     - Header: "العوامل المساهمة" (Contributing Factors)
     - Bulleted list of factors in Arabic
     - Each factor explains why absence likelihood is high/low
     - Examples:
       * "نسبة الغياب التاريخية: XX%" (Historical absence rate)
       * "احتمالية الغياب حسب يوم الأسبوع: XX%" (Day of week risk)
       * "اتجاه الغيابات الحديثة: XX%" (Recent trend)
       * "رصيد الإجازات المتبقية: XX يوم" (Leave balance)
       * And others depending on prediction
   - **Department Comparison (if available):**
     - Text showing how employee compares to department average
     - Format: "الموظف أعلى/أقل من متوسط القسم بنسبة XX%"
   - **Visual styling:**
     - Background color different from normal rows (light gray/blue tint)
     - Indented content for readability
     - Proper spacing between sections
- ✅ Collapse animation works smoothly
- ✅ Multiple rows can be expanded simultaneously
- ✅ ARIA labels for accessibility

**Detailed Explanation Alternative:**
For more detailed explanation, you can also test:
1. Note an employee's userId from the table or network request
2. Manually call: GET /ai-predictive/employee-predictions/:userId
3. Response should include full PredictionExplanation object with:
   - summary (one-line overview)
   - riskLevel and likelihood
   - topFactors array (ranked by weight)
   - detailedExplanation (comprehensive Arabic text)
   - recommendations (actionable HR suggestions)

**Potential Issues:**
- If expand doesn't work: Check expandedRows state and onClick handler
- If contributing factors empty: Backend prediction service not returning contributingFactors
- If no department comparison: Employee may not have recent department data
- If layout broken: Check CSS/Material-UI Collapse component

---

### Test Case 7: Click 'Train Model' Button and Verify It Works
**Verification Step 7**

**Component:** AiPredictivePage (main page with action buttons)

**Steps:**
1. Locate the "Train Model" button in the top-right corner of the page
2. Note the current model version and metrics (if visible)
3. Click the "Train Model" button
4. Observe the button state and wait for completion
5. Verify success notification appears
6. Check that metrics update with new values

**Expected Results:**
- ✅ "Train Model" button visible in top-right with ModelTraining icon
- ✅ Clicking button triggers mutation:
   - Button shows loading state (CircularProgress spinner)
   - Button text changes or becomes disabled
   - POST /ai-predictive/train-model API call made
- ✅ During training (may take 5-30 seconds depending on data):
   - Button shows loading indicator
   - Button disabled to prevent multiple clicks
   - No page refresh or navigation
- ✅ On success:
   - Snackbar notification appears at bottom with:
     * Success alert (green background)
     * Arabic message: "تم تدريب النموذج بنجاح! الدقة: XX.XX%"
     * Auto-hide after 6 seconds
     * Close button to dismiss manually
   - All data queries invalidated and refetched:
     * employee-predictions query refetches
     * absence-patterns query refetches
     * model-accuracy query refetches
   - Components update with new data automatically
   - Model version updates in ModelAccuracy component
   - New accuracy metrics display
   - Button returns to normal state
- ✅ On error:
   - Snackbar notification appears with:
     * Error alert (red background)
     * Arabic error message: "فشل تدريب النموذج: [error details]"
     * Auto-hide after 6 seconds
   - Button returns to normal state
   - User can retry

**Additional Actions:**
- **Refresh Button** (next to Train Model):
  - Clicking invalidates all queries
  - All components refetch data
  - Info snackbar shows: "تم تحديث البيانات"
  - No API mutation, just refetch

**Potential Issues:**
- If button doesn't respond: Check useMutation hook and mutation function
- If loading state doesn't show: Check isLoading state from mutation
- If no snackbar appears: Check snackbar state management
- If data doesn't update: Check queryClient.invalidateQueries calls
- If training fails: Check backend has sufficient historical data (180+ days, 30+ records)
- If error "Insufficient data": Need more attendance records in database

---

## 🔍 Additional Verification Checks

### Browser Console Checks
Open Browser DevTools (F12) → Console tab

**Expected:**
- ✅ No console errors (red messages)
- ✅ No console warnings about missing dependencies
- ✅ No React warnings about keys or hooks
- ✅ API calls succeed (check Network tab)
- ✅ No CORS errors

**Acceptable:**
- Info logs about query refetching (React Query)
- Development mode warnings (only in dev)

### Network Tab Checks
Open Browser DevTools (F12) → Network tab

**Expected API Calls:**
1. `GET /ai-predictive/employee-predictions` → 200 OK
2. `GET /ai-predictive/patterns` → 200 OK
3. `GET /ai-predictive/model-accuracy` → 200 OK
4. `POST /ai-predictive/train-model` (when button clicked) → 200/201 OK

**Verify:**
- ✅ All API calls return status 200/201 (success)
- ✅ Response bodies contain expected data structures
- ✅ Authorization headers present (Bearer token)
- ✅ No 401 (unauthorized) or 403 (forbidden) errors
- ✅ No 500 (server error) responses

### Responsive Design Checks

**Desktop (≥1200px):**
- ✅ AbsenceForecast: Full width
- ✅ EmployeeRiskScores: 8/12 width (left column)
- ✅ ModelAccuracy: 4/12 width (right column)
- ✅ PatternInsights: Full width
- ✅ Pattern cards: 2 columns

**Tablet (768px - 1199px):**
- ✅ All components stack vertically (full width)
- ✅ Pattern cards: 2 columns
- ✅ Table scrollable horizontally if needed

**Mobile (<768px):**
- ✅ All components stack vertically (full width)
- ✅ Pattern cards: 1 column
- ✅ Table scrollable horizontally
- ✅ Action buttons may stack or resize

### Accessibility Checks

**Expected:**
- ✅ Semantic HTML structure (headers, sections, tables)
- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation works (Tab, Enter, Space)
- ✅ Screen reader can read all content
- ✅ Color contrast meets WCAG standards
- ✅ Focus indicators visible

---

## 📊 Data Requirements for Complete Testing

To fully test all features, ensure the following data exists:

### Minimum Data Requirements:
- **Employees:** At least 10 active employees
- **Attendance Records:** 90-180 days of historical data
- **Absences:** Mix of approved/unapproved absences
- **Leave Requests:** Some approved leave requests
- **Departments:** Multiple departments for comparison
- **Variety:** Different absence patterns (Monday, post-holiday, etc.)

### Recommended Data for Robust Testing:
- **Employees:** 50+ employees across multiple departments
- **Attendance Records:** 180+ days (6 months) for accurate trends
- **Absences:** 100+ absence records with various patterns
- **Leave Requests:** 50+ approved leave requests
- **New Employees:** Some employees with <6 months tenure
- **High-Risk Employees:** Some with >60% absence rate

---

## ✅ Success Criteria Summary

Subtask 7-4 is considered **COMPLETE** when all of the following are verified:

1. ✅ **Page Access:** AI Predictive page accessible via navigation menu at /ai-predictive
2. ✅ **AbsenceForecast:** Component renders with 4 metrics, pie chart, and insights
3. ✅ **EmployeeRiskScores:** Table populates with sortable columns, expandable rows show contributing factors
4. ✅ **PatternInsights:** Pattern cards display with appropriate icons, confidence, and insights
5. ✅ **ModelAccuracy:** All 4 metrics (accuracy, precision, recall, F1) display with progress bars
6. ✅ **Expandable Details:** Clicking expand icon shows detailed contributing factors for employees
7. ✅ **Train Model:** Button triggers training, shows loading state, displays success notification, updates data
8. ✅ **No Errors:** Browser console shows no errors, all API calls succeed
9. ✅ **Auto-Refresh:** Components auto-refresh data every 5 minutes
10. ✅ **Responsive:** Page layout adapts to different screen sizes
11. ✅ **Arabic Support:** All text displays correctly in Arabic with proper formatting

---

## 🐛 Troubleshooting Common Issues

### Issue: "No predictions available" or "No patterns detected"

**Cause:** ML model not trained or insufficient data

**Solution:**
1. Train model: Click "Train Model" button or call `POST /ai-predictive/train-model`
2. Wait for training to complete (may take 10-30 seconds)
3. Verify backend has sufficient historical data (90+ days, 30+ records)
4. Check backend logs for training errors

### Issue: "Failed to fetch" or API errors

**Cause:** Backend not running or CORS issues

**Solution:**
1. Verify backend is running: `cd backend && npm run start:dev`
2. Check backend is accessible at http://localhost:3001
3. Verify CORS configuration in backend (should allow http://localhost:5173)
4. Check authentication token is valid and not expired

### Issue: Components not rendering or "undefined" errors

**Cause:** Missing dependencies or TypeScript errors

**Solution:**
1. Install dependencies: `cd web-admin && npm install`
2. Check all imports are correct
3. Verify TypeScript compilation: `npm run build`
4. Clear browser cache and refresh

### Issue: Data not updating after training

**Cause:** Query invalidation not working

**Solution:**
1. Check queryClient.invalidateQueries calls in AiPredictivePage.tsx
2. Verify query keys match: 'employee-predictions', 'absence-patterns', 'model-accuracy'
3. Check React Query DevTools for query states
4. Try manual refresh button

### Issue: Sorting or pagination not working

**Cause:** Table state management issue

**Solution:**
1. Check orderBy and order state in EmployeeRiskScores.tsx
2. Verify comparator function is correct
3. Check pagination state (page, rowsPerPage)
4. Inspect table data in React DevTools

---

## 📝 Manual Testing Checklist

Use this checklist to verify all functionality:

### Page Access
- [ ] Navigate to http://localhost:5173
- [ ] Log in successfully
- [ ] Sidebar shows "📊 التحليلات التنبؤية" menu item
- [ ] Click menu item navigates to /ai-predictive
- [ ] Page loads without errors

### AbsenceForecast Component
- [ ] Component renders at top of page
- [ ] 4 metric cards display with correct values
- [ ] Expected attendance rate shows percentage and progress bar
- [ ] Expected absences shows count
- [ ] High-risk employees shows count with color chip
- [ ] Average likelihood shows percentage with trend icon
- [ ] Pie chart renders with color-coded sections
- [ ] AI insights display appropriate alerts
- [ ] Timestamp shows in Arabic format

### EmployeeRiskScores Component
- [ ] Table renders with employee data
- [ ] Default sort: Highest likelihood first
- [ ] Employee name column displays correctly
- [ ] Absence likelihood shows percentage, color, trend icon
- [ ] Risk level shows color-coded chips
- [ ] Contributing factors column shows count
- [ ] Clicking column headers sorts correctly
- [ ] Clicking expand icon reveals details
- [ ] Expanded row shows contributing factors list
- [ ] Expanded row shows department comparison (if available)
- [ ] Collapse works when clicking icon again
- [ ] Pagination controls work (if applicable)

### PatternInsights Component
- [ ] Component renders at bottom of page
- [ ] Summary card shows total patterns and timestamp
- [ ] Pattern cards display in grid layout
- [ ] Each card shows appropriate icon for pattern type
- [ ] Pattern type label in Arabic
- [ ] Confidence chip with correct color
- [ ] Pattern description in Arabic
- [ ] Affected employees count
- [ ] Confidence percentage
- [ ] Insights/recommendations list
- [ ] Detection timestamp in Arabic

### ModelAccuracy Component
- [ ] Component renders in right column
- [ ] Quality status chip displays with correct color
- [ ] All 4 metrics display (Accuracy, Precision, Recall, F1)
- [ ] Each metric shows percentage value
- [ ] Progress bars render correctly
- [ ] Each metric has caption in Arabic
- [ ] Model version displays
- [ ] Last evaluation date in Arabic
- [ ] Prediction count in Arabic numbers
- [ ] Contextual insight alert displays

### Train Model Functionality
- [ ] "Train Model" button visible in top-right
- [ ] Clicking button shows loading state
- [ ] Button disabled during training
- [ ] Training completes successfully
- [ ] Success snackbar appears with accuracy percentage
- [ ] Snackbar auto-hides after 6 seconds
- [ ] All components refresh with new data
- [ ] Model version updates
- [ ] Accuracy metrics update

### Additional Checks
- [ ] "Refresh" button invalidates and refetches data
- [ ] No console errors in browser DevTools
- [ ] All API calls return 200/201 status
- [ ] Auto-refresh works (wait 5+ minutes to verify)
- [ ] Responsive design works on different screen sizes
- [ ] Arabic text displays correctly throughout
- [ ] Date/number formatting uses Arabic locale

---

## 🎉 Completion Status

When all verification steps pass and the checklist is complete:

**Status:** ✅ **READY FOR PRODUCTION**

The AI Predictive Absence Analytics frontend dashboard is fully functional and ready for end users. All components render correctly, data displays accurately, interactions work as expected, and the user experience is smooth and responsive.

---

## 📅 Testing Date

**Tested By:** [Tester Name]
**Date:** [YYYY-MM-DD]
**Environment:** Development (http://localhost:5173)
**Backend Version:** [Backend commit/version]
**Frontend Version:** [Frontend commit/version]
**Browser:** [Chrome/Firefox/Safari/Edge] [Version]

---

## 📸 Screenshots (Optional)

For documentation purposes, capture screenshots of:
1. Full AI Predictive page view
2. AbsenceForecast component with data
3. EmployeeRiskScores table
4. Expanded employee row showing contributing factors
5. PatternInsights cards
6. ModelAccuracy metrics
7. Train Model success notification
8. Mobile responsive view

---

**End of Frontend E2E Testing Guide**
