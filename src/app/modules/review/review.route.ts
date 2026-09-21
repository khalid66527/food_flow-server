import express, { Router } from 'express';
import { ReviewController } from './review.controller';

const router: Router = express.Router();

router.post('/batch', ReviewController.createBatchReviews);
router.post('/', ReviewController.createBatchReviews);

router.get('/testimonials', ReviewController.getFeaturedTestimonials);
router.patch('/feature/:id', ReviewController.toggleReviewFeatured);
router.patch('/admin/feature/:id', ReviewController.toggleReviewFeatured);

router.get('/admin/all', ReviewController.getAllReviewsForAdmin);
router.get('/rider/:riderId', ReviewController.getRiderReviews);
router.get('/restaurant/:restaurantId', ReviewController.getRestaurantReviews);
router.get('/food/:foodId', ReviewController.getFoodReviews);
router.get('/order/:orderId', ReviewController.getOrderReviewStatus);

export const ReviewRoutes = router;
