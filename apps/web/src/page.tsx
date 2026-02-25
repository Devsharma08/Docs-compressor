"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function DocumentDashboard() {
    const [files, setFiles] = useState([]);

    const [loading, setLoading] = useState(false);

    const fetchDocs = async () => {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/docs`);
        setFiles(res.data);
    }

    useEffect(() => {
        fetchDocs();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // upload file to backend
            const uploadRes = await axios.post(`${import.meta.env.VITE_API_URL}/upload`, formData);
            const docId = uploadRes.data.document.id;

            // trigger compression
            await axios.post(`${import.meta.env.VITE_API_URL}/compress/${docId}`);

            // refresh document list
            fetchDocs();
        } catch (err) {
            console.log("upload failed", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (id: string, filename: string) => {
        window.open(`${import.meta.env.VITE_API_URL}/download/${id}`, '_blank');
    }

    return (
        <main className='min-h-screen bg-gray-50  p-8'>
            <div className='max-w-4xl mx-auto'>
                <header className='mb-10 text-center'>
                    <h1 className='text-4xl font-extrabold text-gray-900'>DocCompress</h1>
                    <p className='text-gray-600 mt-2'>Upload and compress your documents</p>
                </header>

                {/* upload section */}
                <section className='bg-white p-8 rounded-xl shadow-sm border-2 border-dashed border-gray-300 flex flex-col items-center'>
                    <input type="file"
                        id='file-upload'
                        className='hidden'
                        onChange={handleFileUpload}
                        accept='.pdf'
                    />
                    <label htmlFor='file-upload'
                        className='cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition'>
                        {loading ? "processing..." : "select a document to upload"}
                    </label>
                </section>

                {/* list section */}
                <section className='mt-12'>
                    <h2 className='text-xl font-semibold mb-4 text-gray-800 '> Your Documents</h2>
                    <div className='bg-white rounded-lg shadow overflow-hidden'>
                        {
                            files.map((doc: any) => (
                                <div key={doc.id} className='p-4 border-b flex justify-between items-center hover:bg-gray-50'>
                                    <div>
                                        <p className='font-medium text-gray-900'>{doc.name}

                                        </p>
                                        <button
                                            onClick={() => handleDownload(doc.id, doc.filename)}
                                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-medium transition"
                                        >
                                            Download
                                        </button>
                                        <p className='text-sm text-gray-500'>
                                            Original:{(doc.originalSize / 1024).toFixed(2)} KB

                                        </p>
                                    </div>

                                    <div className='text-right'>
                                        <span className='text-green-600 font-bold'> {doc.compressedSize ? `Saved ${((1 - doc.compressedSize / doc.originalSize) * 100).toFixed(1)}%` : "Pending"}

                                        </span>
                                    </div>


                                </div>
                            ))
                        }

                    </div>

                </section>
            </div>
        </main>
    );
};
