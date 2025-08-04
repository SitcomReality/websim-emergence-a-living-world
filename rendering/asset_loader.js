export async function loadAssets(imageList) {
    const images = {};
    const promises = imageList.map(src => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = `/${src}`;
            img.onload = () => {
                images[src] = img;
                resolve();
            };
            img.onerror = reject;
        });
    });
    
    await Promise.all(promises);
    return images;
}

