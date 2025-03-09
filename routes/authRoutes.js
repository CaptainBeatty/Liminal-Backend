const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Photo = require('../models/Photo');
const Comment = require('../models/Comment');
const authenticate = require('../middleware/authenticate'); // votre middleware
require('dotenv').config(); // Charger les variables d'environnement
const cloudinary = require('cloudinary').v2;

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configurer Nodemailer avec les variables d'environnement
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Email depuis les variables d'environnement
    pass: process.env.EMAIL_PASS, // Mot de passe depuis les variables d'environnement
  },
});

// Utiliser les secrets depuis les variables d'environnement
const RESET_SECRET = process.env.RESET_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Register Route
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }

    // Vérification si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet utilisateur existe déjà.' });
    }

    // Vérification par username
    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      return res.status(400).json({ error: "Ce nom d'utilisateur est déjà pris." });
    }

    // Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer un nouvel utilisateur
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    // Message d'accueil
    const welcomeMessage = `
      
      Vous la reconnaissez, cette lumière étrange, 
      Vous y êtes dans ce couloir, de votre lycée, et l'odeur du lino vous emplit les narines,
      C'est déjà l'été, et le bitume chaud vous brûle, avant la fin des cours,
      Et puis l'hiver est là, et de la lumière feutrée s'échappe des fenêtres intimes par cette nuit glacée,
      ,
      Bienvenue.sur Liminal,
    `;

    // Envoi de l'email de bienvenue
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Bienvenue chez nous !',
      text: welcomeMessage,
    });

    res.status(201).json({ message: 'Utilisateur enregistré avec succès et email de bienvenue envoyé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'enregistrement." });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérification de l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Identifiants incorrects.' });
    }

    // Vérification du mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Identifiants incorrects.' });
    }

    // Génération du token JWT
    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Retourner le token et le nom d'utilisateur
    res.json({
      token,
      username: user.username,
      message: 'Connexion réussie.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la connexion." });
  }
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Vérification si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    // Génération d'un token de réinitialisation
    const resetToken = jwt.sign(
      { id: user._id, email: user.email },
      RESET_SECRET,
      { expiresIn: '1h' }
    );

    // Lien de réinitialisation
    const resetLink = `${FRONTEND_URL}/reset-password/${resetToken}`;

    // Envoi de l'email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      text: `Cliquez sur ce lien pour réinitialiser votre mot de passe : ${resetLink}`,
    });

    res.json({ message: 'Email de réinitialisation envoyé avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'envoi de l'email." });
  }
});

// Reset Password Route
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }

    // Vérification du token
    const decoded = jwt.verify(token, RESET_SECRET);

    // Recherche de l'utilisateur
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    // Mise à jour du mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Lien de réinitialisation invalide ou expiré.' });
  }
});

router.put('/update-email', authenticate, async (req, res) => {
  try {
    // Récupère l'ID utilisateur depuis le token (injection faite par le middleware)
    const userId = req.user.id;    
    // Récupère la nouvelle adresse email depuis le body
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "L'email est requis." });
    }

    // Vérifier que l'email n'est pas déjà pris (facultatif mais bonne pratique)
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(400).json({ error: "Email already used" });
    }

    // Mettre à jour l’email de l’utilisateur
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }
    user.email = email;
    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email, // nouvelle adresse
      subject: 'Email changed successfully',
      text: 'Glad to see you again. Your email has been successfully changed.',
    });

    return res.status(200).json({ message: 'Email mis à jour avec succès.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur lors de la mise à jour de l'email." });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    // Depuis le middleware, on a : req.user.id
    const user = await User.findById(req.user.id).select('-password'); // on exclut le mdp
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }
    // renvoyer tout ou partie des infos
    res.json({ 
      email: user.email,
      username: user.username
      // ...
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil.' });
  }
});

// Suppression du compte
router.delete('/delete-account', authenticate, async (req, res) => {
  try {
    // 1. Récupère l'ID utilisateur à partir du token
    const userId = req.user.id;

    // 2. Trouver toutes les photos de l'utilisateur
    const userPhotos = await Photo.find({ userId: userId });

    // 3. Supprimer chaque photo de Cloudinary
    for (const photo of userPhotos) {
      if (photo.public_id) {
        try {
          await cloudinary.uploader.destroy(photo.public_id);
        } catch (err) {
          console.error('Erreur Cloudinary pour la photo', photo._id, err);
          // On continue malgré tout, mais vous pouvez gérer l'erreur différemment si besoin
        }
      }
    }

    // 4. Supprimer toutes les photos en base
    await Photo.deleteMany({ userId: userId });

    // 5. Supprimer tous les commentaires de l’utilisateur
    await Comment.deleteMany({ userId: userId });

    // 6. Supprimer l'utilisateur lui-même
    await User.findByIdAndDelete(userId);

    return res.status(200).json({ message: 'Compte et données supprimés avec succès.' });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: 'Erreur lors de la suppression du compte.' });
  }
});
module.exports = router;
