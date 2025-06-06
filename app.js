import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// تهيئة Firebase
console.log('بدء تهيئة Firebase...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

// دالة مساعدة للتحقق من صحة المدخلات
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '');
}

// تحميل الأدوات من Firestore
async function loadTools() {
  if (isLoading) {
    console.log('جاري تحميل الأدوات بالفعل...');
    return;
  }
  
  isLoading = true;
  showLoading();

  try {
    console.log('بدء تحميل الأدوات...');
    
    const toolsRef = collection(db, "tools");
    console.log('تم إنشاء مرجع المجموعة:', toolsRef.path);

    const toolsQuery = query(
      toolsRef,
      orderBy("added_at", "desc"),
      limit(50)
    );
    console.log('تم إنشاء الاستعلام');

    console.log('جاري تنفيذ الاستعلام...');
    const snapshot = await getDocs(toolsQuery);
    console.log('تم استلام البيانات:', snapshot.size, 'أداة');

    if (snapshot.empty) {
      console.log('لا توجد أدوات في قاعدة البيانات');
      showNoTools();
      return;
    }

    allTools = snapshot.docs.map(doc => {
      console.log('معالجة الأداة:', doc.id);
      const data = doc.data();
      console.log('بيانات الأداة:', data);
      
      return {
        id: doc.id,
        name: sanitizeInput(data.name || ''),
        description: sanitizeInput(data.description || ''),
        link: sanitizeInput(data.link || '#'),
        tags: Array.isArray(data.tags) ? data.tags.map(tag => sanitizeInput(tag)) : [],
        category: sanitizeInput(data.category || ''),
        added_at: data.added_at || new Date().getTime()
      };
    });

    console.log('تم معالجة', allTools.length, 'أداة بنجاح');
    console.log('الأدوات:', allTools);
    
    filteredTools = [...allTools];
    renderTools();
  } catch (error) {
    console.error("خطأ أثناء تحميل الأدوات:", error);
    console.error("تفاصيل الخطأ:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    showError(`خطأ في تحميل الأدوات: ${error.message}`);
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
      <div class="tool-card">
        <h2>${tool.name || 'بدون اسم'}</h2>
        <p>${tool.description || 'لا يوجد وصف'}</p>
        <div class="tags">
          ${tool.tags ? tool.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
        </div>
        <a href="${tool.link || '#'}" 
           target="_blank" 
           rel="noopener noreferrer">
          <i class="fas fa-download"></i> تحميل الأداة
        </a>
      </div>
    `).join('');

    const totalPages = Math.ceil(filteredTools.length / itemsPerPage);

    const paginationHTML = `
      <div class="pagination">
        ${currentPage > 1 ? `<button onclick="changePage(${currentPage - 1})" class="page-btn"><i class="fas fa-chevron-right"></i></button>` : ''}
        <span class="page-info">صفحة ${currentPage} من ${totalPages}</span>
        ${currentPage < totalPages ? `<button onclick="changePage(${currentPage + 1})" class="page-btn"><i class="fas fa-chevron-left"></i></button>` : ''}
      </div>
    `;

    toolsContainer.innerHTML = `
      <div class="tools-grid">
        ${toolsHTML}
      </div>
      ${paginationHTML}
    `;
  } catch (error) {
    console.error("خطأ في عرض الأدوات:", error);
    showError("حدث خطأ أثناء عرض الأدوات");
  }
}

// تغيير الصفحة
window.changePage = function(newPage) {
  currentPage = newPage;
  renderTools();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// البحث والتصفية
function filterTools() {
  const searchTerm = searchInput.value.toLowerCase();
  const category = categoryFilter.value;
  const sortBy = sortFilter.value;

  filteredTools = allTools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm) ||
                         (tool.description && tool.description.toLowerCase().includes(searchTerm));
    const matchesCategory = !category || (tool.category === category);
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
      <p>لا توجد أدوات متاحة حالياً</p>
    </div>
  `;
}

function showError(message = "حدث خطأ أثناء تحميل الأدوات") {
  toolsContainer.innerHTML = `
    <div class="error">
      <i class="fas fa-exclamation-circle"></i>
      <p>${sanitizeInput(message)}</p>
      <button onclick="loadTools()" class="retry-btn">
        <i class="fas fa-sync"></i> إعادة المحاولة
      </button>
    </div>
  `;
}

// إضافة مستمعي الأحداث
searchInput.addEventListener('input', filterTools);
searchBtn.addEventListener('click', filterTools);
categoryFilter.addEventListener('change', filterTools);
sortFilter.addEventListener('change', filterTools);

// تحميل الأدوات عند تشغيل الصفحة
loadTools();
