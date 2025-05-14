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
            const r = new Proxy<HTMLImageElement>(imgElement, {
                set(target: HTMLImageElement, p: string | symbol, value: any, receiver: any): boolean {
                    if (p !== 'src') {
                        return Reflect.set(target, p, value);
                        // (target as any)[p] = value;
                        // return true;
                        // return Reflect.set(target, p, value);
                    }

                    Reflect.apply(Reflect.get(target, 'setAttribute'), target, ['ml-src', value]);
                    Reflect.apply(Reflect.get(target, 'setAttribute'), target, ['ml-lazy-src', value]);
                    window.modUtils.pSC2DataManager.getHtmlTagSrcHook().requestImageBySrc(value).then(imgString => {
                        Reflect.apply(Reflect.get(target, 'setAttribute'), target, ['src', value]);
                    });

                    // const imgObj = new Image();
                    // will proxy by inject_early_NewImage.ts
                    // imgObj.src = newValue;
                    // receiver.setAttribute('ml-src', newValue);
                    // receiver.setAttribute('ml-lazy-src', newValue);
                    // imgObj.onload = () => {
                    //     receiver.width = imgObj.width;
                    //     receiver.height = imgObj.height;
                    //     // receiver.setAttribute('src', newValue);
                    //     Reflect.apply(Reflect.get(receiver, 'setAttribute'), receiver, ['src', imgObj.]);
                    // };
                    return true;
                },
                get(target: HTMLImageElement, p: string | symbol, receiver: any): any {
                    console.log('get', [target, p, receiver]);
                    const rr = Reflect.get(target, p, target);
                    if (typeof rr === 'function') {
                        rr.bind(target);
                    }
                    console.log('get rr', typeof rr);
                    console.log('get target', typeof target);
                    console.log('get imgElement', typeof imgElement);
                    console.log('get rr', rr);
                    return rr;
                },
                has(target: HTMLImageElement, p: string | symbol): boolean {
                    console.log('has', [target, p]);
                    return Reflect.has(target, p);
                },
                deleteProperty(target: HTMLImageElement, p: string | symbol): boolean {
                    console.log('deleteProperty', [target, p]);
                    return Reflect.deleteProperty(target, p);
                },
                ownKeys(target: HTMLImageElement): Array<string | symbol> {
                    console.log('ownKeys', [target]);
                    return Reflect.ownKeys(target);
                },
                getOwnPropertyDescriptor(target: HTMLImageElement, p: string | symbol): PropertyDescriptor | undefined {
                    console.log('getOwnPropertyDescriptor', [target, p]);
                    return Reflect.getOwnPropertyDescriptor(target, p);
                },
                setPrototypeOf(target: HTMLImageElement, v: any): boolean {
                    console.log('setPrototypeOf', [target, v]);
                    return Reflect.setPrototypeOf(target, v);
                },
                getPrototypeOf(target: HTMLImageElement): any {
                    console.log('getPrototypeOf', [target]);
                    return Reflect.getPrototypeOf(target);
                },
                isExtensible(target: HTMLImageElement): boolean {
                    console.log('isExtensible', [target]);
                    return Reflect.isExtensible(target);
                },
                preventExtensions(target: HTMLImageElement): boolean {
                    console.log('preventExtensions', [target]);
                    return Reflect.preventExtensions(target);
                },
                defineProperty(target: HTMLImageElement, p: string | symbol, attributes: PropertyDescriptor): boolean {
                    console.log('defineProperty', [target, p, attributes]);
                    return Reflect.defineProperty(target, p, attributes);
                },
                // apply(target: HTMLImageElement, thisArg: any, argArray?: any): any {
                //     return Reflect.apply(target, thisArg, argArray);
                // },
                // construct(target: HTMLImageElement, argArray: any, newTarget: any): any {
                //     return Reflect.construct(target, argArray, newTarget);
                // },
            });
            return Object.setPrototypeOf(r, Element.prototype);
            // return r;
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
