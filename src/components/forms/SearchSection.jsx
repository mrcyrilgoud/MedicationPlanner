import React from 'react';

const SearchSection = ({
    searchTerm,
    setSearchTerm,
    matchingMed,
    potentialMatch,
    confirmMatch,
    aliasMatch,
    confirmAliasGroup,
    linkedGroup,
    setLinkedGroup
}) => {
    return (
        <div className="form-group">
            <label className="form-label">Medication Name</label>
            <div style={{ position: 'relative' }}>
                <input
                    className="form-input"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Type to search or create..."
                    required
                    autoComplete="off"
                />
                {matchingMed && (
                    <div style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--success)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.8rem'
                    }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--success)', borderRadius: '50%' }}></span>
                        Found
                    </div>
                )}
            </div>

            {/* Typo Warning */}
            {potentialMatch && (
                <div style={{
                    marginTop: 8,
                    padding: 10,
                    background: 'rgba(234, 179, 8, 0.15)',
                    border: '1px solid var(--warning)',
                    borderRadius: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>
                        Did you mean <b>{potentialMatch.name}</b>?
                    </span>
                    <button
                        type="button"
                        className="btn secondary"
                        style={{ margin: 0, padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={confirmMatch}
                    >
                        Yes, use {potentialMatch.name}
                    </button>
                </div>
            )}

            {/* Alias Grouping Suggestion */}
            {aliasMatch && !matchingMed && !linkedGroup && (
                <div style={{
                    marginTop: 8,
                    padding: 10,
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid var(--primary)',
                    borderRadius: 6,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ color: 'var(--primary)', fontSize: '0.9rem', flex: 1 }}>
                            <b>{aliasMatch.med.name}</b> is already in your list (Generic: {aliasMatch.canonical}).
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            type="button"
                            className="btn primary"
                            style={{ margin: 0, padding: '6px 12px', fontSize: '0.85rem', flex: 1 }}
                            onClick={confirmAliasGroup}
                        >
                            Group with {aliasMatch.med.name}
                        </button>
                    </div>
                </div>
            )}

            {/* Linked Badge */}
            {linkedGroup && (
                <div style={{
                    marginTop: 8,
                    padding: '6px 10px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid var(--success)',
                    borderRadius: 6,
                    color: 'var(--success)',
                    fontSize: '0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>Adding as variant of <b>{linkedGroup.name}</b></span>
                    <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem', padding: 0, lineHeight: 1 }}
                        onClick={() => setLinkedGroup(null)}
                        title="Cancel grouping"
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
};

export default SearchSection;
