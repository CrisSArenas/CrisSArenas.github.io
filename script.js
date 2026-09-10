// ===================================
// SMOOTH SCROLLING FOR NAVIGATION
// ===================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ===================================
// SCROLL TO TOP BUTTON
// ===================================

const scrollTopBtn = document.getElementById('scrollTop');

// Show/hide scroll to top button based on scroll position
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollTopBtn.classList.add('show');
    } else {
        scrollTopBtn.classList.remove('show');
    }
});

// Scroll to top when button is clicked
scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// ===================================
// NAVBAR BACKGROUND ON SCROLL
// ===================================

const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 50) {
        navbar.style.background = 'rgba(10, 14, 39, 0.98)';
        navbar.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.3)';
    } else {
        navbar.style.background = 'rgba(10, 14, 39, 0.95)';
        navbar.style.boxShadow = 'none';
    }
});

// ===================================
// INTERSECTION OBSERVER FOR FADE-IN ANIMATIONS
// ===================================

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-up');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all project cards and skill categories
document.querySelectorAll('.project-card, .skill-category, .stat-card').forEach(el => {
    observer.observe(el);
});

// ===================================
// TYPING EFFECT ENHANCEMENT
// ===================================

// The CSS handles the basic typing animation,
// but we can add cursor blinking effect
const typingElement = document.querySelector('.typing-effect');
if (typingElement) {
    // Get actual text length
    const textLength = typingElement.textContent.length;
    
    // Get the full width of the text content
    typingElement.style.width = 'auto';
    const fullWidth = typingElement.scrollWidth;
    typingElement.style.width = '0';
    
    
    // Create custom animation with exact width
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes typing-precise {
            from { width: 0; }
            to { width: ${fullWidth}px; }
        }
    `;
    document.head.appendChild(styleSheet);
    
    // Apply the animation
    typingElement.style.animation = `typing-precise 4s steps(${textLength}) 1s 1 normal both`;
    
    // Add blinking cursor after typing completes
    setTimeout(() => {
        typingElement.style.animation = `typing-precise 4s steps(${textLength}) 1s 1 normal both, blink 0.75s step-end infinite`;
    }, 5000);
}

// Blink animation
const blinkStyle = document.createElement('style');
blinkStyle.textContent = `
    @keyframes blink {
        from, to { border-color: transparent; }
        50% { border-color: var(--primary-cyan); }
    }
`;
document.head.appendChild(blinkStyle);

// ===================================
// MOBILE MENU TOGGLE
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('show-mobile');
            const icon = this.querySelector('i');
            if (icon.classList.contains('fa-bars')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
});

// ===================================
// CONSOLE EASTER EGG
// ===================================

console.log('%c👨‍💻 Hello, fellow developer!', 'color: #00f7ff; font-size: 20px; font-weight: bold;');
console.log('%cCurious how this was put together? Take a look behind the scenes:', 'color: #00ff41; font-size: 14px;');
console.log('%c🔍 Source: %chttps://tinyurl.com/InsightsDev', 
    'color: #aaa; font-size: 12px;',
    'color: #00aaff; font-size: 12px; text-decoration: underline;');

// ===================================
// PERFORMANCE OPTIMIZATION
// ===================================

// Lazy load images when they come into viewport
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                observer.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ===================================
// CUSTOM CURSOR EFFECT (Optional)
// ===================================

const createCustomCursor = () => {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);
    
    const cursorDot = document.createElement('div');
    cursorDot.className = 'custom-cursor-dot';
    document.body.appendChild(cursorDot);
    
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        cursorDot.style.left = mouseX + 'px';
        cursorDot.style.top = mouseY + 'px';
    });
    
    const animateCursor = () => {
        const dx = mouseX - cursorX;
        const dy = mouseY - cursorY;
        
        cursorX += dx * 0.1;
        cursorY += dy * 0.1;
        
        cursor.style.left = cursorX + 'px';
        cursor.style.top = cursorY + 'px';
        
        requestAnimationFrame(animateCursor);
    };
    
    animateCursor();
    
    // Add hover effects for interactive elements
    document.querySelectorAll('a, button').forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('cursor-hover');
            cursorDot.classList.add('cursor-hover');
        });
        
        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('cursor-hover');
            cursorDot.classList.remove('cursor-hover');
        });
    });
};

// Add custom cursor styles
const cursorStyle = document.createElement('style');
cursorStyle.textContent = `
    .custom-cursor {
        width: 30px;
        height: 30px;
        border: 2px solid var(--primary-cyan);
        border-radius: 50%;
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
        transition: width 0.3s, height 0.3s, border-color 0.3s;
    }
    
    .custom-cursor-dot {
        width: 6px;
        height: 6px;
        background: var(--primary-cyan);
        border-radius: 50%;
        position: fixed;
        pointer-events: none;
        z-index: 10000;
        transform: translate(-50%, -50%);
    }
    
    .custom-cursor.cursor-hover {
        width: 50px;
        height: 50px;
        border-color: var(--primary-green);
    }
    
    .custom-cursor-dot.cursor-hover {
        background: var(--primary-green);
    }
    
    @media (max-width: 768px) {
        .custom-cursor,
        .custom-cursor-dot {
            display: none;
        }
    }
`;
document.head.appendChild(cursorStyle);

// Initialize custom cursor (comment out if you don't want it)
// Uncomment the line below to enable custom cursor
// createCustomCursor();

// ===================================
// PAGE LOAD ANIMATION
// ===================================

window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// Add loaded class styles
const loadedStyle = document.createElement('style');
loadedStyle.textContent = `
    body {
        opacity: 0;
        animation: fadeIn 0.5s ease-in forwards;
    }
    
    body.loaded {
        opacity: 1;
    }
    
    @keyframes fadeIn {
        to {
            opacity: 1;
        }
    }
`;
document.head.appendChild(loadedStyle);

// ===================================
// RESEARCH: Sharpe-by-method figure (index.html)
// Data: Table 2 of Sanchez Arenas (2026), mean ± std over 3 seeds
// ===================================
(function () {
    const svg = document.getElementById('researchSharpeChart');
    if (!svg) return;
    const METHODS = [
        { id: 'RAT-CARD', group: 'star' }, { id: 'RAT-CREM', group: 'neural' }, { id: 'LSTM', group: 'neural' }, { id: 'MLP', group: 'neural' },
        { id: 'Equal Weight', group: 'trad' }, { id: 'Min Variance', group: 'trad' }, { id: 'Risk Parity', group: 'trad' }, { id: 'HRP', group: 'trad' }, { id: 'GMM-MVO', group: 'trad' }
    ];
    const SHARPE = {
        A: { 'RAT-CARD': [0.822, 0.397], 'RAT-CREM': [0.992, 0.430], 'LSTM': [1.125, 0.449], 'MLP': [0.874, 0.463], 'Equal Weight': [0.294, 0.400], 'Min Variance': [0.818, 0.275], 'Risk Parity': [0.641, 0.335], 'HRP': [0.538, 0.225], 'GMM-MVO': [0.444, 0.426] },
        B: { 'RAT-CARD': [0.692, 0.316], 'RAT-CREM': [0.779, 0.326], 'LSTM': [0.746, 0.325], 'MLP': [0.747, 0.263], 'Equal Weight': [0.162, 0.201], 'Min Variance': [0.500, 0.277], 'Risk Parity': [0.414, 0.235], 'HRP': [0.260, 0.219], 'GMM-MVO': [0.489, 0.403] },
        C: { 'RAT-CARD': [0.450, 0.542], 'RAT-CREM': [0.667, 0.453], 'LSTM': [0.808, 0.349], 'MLP': [0.293, 0.486], 'Equal Weight': [-0.306, 0.350], 'Min Variance': [0.345, 0.385], 'Risk Parity': [0.029, 0.392], 'HRP': [-0.111, 0.353], 'GMM-MVO': [0.579, 0.366] }
    };
    const DGP_NAME = { A: 'DGP-A (base)', B: 'DGP-B (high persistence)', C: 'DGP-C (low signal-to-noise)' };
    const COLOR = { star: '#0891b2', neural: '#d97706', trad: '#7c3aed' };
    document.querySelectorAll('#researchLegend i[data-c]').forEach(i => { i.style.background = COLOR[i.dataset.c]; });
    const NS = 'http://www.w3.org/2000/svg';
    const tip = document.getElementById('vizTip');
    const el = (t, a, txt) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; return e; };
    const W = 560, H = 360, L = 118, R = 28, T = 18, B = 34;
    const XMIN = -0.6, XMAX = 1.6;
    const x = v => L + (v - XMIN) / (XMAX - XMIN) * (W - L - R);
    const rowH = (H - T - B) / METHODS.length;

    function showTip(evt, html) { if (!tip) return; tip.innerHTML = html; tip.classList.add('show'); moveTip(evt); }
    function moveTip(evt) { if (!tip) return; const pad = 14; let lx = evt.clientX + pad, ly = evt.clientY + pad; if (lx + 260 > window.innerWidth) lx = evt.clientX - 260; if (ly + 80 > window.innerHeight) ly = evt.clientY - 70; tip.style.left = lx + 'px'; tip.style.top = ly + 'px'; }
    function hideTip() { if (tip) tip.classList.remove('show'); }

    function draw(dgp) {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        const data = SHARPE[dgp];
        [-0.5, 0, 0.5, 1.0, 1.5].forEach(v => {
            svg.appendChild(el('line', { x1: x(v), x2: x(v), y1: T, y2: H - B, stroke: v === 0 ? '#475569' : '#1e293b', 'stroke-width': v === 0 ? 1.2 : 1 }));
            svg.appendChild(el('text', { x: x(v), y: H - B + 16, 'text-anchor': 'middle', fill: '#94a3b8', 'font-size': 10, 'font-family': 'JetBrains Mono, monospace' }, v.toFixed(1)));
        });
        svg.appendChild(el('text', { x: (L + W - R) / 2, y: H - 4, 'text-anchor': 'middle', fill: '#94a3b8', 'font-size': 10, 'font-family': 'Inter, sans-serif' }, 'Sharpe ratio (annualised, test set)'));
        METHODS.forEach((m, i) => {
            const [mean, sd] = data[m.id];
            const cy = T + rowH * i + rowH / 2;
            const bh = Math.min(18, rowH * 0.62);
            const x0 = x(Math.min(0, mean)), x1 = x(Math.max(0, mean));
            const g = el('g', { class: 'bar', tabindex: 0, role: 'listitem', 'aria-label': m.id + ' Sharpe ' + mean.toFixed(2) + ' plus or minus ' + sd.toFixed(2) });
            g.appendChild(el('rect', { x: L - 4, y: cy - rowH / 2, width: W - L - R + 8, height: rowH, fill: 'transparent' }));
            g.appendChild(el('rect', { x: x0, y: cy - bh / 2, width: Math.max(1, x1 - x0), height: bh, rx: 3, fill: COLOR[m.group], stroke: m.group === 'star' ? '#e4e4e7' : 'none', 'stroke-width': 1 }));
            const e0 = x(mean - sd), e1 = x(mean + sd);
            g.appendChild(el('line', { x1: e0, x2: e1, y1: cy, y2: cy, stroke: '#e4e4e7', 'stroke-width': 1, opacity: 0.55 }));
            g.appendChild(el('line', { x1: e0, x2: e0, y1: cy - 4, y2: cy + 4, stroke: '#e4e4e7', 'stroke-width': 1, opacity: 0.55 }));
            g.appendChild(el('line', { x1: e1, x2: e1, y1: cy - 4, y2: cy + 4, stroke: '#e4e4e7', 'stroke-width': 1, opacity: 0.55 }));
            g.appendChild(el('text', { x: L - 10, y: cy + 4, 'text-anchor': 'end', fill: '#e4e4e7', 'font-size': 11, 'font-weight': m.group === 'star' ? 700 : 500, 'font-family': 'Inter, sans-serif' }, m.id));
            if (m.group === 'star') {
                g.appendChild(el('text', { x: x1 + 6, y: cy + 4, fill: '#e4e4e7', 'font-size': 10.5, 'font-family': 'JetBrains Mono, monospace' }, mean.toFixed(2)));
            }
            const html = '<b>' + m.id + '</b><br>' + DGP_NAME[dgp] + '<br>Sharpe ' + mean.toFixed(3) + ' &plusmn; ' + sd.toFixed(3);
            g.addEventListener('mouseenter', e => showTip(e, html));
            g.addEventListener('mousemove', moveTip);
            g.addEventListener('mouseleave', hideTip);
            g.addEventListener('focus', () => { const r = g.getBoundingClientRect(); showTip({ clientX: r.right, clientY: r.top }, html); });
            g.addEventListener('blur', hideTip);
            svg.appendChild(g);
        });
        const sepY = T + rowH * 4;
        svg.appendChild(el('line', { x1: L - 4, x2: W - R, y1: sepY, y2: sepY, stroke: '#334155', 'stroke-dasharray': '3 4' }));
    }
    draw('A');
    document.querySelectorAll('.seg [data-dgp]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.seg [data-dgp]').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-selected', b === btn ? 'true' : 'false'); });
            draw(btn.dataset.dgp);
        });
    });
    const tog = document.getElementById('abstractToggle'), abs = document.getElementById('paperAbstract');
    if (tog && abs) tog.addEventListener('click', () => {
        const open = abs.classList.toggle('expanded');
        tog.setAttribute('aria-expanded', open ? 'true' : 'false');
        tog.innerHTML = (open ? 'Collapse abstract ' : 'Read full abstract ') + '<i class="fas fa-chevron-down"></i>';
    });
})();

// ===================================
// NAV: highlight the section in view (index.html only)
// ===================================
(function () {
    const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map();
    links.forEach(a => { const sec = document.querySelector(a.getAttribute('href')); if (sec) map.set(sec, a); });
    const obs = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) { links.forEach(a => a.classList.remove('active')); const a = map.get(en.target); if (a) a.classList.add('active'); } });
    }, { rootMargin: '-40% 0px -55% 0px' });
    map.forEach((a, sec) => obs.observe(sec));
})();
