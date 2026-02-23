import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../../packages/db/.env') });
import express from 'express';
import { prisma } from '@repo/db';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import {PDFDocument} from 'pdf-lib';
import fs from 'fs';


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

app.post('/compress/:id',async(req,res)=>{
    try {

        // find document by id
        const doc = await prisma.document.findUnique({
            where:{
                id: req.params.id,
            }
        });

        if(!doc){
            return res.status(404).json({
                error: 'Document not found'
            });
        }

        
        const inputPath = path.join(__dirname,'../uploads',doc.filename);

        const outputPath = path.join(__dirname,"../uploads/",doc.filename);

        // load pdf into memory

        const existingPdfBytes = fs.readFileSync(inputPath);

        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        // apply compression
        const compressedPdfBytes = await pdfDoc.save({
            useObjStream: true,
            addDefaultPage:false
        });
// save compressed pdf
        fs.writeFileSync(outputPath,compressedPdfBytes);

// update db status
        const stats = fs.statSync(outputPath);
        const updatedDoc = await prisma.document.update({
            where:{
                id:doc.id
            },
            data:{
                compressedSize:stats.size,
                status:'COMPLETED',
                
            }
        })
       return res.json({
        message:'Document compressed successfully',
        originalSize:doc.originalSize,
        compressedSize:stats.size,
        savings:`${((1-stats.size / doc.originalSize)*100).toFixed(2)}%`
       })
    } catch (error) {
        console.error("Compression Error:", error);
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        return res.status(500).json({ error: 'Internal Server Error', message, stack });
    }
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, async() => {
    console.log(`Server running on port ${PORT}`);

    try {
        await prisma.$connect();
        console.log("✅ prisma connected successfully");

        const count = await prisma.document.count();
        console.log(`Number of documents: ${count}`);
    } catch (error) {
        console.error("❌ Error connecting to Prisma:", error);
    }
});