const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary'); // Import de la configuration Cloudinary

// Configuration de CloudinaryStorage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'mern-multer-app', // Nom du dossier dans Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'], // Formats acceptés
  },
});

// Middleware multer avec stockage Cloudinary
const upload = multer({ storage });

module.exports = upload;
