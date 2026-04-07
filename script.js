console.log("SCRIPT CARGADO");


// ========================================
// ===== CONFIGURACIÓN GLOBAL =====
// ========================================
const CONFIG = {
    PASSWORD: "zonatotal123",
    SITE_NAME: "ZONA TOTAL",
    REDIRECT_DELAY: 500,
    DEBUG: false
};

let filtroActual = "todos";
let busquedaUsuario = "";

// ========================================
// ===== DATOS DE PELÍCULAS Y SERIES (DESDE GOOGLE SHEETS) =====
// ========================================
const PELICULAS_DATA = {
    destacadas: [],
    todas: []
};
let USUARIOS_DATA = [];

// URL de tu Google Sheets (la que me diste)
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJpv1h9XBYo7gJPLBx4U_1IiRkf0v-y2W2Z_o-O3V67aPSqAzvBdAomO7SPy-dVSYw3cyUwD3C0oVJ/pub?gid=245598318&single=true&output=csv';

const PROXY_URL = 'https://api.codetabs.com/v1/proxy/?quest=';

const USERS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRJpv1h9XBYo7gJPLBx4U_1IiRkf0v-y2W2Z_o-O3V67aPSqAzvBdAomO7SPy-dVSYw3cyUwD3C0oVJ/pub?gid=2019114785&single=true&output=csv';

// Función para cargar los datos
async function cargarPeliculasDesdeSheet() {
    try {
        const respuesta = await fetch(PROXY_URL + encodeURIComponent(SHEET_URL));
        const csvTexto = await respuesta.text();
        
        // Separar líneas respetando comillas
        const lineas = csvTexto.split(/\r?\n/);
        const encabezados = lineas[0].split(',').map(h => h.trim().toLowerCase());
        
        const peliculas = [];
        
        for (let i = 1; i < lineas.length; i++) {
            if (lineas[i].trim() === '') continue;
            
            // Parsear CSV respetando comillas
            const valores = [];
            let dentroComillas = false;
            let valorActual = '';
            
            for (let char of lineas[i]) {
                if (char === '"' && !dentroComillas) {
                    dentroComillas = true;
                } else if (char === '"' && dentroComillas) {
                    dentroComillas = false;
                } else if (char === ',' && !dentroComillas) {
                    valores.push(valorActual.trim());
                    valorActual = '';
                } else {
                    valorActual += char;
                }
            }
            valores.push(valorActual.trim());
            
            let pelicula = {};
            encabezados.forEach((clave, index) => {
                let valor = valores[index] || '';
                pelicula[clave] = valor;
            });
            
            pelicula.id = parseInt(pelicula.id) || i;
            pelicula.rating = parseFloat(pelicula.rating) || 0;
            pelicula.year = pelicula.year || '2024';
            
            // Forzar tipo serie si es necesario
            if (pelicula.title === 'Infiltrados') {
                pelicula.type = 'serie';
            } else {
                pelicula.type = (pelicula.type || 'pelicula').trim().toLowerCase();
            }
            
            peliculas.push(pelicula);
        }
        
        PELICULAS_DATA.destacadas = peliculas.slice(0, 4);
        PELICULAS_DATA.todas = peliculas;
        actualizarContadorPeliculas();
        
        if (document.getElementById('peliculas-content').style.display === 'block') {
            initPeliculas();
        }
        
        console.log('Películas cargadas:', peliculas.length);
        
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

async function cargarUsuariosDesdeSheet() {
    try {
        const respuesta = await fetch(PROXY_URL + encodeURIComponent(USERS_SHEET_URL));
        const csvTexto = await respuesta.text();

        const lineas = csvTexto.split(/\r?\n/);
        const encabezados = lineas[0].split(',').map(h => h.trim().toLowerCase());

        const usuarios = [];

        for (let i = 1; i < lineas.length; i++) {
            if (lineas[i].trim() === '') continue;

            const valores = lineas[i].split(',');

            let usuario = {};
            encabezados.forEach((clave, index) => {
                usuario[clave] = (valores[index] || '').trim();
            });

            usuarios.push(usuario);
        }

        USUARIOS_DATA = usuarios;
        console.log("Usuarios cargados:", USUARIOS_DATA);
        cargarUsuarios();

        } catch (error) {
        console.error("Error cargando usuarios:", error);
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
    const usernameInput = document.getElementById('username-input');
    const authSubmit = document.getElementById('auth-submit');
    const loadingScreen = document.querySelector('.loading-screen');
    cargarUsuariosDesdeSheet();
    
    if (hasValidAccess()) {
    authScreen.style.display = 'none';
    mainSite.classList.remove('hidden');
    loadingScreen.style.display = 'none';
    showSection('home');
    cargarPeliculasDesdeSheet();
    cargarUsuariosDesdeSheet();
    actualizarContadorPeliculas();
    cargarCapitulosDesdeSheet();
    bloquearMenuSinAcceso();
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
        const username = usernameInput.value.trim();

        if (!username) {
             showAuthError("Ingresa tu usuario");
             return;
        }
        
        if (!password) {
            showAuthError("Ingresa una contraseña");
            return;
        }

       const usuarioEncontrado = USUARIOS_DATA.find(u => 
            u.usuario === username && u.contraseña === password
        );
        
       if (!usuarioEncontrado) {
            showAuthError("Usuario o contraseña incorrectos");
            return;
        }
        

       if (usuarioEncontrado) {

    // 🔴 BLOQUEO NUEVO
    if (usuarioEncontrado.estado !== "activo" && usuarioEncontrado.rol !== "admin") {
        document.getElementById("pantallaPendiente").style.display = "flex";
        return;
    }

    const accessData = {
        granted: true,
        timestamp: Date.now(),
        site: CONFIG.SITE_NAME,
        usuario: usuarioEncontrado.usuario,
        rol: usuarioEncontrado.rol,
        estado: usuarioEncontrado.estado
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
}else {
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

    const accessData = JSON.parse(localStorage.getItem('zt_access_data'));

    if (accessData && accessData.estado === "inactivo") {
        showNotification("⚠ Tu suscripción está inactiva");
        return;
    }

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
        
        // Normalizar ambos valores para comparar sin tildes ni mayúsculas
const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
if (genre !== 'all' && normalize(cardGenre) !== normalize(genre)) {
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

actualizarContadorPeliculas();

}

window.searchMovies = function(query) {
    const searchTerm = query.toLowerCase().trim();
    
    // Buscar en películas
    const grid = document.getElementById('grid-peliculas');
    // Buscar en series
    const seriesGrid = document.getElementById('slider-series');
    
    let visibleCount = 0;

    // Función para buscar en un contenedor
    function buscarEnContenedor(contenedor) {
        if (!contenedor) return;
        const cards = contenedor.querySelectorAll('.pelicula-card');
        cards.forEach(card => {
            const title = card.querySelector('.pelicula-title').textContent.toLowerCase();
            const desc = card.querySelector('.pelicula-desc')?.textContent.toLowerCase() || '';
            const genre = card.dataset.genre?.toLowerCase() || '';
            const year = card.dataset.year?.toLowerCase() || '';
            
            // Buscar en título, descripción, género y año
            if (title.includes(searchTerm) || 
                desc.includes(searchTerm) || 
                genre.includes(searchTerm) || 
                year.includes(searchTerm)) {
                
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
    }

    // Buscar en ambos contenedores
    buscarEnContenedor(grid);
    buscarEnContenedor(seriesGrid);
    
    showNotification(`Encontrados ${visibleCount} resultados para "${query}"`);
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
    movieDetails.textContent = `${movieData.year} · ${getGenreName(movieData.genre)} · ${movieData.duration ? movieData.duration + ' min' : '45 min'}`;
    movieRating.textContent = movieData.rating;
// 👇 ESTO ES LO NUEVO
document.getElementById('movie-description').textContent = movieData.description || 'Sin descripción disponible';
    
    // Usar directamente el embedUrl que viene de la hoja
    let embedUrl = movieData.embedUrl || movieData.embedurl;
    
    playerContainer.innerHTML = `
        <iframe src="${embedUrl}" 
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

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz9rSaKuz0wwzS9ixshVmeydVvispV5SUzuloSiBcoP6Y0D-r2Ggcfa5WcrkRc8C2MgTw/exec";

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
        mostrarNotificacion("Contraseña incorrecta", "error");
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
    // Limpiar el título de comillas y espacios
    const tituloLimpio = cap.titulo_capitulo ? cap.titulo_capitulo.replace(/"/g, '').trim() : 'Capítulo';
    // Preparar la duración
    const duracionTexto = cap.duracion ? cap.duracion + ' min' : '45 min';
    
    capitulosHTML += `
        <div class="capitulo-item" onclick="reproducirCapituloEnModal('${cap.embedurl_capitulo}', '${tituloLimpio}', ${cap.numero_capitulo})">
            <div class="capitulo-numero">${cap.numero_capitulo}</div>
            <div class="capitulo-info">
                <h4>${tituloLimpio}</h4>
                <p>${duracionTexto}</p>
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


// ========================================
// ===== SELECTOR PERSONALIZADO (CORREGIDO) =====
// ========================================
document.addEventListener('click', function(e) {
    // Cerrar todos si se hace clic fuera
    if (!e.target.closest('.custom-select-wrapper')) {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
    }

    // Abrir/cerrar al hacer clic en el trigger
    const trigger = e.target.closest('.custom-select-trigger');
    if (trigger) {
        e.preventDefault();
        const wrapper = trigger.closest('.custom-select-wrapper');
        const isOpen = wrapper.classList.contains('open');
        
        // Cerrar todos los demás
        document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
        
        // Abrir el actual si no estaba abierto
        if (!isOpen) {
            wrapper.classList.add('open');
        }
    }

    // Seleccionar opción
    const option = e.target.closest('.custom-option');
    if (option) {
        e.preventDefault();
        const wrapper = option.closest('.custom-select-wrapper');
        const trigger = wrapper.querySelector('.custom-select-trigger');
        const value = option.dataset.value;
        const text = option.textContent;

        trigger.textContent = text;
        
        wrapper.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        wrapper.classList.remove('open');

        // Filtrar
        const filterType = wrapper.dataset.filter;
        const genreSelect = document.getElementById('filter-genre');
        const yearSelect = document.getElementById('filter-year');

        if (filterType === 'genre') {
            genreSelect.value = value;
            filterMovieList(value, yearSelect.value);
        } else if (filterType === 'year') {
            yearSelect.value = value;
            filterMovieList(genreSelect.value, value);
        }
    }
});

// Sincronizar valores iniciales
document.querySelectorAll('.custom-option[data-value="all"]').forEach(opt => opt.classList.add('selected'));

// ========================================
// ===== ACTUALIZAR CONTADOR DE PELÍCULAS =====
// ========================================
function actualizarContadorPeliculas() {
    const contador = document.getElementById('movie-counter');
    if (!contador) return;

    const totalPeliculas = PELICULAS_DATA.todas.filter(p => p.type === 'pelicula').length;
    contador.innerHTML = `🎬 ${totalPeliculas} ${totalPeliculas === 1 ? 'película' : 'películas'}`;
}

// Llamar a la función después de cargar los datos
// Buscá en initAuthSystem() la línea donde llama a cargarPeliculasDesdeSheet()
// y justo después agregá:
// actualizarContadorPeliculas();

// También llamala después de filtrar (en filterMovieList)


// Forzar la ejecución del filtro manualmente
document.querySelectorAll('.custom-option').forEach(opt => {
    opt.addEventListener('click', function(e) {
        const wrapper = this.closest('.custom-select-wrapper');
        const filterType = wrapper.dataset.filter;
        const value = this.dataset.value;

        if (filterType === 'genre') {
            document.getElementById('filter-genre').value = value;
            filterMovieList(value, document.getElementById('filter-year').value);
        } else if (filterType === 'year') {
            document.getElementById('filter-year').value = value;
            filterMovieList(document.getElementById('filter-genre').value, value);
        }
    });
});


function bloquearMenuSinAcceso() {

    const accessData = JSON.parse(localStorage.getItem('zt_access_data'));

    const enlaces = document.querySelectorAll('.nav-link');

    enlaces.forEach(link => {

        if (link.id === "nav-home") return;

        link.addEventListener('click', function(e) {

            if (!accessData) {
                e.preventDefault();
                showNotification("⚠ Debes iniciar sesión para acceder");
                return;
            }

            if (accessData.estado !== "activo" && accessData.rol !== "admin") {
                e.preventDefault();
                document.getElementById("modalPendiente").style.display = "block";
                return;
            }

        });

    });

}


const btnRegister = document.getElementById("show-register");

if (btnRegister) {

    btnRegister.addEventListener("click", function() {

        document.querySelector(".auth-form").style.display = "none";

        document.getElementById("register-form").style.display = "block";

    });

}


document.addEventListener("DOMContentLoaded", function() {

    const btnCrearCuenta = document.getElementById("register-submit");

    if (btnCrearCuenta) {
        btnCrearCuenta.addEventListener("click", function() {

            const usuario = document.getElementById("reg-username").value;
            const password = document.getElementById("reg-password").value;
            const email = document.getElementById("reg-email").value;
            const telefono = document.getElementById("reg-phone").value;
            
            // ===== VALIDACIONES ANTES DE GUARDAR =====
            const soloNumeros = document.getElementById("reg-phone").value.replace(/\D/g, '');
            const emailValido = email.includes('@') && email.includes('.') && email.indexOf('@') < email.lastIndexOf('.');
            const telefonoValido = soloNumeros.length >= 8;

console.log("emailValido:", emailValido, "telefonoValido:", telefonoValido, "email:", email, "telefono:", telefono);

           if (!emailValido || !telefonoValido) {
    console.log("Entró a validación - email válido?", emailValido, "teléfono válido?", telefonoValido);

    // Mostrar mensajes de error debajo de los campos incorrectos
    if (!emailValido) {
        document.getElementById('emailError').style.display = 'block';
    } else {
        document.getElementById('emailError').style.display = 'none';
    }
    
    if (!telefonoValido) {
        document.getElementById('telefonoError').style.display = 'block';
    } else {
        document.getElementById('telefonoError').style.display = 'none';
    }
    
    // NO HAY ALERTA, solo los mensajes debajo de los campos
    return; // Detiene el envío
}

            console.log("Usuario:", usuario);
            console.log("Password:", password);
            console.log("Email:", email);
            console.log("Teléfono:", telefono);

            const formData = new FormData();
            formData.append("action", "crearUsuario");
            formData.append("usuario", usuario);
            formData.append("password", password);
            formData.append("email", email);
            formData.append("telefono", telefono);
            formData.append("estado", "pendiente");
            formData.append("rol", "cliente");
            formData.append("linkComprobante", "pendiente");

            fetch(APPS_SCRIPT_URL, {
                method: "POST",
                body: formData
            })
            .then(res => res.text())
            .then(data => {
                console.log("Usuario guardado:", data);

// 🔥 MOSTRAR MODAL
    document.getElementById('successModal').style.display = 'block';
    return;
            

// limpiar campos
document.getElementById("reg-username").value = "";
document.getElementById("reg-password").value = "";
document.getElementById("reg-email").value = "";
document.getElementById("reg-phone").value = "";
document.getElementById("comprobante").value = "";

// volver al login
document.getElementById("register-form").style.display = "none";
document.querySelector(".auth-form").style.display = "block";

// reset comprobante
localStorage.removeItem("comprobanteSubido");
           
                
                // Restaurar botón CREAR CUENTA
                const btn = document.getElementById('register-submit');
                btn.innerHTML = '<i class="fas fa-user-plus"></i> CREAR CUENTA';
                btn.style.background = '';
                document.getElementById('mensajeComprobante').style.display = 'none';
                
                // Habilitar botón SUBIR COMPROBANTE para el próximo registro
                const btnSubir = document.getElementById('reg-comprobante');
                btnSubir.disabled = false;
                btnSubir.style.background = '';
                btnSubir.style.cursor = 'pointer';
            })
            .catch(err => {
    console.error("ERROR REAL:", err);
    alert("Error: " + err);
});
        });
    }
});

// ⬇️⬇️⬇️ ESTA FUNCIÓN DEBE ESTAR FUERA ⬇️⬇️⬇️
function abrirZohoDirecto() {
    const usuario = document.getElementById("reg-username").value;
    const telefono = document.getElementById("reg-phone").value;
    
    // Usar los nombres técnicos de los campos: SingleLine y PhoneNumber
    const zohoUrl = `https://forms.zohopublic.com/zonatotal1/form/RegistroZonaTotal/formperma/S-ZTAETzCvBm05d6RRDkN6I-tIrh2ZoVeOr7CDDWy1E?SingleLine=${encodeURIComponent(usuario)}&PhoneNumber=${encodeURIComponent(telefono)}`;
    
    document.getElementById('zohoIframe').src = zohoUrl;
    document.getElementById('zohoModal').style.display = 'block';
    
    console.log("URL generada:", zohoUrl);
}


// ===== VALIDACIÓN EN TIEMPO REAL =====
function validarCampos() {
    const email = document.getElementById("reg-email").value;
    const telefono = document.getElementById("reg-phone").value;
    const soloNumeros = telefono.replace(/\D/g, '');


// 🔥 AQUI VA LO NUEVO
    
   // Validar email
    const emailValido = email.includes('@') && email.includes('.') && email.indexOf('@') < email.lastIndexOf('.');
    
    // Validar teléfono
    const telefonoValido = soloNumeros.length >= 8;
    
    // Mostrar/ocultar mensajes de error debajo de los campos
    if (email.length > 0 && !emailValido) {
        document.getElementById('emailError').style.display = 'block';
    } else {
        document.getElementById('emailError').style.display = 'none';
    }
    
    if (telefono.length > 0 && !telefonoValido) {
        document.getElementById('telefonoError').style.display = 'block';
    } else {
        document.getElementById('telefonoError').style.display = 'none';
    }
    
    // Verificar si el comprobante fue subido
    const comprobanteSubido = localStorage.getItem('comprobanteSubido') === 'true';
    
    // Habilitar/deshabilitar botón SUBIR COMPROBANTE
    const btnSubir = document.getElementById('reg-comprobante');
    if (emailValido && telefonoValido) {
        btnSubir.disabled = false;
        btnSubir.style.opacity = '1';
        btnSubir.style.cursor = 'pointer';
    } else {
        btnSubir.disabled = true;
        btnSubir.style.opacity = '0.5';
        btnSubir.style.cursor = 'not-allowed';
    }
    
    // Habilitar/deshabilitar botón CREAR CUENTA (solo si ambas condiciones se cumplen)
    const btnCrear = document.getElementById('register-submit');
    if (emailValido && telefonoValido && comprobanteSubido) {
        btnCrear.disabled = false;
        btnCrear.style.opacity = '1';
        btnCrear.style.cursor = 'pointer';
    } else {
        btnCrear.disabled = true;
        btnCrear.style.opacity = '0.5';
        btnCrear.style.cursor = 'not-allowed';
    }
}

// Agregar eventos a los campos para validar mientras escriben
document.getElementById("reg-email").addEventListener('input', validarCampos);
document.getElementById("reg-phone").addEventListener('input', validarCampos);

function cerrarModalPendiente() {
    document.getElementById("modalPendiente").style.display = "none";
}

function cerrarPantallaPendiente() {
    document.getElementById("pantallaPendiente").style.display = "none";
}

function abrirGestionUsuarios() {

    document.getElementById("adminGestionPanel").style.display = "none";

    document.getElementById("home-section").style.display = "none";
    document.getElementById("peliculas-content").style.display = "none";

    document.getElementById("usuarios-section").style.display = "block";

    // 🔥 cargar usuarios
    cargarUsuarios();
}

function volverInicio() {
    document.getElementById("usuarios-section").style.display = "none";
    document.getElementById("home-section").style.display = "block";
}

function cargarUsuarios() {

    let html = `
        <div style="
            display:grid;
            grid-template-columns: 1.2fr 1fr 2fr 1.5fr 1.2fr 1.2fr 1fr 1fr 1.5fr;
            gap:10px;
            font-weight:bold;
            padding:10px;
            background:#0f0f0f;
            border:1px solid #222;
        ">
            <div>Usuario</div>
            <div>Contraseña</div>
            <div>Email</div>
            <div>Teléfono</div>
            <div>Fecha-I</div>
            <div>Fecha-V</div>
            <div>Rol</div>
            <div>Estado</div>
            <div>Comprobante</div>
        </div>
    `;

    USUARIOS_DATA.forEach(u => {
const estadoVencimiento = calcularEstadoVencimiento(u);

if (filtroActual === "todos" && u.estado === "eliminado") {
    return;
}

if (filtroActual !== "todos" && u.estado !== filtroActual) {
    return;
}

if (busquedaUsuario && !u.usuario.toLowerCase().includes(busquedaUsuario)) {
    return;
}

        html += `
            <div style="
                display:grid;
                grid-template-columns: 1.2fr 1fr 2fr 1.5fr 1.2fr 1.2fr 1fr 1fr 1.5fr;
                gap:10px;
                padding:10px;
                background:#141414;
                border:1px solid #222;
                margin-top:5px;
                align-items:center;
            ">

                <div>${u.usuario || ""}</div>
                <div>${u.contraseña || u.password || ""}</div>
                <div>${u.email || ""}</div>
                <div>${u.telefono || ""}</div>
                <div>${formatearFecha(u.fecha_suscripcion || u.fecha_inicio || u.fecha)}</div>
                <div>${formatearFecha(u.fecha_vencimiento || u.vencimiento)}</div>
                <div>${u.rol || ""}</div>

              <div>
${
    u.estado === "eliminado"
    ? '<span style="color:#999;">Eliminado</span> ' +
      '<button onclick="activarUsuario(\'' + u.usuario + '\')" style="margin-left:10px;background:#4CAF50;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Restaurar</button>'

    : u.estado === "activo"
    ? '<span style="color:#4CAF50;">Activo</span> ' +

  (estadoVencimiento === "vencido"
    ? '<span style="color:#f44336;margin-left:5px;">(Vencido)</span>'
    : estadoVencimiento === "por_vencer"
    ? '<span style="color:#ff9800;margin-left:5px;">(Por vencer)</span>'
    : ''
  ) +
      '<button onclick="desactivarUsuario(\'' + u.usuario + '\')" style="margin-left:10px;background:#555;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Desactivar</button> ' +
      '<button onclick="eliminarUsuario(\'' + u.usuario + '\')" style="margin-left:5px;background:#f44336;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Eliminar</button>'

    : u.estado === "inactivo"
    ? '<span style="color:#f44336;">Inactivo</span> ' +
      '<button onclick="activarUsuario(\'' + u.usuario + '\')" style="margin-left:10px;background:#4CAF50;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Activar</button> ' +
      '<button onclick="eliminarUsuario(\'' + u.usuario + '\')" style="margin-left:5px;background:#f44336;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Eliminar</button>'

    : '<span style="color:#ff9800;">Pendiente</span> ' +
      '<button onclick="activarUsuario(\'' + u.usuario + '\')" style="margin-left:10px;background:#e50914;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Activar</button> ' +
      '<button onclick="eliminarUsuario(\'' + u.usuario + '\')" style="margin-left:5px;background:#f44336;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">Eliminar</button>'
}
            </div>
               <div>
    ${
        u.comprobante
        ? '<button onclick="verComprobante(\'' + u.comprobante + '\')" style="background:#2196F3;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:12px;">👁 Ver</button>'
        : 'Sin comprobante'
    }
</div>

            </div>
        `;
    });

    document.getElementById("listaUsuarios").innerHTML = html;

// 👇 AÑADE ESTO
renderDashboard();
}

function activarUsuario(usuario) {

    const btn = document.getElementById(`btn-${usuario}`);

    // 🔥 CAMBIO INSTANTÁNEO VISUAL
    if (btn) {
        btn.innerText = "Activando...";
        btn.disabled = true;
        btn.style.background = "#555";
    }

    fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            action: "activarUsuario",
            usuario: usuario,
            estado: "activo"
        })
    })
    .then(res => res.json())
    .then(data => {

        if (data.success) {

    mostrarNotificacion("Usuario activado", "success");

const user = USUARIOS_DATA.find(u => u.usuario === usuario);

if (user && user.email) {
    enviarEmailActivacion(user.email, usuario);
}

    // 🔥 VOLVER A PEDIR DATOS REALES
    cargarUsuariosDesdeSheet();

} else {
           mostrarNotificacion("Error al activar", "error");
        }

    })
    .catch(() => {
        alert("Error de conexión");
    });
}

function desactivarUsuario(usuario) {

    const btn = document.getElementById(`btn-${usuario}`);

    // 🔥 CAMBIO VISUAL
    if (btn) {
        btn.innerText = "Desactivando...";
        btn.disabled = true;
        btn.style.background = "#555";
    }

    fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            action: "cambiarEstadoUsuario",
            usuario: usuario,
            estado: "inactivo"
        })
    })
    .then(res => res.json())
    .then(data => {

        if (data.success) {

            // 🔥 actualizar en memoria
            const user = USUARIOS_DATA.find(u => u.usuario === usuario);
            if (user) user.estado = "inactivo";

            cargarUsuarios();

        } else {
            mostrarNotificacion("Error al desactivar", "error");
        }

    })
    .catch(() => {
        mostrarNotificacion("Error de conexión", "error");
    });
}


function filtrarUsuarios(filtro) {
    filtroActual = filtro;
    cargarUsuarios();
}

function buscarUsuarios(valor) {
    busquedaUsuario = valor.toLowerCase();
    cargarUsuarios();
}

// 👇 AQUÍ MISMO PEGAS ESTO 👇
function eliminarUsuario(usuario) {

  mostrarConfirmacion("¿Seguro que quieres eliminar este usuario?", () => {

        fetch(APPS_SCRIPT_URL, {
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                action: "cambiarEstadoUsuario",
                usuario: usuario,
                estado: "eliminado"
            })
        })
        .then(res => res.json())
        .then(data => {

            if (data.success) {

                const user = USUARIOS_DATA.find(u => u.usuario === usuario);
                if (user) user.estado = "eliminado";

                cargarUsuarios();
                mostrarNotificacion("Usuario eliminado", "success");

            } else {
                mostrarNotificacion("Error al eliminar", "error");
            }

        })
        .catch(() => {
            mostrarNotificacion("Error de conexión", "error");
        });

    });
}

function renderDashboard() {
    if (!USUARIOS_DATA || USUARIOS_DATA.length === 0) return;

    let total = USUARIOS_DATA.length;
    let activos = 0;
    let pendientes = 0;
    let inactivos = 0;
    let eliminados = 0;

    USUARIOS_DATA.forEach(u => {
        switch (u.estado) {
            case "activo":
                activos++;
                break;
            case "pendiente":
                pendientes++;
                break;
            case "inactivo":
                inactivos++;
                break;
            case "eliminado":
                eliminados++;
                break;
        }
    });
let ingresosCUP = 0;
let ingresosUSD = 0;

USUARIOS_DATA.forEach(u => {
    if (u.estado === "activo") {

        if (u.telefono && (
    u.telefono.startsWith("+53") ||
    u.telefono.startsWith("53") ||
    u.telefono.length === 8
)) {
            ingresosCUP += 1000;
        } else {
            ingresosUSD += 10;
        }

    }
});

    animarContador("totalUsuarios", total);
animarContador("usuariosActivos", activos);
animarContador("usuariosPendientes", pendientes);
animarContador("usuariosInactivos", inactivos);
animarContador("usuariosEliminados", eliminados);

// 👇 Y AQUÍ TAMBIÉN
document.getElementById("ingresosTotal").innerText =
    ingresosCUP + " CUP / " + ingresosUSD + " USD";
}


function animarContador(id, valorFinal) {
    const el = document.getElementById(id);
    let actual = 0;

    const incremento = Math.ceil(valorFinal / 20);

    const intervalo = setInterval(() => {
        actual += incremento;

        if (actual >= valorFinal) {
            actual = valorFinal;
            clearInterval(intervalo);
        }

        el.innerText = actual;
    }, 30);
}

function mostrarNotificacion(mensaje, tipo = "success") {

    const contenedor = document.getElementById("contenedor-notificaciones");

    const noti = document.createElement("div");

    let color = "#4CAF50"; // success

    if (tipo === "error") color = "#f44336";
    if (tipo === "warning") color = "#ff9800";

    noti.innerText = mensaje;

    noti.style.cssText = `
        background:${color};
        color:white;
        padding:12px 18px;
        margin-bottom:10px;
        border-radius:6px;
        font-size:14px;
        box-shadow:0 5px 15px rgba(0,0,0,0.3);
        opacity:0;
        transform:translateX(100%);
        transition: all 0.4s ease;
    `;

    contenedor.appendChild(noti);

    // animación entrada
    setTimeout(() => {
        noti.style.opacity = "1";
        noti.style.transform = "translateX(0)";
    }, 10);

    // salida automática
    setTimeout(() => {
        noti.style.opacity = "0";
        noti.style.transform = "translateX(100%)";

        setTimeout(() => {
            noti.remove();
        }, 400);
    }, 3000);
}

function mostrarConfirmacion(mensaje, callback) {

    const modal = document.getElementById("modalConfirmacion");
    const texto = document.getElementById("textoConfirmacion");
    const btnConfirmar = document.getElementById("btnConfirmar");
    const btnCancelar = document.getElementById("btnCancelar");

    texto.innerText = mensaje;

    modal.style.display = "flex";

    function limpiarEventos() {
        btnConfirmar.onclick = null;
        btnCancelar.onclick = null;
    }

    btnConfirmar.onclick = () => {
        limpiarEventos();
        modal.style.display = "none";
        callback();
    };

    btnCancelar.onclick = () => {
        limpiarEventos();
        modal.style.display = "none";
    };
}

function calcularEstadoVencimiento(u) {

    const fecha = u.fecha_vencimiento || u["fecha-vencimiento"] || u["fecha vencimiento"] || u.vencimiento;

if (!fecha) return "sin_fecha";

    const hoy = new Date();
    const fechaV = new Date(fecha);

    const diffTiempo = fechaV - hoy;
    const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return "vencido";
    if (diffDias <= 3) return "por_vencer";

    return "ok";
}

function formatearFecha(fecha) {

    if (!fecha) return "";

    const f = new Date(fecha);

    if (isNaN(f)) return fecha;

    const dia = String(f.getDate()).padStart(2, '0');
    const mes = String(f.getMonth() + 1).padStart(2, '0');
    const año = f.getFullYear();

    return `${dia}/${mes}/${año}`;
}

window.verComprobante = function(url) {

    if (!url) {
        alert("⚠ No hay comprobante");
        return;
    }

    // 🔥 si es "subido", mostrar aviso en vez de bloquear
    if (url === "subido") {
        alert("📩 El comprobante fue enviado por Zoho y está en tu email");
        return;
    }

    window.open(url, "_blank");
}

window.cerrarComprobante = function() {
    const modal = document.getElementById("modalComprobante");
    const iframe = document.getElementById("iframeComprobante");

    iframe.src = "";
    modal.style.display = "none";
}

async function registrarUsuario() {

    const usuario = document.getElementById("reg-username").value;
    const password = document.getElementById("reg-password").value;
    const email = document.getElementById("reg-email").value;
    const telefono = document.getElementById("reg-phone").value;
    const file = document.getElementById("comprobante").files[0];

    if (!file) {
        alert("Debes subir el comprobante");
        return;
    }

    const reader = new FileReader();

    reader.onload = async function () {

        const base64 = reader.result.split(",")[1];

        const formData = new FormData();
        formData.append("action", "crearUsuario");
        formData.append("usuario", usuario);
        formData.append("password", password);
        formData.append("email", email);
        formData.append("telefono", telefono);
        formData.append("base64", base64);
        formData.append("nombreArchivo", file.name);

        try {
            const res = await fetch(APPS_SCRIPT_URL, {
                method: "POST",
                body: formData
            });

            const text = await res.text();
console.log("RESPUESTA RAW:", text);

let data;
try {
    data = JSON.parse(text);
} catch (e) {
    alert("Respuesta inválida del servidor");
    return;
}

if (data.success) {
    document.getElementById('successModal').style.display = 'block';
} else {
    alert("Error del servidor: " + text);
}

} catch (err) {
    console.error("ERROR REAL:", err);
    alert("Error de conexión: " + err);
}
    };

    reader.readAsDataURL(file);
}

async function subirComprobante() {

    const fileInput = document.getElementById("file-comprobante");
    const file = fileInput.files[0];

    if (!file) {
        alert("Selecciona un archivo");
        return;
    }

    const reader = new FileReader();

    reader.onload = async function() {

        const base64 = reader.result.split(",")[1];

        const usuario = document.getElementById("reg-username").value;
        const password = document.getElementById("reg-password").value;
        const email = document.getElementById("reg-email").value;
        const telefono = document.getElementById("reg-phone").value;

        const formData = new FormData();

        
        formData.append("usuario", usuario);
        formData.append("password", password);
        formData.append("email", email);
        formData.append("telefono", telefono);
        formData.append("base64", base64);
        formData.append("nombreArchivo", file.name);

        fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: formData
})
.then(data => {

    localStorage.setItem("comprobanteSubido", "true");

    document.getElementById('successModal').style.display = 'block';

    const numero = "5355877689"; // 👈 sin +

    const mensaje = `Nuevo usuario registrado:
Usuario: ${usuario}
Email: ${email}
Teléfono: ${telefono}`;

    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;

})
.catch(err => {
    console.error(err);
});
    };

    reader.readAsDataURL(file);
}

document.getElementById("file-comprobante").addEventListener("change", function() {

    const file = this.files[0];

    if (!file) return;

    // Mostrar nombre
    document.getElementById("nombre-archivo").innerText = "Archivo: " + file.name;

    const preview = document.getElementById("preview-comprobante");
    preview.innerHTML = "";

    const url = URL.createObjectURL(file);

    // Si es imagen
    if (file.type.startsWith("image/")) {
        preview.innerHTML = `<img src="${url}" style="max-width:100%; border-radius:8px; margin-top:10px;">`;
    }
    
    // Si es PDF
    else if (file.type === "application/pdf") {
        preview.innerHTML = `<iframe src="${url}" style="width:100%; height:300px; margin-top:10px; border:none;"></iframe>`;
    }

});

function enviarEmailActivacion(email, usuario) {

    emailjs.send("service_kpaw035", "template_7i2ggt5", {
        to_email: email,
        user_name: usuario,
        login_link: "https://merencioreyna-sudo.github.io/zona-total-peliculas/"
    })
    .then(function(response) {
        console.log("Email enviado");
    }, function(error) {
        console.error("Error enviando email", error);
    });

}