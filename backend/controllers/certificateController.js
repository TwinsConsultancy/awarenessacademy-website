const { Certificate, Course, User } = require('../models/index');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.getMyCertificates = async (req, res) => {
    try {
        const certs = await Certificate.find({ studentID: req.user.id })
            .populate('courseID', 'title')
            .sort({ issueDate: -1 });
        res.status(200).json(certs);
    } catch (err) {
        res.status(500).json({ message: 'Fetch failed', error: err.message });
    }
};

exports.getCertificateDetails = async (req, res) => {
    try {
        const cert = await Certificate.findById(req.params.id)
            .populate('studentID', 'name studentID')
            .populate('courseID', 'title');

        if (!cert) return res.status(404).json({ message: 'Certificate not found' });

        res.status(200).json(cert);
    } catch (err) {
        res.status(500).json({ message: 'Fetch failed', error: err.message });
    }
};

// Generate and Download Certificate PDF
exports.downloadCertificate = async (req, res) => {
    try {
        const cert = await Certificate.findById(req.params.id)
            .populate('studentID', 'name studentID')
            .populate('courseID', 'title');

        if (!cert) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        // Verify ownership
        if (cert.studentID._id.toString() !== req.user.id && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Create PDF in landscape orientation
        const doc = new PDFDocument({
            layout: 'landscape',
            size: 'A4',
            margins: { top: 40, bottom: 40, left: 50, right: 50 }
        });

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Certificate_${cert.uniqueCertID}.pdf`
        );

        // Pipe the PDF to the response
        doc.pipe(res);

        // Certificate Design
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;

        // Draw decorative border
        doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
            .lineWidth(3)
            .strokeColor('#FF9933')
            .stroke();

        doc.rect(35, 35, pageWidth - 70, pageHeight - 70)
            .lineWidth(1)
            .strokeColor('#FFC300')
            .stroke();

        // Academy Logo (placeholder - replace with actual logo if available)
        doc.fontSize(36)
            .fillColor('#FF9933')
            .font('Helvetica-Bold')
            .text('AWARENESS ACADEMY', 0, 60, { align: 'center' });

        // Contact Details
        doc.fontSize(9)
            .fillColor('#666666')
            .font('Helvetica')
            .text('Email: contact@awarenessacademy.com | Phone: +91-XXXX-XXXXXX', 0, 105, {
                align: 'center'
            });

        // Certificate Title
        doc.fontSize(48)
            .fillColor('#FFC300')
            .font('Times-Bold')
            .text('Certificate of Completion', 0, 150, {
                align: 'center',
                underline: false
            });

        // Decorative Line
        doc.moveTo(200, 215)
            .lineTo(pageWidth - 200, 215)
            .lineWidth(2)
            .strokeColor('#FF9933')
            .stroke();

        // "This is to certify that"
        doc.fontSize(14)
            .fillColor('#333333')
            .font('Helvetica')
            .text('This is to certify that', 0, 240, { align: 'center' });

        // Student Name
        doc.fontSize(28)
            .fillColor('#000000')
            .font('Times-Bold')
            .text(cert.studentID.name.toUpperCase(), 0, 270, { align: 'center' });

        // Student ID
        doc.fontSize(11)
            .fillColor('#666666')
            .font('Helvetica-Oblique')
            .text(`Student ID: ${cert.studentID.studentID}`, 0, 305, { align: 'center' });

        // Course Details
        doc.fontSize(14)
            .fillColor('#333333')
            .font('Helvetica')
            .text('has successfully completed the course', 0, 335, { align: 'center' });

        doc.fontSize(20)
            .fillColor('#FF9933')
            .font('Helvetica-Bold')
            .text(cert.courseID.title, 0, 360, {
                align: 'center',
                width: pageWidth - 100
            });

        // Mentor Name
        if (cert.mentorName) {
            doc.fontSize(13)
                .fillColor('#666666')
                .font('Helvetica')
                .text(`Mentored by ${cert.mentorName}`, 0, 395, { align: 'center' });
        }

        // Score
        doc.fontSize(14)
            .fillColor('#333333')
            .font('Helvetica-Bold')
            .text(`with a score of ${cert.percentage}%`, 0, 420, { align: 'center' });

        // Appreciation Text
        doc.fontSize(11)
            .fillColor('#555555')
            .font('Helvetica-Oblique')
            .text(
                'We commend your dedication to learning and personal growth. May this achievement',
                0,
                450,
                { align: 'center', width: pageWidth - 100 }
            );

        doc.text(
            'inspire you to continue your journey towards enlightenment and self-awareness.',
            0,
            468,
            { align: 'center', width: pageWidth - 100 }
        );

        // Bottom Section - Certificate Number and Date
        const bottomY = pageHeight - 80;

        // Certificate Number (Left)
        doc.fontSize(10)
            .fillColor('#333333')
            .font('Helvetica-Bold')
            .text(`Certificate No: ${cert.uniqueCertID}`, 60, bottomY, {
                align: 'left',
                width: 250
            });

        // Completion Date (Right)
        const completionDate = cert.completedAt || cert.issueDate;
        const formattedDate = new Date(completionDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        doc.fontSize(10)
            .fillColor('#333333')
            .font('Helvetica-Bold')
            .text(`Completed on: ${formattedDate}`, pageWidth - 310, bottomY, {
                align: 'right',
                width: 250
            });

        // Watermark (Background)
        doc.fontSize(120)
            .fillColor('#FF9933', 0.03)
            .font('Helvetica-Bold')
            .text('AWARENESS', pageWidth / 2 - 200, pageHeight / 2 - 60, {
                rotate: 45,
                opacity: 0.03
            });

        // Finalize the PDF
        doc.end();

    } catch (err) {
        console.error('Certificate generation error:', err);
        res.status(500).json({ message: 'Certificate generation failed', error: err.message });
    }
};
