# Error Code Registry
## Every Error Code the System Can Emit — Single Source of Truth

> When adding a new error: add it HERE first, then implement in `packages/api/src/lib/errors.ts`.
> Never invent error codes inline in a service. Check this registry first.
> Duplicates or inconsistent codes cause client breakage.

---

## Format

| Code | HTTP | EN Message | AR Message |
|------|------|-----------|-----------|

---

## Auth Errors (AUTH_*)

| Code | HTTP | EN Message | AR Message |
|------|------|-----------|-----------|
| `UNAUTHORIZED` | 401 | Authentication required | المصادقة مطلوبة |
| `INVALID_CREDENTIALS` | 401 | Invalid username or password | اسم المستخدم أو كلمة المرور غير صحيحة |
| `ACCOUNT_LOCKED` | 423 | Account locked due to too many failed attempts. Try again in 15 minutes | الحساب مغلق بسبب محاولات فاشلة متعددة. حاول مرة أخرى بعد 15 دقيقة |
| `ACCOUNT_INACTIVE` | 403 | This account has been deactivated | تم تعطيل هذا الحساب |
| `TOKEN_EXPIRED` | 401 | Access token has expired | انتهت صلاحية رمز الوصول |
| `TOKEN_INVALID` | 401 | Invalid or malformed token | رمز غير صالح أو تالف |
| `REFRESH_TOKEN_EXPIRED` | 401 | Session expired. Please log in again | انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى |
| `REFRESH_TOKEN_INVALID` | 401 | Invalid refresh token | رمز التحديث غير صالح |
| `PASSWORD_CHANGE_REQUIRED` | 403 | You must change your password before continuing | يجب عليك تغيير كلمة المرور قبل المتابعة |
| `CURRENT_PASSWORD_INCORRECT` | 400 | Current password is incorrect | كلمة المرور الحالية غير صحيحة |
| `FORBIDDEN` | 403 | You do not have permission to perform this action | ليس لديك إذن لأداء هذا الإجراء |

---

## Validation Errors (VALIDATION_*)

| Code | HTTP | EN Message | AR Message |
|------|------|-----------|-----------|
| `VALIDATION_ERROR` | 422 | The provided data is invalid | البيانات المقدمة غير صالحة |
| `MISSING_REQUIRED_FIELD` | 422 | Required field is missing: {field} | الحقل المطلوب مفقود: {field} |
| `INVALID_FORMAT` | 422 | Invalid format for field: {field} | تنسيق غير صالح للحقل: {field} |
| `VALUE_OUT_OF_RANGE` | 422 | Value for {field} must be between {min} and {max} | يجب أن تكون قيمة {field} بين {min} و {max} |
| `INVALID_SCORE` | 422 | Score must be between 0 and {maxScore} | يجب أن تكون الدرجة بين 0 و {maxScore} |
| `INVALID_CREDIT_HOURS` | 422 | Credit hours must be between 1 and 6 | يجب أن تكون الساعات المعتمدة بين 1 و 6 |
| `INVALID_ATTENDANCE_PCT` | 422 | Attendance percentage must be between 0 and 100 | يجب أن تكون نسبة الحضور بين 0 و 100 |

---

## Not Found Errors (*_NOT_FOUND)

| Code | HTTP | EN Message | AR Message |
|------|------|-----------|-----------|
| `STUDENT_NOT_FOUND` | 404 | Student not found | الطالب غير موجود |
| `USER_NOT_FOUND` | 404 | User not found | المستخدم غير موجود |
| `FACULTY_NOT_FOUND` | 404 | Faculty not found | الكلية غير موجودة |
| `DEPARTMENT_NOT_FOUND` | 404 | Department not found | القسم غير موجود |
| `COURSE_NOT_FOUND` | 404 | Course not found | المقرر غير موجود |
| `CURRICULUM_NOT_FOUND` | 404 | Curriculum not found | الخطة الدراسية غير موجودة |
| `OFFERING_NOT_FOUND` | 404 | Course offering not found | عرض المقرر غير موجود |
| `ENROLLMENT_NOT_FOUND` | 404 | Enrollment not found | التسجيل غير موجود |
| `GRADE_NOT_FOUND` | 404 | Grade record not found | سجل الدرجة غير موجود |
| `SEMESTER_NOT_FOUND` | 404 | Semester not found | الفصل الدراسي غير موجود |
| `ACADEMIC_YEAR_NOT_FOUND` | 404 | Academic year not found | السنة الأكاديمية غير موجودة |
| `BACKUP_NOT_FOUND` | 404 | Backup file not found | ملف النسخ الاحتياطي غير موجود |
| `BACKUP_CONFIG_NOT_FOUND` | 404 | Backup configuration not found | إعدادات النسخ الاحتياطي غير موجودة |

---

## Conflict Errors (Grade Workflow)

| Code | HTTP | EN Message | AR Message |
|------|------|-----------|-----------|
| `GRADE_NOT_ENTERED` | 409 | Grade has not been entered yet | لم يتم إدخال الدرجة بعد |
| `GRADE_ALREADY_SUBMITTED` | 409 | Grade has already been submitted | تم تقديم الدرجة بالفعل |
| `GRADE_ALREADY_APPROVED` | 409 | Cannot modify an approved grade | لا يمكن تعديل درجة معتمدة |
| `GRADE_NOT_SUBMITTED` | 409 | Grade must be submitted before approval | يجب تقديم الدرجة قبل الموافقة عليها |
| `GRADE_NOT_DRAFT` | 409 | Grade must be in DRAFT status for this operation | يجب أن تكون الدرجة في حالة مسودة لهذه العملية |
| `CANNOT_SELF_APPROVE` | 403 | An instructor cannot approve their own submission | لا يمكن للأستاذ الموافقة على تقديمه الخاص |
| `INSTRUCTOR_NOT_ASSIGNED` | 403 | You are not assigned to this course offering | لم يتم تعيينك لهذا العرض من المقرر |

---

## Conflict Errors (Enrollment)

| Code | HTTP | EN Message | AR Message |
|------|------|-----------|-----------|
| `ALREADY_ENROLLED` | 409 | Student is already enrolled in this course | الطالب مسجل بالفعل في هذا المقرر |
| `PREREQUISITE_NOT_MET` | 409 | Prerequisites not met: {courses} | المتطلبات السابقة غير مستوفاة: {courses} |
| `CURRICULUM_COURSE_REQUIRED` | 409 | This course is required by the curriculum and cannot be removed | هذا المقرر مطلوب في الخطة الدراسية ولا يمكن إزالته |
| `MAX_CREDIT_HOURS_EXCEEDED` | 409 | Enrolling would exceed the maximum credit hours for this semester | التسجيل سيتجاوز الحد الأقصى للساعات المعتمدة لهذا الفصل |
| `SEMESTER_ENROLLMENT_CLOSED` | 409 | Enrollment period for this semester is closed | فترة التسجيل لهذا الفصل الدراسي مغلقة |
| `STUDENT_DISMISSED` | 409 | Cannot enroll a dismissed student | لا يمكن تسجيل طالب مفصول |
| `OFFERING_FULL` | 409 | This course offering has reached maximum capacity | وصل هذا العرض من المقرر إلى الطاقة القصوى |

---

## Conflict Errors (University Structure)

| Code | HTTP | EN Message | AR Message |
|------|------|-----------|-----------|
| `FACULTY_CODE_DUPLICATE` | 409 | Faculty code already exists | رمز الكلية موجود بالفعل |
| `DEPARTMENT_CODE_DUPLICATE` | 409 | Department code already exists in this faculty | رمز القسم موجود بالفعل في هذه الكلية |
| `COURSE_CODE_DUPLICATE` | 409 | Course code already exists | رمز المقرر موجود بالفعل |
| `STUDENT_ID_DUPLICATE` | 409 | Student ID already exists (race condition) | رقم الطالب موجود بالفعل |
| `USERNAME_DUPLICATE` | 409 | Username already taken | اسم المستخدم مستخدم بالفعل |
| `SEMESTER_OVERLAP` | 409 | Semester dates overlap with an existing semester | تواريخ الفصل تتداخل مع فصل موجود |
| `ACTIVE_SEMESTER_EXISTS` | 409 | An active semester already exists for this academic year | يوجد فصل دراسي نشط بالفعل لهذه السنة الأكاديمية |

---

## Business Rule Errors

| Code | HTTP | EN Message | AR Message |
|------|------|-----------|-----------|
| `STUDENT_DEPRIVED` | 409 | Student is deprived due to attendance below 75% | الطالب محروم بسبب نسبة حضور أقل من 75% |
| `GRADUATION_CREDITS_INSUFFICIENT` | 409 | Student has not completed required credit hours for graduation | الطالب لم يكمل الساعات المعتمدة المطلوبة للتخرج |
| `GRADUATION_GPA_INSUFFICIENT` | 409 | Student CGPA does not meet graduation minimum (2.00) | المعدل التراكمي للطالب لا يستوفي الحد الأدنى للتخرج (2.00) |
| `CURRICULUM_NOT_COMPLETE` | 409 | Student has not completed all required curriculum courses | الطالب لم يكمل جميع المقررات المطلوبة في الخطة الدراسية |
| `ASSESSMENT_WEIGHTS_INCOMPLETE` | 409 | Assessment weights do not sum to 100% | أوزان التقييم لا تجمع إلى 100% |

---

## Migration / Import Errors

| Code | HTTP | EN Message | AR Message |
|------|------|-----------|-----------|
| `INVALID_CSV_FORMAT` | 422 | CSV file format is invalid | تنسيق ملف CSV غير صالح |
| `CSV_MISSING_HEADERS` | 422 | CSV is missing required headers: {headers} | ملف CSV يفتقر إلى الرؤوس المطلوبة: {headers} |
| `CSV_INVALID_ROW` | 422 | Row {row}: {reason} | صف {row}: {reason} |
| `IMPORT_PARTIAL_FAILURE` | 207 | Import completed with errors. See details. | اكتمل الاستيراد مع وجود أخطاء. انظر التفاصيل. |
| `MIGRATION_IN_PROGRESS` | 409 | A migration is already in progress | هناك عملية استيراد جارية بالفعل |
| `FILE_TOO_LARGE` | 413 | File size exceeds maximum allowed (50MB) | حجم الملف يتجاوز الحد الأقصى المسموح به (50 ميجابايت) |
| `INVALID_FILE_TYPE` | 422 | Only CSV files are accepted | يتم قبول ملفات CSV فقط |

---

## Backup / Restore Errors

| Code | HTTP | EN Message | AR Message |
|------|------|-----------|-----------|
| `BACKUP_FAILED` | 500 | Backup operation failed | فشلت عملية النسخ الاحتياطي |
| `BACKUP_IN_PROGRESS` | 409 | A backup is already in progress | هناك عملية نسخ احتياطي جارية بالفعل |
| `RESTORE_FAILED` | 500 | Restore operation failed | فشلت عملية الاستعادة |
| `BACKUP_FILE_CORRUPT` | 422 | Backup file is corrupted or invalid | ملف النسخ الاحتياطي تالف أو غير صالح |
| `GDRIVE_AUTH_FAILED` | 502 | Google Drive authentication failed | فشلت مصادقة Google Drive |
| `S3_UPLOAD_FAILED` | 502 | Failed to upload backup to S3 | فشل رفع النسخ الاحتياطي إلى S3 |

---

## Rate Limit Errors

| Code | HTTP | EN Message | AR Message |
|------|------|-----------|-----------|
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests. Please try again in {seconds} seconds | طلبات كثيرة جداً. حاول مرة أخرى خلال {seconds} ثانية |
| `LOGIN_RATE_LIMIT` | 429 | Too many login attempts. Wait 15 minutes before trying again | محاولات تسجيل دخول كثيرة. انتظر 15 دقيقة قبل المحاولة مرة أخرى |

---

## System Errors

| Code | HTTP | EN Message | AR Message |
|------|------|-----------|-----------|
| `INTERNAL_ERROR` | 500 | An unexpected error occurred | حدث خطأ غير متوقع |
| `DATABASE_ERROR` | 500 | A database error occurred | حدث خطأ في قاعدة البيانات |
| `PDF_GENERATION_FAILED` | 500 | Failed to generate PDF transcript | فشل إنشاء ملف PDF للكشف |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable | الخدمة غير متاحة مؤقتاً |

---

## Implementation Reference

```typescript
// packages/api/src/lib/errors.ts
// ALL errors in the registry must have a corresponding class or factory here

import { AppError } from './AppError';

// Grade workflow
export const GRADE_ERRORS = {
  notEntered: () => new AppError(
    'GRADE_NOT_ENTERED', 409,
    'لم يتم إدخال الدرجة بعد',
    'Grade has not been entered yet'
  ),
  alreadyApproved: () => new AppError(
    'GRADE_ALREADY_APPROVED', 409,
    'لا يمكن تعديل درجة معتمدة',
    'Cannot modify an approved grade'
  ),
  cannotSelfApprove: () => new AppError(
    'CANNOT_SELF_APPROVE', 403,
    'لا يمكن للأستاذ الموافقة على تقديمه الخاص',
    'An instructor cannot approve their own submission'
  ),
  // ... all others
};

// Usage in service:
if (grade.entryStatus === 'APPROVED') {
  throw GRADE_ERRORS.alreadyApproved();
}
```

---

## Adding a New Error Code

1. Add to this registry (this file) with code, HTTP status, EN, AR
2. Add to `packages/api/src/lib/errors.ts` — factory function or class
3. Add the AR translation to `packages/web/src/i18n/ar.json` under `errors.*`
4. Add the EN translation to `packages/web/src/i18n/en.json` under `errors.*`
5. Write a test that verifies the endpoint returns this error code in the right condition
