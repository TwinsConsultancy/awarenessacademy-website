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

// View Certificate PDF (inline in browser)
exports.viewCertificate = async (req, res) => {
    try {
        const cert = await Certificate.findById(req.params.id)
            .populate('studentID', 'name studentID profilePhoto')
            .populate('courseID', 'title description');

        if (!cert) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        // Verify ownership
        if (cert.studentID._id.toString() !== req.user.id && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Use the same PDF generation logic but with inline disposition
        const doc = new PDFDocument({
            layout: 'landscape',
            size: 'A4',
            margins: { top: 30, bottom: 30, left: 40, right: 40 }
        });

        // Set response headers for inline viewing (not download)
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `inline; filename=Certificate_${cert.uniqueCertID}.pdf`
        );

        // Pipe the PDF to the response
        doc.pipe(res);

        // Generate certificate using shared logic
        generateCertificatePDF(doc, cert);

    } catch (err) {
        console.error('Certificate view error:', err);
        res.status(500).json({ message: 'Certificate view failed', error: err.message });
    }
};

// Generate and Download Certificate PDF
exports.downloadCertificate = async (req, res) => {
    try {
        const cert = await Certificate.findById(req.params.id)
            .populate('studentID', 'name studentID profilePhoto')
            .populate('courseID', 'title description');

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
            margins: { top: 30, bottom: 30, left: 40, right: 40 }
        });

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Certificate_${cert.uniqueCertID}.pdf`
        );

        // Pipe the PDF to the response
        doc.pipe(res);

        // Page dimensions
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;

        // ======= PREMIUM BACKGROUND =======
        // Subtle gradient effect using overlapping rectangles
        doc.rect(0, 0, pageWidth, pageHeight).fill('#FFFEF9');

        // Decorative corner elements
        const cornerSize = 80;
        doc.save()
            .fillColor('#FF9933', 0.08)
            .moveTo(0, 0)
            .lineTo(cornerSize, 0)
            .lineTo(0, cornerSize)
            .fill()
            .moveTo(pageWidth, 0)
            .lineTo(pageWidth - cornerSize, 0)
            .lineTo(pageWidth, cornerSize)
            .fill()
            .moveTo(0, pageHeight)
            .lineTo(cornerSize, pageHeight)
            .lineTo(0, pageHeight - cornerSize)
            .fill()
            .moveTo(pageWidth, pageHeight)
            .lineTo(pageWidth - cornerSize, pageHeight)
            .lineTo(pageWidth, pageHeight - cornerSize)
            .fill()
            .restore();

        // ======= ORNATE BORDERS =======
        // Outer border - Saffron
        doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
            .lineWidth(4)
            .strokeColor('#FF9933')
            .stroke();

        // Middle border - Gold
        doc.rect(26, 26, pageWidth - 52, pageHeight - 52)
            .lineWidth(1)
            .strokeColor('#FFC300')
            .stroke();

        // Inner border - Dark accent
        doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
            .lineWidth(0.5)
            .strokeColor('#CC7722')
            .stroke();

        // ======= LOGO AND HEADER =======
        const logoPath = path.join(__dirname, '../../frontend/assets/logo.png');
        const logoSize = 50;
        const logoX = (pageWidth - logoSize) / 2;

        // Insert Academy Logo
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, logoX, 45, { width: logoSize, height: logoSize });
        }

        // Academy Name
        doc.fontSize(32)
            .fillColor('#FF9933')
            .font('Helvetica-Bold')
            .text('INNERSPARK SANCTUARY', 0, 105, { align: 'center' });

        // Tagline
        doc.fontSize(10)
            .fillColor('#888888')
            .font('Helvetica-Oblique')
            .text('Where Technology Meets Tradition', 0, 140, { align: 'center' });

        // Decorative line under header
        const lineY = 155;
        doc.moveTo(150, lineY)
            .lineTo(pageWidth - 150, lineY)
            .lineWidth(1.5)
            .strokeColor('#FFC300')
            .stroke();

        // Decorative dots
        for (let i = 0; i < 5; i++) {
            const x = 150 + ((pageWidth - 300) / 4) * i;
            doc.circle(x, lineY, 3).fill('#FF9933');
        }

        // ======= CERTIFICATE TITLE =======
        doc.fontSize(40)
            .fillColor('#CC7722')
            .font('Times-Bold')
            .text('CERTIFICATE OF COMPLETION', 0, 175, {
                align: 'center'
            });

        // ======= STUDENT PHOTO (IF AVAILABLE) =======
        const photoSize = 80;
        const photoX = 60;
        const photoY = 220;

        if (cert.studentID.profilePhoto) {
            const photoPath = path.join(__dirname, '../../', cert.studentID.profilePhoto);

            if (fs.existsSync(photoPath)) {
                // Draw decorative border around photo
                doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2 + 3)
                    .lineWidth(2)
                    .strokeColor('#FFC300')
                    .stroke();

                // Clip to circle and insert photo
                doc.save()
                    .circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2)
                    .clip();

                doc.image(photoPath, photoX, photoY, {
                    width: photoSize,
                    height: photoSize,
                    align: 'center',
                    valign: 'center'
                });

                doc.restore();
            }
        } else {
            // Empty ornate frame if no photo (no placeholder image)
            doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2 + 3)
                .lineWidth(2)
                .strokeColor('#FFC300')
                .stroke();

            doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2)
                .lineWidth(1)
                .strokeColor('#E0E0E0')
                .stroke();
        }

        // ======= CERTIFICATION TEXT =======
        const textStartY = 230;

        doc.fontSize(13)
            .fillColor('#444444')
            .font('Helvetica')
            .text('This is to certify that', 180, textStartY, {
                align: 'left',
                width: pageWidth - 240
            });

        // Student Name - Prominent
        doc.fontSize(30)
            .fillColor('#000000')
            .font('Times-Bold')
            .text(cert.studentID.name.toUpperCase(), 180, textStartY + 25, {
                align: 'left',
                width: pageWidth - 240
            });

        // Decorative underline
        const nameUnderlineY = textStartY + 62;
        doc.moveTo(180, nameUnderlineY)
            .lineTo(pageWidth - 60, nameUnderlineY)
            .lineWidth(1)
            .strokeColor('#FFC300')
            .stroke();

        // Student ID
        doc.fontSize(10)
            .fillColor('#777777')
            .font('Helvetica-Oblique')
            .text(`Student ID: ${cert.studentID.studentID}`, 180, nameUnderlineY + 8, {
                align: 'left'
            });

        // Course completion text
        doc.fontSize(13)
            .fillColor('#444444')
            .font('Helvetica')
            .text('has successfully completed the transformative course', 180, nameUnderlineY + 30, {
                align: 'left',
                width: pageWidth - 240
            });

        // Course Title - Highlighted
        doc.fontSize(22)
            .fillColor('#FF9933')
            .font('Helvetica-Bold')
            .text(`"${cert.courseID.title}"`, 180, nameUnderlineY + 53, {
                align: 'left',
                width: pageWidth - 240
            });

        // Course description (if available, truncated)
        if (cert.courseID.description) {
            const desc = cert.courseID.description.length > 150
                ? cert.courseID.description.substring(0, 150) + '...'
                : cert.courseID.description;

            doc.fontSize(9)
                .fillColor('#666666')
                .font('Helvetica-Oblique')
                .text(desc, 180, nameUnderlineY + 82, {
                    align: 'left',
                    width: pageWidth - 240,
                    height: 30
                });
        }

        // Mentor acknowledgment
        const mentorY = nameUnderlineY + (cert.courseID.description ? 118 : 115);
        if (cert.mentorName) {
            doc.fontSize(11)
                .fillColor('#555555')
                .font('Helvetica')
                .text(`Mentored by: ${cert.mentorName}`, 180, mentorY, { align: 'left' });
        }

        // Score badge (decorative)
        const scoreY = mentorY + (cert.mentorName ? 25 : 18);
        doc.fontSize(13)
            .fillColor('#333333')
            .font('Helvetica-Bold')
            .text(`Assessment Score: `, 180, scoreY, { continued: true })
            .fillColor('#FF9933')
            .text(`${cert.percentage}%`);

        // ======= APPRECIATION MESSAGE =======
        const appreciationY = scoreY + 30;
        doc.fontSize(10)
            .fillColor('#666666')
            .font('Helvetica-Oblique')
            .text(
                'We commend your dedication to personal growth and spiritual enlightenment. May this achievement',
                180,
                appreciationY,
                { align: 'left', width: pageWidth - 240 }
            );

        doc.text(
            'inspire you to continue your journey towards self-awareness and inner transformation.',
            180,
            appreciationY + 15,
            { align: 'left', width: pageWidth - 240 }
        );

        // ======= VERIFICATION SECTION (BOTTOM) =======
        const bottomY = pageHeight - 70;

        // Certificate Number with decorative box
        doc.rect(45, bottomY - 5, 200, 30)
            .lineWidth(1)
            .strokeColor('#E0E0E0')
            .stroke();

        doc.fontSize(8)
            .fillColor('#888888')
            .font('Helvetica')
            .text('CERTIFICATE NO.', 50, bottomY, { width: 190 });

        doc.fontSize(11)
            .fillColor('#333333')
            .font('Helvetica-Bold')
            .text(cert.uniqueCertID, 50, bottomY + 10, { width: 190 });

        // Date of Completion
        const completionDate = cert.completedAt || cert.issueDate;
        const formattedDate = new Date(completionDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        // Issue date with decorative box
        doc.rect(pageWidth - 245, bottomY - 5, 200, 30)
            .lineWidth(1)
            .strokeColor('#E0E0E0')
            .stroke();

        doc.fontSize(8)
            .fillColor('#888888')
            .font('Helvetica')
            .text('DATE OF COMPLETION', pageWidth - 240, bottomY, {
                width: 190,
                align: 'right'
            });

        doc.fontSize(11)
            .fillColor('#333333')
            .font('Helvetica-Bold')
            .text(formattedDate, pageWidth - 240, bottomY + 10, {
                width: 190,
                align: 'right'
            });

        // ======= VERIFICATION QR CODE PLACEHOLDER =======
        // Center bottom - could be enhanced with actual QR code generation
        const qrSize = 40;
        const qrX = (pageWidth - qrSize) / 2;
        const qrY = bottomY - 3;

        doc.rect(qrX, qrY, qrSize, qrSize)
            .lineWidth(0.5)
            .strokeColor('#999999')
            .stroke();

        doc.fontSize(7)
            .fillColor('#999999')
            .font('Helvetica')
            .text('VERIFY', qrX, qrY + 14, { width: qrSize, align: 'center' });

        doc.fontSize(6)
            .text('ONLINE', qrX, qrY + 22, { width: qrSize, align: 'center' });

        // ======= SUBTLE WATERMARK =======
        doc.fontSize(100)
            .fillColor('#FF9933', 0.02)
            .font('Helvetica-Bold')
            .text('INNERSPARK', pageWidth / 2 - 180, pageHeight / 2 - 40, {
                rotate: 45,
                opacity: 0.02
            });

        // ======= DECORATIVE SEAL (TOP RIGHT) =======
        const sealX = pageWidth - 80;
        const sealY = 60;
        const sealRadius = 30;

        // Outer golden ring
        doc.circle(sealX, sealY, sealRadius)
            .lineWidth(3)
            .strokeColor('#FFC300')
            .stroke();

        // Inner saffron fill
        doc.circle(sealX, sealY, sealRadius - 5)
            .fillColor('#FF9933', 0.15)
            .fill();

        // Seal rays
        for (let angle = 0; angle < 360; angle += 30) {
            const rad = (angle * Math.PI) / 180;
            const x1 = sealX + Math.cos(rad) * (sealRadius - 2);
            const y1 = sealY + Math.sin(rad) * (sealRadius - 2);
            const x2 = sealX + Math.cos(rad) * (sealRadius + 4);
            const y2 = sealY + Math.sin(rad) * (sealRadius + 4);

            doc.moveTo(x1, y1)
                .lineTo(x2, y2)
                .lineWidth(1.5)
                .strokeColor('#FFC300')
                .stroke();
        }

        // Seal text
        doc.fontSize(7)
            .fillColor('#FF9933')
            .font('Helvetica-Bold')
            .text('CERTIFIED', sealX - 20, sealY - 9, { width: 40, align: 'center' });

        doc.fontSize(6)
            .fillColor('#CC7722')
            .text('AUTHENTIC', sealX - 20, sealY + 1, { width: 40, align: 'center' });

        // Finalize the PDF
        doc.end();

    } catch (err) {
        console.error('Certificate generation error:', err);
        res.status(500).json({ message: 'Certificate generation failed', error: err.message });
    }
};
