// تكوين المصادقة
export const AUTH_CONFIG = {
    // المسارات
    ROUTES: {
        LOGIN: '/usr.html',
        ADMIN: '/admin.html',
        UNAUTHORIZED: '/unauthorized.html'
    },
    
    // رسائل الخطأ
    ERROR_MESSAGES: {
        INVALID_EMAIL: 'البريد الإلكتروني غير صالح',
        USER_NOT_FOUND: 'هذا الحساب غير موجود في النظام',
        WRONG_PASSWORD: 'كلمة المرور غير صحيحة',
        NOT_ADMIN: 'ليس لديك صلاحيات الوصول إلى لوحة الإدارة',
        ACCOUNT_DISABLED: 'تم تعطيل هذا الحساب',
        GENERAL_ERROR: 'حدث خطأ غير متوقع'
    },

    // رسائل النجاح
    SUCCESS_MESSAGES: {
        LOGIN_SUCCESS: 'تم تسجيل الدخول بنجاح',
        LOGOUT_SUCCESS: 'تم تسجيل الخروج بنجاح'
    },

    // تكوين Firebase المخصص
    FIREBASE_COLLECTIONS: {
        ADMINS: 'admins',
        USERS: 'users',
        SYSTEM: 'system',
        ACTIVITY_LOGS: 'activity_logs'
    }
}; 