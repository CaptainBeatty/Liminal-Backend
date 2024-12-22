const mongoose = require('mongoose');

const PhotoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  imageUrl: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ID du créateur
  cameraType: { type: String, required: false }, // Nouveau champ pour le type d'appareil photo
}, { timestamps: true });

module.exports = mongoose.model('Photo', PhotoSchema);
