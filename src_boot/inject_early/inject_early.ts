(async () => {

    (function () {

        // 保存原始的 Image 构造函数类型
        type ImageConstructor = {
            new(width?: number, height?: number): HTMLImageElement;
            prototype: HTMLImageElement;
        };

        const OriginalImage = window.Image as ImageConstructor;
        // @ts-ignore
        window.OriginalImageConstructor = OriginalImage;

        class NewImage extends OriginalImage {
            _originalImageObject?: HTMLImageElement;

            constructor(width?: number, height?: number) {
                super(width, height);
            }

            get src(): string {
                return super.src || '';
            }

            set src(value: string) {
                const thisPtr = this;
                if (value.startsWith('data:')) {
                    // skip replace
                    thisPtr.setAttribute('src', value);
                    return;
                }
                this._originalImageObject = new OriginalImage();
                window.modUtils.pSC2DataManager.getHtmlTagSrcHook().requestImageBySrc(value).then(imgString => {
                    if (imgString) {
                        // 创建一个新的 Image 对象来处理缓存中的 Base64 数据
                        const cachedImage = this._originalImageObject!!;

                        // 转发图片的 onload 事件
                        cachedImage.onload = () => {
                            // 将缓存的图片数据赋值给原始 img 对象
                            thisPtr.width = cachedImage.width;
                            thisPtr.height = cachedImage.height;
                            thisPtr.src = imgString;

                            // // 手动触发原始 img 对象的 onload 事件
                            // if (typeof img.onload === 'function') {
                            //     img.onload(new Event('load'));
                            // }
                        };

                        // 转发图片的 onerror 事件
                        cachedImage.onerror = () => {
                            // 手动触发原始 img 对象的 onerror 事件
                            if (typeof thisPtr.onerror === 'function') {
                                thisPtr.onerror(new Event('error'));
                            }
                        };

                        cachedImage.src = imgString;
                    } else {
                        // thisPtr.setAttribute('src', value);
                        super.src = value;
                    }
                }).catch((e) => {
                    console.error('[GameOriginalImagePack] window.Image catch error', [value, e]);
                    if (typeof thisPtr.onerror === 'function') {
                        thisPtr.onerror(new Event('error'));
                    }
                });
            }
        }

        const test = new NewImage();
        console.log('test', test);

        window.Image = NewImage;
    })();


})();
