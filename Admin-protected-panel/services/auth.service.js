import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { AUTH_CONFIG } from '../config/auth.js';
import firebaseConfig from '../firebase-config.js';

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

class AuthService {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
    }

    // مراقبة حالة المصادقة
    initAuthStateListener(onAuthChange) {
        return onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user;
                this.isAdmin = await this._checkAdminStatus(user);
            } else {
                this.currentUser = null;
                this.isAdmin = false;
            }
            if (onAuthChange) onAuthChange(user, this.isAdmin);
        });
    }

    // تسجيل الدخول
    async login(email, password) {
        try {
            // محاولة تسجيل الدخول أولاً
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // التحقق من وجود المستخدم في Firestore
            const userDoc = await getDoc(doc(db, AUTH_CONFIG.FIREBASE_COLLECTIONS.USERS, user.uid));
            
            if (!userDoc.exists()) {
                // إذا كان هذا أول مستخدم، قم بإنشاء حساب مسؤول
                const isFirstUser = !(await getDoc(doc(db, AUTH_CONFIG.FIREBASE_COLLECTIONS.SYSTEM, 'config'))).exists();
                
                if (isFirstUser) {
                    await this._createFirstAdmin(user);
                    return {
                        user,
                        isAdmin: true
                    };
                }
                
                // إذا لم يكن المستخدم موجوداً في النظام
                await this.logout();
                throw new Error(AUTH_CONFIG.ERROR_MESSAGES.USER_NOT_FOUND);
            }

            // التحقق من أن الحساب غير معطل
            const userData = userDoc.data();
            if (userData.disabled) {
                await this.logout();
                throw new Error(AUTH_CONFIG.ERROR_MESSAGES.ACCOUNT_DISABLED);
            }

            // التحقق من صلاحيات المسؤول
            const isAdmin = await this._checkAdminStatus(user);
            if (!isAdmin) {
                await this.logout();
                throw new Error(AUTH_CONFIG.ERROR_MESSAGES.NOT_ADMIN);
            }

            // تحديث معلومات آخر تسجيل دخول
            await this._updateLastLogin(user.uid);

            return {
                user,
                isAdmin
            };
        } catch (error) {
            console.error('Login error:', error);
            
            // إذا كان الخطأ من Firebase Auth
            if (error.code) {
                throw this._handleAuthError(error);
            }
            
            // إذا كان الخطأ من التحقق الإضافي
            throw error;
        }
    }

    // تسجيل الخروج
    async logout() {
        try {
            await signOut(auth);
            this.currentUser = null;
            this.isAdmin = false;
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    // التحقق من حالة المسؤول
    async _checkAdminStatus(user) {
        try {
            const adminRef = doc(db, AUTH_CONFIG.FIREBASE_COLLECTIONS.ADMINS, user.uid);
            const adminDoc = await getDoc(adminRef);
            
            if (!adminDoc.exists()) {
                return false;
            }

            const adminData = adminDoc.data();
            return !adminData.disabled;
        } catch (error) {
            console.error('Admin check error:', error);
            return false;
        }
    }

    // إنشاء أول مسؤول في النظام
    async _createFirstAdmin(user) {
        try {
            const batch = db.batch();

            // إنشاء وثيقة تكوين النظام
            const systemRef = doc(db, AUTH_CONFIG.FIREBASE_COLLECTIONS.SYSTEM, 'config');
            batch.set(systemRef, {
                firstAdminEmail: user.email,
                createdAt: serverTimestamp(),
                systemVersion: '1.0.0'
            });

            // إنشاء وثيقة المسؤول
            const adminRef = doc(db, AUTH_CONFIG.FIREBASE_COLLECTIONS.ADMINS, user.uid);
            batch.set(adminRef, {
                email: user.email.toLowerCase(),
                displayName: user.displayName || 'المسؤول الرئيسي',
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
                isFirstAdmin: true,
                role: 'superadmin',
                permissions: ['*'],
                disabled: false
            });

            // إنشاء وثيقة المستخدم
            const userRef = doc(db, AUTH_CONFIG.FIREBASE_COLLECTIONS.USERS, user.uid);
            batch.set(userRef, {
                email: user.email.toLowerCase(),
                displayName: user.displayName || 'المسؤول الرئيسي',
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
                role: 'admin',
                disabled: false
            });

            // تنفيذ جميع العمليات معاً
            await batch.commit();
            return true;
        } catch (error) {
            console.error('Error creating first admin:', error);
            throw error;
        }
    }

    // تحديث آخر تسجيل دخول
    async _updateLastLogin(userId) {
        try {
            const batch = db.batch();
            const timestamp = serverTimestamp();

            const adminRef = doc(db, AUTH_CONFIG.FIREBASE_COLLECTIONS.ADMINS, userId);
            batch.update(adminRef, { lastLoginAt: timestamp });

            const userRef = doc(db, AUTH_CONFIG.FIREBASE_COLLECTIONS.USERS, userId);
            batch.update(userRef, { lastLoginAt: timestamp });

            await batch.commit();
        } catch (error) {
            console.error('Error updating last login:', error);
        }
    }

    // معالجة أخطاء المصادقة
    _handleAuthError(error) {
        let message = AUTH_CONFIG.ERROR_MESSAGES.GENERAL_ERROR;
        
        switch (error.code) {
            case 'auth/invalid-email':
                message = AUTH_CONFIG.ERROR_MESSAGES.INVALID_EMAIL;
                break;
            case 'auth/user-disabled':
                message = AUTH_CONFIG.ERROR_MESSAGES.ACCOUNT_DISABLED;
                break;
            case 'auth/user-not-found':
                message = AUTH_CONFIG.ERROR_MESSAGES.USER_NOT_FOUND;
                break;
            case 'auth/wrong-password':
                message = AUTH_CONFIG.ERROR_MESSAGES.WRONG_PASSWORD;
                break;
            default:
                if (error.message) {
                    message = error.message;
                }
        }
        
        return new Error(message);
    }
}

// تصدير نسخة واحدة من الخدمة
export const authService = new AuthService(); 