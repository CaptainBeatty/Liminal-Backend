const express = require('express');
const authenticate = require('../middleware/authenticate'); // Middleware d'authentification
const Comment = require('../models/Comment');
const router = express.Router();

// **Route POST : Ajouter un commentaire**
router.post('/', authenticate, async (req, res) => {
  try {
    const { photoId, content, parentId } = req.body;

    if (!photoId || !content) {
      return res.status(400).json({ error: 'Les champs "photoId" et "content" sont obligatoires.' });
    }

    const newComment = new Comment({
      photoId,
      userId: req.user.id,
      content,
      parentId: parentId || null, // Null si pas de parent (commentaire principal)
    });

    await newComment.save();

    res.status(201).json(newComment);
  } catch (err) {
    console.error('Erreur lors de l\'ajout du commentaire :', err);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire.' });
  }
});

// **Route GET : Récupérer les commentaires pour une photo**
router.get('/:photoId', async (req, res) => {
  console.log('Requête reçue pour photo ID :', req.params.id);
  try {
    const comments = await Comment.find({ photoId: req.params.photoId })
      .populate('userId', 'username') // Récupère les informations de l'utilisateur
      .sort({ createdAt: -1 }); // Tri du plus récent au plus ancien

    res.status(200).json(comments);
  } catch (err) {
    console.error('Erreur lors de la récupération des commentaires :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des commentaires.' });
  }
});

// **Route PUT : Modifier un commentaire**
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Le champ "content" est obligatoire.' });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: 'Commentaire non trouvé.' });
    }

    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Accès interdit : vous n\'êtes pas l\'auteur de ce commentaire.' });
    }

    comment.content = content;
    comment.updatedAt = Date.now();

    await comment.save();

    res.status(200).json(comment);
  } catch (err) {
    console.error('Erreur lors de la modification du commentaire :', err);
    res.status(500).json({ error: 'Erreur lors de la modification du commentaire.' });
  }
});

// **Route DELETE : Supprimer un commentaire**
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: 'Commentaire non trouvé.' });
    }

    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Accès interdit : vous n\'êtes pas l\'auteur de ce commentaire.' });
    }

    await Comment.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Commentaire supprimé avec succès.' });
  } catch (err) {
    console.error('Erreur lors de la suppression du commentaire :', err);
    res.status(500).json({ error: 'Erreur lors de la suppression du commentaire.' });
  }
});

module.exports = router;
