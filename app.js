// Global variables
let currentTool = null;
let uploadedFiles = [];
let processedResults = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set up PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    
    // Add event listeners for tool cards
    const toolCards = document.querySelectorAll('.tool-card');
    toolCards.forEach(card => {
        card.addEventListener('click', function() {
            const toolType = this.getAttribute('data-tool');
            openTool(toolType);
        });
    });
    
    // Add modal close functionality
    const modalCloses = document.querySelectorAll('.modal-close');
    modalCloses.forEach(close => {
        close.addEventListener('click', closeModal);
    });
    
    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal();
        }
    });
}

// Modal functions
function openTool(toolType) {
    currentTool = toolType;
    const modal = document.getElementById('toolModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    // Clear previous content
    modalBody.innerHTML = '';
    uploadedFiles = [];
    processedResults = [];
    
    // Set title and content based on tool type
    const toolConfig = getToolConfig(toolType);
    modalTitle.textContent = toolConfig.title;
    
    // Create tool interface
    createToolInterface(toolType, modalBody);
    
    // Show modal
    modal.classList.remove('hidden');
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.add('hidden');
    });
    currentTool = null;
    uploadedFiles = [];
    processedResults = [];
}

function getToolConfig(toolType) {
    const configs = {
        'pdf-to-text': { title: 'PDF to Text Converter', accepts: '.pdf' },
        'text-to-pdf': { title: 'Text to PDF Converter', accepts: '.txt' },
        'pdf-to-jpg': { title: 'PDF to JPG Converter', accepts: '.pdf' },
        'jpg-to-pdf': { title: 'JPG to PDF Converter', accepts: '.jpg,.jpeg,.png,.gif,.bmp' },
        'merge-pdf': { title: 'PDF Merger', accepts: '.pdf' },
        'pdf-to-excel': { title: 'PDF to Excel Converter', accepts: '.pdf' },
        'image-to-pdf': { title: 'Image to PDF Converter', accepts: '.jpg,.jpeg,.png,.gif,.bmp' },
        'invert-image': { title: 'Image Color Inverter', accepts: '.jpg,.jpeg,.png,.gif,.bmp' },
        'text-to-image': { title: 'Text to Image Generator', accepts: null },
        'image-translator': { title: 'Image OCR Text Extractor', accepts: '.jpg,.jpeg,.png,.gif,.bmp' },
        'qr-generator': { title: 'QR Code Generator', accepts: null },
        'qr-scanner': { title: 'QR Code Scanner', accepts: null },
        'text-to-word': { title: 'Text to Word Converter', accepts: '.txt' },
        'create-csv': { title: 'CSV Creator', accepts: null },
        'file-info': { title: 'File Information Analyzer', accepts: '*' },
        'batch-converter': { title: 'Batch File Converter', accepts: '*' }
    };
    return configs[toolType] || { title: 'Unknown Tool', accepts: '*' };
}

function createToolInterface(toolType, container) {
    const template = document.getElementById('fileUploadTemplate');
    const toolConfig = getToolConfig(toolType);
    
    if (['qr-generator', 'text-to-image', 'create-csv', 'qr-scanner'].includes(toolType)) {
        createSpecialInterface(toolType, container);
        return;
    }
    
    // Clone the template
    const clone = template.content.cloneNode(true);
    
    // Configure file input
    const fileInput = clone.querySelector('#fileInput');
    if (toolConfig.accepts && toolConfig.accepts !== '*') {
        fileInput.setAttribute('accept', toolConfig.accepts);
    }
    
    if (['merge-pdf', 'batch-converter'].includes(toolType)) {
        fileInput.setAttribute('multiple', 'true');
    }
    
    // Set up event listeners
    const fileUpload = clone.querySelector('#fileUpload');
    const fileList = clone.querySelector('#fileList');
    const processBtn = clone.querySelector('#processBtn');
    
    setupFileUpload(fileUpload, fileInput, fileList, processBtn);
    
    processBtn.addEventListener('click', function() {
        processFiles(toolType);
    });
    
    container.appendChild(clone);
}

function createSpecialInterface(toolType, container) {
    switch (toolType) {
        case 'qr-generator':
            createQRGeneratorInterface(container);
            break;
        case 'qr-scanner':
            createQRScannerInterface(container);
            break;
        case 'text-to-image':
            createTextToImageInterface(container);
            break;
        case 'create-csv':
            createCSVInterface(container);
            break;
    }
}

function createQRGeneratorInterface(container) {
    container.innerHTML = `
        <div class="form-group">
            <label for="qrText" class="form-label">Text or URL to encode:</label>
            <textarea id="qrText" class="form-control" rows="4" placeholder="Enter text or URL here..."></textarea>
        </div>
        <div class="option-group">
            <label for="qrSize" class="form-label">QR Code Size:</label>
            <select id="qrSize" class="form-control">
                <option value="200">200x200</option>
                <option value="300" selected>300x300</option>
                <option value="400">400x400</option>
                <option value="500">500x500</option>
            </select>
        </div>
        <div class="tool-actions">
            <button class="btn btn--primary" onclick="generateQRCode()">Generate QR Code</button>
            <button class="btn btn--secondary modal-close">Cancel</button>
        </div>
        <div class="qr-display" id="qrDisplay" style="display: none;">
            <h4>Generated QR Code:</h4>
            <canvas id="qrCanvas"></canvas>
            <div class="tool-actions">
                <button class="btn btn--primary" onclick="downloadQRCode()">Download QR Code</button>
            </div>
        </div>
    `;
}

function createQRScannerInterface(container) {
    container.innerHTML = `
        <div class="scanner-area">
            <div id="qr-reader" style="width: 100%; height: 400px; border-radius: 8px; overflow: hidden;"></div>
        </div>
        <div class="tool-actions">
            <button class="btn btn--primary" id="startScan">Start Scanner</button>
            <button class="btn btn--secondary" id="stopScan" style="display: none;">Stop Scanner</button>
            <button class="btn btn--secondary modal-close">Cancel</button>
        </div>
        <div class="results-area" id="scanResults" style="display: none;">
            <h4>Scan Results:</h4>
            <div class="text-output" id="scanOutput"></div>
        </div>
    `;
    
    setupQRScanner();
}

function createTextToImageInterface(container) {
    container.innerHTML = `
        <div class="form-group">
            <label for="imageText" class="form-label">Text to convert to image:</label>
            <textarea id="imageText" class="form-control text-input" placeholder="Enter your text here..."></textarea>
        </div>
        <div class="option-group">
            <label for="fontSize" class="form-label">Font Size:</label>
            <select id="fontSize" class="form-control">
                <option value="16">16px</option>
                <option value="20">20px</option>
                <option value="24" selected>24px</option>
                <option value="32">32px</option>
                <option value="40">40px</option>
            </select>
        </div>
        <div class="option-group">
            <label for="bgColor" class="form-label">Background Color:</label>
            <input type="color" id="bgColor" class="form-control" value="#ffffff">
        </div>
        <div class="option-group">
            <label for="textColor" class="form-label">Text Color:</label>
            <input type="color" id="textColor" class="form-control" value="#000000">
        </div>
        <div class="tool-actions">
            <button class="btn btn--primary" onclick="generateTextImage()">Generate Image</button>
            <button class="btn btn--secondary modal-close">Cancel</button>
        </div>
        <div class="results-area" id="imageResults" style="display: none;">
            <h4>Generated Image:</h4>
            <canvas id="textCanvas" style="border: 1px solid #ccc; border-radius: 8px;"></canvas>
            <div class="tool-actions">
                <button class="btn btn--primary" onclick="downloadTextImage()">Download Image</button>
            </div>
        </div>
    `;
}

function createCSVInterface(container) {
    container.innerHTML = `
        <div class="form-group">
            <label for="csvRows" class="form-label">Number of rows:</label>
            <input type="number" id="csvRows" class="form-control" value="3" min="1" max="100">
        </div>
        <div class="form-group">
            <label for="csvCols" class="form-label">Number of columns:</label>
            <input type="number" id="csvCols" class="form-control" value="3" min="1" max="20">
        </div>
        <div class="tool-actions">
            <button class="btn btn--primary" onclick="createCSVTable()">Create Table</button>
            <button class="btn btn--secondary modal-close">Cancel</button>
        </div>
        <div id="csvTableContainer" style="display: none;">
            <h4>Edit your CSV data:</h4>
            <div id="csvTable"></div>
            <div class="tool-actions">
                <button class="btn btn--primary" onclick="downloadCSV()">Download CSV</button>
                <button class="btn btn--secondary" onclick="createCSVTable()">Recreate Table</button>
            </div>
        </div>
    `;
}

function setupFileUpload(fileUpload, fileInput, fileList, processBtn) {
    // Drag and drop functionality
    fileUpload.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    
    fileUpload.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
    });
    
    fileUpload.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files, fileList, processBtn);
    });
    
    // File input change
    fileInput.addEventListener('change', function() {
        const files = Array.from(this.files);
        handleFiles(files, fileList, processBtn);
    });
}

function handleFiles(files, fileList, processBtn) {
    files.forEach(file => {
        if (!uploadedFiles.find(f => f.name === file.name && f.size === file.size)) {
            uploadedFiles.push(file);
        }
    });
    
    updateFileList(fileList);
    processBtn.disabled = uploadedFiles.length === 0;
}

function updateFileList(fileList) {
    fileList.innerHTML = '';
    
    uploadedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">${getFileIcon(file.type)}</div>
                <div class="file-details">
                    <h4>${file.name}</h4>
                    <p>${formatFileSize(file.size)} • ${file.type || 'Unknown type'}</p>
                </div>
            </div>
            <button class="file-remove" onclick="removeFile(${index})">Remove</button>
        `;
        fileList.appendChild(fileItem);
    });
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    const fileList = document.querySelector('#fileList');
    const processBtn = document.querySelector('#processBtn');
    updateFileList(fileList);
    processBtn.disabled = uploadedFiles.length === 0;
}

function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.startsWith('text/')) return '📝';
    if (mimeType.includes('word')) return '📄';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    return '📁';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Progress modal functions
function showProgress(text = 'Processing...') {
    const progressModal = document.getElementById('progressModal');
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');
    
    progressText.textContent = text;
    progressFill.style.width = '0%';
    progressModal.classList.remove('hidden');
}

function updateProgress(percent, text) {
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');
    
    progressFill.style.width = percent + '%';
    if (text) progressText.textContent = text;
}

function hideProgress() {
    const progressModal = document.getElementById('progressModal');
    progressModal.classList.add('hidden');
}

// File processing functions
async function processFiles(toolType) {
    if (uploadedFiles.length === 0) return;
    
    showProgress(`Processing files with ${getToolConfig(toolType).title}...`);
    
    try {
        switch (toolType) {
            case 'pdf-to-text':
                await processPDFToText();
                break;
            case 'text-to-pdf':
                await processTextToPDF();
                break;
            case 'pdf-to-jpg':
                await processPDFToJPG();
                break;
            case 'jpg-to-pdf':
                await processJPGToPDF();
                break;
            case 'merge-pdf':
                await processMergePDF();
                break;
            case 'pdf-to-excel':
                await processPDFToExcel();
                break;
            case 'image-to-pdf':
                await processImageToPDF();
                break;
            case 'invert-image':
                await processInvertImage();
                break;
            case 'image-translator':
                await processImageOCR();
                break;
            case 'text-to-word':
                await processTextToWord();
                break;
            case 'file-info':
                await processFileInfo();
                break;
            case 'batch-converter':
                await processBatchConverter();
                break;
            default:
                throw new Error('Unknown tool type');
        }
        
        updateProgress(100, 'Processing complete!');
        setTimeout(() => {
            hideProgress();
            showResults();
        }, 1000);
        
    } catch (error) {
        console.error('Processing error:', error);
        hideProgress();
        showError('Processing failed: ' + error.message);
    }
}

// PDF to Text conversion
async function processPDFToText() {
    for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        updateProgress((i / uploadedFiles.length) * 100, `Processing ${file.name}...`);
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += `Page ${pageNum}:\n${pageText}\n\n`;
        }
        
        processedResults.push({
            originalName: file.name,
            newName: file.name.replace('.pdf', '.txt'),
            data: fullText,
            type: 'text/plain'
        });
    }
}

// Text to PDF conversion
async function processTextToPDF() {
    const { jsPDF } = window.jspdf;
    
    for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        updateProgress((i / uploadedFiles.length) * 100, `Processing ${file.name}...`);
        
        const text = await file.text();
        const pdf = new jsPDF();
        
        const lines = pdf.splitTextToSize(text, 180);
        let y = 20;
        
        lines.forEach(line => {
            if (y > 280) {
                pdf.addPage();
                y = 20;
            }
            pdf.text(line, 20, y);
            y += 7;
        });
        
        const pdfBlob = pdf.output('blob');
        processedResults.push({
            originalName: file.name,
            newName: file.name.replace('.txt', '.pdf'),
            data: pdfBlob,
            type: 'application/pdf'
        });
    }
}

// PDF to JPG conversion
async function processPDFToJPG() {
    for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        updateProgress((i / uploadedFiles.length) * 100, `Processing ${file.name}...`);
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            
            canvas.toBlob(blob => {
                processedResults.push({
                    originalName: file.name,
                    newName: `${file.name.replace('.pdf', '')}_page_${pageNum}.jpg`,
                    data: blob,
                    type: 'image/jpeg'
                });
            }, 'image/jpeg', 0.95);
        }
    }
}

// JPG to PDF conversion
async function processJPGToPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    let pageAdded = false;
    
    for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        updateProgress((i / uploadedFiles.length) * 100, `Processing ${file.name}...`);
        
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        await new Promise((resolve) => {
            img.onload = () => {
                if (pageAdded) pdf.addPage();
                
                const imgWidth = 190;
                const imgHeight = (img.height * imgWidth) / img.width;
                
                pdf.addImage(img, 'JPEG', 10, 10, imgWidth, imgHeight);
                pageAdded = true;
                resolve();
            };
            img.src = URL.createObjectURL(file);
        });
    }
    
    if (pageAdded) {
        const pdfBlob = pdf.output('blob');
        processedResults.push({
            originalName: 'merged_images.pdf',
            newName: 'merged_images.pdf',
            data: pdfBlob,
            type: 'application/pdf'
        });
    }
}

// Additional processing functions for other tools...
async function processInvertImage() {
    for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        updateProgress((i / uploadedFiles.length) * 100, `Processing ${file.name}...`);
        
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        await new Promise((resolve) => {
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = 255 - data[i];     // Red
                    data[i + 1] = 255 - data[i + 1]; // Green
                    data[i + 2] = 255 - data[i + 2]; // Blue
                }
                
                ctx.putImageData(imageData, 0, 0);
                
                canvas.toBlob(blob => {
                    processedResults.push({
                        originalName: file.name,
                        newName: `inverted_${file.name}`,
                        data: blob,
                        type: file.type
                    });
                    resolve();
                });
            };
            img.src = URL.createObjectURL(file);
        });
    }
}

async function processImageOCR() {
    for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        updateProgress((i / uploadedFiles.length) * 100, `Processing ${file.name} with OCR...`);
        
        try {
            const result = await Tesseract.recognize(file, 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        updateProgress(((i + m.progress) / uploadedFiles.length) * 100, `OCR processing ${file.name}... ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
            
            processedResults.push({
                originalName: file.name,
                newName: file.name.replace(/\.[^/.]+$/, '.txt'),
                data: result.data.text,
                type: 'text/plain'
            });
        } catch (error) {
            console.error('OCR error:', error);
            processedResults.push({
                originalName: file.name,
                newName: file.name.replace(/\.[^/.]+$/, '_error.txt'),
                data: `OCR processing failed: ${error.message}`,
                type: 'text/plain'
            });
        }
    }
}

// QR Code functions
function generateQRCode() {
    const text = document.getElementById('qrText').value.trim();
    const size = parseInt(document.getElementById('qrSize').value);
    const canvas = document.getElementById('qrCanvas');
    const display = document.getElementById('qrDisplay');
    
    if (!text) {
        showError('Please enter text or URL to encode');
        return;
    }
    
    QRCode.toCanvas(canvas, text, {
        width: size,
        height: size,
        margin: 2
    }, function (error) {
        if (error) {
            showError('QR code generation failed: ' + error.message);
        } else {
            display.style.display = 'block';
        }
    });
}

function downloadQRCode() {
    const canvas = document.getElementById('qrCanvas');
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = canvas.toDataURL();
    link.click();
}

function setupQRScanner() {
    const startBtn = document.getElementById('startScan');
    const stopBtn = document.getElementById('stopScan');
    const results = document.getElementById('scanResults');
    const output = document.getElementById('scanOutput');
    
    let html5QrCode = null;
    
    startBtn.addEventListener('click', async function() {
        try {
            html5QrCode = new Html5Qrcode("qr-reader");
            
            await html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText, decodedResult) => {
                    output.textContent = decodedText;
                    results.style.display = 'block';
                },
                (errorMessage) => {
                    // Handle scan errors silently
                }
            );
            
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
        } catch (error) {
            showError('Camera access failed: ' + error.message);
        }
    });
    
    stopBtn.addEventListener('click', function() {
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                startBtn.style.display = 'inline-block';
                stopBtn.style.display = 'none';
            });
        }
    });
}

// Text to Image function
function generateTextImage() {
    const text = document.getElementById('imageText').value.trim();
    const fontSize = parseInt(document.getElementById('fontSize').value);
    const bgColor = document.getElementById('bgColor').value;
    const textColor = document.getElementById('textColor').value;
    const canvas = document.getElementById('textCanvas');
    const ctx = canvas.getContext('2d');
    const results = document.getElementById('imageResults');
    
    if (!text) {
        showError('Please enter text to convert to image');
        return;
    }
    
    ctx.font = `${fontSize}px Arial`;
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.2;
    const padding = 20;
    
    let maxWidth = 0;
    lines.forEach(line => {
        const width = ctx.measureText(line).width;
        if (width > maxWidth) maxWidth = width;
    });
    
    canvas.width = maxWidth + (padding * 2);
    canvas.height = (lines.length * lineHeight) + (padding * 2);
    
    // Set styles again after canvas resize
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'top';
    
    lines.forEach((line, index) => {
        ctx.fillText(line, padding, padding + (index * lineHeight));
    });
    
    results.style.display = 'block';
}

function downloadTextImage() {
    const canvas = document.getElementById('textCanvas');
    const link = document.createElement('a');
    link.download = 'text-image.png';
    link.href = canvas.toDataURL();
    link.click();
}

// CSV functions
function createCSVTable() {
    const rows = parseInt(document.getElementById('csvRows').value);
    const cols = parseInt(document.getElementById('csvCols').value);
    const container = document.getElementById('csvTableContainer');
    const table = document.getElementById('csvTable');
    
    let tableHTML = '<table style="width: 100%; border-collapse: collapse;">';
    
    for (let r = 0; r < rows; r++) {
        tableHTML += '<tr>';
        for (let c = 0; c < cols; c++) {
            tableHTML += `<td style="border: 1px solid #ccc; padding: 8px;">
                <input type="text" style="width: 100%; border: none; padding: 4px;" 
                       placeholder="Cell ${r + 1},${c + 1}" id="cell_${r}_${c}">
            </td>`;
        }
        tableHTML += '</tr>';
    }
    tableHTML += '</table>';
    
    table.innerHTML = tableHTML;
    container.style.display = 'block';
}

function downloadCSV() {
    const rows = parseInt(document.getElementById('csvRows').value);
    const cols = parseInt(document.getElementById('csvCols').value);
    let csvContent = '';
    
    for (let r = 0; r < rows; r++) {
        let rowData = [];
        for (let c = 0; c < cols; c++) {
            const cell = document.getElementById(`cell_${r}_${c}`);
            let value = cell ? cell.value : '';
            // Escape quotes and wrap in quotes if contains comma
            if (value.includes(',') || value.includes('"')) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }
            rowData.push(value);
        }
        csvContent += rowData.join(',') + '\n';
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = 'data.csv';
    link.href = URL.createObjectURL(blob);
    link.click();
}

// Utility functions
function showResults() {
    if (processedResults.length === 0) {
        showError('No results to display');
        return;
    }
    
    const modalBody = document.getElementById('modalBody');
    
    let resultsHTML = '<div class="results-area"><h4>Processing Complete!</h4>';
    
    processedResults.forEach((result, index) => {
        resultsHTML += `
            <div class="result-item">
                <div class="result-info">
                    <h5>${result.newName}</h5>
                    <p>Converted from: ${result.originalName}</p>
                </div>
                <button class="btn btn--primary btn--sm" onclick="downloadResult(${index})">Download</button>
            </div>
        `;
    });
    
    resultsHTML += '</div>';
    modalBody.innerHTML = resultsHTML;
}

function downloadResult(index) {
    const result = processedResults[index];
    const blob = result.data instanceof Blob ? result.data : new Blob([result.data], { type: result.type });
    
    const link = document.createElement('a');
    link.download = result.newName;
    link.href = URL.createObjectURL(blob);
    link.click();
}

function showError(message) {
    const modalBody = document.getElementById('modalBody');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'status-message error';
    errorDiv.innerHTML = `❌ ${message}`;
    modalBody.insertBefore(errorDiv, modalBody.firstChild);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

// Additional simplified implementations for remaining tools
async function processMergePDF() {
    if (uploadedFiles.length < 2) {
        throw new Error('Please select at least 2 PDF files to merge');
    }
    
    const mergedPdf = await PDFLib.PDFDocument.create();
    
    for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        updateProgress((i / uploadedFiles.length) * 100, `Merging ${file.name}...`);
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        
        pages.forEach((page) => mergedPdf.addPage(page));
    }
    
    const pdfBytes = await mergedPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    processedResults.push({
        originalName: 'Multiple PDFs',
        newName: 'merged_document.pdf',
        data: blob,
        type: 'application/pdf'
    });
}

async function processPDFToExcel() {
    // Simplified implementation - extract text as CSV
    await processPDFToText();
    
    // Convert the text results to CSV format
    processedResults.forEach(result => {
        if (typeof result.data === 'string') {
            // Simple text to CSV conversion - split by lines and tabs/spaces
            const lines = result.data.split('\n').filter(line => line.trim());
            let csvData = '';
            
            lines.forEach(line => {
                // Split by multiple spaces or tabs and join with commas
                const cols = line.split(/\s{2,}|\t/).map(col => col.trim()).filter(col => col);
                if (cols.length > 1) {
                    csvData += cols.join(',') + '\n';
                }
            });
            
            result.data = csvData || result.data;
            result.newName = result.originalName.replace('.pdf', '.csv');
            result.type = 'text/csv';
        }
    });
}

async function processImageToPDF() {
    await processJPGToPDF(); // Reuse the same logic
}

async function processTextToWord() {
    // Create a simple HTML document that can be saved as .doc
    for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const text = await file.text();
        
        const htmlContent = `
            <html>
            <head><title>${file.name}</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <pre style="white-space: pre-wrap; word-wrap: break-word;">${text}</pre>
            </body>
            </html>
        `;
        
        const blob = new Blob([htmlContent], { type: 'application/msword' });
        processedResults.push({
            originalName: file.name,
            newName: file.name.replace('.txt', '.doc'),
            data: blob,
            type: 'application/msword'
        });
    }
}

async function processFileInfo() {
    uploadedFiles.forEach(file => {
        const info = `File Information:
Name: ${file.name}
Size: ${formatFileSize(file.size)}
Type: ${file.type || 'Unknown'}
Last Modified: ${new Date(file.lastModified).toLocaleString()}
        `;
        
        processedResults.push({
            originalName: file.name,
            newName: `${file.name}_info.txt`,
            data: info,
            type: 'text/plain'
        });
    });
}

async function processBatchConverter() {
    // Simple batch processing - convert all images to PDF
    const imageFiles = uploadedFiles.filter(file => file.type.startsWith('image/'));
    const textFiles = uploadedFiles.filter(file => file.type.startsWith('text/'));
    
    if (imageFiles.length > 0) {
        uploadedFiles = imageFiles;
        await processJPGToPDF();
    }
    
    if (textFiles.length > 0) {
        uploadedFiles = textFiles;
        await processTextToPDF();
    }
}