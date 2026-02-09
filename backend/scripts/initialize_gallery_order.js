/**
 * Migration Script: Initialize displayOrder for existing gallery images
 * Run this once to set initial order based on creation date
 */

require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const { Gallery } = require('../models/index');

async function initializeGalleryOrder() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('✅ Connected to MongoDB');

        // Get all gallery images sorted by creation date
        const images = await Gallery.find().sort({ createdAt: 1 });
        
        if (images.length === 0) {
            console.log('ℹ️  No images found in gallery');
            return;
        }

        console.log(`📊 Found ${images.length} images. Setting display order...`);

        // Update each image with sequential order
        for (let i = 0; i < images.length; i++) {
            await Gallery.findByIdAndUpdate(images[i]._id, { 
                displayOrder: i + 1 
            });
        }

        console.log('✅ Display order initialized successfully!');
        console.log(`   Updated ${images.length} images with sequential order`);

    } catch (err) {
        console.error('❌ Error initializing gallery order:', err);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the migration
initializeGalleryOrder();
