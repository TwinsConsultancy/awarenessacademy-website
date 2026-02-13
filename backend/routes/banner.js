const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const authorize = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public Routes
router.get('/', bannerController.getPublicBanners);

// Admin Routes
router.get('/admin', authorize(['Admin']), bannerController.getAdminBanners);

router.post('/',
    authorize(['Admin']),
    upload.single('image'),
    bannerController.uploadBanner
);

router.put('/reorder',
    authorize(['Admin']),
    bannerController.updateBannerOrder
);

router.put('/:id',
    authorize(['Admin']),
    upload.single('image'),
    bannerController.updateBanner
);

router.delete('/:id',
    authorize(['Admin']),
    bannerController.deleteBanner
);

router.patch('/:id/toggle-status',
    authorize(['Admin']),
    bannerController.toggleBannerStatus
);

module.exports = router;
