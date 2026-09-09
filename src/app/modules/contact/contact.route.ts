import express, { Router } from 'express';
import { ContactController } from './contact.controller';

const router: Router = express.Router();

// Public: Submit a contact message
router.post('/', ContactController.createContactMessage);

// Admin / Dashboard endpoints
router.get('/stats', ContactController.getContactStats);
router.get('/', ContactController.getAllContactMessages);
router.get('/:id', ContactController.getContactMessageById);
router.patch('/:id/status', ContactController.updateContactStatus);
router.post('/:id/reply', ContactController.addContactReply);
router.delete('/:id', ContactController.deleteContactMessage);

export const ContactRoutes = router;
