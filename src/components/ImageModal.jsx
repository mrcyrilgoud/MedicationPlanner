import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './DataManagement.css'; // Reusing modal styles if possible, else we add to App.css or new file. 
// Actually, ConfirmationModal has styles in App.css likely, let's check. 
// Wait, I saw modal-overlay in ConfirmationModal.jsx using standard classes. 
// I will assume global modal styles or add them inline for simplicity/consistency if they are generic.

const ImageModal = ({ isOpen, onClose, imageUrl }) => {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen || !imageUrl) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 2000
        }}>
            <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: -40,
                        right: 0,
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer'
                    }}
                >
                    <X size={24} />
                </button>
                <img
                    src={imageUrl}
                    alt="Full size"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '90vh',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                    }}
                />
            </div>
        </div>
    );
};

export default ImageModal;
