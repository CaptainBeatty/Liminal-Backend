const mongoose = require('mongoose');

const PhotoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre est obligatoire.'],
  },
  imageUrl: {
    type: String,
    required: [true, 'L\'URL de l\'image est obligatoire.'],
  },
  cameraType: {
    type: String,
    default: 'Non spécifié',
  },
  date: {
    type: String,
    required: [true, 'La date de prise de vue est obligatoire.'], // Validation de la date
    validate: {
      validator: function (value) {
        // Validation simple du format "jour/mois/année"
        const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
        return dateRegex.test(value);
      },
      message: 'Le format de la date est invalide. Utilisez "JJ/MM/AAAA".',
    },
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'ID de l\'utilisateur est obligatoire.'],
  },
});

module.exports = mongoose.model('Photo', PhotoSchema);
