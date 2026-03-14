window.windingToWavelength = function(winding) {
    if (!window.ColourEngine || !window.ColourEngine.spectrum) {
        return { nm: 550, hex: '#22c55e' }; // Fallback Green
    }
    
    const spec = window.ColourEngine.spectrum;
    let absW = Math.abs(winding);
    
    // Convert mathematical winding into an index on the spectrum
    let idx = Math.floor(absW) % spec.length;
    return spec[idx];
};

// Console confirmation that the foundation loaded correctly
console.log("simcolt3 Core Architecture Loaded.");