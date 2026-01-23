
// Utility to interact with NLM RxNorm API
// Documentation: https://rxnav.nlm.nih.gov/REST/

const BASE_URL = 'https://rxnav.nlm.nih.gov/REST';
const apiCache = new Map();

/**
 * Finds the generic name (Active Ingredient) for a given drug name (Brand or otherwise).
 * @param {string} drugName - The name to search (e.g. "Advil")
 * @returns {Promise<string|null>} - The generic name (e.g. "Ibuprofen") or null if not found.
 */
export const findGenericName = async (drugName) => {
    const details = await getDrugDetails(drugName);
    return details ? details.genericName : null;
};

/**
 * Gets detailed drug info including RxCUI and generic name.
 * @param {string} drugName 
 * @returns {Promise<{rxcui: string, name: string, genericName: string}|null>}
 */
export const getDrugDetails = async (drugName) => {
    if (!drugName || drugName.length < 3) return null;

    // Check Cache
    if (apiCache.has(`details_${drugName}`)) {
        return apiCache.get(`details_${drugName}`);
    }

    try {
        // 1. Get RxCUI (Concept Unique Identifier)
        const searchUrl = `${BASE_URL}/rxcui.json?name=${encodeURIComponent(drugName)}`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        // Check if we got any IDs
        const rxcui = searchData?.idGroup?.rxnormId?.[0];
        if (!rxcui) return null;

        // 2. Get Related Information (Ingredients)
        // tty=IN filters for "Ingredient" term type
        const relatedUrl = `${BASE_URL}/rxcui/${rxcui}/related.json?tty=IN`;
        const relatedRes = await fetch(relatedUrl);
        const relatedData = await relatedRes.json();

        // Parse the ingredient name
        let genericName = null;
        const conceptGroup = relatedData?.relatedGroup?.conceptGroup;

        if (conceptGroup) {
            const ingredientGroup = conceptGroup.find(g => g.tty === 'IN');
            genericName = ingredientGroup?.conceptProperties?.[0]?.name;
        }

        const result = {
            rxcui,
            name: drugName,
            genericName: genericName || drugName
        };

        apiCache.set(`details_${drugName}`, result);
        return result;

    } catch (error) {
        console.warn("Failed to lookup drug details:", error);
        return null;
    }
};

/**
 * Generates a MedlinePlus Connect URL for a given RxCUI.
 * @param {string} rxcui 
 * @returns {string}
 */
export const getMedlinePlusLink = (rxcui) => {
    if (!rxcui) return null;
    return `https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=${rxcui}`;
};

/**
 * Generates a fallback Drugs.com URL.
 * @param {string} drugName 
 * @returns {string}
 */
export const getDrugsComLink = (drugName) => {
    if (!drugName) return 'https://www.drugs.com';
    return `https://www.drugs.com/search.php?searchterm=${encodeURIComponent(drugName)}`;
};

/**
 * Smart Link Resolver: Tries MedlinePlus via RxCUI, falls back to Drugs.com
 * @param {string} drugName 
 * @returns {Promise<{url: string, source: 'MedlinePlus' | 'Drugs.com'}>}
 */
export const getSmartLink = async (drugName) => {
    if (!drugName) return { url: 'https://medlineplus.gov', source: 'MedlinePlus' };

    const cacheKey = `smartlink_${drugName}`;
    if (apiCache.has(cacheKey)) return apiCache.get(cacheKey);

    try {
        const details = await getDrugDetails(drugName);
        if (details && details.rxcui) {
            const result = {
                url: getMedlinePlusLink(details.rxcui),
                source: 'MedlinePlus'
            };
            apiCache.set(cacheKey, result);
            return result;
        }
    } catch (e) {
        console.warn("Smart Link generation failed, falling back", e);
    }

    // Fallback
    const result = {
        url: getDrugsComLink(drugName),
        source: 'Drugs.com'
    };
    apiCache.set(cacheKey, result);
    return result;
};
