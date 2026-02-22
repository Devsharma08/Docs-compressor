import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../../packages/db/.env') });
import express from 'express';
import { prisma } from '@repo/db';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
    destination: path.join(__dirname, '../uploads'),
    filename: (req, file, cb) => {
        const uniqueSuffix = `${path.parse(file.originalname).name}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueSuffix);
    }
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const newDoc = await prisma.document.create({
            data: {
                filename: req.file.filename,
                originalSize: req.file.size,
                mimeType: req.file.mimetype,
                status: 'PENDING',
            },
        });

        return res.json({
            message: 'File uploaded and record created',
            document: newDoc,
        });
    } catch (error) {
        console.error("Upload Error:", error);
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        return res.status(500).json({ error: 'Internal Server Error', message, stack });
    }
});

app.get('/docs', async (req, res) => {
    try {
        const docs = await prisma.document.findMany();
        res.json(docs);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch docs' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});