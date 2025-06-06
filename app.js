// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  startAfter,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// متغيرات عامة للتطبيق
let db;
let app;

// تهيئة Firebase مع التحقق من الأمان
async function initializeFirebase() {
  try {
    console.log('بدء تهيئة Firebase...');
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('تم تهيئة Firebase بنجاح');
    
    // تحميل الأدوات مباشرة بعد تهيئة Firebase
    await loadTools();
  } catch (error) {
    console.error('خطأ في تهيئة Firebase:', error);
    showError('فشل في الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
  }
}

// العناصر في DOM
const toolsContainer = document.getElementById("tools-container");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const categoryFilter = document.getElementById("category-filter");
const sortFilter = document.getElementById("sort-filter");

// حالة التطبيق
let allTools = [];
let filteredTools = [];
let isLoading = false;
let currentPage = 1;
const itemsPerPage = 10;
let lastVisible = null;

// دالة مساعدة للتحقق من صحة المدخلات
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
}

// دالة للتحقق من صحة الروابط
function validateUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

// تحميل الأدوات من Firestore
async function loadTools(loadMore = false) {
  if (isLoading) {
    console.log('جاري تحميل الأدوات بالفعل...');
    return;
  }
  
  isLoading = true;
  if (!loadMore) {
    showLoading();
  }

  try {
    console.log('بدء تحميل الأدوات...');
    
    if (!db) {
      throw new Error('قاعدة البيانات غير متصلة');
    }
    
    const toolsRef = collection(db, "tools");
    let toolsQuery;

    if (loadMore && lastVisible) {
      toolsQuery = query(
        toolsRef,
        orderBy("added_at", "desc"),
        startAfter(lastVisible),
        limit(itemsPerPage)
      );
    } else {
      toolsQuery = query(
        toolsRef,
        orderBy("added_at", "desc"),
        limit(itemsPerPage)
      );
    }

    console.log('جاري تنفيذ الاستعلام...');
    const snapshot = await getDocs(toolsQuery);
    
    console.log('عدد النتائج:', snapshot.size);
    
    if (snapshot.empty && !loadMore) {
      console.log('لا توجد أدوات في قاعدة البيانات');
      showNoTools();
      return;
    }

    // تحديث آخر عنصر مرئي للتحميل المتتالي
    lastVisible = snapshot.docs[snapshot.docs.length - 1];

    const newTools = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: sanitizeInput(data.name || ''),
        description: sanitizeInput(data.description || ''),
        link: validateUrl(data.link) ? data.link : '#',
        tags: Array.isArray(data.tags) ? data.tags.map(tag => sanitizeInput(tag)) : [],
        category: sanitizeInput(data.category || ''),
        added_at: data.added_at || new Date().getTime()
      };
    });

    if (loadMore) {
      allTools = [...allTools, ...newTools];
    } else {
      allTools = newTools;
    }

    console.log('تم معالجة', newTools.length, 'أداة بنجاح');
    
    filterTools();
    renderTools(); // إضافة استدعاء مباشر لـ renderTools
  } catch (error) {
    console.error("خطأ أثناء تحميل الأدوات:", error);
    showError(`فشل في تحميل الأدوات. يرجى المحاولة مرة أخرى. السبب: ${error.message}`);
  } finally {
    isLoading = false;
  }
}

// عرض الأدوات
function renderTools() {
  console.log('بدء عرض الأدوات...', filteredTools.length, 'أداة');
  
  if (!toolsContainer) {
    console.error('لم يتم العثور على حاوية الأدوات في الصفحة');
    return;
  }

  if (filteredTools.length === 0) {
    showNoTools();
    return;
  }

  try {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredTools.length);
    const currentTools = filteredTools.slice(startIndex, endIndex);

    const toolsHTML = currentTools.map(tool => `
      <div class="tool-card" data-category="${tool.category}">
        <h2>${tool.name || 'بدون اسم'}</h2>
        <p>${tool.description || 'لا يوجد وصف'}</p>
        <div class="tags">
          ${tool.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
        <div class="tool-footer">
          <span class="category-badge">${getCategoryName(tool.category)}</span>
          <a href="${tool.link}" 
             class="download-btn"
             target="_blank" 
             rel="noopener noreferrer"
             onclick="return confirmDownload(event)">
            <i class="fas fa-download"></i> تحميل الأداة
          </a>
        </div>
      </div>
    `).join('');

    const loadMoreButton = filteredTools.length > endIndex ? `
      <button onclick="loadMoreTools()" class="load-more-btn">
        <i class="fas fa-plus"></i> تحميل المزيد
      </button>
    ` : '';

    toolsContainer.innerHTML = `
      <div class="tools-grid">
        ${toolsHTML}
      </div>
      ${loadMoreButton}
    `;
    
    console.log('تم عرض الأدوات بنجاح');
  } catch (error) {
    console.error("خطأ في عرض الأدوات:", error);
    showError("حدث خطأ أثناء عرض الأدوات");
  }
}

// تصفية الأدوات
function filterTools() {
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const categoryValue = categoryFilter ? categoryFilter.value : 'all';
  
  filteredTools = allTools.filter(tool => {
    const matchesSearch = 
      tool.name.toLowerCase().includes(searchTerm) ||
      tool.description.toLowerCase().includes(searchTerm) ||
      tool.tags.some(tag => tag.toLowerCase().includes(searchTerm));
      
    const matchesCategory = categoryValue === 'all' || tool.category === categoryValue;
    
    return matchesSearch && matchesCategory;
  });
  
  console.log('تم تصفية الأدوات:', filteredTools.length, 'أداة');
  renderTools();
}

// عرض حالة التحميل
function showLoading() {
  if (toolsContainer) {
    toolsContainer.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>جاري تحميل الأدوات...</p>
      </div>
    `;
  }
}

// عرض رسالة عند عدم وجود أدوات
function showNoTools() {
  if (toolsContainer) {
    toolsContainer.innerHTML = `
      <div class="no-tools">
        <i class="fas fa-box-open"></i>
        <p>لا توجد أدوات متاحة حالياً</p>
      </div>
    `;
  }
}

// عرض رسالة خطأ
function showError(message) {
  if (toolsContainer) {
    toolsContainer.innerHTML = `
      <div class="error">
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
        <button onclick="initializeFirebase()" class="retry-btn">
          <i class="fas fa-redo"></i> إعادة المحاولة
        </button>
      </div>
    `;
  }
}

// تحويل رمز التصنيف إلى اسم
function getCategoryName(category) {
  const categories = {
    'security': 'أمان',
    'development': 'تطوير',
    'utility': 'أدوات مساعدة',
    'other': 'أخرى'
  };
  return categories[category] || category;
}

// إعداد أحداث DOM
document.addEventListener('DOMContentLoaded', () => {
  // بدء تهيئة Firebase عند تحميل الصفحة
  initializeFirebase();
  
  // إضافة مستمعي الأحداث
  if (searchInput) {
    searchInput.addEventListener('input', filterTools);
  }
  
  if (searchBtn) {
    searchBtn.addEventListener('click', filterTools);
  }
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', filterTools);
  }
  
  if (sortFilter) {
    sortFilter.addEventListener('change', filterTools);
  }
});

// تأكيد التحميل
window.confirmDownload = function(event) {
  const link = event.currentTarget.href;
  if (!validateUrl(link)) {
    event.preventDefault();
    showError('الرابط غير صالح');
    return false;
  }
  return true;
};

// تحميل المزيد من الأدوات
window.loadMoreTools = async function() {
  await loadTools(true);
};
