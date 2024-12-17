const express = require('express');
const fs = require('fs');
const path = require('path');
const Photo = require('../models/Photo');

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

// POST : Ajouter une nouvelle photo
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title } = req.body;
    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    const newPhoto = new Photo({ title, imageUrl });
    await newPhoto.save();
    res.status(201).json(newPhoto);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du téléchargement' });
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

// DELETE : Supprimer une photo par ID
router.delete('/:id', async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) {
      return res.status(404).json({ error: 'Photo non trouvée' });
    }

    // Supprimer le fichier image du dossier "uploads"
    const filePath = path.join(__dirname, '..', 'uploads', path.basename(photo.imageUrl));
    fs.unlink(filePath, async (err) => {
      if (err) {
        console.error('Erreur lors de la suppression du fichier :', err);
        return res.status(500).json({ error: 'Erreur lors de la suppression du fichier' });
      }

      // Supprimer l'entrée de la base de données
      await Photo.findByIdAndDelete(req.params.id);
      res.status(200).json({ message: 'Photo supprimée avec succès' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression de la photo' });
  }
});

// PUT : Modifier une photo par ID (titre et/ou image)
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) {
      return res.status(404).json({ error: 'Photo non trouvée' });
    }

    // Mise à jour du titre
    if (req.body.title) {
      photo.title = req.body.title;
    }

    // Remplacer l'image si une nouvelle est uploadée
    if (req.file) {
      // Supprimer l'ancienne image
      const oldFilePath = path.join(__dirname, '..', 'uploads', path.basename(photo.imageUrl));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }

      // Mettre à jour l'URL de la nouvelle image
      photo.imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    }

    // Enregistrer les modifications
    await photo.save();
    res.status(200).json(photo);
  } catch (err) {
    console.error('Erreur lors de la modification :', err);
    res.status(500).json({ error: 'Erreur lors de la modification de la photo' });
  }
});


module.exports = router;
