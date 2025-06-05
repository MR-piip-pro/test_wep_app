// تكوين Firebase الآمن
const getFirebaseConfig = () => {
  console.log('جاري تحميل تكوين Firebase...');
  
  // التحقق من وجود جميع المتغيرات المطلوبة
  const config = {
    apiKey: "AIzaSyB3bBsR5j6CHYaXkrIIF_g4ZvWGYd3WTiQ",
    authDomain: "mr-piip-pro.firebaseapp.com",
    projectId: "mr-piip-pro",
    storageBucket: "mr-piip-pro.appspot.com",
    messagingSenderId: "826519029119",
    appId: "1:826519029119:web:548c3298af3b20f370464a",
    measurementId: "G-MQ3QVBXJS4"
  };

  // التحقق من صحة التكوين
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    console.error('حقول مفقودة في تكوين Firebase:', missingFields);
    throw new Error('تكوين Firebase غير مكتمل');
  }

  console.log('تم تحميل تكوين Firebase بنجاح');
  return config;
};

export const firebaseConfig = getFirebaseConfig(); 