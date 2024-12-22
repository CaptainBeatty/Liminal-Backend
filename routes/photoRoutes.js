const express = require('express');
const fs = require('fs');
const path = require('path');
const authenticate = require('../middleware/authenticate'); // Importer le middleware
const Photo = require('../models/Photo');
const jwt = require('jsonwebtoken');

const router = express.Router();


// Route pour uploader une image (existe déjà)
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// Route pour ajouter une image
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { title, cameraType } = req.body;
    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    const newPhoto = new Photo({ title, imageUrl, userId: req.user.id, cameraType,}); // Associer l'utilisateur
    await newPhoto.save();
    res.status(201).json(newPhoto);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la photo' });
  }
});

// GET : Récupérer toutes les photos
router.get('/', async (req, res) => {
  try {
    const photos = await Photo.find();
    res.status(200).json(photos);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des photos' });
  }
});

// Route pour supprimer une photo
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) return res.status(404).json({ error: 'Photo non trouvée' });

    // Vérification si l'utilisateur est le propriétaire
    if (photo.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Accès interdit : Vous n\'êtes pas le propriétaire de cette image' });
    }

    // Supprimer l'image du dossier et de la base de données
    const filePath = path.join(__dirname, '..', 'uploads', path.basename(photo.imageUrl));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await Photo.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Photo supprimée avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression de la photo' });
  }
});


// Route pour modifier une photo
// Route PUT pour mettre à jour une photo
router.put('/:id', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { title, cameraType } = req.body; // Récupérer les champs mis à jour
    const photo = await Photo.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({ error: 'Photo non trouvée.' });
    }

    // Vérifier si l'utilisateur est le propriétaire de la photo
    if (photo.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    // Mettre à jour les champs
    if (title) photo.title = title;
    if (cameraType) photo.cameraType = cameraType; // Mettre à jour le type d'appareil photo

    // Mettre à jour l'image si un nouveau fichier est envoyé
    if (req.file) {
      photo.imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    }

    await photo.save();
    res.status(200).json(photo);
  } catch (err) {
    console.error('Erreur lors de la mise à jour de la photo :', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la photo.' });
  }
});


module.exports = router;
