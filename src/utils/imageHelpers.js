export const MAX_MEDICATION_IMAGES = 5;

export const resizeImage = (file, maxWidth = 600, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const getInhalerUsageDisplay = (medication) => {
    const usageRate = Number(medication?.usageRate);
    if (!usageRate || medication?.defaultUnit !== 'inhaler') {
        return {
            usageRate: medication?.usageRate || '',
            usageBasis: 'base'
        };
    }

    const puffsPerCanister = Number(medication.puffsPerCanister) || 200;
    if (usageRate >= puffsPerCanister && usageRate % puffsPerCanister === 0) {
        return {
            usageRate: usageRate / puffsPerCanister,
            usageBasis: 'container'
        };
    }

    return {
        usageRate,
        usageBasis: 'base'
    };
};
