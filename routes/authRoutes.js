const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
require('dotenv').config(); // Charger les variables d'environnement

const router = express.Router();

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

    // Vérification si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet utilisateur existe déjà.' });
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
      { expiresIn: '24h' }
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

module.exports = router;
