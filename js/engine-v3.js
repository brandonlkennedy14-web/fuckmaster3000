window.initV3 = function() {
    const W = window.innerWidth, H = window.innerHeight;
    const canvas = document.getElementById('v3-canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    
    let ticks = 0;
    
    function drawRadarScanner() {
        ctx.fillStyle = 'rgba(2, 6, 23, 0.2)'; // Fading trail effect
        ctx.fillRect(0, 0, W, H);
        
        let cx = W / 2;
        let cy = H / 2;
        let maxR = Math.min(W, H) / 2.5;

        // Draw Radar Rings
        ctx.strokeStyle = 'rgba(20, 184, 166, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, (maxR / 5) * i, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw Rotating Scanner Line
        let angle = (ticks * 0.02) % (Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
        ctx.strokeStyle = '#14b8a6';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Scan Gradient Cone
        let grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle)*maxR, cy + Math.sin(angle)*maxR);
        grad.addColorStop(0, 'rgba(20,184,166,0)');
        grad.addColorStop(1, 'rgba(20,184,166,0.15)');
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxR, angle - 0.4, angle, false);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Plot Historical Memory Nodes from window._gbMemory
        const mem = window._gbMemory || [];
        if (mem.length === 0) {
            ctx.fillStyle = '#64748b';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("WAITING FOR HISTORICAL DATA SYNC...", cx, cy + maxR + 30);
        } else {
            mem.forEach((entry, idx) => {
                let pAngle = ((entry.ts || 0) % 10000) / 10000 * Math.PI * 2;
                let pDist = maxR * (0.2 + (idx / Math.max(1, mem.length)) * 0.8);
                
                let px = cx + Math.cos(pAngle) * pDist;
                let py = cy + Math.sin(pAngle) * pDist;
                
                ctx.beginPath();
                ctx.arc(px, py, 6, 0, Math.PI * 2);
                ctx.fillStyle = '#facc15';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.stroke();
                
                ctx.fillStyle = '#94a3b8';
                ctx.font = '9px monospace';
                ctx.fillText(`LOG_${idx}`, px + 10, py);
            });
        }
    }

    function loop() {
        if (document.getElementById('v3-root') && document.getElementById('v3-root').style.display !== 'none') {
            drawRadarScanner();
            ticks++;
        }
        window._v3Loop = requestAnimationFrame(loop);
    }
    
    if (window._v3Loop) cancelAnimationFrame(window._v3Loop);
    loop();
};