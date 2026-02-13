const { Banner } = require('../models/index');
const fs = require('fs').promises;
const path = require('path');

// Upload Banner (Admin Only)
exports.uploadBanner = async (req, res) => {
    try {
        const { title, link, width, height, size, format } = req.body;

        // Validation
        if (!title) {
            if (req.file) await fs.unlink(req.file.path);
            return res.status(400).json({ message: 'Banner title is required' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No image file uploaded' });
        }

        // Validate dimensions if provided (optional but good practice)
        if (width && parseInt(width) < 800) {
            // We can be strict here, but frontend validation should handle most cases
            // Just a warning or log
        }

        // Get max displayOrder
        const maxOrderBanner = await Banner.findOne().sort({ displayOrder: -1 });
        const nextOrder = maxOrderBanner ? (maxOrderBanner.displayOrder || 0) + 1 : 1;

        // Create Banner
        const newBanner = new Banner({
            title,
            link: link || '#',
            imageUrl: req.file.path.replace(/\\/g, '/'), // Normalize path
            displayOrder: nextOrder,
            active: true,
            uploadedBy: req.user.id,
            metadata: {
                width: parseInt(width) || 0,
                height: parseInt(height) || 0,
                size: req.file.size,
                format: req.file.mimetype
            }
        });

        await newBanner.save();

        await newBanner.populate('uploadedBy', 'name email');

        res.status(201).json({
            message: 'Banner uploaded successfully',
            banner: newBanner
        });

    } catch (err) {
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkErr) {
                console.error('Error deleting file:', unlinkErr);
            }
        }
        res.status(500).json({
            message: 'Failed to upload banner',
            error: err.message
        });
    }
};

// Get All Public Active Banners
exports.getPublicBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ active: true })
            .sort({ displayOrder: 1 })
            .select('-uploadedBy -metadata'); // Minimize data size

        res.status(200).json({ banners });
    } catch (err) {
        res.status(500).json({
            message: 'Failed to fetch banners',
            error: err.message
        });
    }
};

// Get All Admin Banners (Include inactive)
exports.getAdminBanners = async (req, res) => {
    try {
        const banners = await Banner.find()
            .sort({ displayOrder: 1 })
            .populate('uploadedBy', 'name email');

        res.status(200).json({ banners });
    } catch (err) {
        res.status(500).json({
            message: 'Failed to fetch banners',
            error: err.message
        });
    }
};

// Update Banner Order
exports.updateBannerOrder = async (req, res) => {
    try {
        const { orderedIds } = req.body;

        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return res.status(400).json({ message: 'Invalid order data' });
        }

        const updatePromises = orderedIds.map((id, index) =>
            Banner.findByIdAndUpdate(id, { displayOrder: index + 1 })
        );

        await Promise.all(updatePromises);

        res.status(200).json({ message: 'Banner order updated' });

    } catch (err) {
        res.status(500).json({
            message: 'Failed to update order',
            error: err.message
        });
    }
};

// Update Banner
exports.updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        const banner = await Banner.findById(id);
        if (!banner) {
            if (req.file) await fs.unlink(req.file.path);
            return res.status(404).json({ message: 'Banner not found' });
        }

        // Update title if provided
        if (title) {
            banner.title = title;
        }

        // Update image if new file uploaded
        if (req.file) {
            // Delete old image
            if (banner.imageUrl) {
                try {
                    const absolutePath = path.resolve(banner.imageUrl);
                    await fs.unlink(absolutePath);
                } catch (err) {
                    console.warn('Could not delete old banner file:', err.message);
                }
            }

            // Set new image
            banner.imageUrl = req.file.path.replace(/\\/g, '/');
            banner.metadata = {
                width: parseInt(req.body.width) || 0,
                height: parseInt(req.body.height) || 0,
                size: req.file.size,
                format: req.file.mimetype
            };
        }

        await banner.save();
        await banner.populate('uploadedBy', 'name email');

        res.status(200).json({
            message: 'Banner updated successfully',
            banner
        });

    } catch (err) {
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkErr) {
                console.error('Error deleting file:', unlinkErr);
            }
        }
        res.status(500).json({
            message: 'Failed to update banner',
            error: err.message
        });
    }
};

// Delete Banner
exports.deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await Banner.findById(id);

        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        // Delete file
        if (banner.imageUrl) {
            try {
                // If it's a relative path from root or similar
                // We typically store relative paths like 'uploads/...'
                // Need to resolve to absolute path for unlink
                // Assuming imageUrl is relative to project root or public dir
                const absolutePath = path.resolve(banner.imageUrl);
                // Check if file exists before deleting
                // OR just try deleting
                await fs.unlink(absolutePath);
            } catch (err) {
                console.warn('Could not delete banner file:', err.message);
                // Continue with DB deletion
            }
        }

        await Banner.findByIdAndDelete(id);

        res.status(200).json({ message: 'Banner deleted successfully' });

    } catch (err) {
        res.status(500).json({
            message: 'Failed to delete banner',
            error: err.message
        });
    }
};

// Toggle Active Status
exports.toggleBannerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await Banner.findById(id);

        if (!banner) return res.status(404).json({ message: 'Banner not found' });

        banner.active = !banner.active;
        await banner.save();

        res.status(200).json({
            message: `Banner ${banner.active ? 'activated' : 'deactivated'}`,
            banner
        });

    } catch (err) {
        res.status(500).json({
            message: 'Failed to toggle status',
            error: err.message
        });
    }
};
