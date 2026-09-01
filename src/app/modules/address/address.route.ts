import express, { Router } from 'express';
import { AddressController } from './address.controller';
import { requireCustomer } from './address.auth';

const router: Router = express.Router();

/**
 * Address Routes (/api/addresses)
 * All routes are protected by requireCustomer which enforces customer-only
 * access and binds the userId to the authenticated user (no :userId in the
 * path, so callers can never operate on another user's addresses).
 */

// Get all addresses for the authenticated user
router.get('/', requireCustomer, AddressController.getAddresses);

// Create a new address
router.post('/', requireCustomer, AddressController.addAddress);

// Set an address as the user's default (declared before /:id for clarity)
router.patch('/:id/default', requireCustomer, AddressController.setDefaultAddress);

// Update an existing address
router.patch('/:id', requireCustomer, AddressController.updateAddress);

// Delete an existing address
router.delete('/:id', requireCustomer, AddressController.deleteAddress);

export const AddressRoutes = router;
