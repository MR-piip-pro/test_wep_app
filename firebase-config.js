// نظام تشفير وفك تشفير التكوين
const ENCRYPTION_KEY = "MR_PIIP_PRO_SECURE_KEY";

function decrypt(encryptedData) {
    const result = [];
    for (let i = 0; i < encryptedData.length; i++) {
        result.push(String.fromCharCode(
            encryptedData[i].charCodeAt(0) ^ ENCRYPTION_KEY[i % ENCRYPTION_KEY.length].charCodeAt(0)
        ));
    }
    return result.join('');
}

// التكوين المشفر
const encryptedConfig = "ZkJXNHlCM2JCc1I1ajZDSFlhWGtyaUlGX2c0WnZXR1lkM1dUaVEKbXItcGlpcC1wcm8uZmlyZWJhc2VhcHAuY29tCm1yLXBpaXAtcHJvCm1yLXBpaXAtcHJvLmFwcHNwb3QuY29tCjgyNjUxOTAyOTExOQoxOjgyNjUxOTAyOTExOTp3ZWI6NTQ4YzMyOThhZjNiMjBmMzcwNDY0YQpHLU1RM1FWQlhKUzQ=";

// استرجاع التكوين
function getFirebaseConfig() {
    try {
        const decryptedData = decrypt(atob(encryptedConfig));
        const [apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId] = decryptedData.split('\n');
        
        return {
            apiKey,
            authDomain,
            projectId,
            storageBucket,
            messagingSenderId,
            appId,
            measurementId
        };
    } catch (error) {
        console.error('Error decrypting config:', error);
        throw new Error('فشل في استرجاع التكوين');
    }
}

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

// تصدير التكوين
export const firebaseConfig = getFirebaseConfig();
if (!validateConfig(firebaseConfig)) {
    throw new Error('تكوين Firebase غير صالح');
} 