const express = require('express');
const authenticate = require('../middleware/authenticate'); // Middleware d'authentification
const Comment = require('../models/Comment');
const router = express.Router();

// **Route POST : Ajouter un commentaire ou une réponse**
router.post('/', authenticate, async (req, res) => {
  try {
    const { photoId, content, parentId } = req.body;

    if (!photoId || !content) {
      return res.status(400).json({ error: 'Les champs "photoId" et "content" sont obligatoires.' });
    }

    // Création du commentaire ou de la réponse
    const newComment = new Comment({
      photoId,
      userId: req.user.id,
      content,
      parentId: parentId || null, // Null si pas de parent (commentaire principal)
    });

    await newComment.save();
    const populatedComment = await newComment.populate('userId', 'username');

    res.status(201).json(populatedComment);
  } catch (err) {
    console.error('Erreur lors de l\'ajout du commentaire :', err);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire.' });
  }
});

// **Route GET : Récupérer les commentaires et leurs réponses**
router.get('/:photoId', async (req, res) => {
  try {
    const comments = await Comment.find({ photoId: req.params.photoId })
      .populate('userId', 'username')
      .populate('parentId', 'userId content')
      .sort({ createdAt: -1 });

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
      return res.status(403).json({ error: 'Accès interdit.' });
    }

    comment.content = content;
    comment.updatedAt = Date.now();
    await comment.save();
    const populatedComment = await comment.populate('userId', 'username _id');

    res.status(200).json(populatedComment);
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
      return res.status(403).json({ error: 'Accès interdit.' });
    }

    await Comment.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Commentaire supprimé avec succès.' });
  } catch (err) {
    console.error('Erreur lors de la suppression du commentaire :', err);
    res.status(500).json({ error: 'Erreur lors de la suppression du commentaire.' });
  }
});

module.exports = router;
