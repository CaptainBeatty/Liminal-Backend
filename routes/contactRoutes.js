const express = require("express");
const nodemailer = require("nodemailer");
require("dotenv").config();

const router = express.Router();

// Configuration du transporteur Nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, // Adresse email de l'expéditeur (variable d'environnement)
        pass: process.env.EMAIL_PASS, // Mot de passe de l'expéditeur (variable d'environnement)
    },
});

// Vérification de la configuration
transporter.verify((error, success) => {
    if (error) {
        console.error("Erreur de configuration Nodemailer:", error);
    } else {
        console.log("Serveur prêt à envoyer des emails.");
    }
});

// Route pour le formulaire de contact
router.post("/contact", async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    const mailOptions = {
        from: email,
        to: process.env.EMAIL_USER, // L'email du webmaster
        subject: `Nouvelle demande de contact de ${name}`,
        text: `Vous avez reçu un nouveau message de ${name} (${email}):\n\n${message}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Message envoyé avec succès." });
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'email:", error);
        res.status(500).json({ error: "Erreur lors de l'envoi de l'email." });
    }
});

module.exports = router;
