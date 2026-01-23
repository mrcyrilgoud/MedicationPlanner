import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', type = 'danger' }) => {
    const dialogRef = useRef(null);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Lock body scroll
            document.body.style.overflow = 'hidden';

            // Focus safety: Focus the 'Cancel' button by default to prevent accidental deletion
            // We need a timeout to wait for render if not using a ref to the button directly, 
            // but finding the first button in the modal is a common pattern.
            setTimeout(() => {
                const cancelButton = dialogRef.current?.querySelector('.btn.secondary');
                if (cancelButton) cancelButton.focus();
            }, 50);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const isDanger = type === 'danger';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-container"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                ref={dialogRef}
                tabIndex="-1"
            >
                <div className="modal-header">
                    <h3 className="modal-title">
                        {isDanger && <AlertTriangle className="text-danger" size={20} style={{ marginRight: 8 }} />}
                        {title}
                    </h3>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {typeof message === 'string' ? <p>{message}</p> : message}
                </div>

                <div className="modal-footer">
                    <button className="btn secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className={`btn ${isDanger ? 'danger' : 'primary'}`}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
