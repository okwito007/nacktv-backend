const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// ===== THE 3 LINES ADDED HERE =====
app.get('/', (req, res) => {
    res.json({ message: '🚀 NackTv backend is running!' });
});
// ====================================

// Create uploads folder if it doesn't exist
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// Storage configuration
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { 
        fileSize: 1024 * 1024 * 1024 // 1GB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only video files are allowed.'));
        }
    }
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// ===== UPLOAD ENDPOINT =====
app.post('/upload', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            error: 'No file uploaded' 
        });
    }

    const videoUrl = `https://${req.get('host')}/uploads/${req.file.filename}`;
    
    console.log(`📤 Video uploaded: ${req.file.filename} from ${req.ip}`);

    res.json({
        success: true,
        url: videoUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
    });
});

// ===== LIST ALL VIDEOS =====
app.get('/videos', (req, res) => {
    fs.readdir('./uploads', (err, files) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to list videos' 
            });
        }

        const videos = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext);
            })
            .map(filename => {
                const stats = fs.statSync(`./uploads/${filename}`);
                return {
                    filename,
                    url: `https://${req.get('host')}/uploads/${filename}`,
                    uploadDate: stats.mtime,
                    size: stats.size
                };
            });

        res.json({
            success: true,
            count: videos.length,
            videos
        });
    });
});

// ===== DELETE VIDEO =====
app.delete('/video/:filename', (req, res) => {
    const filepath = `./uploads/${req.params.filename}`;
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ 
            success: false, 
            error: 'Video not found' 
        });
    }

    fs.unlink(filepath, (err) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to delete video' 
            });
        }
        console.log(`🗑️ Video deleted: ${req.params.filename}`);
        res.json({ 
            success: true, 
            message: 'Video deleted successfully' 
        });
    });
});

// ===== STATS ENDPOINT =====
app.get('/stats', (req, res) => {
    fs.readdir('./uploads', (err, files) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to get stats' 
            });
        }

        const videoFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext);
        });

        let totalSize = 0;
        videoFiles.forEach(file => {
            totalSize += fs.statSync(`./uploads/${file}`).size;
        });

        res.json({
            success: true,
            totalVideos: videoFiles.length,
            totalSize: totalSize,
            totalSizeHuman: (totalSize / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
        });
    });
});

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
    res.json({ 
        status: '🚀 NackTv backend is running!',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 NackTv backend running on port ${PORT}`);
    console.log(`📁 Uploads folder: ${__dirname}/uploads`);
    console.log(`🌐 Health check: https://localhost:${PORT}/health`);
});
