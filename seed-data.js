import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// البيانات الأولية
const initialTools = [
    {
        name: "محرر النصوص المتقدم",
        description: "محرر نصوص قوي مع دعم للغة العربية وميزات متقدمة",
        link: "https://example.com/text-editor",
        tags: ["تحرير", "نصوص", "برمجة"],
        category: "development",
        added_at: Date.now()
    },
    {
        name: "منسق الصور الذكي",
        description: "أداة لتنسيق وتحسين الصور تلقائياً",
        link: "https://example.com/image-formatter",
        tags: ["صور", "تصميم", "تحرير"],
        category: "design",
        added_at: Date.now() - 86400000 // يوم واحد قبل
    },
    {
        name: "منظم المهام اليومية",
        description: "تطبيق لتنظيم المهام وإدارة الوقت بكفاءة",
        link: "https://example.com/task-organizer",
        tags: ["تنظيم", "إنتاجية", "مهام"],
        category: "productivity",
        added_at: Date.now() - 172800000 // يومان قبل
    }
];

// دالة لإضافة البيانات الأولية
async function seedDatabase() {
    try {
        // التحقق من وجود أدوات
        const toolsRef = collection(db, "tools");
        const toolsSnapshot = await getDocs(query(toolsRef));
        
        if (toolsSnapshot.empty) {
            console.log('بدء إضافة البيانات الأولية...');
            
            for (const tool of initialTools) {
                try {
                    const docRef = await addDoc(collection(db, "tools"), tool);
                    console.log('تمت إضافة أداة جديدة بمعرف:', docRef.id);
                } catch (error) {
                    console.error('خطأ في إضافة الأداة:', error);
                }
            }
            
            console.log('تم إضافة البيانات الأولية بنجاح');
        } else {
            console.log('البيانات موجودة بالفعل');
        }
    } catch (error) {
        console.error('خطأ في تهيئة البيانات:', error);
    }
}

// تشغيل التهيئة
seedDatabase(); 