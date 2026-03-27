import React, { createContext, useContext, useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────
// Translation Strings
// ─────────────────────────────────────────────────────────────────
export const translations = {
  en: {
    // ── App branding ──
    appName:        'UniAttend',
    appSubtitle:    'University Smart Attendance System',
    universityName: 'Menoufia National University',

    // ── Sign In ──
    signIn:            'Sign In',
    signInBtn:         '→ Sign In',
    accessDashboard:   'Access your dashboard',
    emailLabel:        'EMAIL ADDRESS',
    passwordLabel:     'PASSWORD',
    emailPlaceholder:  'user@university.edu',
    passPlaceholder:   'Enter your password',
    doctorRole:        'Doctor',
    adminRole:         'Admin',
    demoAccounts:      'DEMO ACCOUNTS',
    invalidCredentials:'Invalid email or password. Please try again.',
    enterEmailPass:    'Please enter your email and password.',
    wrongRole:         'Please select the correct role to sign in.',
    footer:            '© 2026 Menoufia National University Attendance System.',

    // ── Sidebar ──
    sectionMain:          'MAIN',
    sectionAdministration:'ADMINISTRATION',
    sectionAcademic:      'ACADEMIC',
    sectionSystem:        'SYSTEM',
    navDashboard:         'Dashboard',
    navAttendance:        'Attendance',
    navStudents:          'Students',
    navCourses:           'Courses',
    navReports:           'Reports',
    navAdmin:             'Admin Panel',
    navQR:                'QR Control',
    navSettings:          'Settings',
    signOut:              'Sign Out',
    adminAccess:          'ADMIN ACCESS',
    doctorAccess:         'DOCTOR ACCESS',
    facultyMember:        'Faculty Member',
    sysAdmin:             'System Administrator',

    // ── Navbar ──
    navbarTitle:    'Doctor Attendance Dashboard',
    lectureLive:    'LECTURE LIVE',
    serverOnline:   'SERVER ONLINE',
    serverError:    'SERVER ERROR',
    connecting:     'CONNECTING…',
    lecturer:       'Lecturer',

    // ── Lecture Control ──
    lectureControl:   'Lecture Control',
    lectureActive:    'Lecture Active',
    noActiveLecture:  'No Active Lecture',
    courseLabel:      'COURSE',
    selectCourse:     '— Select a course —',
    sectionLabel:     'SECTION',
    selectSection:    '— Select a section —',
    weekLabel:        'WEEK',
    selectWeek:       '— Select a week —',
    startLecture:     '▶ Start Lecture',
    endLecture:       '■ End Lecture',
    lectureIdLabel:   'LECTURE ID',
    week:             'Week',

    // ── Attendance Page ──
    attendanceRecords:  '📋 Attendance Records',
    attendanceSubtitle: 'Select a course, section and week to view, add or remove students.',
    allCourses:         '— All Courses —',
    allSections:        '— Section —',
    allWeeks:           '— Week —',
    selectAll:          'Select Course, Section and Week to view records.',
    exportThisWeek:     '📥 Export This Week',
    exportAll:          '📊 Export All Sessions',
    addStudentManually: 'ADD STUDENT MANUALLY',
    studentIdLabel:     'STUDENT ID',
    studentNameLabel:   'STUDENT NAME',
    addStudentBtn:      '+ Add Student',
    noRecords:          'No attendance records for this session yet.',
    present:            'PRESENT',
    scanTime:           'SCAN TIME',
    nameCol:            'NAME',
    idCol:              'STUDENT ID',

    // ── Admin Panel ──
    adminPanel:         '🛡️ Admin Panel',
    adminSubtitle:      'Full control over doctors, faculties and course assignments.',
    doctorsTab:         '👨‍⚕️ Doctors',
    coursesTab:         '📚 Course Assignments',
    addDoctor:          '+ Add Doctor',
    newDoctorAccount:   'NEW DOCTOR ACCOUNT',
    fullName:           'FULL NAME *',
    email:              'EMAIL *',
    password:           'PASSWORD *',
    specialty:          'SPECIALTY',
    saveDoctor:         '✓ Save Doctor',
    assignCourse:       '+ Assign Course',
    assignCourseTitle:  'ASSIGN COURSE TO DOCTOR',
    doctor:             'DOCTOR *',
    faculty:            'FACULTY *',
    department:         'DEPARTMENT *',
    course:             'COURSE *',
    classType:          'TYPE',
    assign:             '✓ Assign',
    noDoctors:          'No doctors yet. Click "+ Add Doctor" to create one.',
    noCoursesAssigned:  'No courses assigned yet.',
    emailCol:           'EMAIL',
    specialtyCol:       'SPECIALTY',
    coursesCol:         'COURSES',
    allDoctors:         '— All doctors —',

    // ── Courses Page ──
    myCourses:          '📚 My Courses',
    coursesSubtitle:    'Manage the courses you teach.',
    searchLabel:        'SEARCH',
    searchPlaceholder:  'Course name or code…',
    coursesAssigned:    'courses assigned',
    addCourse:          '+ Add Course',
    cancelBtn:          '✕ Cancel',
    addCourseTitle:     'ADD A COURSE YOU TEACH',
    selectFaculty:      '— Select Faculty —',
    selectDept:         '— Select Department —',
    selectCourseOpt:    '— Select Course —',
    saveCourse:         '✓ Save Course',
    noCourses:          'You have no courses yet.',
  },

  ar: {
    // ── App branding ──
    appName:        'يوني أتيند',
    appSubtitle:    'نظام الحضور الذكي الجامعي',
    universityName: 'جامعة المنوفية الأهلية',

    // ── Sign In ──
    signIn:            'تسجيل الدخول',
    signInBtn:         '← تسجيل الدخول',
    accessDashboard:   'الوصول إلى لوحة التحكم',
    emailLabel:        'البريد الإلكتروني',
    passwordLabel:     'كلمة المرور',
    emailPlaceholder:  'user@university.edu',
    passPlaceholder:   'أدخل كلمة المرور',
    doctorRole:        'دكتور',
    adminRole:         'مدير النظام',
    demoAccounts:      'حسابات تجريبية',
    invalidCredentials:'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    enterEmailPass:    'يرجى إدخال البريد الإلكتروني وكلمة المرور.',
    wrongRole:         'يرجى تحديد الدور الصحيح لتسجيل الدخول.',
    footer:            '© 2026 نظام حضور جامعة المنوفية الأهلية.',

    // ── Sidebar ──
    sectionMain:          'الرئيسية',
    sectionAdministration:'الإدارة',
    sectionAcademic:      'الأكاديمية',
    sectionSystem:        'النظام',
    navDashboard:         'لوحة التحكم',
    navAttendance:        'الحضور',
    navStudents:          'الطلاب',
    navCourses:           'المقررات',
    navReports:           'التقارير',
    navAdmin:             'لوحة المدير',
    navQR:                'التحكم بالـ QR',
    navSettings:          'الإعدادات',
    signOut:              'تسجيل الخروج',
    adminAccess:          'صلاحيات مدير النظام',
    doctorAccess:         'صلاحيات عضو هيئة التدريس',
    facultyMember:        'عضو هيئة التدريس',
    sysAdmin:             'مدير النظام',

    // ── Navbar ──
    navbarTitle:    'لوحة حضور أعضاء هيئة التدريس',
    lectureLive:    'المحاضرة نشطة',
    serverOnline:   'الخادم متصل',
    serverError:    'خطأ في الخادم',
    connecting:     'جارٍ الاتصال…',
    lecturer:       'محاضر',

    // ── Lecture Control ──
    lectureControl:   'التحكم في المحاضرة',
    lectureActive:    'المحاضرة نشطة',
    noActiveLecture:  'لا توجد محاضرة نشطة',
    courseLabel:      'المقرر',
    selectCourse:     '— اختر المقرر —',
    sectionLabel:     'الشعبة',
    selectSection:    '— اختر الشعبة —',
    weekLabel:        'الأسبوع',
    selectWeek:       '— اختر الأسبوع —',
    startLecture:     '▶ بدء المحاضرة',
    endLecture:       '■ إنهاء المحاضرة',
    lectureIdLabel:   'رقم المحاضرة',
    week:             'أسبوع',

    // ── Attendance Page ──
    attendanceRecords:  '📋 سجلات الحضور',
    attendanceSubtitle: 'اختر المقرر والشعبة والأسبوع لعرض السجلات وتعديلها.',
    allCourses:         '— جميع المقررات —',
    allSections:        '— الشعبة —',
    allWeeks:           '— الأسبوع —',
    selectAll:          'اختر المقرر والشعبة والأسبوع لعرض السجلات.',
    exportThisWeek:     '📥 تصدير هذا الأسبوع',
    exportAll:          '📊 تصدير جميع الجلسات',
    addStudentManually: 'إضافة طالب يدوياً',
    studentIdLabel:     'رقم الطالب',
    studentNameLabel:   'اسم الطالب',
    addStudentBtn:      '+ إضافة طالب',
    noRecords:          'لا توجد سجلات حضور لهذه الجلسة بعد.',
    present:            'الحاضرون',
    scanTime:           'وقت المسح',
    nameCol:            'الاسم',
    idCol:              'رقم الطالب',

    // ── Admin Panel ──
    adminPanel:         '🛡️ لوحة المدير',
    adminSubtitle:      'التحكم الكامل في أعضاء هيئة التدريس والمقررات الدراسية.',
    doctorsTab:         'أعضاء هيئة التدريس',
    coursesTab:         '📚 تعيين المقررات',
    addDoctor:          '+ إضافة دكتور',
    newDoctorAccount:   'حساب دكتور جديد',
    fullName:           'الاسم الكامل *',
    email:              'البريد الإلكتروني *',
    password:           'كلمة المرور *',
    specialty:          'التخصص',
    saveDoctor:         '✓ حفظ',
    assignCourse:       '+ تعيين مقرر',
    assignCourseTitle:  'تعيين مقرر لعضو هيئة التدريس',
    doctor:             'الدكتور *',
    faculty:            'الكلية *',
    department:         'القسم *',
    course:             'المقرر *',
    classType:          'النوع',
    assign:             '✓ تعيين',
    noDoctors:          'لا يوجد أعضاء حتى الآن.',
    noCoursesAssigned:  'لم يتم تعيين مقررات بعد.',
    emailCol:           'البريد الإلكتروني',
    specialtyCol:       'التخصص',
    coursesCol:         'المقررات',
    allDoctors:         '— جميع الأطباء —',

    // ── Courses Page ──
    myCourses:          '📚 مقرراتي',
    coursesSubtitle:    'إدارة المقررات التي تدرسها.',
    searchLabel:        'بحث',
    searchPlaceholder:  'اسم المقرر أو الكود…',
    coursesAssigned:    'مقرر محدد',
    addCourse:          '+ إضافة مقرر',
    cancelBtn:          '✕ إلغاء',
    addCourseTitle:     'إضافة مقرر تدرّسه',
    selectFaculty:      '— اختر الكلية —',
    selectDept:         '— اختر القسم —',
    selectCourseOpt:    '— اختر المقرر —',
    saveCourse:         '✓ حفظ المقرر',
    noCourses:          'لا توجد مقررات بعد.',
  },
};

// ─────────────────────────────────────────────────────────────────
// Language Context
// ─────────────────────────────────────────────────────────────────
const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const savedLang  = localStorage.getItem('uniattend_lang')  || 'en';
  const savedTheme = localStorage.getItem('uniattend_theme') || 'dark';

  const [lang,  setLang]  = useState(savedLang);
  const [theme, setTheme] = useState(savedTheme);

  const t     = (key) => translations[lang]?.[key] ?? translations['en'][key] ?? key;
  const isRTL = lang === 'ar';

  // Apply direction, font, and theme to document
  useEffect(() => {
    document.documentElement.dir        = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang       = lang;
    document.documentElement.setAttribute('data-theme', theme);
    document.body.style.fontFamily = isRTL
      ? "'Cairo', 'Segoe UI', sans-serif"
      : "'Inter', 'Outfit', sans-serif";
    localStorage.setItem('uniattend_lang',  lang);
    localStorage.setItem('uniattend_theme', theme);
  }, [lang, isRTL, theme]);

  const toggleLang  = () => setLang(l  => l  === 'en' ? 'ar' : 'en');
  const toggleTheme = () => setTheme(t => t  === 'dark' ? 'light' : 'dark');

  return (
    <LanguageContext.Provider value={{ lang, t, isRTL, toggleLang, theme, toggleTheme }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
