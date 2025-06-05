import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// تهيئة Firebase
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

// تحميل الأدوات من Firestore
async function loadTools() {
  if (isLoading) return;
  
  isLoading = true;
  showLoading();

  try {
    const toolsRef = collection(db, "tools");
    const toolsQuery = query(toolsRef, orderBy("added_at", "desc"));
    const snapshot = await getDocs(toolsQuery);

    if (snapshot.empty) {
      showNoTools();
      return;
    }

    allTools = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    filteredTools = [...allTools];
    renderTools();
  } catch (error) {
    console.error("حدث خطأ أثناء تحميل الأدوات:", error);
    showError();
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

  // حساب الأدوات التي سيتم عرضها في الصفحة الحالية
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTools = filteredTools.slice(startIndex, endIndex);

  const toolsHTML = currentTools.map(tool => `
    <div class="tool-card">
      <h2>${tool.name || 'بدون اسم'}</h2>
      <p>${tool.description || 'لا يوجد وصف'}</p>
      <div class="tags">
        ${tool.tags ? tool.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
      </div>
      <a href="${tool.link || '#'}" target="_blank">
        <i class="fas fa-download"></i> تحميل الأداة
      </a>
    </div>
  `).join('');

  // إضافة أزرار التنقل بين الصفحات
  const totalPages = Math.ceil(filteredTools.length / itemsPerPage);
  const paginationHTML = `
    <div class="pagination">
      ${currentPage > 1 ? `<button onclick="changePage(${currentPage - 1})" class="page-btn"><i class="fas fa-chevron-right"></i></button>` : ''}
      <span class="page-info">صفحة ${currentPage} من ${totalPages}</span>
      ${currentPage < totalPages ? `<button onclick="changePage(${currentPage + 1})" class="page-btn"><i class="fas fa-chevron-left"></i></button>` : ''}
    </div>
  `;

  toolsContainer.innerHTML = `
    <div class="tools-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem;">
      ${toolsHTML}
    </div>
    ${paginationHTML}
  `;
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
        return b.added_at - a.added_at;
      case 'oldest':
        return a.added_at - b.added_at;
      case 'name':
        return a.name.localeCompare(b.name, 'ar');
      default:
        return 0;
    }
  });

  currentPage = 1; // إعادة التعيين إلى الصفحة الأولى عند التصفية
  renderTools();
}

// عناصر واجهة المستخدم
function showLoading() {
  if (!toolsContainer.querySelector('.loading-spinner')) {
    toolsContainer.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>جاري تحميل الأدوات...</p>
      </div>
    `;
  }
}

function showNoTools() {
  toolsContainer.innerHTML = `
    <div class="no-tools">
      <i class="fas fa-box-open"></i>
      <p>لا توجد أدوات متاحة حالياً</p>
    </div>
  `;
}

function showError() {
  toolsContainer.innerHTML = `
    <div class="error">
      <i class="fas fa-exclamation-circle"></i>
      <p>حدث خطأ أثناء تحميل الأدوات</p>
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
