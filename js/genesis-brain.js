// js/genesis-brain.js
// THE MULTIPLAYER SYNAPSE

const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE'; 
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

window.GenesisBrain = {
    client: null,
    channel: null,
    callbacks: {},
    padNodes: [], // Stores the live drawing pad data

    connect: function() {
        if (!window.supabase) {
            console.error("Supabase library not loaded.");
            return Promise.resolve();
        }
        
        try {
            this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            // Connect to a high-speed Realtime broadcast channel
            this.channel = this.client.channel('simcolt-global', {
                config: { broadcast: { self: true } } // self:true means we see our own draws immediately
            });

            this.channel.on('broadcast', { event: 'sim_draw' }, (payload) => {
                if (payload.payload && payload.payload.node) {
                    this.padNodes.push(payload.payload.node);
                    // Keep memory lean: max 500 drawing nodes at once
                    if (this.padNodes.length > 500) this.padNodes.shift();
                }
            }).subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log("Genesis Brain: ONLINE. Global Synapse Connected.");
                }
            });

        } catch(e) {
            console.error("Genesis Brain Connection Failed:", e);
        }
        return Promise.resolve();
    },

    writeDraw: function(nodeData) {
        if (!this.channel) return;
        this.channel.send({
            type: 'broadcast',
            event: 'sim_draw',
            payload: { node: nodeData }
        });
    }
};

// Auto-connect on load
window.GenesisBrain.connect();