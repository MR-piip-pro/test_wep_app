// تكوين Firebase
export const firebaseConfig = {
    apiKey: "AIzaSyB3bBsR5j6CHYaXkriIF_g4ZvWGYd3WTiQ",
    authDomain: "mr-piip-pro.firebaseapp.com",
    projectId: "mr-piip-pro",
    storageBucket: "mr-piip-pro.appspot.com",
    messagingSenderId: "826519029119",
    appId: "1:826519029119:web:548c3298af3b20f370464a",
    measurementId: "G-MQ3QVBXJS4"
};

// التحقق من صحة التكوين
function validateConfig(config) {
    return (
        config &&
        config.apiKey &&
        config.apiKey.startsWith('AIza') &&
        config.authDomain.includes('firebaseapp.com') &&
        config.projectId === 'mr-piip-pro'
    );
}

// التحقق من صحة التكوين قبل التصدير
if (!validateConfig(firebaseConfig)) {
    throw new Error('تكوين Firebase غير صالح');
} 