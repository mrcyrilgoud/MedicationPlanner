
import Tesseract from 'tesseract.js';
import { COMMON_DRUG_ALIASES } from './drugAliases';

/**
 * Scans a receipt image file and extracts text.
 * @param {File} imageFile 
 * @param {Function} onProgress - callback for progress updates (0-1)
 * @returns {Promise<string>} - The extracted raw text
 */
import * as pdfjs from 'pdfjs-dist';
// Vite-specific worker import
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Scans a receipt image file (or PDF) and extracts text.
 * @param {File} file 
 * @param {Function} onProgress - callback for progress updates (0-1)
 * @returns {Promise<string>} - The extracted raw text
 */
export const scanReceipt = async (file, onProgress) => {
    try {
        let imageToScan = file;

        // NEW: Handle PDF
        if (file.type === 'application/pdf') {
            onProgress && onProgress(0.1); // Starting PDF conversion
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjs.getDocument(arrayBuffer).promise;
                const page = await pdf.getPage(1); // Only scan first page for now

                const viewport = page.getViewport({ scale: 2.0 }); // Scale up for better OCR
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;

                // Convert to blob
                imageToScan = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                onProgress && onProgress(0.2); // PDF converted
            } catch (pdfError) {
                console.error("PDF Conversion Error:", pdfError);
                throw new Error("Failed to process PDF file.");
            }
        }

        const worker = await Tesseract.createWorker({
            logger: m => {
                if (!onProgress) return;

                // Heuristic progress mapping
                // PDF processing takes 0-20% (already handled above if PDF)
                // Init/Loading takes ~20%
                // Recognition takes ~60%

                let p = 0;
                if (m.status === 'loading tesseract core') {
                    p = 0.2 + (m.progress * 0.1); // 20-30%
                } else if (m.status === 'loading language traineddata') {
                    p = 0.3 + (m.progress * 0.1); // 30-40%
                } else if (m.status === 'initializing api') {
                    p = 0.4 + (m.progress * 0.1); // 40-50%
                } else if (m.status === 'recognizing text') {
                    p = 0.5 + (m.progress * 0.5); // 50-100%
                } else {
                    // Other statuses
                    p = 0.5;
                }

                // If it was an image (not PDF), we shift everything to start from 0?
                // Actually, simplify: just ensure we don't regress if we are already at 0.2
                // Since this heuristic assumes 0.2 start for PDF, it might be weird for Images starting instantly at 0.2.
                // But generally fine. A slight jump is better than stuck.

                // Let's just trust that the user cares about movement.
                onProgress(Math.min(p, 1));
            }
        });

        await worker.loadLanguage('eng');
        await worker.initialize('eng');

        const { data: { text } } = await worker.recognize(imageToScan);

        await worker.terminate();
        return text;
    } catch (error) {
        console.error("OCR Error:", error);
        throw new Error("Failed to scan receipt.");
    }
};

/**
 * Parses raw receipt text to find potential medications.
 * @param {string} text 
 * @returns {Array} - List of potential matches { name, quantity, confidence }
 */
export const parseReceiptText = (text) => {
    if (!text) return [];

    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const foundItems = [];

    // Helper to normalize text for matching


    // Flatten our known drugs list for searching
    // We want to match Brand names (e.g. Advil) or Generics (Ibuprofen)
    const knownDrugs = [];
    Object.entries(COMMON_DRUG_ALIASES).forEach(([generic, brands]) => {
        knownDrugs.push({ name: generic, type: 'generic', link: generic });
        brands.forEach(brand => {
            knownDrugs.push({ name: brand, type: 'brand', link: generic });
        });
    });

    lines.forEach(line => {
        // simple keyword matching
        knownDrugs.forEach(drug => {
            // Check if line contains the drug name as a distinct word
            const regex = new RegExp(`\\b${drug.name}\\b`, 'i');
            if (regex.test(line)) {
                // We found a drug!
                // Try to find a quantity/price on the same line
                // Receipts often have "QTY 2" or just "2   9.99"

                // Very basic number extraction: look for digits
                // This is heuristic and prone to error (could be price)
                // Let's look for "x2" or "2 @" or just small integers

                let quantity = 1; // Default

                // If line has "x[number]"
                const qtyMatch = line.match(/\s[xX]\s?(\d+)/);
                if (qtyMatch) {
                    quantity = parseInt(qtyMatch[1], 10);
                }

                foundItems.push({
                    originalLine: line,
                    matchedName: drug.name, // The text found (e.g. "Advil")
                    genericName: drug.link, // The canonical name (e.g. "ibuprofen")
                    quantity,
                    confidence: 0.8 // Arbitrary high because of exact string match
                });
            }
        });
    });

    // Remove duplicates if same line matched multiple times (rare but possible with overlapping names)
    // or if we want to dedupe by name. For now, let's keep all distinct lines.
    return foundItems;
};
