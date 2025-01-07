const nodemailer = require('nodemailer');

// Configuration du transporteur
const transporter = nodemailer.createTransport({
  service: 'gmail', // Vous pouvez remplacer par un autre service comme 'yahoo', 'outlook', etc.
  auth: {
    user: process.env.SMTP_USER, // Adresse e-mail utilisée pour l'envoi
    pass: process.env.SMTP_PASSWORD, // Mot de passe ou clé d'application
  },
});

// Fonction d'envoi d'e-mail
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Votre App" <${process.env.SMTP_USER}>`, // Adresse e-mail de l'expéditeur
      to, // Destinataire
      subject, // Sujet de l'e-mail
      text, // Version texte
      html, // Version HTML
    });
    console.log('E-mail envoyé : %s', info.messageId);
  } catch (err) {
    console.error('Erreur lors de l\'envoi de l\'e-mail :', err);
    throw err; // Relancer l'erreur pour la gestion côté appelant
  }
};

module.exports = { sendEmail };
