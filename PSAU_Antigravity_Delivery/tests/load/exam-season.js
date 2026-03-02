// tests/load/exam-season.js
// Load test simulating exam results release day: 200 concurrent users
// Run: k6 run --env BASE_URL=http://api:8080 --env TOKEN=xxx tests/load/exam-season.js

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const gradePageDuration = new Trend('grade_page_duration');
const transcriptDuration = new Trend('transcript_duration');
const loginDuration = new Trend('login_duration');
const apiErrors = new Counter('api_errors');

export const options = {
  // Ramp up to exam-season peak, hold, ramp down
  stages: [
    { duration: '2m', target: 50   },   // Ramp up
    { duration: '5m', target: 200  },   // Peak load
    { duration: '3m', target: 200  },   // Sustain peak
    { duration: '2m', target: 0    },   // Ramp down
  ],
  thresholds: {
    // SLOs from MASTER_BRIEF.md Section 7
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.001'],   // < 0.1% error rate
    errors: ['rate<0.001'],
    grade_page_duration: ['p(95)<300'],
    transcript_duration: ['p(95)<4000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Pre-seeded test users (loaded from env or fixture file)
const USERS = {
  students: JSON.parse(__ENV.STUDENT_TOKENS || '[]'),
  instructors: JSON.parse(__ENV.INSTRUCTOR_TOKENS || '[]'),
  coordinators: JSON.parse(__ENV.COORDINATOR_TOKENS || '[]'),
  registrars: JSON.parse(__ENV.REGISTRAR_TOKENS || '[]'),
};

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function headers(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export default function () {
  // Distribute load by role (exam season: mostly students checking grades)
  const roll = Math.random();
  
  if (roll < 0.70) {
    // 70%: Student checking their grades and transcript
    studentWorkflow();
  } else if (roll < 0.85) {
    // 15%: Instructors viewing grade sheets
    instructorWorkflow();
  } else if (roll < 0.95) {
    // 10%: Coordinators reviewing approvals
    coordinatorWorkflow();
  } else {
    // 5%: Registrar looking up students
    registrarWorkflow();
  }
}

function studentWorkflow() {
  const token = randomItem(USERS.students);
  if (!token) return;

  group('Student: Check grades and transcript', () => {
    // Dashboard
    let res = http.get(`${BASE_URL}/api/v1/student/me`, { headers: headers(token) });
    check(res, { 'dashboard 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    
    sleep(Math.random() * 2 + 1);

    // Current grades
    const start = Date.now();
    res = http.get(`${BASE_URL}/api/v1/student/me/grades/current`, { headers: headers(token) });
    gradePageDuration.add(Date.now() - start);
    check(res, { 'grades 200': (r) => r.status === 200 });
    if (res.status !== 200) apiErrors.add(1);
    
    sleep(Math.random() * 3 + 2);

    // Transcript (expensive — PDF generation)
    if (Math.random() < 0.3) {  // 30% of students request PDF
      const pdfStart = Date.now();
      res = http.get(`${BASE_URL}/api/v1/student/me/transcript/pdf`, {
        headers: headers(token),
        timeout: '30s',
      });
      transcriptDuration.add(Date.now() - pdfStart);
      check(res, {
        'transcript PDF 200': (r) => r.status === 200,
        'transcript is PDF': (r) => r.headers['Content-Type']?.includes('application/pdf'),
      });
    } else {
      // Web transcript (cheaper)
      res = http.get(`${BASE_URL}/api/v1/student/me/transcript`, { headers: headers(token) });
      check(res, { 'transcript web 200': (r) => r.status === 200 });
    }

    // CGPA history
    res = http.get(`${BASE_URL}/api/v1/student/me/gpa`, { headers: headers(token) });
    check(res, { 'gpa 200': (r) => r.status === 200 });
    
    sleep(Math.random() * 2);
  });
}

function instructorWorkflow() {
  const token = randomItem(USERS.instructors);
  if (!token) return;

  group('Instructor: View grade sheets', () => {
    // Get assigned offerings
    let res = http.get(`${BASE_URL}/api/v1/offerings?instructor=me&semester=current`, {
      headers: headers(token)
    });
    check(res, { 'offerings 200': (r) => r.status === 200 });
    
    if (res.status === 200) {
      const offerings = JSON.parse(res.body).data || [];
      if (offerings.length > 0) {
        const offering = randomItem(offerings);
        
        // View grade sheet
        res = http.get(`${BASE_URL}/api/v1/offerings/${offering.offeringId}/grades`, {
          headers: headers(token)
        });
        check(res, { 'grade sheet 200': (r) => r.status === 200 });
      }
    }
    
    sleep(Math.random() * 3 + 2);
  });
}

function coordinatorWorkflow() {
  const token = randomItem(USERS.coordinators);
  if (!token) return;

  group('Coordinator: Approval queue', () => {
    let res = http.get(`${BASE_URL}/api/v1/grades/pending-approval`, {
      headers: headers(token)
    });
    check(res, { 'approval queue 200': (r) => r.status === 200 });
    
    sleep(Math.random() * 4 + 3);
  });
}

function registrarWorkflow() {
  const token = randomItem(USERS.registrars);
  if (!token) return;

  group('Registrar: Student lookup', () => {
    const searchTerms = ['أحمد', 'محمد', 'فاطمة', 'مريم', '2022'];
    const term = randomItem(searchTerms);
    
    let res = http.get(`${BASE_URL}/api/v1/students?q=${encodeURIComponent(term)}&limit=20`, {
      headers: headers(token)
    });
    check(res, { 'student search 200': (r) => r.status === 200 });
    
    sleep(Math.random() * 2 + 1);
  });
}

export function handleSummary(data) {
  return {
    'test-results/load-exam-season.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
