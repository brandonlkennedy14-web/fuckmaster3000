function initV4() {
    let W = window.innerWidth, H = window.innerHeight;
    const canvas = document.getElementById('v4-canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    
    let CX = W/2, CY = H/2; let baseScale = Math.min(W, H) / 400; 
    let ticks = 0, chaosRatio = 0, geoScale = 1.0;
    let discoveryBounds = { minX:-150, maxX:150, minY:-150, maxY:150, minZ:-150, maxZ:150 };
    
    const SE = window.ShapeEngine || { projectPoint: (x,y,z)=>({x,y,scale:1,depth:z}) };
    const CE = window.ColourEngine || { spectrum: [{nm:700},{nm:460}], wavelengthToCones: ()=>({L:1,M:1,S:1}), interfereCones: ()=>({L:1,M:1,S:1}), conesToHex: ()=>'#ffffff' };

    let balls3D = [];
    for (let i = 0; i < 40; i++) { 
        balls3D.push({ x: (Math.random()-0.5)*200, y: (Math.random()-0.5)*200, z: (Math.random()-0.5)*200, vx: Math.random(), vy: Math.random(), vz: Math.random(), winding: 0, path: [] });
    }
    let Uni1 = { balls: balls3D, offset: 0 };
    let Uni2 = { balls: JSON.parse(JSON.stringify(balls3D)), offset: -350 };
    let Uni3 = { balls: JSON.parse(JSON.stringify(balls3D)), offset: 350 };

    let mediaElement = document.createElement('video');
    mediaElement.crossOrigin = "anonymous"; mediaElement.loop = true; mediaElement.muted = true; mediaElement.playsInline = true;
    let audioCtx = null, analyser = null, dataArray = null; let currentMediaMode = 'off'; let audioForce = 0;

    function initAudio() {
        if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); analyser = audioCtx.createAnalyser(); analyser.fftSize = 128; dataArray = new Uint8Array(analyser.frequencyBinCount); } catch(e) {} }
    }

    const mediaSelect = document.getElementById('v4-media-select');
    if (mediaSelect) {
        mediaSelect.addEventListener('change', (e) => {
            currentMediaMode = e.target.value;
            if (currentMediaMode === 'video') {
                initAudio(); mediaElement.srcObject = null;
                mediaElement.src = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"; mediaElement.play();
                try { if (audioCtx.state === 'suspended') audioCtx.resume(); let src = audioCtx.createMediaElementSource(mediaElement); src.connect(analyser); analyser.connect(audioCtx.destination); mediaElement.muted = false; } catch(err) {}
            } else if (currentMediaMode === 'webcam') {
                initAudio();
                navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
                    mediaElement.src = ""; mediaElement.srcObject = stream; mediaElement.play();
                    try { if (audioCtx.state === 'suspended') audioCtx.resume(); let src = audioCtx.createMediaStreamSource(stream); src.connect(analyser); } catch(err) {}
                }).catch(err => { mediaSelect.value = 'off'; });
            } else { mediaElement.pause(); mediaElement.src = ""; mediaElement.srcObject = null; }
        });
    }

    function syncTimeline(universe, target, simMode) {
        try {
            let sourceBalls = null;
            if (target === 'v1' || target === 'both') sourceBalls = window.v1LiveBalls;
            else if (target === 'v2') sourceBalls = window.v2LiveBalls;

            if (sourceBalls && sourceBalls.length > 0) {
                const syncEl = document.getElementById('v4-sync-status'); if(syncEl) { syncEl.textContent = "SYNC: LIVE (60fps)"; syncEl.style.color = "#34d399"; }
                while(universe.balls.length < sourceBalls.length) universe.balls.push({x:0,y:0,z:0,vx:0,vy:0,vz:0,winding:0,path:[]});
                while(universe.balls.length > sourceBalls.length) universe.balls.pop();

                let currentBnd = (simMode === 'discovery') ? discoveryBounds.maxX : 150 * geoScale;
                let scaleF = currentBnd / 250; 
                let uChaosSynced = 0;

                for(let i=0; i<sourceBalls.length; i++) {
                    let sb = sourceBalls[i]; let db = universe.balls[i];
                    if (target === 'v2') {
                        db.y = sb.x * scaleF; db.z = sb.y * scaleF; db.x = (db.x * 0.9) + (sb.winding * 25 * 0.1); 
                    } else {
                        db.x = sb.x * scaleF; db.y = sb.y * scaleF; db.z = (db.z * 0.9) + (sb.winding * 25 * 0.1); 
                    }
                    db.vx = sb.vx * scaleF; db.vy = sb.vy * scaleF; db.winding = sb.winding;
                    let wl = { nm: 550 }; if(window.windingToWavelength) { let t = window.windingToWavelength(db.winding); if(t && !isNaN(t.nm)) wl = t; }
                    db.wavelength = wl.nm; try { db.baseCones = CE.wavelengthToCones(db.wavelength); db.baseColor = CE.conesToHex(db.baseCones); } catch(e){}
                    if (ticks % 3 === 0) { db.path.push({x: db.x, y: db.y, z: db.z}); if (db.path.length > 20) db.path.shift(); }
                    uChaosSynced += Math.sqrt(db.vx*db.vx + db.vy*db.vy);
                }
                return uChaosSynced / universe.balls.length;
            }
        } catch(e) {}
        return false;
    }

    function tickPhysics(universe, simMode) {
        try {
            audioForce = 0;
            if (analyser && currentMediaMode !== 'off') {
                analyser.getByteFrequencyData(dataArray); let sum = 0; for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
                audioForce = (sum / dataArray.length) / 255; 
                let audEl = document.getElementById('v4-audio-level'); if (audEl) audEl.textContent = Math.round(audioForce * 100) + '%';
            }

            let uChaos = 0; let bnd = (simMode === 'discovery') ? discoveryBounds.maxX : 150 * geoScale;
            let shape = document.getElementById('v4-shape-select') ? document.getElementById('v4-shape-select').value : 'cube';

            universe.balls.forEach(b => {
                if (isNaN(b.x)) { b.x=0; b.y=0; b.z=0; b.vx=Math.random(); b.vy=Math.random(); b.vz=Math.random(); b.winding=0; }
                if (audioForce > 0.4) { b.vx += (Math.random()-0.5)*audioForce*3; b.vy += (Math.random()-0.5)*audioForce*3; b.vz += (Math.random()-0.5)*audioForce*3; }
                
                b.x += b.vx; b.y += b.vy; b.z += b.vz;
                let dist = Math.sqrt(b.x*b.x + b.y*b.y + b.z*b.z);

                if (shape === 'sphere' || shape === 'hyperbolic') {
                    if (dist > bnd) { let nx = b.x/dist, ny = b.y/dist, nz = b.z/dist; let dot = b.vx*nx + b.vy*ny + b.vz*nz; b.vx -= 2*dot*nx; b.vy -= 2*dot*ny; b.vz -= 2*dot*nz; b.x = nx*bnd; b.y = ny*bnd; b.z = nz*bnd; }
                } else {
                    if (b.x < -bnd) { b.x = -bnd; b.vx *= -1; } else if (b.x > bnd) { b.x = bnd; b.vx *= -1; }
                    if (b.y < -bnd) { b.y = -bnd; b.vy *= -1; } else if (b.y > bnd) { b.y = bnd; b.vy *= -1; }
                    if (b.z < -bnd) { b.z = -bnd; b.vz *= -1; } else if (b.z > bnd) { b.z = bnd; b.vz *= -1; }
                }

                let speed = Math.sqrt(b.vx*b.vx + b.vy*b.vy + b.vz*b.vz);
                if (speed > 8) { b.vx = (b.vx/speed)*8; b.vy = (b.vy/speed)*8; b.vz = (b.vz/speed)*8; } else if (speed < 0.5) { b.vx += 0.1; b.vy += 0.1; b.vz += 0.1; }

                let angle = Math.atan2(b.y, b.x); if (b.lastAngle !== undefined && !isNaN(angle)) { let da = angle - b.lastAngle; if (da > Math.PI) da -= 2*Math.PI; if (da < -Math.PI) da += 2*Math.PI; b.winding += da / (2*Math.PI); }
                b.lastAngle = angle;
                
                let wl = { nm: 550 }; if (window.windingToWavelength) { let t = window.windingToWavelength(b.winding); if(t && !isNaN(t.nm)) wl = t; }
                b.wavelength = wl.nm; try { b.baseCones = CE.wavelengthToCones(b.wavelength); b.baseColor = CE.conesToHex(b.baseCones); } catch(e){}
                if (ticks % 3 === 0) { b.path.push({x: b.x, y: b.y, z: b.z}); if (b.path.length > 20) b.path.shift(); }
                uChaos += speed;
            });
            return uChaos / universe.balls.length;
        } catch(e) { return 0; }
    }

    function renderUniverse(universe, pitch, yaw, scaleMod, v5Mode, meshFill, showNodes, showMesh, viewPlane, shape, simMode) {
        try {
            const xOffset = universe.offset || 0; 
            let bnd = (simMode === 'discovery') ? discoveryBounds.maxX : 150 * geoScale;
            let fpvBall = (viewPlane === 'fpv') ? universe.balls[0] : null;

            const getProj = (px, py, pz) => {
                let cx = px, cy = py, cz = pz;
                if (shape === 'hyperbolic') {
                    let dist = Math.sqrt(cx*cx + cy*cy + cz*cz); let maxR = bnd * 1.5;
                    if (dist < maxR) { let warp = 1 / (1 - Math.pow(dist/maxR, 2)); cx *= warp; cy *= warp; cz *= warp; }
                }
                if (fpvBall) {
                    let dx = cx - fpvBall.x; let dy = cy - fpvBall.y; let dz = cz - fpvBall.z;
                    let vx = fpvBall.vx, vy = fpvBall.vy, vz = fpvBall.vz;
                    let camYaw = Math.atan2(vx, vz); let distXZ = Math.sqrt(vx*vx + vz*vz) || 0.001; let camPitch = -Math.atan2(vy, distXZ);
                    let cosY = Math.cos(-camYaw), sinY = Math.sin(-camYaw); let x1 = dx * cosY + dz * sinY; let z1 = -dx * sinY + dz * cosY;
                    let cosP = Math.cos(-camPitch), sinP = Math.sin(-camPitch); let y1 = dy * cosP - z1 * sinP; let z2 = dy * sinP + z1 * cosP;
                    let zCam = z2 + 80; if (zCam < 1) zCam = 1; 
                    let scale = 400 / zCam; return { x: x1 * scale, y: y1 * scale, scale: scale, depth: z2 };
                } else {
                    let r = SE.projectPoint(cx + xOffset, cy, cz, '3d', pitch, yaw);
                    if (!isFinite(r.scale) || r.scale > 100) r.scale = 1; return { x: r.x||0, y: r.y||0, scale: r.scale, depth: r.depth };
                }
            };

            const drawPlaneWarp = (pts, cvs, opacity) => {
                let p0 = getProj(pts[0].x, pts[0].y, pts[0].z); let p1 = getProj(pts[1].x, pts[1].y, pts[1].z);
                let p2 = getProj(pts[2].x, pts[2].y, pts[2].z); let p3 = getProj(pts[3].x, pts[3].y, pts[3].z);

                let sx0 = CX + (p0.x||0)*scaleMod, sy0 = CY + (p0.y||0)*scaleMod; let sx1 = CX + (p1.x||0)*scaleMod, sy1 = CY + (p1.y||0)*scaleMod;
                let sx2 = CX + (p2.x||0)*scaleMod, sy2 = CY + (p2.y||0)*scaleMod; let sx3 = CX + (p3.x||0)*scaleMod, sy3 = CY + (p3.y||0)*scaleMod;

                if (!isFinite(sx0) || !isFinite(sx1) || !isFinite(sx2) || !isFinite(sx3)) return;

                ctx.globalAlpha = opacity; ctx.globalCompositeOperation = 'screen'; 
                try {
                    if (cvs && (cvs.width > 0 || cvs.videoWidth > 0)) {
                        ctx.save(); ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx1, sy1); ctx.lineTo(sx3, sy3); ctx.closePath(); ctx.clip();
                        let u1x = (sx1 - sx0) / W, u1y = (sy1 - sy0) / W, v1x = (sx3 - sx0) / H, v1y = (sy3 - sy0) / H;
                        ctx.transform(u1x, u1y, v1x, v1y, sx0, sy0); ctx.drawImage(cvs, 0, 0, W, H); ctx.restore();

                        ctx.save(); ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.lineTo(sx3, sy3); ctx.closePath(); ctx.clip();
                        let px = sx1 + sx3 - sx2; let py = sy1 + sy3 - sy2;
                        let u2x = (sx2 - sx3) / W, u2y = (sy2 - sy3) / W, v2x = (sx2 - sx1) / H, v2y = (sy2 - sy1) / H;
                        ctx.transform(u2x, u2y, v2x, v2y, px, py); ctx.drawImage(cvs, 0, 0, W, H); ctx.restore();
                    }
                } catch(e) {}
                ctx.globalCompositeOperation = 'source-over';
            };

            let projected = universe.balls.map(b => { let p = getProj(b.x, b.y, b.z); return { obj: b, x: p.x, y: p.y, scale: p.scale, depth: p.depth }; });
            projected.sort((a, b) => b.depth - a.depth);

            if (v5Mode !== 'off') {
                let cvs1 = window._v1FinalCvs; let cvs2 = window._v2FinalCvs;
                let targetCvsXY = (v5Mode === 'v1' || v5Mode === 'both') ? cvs1 : null;
                let targetCvsYZ = (v5Mode === 'v2' || v5Mode === 'both') ? cvs2 : null;
                let targetCvsXZ = (v5Mode === 'both') ? cvs1 : null; 
                
                if (v5Mode === 'media' && currentMediaMode !== 'off' && mediaElement.readyState >= 2) { targetCvsXY = mediaElement; targetCvsYZ = mediaElement; targetCvsXZ = mediaElement; }

                let opacity = viewPlane === 'fpv' ? 0.45 : 0.20; let slices = 5; 
                for (let i = 0; i < slices; i++) {
                    let lerp = i / (slices - 1);
                    if (targetCvsXY) { let curZ = -bnd + lerp * (bnd * 2); drawPlaneWarp([{x:-bnd, y:-bnd, z:curZ}, {x:bnd, y:-bnd, z:curZ}, {x:bnd, y:bnd, z:curZ}, {x:-bnd, y:bnd, z:curZ}], targetCvsXY, opacity); }
                    if (targetCvsYZ) { let curX = -bnd + lerp * (bnd * 2); drawPlaneWarp([{x:curX, y:-bnd, z:-bnd}, {x:curX, y:bnd, z:-bnd}, {x:curX, y:bnd, z:bnd}, {x:curX, y:-bnd, z:bnd}], targetCvsYZ, opacity); }
                    if (targetCvsXZ) { let curY = -bnd + lerp * (bnd * 2); drawPlaneWarp([{x:-bnd, y:curY, z:-bnd}, {x:bnd, y:curY, z:-bnd}, {x:bnd, y:curY, z:bnd}, {x:-bnd, y:curY, z:bnd}], targetCvsXZ, opacity * 0.4); }
                }
            }

            ctx.globalAlpha = 1.0; ctx.strokeStyle = 'rgba(51,65,85,0.3)'; ctx.lineWidth = 1;
            if (shape === 'sphere' || shape === 'hyperbolic') {
                for(let i=0; i<=6; i++) {
                    let lat = Math.PI * (-0.5 + (i/6)); let z = Math.sin(lat)*bnd; let r = Math.cos(lat)*bnd;
                    ctx.beginPath();
                    for(let j=0; j<=16; j++) {
                        let lng = 2 * Math.PI * (j/16); let x = Math.cos(lng)*r; let y = Math.sin(lng)*r;
                        let p = getProj(x, y, z);
                        if(j===0) ctx.moveTo(CX + (p.x||0)*scaleMod, CY + (p.y||0)*scaleMod); else ctx.lineTo(CX + (p.x||0)*scaleMod, CY + (p.y||0)*scaleMod);
                    }
                    ctx.stroke();
                }
            } else {
                let v = [ {x:-bnd,y:-bnd,z:-bnd}, {x:bnd,y:-bnd,z:-bnd}, {x:bnd,y:bnd,z:-bnd}, {x:-bnd,y:bnd,z:-bnd}, {x:-bnd,y:-bnd,z:bnd}, {x:bnd,y:-bnd,z:bnd}, {x:bnd,y:bnd,z:bnd}, {x:-bnd,y:bnd,z:bnd} ];
                let edges = [[v[0],v[1]], [v[1],v[2]], [v[2],v[3]], [v[3],v[0]], [v[4],v[5]], [v[5],v[6]], [v[6],v[7]], [v[7],v[4]], [v[0],v[4]], [v[1],v[5]], [v[2],v[6]], [v[3],v[7]]];
                edges.forEach(e => { let p1 = getProj(e[0].x, e[0].y, e[0].z); let p2 = getProj(e[1].x, e[1].y, e[1].z); ctx.beginPath(); ctx.moveTo(CX + (p1.x||0)*scaleMod, CY + (p1.y||0)*scaleMod); ctx.lineTo(CX + (p2.x||0)*scaleMod, CY + (p2.y||0)*scaleMod); ctx.stroke(); });
            }

            if (showMesh) {
                ctx.globalCompositeOperation = meshFill !== 'color' ? 'source-over' : 'lighter'; 
                let targetCvs = null;
                if (meshFill === 'v1') targetCvs = window._v1FinalCvs; 
                if (meshFill === 'v2') targetCvs = window._v2FinalCvs; 
                if (meshFill === 'media' && currentMediaMode !== 'off' && mediaElement.readyState >= 2) targetCvs = mediaElement;

                for (let i = 0; i < projected.length; i++) {
                    for (let j = i + 1; j < projected.length; j++) {
                        const p1 = projected[i], p2 = projected[j];
                        const d12 = Math.pow(p1.obj.x-p2.obj.x,2) + Math.pow(p1.obj.y-p2.obj.y,2) + Math.pow(p1.obj.z-p2.obj.z,2);
                        if (d12 < 18000) { 
                            for (let k = j + 1; k < projected.length; k++) {
                                const p3 = projected[k];
                                const d23 = Math.pow(p2.obj.x-p3.obj.x,2) + Math.pow(p2.obj.y-p3.obj.y,2) + Math.pow(p2.obj.z-p3.obj.z,2);
                                const d13 = Math.pow(p1.obj.x-p3.obj.x,2) + Math.pow(p1.obj.y-p3.obj.y,2) + Math.pow(p1.obj.z-p3.obj.z,2);
                                
                                if (d23 < 18000 && d13 < 18000) {
                                    ctx.beginPath(); ctx.moveTo(CX + p1.x * scaleMod, CY + p1.y * scaleMod); ctx.lineTo(CX + p2.x * scaleMod, CY + p2.y * scaleMod); ctx.lineTo(CX + p3.x * scaleMod, CY + p3.y * scaleMod); ctx.closePath();
                                    
                                    if (targetCvs && (targetCvs.width > 0 || targetCvs.videoWidth > 0)) {
                                        ctx.save(); ctx.clip(); ctx.globalAlpha = 0.85; ctx.drawImage(targetCvs, 0, 0, W, H); ctx.restore();
                                        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke();
                                    } else {
                                        let mix = { L: Math.min(1, (p1.obj.baseCones.L + p2.obj.baseCones.L + p3.obj.baseCones.L)*0.4), M: Math.min(1, (p1.obj.baseCones.M + p2.obj.baseCones.M + p3.obj.baseCones.M)*0.3), S: Math.min(1, (p1.obj.baseCones.S + p2.obj.baseCones.S + p3.obj.baseCones.S)*0.4) };
                                        let hex = '#ffffff'; try { hex = CE.conesToHex(mix); } catch(e){}
                                        if (!hex.includes('NaN')) { ctx.fillStyle = hex + '55'; ctx.fill(); ctx.strokeStyle = hex + '88'; ctx.lineWidth = 0.5; ctx.stroke(); }
                                    }
                                }
                            }
                        }
                    }
                }
                ctx.globalCompositeOperation = 'source-over';
            }

            if (showNodes) {
                ctx.globalCompositeOperation = 'screen';
                projected.forEach(p => {
                    if (p.obj.path && p.obj.path.length > 1) {
                        ctx.beginPath(); ctx.moveTo(CX + (p.x||0) * scaleMod, CY + (p.y||0) * scaleMod);
                        for (let n=1; n<p.obj.path.length; n++) { let ptn = getProj(p.obj.path[n].x, p.obj.path[n].y, p.obj.path[n].z); ctx.lineTo(CX + (ptn.x||0) * scaleMod, CY + (ptn.y||0) * scaleMod); }
                        ctx.strokeStyle = p.obj.baseColor + '88'; ctx.lineWidth = 3; ctx.stroke();
                    }
                });
                ctx.globalCompositeOperation = 'source-over';
                projected.forEach(p => {
                    const r = 5 * scaleMod * p.scale;
                    ctx.beginPath(); ctx.arc(CX + p.x * scaleMod, CY + p.y * scaleMod, isFinite(r)&&r>0 ? r : 1, 0, Math.PI*2); ctx.fillStyle = p.obj.baseColor; ctx.fill();
                });
            }
        } catch(e) {}
    }

    function autoInvert() {
        if (simMode === 'platonic') {
            geoScale += 0.003;
            if (geoScale > 3.0) { inversions++; geoScale = 0.5; [Uni1,Uni2,Uni3].forEach(u=>u.balls.forEach(b => { b.vx *= -0.8; b.vy *= -0.8; b.vz *= -0.8; b.x *= 0.5; b.y *= 0.5; b.z *= 0.5; })); }
        } else {
            discoveryBounds.minX -= 0.5; discoveryBounds.maxX += 0.5; discoveryBounds.minY -= 0.5; discoveryBounds.maxY += 0.5; discoveryBounds.minZ -= 0.5; discoveryBounds.maxZ += 0.5;
            if (discoveryBounds.maxX > 600) { inversions++; discoveryBounds = { minX:-150, maxX:150, minY:-150, maxY:150, minZ:-150, maxZ:150 }; [Uni1,Uni2,Uni3].forEach(u=>u.balls.forEach(b => { b.vx *= -0.8; b.vy *= -0.8; b.vz *= -0.8; b.x *= 0.2; b.y *= 0.2; b.z *= 0.2; })); }
        }
        const invEl = document.getElementById('v4-stat-inv'); if (invEl) invEl.textContent = inversions;
    }

    function updateColorMatrixUI(topBalls) {
        let panel = document.getElementById('v4-color-matrix');
        if (!panel) {
            panel = document.createElement('div'); panel.id = 'v4-color-matrix'; panel.className = 'glass-panel';
            panel.style.cssText = 'position:absolute; bottom:20px; left:20px; padding:10px; border-radius:8px; width:160px; z-index:50; pointer-events:none; border: 1px solid rgba(236,72,153,0.4); background:rgba(2,6,23,0.95); box-shadow: 0 10px 30px rgba(0,0,0,0.8);';
            document.getElementById('v4-root').appendChild(panel);
        }
        let top1 = topBalls[0], top2 = topBalls[1]; if(!top1 || !top2) return;
        let mixedCones = {L:1, M:1, S:1}; let hex = '#ffffff'; 
        try { mixedCones = CE.interfereCones(top1.baseCones, top2.baseCones, 'harmonic'); hex = CE.conesToHex(mixedCones); } catch(e){}
        panel.innerHTML = `<div style="font-size:9px; color:#ec4899; font-weight:bold; margin-bottom:6px; font-family:monospace; letter-spacing:0.05em;">LIVE CODE LOGIC</div>
                 <div style="display:flex; align-items:center; gap:8px;">
                    <div style="flex:1;"><div style="font-size:7px; color:#64748b; font-family:monospace; margin-bottom:2px;">DOMINANT WAVELENGTHS</div>
                    <div style="color:${top1.baseColor}; font-size:10px; font-family:monospace; font-weight:bold;">${top1.wavelength}nm</div>
                    <div style="color:${top2.baseColor}; font-size:10px; font-family:monospace; font-weight:bold;">${top2.wavelength}nm</div></div>
                    <div style="width:32px; height:32px; border-radius:6px; background:${hex}; box-shadow: 0 0 15px ${hex}AA; border:1px solid rgba(255,255,255,0.2);"></div>
                 </div>`;
    }

    function loop() {
        try {
            ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, W, H);

            const vView = document.getElementById('v4-view-select'); let viewPlane = vView ? vView.value : '3d';
            const vHolo = document.getElementById('v5-render-select'); let v5Mode = vHolo ? vHolo.value : 'off';
            const vMesh = document.getElementById('v4-mesh-fill'); let meshFill = vMesh ? vMesh.value : 'color';
            const vShape = document.getElementById('v4-shape-select'); let shape = vShape ? vShape.value : 'cube';
            const chkNodes = document.getElementById('v4-show-nodes'); let showNodes = chkNodes ? chkNodes.checked : true;
            const chkMesh = document.getElementById('v4-show-mesh'); let showMesh = chkMesh ? chkMesh.checked : true;

            // BACKGROUND ENGINE TICKING
            let needV1 = (v5Mode === 'v1' || v5Mode === 'both' || meshFill === 'v1');
            let needV2 = (v5Mode === 'v2' || v5Mode === 'both' || meshFill === 'v2');
            
            if (needV1 && typeof window.tickV1 === 'function') window.tickV1();
            if (needV2 && typeof window.tickV2 === 'function') window.tickV2();

            let syncTarget = 'off';
            if (v5Mode !== 'off' && v5Mode !== 'media') syncTarget = v5Mode; 
            else if (meshFill !== 'color' && meshFill !== 'media') syncTarget = meshFill;

            let isSynced = false; let syncedChaos = 0;
            if (syncTarget !== 'off') { syncedChaos = syncTimeline(Uni1, syncTarget, simMode); if (syncedChaos !== false) isSynced = true; }
            
            if (!isSynced) { 
                chaosRatio = (chaosRatio * 0.99) + (tickPhysics(Uni1, simMode) * 0.01);
                const sEl = document.getElementById('v4-sync-status'); 
                if(sEl) { 
                    if (currentMediaMode !== 'off') { sEl.textContent = "SYNC: AUDIO/VIDEO"; sEl.style.color = "#facc15"; }
                    else { sEl.textContent = "SYNC: OFFLINE"; sEl.style.color = "#f59e0b"; }
                } 
            } else {
                chaosRatio = (chaosRatio * 0.99) + (syncedChaos * 0.01);
            }

            let pitch = ticks * 0.002; let yaw = ticks * 0.0035;
            
            if (viewPlane === 'multiverse') {
                if (!isSynced) { tickPhysics(Uni2, simMode); tickPhysics(Uni3, simMode); } else { Uni2.balls = JSON.parse(JSON.stringify(Uni1.balls)); Uni3.balls = JSON.parse(JSON.stringify(Uni1.balls)); }
                let sm = baseScale * 0.40; 
                renderUniverse(Uni1, pitch, yaw, sm, v5Mode, meshFill, showNodes, showMesh, viewPlane, shape, simMode);
                renderUniverse(Uni2, pitch, yaw, sm, v5Mode, meshFill, showNodes, showMesh, viewPlane, shape, simMode);
                renderUniverse(Uni3, pitch, yaw, sm, v5Mode, meshFill, showNodes, showMesh, viewPlane, shape, simMode);
            } else {
                renderUniverse(Uni1, pitch, yaw, baseScale, v5Mode, meshFill, showNodes, showMesh, viewPlane, shape, simMode);
            }

            autoInvert();
            const cEl = document.getElementById('v4-stat-chaos'); if (cEl) cEl.textContent = chaosRatio.toFixed(2);
            const tEl = document.getElementById('v4-stat-ticks'); if (tEl) tEl.textContent = ticks;
            
            let sorted = [...Uni1.balls].sort((a, b) => Math.abs(b.winding) - Math.abs(a.winding));
            if (ticks % 15 === 0) updateColorMatrixUI(sorted);
            ticks++;
        } catch(e) {}
        window._v4Loop = requestAnimationFrame(loop);
    }
    
    window.addEventListener('resize', () => { if (window.activeVersion === 'v4') { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H; CX = W/2; CY = H/2; baseScale = Math.min(W, H) / 400; } });

    loop();
}
window.initV4 = initV4;