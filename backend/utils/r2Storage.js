const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = [
    './backend/uploads',
    './backend/uploads/profiles',
    './backend/uploads/thumbnails',
    './backend/uploads/videos',
    './backend/uploads/pdfs'
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure Multer to use local disk storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Determine destination based on file type
        let uploadPath = './backend/uploads';
        
        if (file.mimetype.startsWith('image/')) {
            uploadPath = file.fieldname === 'profilePic' ? './backend/uploads/profiles' : './backend/uploads/thumbnails';
        } else if (file.mimetype.startsWith('video/')) {
            uploadPath = './backend/uploads/videos';
        } else if (file.mimetype === 'application/pdf') {
            uploadPath = './backend/uploads/pdfs';
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Unique filename: fieldname-timestamp-random.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // Limit to 50MB
    fileFilter: (req, file, cb) => {
        // Allow images, videos, audio, pdf
        const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|mp3|wav|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: File type not supported!'));
    }
});

module.exports = upload;
