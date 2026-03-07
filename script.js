// ========================================
// ===== CONFIGURACIÓN GLOBAL =====
// ========================================
const CONFIG = {
    PASSWORD: "zonatotal123",
    SITE_NAME: "ZONA TOTAL",
    REDIRECT_DELAY: 500,
    DEBUG: false
};

// ========================================
// ===== DATOS DE PELÍCULAS Y SERIES (DESDE GOOGLE SHEETS) =====
// ========================================
const PELICULAS_DATA = {
    destacadas: [],
    todas: []
};

// URL de tu Google Sheets (la que me diste)
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJpv1h9XBYo7gJPLBx4U_1IiRkf0v-y2W2Z_o-O3V67aPSqAzvBdAomO7SPy-dVSYw3cyUwD3C0oVJ/pub?gid=245598318&single=true&output=csv';
const PROXY_URL = 'https://api.codetabs.com/v1/proxy/?quest=';

// Función para cargar los datos
async function cargarPeliculasDesdeSheet() {
    try {
        const respuesta = await fetch(PROXY_URL + encodeURIComponent(SHEET_URL));
        const csvTexto = await respuesta.text();
        
        const lineas = csvTexto.split('\n');
        const encabezados = lineas[0].split(',');
        
        const peliculas = [];
        
        for (let i = 1; i < lineas.length; i++) {
            if (lineas[i].trim() === '') continue;
            
            const valores = lineas[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            let pelicula = {};
            
            encabezados.forEach((encabezado, index) => {
    let clave = encabezado.trim().toLowerCase();
    let valor = valores[index] ? valores[index].trim() : '';

    if (valor.startsWith('"') && valor.endsWith('"')) {
        valor = valor.substring(1, valor.length - 1);
    }

    pelicula[clave] = valor;
});


            
            pelicula.id = parseInt(pelicula.id) || i;
            pelicula.rating = parseFloat(pelicula.rating) || 0;
            pelicula.year = pelicula.year || '2024';

// 🔴 Normalizar el type SIEMPRE
// 🔴 FUERZA BRUTA - Si el título es 'Prueba', forzar tipo 'serie'
if (pelicula.title === 'Prueba') {
    pelicula.type = 'serie';
} else {
    pelicula.type = (pelicula.type || 'pelicula').trim().toLowerCase();
}
console.log('Tipo detectado:', pelicula.type, 'para:', pelicula.title);
            
            peliculas.push(pelicula);
        }
        
        PELICULAS_DATA.destacadas = peliculas.slice(0, 4);
        PELICULAS_DATA.todas = peliculas;
        
        if (document.getElementById('peliculas-content').style.display === 'block') {
            initPeliculas();
        }
        
        console.log('Películas cargadas:', peliculas.length);
        // Solo mostrar notificación si hay películas
if (peliculas.length > 0) {
    const totalPeliculas = peliculas.filter(p => p.type === 'pelicula').length;
    const totalSeries = peliculas.filter(p => p.type === 'serie').length;

    showNotification(`✅ ${totalPeliculas} películas y ${totalSeries} series cargadas`, 3000);
}
        
    } catch (error) {
        console.error('Error al cargar películas:', error);
        showNotification('❌ Error al cargar las películas', 3000);
    }
}

// ========================================
// ===== INICIALIZACIÓN PRINCIPAL =====
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    initAuthSystem();
    updateCurrentYear();
    setupEventListeners();
    setupHeaderScroll();
});

// ========================================
// ===== SISTEMA DE AUTENTICACIÓN =====
// ========================================
function initAuthSystem() {
    const authScreen = document.getElementById('auth-screen');
    const mainSite = document.getElementById('main-site');
    const passwordInput = document.getElementById('password-input');
    const authSubmit = document.getElementById('auth-submit');
    const loadingScreen = document.querySelector('.loading-screen');
    
    if (hasValidAccess()) {
        authScreen.style.display = 'none';
        mainSite.classList.remove('hidden');
        loadingScreen.style.display = 'none';
        showSection('home');
        cargarPeliculasDesdeSheet();
        cargarCapitulosDesdeSheet();
        return;
    }
    
    authSubmit.addEventListener('click', handleAuthSubmit);
    
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleAuthSubmit();
        }
    });
    
    passwordInput.focus();
    
    function hasValidAccess() {
        const accessData = getAccessData();
        if (!accessData) return false;
        
        const now = Date.now();
        const expiresAt = accessData.timestamp + (24 * 60 * 60 * 1000);
        
        return accessData.granted && now < expiresAt;
    }
    
    function getAccessData() {
        const data = localStorage.getItem('zt_access_data');
        return data ? JSON.parse(data) : null;
    }
    
    function handleAuthSubmit() {
        const password = passwordInput.value.trim();
        
        if (!password) {
            showAuthError("Ingresa una contraseña");
            return;
        }
        
        if (password === CONFIG.PASSWORD) {
            const accessData = {
                granted: true,
                timestamp: Date.now(),
                site: CONFIG.SITE_NAME
            };
            localStorage.setItem('zt_access_data', JSON.stringify(accessData));
            
            authScreen.style.opacity = '0';
            authScreen.style.transform = 'scale(0.9)';
            authScreen.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                authScreen.style.display = 'none';
                mainSite.classList.remove('hidden');
                loadingScreen.style.display = 'flex';
                
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    showSection('home');
                    cargarPeliculasDesdeSheet();
                    showWelcomeMessage();
                }, 500);
            }, 300);
            
        } else {
            showAuthError("Contraseña incorrecta");
        }
    }
    
    function showAuthError(message) {
        const input = passwordInput;
        const submit = authSubmit;
        
        const originalPlaceholder = input.placeholder;
        
        input.style.borderColor = '#ff0000';
        input.style.background = 'rgba(255, 0, 0, 0.05)';
        input.value = '';
        input.placeholder = message;
        submit.disabled = true;
        
        setTimeout(() => {
            input.style.borderColor = '';
            input.style.background = '';
            input.placeholder = originalPlaceholder;
            submit.disabled = false;
            input.focus();
        }, 2000);
    }
}

// ========================================
// ===== NAVEGACIÓN ENTRE SECCIONES =====
// ========================================
function showSection(section) {
    const homeSection = document.getElementById('home-section');
    const peliculasContent = document.getElementById('peliculas-content');
    const navHome = document.getElementById('nav-home');
    const navPeliculas = document.getElementById('nav-peliculas');
    
    if (!homeSection || !peliculasContent) {
        console.error('No se encontraron las secciones');
        return;
    }
    
    if (section === 'home') {
        homeSection.style.display = 'block';
        peliculasContent.style.display = 'none';
        if (navHome) navHome.classList.add('active');
        if (navPeliculas) navPeliculas.classList.remove('active');
        window.scrollTo(0, 0);
    } else if (section === 'peliculas') {
        homeSection.style.display = 'none';
        peliculasContent.style.display = 'block';
        if (navHome) navHome.classList.remove('active');
        if (navPeliculas) navPeliculas.classList.add('active');
        initPeliculas();
        window.scrollTo(0, 0);
    }
}

// ========================================
// ===== EVENT LISTENERS =====
// ========================================
function setupEventListeners() {
    console.log('Configurando event listeners...');
    
    const navHome = document.getElementById('nav-home');
    if (navHome) {
        navHome.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('home');
        });
    }
    
    const navPeliculas = document.getElementById('nav-peliculas');
    if (navPeliculas) {
        navPeliculas.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('peliculas');
        });
    }
    
    const homeLogo = document.getElementById('home-logo');
    if (homeLogo) {
        homeLogo.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('home');
        });
    }
    
    const goToPeliculas = document.getElementById('go-to-peliculas');
    if (goToPeliculas) {
        goToPeliculas.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('peliculas');
        });
    }
    
    const footerPeliculas = document.getElementById('footer-peliculas');
    if (footerPeliculas) {
        footerPeliculas.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('peliculas');
        });
    }
    
    setupSearch();
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            logout();
        });
    }
    
    setupPlayerModal();
    setupFilters();
    
    console.log('Event listeners configurados');
}

// ========================================
// ===== HEADER SCROLL =====
// ========================================
function setupHeaderScroll() {
    const header = document.querySelector('.main-header');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// ========================================
// ===== BÚSQUEDA =====
// ========================================
function setupSearch() {
    const searchToggle = document.getElementById('search-toggle');
    const searchContainer = document.getElementById('search-container');
    const searchClose = document.getElementById('search-close');
    const searchInput = document.getElementById('search-input');
    
    if (!searchToggle || !searchContainer) return;
    
    searchToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        searchContainer.classList.toggle('active');
        if (searchContainer.classList.contains('active')) {
            searchInput.focus();
        }
    });
    
    if (searchClose) {
        searchClose.addEventListener('click', function() {
            searchContainer.classList.remove('active');
            searchInput.value = '';
        });
    }
    
    document.addEventListener('click', function(e) {
        if (!searchContainer.contains(e.target) && !searchToggle.contains(e.target)) {
            searchContainer.classList.remove('active');
        }
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.trim();
            if (query) {
                showSection('peliculas');
                setTimeout(() => {
                    if (typeof searchMovies === 'function') {
                        searchMovies(query);
                    }
                }, 300);
                searchContainer.classList.remove('active');
                this.value = '';
            }
        }
    });
}

// ========================================
// ===== PELÍCULAS =====
// ========================================
function initPeliculas() {
    const slider = document.getElementById('slider-destacadas');
    const grid = document.getElementById('grid-peliculas');
    const seriesSlider = document.getElementById('slider-series');

    if (slider) slider.innerHTML = '';
    if (grid) grid.innerHTML = '';
    if (seriesSlider) seriesSlider.innerHTML = '';

    loadDestacadas();
    loadTodasPeliculas();
    cargarSeries();

    updateGenreCounts();
    setupSliderControls();
}

function loadDestacadas() {
    const slider = document.getElementById('slider-destacadas');
    if (!slider) return;
    
    slider.innerHTML = '';
    
    PELICULAS_DATA.destacadas.forEach(pelicula => {
        const card = createPeliculaCard(pelicula, true);
        slider.appendChild(card);
    });
}

function loadTodasPeliculas() {
    const grid = document.getElementById('grid-peliculas');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // 🔴 FILTRAR SOLO PELÍCULAS Y EXCLUIR LA SERIE 999
    const soloPeliculas = PELICULAS_DATA.todas.filter(item => item.type === 'pelicula' && item.id != 999);
    
    soloPeliculas.forEach(pelicula => {
        const card = createPeliculaCard(pelicula, false);
        grid.appendChild(card);
    });
    
    console.log('Películas cargadas:', soloPeliculas.length);
}

// ===== FUNCIÓN CORREGIDA =====
function createPeliculaCard(pelicula, isSlider = false) {
    const card = document.createElement('div');
    card.className = isSlider ? 'pelicula-card slider-card' : 'pelicula-card';
    card.dataset.id = pelicula.id;
    card.dataset.genre = pelicula.genre;
    card.dataset.year = pelicula.year;
    
    const stars = getStarRating(pelicula.rating);
    
    card.innerHTML = `
        <div class="pelicula-poster">
            <img src="${pelicula.image}" alt="${pelicula.title}" loading="lazy">
        </div>
        <div class="pelicula-info">
            <h3 class="pelicula-title">${pelicula.title}</h3>
            <div class="pelicula-meta">
                <span>${pelicula.year}</span>
                <span>${pelicula.duration}</span>
            </div>
            <div class="pelicula-genre">${getGenreName(pelicula.genre)}</div>
            <p class="pelicula-desc">${pelicula.description}</p>
            <div class="pelicula-rating">${stars}</div>
            <button class="play-btn" onclick="playPelicula(${pelicula.id})">
                <i class="fas fa-play"></i> Ver ahora
            </button>
        </div>
    `;
    
    return card;
}

window.playPelicula = function(peliculaId) {
    let pelicula = PELICULAS_DATA.destacadas.find(p => p.id == peliculaId);
    if (!pelicula) {
        pelicula = PELICULAS_DATA.todas.find(p => p.id == peliculaId);
    }
    
    if (pelicula) {
        // Si es película, abre el reproductor normal
        if (pelicula.type === 'pelicula') {
            openPlayerModal(pelicula);
        } 
        // Si es serie, abre el modal de capítulos
        else if (pelicula.type === 'serie') {
            abrirModalCapitulos(pelicula);
        }
    }
};

function setupSliderControls() {
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const slider = document.getElementById('slider-destacadas');
    
    if (!prevBtn || !nextBtn || !slider) return;
    
    const scrollAmount = 320;
    
    prevBtn.addEventListener('click', () => {
        slider.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });
    
    nextBtn.addEventListener('click', () => {
        slider.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });
}

function updateGenreCounts() {
    const genreCards = document.querySelectorAll('.genero-card');

    genreCards.forEach(card => {
        const genre = card.dataset.genre;
        const countElement = card.querySelector('p');

        if (countElement && genre) {
            const count = PELICULAS_DATA.todas.filter(p => {

                // 🔴 Solo contar películas
                if (p.type !== 'pelicula') return false;

                const normalized = p.genre
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");

                return normalized === genre;
            }).length;

            countElement.textContent = `${count} películas`;
        }
    });
}

function filterMovieList(genre, year) {
    const grid = document.getElementById('grid-peliculas');
    if (!grid) return;
    
    const cards = grid.querySelectorAll('.pelicula-card');
    let visibleCount = 0;
    
    cards.forEach(card => {
        const cardGenre = card.dataset.genre;
        const cardYear = parseInt(card.dataset.year);
        
        let show = true;
        
        if (genre !== 'all' && cardGenre !== genre) {
            show = false;
        }
        
        if (year !== 'all') {
            if (year === '2020' && cardYear < 2020) show = false;
            else if (year === '2010' && (cardYear < 2010 || cardYear > 2019)) show = false;
            else if (year === '2000' && (cardYear < 2000 || cardYear > 2009)) show = false;
            else if (year === '1990' && (cardYear < 1990 || cardYear > 1999)) show = false;
            else if (year === '1980' && cardYear >= 1990) show = false;
        }
        
        if (show) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
}

window.searchMovies = function(query) {
    const searchTerm = query.toLowerCase().trim();
    const grid = document.getElementById('grid-peliculas');
    
    if (!grid) return;
    
    const cards = grid.querySelectorAll('.pelicula-card');
    let visibleCount = 0;
    
    cards.forEach(card => {
        const title = card.querySelector('.pelicula-title').textContent.toLowerCase();
        const desc = card.querySelector('.pelicula-desc').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || desc.includes(searchTerm)) {
            card.style.display = 'block';
            visibleCount++;
            
            card.style.borderColor = '#e50914';
            card.style.boxShadow = '0 0 20px rgba(229, 9, 20, 0.3)';
            
            setTimeout(() => {
                card.style.borderColor = '';
                card.style.boxShadow = '';
            }, 2000);
        } else {
            card.style.display = 'none';
        }
    });
    
    showNotification(`Encontradas ${visibleCount} películas para "${query}"`);
};

function setupFilters() {
    const genreFilter = document.getElementById('filter-genre');
    const yearFilter = document.getElementById('filter-year');
    
    if (genreFilter) {
        genreFilter.addEventListener('change', function() {
            filterMovieList(this.value, yearFilter?.value || 'all');
        });
    }
    
    if (yearFilter) {
        yearFilter.addEventListener('change', function() {
            filterMovieList(genreFilter?.value || 'all', this.value);
        });
    }
}

// ========================================
// ===== MODAL REPRODUCTOR =====
// ========================================
function setupPlayerModal() {
    const modal = document.getElementById('player-modal');
    const closeBtn = document.getElementById('close-player');
    
    if (!modal || !closeBtn) return;
    
    closeBtn.addEventListener('click', closePlayerModal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closePlayerModal();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closePlayerModal();
        }
    });
}

function openPlayerModal(movieData) {
    const modal = document.getElementById('player-modal');
    const playerContainer = document.getElementById('player-container');
    const playerTitle = document.getElementById('player-title');
    const movieTitle = document.getElementById('movie-title');
    const movieDetails = document.getElementById('movie-details');
    const movieRating = document.getElementById('movie-rating');
    
    if (!modal || !playerContainer) return;
    
    playerTitle.textContent = `Reproduciendo: ${movieData.title}`;
    movieTitle.textContent = movieData.title;
    movieDetails.textContent = `${movieData.year} · ${getGenreName(movieData.genre)} · ${movieData.duration}`;
    movieRating.textContent = movieData.rating;
    
    playerContainer.innerHTML = `
        <iframe src="${movieData.embedUrl}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
        </iframe>
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closePlayerModal() {
    const modal = document.getElementById('player-modal');
    const playerContainer = document.getElementById('player-container');
    
    if (!modal || !playerContainer) return;
    
    playerContainer.innerHTML = '';
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ========================================
// ===== FUNCIONES UTILITARIAS =====
// ========================================
function updateCurrentYear() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

function showWelcomeMessage() {
    if (!localStorage.getItem('zt_welcome_shown')) {
        setTimeout(() => {
            showNotification('🎬 ¡Bienvenido a ZONA TOTAL!');
            localStorage.setItem('zt_welcome_shown', 'true');
        }, 1500);
    }
}

function showNotification(message, duration = 3000) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-info-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: #1a1a1a;
        color: #f5f5f1;
        padding: 15px 25px;
        border-radius: 10px;
        border-left: 4px solid #e50914;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 350px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, duration);
}

function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        localStorage.removeItem('zt_access_data');
        localStorage.removeItem('zt_welcome_shown');
        window.location.reload();
    }
}

window.showLegalInfo = function() {
    showNotification('AVISO LEGAL: Sitio de uso exclusivamente personal. Contenido de fuentes públicas.', 5000);
};

window.showPrivacyInfo = function() {
    showNotification('PRIVACIDAD: No recopilamos datos personales. Acceso mediante contraseña local.', 5000);
};

window.showHelpInfo = function() {
    showNotification('AYUDA: Navega por las categorías y haz clic en cualquier película para reproducir.', 5000);
};

// ========================================
// ===== FUNCIONES AUXILIARES =====
// ========================================
function getStarRating(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '<i class="fas fa-star"></i>';
    if (halfStar) stars += '<i class="fas fa-star-half-alt"></i>';
    for (let i = 0; i < emptyStars; i++) stars += '<i class="far fa-star"></i>';
    
    return stars;
}

function getGenreName(genreKey) {
    const genres = {
        'accion': 'Acción',
        'drama': 'Drama',
        'comedia': 'Comedia',
        'terror': 'Terror',
        'clasicas': 'Clásicas',
        'aventura': 'Aventura'
    };
    return genres[genreKey] || genreKey;
}

// ========================================
// ===== MENÚ HAMBURGUESA =====
// ========================================
const hamburgerBtn = document.getElementById('hamburger-btn');
const mainNav = document.getElementById('main-nav');

if (hamburgerBtn && mainNav) {
    hamburgerBtn.addEventListener('click', function() {
        mainNav.classList.toggle('active');
        
        const icon = this.querySelector('i');
        if (mainNav.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });

    const navLinks = mainNav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            mainNav.classList.remove('active');
            const icon = hamburgerBtn.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        });
    });

    document.addEventListener('click', function(e) {
        if (!mainNav.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            mainNav.classList.remove('active');
            const icon = hamburgerBtn.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
}

// ========================================
// ===== PANEL DE ADMINISTRACIÓN =====
// ========================================
const ADMIN_PASSWORD = "admin123";

const btnAdmin = document.getElementById('btn-admin');
const adminPanel = document.getElementById('admin-panel');
const toggleAdmin = document.getElementById('toggle-admin');
const formPelicula = document.getElementById('form-pelicula');
const adminCancel = document.getElementById('admin-cancel');

// URL DE TU APPS SCRIPT (YA INCLUIDA)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzcP9qWzKmrZ0v7tfjiV3jYCoevDkPY0RJB7NtUBGwiZHNKWukx_PoF4ggJ2VyqOw0DGA/exec';

if (btnAdmin && adminPanel) {
    btnAdmin.addEventListener('click', () => {
        const pass = prompt('Ingresa contraseña de administrador:');
        if (pass === ADMIN_PASSWORD) {
            adminPanel.style.display = 'block';
            btnAdmin.style.display = 'none';
        } else if (pass !== null) {
            showNotification('❌ Contraseña incorrecta', 2000);
        }
    });
}

if (toggleAdmin && adminPanel && btnAdmin) {
    toggleAdmin.addEventListener('click', () => {
        adminPanel.style.display = 'none';
        btnAdmin.style.display = 'inline-block';
    });
}
if (adminCancel && formPelicula) {
    adminCancel.addEventListener('click', () => {
        formPelicula.reset();
    });
}

if (formPelicula) {
    formPelicula.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nuevaPelicula = {
            id: document.getElementById('admin-id').value,
            title: document.getElementById('admin-title').value,
            year: document.getElementById('admin-year').value,
            genre: document.getElementById('admin-genre').value,
            duration: document.getElementById('admin-duration').value,
            rating: document.getElementById('admin-rating').value,
            description: document.getElementById('admin-description').value,
            embedUrl: document.getElementById('admin-embedUrl').value,
            image: document.getElementById('admin-image').value,
            type: document.getElementById('admin-type').value
        };
        
        showNotification('📤 Enviando película...', 2000);
        
        try {
            const respuesta = await fetch('https://script.google.com/macros/s/AKfycbzcP9qWzKmrZ0v7tfjiV3jYCoevDkPY0RJB7NtUBGwiZHNKWukx_PoF4ggJ2VyqOw0DGA/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(nuevaPelicula)
});

if (!respuesta.ok) {
    throw new Error("No se pudo guardar en Google Sheets");
}

const data = await respuesta.json();

if (!data.success) {
    throw new Error("Error desde Apps Script");
}
            
            showNotification('✅ Película guardada en Google Sheets', 3000);
            
            const nuevasPeliculas = [...PELICULAS_DATA.todas, nuevaPelicula];
            PELICULAS_DATA.destacadas = nuevasPeliculas.slice(0, 4);
            PELICULAS_DATA.todas = nuevasPeliculas;
            
            if (document.getElementById('peliculas-content').style.display === 'block') {
                initPeliculas();
            }
            
            formPelicula.reset();
            
        } catch (error) {
            console.error('Error al guardar:', error);
            showNotification('❌ Error al guardar. Intenta de nuevo.', 3000);
        }
    });
}

// ========================================
// ===== SERIES =====
// ========================================
function cargarSeries() {
    const contenedor = document.getElementById('slider-series');
    if (!contenedor) return;

    contenedor.innerHTML = "";

    // 🔴 FILTRAR SOLO SERIES
    const soloSeries = PELICULAS_DATA.todas.filter(item => item.type === 'serie');

    soloSeries.forEach(serie => {
        const card = createPeliculaCard(serie, false);
        contenedor.appendChild(card);
    });

    contenedor.className = 'peliculas-grid';
    console.log('Series cargadas:', soloSeries.length);
}

function setupSeriesControls() {
    const prevBtn = document.getElementById('series-prev');
    const nextBtn = document.getElementById('series-next');
    const slider = document.getElementById('slider-series');
    
    if (!prevBtn || !nextBtn || !slider) return;
    
    const scrollAmount = 320;
    
    prevBtn.addEventListener('click', () => {
        slider.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });
    
    nextBtn.addEventListener('click', () => {
        slider.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });
}

// ========================================
// ===== ESTILOS DINÁMICOS =====
// ========================================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .notification-content {
        display: flex;
        align-items: center;
        gap: 15px;
    }
    .notification-content i {
        color: #e50914;
        font-size: 1.2rem;
    }
`;
document.head.appendChild(style);

// ===== FUNCIONES GLOBALES PARA EL ADMIN =====
window.mostrarPanelAdmin = function() {
    const modal = document.getElementById('adminModalOverlay');
    if (modal) {
        modal.style.display = 'flex';
    }
};

window.cerrarModalAdmin = function() {
    const modal = document.getElementById('adminModalOverlay');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.verificarPasswordAdmin = function() {
    const input = document.getElementById('adminPasswordInput');
    if (!input) return;

    if (input.value === "admin123") {
        cerrarModalAdmin();
        if (typeof mostrarPanelGestion === "function") {
            mostrarPanelGestion();
        }
    } else {
        alert("❌ Contraseña incorrecta");
        input.value = "";
    }
};

// ========================================
// ===== CARGAR CAPÍTULOS DESDE GOOGLE SHEETS =====
// ========================================
let capitulosData = [];

async function cargarCapitulosDesdeSheet() {
    try {
        const CAPITULOS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJpv1h9XBYo7gJPLBx4U_1IiRkf0v-y2W2Z_o-O3V67aPSqAzvBdAomO7SPy-dVSYw3cyUwD3C0oVJ/pub?gid=932880485&single=true&output=csv';  
        const respuesta = await fetch(PROXY_URL + encodeURIComponent(CAPITULOS_URL));
        const csvTexto = await respuesta.text();
        
        const lineas = csvTexto.split('\n');
        const encabezados = lineas[0].split(',');
        
        for (let i = 1; i < lineas.length; i++) {
            if (lineas[i].trim() === '') continue;
            
            const valores = lineas[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            let capitulo = {};
            
            encabezados.forEach((encabezado, index) => {
                let clave = encabezado.trim().toLowerCase();
                let valor = valores[index] ? valores[index].trim() : '';
                if (valor.startsWith('"') && valor.endsWith('"')) {
                    valor = valor.substring(1, valor.length - 1);
                }
                capitulo[clave] = valor;
            });
            
            capitulosData.push(capitulo);
        }
        
        console.log('✅ Capítulos cargados:', capitulosData.length);
        
    } catch (error) {
        console.error('Error al cargar capítulos:', error);
    }
}


// ========================================
// ===== MODAL DE CAPÍTULOS PARA SERIES =====
// ========================================
function abrirModalCapitulos(serie) {
    // Filtrar capítulos de esta serie
    const capitulosSerie = capitulosData.filter(cap => cap.serie_id == serie.id);
    
    // Ordenar por temporada y número
    capitulosSerie.sort((a, b) => {
        if (a.temporada !== b.temporada) return a.temporada - b.temporada;
        return a.numero_capitulo - b.numero_capitulo;
    });
    
    // Crear modal si no existe
    let modal = document.getElementById('capitulos-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'capitulos-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    // Agrupar por temporadas
    const temporadas = {};
    capitulosSerie.forEach(cap => {
        if (!temporadas[cap.temporada]) temporadas[cap.temporada] = [];
        temporadas[cap.temporada].push(cap);
    });
    
    // Construir HTML con REPRODUCTOR ARRIBA y LISTA ABAJO
    let capitulosHTML = '';
    for (let temp in temporadas) {
        capitulosHTML += `<div class="temporada-section">`;
        capitulosHTML += `<h3 class="temporada-titulo">Temporada ${temp}</h3>`;
        
        temporadas[temp].forEach(cap => {
            capitulosHTML += `
                <div class="capitulo-item" onclick="reproducirCapituloEnModal('${cap.embedurl_capitulo}', '${cap.titulo_capitulo}', ${cap.numero_capitulo})">
                    <div class="capitulo-numero">${cap.numero_capitulo}</div>
                    <div class="capitulo-info">
                        <h4>${cap.titulo_capitulo}</h4>
                        <p>${cap.duracion || '45 min'}</p>
                    </div>
                </div>
            `;
        });
        
        capitulosHTML += `</div>`;
    }
    
    modal.innerHTML = `
        <div class="modal-content series-modal">
            <button class="close-modal" onclick="cerrarModalCapitulos()">&times;</button>
            
            <!-- CABECERA DE LA SERIE -->
            <div class="series-header">
               
                <div class="series-header-info">
                    <h2>${serie.title}</h2>
                    <p>${serie.year} · ${getGenreName(serie.genre)}</p>
                    <p class="series-desc">${serie.description}</p>
                </div>
            </div>
            
            <!-- REPRODUCTOR (visible cuando se elige un capítulo) -->
            <div class="reproductor-container" id="reproductor-container" style="display: none;">
                <div class="player-wrapper" id="player-wrapper"></div>
            </div>
            
            <!-- LISTA DE CAPÍTULOS -->
            <div class="capitulos-lista" id="capitulos-lista">
                ${capitulosHTML}
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Función para reproducir capítulo dentro del mismo modal
function reproducirCapituloEnModal(embedUrl, titulo, numero) {
    const reproductor = document.getElementById('reproductor-container');
    const playerWrapper = document.getElementById('player-wrapper');
    const lista = document.getElementById('capitulos-lista');
    
    // Mostrar reproductor
    reproductor.style.display = 'block';
    
    // Poner el video
    playerWrapper.innerHTML = `
        <div class="video-info">
            <span class="capitulo-actual">Capítulo ${numero}: ${titulo}</span>
        </div>
        <iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>
    `;
    
    // Scroll suave hacia el reproductor
    reproductor.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cerrarModalCapitulos() {
    const modal = document.getElementById('capitulos-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}