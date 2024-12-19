const jwt = require('jsonwebtoken');

// Middleware pour authentifier les requêtes via JWT
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization; // Récupérer l'en-tête Authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Accès non autorisé : Aucun token fourni' });
  }

  const token = authHeader.split(' ')[1]; // Extraire le token après "Bearer"
  if (!token) {
    return res.status(401).json({ error: 'Token manquant dans l\'en-tête' });
  }

  try {
    // Vérifier et décoder le token
    const decoded = jwt.verify(token, 'secret_key'); // Remplacez 'secret_key' par votre clé secrète
    req.user = decoded; // Stocker les informations de l'utilisateur dans req.user
    next(); // Continuer avec la requête
  } catch (err) {
    console.error('Erreur de validation du token:', err);
    return res.status(403).json({ error: 'Token invalide ou expiré' });
  }
};

module.exports = authenticate;
