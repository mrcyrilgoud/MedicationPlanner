import { openDB } from 'idb';

const DB_NAME = 'med_planner_db';
const DB_VERSION = 1;
const STORE_IMAGES = 'images';

export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_IMAGES)) {
                db.createObjectStore(STORE_IMAGES);
            }
        },
    });
};

export const saveImage = async (id, file) => {
    const db = await initDB();
    // Convert file to Blob if it isn't already, or just store the file object (which is a Blob)
    // We might want to compress it? For now, just store as is.
    return db.put(STORE_IMAGES, file, id);
};

export const getImage = async (id) => {
    const db = await initDB();
    return db.get(STORE_IMAGES, id);
};

export const deleteImage = async (id) => {
    const db = await initDB();
    return db.delete(STORE_IMAGES, id);
};
