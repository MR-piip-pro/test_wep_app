// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
    apiKey: "AIzaSyB3bBsR5j6CHYaXkrIIF_g4ZvWGYd3WTiQ",
    authDomain: "mr-piip-pro.firebaseapp.com",
    projectId: "mr-piip-pro",
    storageBucket: "mr-piip-pro.firebasestorage.app",
    messagingSenderId: "826519029119",
    appId: "1:826519029119:web:548c3298af3b20f370464a",
    measurementId: "G-MQ3QVBXJS4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

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