
// Utility to interact with NLM RxNorm API
// Documentation: https://rxnav.nlm.nih.gov/REST/

const BASE_URL = 'https://rxnav.nlm.nih.gov/REST';

/**
 * Finds the generic name (Active Ingredient) for a given drug name (Brand or otherwise).
 * @param {string} drugName - The name to search (e.g. "Advil")
 * @returns {Promise<string|null>} - The generic name (e.g. "Ibuprofen") or null if not found.
 */
export const findGenericName = async (drugName) => {
    if (!drugName || drugName.length < 3) return null;

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
        const conceptGroup = relatedData?.relatedGroup?.conceptGroup;
        if (!conceptGroup) return null;

        // Look for the group with TTY="IN"
        const ingredientGroup = conceptGroup.find(g => g.tty === 'IN');
        const ingredientName = ingredientGroup?.conceptProperties?.[0]?.name;

        if (ingredientName) {
            // Cleanup name if needed (sometimes keeps case, sometimes lower)
            // RxNorm usually returns capitalized, e.g. "Ibuprofen"
            return ingredientName;
        }

        return null;

    } catch (error) {
        console.warn("Failed to lookup drug generic name:", error);
        return null;
    }
};
