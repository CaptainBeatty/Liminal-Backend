const express = require('express');
const fs = require('fs');
const path = require('path');
const authenticate = require('../middleware/authenticate'); // Middleware d'authentification
const Photo = require('../models/Photo');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

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
    const { title, cameraType, date } = req.body;

    // Validation des champs requis
    if (!title || !date || !req.file) {
      return res.status(400).json({ error: 'Les champs "title", "date" et "image" sont obligatoires.' });
    }

    // Validation et conversion de la date
    const isValidDate = dayjs(date, ['YYYY-MM-DD', 'D MMMM YYYY'], true).isValid();
    if (!isValidDate) {
      return res.status(400).json({ error: 'Le format de la date est invalide. Utilisez "AAAA-MM-JJ" ou "4 juillet 1985".' });
    }

    const formattedDate = dayjs(date, ['YYYY-MM-DD', 'D MMMM YYYY'], true).format('D MMMM YYYY');

    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    const newPhoto = new Photo({
      title,
      cameraType,
      date: formattedDate,
      imageUrl,
      userId: req.user.id, // Associer l'utilisateur connecté
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

    const formattedPhotos = photos.map((photo) => ({
      ...photo.toObject(),
      date: dayjs(photo.date, ['D MMMM YYYY', 'YYYY-MM-DD']).format('D MMMM YYYY'),
    }));

    res.status(200).json(formattedPhotos);
  } catch (err) {
    console.error('Erreur lors de la récupération des photos :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des photos' });
  }
});

// **Route GET : Récupérer une photo par son ID**
router.get('/:id', async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id).populate('userId', 'username');

    if (!photo) {
      return res.status(404).json({ error: 'Photo non trouvée.' });
    }

    const formattedPhoto = {
      ...photo.toObject(),
      userId: photo.userId._id,
      authorName: photo.userId.username,
      date: dayjs(photo.date, ['D MMMM YYYY', 'YYYY-MM-DD']).format('D MMMM YYYY'),
    };

    res.status(200).json(formattedPhoto);
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

    if (photo.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Accès interdit : Vous n\'êtes pas le propriétaire de cette image' });
    }

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
    const { title, cameraType, date } = req.body;
    const photo = await Photo.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({ error: 'Photo non trouvée.' });
    }

    if (photo.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    if (title) photo.title = title;
    if (cameraType) photo.cameraType = cameraType;

    if (date) {
      const isValidDate = dayjs(date, ['YYYY-MM-DD', 'D MMMM YYYY'], true).isValid();
      if (!isValidDate) {
        return res.status(400).json({ error: 'Le format de la date est invalide. Utilisez "AAAA-MM-JJ" ou "4 juillet 1985".' });
      }
      photo.date = dayjs(date, ['YYYY-MM-DD', 'D MMMM YYYY'], true).format('D MMMM YYYY');
    }

    if (req.file) {
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
