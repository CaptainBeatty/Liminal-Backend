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
    required: [true, 'La date de prise de vue est obligatoire.'],
    validate: {
      validator: function (value) {
        // Validation pour les formats écrits de type "4 juillet 1985"
        const writtenDateRegex = /^\d{1,2}\s[a-zA-Zéû]{3,}\s\d{4}$/;
        return writtenDateRegex.test(value);
      },
      message: 'Le format de la date est invalide. Utilisez "4 juillet 1985".',
    },
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'ID de l\'utilisateur est obligatoire.'],
  },
});


module.exports = mongoose.model('Photo', PhotoSchema);
