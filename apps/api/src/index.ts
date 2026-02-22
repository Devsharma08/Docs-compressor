import express from 'express';
import {prisma} from 'src';
import cors from 'cors';
import multer from 'multer';
import {v4 as uuidv4} from 'uuid';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
    destination:path.join(__dirname, '../uploads'),
    filename:(req,file,cb)=>{
        const uniqueSuffix = `${path.parse(file.originalname).name}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueSuffix);
    }
});

const upload = multer({storage});

app.post('/upload',upload.single('file'),async(req,res)=>{
    try {
        if(!req.file){
            return res.status(400).json({error:'No file uploaded'});
        }

        const newDoc = await prisma.document.create({
            data:{
                filename:req.file.filename,
                originalSize:req.file.size,
                MimeType:req.file.mimetype,
                status:'PENDING',
            },
        });

        res.json({
            message:'File uploaded and record created',
            document:newDoc,
        })
    } catch (error) {
        
    }
})

app.get('/docs',async(req,res)=>{
    const docs = await prisma.document.findMany();
    res.json(docs);
});


const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`);
});