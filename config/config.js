// تكوين Firebase الآمن
const getFirebaseConfig = () => {
  // التحقق من وجود المتغيرات البيئية المطلوبة
  const requiredEnvVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'FIREBASE_MEASUREMENT_ID'
  ];

  // في بيئة الإنتاج، يجب أن تأتي هذه القيم من متغيرات البيئة
  // في بيئة التطوير، يمكن استخدام قيم افتراضية آمنة
  const config = {
    apiKey: process.env.FIREBASE_API_KEY || 'development_api_key',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'development.firebaseapp.com',
    projectId: process.env.FIREBASE_PROJECT_ID || 'development-project',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'development.appspot.com',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '000000000000',
    appId: process.env.FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-0000000000'
  };

  // التحقق من صحة التكوين في بيئة الإنتاج
  if (process.env.NODE_ENV === 'production') {
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }
  }

  return config;
};

export const firebaseConfig = getFirebaseConfig(); 