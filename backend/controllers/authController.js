const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/index');

/**
 * Generate Unique ID based on Role
 * Format: STU-YYYY-XXXX / STF-YYYY-XXXX / ADM-YYYY-XXXX
 */
const generateID = async (role) => {
    const year = new Date().getFullYear();
    const prefix = role === 'Student' ? 'STU' : (role === 'Staff' ? 'STF' : 'ADM');

    // Count existing users of this role to increment
    const count = await User.countDocuments({ role });
    const sequence = String(count + 1).padStart(4, '0');

    return `${prefix}-${year}-${sequence}`;
};

// Register User
exports.register = async (req, res) => {
    try {
        const { name, email, password, role, phone, address, gender, dob } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate Unique ID
        const studentID = await generateID(role);

        // Handle Profile Picture Path
        let profilePicPath = '';
        if (req.file) {
            profilePicPath = `/uploads/profiles/${req.file.filename}`;
        }

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role,
            studentID,
            phone,
            address,
            gender,
            dob,
            profilePic: profilePicPath
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully', studentID });
    } catch (err) {
        res.status(500).json({ message: 'Registration failed', error: err.message });
    }
};

// Login User
exports.login = async (req, res) => {
    try {
        const { identifier, password } = req.body; // Can be email or studentID

        const user = await User.findOne({
            $or: [{ email: identifier }, { studentID: identifier }]
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name },
            process.env.JWT_SECRET || 'innerspark_secret_key',
            { expiresIn: '24h' }
        );

        res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                studentID: user.studentID,
                profilePic: user.profilePic
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Login failed', error: err.message });
    }
};

// Get Profile (Full Details)
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: 'Profile fetch failed', error: err.message });
    }
};

// Update Profile
// Update Profile
exports.updateProfile = async (req, res) => {
    try {
        const updates = req.body;
        // Prevent critical field updates
        delete updates.password;
        delete updates.role;
        delete updates.studentID;
        delete updates.email;

        // Handle Profile Picture
        if (req.file) {
            // Validate Size (5KB - 50KB)
            if (req.file.size < 5120 || req.file.size > 51200) {
                // Delete invalid file
                const fs = require('fs');
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ message: 'File too large or too small. Size must be between 5KB and 50KB.' });
            }
            updates.profilePic = `/uploads/profiles/${req.file.filename}`;
        }

        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (err) {
        if (req.file) {
            const fs = require('fs');
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        }
        res.status(500).json({ message: 'Update failed', error: err.message });
    }
};

// Change Password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Password change failed', error: err.message });
    }
};
