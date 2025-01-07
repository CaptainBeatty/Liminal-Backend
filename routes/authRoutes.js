const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const router = express.Router();

// Transporter Nodemailer (configurez avec vos informations)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'juliengrange.dev@gmail.com', // Votre email
    pass: 'xddd itru gzrd pgqw', // Remplacez par le mot de passe de votre email
  },
});

// Secret pour le token de réinitialisation
const RESET_SECRET = 'reset_secret_key';

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

    res.status(201).json({ message: 'Utilisateur enregistré avec succès.' });
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
      'secret_key',
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
    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

    // Envoi de l'email
    await transporter.sendMail({
      from: 'juliengrange.dev@gmail.com',
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      text: `Cliquez sur ce lien pour réinitialiser votre mot de passe : ${resetLink}`,
    });

    res.json({ message: 'Email de réinitialisation envoyé avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'envoi de l'emailvvv." });
  }
});

// Reset Password Route
router.post('/reset-password/:token', async (req, res) => {
  console.log('Route /forgot-password atteinte');
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
