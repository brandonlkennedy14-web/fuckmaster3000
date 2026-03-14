window._doLaunch = function(ver) {
    // 1. Hide the splash screen
    const splash = document.getElementById('splash');
    if (splash) {
        splash.classList.add('splash-fade-out');
        setTimeout(() => { splash.style.display = 'none'; }, 500);
    }
    
    // 2. Hide all other sim roots safely
    document.querySelectorAll('.sim-root').forEach(el => {
        el.style.opacity = '0';
        el.style.zIndex = '-10';
        el.style.pointerEvents = 'none';
        // DO NOT set display:none here, or it triggers browser throttling!
    });
    
    // 3. Show the target engine
    const target = document.getElementById(ver + '-root');
    if (target) {
        target.style.display = 'block';
        target.style.opacity = '1';
        target.style.zIndex = '10';
        target.style.pointerEvents = 'auto';
    }
    
    window.activeVersion = ver;
    
    // 4. Boot the engines if they aren't running yet
    if (ver === 'v1' && window.initV1 && !window._v1Loop) window.initV1();
    if (ver === 'v2' && window.initV2 && !window._v2Loop) window.initV2();
    if (ver === 'v3' && window.initV3 && !window._v3Loop) window.initV3();
    if (ver === 'v4' && window.initV4 && !window._v4Loop) window.initV4();
};

window._doWatch = function(ver) {
    window._doLaunch(ver);
};

window._doReturn = function() {
    // Push active canvases to the background
    document.querySelectorAll('.sim-root').forEach(el => {
        el.style.opacity = '0';
        el.style.zIndex = '-10';
        el.style.pointerEvents = 'none';
    });
    
    // Bring back the splash menu
    const splash = document.getElementById('splash');
    if (splash) {
        splash.style.display = 'flex';
        setTimeout(() => { splash.classList.remove('splash-fade-out'); }, 10);
    }
    window.activeVersion = null;
};
