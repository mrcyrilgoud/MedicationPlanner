export const summarizeMedicationName = (value = '') => value.trim().toLowerCase();

export const classifyBackupMedication = (medication, { currentNameMap, currentIdMap, mode }) => {
    const normalizedName = summarizeMedicationName(medication.name);
    const existingById = currentIdMap.get(medication.id);
    const duplicateByName = normalizedName
        && currentNameMap.has(normalizedName)
        && currentNameMap.get(normalizedName).id !== medication.id;
    const idCollision = mode === 'merge'
        && existingById
        && summarizeMedicationName(existingById.name) !== normalizedName;

    if (idCollision) {
        return { action: 'skip', reason: 'id-collision' };
    }

    if (mode === 'merge' && duplicateByName) {
        return { action: 'skip', reason: 'duplicate-name' };
    }

    return { action: 'import' };
};

export const filterBackupMedications = (medications, { currentMedications, mode }) => {
    const currentNameMap = new Map();
    const currentIdMap = new Map();

    currentMedications.forEach((medication) => {
        currentNameMap.set(summarizeMedicationName(medication.name), medication);
        currentIdMap.set(medication.id, medication);
    });

    const keptMedicationIds = new Set();
    const skippedMedications = [];
    const medicationsToImport = [];

    medications.forEach((medication) => {
        const decision = classifyBackupMedication(medication, { currentNameMap, currentIdMap, mode });

        if (decision.action === 'skip') {
            skippedMedications.push({
                id: medication.id,
                name: medication.name,
                reason: decision.reason
            });
            return;
        }

        medicationsToImport.push(medication);
        keptMedicationIds.add(medication.id);
    });

    return {
        medicationsToImport,
        skippedMedications,
        keptMedicationIds,
        idCollisions: skippedMedications.filter((item) => item.reason === 'id-collision'),
        duplicateNameSkips: skippedMedications.filter((item) => item.reason === 'duplicate-name')
    };
};
