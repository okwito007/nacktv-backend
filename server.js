const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 1024 * 1024 * 1024 }
});

app.use('/uploads', express.static('uploads'));

app.post('/upload', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const videoUrl = `https://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ success: true, url: videoUrl, filename: req.file.filename });
});

app.get('/videos', (req, res) => {
    fs.readdir('./uploads', (err, files) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Failed to list' });
        }
        const videos = files
            .filter(f => ['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(path.extname(f).toLowerCase()))
            .map(f => ({
                filename: f,
                url: `https://${req.get('host')}/uploads/${f}`,
                uploadDate: fs.statSync(`./uploads/${f}`).mtime
            }));
        res.json({ success: true, count: videos.length, videos });
    });
});

app.delete('/video/:filename', (req, res) => {
    const filepath = `./uploads/${req.params.filename}`;
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ success: false, error: 'Not found' });
    }
    fs.unlink(filepath, () => {
        res.json({ success: true, message: 'Deleted' });
    });
});

app.get('/stats', (req, res) => {
    fs.readdir('./uploads', (err, files) => {
        if (err) return res.status(500).json({ success: false });
        const videoFiles = files.filter(f => ['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(path.extname(f).toLowerCase()));
        let totalSize = 0;
        videoFiles.forEach(f => totalSize += fs.statSync(`./uploads/${f}`).size);
        res.json({
            success: true,
            totalVideos: videoFiles.length,
            totalSizeHuman: (totalSize / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 NackTv backend running on port ${PORT}`);
});
