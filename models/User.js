const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetPasswordToken: { type: String }, // Jeton pour la réinitialisation du mot de passe
  resetPasswordExpires: { type: Date }, // Expiration du jeton
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
