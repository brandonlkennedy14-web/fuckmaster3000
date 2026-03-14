// ══════════════════════════════════════════════════════
// GLOBAL DIAGNOSTICS & GROWTH TRACKER
// Silently observes internal memory arrays to map baseline logic.
// ══════════════════════════════════════════════════════

window.Diagnostics = (function() {
    let isActive = false;
    let panel = null;
    let canvas = null;
    let ctx = null;

    // Data History Buffers (Stores the last 100 frames)
    const historyLimit = 100;
    let heatData = [];
    let volumeData = [];
    let densityData = [];

    function initUI() {
        if (panel) return;
        
        panel = document.createElement('div');
        panel.className = 'glass-panel';
        panel.style.cssText = 'position:absolute; top:80px; right:20px; width:300px; padding:12px; border-radius:12px; border-top:2px solid #facc15; z-index:9999; display:none; pointer-events:none;';
        
        let header = document.createElement('div');
        header.innerHTML = '<div style="font-size:10px; font-weight:bold; color:#facc15; font-family:monospace; letter-spacing:0.1em; margin-bottom:8px;">GROWTH RATE DIAGNOSTICS</div>';
        panel.appendChild(header);

        canvas = document.createElement('canvas');
        canvas.width = 276;
        canvas.height = 120;
        canvas.style.backgroundColor = 'rgba(2,6,23,0.5)';
        canvas.style.borderRadius = '6px';
        canvas.style.border = '1px solid rgba(148,163,184,0.2)';
        panel.appendChild(canvas);
        ctx = canvas.getContext('2d');

        let legend = document.createElement('div');
        legend.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:9px; font-family:monospace;">
                <span style="color:#ef4444;">■ KINETIC HEAT</span>
                <span style="color:#38bdf8;">■ SPATIAL VOL</span>
                <span style="color:#22c55e;">■ DENSITY</span>
            </div>
        `;
        panel.appendChild(legend);

        document.body.appendChild(panel);
    }

    function calculateMetrics() {
        // Read directly from the exposed headless memory
        let balls = window.v1LiveBalls || window.v2LiveBalls || [];
        if (balls.length === 0) return { heat: 0, volume: 0, density: 0 };

        let totalSpeed = 0;
        let maxDistSq = 0;

        for (let i = 0; i < balls.length; i++) {
            let b = balls[i];
            totalSpeed += Math.sqrt(b.vx*b.vx + b.vy*b.vy + (b.vz*b.vz || 0));
            let distSq = b.x*b.x + b.y*b.y + (b.z*b.z || 0);
            if (distSq > maxDistSq) maxDistSq = distSq;
        }

        let heat = totalSpeed / balls.length;
        let volume = Math.sqrt(maxDistSq); 
        let density = volume > 0 ? (balls.length / volume) * 10 : 0;

        return { heat, volume, density };
    }

    function drawGraph() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Grid
        ctx.strokeStyle = 'rgba(148,163,184,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=1; i<4; i++) { ctx.moveTo(0, i*30); ctx.lineTo(canvas.width, i*30); }
        ctx.stroke();

        const drawLine = (dataArray, color, maxScale) => {
            if (dataArray.length < 2) return;
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            let step = canvas.width / historyLimit;
            for (let i = 0; i < dataArray.length; i++) {
                let x = i * step;
                let y = canvas.height - ((dataArray[i] / maxScale) * canvas.height);
                if (y < 0) y = 0; // Cap at ceiling
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        };

        // Render the 3 datasets (Scaled relative to expected maximums)
        drawLine(heatData, '#ef4444', 10);     // Max speed around 10
        drawLine(volumeData, '#38bdf8', 300);  // Max bounds around 300
        drawLine(densityData, '#22c55e', 2.0); // Density ratio
    }

    function loop() {
        if (isActive) {
            let metrics = calculateMetrics();
            
            heatData.push(metrics.heat);
            volumeData.push(metrics.volume);
            densityData.push(metrics.density);

            if (heatData.length > historyLimit) heatData.shift();
            if (volumeData.length > historyLimit) volumeData.shift();
            if (densityData.length > historyLimit) densityData.shift();

            drawGraph();
        }
        requestAnimationFrame(loop);
    }

    return {
        toggle: function() {
            initUI();
            isActive = !isActive;
            panel.style.display = isActive ? 'block' : 'none';
            if (isActive && heatData.length === 0) loop(); // Start loop if first time
        }
    };
})();