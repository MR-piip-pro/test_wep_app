import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  where 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
  getAuth, 
  onAuthStateChanged,
  signInAnonymously 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { firebaseConfig } from './config/config.js';

// تهيئة Firebase
try {
  console.log('بدء تهيئة Firebase...');
  const app = initializeApp(firebaseConfig);
  console.log('تم تهيئة Firebase بنجاح');
  
  const db = getFirestore(app);
  const auth = getAuth(app);
  
  console.log('تم تهيئة Firestore و Auth بنجاح');
} catch (error) {
  console.error('خطأ في تهيئة Firebase:', error);
  showError('خطأ في تهيئة التطبيق');
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
let currentUser = null;

// التحقق من حالة المصادقة
onAuthStateChanged(auth, (user) => {
  console.log('تغيير حالة المصادقة:', user ? 'مسجل الدخول' : 'غير مسجل الدخول');
  currentUser = user;
  if (!user) {
    console.log('محاولة تسجيل الدخول كمستخدم مجهول...');
    signInAnonymously(auth)
      .then(() => {
        console.log('تم تسجيل الدخول كمستخدم مجهول بنجاح');
        loadTools(); // إعادة تحميل الأدوات بعد تسجيل الدخول
      })
      .catch(error => {
        console.error("خطأ في المصادقة:", error);
        showError('خطأ في تسجيل الدخول');
      });
  } else {
    loadTools(); // تحميل الأدوات إذا كان المستخدم مسجل الدخول
  }
});

// دالة مساعدة للتحقق من صحة المدخلات
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '');
}

// دالة مساعدة للتحقق من صحة معرف المستند
function isValidDocId(id) {
  return typeof id === 'string' && id.length > 0 && id.length <= 100;
}

// تحميل الأدوات من Firestore مع التحققات الأمنية
async function loadTools() {
  if (isLoading) return;
  
  isLoading = true;
  showLoading();

  try {
    console.log('بدء تحميل الأدوات...');
    
    // التحقق من وجود مستخدم
    if (!currentUser) {
      throw new Error("يجب تسجيل الدخول لعرض الأدوات");
    }

    const toolsRef = collection(db, "tools");
    console.log('تم إنشاء مرجع المجموعة');

    const toolsQuery = query(
      toolsRef,
      orderBy("added_at", "desc"),
      limit(50)
    );
    console.log('تم إنشاء الاستعلام');

    const snapshot = await getDocs(toolsQuery);
    console.log('تم استلام البيانات:', snapshot.size, 'أداة');

    if (snapshot.empty) {
      console.log('لا توجد أدوات في قاعدة البيانات');
      showNoTools();
      return;
    }

    allTools = snapshot.docs
      .map(doc => {
        const data = doc.data();
        console.log('معالجة الأداة:', doc.id);
        
        if (!isValidDocId(doc.id) || !data.name) {
          console.warn("تم تخطي أداة غير صالحة:", doc.id);
          return null;
        }
        
        return {
          id: doc.id,
          name: sanitizeInput(data.name),
          description: sanitizeInput(data.description || ''),
          link: sanitizeInput(data.link || '#'),
          tags: Array.isArray(data.tags) ? data.tags.map(tag => sanitizeInput(tag)) : [],
          category: sanitizeInput(data.category || ''),
          added_at: data.added_at || new Date().getTime()
        };
      })
      .filter(tool => tool !== null);

    console.log('تم معالجة', allTools.length, 'أداة بنجاح');
    
    filteredTools = [...allTools];
    renderTools();
  } catch (error) {
    console.error("خطأ أثناء تحميل الأدوات:", error);
    showError(error.message);
  } finally {
    isLoading = false;
  }
}

// عرض الأدوات مع تحسينات الأمان
function renderTools() {
  console.log('بدء عرض الأدوات...');
  
  if (!Array.isArray(filteredTools) || filteredTools.length === 0) {
    console.log('لا توجد أدوات للعرض');
    showNoTools();
    return;
  }

  try {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredTools.length);
    const currentTools = filteredTools.slice(startIndex, endIndex);
    
    console.log('عرض الأدوات من', startIndex + 1, 'إلى', endIndex);

    const toolsHTML = currentTools.map(tool => {
      if (!tool || !tool.name) {
        console.warn('تم تخطي أداة غير صالحة أثناء العرض');
        return '';
      }
      
      return `
        <div class="tool-card" data-tool-id="${tool.id}">
          <h2>${sanitizeInput(tool.name)}</h2>
          <p>${sanitizeInput(tool.description || '')}</p>
          <div class="tags">
            ${tool.tags ? tool.tags.map(tag => `<span class="tag">${sanitizeInput(tag)}</span>`).join('') : ''}
          </div>
          <a href="${sanitizeInput(tool.link)}" 
             target="_blank" 
             rel="noopener noreferrer"
             onclick="return confirmExternalLink(event)">
            <i class="fas fa-download"></i> تحميل الأداة
          </a>
        </div>
      `;
    }).join('');

    const totalPages = Math.ceil(filteredTools.length / itemsPerPage);
    console.log('إجمالي الصفحات:', totalPages);

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
    
    console.log('تم عرض الأدوات بنجاح');
  } catch (error) {
    console.error("خطأ في عرض الأدوات:", error);
    showError("حدث خطأ أثناء عرض الأدوات");
  }
}

// التحقق من الروابط الخارجية
window.confirmExternalLink = function(event) {
  const url = event.currentTarget.href;
  if (!url.startsWith('https://')) {
    event.preventDefault();
    alert('عذراً، يسمح فقط بالروابط الآمنة (HTTPS)');
    return false;
  }
  return confirm('هل أنت متأكد من أنك تريد فتح هذا الرابط الخارجي؟');
};

// تغيير الصفحة مع التحقق من صحة المدخلات
window.changePage = function(newPage) {
  const totalPages = Math.ceil(filteredTools.length / itemsPerPage);
  newPage = parseInt(newPage);
  
  if (isNaN(newPage) || newPage < 1 || newPage > totalPages) {
    console.error("رقم صفحة غير صالح");
    return;
  }
  
  currentPage = newPage;
  renderTools();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// البحث والتصفية مع تحسينات الأمان
function filterTools() {
  try {
    const searchTerm = sanitizeInput(searchInput.value.toLowerCase());
    const category = sanitizeInput(categoryFilter.value);
    const sortBy = sanitizeInput(sortFilter.value);

    // التحقق من صحة معايير التصفية
    if (searchTerm.length > 100) {
      throw new Error("نص البحث طويل جداً");
    }

    filteredTools = allTools.filter(tool => {
      if (!tool || !tool.name) return false;
      
      const matchesSearch = tool.name.toLowerCase().includes(searchTerm) ||
                           (tool.description && tool.description.toLowerCase().includes(searchTerm));
      const matchesCategory = !category || (tool.category === category);
      return matchesSearch && matchesCategory;
    });

    // الترتيب مع التحقق من صحة المعايير
    filteredTools.sort((a, b) => {
      if (!a || !b) return 0;
      
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
  } catch (error) {
    console.error("خطأ في تصفية الأدوات:", error);
    showError(error.message);
  }
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

// إضافة مستمعي الأحداث مع حماية من التكرار
function addEventListeners() {
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const debouncedFilter = debounce(filterTools, 300);
  
  searchInput.addEventListener('input', debouncedFilter);
  searchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    filterTools();
  });
  categoryFilter.addEventListener('change', filterTools);
  sortFilter.addEventListener('change', filterTools);
}

// تهيئة التطبيق
function initApp() {
  addEventListeners();
  loadTools();
}

// بدء التطبيق
initApp();
