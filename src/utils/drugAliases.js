export const COMMON_DRUG_ALIASES = {
    // Pain Relievers
    'acetaminophen': ['tylenol', 'panadol', 'paracetamol', 'mapap', 'ofirmev'],
    'ibuprofen': ['advil', 'motrin', 'midol', 'nuprin'],
    'aspirin': ['bayer', 'ecotrin', 'bufferin', 'excedrin'],
    'naproxen': ['aleve', 'anaprox', 'naprosyn'],
    'diclofenac': ['voltaren', 'cambia', 'cataflam'],

    // Allergy
    'fexofenadine': ['allegra'],
    'loratadine': ['claritin', 'alavert'],
    'cetirizine': ['zyrtec'],
    'diphenhydramine': ['benadryl'],
    'levocetirizine': ['xyzal'],
    'fluticasone': ['flonase'],

    // Cold & Flu
    'dextromethorphan': ['robitussin', 'delsym', 'triaminic'],
    'guaifenesin': ['mucinex', 'robitussin chest congestion'],
    'pseudoephedrine': ['sudafed'],
    'phenylephrine': ['sudafed pe'],

    // Digestive
    'calcium carbonate': ['tums', 'rolaids'],
    'famotidine': ['pepcid'],
    'omeprazole': ['prilosec'],
    'esomeprazole': ['nexium'],
    'lansoprazole': ['prevacid'],
    'ranitidine': ['zantac'], // Note: Recalled in some places, but good for completeness
    'loperamide': ['imodium'],
    'bismuth subsalicylate': ['pepto-bismol', 'kaopectate'],
    'simethicone': ['gas-x', 'mylanta'],

    // Sleep
    'melatonin': [], // Often just melatonin
    'doxylamine': ['unisom'],

    // Vitamins (Common names mostly)
    'ascorbic acid': ['vitamin c'],
    'cholecalciferol': ['vitamin d3'],
    'cobalamin': ['vitamin b12'],
};

// Helper to reverse the map for easier lookup: 'tylenol' -> 'acetaminophen'
export const REVERSE_ALIAS_MAP = {};

Object.entries(COMMON_DRUG_ALIASES).forEach(([generic, brands]) => {
    REVERSE_ALIAS_MAP[generic.toLowerCase()] = generic.toLowerCase();
    brands.forEach(brand => {
        REVERSE_ALIAS_MAP[brand.toLowerCase()] = generic.toLowerCase();
    });
});

/**
 * Checks if two drug names are aliases of each other.
 * @param {string} name1 
 * @param {string} name2 
 * @returns {boolean}
 */
export const areAliases = (name1, name2) => {
    if (!name1 || !name2) return false;
    const key1 = REVERSE_ALIAS_MAP[name1.toLowerCase()];
    const key2 = REVERSE_ALIAS_MAP[name2.toLowerCase()];
    return key1 && key2 && key1 === key2;
};

/**
 * Returns the generic/canonical name for a given drug name if matched.
 * @param {string} name 
 * @returns {string|null}
 */
export const getCanonicalName = (name) => {
    return REVERSE_ALIAS_MAP[name.toLowerCase()] || null;
}

/**
 * Finds the best alias match for a search term.
 * @param {string} term 
 * @returns {{canonical: string, match: string}|null}
 */
export const findBestMatch = (term) => {
    if (!term) return null;
    const lower = term.toLowerCase();

    // Exact alias/name match
    if (REVERSE_ALIAS_MAP[lower]) {
        return {
            canonical: REVERSE_ALIAS_MAP[lower],
            match: lower
        };
    }

    // Partial/Fuzzy match could go here
    return null;
};

export const getAllAliases = () => {
    return Object.keys(REVERSE_ALIAS_MAP);
};
