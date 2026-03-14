window.ColourEngine = {
    spectrum: [
        { nm: 700, hex: '#ef4444' }, // Red
        { nm: 620, hex: '#f97316' }, // Orange
        { nm: 580, hex: '#eab308' }, // Yellow
        { nm: 530, hex: '#22c55e' }, // Green
        { nm: 470, hex: '#3b82f6' }, // Blue
        { nm: 430, hex: '#4f46e5' }, // Indigo
        { nm: 400, hex: '#a855f7' }  // Violet
    ],
    
    wavelengthToCones: function(nm) {
        // Simulates the biological response of the human eye's L, M, and S cones
        let L = Math.max(0, Math.exp(-Math.pow(nm - 580, 2) / 5000));
        let M = Math.max(0, Math.exp(-Math.pow(nm - 540, 2) / 4000));
        let S = Math.max(0, Math.exp(-Math.pow(nm - 440, 2) / 3000));
        return { L, M, S };
    },
    
    interfereCones: function(c1, c2, mode) {
        // Synthesizes raw colors into tertiary "Mind Colours"
        return {
            L: Math.min(1, c1.L + c2.L),
            M: Math.min(1, c1.M + c2.M),
            S: Math.min(1, c1.S + c2.S)
        };
    },
    
    conesToHex: function(cones) {
        let r = Math.min(255, Math.floor(cones.L * 255));
        let g = Math.min(255, Math.floor(cones.M * 255));
        let b = Math.min(255, Math.floor(cones.S * 255));
        return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
    }
};