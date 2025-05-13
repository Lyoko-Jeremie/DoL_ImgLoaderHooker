(async () => {

    (function () {

        // document.createElement('img');

        const OriginalCreateElement = document.createElement;
        // @ts-ignore
        window.OriginalCreateElement = OriginalCreateElement.bind(document);
        // @ts-ignore
        document.OriginalCreateElement = OriginalCreateElement.bind(document);

        type OriginalCreateElementType = typeof OriginalCreateElement;

        if (window.modImgLoaderHooker?.OriginalCreateElement) {
            window.modImgLoaderHooker.OriginalCreateElement = OriginalCreateElement;
        }

        function createImageElementProxy(imgElement: HTMLImageElement) {
            return new Proxy(imgElement, {
                set(target: HTMLImageElement, p: string | symbol, newValue: any, receiver: any): boolean {
                    if (p !== 'src') {
                        return Reflect.set(target, p, newValue);
                    }
                    const imgObj = new Image();
                    // will proxy by inject_early_NewImage.ts
                    imgObj.src = newValue;

                    target.setAttribute('ml-src', newValue);
                    target.setAttribute('ml-lazy-src', newValue);
                    imgObj.onload = () => {
                        target.width = imgObj.width;
                        target.height = imgObj.height;
                        target.setAttribute('src', newValue);
                    };
                    return true;
                }
            });
        }

        function NewCreateElement<K extends keyof HTMLElementTagNameMap>(tagName: K, options?: ElementCreationOptions): HTMLElementTagNameMap[K] {
            if (tagName.toLowerCase() !== 'img') {
                return OriginalCreateElement.bind(document)(tagName, options);
            }
            const imgElement = OriginalCreateElement.bind(document)('img', options);
            return createImageElementProxy(imgElement) as HTMLElementTagNameMap[K];
        }

        document.createElement = NewCreateElement;

    })();


})();
