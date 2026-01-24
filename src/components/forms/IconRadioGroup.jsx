import React from 'react';
import '../DataManagement.css'; // Correct path to CSS

const IconRadioGroup = ({ label, options, value, onChange }) => {
    return (
        <div>
            <label className="form-label icon-radio-label">{label}</label>
            <div className="glass-panel icon-radio-group">
                {options.map((option) => (
                    <button
                        key={option.value}
                        className={`mode-btn ${value === option.value ? 'active' : ''}`}
                        onClick={() => onChange(option.value)}
                        title={option.label}
                    >
                        {option.icon}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default IconRadioGroup;
