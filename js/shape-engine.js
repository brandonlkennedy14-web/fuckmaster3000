window.ShapeEngine = {
    create3DBall: function(x, y, z, vx, vy, vz) {
        return { x, y, z, vx, vy, vz, radius: 5 };
    },
    
    projectPoint: function(x, y, z, type, pitch, yaw) {
        // 1. Rotate around Y axis (Yaw)
        let cosY = Math.cos(yaw), sinY = Math.sin(yaw);
        let x1 = x * cosY - z * sinY;
        let z1 = z * cosY + x * sinY;

        // 2. Rotate around X axis (Pitch)
        let cosP = Math.cos(pitch), sinP = Math.sin(pitch);
        let y1 = y * cosP - z1 * sinP;
        let z2 = z1 * cosP + y * sinP;

        // 3. Perspective Warp
        let fov = 400;
        let distance = 600; // Camera distance
        let zCam = z2 + distance;
        
        if (zCam < 1) zCam = 1; // Prevent division by zero if an object flies behind the camera
        
        let scale = fov / zCam;
        
        return {
            x: x1 * scale,
            y: y1 * scale,
            scale: scale,
            depth: z2 // Return raw Z depth so the renderer knows what to draw first
        };
    }
};