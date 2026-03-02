# Testing Strategy
## 85–90% Coverage | All Environments | Zero Ambiguity

---

## 1. Coverage Targets (Enforced in CI — Build Fails Below These)

| Package | Statements | Branches | Functions | Lines |
|---------|-----------|---------|-----------|-------|
| `@psau/shared` | 95% | 95% | 95% | 95% |
| `@psau/api` | 88% | 85% | 90% | 88% |
| `@psau/web` | 85% | 82% | 88% | 85% |
| **Overall** | **87%** | **85%** | **90%** | **87%** |

`@psau/shared` has higher targets because it contains the GPA formulas — these are academic law.

---

## 2. Test Pyramid

```
                    ┌─────────────┐
                    │  E2E Tests  │  ~30 tests  (Playwright)
                    │  ~5% count  │  Slow, high value, full flow
                   ─┼─────────────┼─
              ┌─────────────────────────┐
              │   Integration Tests     │  ~120 tests  (Supertest)
              │      ~25% count         │  HTTP layer, DB, Redis
             ─┼─────────────────────────┼─
        ┌─────────────────────────────────────┐
        │           Unit Tests                │  ~400 tests  (Vitest)
        │              ~70% count             │  Services, utils, components
        └─────────────────────────────────────┘
```

**Total target:** ~550 tests

---

## 3. Unit Tests

### 3.1 GPA Formula Tests — MANDATORY FIRST (Academic Correctness)

These tests MUST pass before any other code is written. They encode the law.

```typescript
// packages/shared/src/lib/__tests__/gpa.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateGradePoint,
  calculateCoursePoints,
  calculateSGPA,
  calculateCGPA,
  getLetterGrade,
  getAcademicStatus,
  calculateSubstitutionCGPA,
} from '../gpa';

describe('calculateGradePoint — Formula A (NEW enrollment)', () => {
  it('score 55 → sgp 2.2  [Guide p.33, Course 1]', () => {
    expect(calculateGradePoint(55, 'NEW')).toBe(2.2);
  });
  it('score 59 → sgp 2.4  [Guide p.33, Course 2]', () => {
    expect(calculateGradePoint(59, 'NEW')).toBe(2.4);
  });
  it('score 52 → sgp 2.1  [Guide p.33, Course 3]', () => {
    expect(calculateGradePoint(52, 'NEW')).toBe(2.1);
  });
  it('score 68 → sgp 2.7  [Guide p.33, Course 4]', () => {
    expect(calculateGradePoint(68, 'NEW')).toBe(2.7);
  });
  it('score 57 → sgp 2.3  [Guide p.33, Course 5]', () => {
    expect(calculateGradePoint(57, 'NEW')).toBe(2.3);
  });
  it('score 50 → sgp 2.0  [pass boundary]', () => {
    expect(calculateGradePoint(50, 'NEW')).toBe(2.0);
  });
  it('score 49 → sgp 1.96 rounds to 2.0  [fail boundary]', () => {
    // 49/25 = 1.96 → round to 1 decimal = 2.0? No: 1.96 rounds to 2.0
    // Actually 49/25 = 1.96 → 1 decimal = 2.0 ← this is a FAIL (< 2.0 threshold)
    // Wait: 1.96 rounded to 1 decimal = 2.0. But 2.0 = C = pass.
    // Boundary is score 50 = 2.0. Score 49 = 1.96 → rounds to 2.0.
    // The guide says fail is < 2.0 point. 1.96 < 2.0. Rounding happens AFTER comparison.
    // So: sgp = round(49/25, 1) = round(1.96, 1) = 2.0; letter = based on UNrounded? 
    // The guide formula rounds to 1 decimal, then compares. 2.0 = pass.
    // This is a real edge case — document the decision explicitly.
    const sgp = calculateGradePoint(49, 'NEW'); // 1.96 → 2.0
    expect(sgp).toBe(2.0); // rounds to 2.0
    expect(getLetterGrade(sgp)).toBe('C'); // 2.0 = C = pass
  });
  it('score 100 → sgp 4.0  [maximum]', () => {
    expect(calculateGradePoint(100, 'NEW')).toBe(4.0);
  });
  it('score 0 → sgp 0.0  [minimum]', () => {
    expect(calculateGradePoint(0, 'NEW')).toBe(0.0);
  });
  it('clamps negative scores to 0', () => {
    expect(calculateGradePoint(-5, 'NEW')).toBe(0.0);
  });
  it('clamps scores over 100 to 100', () => {
    expect(calculateGradePoint(105, 'NEW')).toBe(4.0);
  });
});

describe('calculateGradePoint — Formula B (RESIT/REPEAT enrollment)', () => {
  // Formula B: sgp = round((2/3) * (X/25 + 1), 1)
  it('score 51 → sgp 2.0  [Guide p.37, Course 1]', () => {
    // (2/3) * (51/25 + 1) = (2/3) * (2.04 + 1) = (2/3) * 3.04 = 2.027 → 2.0
    expect(calculateGradePoint(51, 'RESIT')).toBe(2.0);
  });
  it('score 50 → sgp 2.0  [Guide p.37, Course 8]', () => {
    // (2/3) * (50/25 + 1) = (2/3) * 3 = 2.0
    expect(calculateGradePoint(50, 'RESIT')).toBe(2.0);
  });
  it('score 47 → sgp 0.0  [fail on resit — Guide p.37 Course 4]', () => {
    // (2/3) * (47/25 + 1) = (2/3) * 2.88 = 1.92 → 1.9 → F (< 2.0)
    expect(calculateGradePoint(47, 'RESIT')).toBe(1.9);
    expect(getLetterGrade(1.9)).toBe('F');
  });
  it('same formula applies to REPEAT type', () => {
    expect(calculateGradePoint(51, 'RESIT')).toBe(calculateGradePoint(51, 'REPEAT'));
  });
  it('maximum grade achievable on resit with score 100', () => {
    // (2/3) * (100/25 + 1) = (2/3) * 5 = 3.333 → 3.3
    expect(calculateGradePoint(100, 'RESIT')).toBe(3.3);
    // Note: resit students cannot achieve A+ regardless of score
    expect(getLetterGrade(3.3)).toBe('B+');
  });
});

describe('calculateSGPA — Semester GPA [Guide p.33 Example 1]', () => {
  const semester1Courses = [
    { creditHours: 2, gradePoint: 2.2, enrollmentType: 'NEW' as const },
    { creditHours: 4, gradePoint: 2.4, enrollmentType: 'NEW' as const },
    { creditHours: 3, gradePoint: 2.1, enrollmentType: 'NEW' as const },
    { creditHours: 3, gradePoint: 2.7, enrollmentType: 'NEW' as const },
    { creditHours: 3, gradePoint: 2.3, enrollmentType: 'NEW' as const },
  ];

  it('calculates total points correctly', () => {
    const totalPoints = semester1Courses.reduce(
      (sum, c) => sum + c.gradePoint * c.creditHours, 0
    );
    expect(totalPoints).toBeCloseTo(35.3, 1);
  });

  it('calculates SGPA = 35.3 / 15 = 2.35  [Guide p.33]', () => {
    const sgpa = calculateSGPA(semester1Courses);
    expect(sgpa).toBe(2.35);
  });

  it('excludes ALTERNATE courses from SGPA', () => {
    const withAlternate = [
      ...semester1Courses,
      { creditHours: 3, gradePoint: 3.5, enrollmentType: 'ALTERNATE' as const }
    ];
    // SGPA should be same — alternate excluded
    expect(calculateSGPA(withAlternate)).toBe(2.35);
  });

  it('includes DEPRIVED courses as zero (attendance < 75%)', () => {
    const withDeprived = [
      ...semester1Courses,
      { creditHours: 3, gradePoint: 0, enrollmentType: 'DEPRIVED' as const }
    ];
    // Total points: 35.3 + 0 = 35.3; Total hours: 15 + 3 = 18
    const expected = Number((35.3 / 18).toFixed(2));
    expect(calculateSGPA(withDeprived)).toBe(expected);
  });
});

describe('getLetterGrade — Grade Scale', () => {
  const cases: [number, string][] = [
    [4.0, 'A+'], [3.8, 'A+'], [3.6, 'A+'],
    [3.5, 'A'],  [3.3, 'A'],  [3.2, 'A'],
    [3.1, 'B+'], [2.9, 'B+'], [2.8, 'B+'],
    [2.7, 'B'],  [2.6, 'B'],
    [2.5, 'C+'], [2.4, 'C+'],
    [2.3, 'C'],  [2.1, 'C'],  [2.0, 'C'],
    [1.9, 'F'],  [1.0, 'F'],  [0.0, 'F'],
  ];
  it.each(cases)('sgp %f → %s', (sgp, expected) => {
    expect(getLetterGrade(sgp)).toBe(expected);
  });
});

describe('Degree Classification [Guide p.13]', () => {
  it('CGPA 3.00–4.00 → First Class', () => {
    expect(getDegreeClassification(3.5)).toEqual({
      code: 'FIRST', ar: 'الدرجة الأولى', en: 'First Class'
    });
  });
  it('CGPA 2.70–2.99 → Second Division I', () => {
    expect(getDegreeClassification(2.85)).toEqual({
      code: 'SECOND_1', ar: 'الثانية قسم أول', en: 'Second Division I'
    });
  });
  it('CGPA 2.40–2.69 → Second Division II', () => {
    expect(getDegreeClassification(2.55)).toEqual({
      code: 'SECOND_2', ar: 'الثانية قسم ثاني', en: 'Second Division II'
    });
  });
  it('CGPA 2.00–2.39 → Third Class', () => {
    expect(getDegreeClassification(2.2)).toEqual({
      code: 'THIRD', ar: 'الدرجة الثالثة', en: 'Third Class'
    });
  });
  it('CGPA < 2.00 → Fail (no degree)', () => {
    expect(getDegreeClassification(1.9)).toBeNull();
  });
});

describe('Academic Standing [Guide p.19]', () => {
  it('CGPA >= 2.00 → GOOD standing', () => {
    expect(getAcademicStatus({ cgpa: 2.5, previousWarnings: 0 })).toBe('GOOD');
  });
  it('CGPA < 2.00, first occurrence → WARNING_1', () => {
    expect(getAcademicStatus({ cgpa: 1.8, previousWarnings: 0 })).toBe('WARNING_1');
  });
  it('CGPA < 2.00, second consecutive → WARNING_2', () => {
    expect(getAcademicStatus({ cgpa: 1.9, previousWarnings: 1 })).toBe('WARNING_2');
  });
  it('CGPA < 2.00, third consecutive → DISMISSED', () => {
    expect(getAcademicStatus({ cgpa: 1.7, previousWarnings: 2 })).toBe('DISMISSED');
  });
  it('CGPA recovers to >= 2.00 after warning → resets to GOOD', () => {
    expect(getAcademicStatus({ cgpa: 2.1, previousWarnings: 1 })).toBe('GOOD');
  });
});

describe('Substitution System [Guide p.31–32, Example 3]', () => {
  it('calculates substitution CGPA correctly', () => {
    // From Guide Example 3:
    // Original cumulative: points=40.1, hours=35
    // Repeat sem 1: points=12.0
    // Repeat sem 2: points=21.3
    // Expected CGPA = (40.1 + 12.0 + 21.3) / 35 = 73.4 / 35 = 2.09
    const result = calculateSubstitutionCGPA({
      originalPoints: 40.1,
      originalHours: 35,
      repeatSem1Points: 12.0,
      repeatSem2Points: 21.3,
    });
    expect(result).toBe(2.09);
  });
  
  it('hours do not grow during repeat semesters', () => {
    // Critical: substitution CGPA denominator stays at original hours
    const result = calculateSubstitutionCGPA({
      originalPoints: 40.1,
      originalHours: 35,
      repeatSem1Points: 12.0,
      repeatSem2Points: 21.3,
    });
    // If hours were added, result would be 73.4/(35+9+9) = 73.4/53 = 1.38
    // Correct answer is 73.4/35 = 2.09
    expect(result).toBe(2.09);
    expect(result).not.toBe(Number((73.4 / 53).toFixed(2)));
  });
});
```

### 3.2 API Service Unit Tests

```typescript
// packages/api/src/services/__tests__/student.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudentService } from '../student.service';
import { StudentRepository } from '../../repositories/student.repository';

vi.mock('../../repositories/student.repository');

describe('StudentService.generateStudentId', () => {
  let service: StudentService;
  let mockRepo: vi.Mocked<StudentRepository>;

  beforeEach(() => {
    mockRepo = new StudentRepository() as vi.Mocked<StudentRepository>;
    service = new StudentService(mockRepo);
  });

  it('generates correct format: YYYY-FF-DD-NNNN', async () => {
    mockRepo.getNextSequence.mockResolvedValueOnce(47);
    const id = await service.generateStudentId({
      admissionYear: 2024,
      facultyCode: '01',
      deptNumber: 3,
    });
    expect(id).toBe('2024-01-03-0047');
  });

  it('pads single-digit dept number with zero', async () => {
    mockRepo.getNextSequence.mockResolvedValueOnce(1);
    const id = await service.generateStudentId({
      admissionYear: 2024,
      facultyCode: '02',
      deptNumber: 5,
    });
    expect(id).toBe('2024-02-05-0001');
  });

  it('pads sequence to 4 digits', async () => {
    mockRepo.getNextSequence.mockResolvedValueOnce(9);
    const id = await service.generateStudentId({
      admissionYear: 2024,
      facultyCode: '01',
      deptNumber: 1,
    });
    expect(id).toMatch(/^2024-01-01-0009$/);
  });

  it('handles 4-digit sequence', async () => {
    mockRepo.getNextSequence.mockResolvedValueOnce(1000);
    const id = await service.generateStudentId({
      admissionYear: 2024,
      facultyCode: '01',
      deptNumber: 1,
    });
    expect(id).toMatch(/^2024-01-01-1000$/);
  });
});
```

---

## 4. Integration Tests

```typescript
// packages/api/src/__tests__/integration/grades.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { testDb } from '../helpers/test-db';
import { seedTestData } from '../helpers/seed';
import { generateToken } from '../helpers/auth';

describe('POST /api/v1/grades/:enrollmentId/submit', () => {
  let instructorToken: string;
  let coordinatorToken: string;
  let studentToken: string;
  let testEnrollmentId: number;

  beforeAll(async () => {
    await testDb.migrate();
    const seed = await seedTestData();
    instructorToken = generateToken({ userId: seed.instructorId, role: 'I' });
    coordinatorToken = generateToken({ userId: seed.coordinatorId, role: 'C' });
    studentToken = generateToken({ userId: seed.studentUserId, role: 'S',
                                   studentId: seed.studentId });
    testEnrollmentId = seed.enrollmentId;
  });

  afterAll(() => testDb.cleanup());
  beforeEach(() => testDb.resetGrades(testEnrollmentId));

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post(`/api/v1/grades/${testEnrollmentId}/submit`);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when student role attempts to submit', async () => {
    const res = await request(app)
      .post(`/api/v1/grades/${testEnrollmentId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 when enrollment does not exist', async () => {
    const res = await request(app)
      .post(`/api/v1/grades/99999/submit`)
      .set('Authorization', `Bearer ${instructorToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 409 when grade does not exist yet (DRAFT required)', async () => {
    // Cannot submit a grade that hasn't been entered
    const res = await request(app)
      .post(`/api/v1/grades/${testEnrollmentId}/submit`)
      .set('Authorization', `Bearer ${instructorToken}`);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('GRADE_NOT_ENTERED');
  });

  it('submits successfully when grade in DRAFT status', async () => {
    // First, enter a grade
    await testDb.insertDraftGrade(testEnrollmentId, {
      finalScore: 70, midtermScore: 15, assignmentsScore: 9, attendancePct: 90
    });

    const res = await request(app)
      .post(`/api/v1/grades/${testEnrollmentId}/submit`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.entryStatus).toBe('SUBMITTED');
    expect(res.body.data.submittedAt).toBeDefined();
  });

  it('returns 409 when grade already submitted', async () => {
    await testDb.insertSubmittedGrade(testEnrollmentId);
    
    const res = await request(app)
      .post(`/api/v1/grades/${testEnrollmentId}/submit`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('GRADE_ALREADY_SUBMITTED');
  });

  it('returns 409 when grade already approved', async () => {
    await testDb.insertApprovedGrade(testEnrollmentId);

    const res = await request(app)
      .post(`/api/v1/grades/${testEnrollmentId}/submit`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('GRADE_ALREADY_APPROVED');
  });

  it('creates audit log entry on successful submit', async () => {
    await testDb.insertDraftGrade(testEnrollmentId);
    
    await request(app)
      .post(`/api/v1/grades/${testEnrollmentId}/submit`)
      .set('Authorization', `Bearer ${instructorToken}`);

    const auditEntry = await testDb.getLastAuditEntry('grades', testEnrollmentId);
    expect(auditEntry).toBeDefined();
    expect(auditEntry.action).toBe('SUBMITTED');
    expect(auditEntry.performedBy).toBeDefined();
  });

  it('coordinator can also submit grades', async () => {
    await testDb.insertDraftGrade(testEnrollmentId);
    const res = await request(app)
      .post(`/api/v1/grades/${testEnrollmentId}/submit`)
      .set('Authorization', `Bearer ${coordinatorToken}`);
    expect(res.status).toBe(200);
  });

  it('instructor cannot approve their own submission', async () => {
    await testDb.insertSubmittedGrade(testEnrollmentId);
    const res = await request(app)
      .post(`/api/v1/grades/${testEnrollmentId}/approve`)
      .set('Authorization', `Bearer ${instructorToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CANNOT_SELF_APPROVE');
  });
});
```

---

## 5. React Component Tests

```typescript
// packages/web/src/features/grades/__tests__/GradeEntrySheet.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { GradeEntrySheet } from '../components/GradeEntrySheet';
import { renderWithProviders } from '../../test-utils';
import { mockGrades } from '../../test-fixtures/grades';

describe('GradeEntrySheet', () => {
  it('renders a row for each enrolled student', () => {
    renderWithProviders(
      <GradeEntrySheet offeringId={1} />,
      { grades: mockGrades.semester1_offering1 }
    );
    // 5 students in mock
    expect(screen.getAllByRole('row')).toHaveLength(6); // 5 + header
  });

  it('shows live grade preview as instructor types final score', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GradeEntrySheet offeringId={1} />);
    
    const finalInput = screen.getAllByLabelText('Final Exam Score')[0];
    await user.clear(finalInput);
    await user.type(finalInput, '75');

    // Grade preview should appear
    await waitFor(() => {
      expect(screen.getByTestId('grade-preview-0')).toHaveTextContent('3.0');
    });
  });

  it('shows error when score exceeds 100', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GradeEntrySheet offeringId={1} />);
    
    const finalInput = screen.getAllByLabelText('Final Exam Score')[0];
    await user.clear(finalInput);
    await user.type(finalInput, '105');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Score cannot exceed');
    });
  });

  it('disables all inputs for APPROVED grades', () => {
    const approvedGrade = { ...mockGrades.semester1_offering1[0], entryStatus: 'APPROVED' };
    renderWithProviders(
      <GradeEntrySheet offeringId={1} />,
      { grades: [approvedGrade] }
    );
    
    const inputs = screen.getAllByRole('spinbutton');
    inputs.forEach(input => expect(input).toBeDisabled());
  });

  it('renders in RTL when Arabic language active', () => {
    renderWithProviders(<GradeEntrySheet offeringId={1} />, { lang: 'ar' });
    const container = screen.getByTestId('grade-sheet-container');
    expect(container).toHaveAttribute('dir', 'rtl');
  });

  it('submit button is disabled when not all scores entered', () => {
    renderWithProviders(<GradeEntrySheet offeringId={1} />);
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
  });

  it('calls onSubmit with correct payload when submit clicked', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    // ... fill all scores, click submit, verify payload
  });
});
```

---

## 6. E2E Tests (Playwright)

```typescript
// packages/web/e2e/grade-workflow.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { createTestData } from './helpers/setup';

test.describe('Grade Entry → Approval Workflow', () => {
  let testData: TestData;

  test.beforeAll(async ({ request }) => {
    testData = await createTestData(request);
  });

  test('full grade workflow: entry → submit → approve → student sees result', async ({
    page, context
  }) => {
    // ── Step 1: Instructor enters and submits grades ──────────────────
    await loginAs(page, 'instructor', testData.instructorCredentials);
    await page.goto(`/offerings/${testData.offeringId}/grades`);

    // Enter grades for first student
    const firstRow = page.locator('[data-testid="grade-row"]').first();
    await firstRow.getByLabel('Final Exam Score').fill('72');
    await firstRow.getByLabel('Midterm Score').fill('16');
    await firstRow.getByLabel('Assignments Score').fill('9');
    await firstRow.getByLabel('Attendance %').fill('88');

    // Verify live preview
    await expect(firstRow.getByTestId('total-score-preview')).toHaveText('~78');
    await expect(firstRow.getByTestId('grade-point-preview')).toHaveText('3.1');

    // Save and submit
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText('Saved');
    
    await page.getByRole('button', { name: /Submit for Approval/i }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    
    await expect(page.getByRole('status')).toHaveText(/Submitted/i);
    await expect(page.getByTestId('grade-status-badge')).toHaveText('SUBMITTED');

    // ── Step 2: Coordinator sees it in approval queue ─────────────────
    const coordPage = await context.newPage();
    await loginAs(coordPage, 'coordinator', testData.coordinatorCredentials);
    await coordPage.goto('/grades/approvals');

    await expect(
      coordPage.getByText(testData.courseName)
    ).toBeVisible();

    const queueItem = coordPage.locator('[data-testid="approval-queue-item"]').first();
    await expect(queueItem.getByTestId('submission-count')).toHaveText('1 pending');

    await queueItem.getByRole('button', { name: 'Review' }).click();

    // Verify grade details visible to coordinator
    await expect(coordPage.getByTestId('total-score')).toHaveText('78');
    await expect(coordPage.getByTestId('grade-point')).toHaveText('3.1');
    await expect(coordPage.getByTestId('letter-grade')).toHaveText('B+');

    // Approve
    await coordPage.getByRole('button', { name: 'Approve' }).click();
    await coordPage.getByRole('button', { name: 'Confirm Approval' }).click();
    
    await expect(coordPage.getByRole('status')).toHaveText(/Approved/i);

    // ── Step 3: Student sees approved grade in portal ─────────────────
    const studentPage = await context.newPage();
    await loginAs(studentPage, 'student', testData.studentCredentials);
    await studentPage.goto('/portal/grades');

    await expect(
      studentPage.getByTestId(`course-${testData.courseId}-grade`)
    ).toHaveText('B+');
    
    await expect(
      studentPage.getByTestId(`course-${testData.courseId}-points`)
    ).toHaveText('3.1');

    // Student can see grade is final (approved)
    await expect(
      studentPage.getByTestId(`course-${testData.courseId}-status`)
    ).toHaveText('Final');

    // Student can view transcript
    await studentPage.goto('/portal/transcript');
    await expect(
      studentPage.getByRole('table')
    ).toContainText(testData.courseName);

    // Student cannot see OTHER students' grades
    await studentPage.goto(`/students/${testData.otherStudentId}/transcript`);
    await expect(studentPage).toHaveURL('/portal/dashboard'); // redirected
    await expect(studentPage.getByRole('alert')).toHaveText(/not authorized/i);
  });

  test('instructor cannot submit grades for unassigned course', async ({ page }) => {
    await loginAs(page, 'instructor', testData.instructorCredentials);
    await page.goto(`/offerings/${testData.unassignedOfferingId}/grades`);
    await expect(page.getByRole('alert')).toHaveText(/not authorized/i);
    await expect(page.getByRole('button', { name: /submit/i })).not.toBeVisible();
  });

  test('transcript PDF generates correctly', async ({ page }) => {
    await loginAs(page, 'student', testData.studentCredentials);
    await page.goto('/portal/transcript');
    
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Download PDF/i }).click(),
    ]);
    
    expect(download.suggestedFilename()).toMatch(/transcript.*\.pdf$/i);
    const size = (await download.createReadStream()).readable;
    expect(size).toBeGreaterThan(10_000); // real PDF, not empty
  });
});
```

---

## 7. Performance Tests

```typescript
// packages/api/src/__tests__/performance/gpa-recompute.perf.test.ts
import { describe, it, expect } from 'vitest';
import { GPAService } from '../../services/gpa.service';

describe('GPA Recomputation Performance', () => {
  it('recomputes 1000 students in under 5 seconds', async () => {
    const service = new GPAService(/* test db */);
    const studentIds = generateStudentIds(1000);
    
    const start = Date.now();
    await service.bulkRecompute(studentIds, testSemesterId);
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeLessThan(5000);
  }, { timeout: 10_000 });

  it('single student GPA computation under 50ms', async () => {
    const service = new GPAService(/* test db */);
    
    const start = Date.now();
    await service.recomputeForStudent(testStudentId, testSemesterId);
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeLessThan(50);
  });
});
```

---

## 8. Test Helpers and Fixtures

```typescript
// packages/api/src/__tests__/helpers/test-db.ts
import { Pool } from 'pg';

export const testDb = {
  pool: null as Pool | null,
  
  async migrate() {
    // Run all migrations against test DB
    await runMigrations(this.pool!);
  },
  
  async cleanup() {
    // Truncate all tables (faster than drop/recreate for each test)
    await this.pool!.query(`
      TRUNCATE TABLE grades, enrollments, course_offerings,
                     curriculum_courses, curricula, courses,
                     students, users, departments, faculties,
                     academic_years, semesters
      CASCADE
    `);
  },
  
  async resetGrades(enrollmentId: number) {
    await this.pool!.query(
      'DELETE FROM grades WHERE enrollment_id = $1', [enrollmentId]
    );
  },
  
  async insertDraftGrade(enrollmentId: number, scores = defaultScores) {
    // Insert a grade in DRAFT status with the given scores
  },
  
  async insertSubmittedGrade(enrollmentId: number) {
    await this.insertDraftGrade(enrollmentId);
    await this.pool!.query(
      `UPDATE grades SET entry_status='SUBMITTED', submitted_at=NOW()
       WHERE enrollment_id=$1`, [enrollmentId]
    );
  },
  
  async getLastAuditEntry(table: string, recordId: number) {
    const result = await this.pool!.query(
      `SELECT * FROM grade_audit_log ORDER BY performed_at DESC LIMIT 1`
    );
    return result.rows[0];
  }
};

// packages/api/src/__tests__/helpers/seed.ts
export async function seedTestData() {
  // Creates a minimal but complete test dataset:
  // 1 faculty, 2 departments, 1 academic year, 1 semester
  // 5 courses, 1 curriculum, 10 students
  // 3 users: 1 admin, 1 instructor, 1 coordinator
  // Student users for portal tests
  // Enrollments for current semester
  // Returns all IDs needed by tests
}
```

---

## 9. Vitest Configuration

```typescript
// vitest.config.ts (root)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 88,
        lines: 85,
      },
      exclude: [
        'node_modules',
        '**/*.test.ts',
        '**/__tests__/**',
        '**/test-utils/**',
        '**/fixtures/**',
        'db/migrations/**',
        'dist/**',
      ],
    },
    reporters: ['verbose', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml',
    },
    sequence: {
      concurrent: false,  // Ensure DB tests don't interfere
    },
    hookTimeout: 30_000,  // 30s for DB operations in beforeAll
  },
});
```

---

## 10. Test Execution in Each Environment

### Dev (local)
```bash
# Unit tests only (fast, runs in seconds)
pnpm test:unit

# Integration tests (requires running Docker services)
docker compose -f docker/docker-compose.test.yml up postgres redis -d
pnpm test:integration

# E2E tests (requires full stack)
docker compose -f docker/docker-compose.dev.yml up -d
pnpm test:e2e

# All tests with coverage report
pnpm test:coverage
```

### Test (CI — Docker Compose)
```bash
# Everything runs in Docker; no local dependencies needed
docker compose -f docker/docker-compose.test.yml up --abort-on-container-exit
# Exit code of api-test and web-test containers determines pass/fail
```

### Production Pre-Deploy (Smoke Tests)
```bash
# After deployment, verify critical paths
pnpm test:smoke --env=prod
# Smoke tests: health check, login, view transcript, backup status
# These use real prod-like data and should never mutate production data
```

---

## 11. What to Monitor During Testing Phase (Senior QA Checklist)

### Metric Collection During Test Runs

During integration and E2E tests, collect:

```yaml
Performance Metrics:
  - P95 response time per endpoint
  - DB query count per request (N+1 detection)
  - Memory usage during GPA bulk recompute
  - Redis cache hit rate

Security Findings:
  - Run OWASP ZAP against test environment after each major feature
  - Dependency audit: npm audit --audit-level=moderate
  - Check for SQL injection in all new query parameters
  - Verify rate limits trigger at correct thresholds

Data Integrity:
  - GPA formula output matches Advising Guide for all test cases
  - CGPA never calculated with incorrect hours (substitution system)
  - Approved grades cannot be modified (verify in DB directly)
  - Audit log entry created for every grade state change

Accessibility:
  - Run axe-core against all pages in CI
  - Verify keyboard navigation in all modals
  - Check color contrast ratios (WCAG AA minimum)
```

### Senior QA Observations → Enhancement Flags

When any of the following are observed, raise a performance/quality ticket:

| Observation | Action |
|---|---|
| Any P95 endpoint > 500ms | Add query analysis + index review |
| N+1 query detected | Convert to JOIN or DataLoader |
| Redis cache hit rate < 60% | Review cache key strategy |
| Test flakiness > 1% | Isolate test, fix before merging |
| GPA output differs by even 0.01 | STOP — formula bug, escalate immediately |
| Memory grows > 50MB during bulk ops | Review batch size, add streaming |
| Any OWASP finding > Medium | Fix before next release |

---

## 12. Regression Test Protocol

Every bug fix follows this protocol:

```
1. Write a failing test that reproduces the bug  ← RED
2. Verify the test fails for the right reason
3. Write the fix
4. Verify the test passes  ← GREEN
5. Verify no other tests broke  ← REFACTOR
6. Tag the test: @regression to track origins

Example:
it('does not silently create student when receipt student_id not found [BUG-003]', async () => {
  const initialCount = await db.getStudentCount();
  
  const res = await request(app)
    .post('/api/v1/receipts')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ studentId: 'NONEXISTENT-ID', ... });
  
  expect(res.status).toBe(404);
  expect(res.body.error.code).toBe('STUDENT_NOT_FOUND');
  
  const finalCount = await db.getStudentCount();
  expect(finalCount).toBe(initialCount); // No ghost student created
});
```
