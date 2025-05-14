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
            const r = Object.defineProperty(imgElement, 'src', {
                get(): any {
                    return Reflect.get(this, 'src');
                },
                set(value: any) {
                    // console.log('[Image] set src', [value]);
                    Reflect.apply(Reflect.get(this, 'setAttribute'), this, ['ml-src', value]);
                    Reflect.apply(Reflect.get(this, 'setAttribute'), this, ['ml-lazy-src', value]);
                    Reflect.apply(Reflect.get(this, 'setAttribute'), this, ['src', value]);
                    window.modUtils.pSC2DataManager.getHtmlTagSrcHook().requestImageBySrc(value).then(imgString => {
                        // console.log('[Image] set src [src]', value, imgString);
                        Reflect.apply(Reflect.get(this, 'setAttribute'), this, ['src', imgString ?? value]);
                    });
                },
            });
            return r;
        }

        function NewCreateElement<K extends keyof HTMLElementTagNameMap>(tagName: K, options?: ElementCreationOptions): HTMLElementTagNameMap[K] {
            if (tagName?.toLowerCase() !== 'img') {
                return OriginalCreateElement.bind(document)(tagName, options);
            }
            const imgElement = OriginalCreateElement.bind(document)('img', options);
            return createImageElementProxy(imgElement) as HTMLElementTagNameMap[K];
        }

        document.createElement = NewCreateElement;

    })();


})();
