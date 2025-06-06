import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// البيانات التجريبية
const sampleTools = [
  {
    name: "Visual Studio Code",
    description: "محرر أكواد متقدم ومجاني من مايكروسوفت",
    link: "https://code.visualstudio.com/",
    tags: ["تطوير", "محرر أكواد", "مجاني"],
    category: "development",
    added_at: Date.now()
  },
  {
    name: "GIMP",
    description: "برنامج تحرير الصور المجاني والبديل عن Photoshop",
    link: "https://www.gimp.org/",
    tags: ["تصميم", "تحرير الصور", "مجاني"],
    category: "design",
    added_at: Date.now() - 86400000 // يوم واحد قبل
  },
  {
    name: "Notion",
    description: "منصة لتنظيم الملاحظات والمشاريع والتعاون",
    link: "https://www.notion.so/",
    tags: ["إنتاجية", "تنظيم", "مجاني"],
    category: "productivity",
    added_at: Date.now() - 172800000 // يومين قبل
  },
  {
    name: "7-Zip",
    description: "برنامج ضغط وفك ضغط الملفات المجاني",
    link: "https://www.7-zip.org/",
    tags: ["أدوات", "ضغط الملفات", "مجاني"],
    category: "utilities",
    added_at: Date.now() - 259200000 // ثلاثة أيام قبل
  }
];

// دالة لإضافة البيانات التجريبية
async function addSampleTools() {
  try {
    console.log('بدء إضافة البيانات التجريبية...');
    const toolsRef = collection(db, "tools");
    
    for (const tool of sampleTools) {
      await addDoc(toolsRef, tool);
      console.log(`تمت إضافة: ${tool.name}`);
    }
    
    console.log('تم إضافة جميع البيانات التجريبية بنجاح!');
  } catch (error) {
    console.error('خطأ في إضافة البيانات التجريبية:', error);
  }
}

// إضافة البيانات
addSampleTools(); 