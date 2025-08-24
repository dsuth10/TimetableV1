import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Alert, CircularProgress, Paper } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { api } from '../services/api';
import { DataGrid } from '@mui/x-data-grid';
import SchoolClassForm from '../components/SchoolClassForm';

function ClassManagement() {
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [error, setError] = useState(null);
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [selectedClassDetails, setSelectedClassDetails] = useState(null);

    const fetchClasses = async () => {
        try {
            const response = await api.get('/school-classes');
            setClasses(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Error fetching classes:", err);
            setError(err.response?.data?.error?.message || "An error occurred while fetching classes.");
        }
    };

    const fetchClassDetails = async (id) => {
        try {
            const response = await api.get(`/school-classes/${id}`);
            setSelectedClassDetails(response.data);
        } catch (err) {
            console.error("Error fetching class details:", err);
            setError(err.response?.data?.error?.message || "An error occurred while fetching class details.");
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchClassDetails(selectedClassId);
        } else {
            setSelectedClassDetails(null);
        }
    }, [selectedClassId]);

    const onDrop = async (acceptedFiles) => {
        if (acceptedFiles.length === 0) {
            setError("Please upload a file.");
            return;
        }

        const file = acceptedFiles[0];
        if (file.type !== 'text/csv' && file.type !== 'application/json') {
            setError("Only CSV or JSON files are supported.");
            return;
        }

        setError(null);
        setUploading(true);
        setUploadResult(null);

        try {
            let dataToUpload = [];

            if (file.type === 'text/csv') {
                const text = await file.text();
                const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
                if (parsed.errors.length > 0) {
                    setError("CSV parsing errors: " + parsed.errors.map(e => e.message).join(", "));
                    setUploading(false);
                    return;
                }
                dataToUpload = parsed.data;
            } else if (file.type === 'application/json') {
                const text = await file.text();
                dataToUpload = JSON.parse(text);
                if (!Array.isArray(dataToUpload)) {
                    setError("JSON file must contain an array of class objects.");
                    setUploading(false);
                    return;
                }
            }

            const validatedData = dataToUpload.map(item => ({
                class_code: item.class_code,
                grade: item.grade,
                teacher: item.teacher,
                notes: item.notes || ''
            }));

            const response = await api.post('/school-classes/bulk-upload', validatedData);
            setUploadResult(response.data);
            fetchClasses(); // Refresh class list after upload

        } catch (err) {
            console.error("Upload error:", err);
            setError(err.response?.data?.error?.message || "An unexpected error occurred during upload.");
        } finally {
            setUploading(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const columns = [
        { field: 'class_code', headerName: 'Class Code', width: 150 },
        { field: 'grade', headerName: 'Grade', width: 100 },
        { field: 'teacher', headerName: 'Teacher', width: 200 },
        { field: 'notes', headerName: 'Notes', flex: 1 },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>Class Management</Typography>

            <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>Bulk Upload Classes</Typography>
            <Box 
                {...getRootProps()} 
                sx={{ 
                    border: '2px dashed grey', 
                    p: 4, 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    mt: 3,
                    bgcolor: isDragActive ? 'action.hover' : 'transparent'
                }}
            >
                <input {...getInputProps()} />
                {
                    isDragActive ?
                    <Typography>Drop the files here ...</Typography> :
                    <Typography>Drag 'n' drop some CSV or JSON files here, or click to select files</Typography>
                }
            </Box>

            {uploading && <CircularProgress sx={{ mt: 2 }} />}
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            {uploadResult && (
                <Box sx={{ mt: 2 }}>
                    <Alert severity="success">
                        {uploadResult.message}
                    </Alert>
                    {uploadResult.successful_class_codes && uploadResult.successful_class_codes.length > 0 && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Successfully uploaded: {uploadResult.successful_class_codes.join(', ')}
                        </Typography>
                    )}
                    {uploadResult.failed_entries && uploadResult.failed_entries.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="error">Failed entries:</Typography>
                            <ul>
                                {uploadResult.failed_entries.map((entry, index) => (
                                    <li key={index}>
                                        <Typography variant="body2">
                                            Data: {JSON.stringify(entry.data)} - Error: {entry.error}
                                        </Typography>
                                    </li>
                                ))}
                            </ul>
                        </Box>
                    )}
                </Box>
            )}

            <Typography variant="body1" sx={{ mt: 4 }}>
                Expected CSV/JSON format for each class:
            </Typography>
            <Typography component="pre" sx={{ bgcolor: 'grey.100', p: 2, mt: 1, overflowX: 'auto' }}>
                <code>
{`CSV Example:
class_code,grade,teacher,notes
C101,10,Mr. Smith,Morning class
C102,9,Ms. Jones,Afternoon class

JSON Example:
[
  {
    "class_code": "C101",
    "grade": "10",
    "teacher": "Mr. Smith",
    "notes": "Morning class"
  },
  {
    "class_code": "C102",
    "grade": "9",
    "teacher": "Ms. Jones",
    "notes": "Afternoon class"
  }
]`}
                </code>
            </Typography>
            
            <SchoolClassForm onClassAdded={() => fetchClasses()} />

            <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>Existing Classes</Typography>
            <Paper sx={{ height: 400, width: '100%', mt: 2 }}>
                <DataGrid
                    rows={classes}
                    columns={columns}
                    pageSize={5}
                    rowsPerPageOptions={[5, 10, 20]}
                    onRowClick={(params) => setSelectedClassId(params.id)}
                />
            </Paper>

            {selectedClassDetails && (
                <Box sx={{ mt: 4, p: 3, border: '1px solid #ccc', borderRadius: '8px' }}>
                    <Typography variant="h5" gutterBottom>Class Details: {selectedClassDetails.class_code}</Typography>
                    <Typography variant="body1"><strong>Grade:</strong> {selectedClassDetails.grade}</Typography>
                    <Typography variant="body1"><strong>Teacher:</strong> {selectedClassDetails.teacher}</Typography>
                    <Typography variant="body1"><strong>Notes:</strong> {selectedClassDetails.notes || 'N/A'}</Typography>
                    {/* Placeholder for student roster and teacher aide support */}
                    <Typography variant="h6" sx={{ mt: 2 }}>Student Roster (Coming Soon)</Typography>
                    <Typography variant="h6" sx={{ mt: 2 }}>Teacher Aide Support (Coming Soon)</Typography>
                </Box>
            )}
        </Box>
    );
}

export default ClassManagement;
