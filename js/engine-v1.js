window.v1LiveBalls = window.v1LiveBalls || [];
for (let i = window.v1LiveBalls.length; i < 35; i++) {
    window.v1LiveBalls.push({ x: (Math.random()-0.5)*200, y: (Math.random()-0.5)*200, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, winding: 0, path: [] });
}

window.tickV1 = function() {
    try {
        const W = window.innerWidth || 1000; const H = window.innerHeight || 1000;
        
        // 1. Off-screen Memory Allocation
        if (!window._v1FinalCvs) {
            window._v1BgCvs = document.createElement('canvas'); window._v1BgCvs.width = W; window._v1BgCvs.height = H;
            const bCtx = window._v1BgCvs.getContext('2d');
            const colors = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#4f46e5','#a855f7'];
            for(let i=0; i<7; i++) { bCtx.fillStyle=colors[i]; bCtx.fillRect(0, Math.floor((H/7)*i), W, Math.ceil(H/7)); }
            window._v1TrailCvs = document.createElement('canvas'); window._v1TrailCvs.width = W; window._v1TrailCvs.height = H;
            window._v1FinalCvs = document.createElement('canvas'); window._v1FinalCvs.width = W; window._v1FinalCvs.height = H;
        }
        
        const bCtx = window._v1BgCvs.getContext('2d'); 
        const tCtx = window._v1TrailCvs.getContext('2d'); 
        const fCtx = window._v1FinalCvs.getContext('2d');
        const bounds = 250; const blockW = window.IS_MOBILE ? 12 : 20; const stripH = H/7;
        window._v1Ticks = (window._v1Ticks || 0) + 1;

        // 2. Core Physics & Winding Math
        window.v1LiveBalls.forEach(b => {
            b.x += b.vx; b.y += b.vy;
            if (b.x < -bounds || b.x > bounds) b.vx *= -1;
            if (b.y < -bounds || b.y > bounds) b.vy *= -1;
            
            let angle = Math.atan2(b.y, b.x);
            if (b.lastAngle !== undefined && !isNaN(angle)) { 
                let da = angle - b.lastAngle; 
                if (da > Math.PI) da -= 2*Math.PI; 
                if (da < -Math.PI) da += 2*Math.PI; 
                b.winding += da / (2*Math.PI); 
            }
            b.lastAngle = angle;
            
            let wl = { nm: 550, hex: '#3b82f6' };
            if (window.windingToWavelength) { let res = window.windingToWavelength(b.winding); if(res && !isNaN(res.nm)) wl = res; }
            b.hex = wl.hex; b.wavelength = wl.nm;
            
            if (window._v1Ticks % 2 === 0) { b.path.push({x: b.x, y: b.y}); if (b.path.length > 20) b.path.shift(); }
        });

        // 3. The Chronological Block Wave (Shift Right)
        if (window._v1Ticks % 3 === 0) {
            bCtx.drawImage(window._v1BgCvs, blockW, 0);
            let sorted = [...window.v1LiveBalls].sort((a,b)=>Math.abs(b.winding)-Math.abs(a.winding));
            for(let i=0;i<7;i++){ 
                bCtx.fillStyle = sorted[i%sorted.length].hex; 
                bCtx.fillRect(0, Math.floor(stripH*i), blockW, Math.ceil(stripH)); 
            }
        }

        // 4. Background Grid Assembly
        fCtx.globalCompositeOperation = 'source-over'; 
        fCtx.drawImage(window._v1BgCvs, 0, 0);
        fCtx.strokeStyle = 'rgba(0,0,0,0.4)'; fCtx.lineWidth = 1; fCtx.beginPath();
        for(let x=0; x<W; x+=blockW) { fCtx.moveTo(x, 0); fCtx.lineTo(x, H); }
        for(let y=0; y<H; y+=stripH) { fCtx.moveTo(0, y); fCtx.lineTo(W, y); }
        fCtx.stroke();

        // 5. Live Glowing Trails
        tCtx.fillStyle = 'rgba(0,0,0,0.03)'; tCtx.fillRect(0,0,W,H);
        tCtx.globalCompositeOperation = 'lighter'; tCtx.lineWidth = 3;
        window.v1LiveBalls.forEach(b => {
            if(b.path.length>1){ 
                tCtx.beginPath(); 
                tCtx.moveTo(b.path[b.path.length-2].x+W/2, b.path[b.path.length-2].y+H/2); 
                tCtx.lineTo(b.x+W/2, b.y+H/2); 
                tCtx.strokeStyle=b.hex; tCtx.stroke(); 
            }
        });
        
        fCtx.globalCompositeOperation = 'screen'; fCtx.drawImage(window._v1TrailCvs, 0, 0);
        fCtx.globalCompositeOperation = 'source-over';
        window.v1LiveBalls.forEach(b => { fCtx.beginPath(); fCtx.arc(b.x+W/2, b.y+H/2, 4, 0, Math.PI*2); fCtx.fillStyle='#ffffff'; fCtx.fill(); });

        // 6. Push to DOM if active (V4 reads from the fCtx memory buffer regardless)
        const root = document.getElementById('v1-root');
        if (root && window.getComputedStyle(root).display !== 'none') { 
            const domCvs = document.getElementById('v1-canvas');
            if (domCvs) { domCvs.width = W; domCvs.height = H; domCvs.getContext('2d', {alpha:false}).drawImage(window._v1FinalCvs, 0, 0); }
        }
    } catch(e) {}
};

window.initV1 = function() {
    function loop() { 
        const root = document.getElementById('v1-root');
        if (root && window.getComputedStyle(root).display !== 'none') window.tickV1(); 
        window._v1Loop = requestAnimationFrame(loop); 
    }
    if(window._v1Loop) cancelAnimationFrame(window._v1Loop);
    loop();
};