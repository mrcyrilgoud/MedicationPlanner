import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    type = 'danger'
}) => {
    const dialogRef = useRef(null);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape' && !confirming) onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';

            setTimeout(() => {
                const cancelButton = dialogRef.current?.querySelector('.btn.secondary');
                if (cancelButton) cancelButton.focus();
            }, 50);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [confirming, isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) {
            setConfirming(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isDanger = type === 'danger';

    const handleConfirm = async () => {
        if (confirming) return;
        setConfirming(true);
        try {
            await Promise.resolve(onConfirm?.());
            onClose();
        } catch (error) {
            console.error('Confirmation action failed', error);
        } finally {
            setConfirming(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={confirming ? undefined : onClose}>
            <div
                className="modal-container"
                onClick={(event) => event.stopPropagation()}
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
                    <button className="modal-close-btn" onClick={onClose} disabled={confirming}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {typeof message === 'string' ? <p>{message}</p> : message}
                </div>

                <div className="modal-footer">
                    <button className="btn secondary" onClick={onClose} disabled={confirming}>
                        Cancel
                    </button>
                    <button
                        className={`btn ${isDanger ? 'danger' : 'primary'}`}
                        onClick={handleConfirm}
                        disabled={confirming}
                    >
                        {confirming ? 'Working...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
