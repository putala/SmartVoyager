const mongoose = require('mongoose');

const waypointSchema = new mongoose.Schema({
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    name: { type: String, required: true },
    address: { type: String },
    location: {
        lat: { type: Number },
        lng: { type: Number }
    },
    description: { type: String },
    order_index: { type: Number, default: 0 },
    visited: { type: Boolean, default: false },
    // Dane z OpenStreetMap; puste, gdy miejsca nie udało się potwierdzić na mapie
    openingHours: { type: String, default: '' },
    website: { type: String, default: '' },
    osmId: { type: String, default: '' },
    verified: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.models.Waypoint || mongoose.model('Waypoint', waypointSchema);