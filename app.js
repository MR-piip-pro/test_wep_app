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

// تهيئة Firebase مع التحقق من الأمان
try {
  console.log('بدء تهيئة Firebase...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  console.log('تم تهيئة Firebase بنجاح');
} catch (error) {
  console.error('خطأ في تهيئة Firebase:', error);
  showError('فشل في الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
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
  } catch (error) {
    console.error("خطأ أثناء تحميل الأدوات:", error);
    showError(`فشل في تحميل الأدوات. يرجى المحاولة مرة أخرى.`);
  } finally {
    isLoading = false;
  }
}

// عرض الأدوات
function renderTools() {
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
  } catch (error) {
    console.error("خطأ في عرض الأدوات:", error);
    showError("حدث خطأ أثناء عرض الأدوات");
  }
}

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

// الحصول على اسم الفئة
function getCategoryName(category) {
  const categories = {
    'development': 'تطوير',
    'design': 'تصميم',
    'productivity': 'إنتاجية',
    'utilities': 'أدوات مساعدة'
  };
  return categories[category] || category;
}

// البحث والتصفية
function filterTools() {
  const searchTerm = sanitizeInput(searchInput.value.toLowerCase());
  const category = sanitizeInput(categoryFilter.value);
  const sortBy = sanitizeInput(sortFilter.value);

  filteredTools = allTools.filter(tool => {
    const matchesSearch = 
      tool.name.toLowerCase().includes(searchTerm) ||
      tool.description.toLowerCase().includes(searchTerm) ||
      tool.tags.some(tag => tag.toLowerCase().includes(searchTerm));
    
    const matchesCategory = !category || tool.category === category;
    return matchesSearch && matchesCategory;
  });

  // الترتيب
  filteredTools.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return (b.added_at || 0) - (a.added_at || 0);
      case 'oldest':
        return (a.added_at || 0) - (b.added_at || 0);
      case 'name':
        return (a.name || '').localeCompare(b.name || '', 'ar');
      default:
        return 0;
    }
  });

  currentPage = 1;
  renderTools();
}

// عناصر واجهة المستخدم
function showLoading() {
  toolsContainer.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <p>جاري تحميل الأدوات...</p>
    </div>
  `;
}

function showNoTools() {
  toolsContainer.innerHTML = `
    <div class="no-tools">
      <i class="fas fa-box-open"></i>
      <p>لا توجد أدوات متاحة${searchInput.value ? ' تطابق البحث' : ' حالياً'}</p>
    </div>
  `;
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error';
  errorDiv.innerHTML = `
    <i class="fas fa-exclamation-circle"></i>
    <p>${sanitizeInput(message)}</p>
    <button onclick="loadTools()" class="retry-btn">
      <i class="fas fa-sync"></i> إعادة المحاولة
    </button>
  `;
  toolsContainer.innerHTML = '';
  toolsContainer.appendChild(errorDiv);
}

// إضافة مستمعي الأحداث مع منع التكرار السريع
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(filterTools, 300);
});

searchBtn.addEventListener('click', () => {
  clearTimeout(searchTimeout);
  filterTools();
});

categoryFilter.addEventListener('change', filterTools);
sortFilter.addEventListener('change', filterTools);

// منع الهجمات XSS في النموذج
searchInput.addEventListener('input', (e) => {
  e.target.value = sanitizeInput(e.target.value);
});

// تحميل الأدوات عند تشغيل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  loadTools();
});
