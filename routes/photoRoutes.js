const express = require('express');
const fs = require('fs');
const path = require('path');
const authenticate = require('../middleware/authenticate'); // Importer le middleware
const Photo = require('../models/Photo');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Configuration de multer pour gérer les fichiers uploadés
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

// **Route POST : Ajouter une image**
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { title, cameraType } = req.body;
    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    const newPhoto = new Photo({
      title,
      imageUrl,
      userId: req.user.id, // Associer la photo à l'utilisateur connecté
      cameraType,
    });
    await newPhoto.save();
    res.status(201).json(newPhoto);
  } catch (err) {
    console.error('Erreur lors de l\'ajout de la photo :', err);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la photo' });
  }
});

// **Route GET : Récupérer toutes les photos**
router.get('/', async (req, res) => {
  try {
    const photos = await Photo.find();
    res.status(200).json(photos);
  } catch (err) {
    console.error('Erreur lors de la récupération des photos :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des photos' });
  }
});

// **Route GET : Récupérer une photo par son ID**
router.get('/:id', async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({ error: 'Photo non trouvée.' });
    }

    res.status(200).json(photo);
  } catch (err) {
    console.error('Erreur lors de la récupération de la photo :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération de la photo.' });
  }
});

// **Route DELETE : Supprimer une photo**
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) {
      return res.status(404).json({ error: 'Photo non trouvée' });
    }

    // Vérifier si l'utilisateur est le propriétaire de la photo
    if (photo.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Accès interdit : Vous n\'êtes pas le propriétaire de cette image' });
    }

    // Supprimer l'image du dossier et de la base de données
    const filePath = path.join(__dirname, '..', 'uploads', path.basename(photo.imageUrl));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Photo.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Photo supprimée avec succès' });
  } catch (err) {
    console.error('Erreur lors de la suppression de la photo :', err);
    res.status(500).json({ error: 'Erreur lors de la suppression de la photo' });
  }
});

// **Route PUT : Mettre à jour une photo**
router.put('/:id', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { title, cameraType } = req.body;
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
    if (cameraType) photo.cameraType = cameraType;

    // Mettre à jour l'image si un nouveau fichier est envoyé
    if (req.file) {
      // Supprimer l'ancienne image si elle existe
      const oldFilePath = path.join(__dirname, '..', 'uploads', path.basename(photo.imageUrl));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
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
