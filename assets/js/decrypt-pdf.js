(() => {

async function derive_key_and_iv(password, salt, iterations = 10000, keyLength = 256) {
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);

    // Create a key material from the password using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        passwordBytes,
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    // Calculate total length needed for both key and IV
    const totalLength = keyLength / 8 + 16; // keyLength in bytes, plus 16 bytes for IV

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            hash: "SHA-256",
            salt, iterations,
        },
        keyMaterial,
        totalLength * 8
    );

    const derivedBytes = new Uint8Array(derivedBits);
    return {
        key: await crypto.subtle.importKey(
            "raw",
            derivedBytes.slice(0, keyLength / 8),
            "AES-CBC",
            false,
            ["decrypt"]
        ),
        iv: derivedBytes.slice(keyLength / 8)
    };
}

async function decrypt_b64(base64Data, password) {
    const encryptedData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Extract prefix and verify
    const expectedPrefix = "Salted__";
    const prefix = new TextDecoder().decode(encryptedData.slice(0, 8));
    if (prefix !== expectedPrefix) {
        throw new Error("Expected a 'Salted__' prefix, but it's missing.");
    }

    // Extract salt and the encrypted content
    const salt = encryptedData.slice(8, 16);
    const ciphertext = encryptedData.slice(16);

    // Derive key and IV
    const { key, iv } = await derive_key_and_iv(password, salt);

    // Decrypt the ciphertext
    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-CBC",
            iv: iv
        },
        key,
        ciphertext
    );

    return new Uint8Array(decrypted);
}

// Get cached assets
CACHE = JSON.parse(localStorage.getItem('CACHE') || '{}');
async function open_asset(byteArray, href, options) {
    const blob = new Blob([byteArray], options);
    const blobUrl = URL.createObjectURL(blob);
    console.log('Created new blob for', href, '\n', blobUrl);
    window.open(blobUrl, '_blank');
    
    // Update Cache
    CACHE[href] = blobUrl;
    localStorage.setItem('CACHE', JSON.stringify(CACHE));
}

function match_asset_type(doc, href) {
    const mimes = [
        { ext: 'csv', type: 'text/plain;charset=utf-8' },
        { ext: 'html', type: 'text/html;charset=utf-8' },
        { ext: 'txt', type: 'text/plain;charset=utf-8' },
        { ext: 'pdf', type: 'application/pdf' },
    ]

    for (const { ext, type } of mimes) {
        if (href.includes(`.${ext}.`)) {
            open_asset(doc, href, { type }); return;
        }
    }
}

window.apply_decrypt_middleware = function apply_decrypt_middleware(link) {
    if (link.href.endsWith('.enc')) {
        link.addEventListener('click', async () => {
            const href = `${link.href}`;
            link.href = '#';

            if (CACHE[href]) {
                let expired = false;
                try {
                    // Check if resource is still available
                    await fetch(CACHE[href]);
                } catch (e) { expired = true; }
        
                if (!expired) {
                    console.log('Re-using blob for', href, '\n', CACHE[href]);
                    window.open(CACHE[href], '_blank');
                    link.href = href;
                    return;
                }
            } 

            let doc;
            try {
                // Fetch & Decrypt the document
                doc = await (fetch(href)
                    .then(response => response.text())
                    .then(doc_b64 => decrypt_b64(doc_b64, prompt('Enter Password'))));
            } catch (e) {
                alert('Invalid password or corrupted document.');
            }

            try {
                if (doc) match_asset_type(doc, href);
            } catch (e) {
                alert('Failed to open asset');
                console.error(e);
            }

            link.href = href;
        });
    }
}

})();