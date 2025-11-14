/**
 * Configurazione AWS S3 per gli asset statici
 * Modifica baseUrl con il tuo URL S3 o CloudFront
 */
const S3_CONFIG = {
    baseUrl: 'https://your-bucket-name.s3.region.amazonaws.com/assets', // MODIFICA QUESTO URL
    // Opzionale: fallback locale per sviluppo
    useLocalFallback: false, // Imposta a true per usare file locali durante lo sviluppo
    localPath: 'assets'
};

/**
 * Genera l'URL completo per un asset su S3
 * @param {string} filename - Nome del file (es. 'white-paper.pdf')
 * @returns {string} URL completo dell'asset
 */
const getAssetUrl = (filename) => {
    if (S3_CONFIG.useLocalFallback) {
        return `${S3_CONFIG.localPath}/${filename}`;
    }
    
    // Avviso se l'URL S3 non è stato configurato
    if (S3_CONFIG.baseUrl.includes('your-bucket-name')) {
        console.warn('⚠️ S3_CONFIG.baseUrl non è stato configurato! Modifica S3_CONFIG.baseUrl con il tuo URL S3.');
        console.warn('⚠️ Usando fallback locale temporaneo. Imposta useLocalFallback: true per sviluppo.');
        return `${S3_CONFIG.localPath}/${filename}`;
    }
    
    // Rimuove eventuali slash iniziali e assicura un solo slash tra baseUrl e filename
    const baseUrl = S3_CONFIG.baseUrl.replace(/\/$/, '');
    const cleanFilename = filename.replace(/^\//, '');
    return `${baseUrl}/${cleanFilename}`;
};

