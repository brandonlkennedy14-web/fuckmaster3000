window.v2LiveBalls = window.v2LiveBalls || [];
for (let i = window.v2LiveBalls.length; i < 40; i++) {
    window.v2LiveBalls.push({ x: (Math.random()-0.5)*200, y: (Math.random()-0.5)*200, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, winding: 0, path: [] });
}

window.tickV2 = function() {
    try {
        const CE = window.ColourEngine;
        const W = window.innerWidth || 1000; const H = window.innerHeight || 1000;
        
        if (!window._v2FinalCvs) {
            window._v2MCvs = document.createElement('canvas'); window._v2MCvs.width = W; window._v2MCvs.height = H;
            const mCtx = window._v2MCvs.getContext('2d'); mCtx.fillStyle = '#020617'; mCtx.fillRect(0,0,W,H);
            window._v2TrailCvs = document.createElement('canvas'); window._v2TrailCvs.width = W; window._v2TrailCvs.height = H;
            window._v2FinalCvs = document.createElement('canvas'); window._v2FinalCvs.width = W; window._v2FinalCvs.height = H;
        }
        
        const mCtx = window._v2MCvs.getContext('2d'); const tCtx = window._v2TrailCvs.getContext('2d'); const fCtx = window._v2FinalCvs.getContext('2d');
        const bounds = 250; const blockSize = window.IS_MOBILE ? 14 : 20;
        window._v2Ticks = (window._v2Ticks || 0) + 1;

        window.v2LiveBalls.forEach(b => {
            b.x += b.vx; b.y += b.vy;
            if (b.x < -bounds || b.x > bounds) b.vx *= -1;
            if (b.y < -bounds || b.y > bounds) b.vy *= -1;
            let angle = Math.atan2(b.y, b.x);
            if (b.lastAngle !== undefined && !isNaN(angle)) { let da = angle - b.lastAngle; if (da > Math.PI) da -= 2*Math.PI; if (da < -Math.PI) da += 2*Math.PI; b.winding += da / (2*Math.PI); }
            b.lastAngle = angle;
            b.wavelength = 550; if (window.windingToWavelength) { let w = window.windingToWavelength(b.winding); if(w && !isNaN(w.nm)) b.wavelength = w.nm; }
            if (CE && CE.wavelengthToCones) { try { b.cones = CE.wavelengthToCones(b.wavelength); } catch(e){} }
            if (window._v2Ticks % 2 === 0) { b.path.push({x: b.x, y: b.y}); if (b.path.length > 20) b.path.shift(); }
        });

        if (window._v2Ticks % 4 === 0 && CE && CE.interfereCones) {
            mCtx.drawImage(window._v2MCvs, 0, blockSize);
            let sorted = [...window.v2LiveBalls].sort((a,b)=>Math.abs(b.winding)-Math.abs(a.winding));
            for(let x=0; x<W; x+=blockSize) {
                let hex = '#a855f7'; 
                try { hex = CE.conesToHex(CE.interfereCones(sorted[Math.floor(Math.random()*5)].cones, sorted[Math.floor(Math.random()*5)].cones, 'harmonic')); }catch(e){}
                mCtx.fillStyle = hex; mCtx.fillRect(x, 0, blockSize, blockSize); mCtx.strokeStyle = 'rgba(0,0,0,0.5)'; mCtx.strokeRect(x, 0, blockSize, blockSize);
            }
        }

        fCtx.globalCompositeOperation = 'source-over'; fCtx.drawImage(window._v2MCvs, 0, 0);
        tCtx.fillStyle = 'rgba(0,0,0,0.05)'; tCtx.fillRect(0,0,W,H);
        tCtx.globalCompositeOperation = 'lighter'; tCtx.lineWidth = 2.5;
        window.v2LiveBalls.forEach(b => {
            let h = '#ffffff'; if (CE) { try{ h = CE.conesToHex(b.cones); }catch(e){} }
            if(b.path.length>1){ tCtx.beginPath(); tCtx.moveTo(b.path[b.path.length-2].x+W/2, b.path[b.path.length-2].y+H/2); tCtx.lineTo(b.x+W/2, b.y+H/2); tCtx.strokeStyle=h; tCtx.stroke(); }
        });
        
        fCtx.globalCompositeOperation = 'screen'; fCtx.drawImage(window._v2TrailCvs, 0, 0);
        fCtx.globalCompositeOperation = 'source-over';
        // BALLS REMOVED FROM MEMORY CANVAS HERE

        const root = document.getElementById('v2-root');
        if (root && window.getComputedStyle(root).display !== 'none') { 
            const domCvs = document.getElementById('v2-canvas');
            if (domCvs) { domCvs.width = W; domCvs.height = H; domCvs.getContext('2d', {alpha:false}).drawImage(window._v2FinalCvs, 0, 0); }
        }
    } catch(e) {}
};

window.initV2 = function() {
    function loop() { const root = document.getElementById('v2-root'); if (root && window.getComputedStyle(root).display !== 'none') window.tickV2(); window._v2Loop = requestAnimationFrame(loop); }
    if(window._v2Loop) cancelAnimationFrame(window._v2Loop);
    loop();
};