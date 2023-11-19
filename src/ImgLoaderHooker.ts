import type {AddonPluginHookPointEx} from "../../../dist-BeforeSC2/AddonPlugin";
import type {LogWrapper} from "../../../dist-BeforeSC2/ModLoadController";
import type {ModImg, ModInfo} from "../../../dist-BeforeSC2/ModLoader";
import type {ModZipReader} from "../../../dist-BeforeSC2/ModZipReader";
import type {SC2DataManager} from "../../../dist-BeforeSC2/SC2DataManager";
import type {ModUtils} from "../../../dist-BeforeSC2/Utils";
import {isFunction, isString} from 'lodash';

/**
 * @return Promise<boolean>      Promise<true> if handle by this hooker, otherwise Promise<false>.
 *
 * hooker can wait until the image loaded, and then call successCallback(src, layer, img) and return Promise<true>
 */
export interface ImgLoaderSideHooker {
    hookName: string;
    imageLoader: (
        src: string,
        layer: any,
        successCallback: (src: string, layer: any, img: HTMLImageElement) => void,
        errorCallback: (src: string, layer: any, event: any) => void,
    ) => Promise<boolean>;
    imageGetter: (src: string) => Promise<string | undefined>;
}

export class ImgLoaderHooker implements AddonPluginHookPointEx {
    private log: LogWrapper;

    constructor(
        public thisWindow: Window,
        public gSC2DataManager: SC2DataManager,
        public gModUtils: ModUtils,
    ) {
        this.log = this.gModUtils.getLogger();
        this.gModUtils.getAddonPluginManager().registerAddonPlugin(
            'ModLoader DoL ImageLoaderHook',
            'ImageLoaderAddon',
            this,
        );
        this.gSC2DataManager.getHtmlTagSrcHook().addHook('ImgLoaderHooker',
            async (el: HTMLImageElement | HTMLElement, mlSrc: string, field: string) => {
                // console.log('[ImageLoaderHook] getHtmlTagSrcHook addHook', [mlSrc, field, el]);
                const img = await this.getImage(mlSrc);
                if (img) {
                    el.setAttribute(field, img);
                    return true;
                }
                // console.log('[ImageLoaderHook] getHtmlTagSrcHook addHook cannot find', [mlSrc, field, el]);
                return false;
            }
        );
        this.gSC2DataManager.getHtmlTagSrcHook().addReturnModeHook('ImgLoaderReturnModeHooker',
            async (mlSrc: string) => {
                // console.log('[ImageLoaderHook] getHtmlTagSrcHook addReturnModeHook', [mlSrc]);
                const img = await this.getImage(mlSrc);
                if (!img) {
                    // console.log('[ImageLoaderHook] getHtmlTagSrcHook addReturnModeHook cannot find', [mlSrc]);
                }
                // console.log('[ImageLoaderHook] getHtmlTagSrcHook addReturnModeHook get img', [img]);
                return [!!img, img || mlSrc];
            },
        );
    }

    async registerMod(addonName: string, mod: ModInfo, modZip: ModZipReader) {
        if (!mod) {
            console.error('registerMod() (!mod)', [addonName, mod]);
            this.log.error(`registerMod() (!mod): addon[${addonName}] mod[${mod}]`);
            return;
        }
        for (const img of mod.imgs) {
            const n = this.imgLookupTable.get(img.path);
            if (n) {
                console.warn(`[ImageLoaderHook] registerMod duplicate img path:`, [mod.name, img.path, n.modName]);
                this.log.warn(`[ImageLoaderHook] registerMod duplicate img path: mod[${mod.name}] img[${img.path}] old[${n.modName}]`);
            }
            this.imgLookupTable.set(img.path, {
                modName: mod.name,
                imgData: img,
            });
        }
    }

    sideHooker: ImgLoaderSideHooker[] = [];

    public addSideHooker(hooker: ImgLoaderSideHooker) {
        if (isFunction(hooker)) {
            console.error('[ImageLoaderHook] addSideHooker() hooker is function, the ImageLoaderHook API is changed since 2.7.0 .', [hooker]);
            this.log.error(`[ImageLoaderHook] addSideHooker() hooker is function, the ImageLoaderHook API is changed since 2.7.0 .`);
            return;
        }
        if (isFunction(hooker.imageLoader) && isFunction(hooker.imageGetter) && isString(hooker.hookName)) {
            console.log('[ImageLoaderHook] addSideHooker() ok', [hooker]);
            this.log.log(`[ImageLoaderHook] addSideHooker() ok: hookName[${hooker.hookName}]`);
            this.sideHooker.push(hooker);
            return;
        }
        console.error('[ImageLoaderHook] addSideHooker() failed. invalid hook.', [hooker]);
        this.log.error(`[ImageLoaderHook] addSideHooker() failed. invalid hook. hookName[${hooker.hookName}]`);
    }

    private imgLookupTable: Map<string, { modName: string, imgData: ModImg }> = new Map();

    private initLookupTable() {
        const modListName = this.gModUtils.getModListName();
        for (const modName of modListName) {
            const mod: ModInfo | undefined = this.gModUtils.getMod(modName);
            if (!mod) {
                continue;
            }
            for (const img of mod.imgs) {
                if (this.imgLookupTable.has(img.path)) {
                    console.warn(`[ImageLoaderHook] duplicate img path:`, [modName, img.path]);
                    this.log.warn(`[ImageLoaderHook] duplicate img path: mod[${modName}] img[${img.path}]`);
                }
                this.imgLookupTable.set(img.path, {
                    modName,
                    imgData: img,
                });
            }
        }
    }

    public addImages(modImg: ModImg[], modName: string) {
        for (const img of modImg) {
            if (this.imgLookupTable.has(img.path)) {
                console.warn(`[ImageLoaderHook] addImages duplicate img path:`, [modName, img.path]);
                this.log.warn(`[ImageLoaderHook] addImages duplicate img path: mod[${modName}] img[${img.path}]`);
            }
            this.imgLookupTable.set(img.path, {
                modName,
                imgData: img,
            });
        }
    }

    public forceLoadModImage(mod: ModInfo, modZip: ModZipReader) {
        if (!mod) {
            console.error('[ImageLoaderHook] forceLoadModImage() (!mod)');
            this.log.error(`[ImageLoaderHook] forceLoadModImage() (!mod)`);
            return;
        }
        for (const img of mod.imgs) {
            if (this.imgLookupTable.has(img.path)) {
                console.warn(`[ImageLoaderHook] forceLoadModImage duplicate img path:`, [mod.name, img.path]);
                this.log.warn(`[ImageLoaderHook] forceLoadModImage duplicate img path: mod[${mod.name}] img[${img.path}]`);
            }
            this.imgLookupTable.set(img.path, {
                modName: mod.name,
                imgData: img,
            });
        }
    }

    private hooked = false;

    private originLoader?: (typeof Renderer)['ImageLoader'];

    async debugGetImg(src: string): Promise<HTMLImageElement | undefined> {
        if (this.imgLookupTable.has(src)) {
            const n = this.imgLookupTable.get(src);
            if (n) {
                const image = new Image();
                image.src = await n.imgData.getter.getBase64Image();
                return image;
            }
        }
        return undefined;
    }

    private async getImage(src: string) {
        if (this.imgLookupTable.has(src)) {
            const n = this.imgLookupTable.get(src);
            if (n) {
                try {
                    return await n.imgData.getter.getBase64Image();
                } catch (e) {
                    console.error('[ImageLoaderHook] getImage replace error', [src, e]);
                }
            }
        }
        // console.log('[ImageLoaderHook] getImage not in imgLookupTable', src);
        for (const hooker of this.sideHooker) {
            try {
                const r = await hooker.imageGetter(src);
                if (r) {
                    return r;
                }
            } catch (e: Error | any) {
                console.error('[ImageLoaderHook] getImage sideHooker error', [src, hooker, e,]);
                this.log.error(`[ImageLoaderHook] getImage sideHooker error: src[${src}] hook[${hooker.hookName}] ${e?.message ? e.message : e}`);
            }
        }
        // console.log('[ImageLoaderHook] getImage not in sideHooker', src);
        return undefined;
    }

    private async loadImage(
        src: string,
        layer: any,
        successCallback: (src: string, layer: any, img: HTMLImageElement) => void,
        errorCallback: (src: string, layer: any, event: any) => void,
    ) {
        // console.log('[ImageLoaderHook] loadImage', src);
        if (this.imgLookupTable.has(src)) {
            const n = this.imgLookupTable.get(src);
            if (n) {
                try {
                    // this may throw error
                    const imgString = await n.imgData.getter.getBase64Image();

                    const image = new Image();
                    image.onload = () => {
                        successCallback(src, layer, image);
                    };
                    image.onerror = (event) => {
                        console.error('[ImageLoaderHook] loadImage replace error', [src]);
                        this.log.error(`[ImageLoaderHook] loadImage replace error: src[${src}]`);
                        errorCallback(src, layer, event);
                    };
                    image.src = imgString;
                    // console.log('[ImageLoaderHook] loadImage replace', [n.modName, src, image, n.imgData]);
                    return;
                } catch (e) {
                    console.error('[ImageLoaderHook] loadImage replace error', [src, e]);
                }
            }
        }
        // console.log('[ImageLoaderHook] loadImage not in imgLookupTable', src);
        for (const hooker of this.sideHooker) {
            try {
                const r = await hooker.imageLoader(src, layer, successCallback, errorCallback);
                if (r) {
                    return;
                }
            } catch (e: Error | any) {
                console.error('[ImageLoaderHook] loadImage sideHooker error', [src, hooker, e,]);
                this.log.error(`[ImageLoaderHook] loadImage sideHooker error: src[${src}] hook[${hooker.hookName}] ${e?.message ? e.message : e}`);
            }
        }
        // console.log('[ImageLoaderHook] loadImage not in sideHooker', src);
        // this.originLoader!.loadImage(src, layer, successCallback, errorCallback);
        const image = new Image();
        image.onload = () => {
            successCallback(src, layer, image);
        };
        image.onerror = (event) => {
            console.warn('[ImageLoaderHook] loadImage originLoader error', [src]);
            this.log.warn(`[ImageLoaderHook] loadImage originLoader error: src[${src}]`);
            errorCallback(src, layer, event);
        };
        image.src = src;
    }

    private setupHook() {
        if (this.hooked) {
            console.error('[ImageLoaderHook] setupHook() (this.hooked)');
            this.log.error(`[ImageLoaderHook] setupHook() (this.hooked)`);
            return;
        }
        this.hooked = true;
        console.log('[ImageLoaderHook] setupHook()');

        this.originLoader = Renderer.ImageLoader;
        Renderer.ImageLoader = {
            loadImage: this.loadImage.bind(this),
        };
    }

    waitInitCounter = 0;
    private waitKDLoadingFinished = () => {
        if (this.waitInitCounter > 1000) {
            // don't wait it
            console.log('[ImageLoaderHook] (waitInitCounter > 1000) dont wait it');
            this.log.log(`[ImageLoaderHook] (waitInitCounter > 1000) dont wait it`);
            return;
        }
        if (typeof Renderer === 'undefined') {
            ++this.waitInitCounter;
            setTimeout(this.waitKDLoadingFinished, 50);
            return;
        }
        this.setupHook();
        console.log('waitKDLoadingFinished ok');
    };

    init() {
        // this.initLookupTable();
        // this.waitKDLoadingFinished();

        // $(document).one(":passageinit", () => {
        //     console.log('[ImageLoaderHook] setupHook passageinit');
        //     this.log.log(`[ImageLoaderHook] setupHook passageinit`);
        //     this.setupHook();
        // });

        // game/04-Variables/canvasmodel-patterns-lib.js
        // game/04-Variables/canvasmodel-patterns-api.js
        // @ts-ignore
        window.registerImagePattern = (name: string, src: string) => {
            const image = new Image();
            image.onload = function () {
                // @ts-ignore
                Renderer.Patterns[name] = Renderer.globalC2D.createPattern(image, "repeat");
            };
            image.src = src;
        }

        // game/03-JavaScript/base.js
        // function processedSvg(width, height) ->  const fixSVGNameSpace = (type, elem, newParent = null)  ->  switch
        // @ts-ignore
        window.registerImagePatternSvgImage = (oldElem, newElem) => {
            // this will be call 2 time
            let href = oldElem.attr("href") || oldElem.attr("xlink:href") || undefined;
            if (oldElem.attr("ML-href") || oldElem.attr("ml-href") || oldElem.attr("ML-mark")) {
                // this element is processed
                // console.log('************************** fixSVGNameSpace element is processed', oldElem[0].cloneNode(true), oldElem[0].tagName);
                href = oldElem.attr("ML-href") || oldElem.attr("ml-href");
            }
            if (!!href) {
                oldElem[0].setAttributeNS("http://www.w3.org/1999/xlink", 'ML-href', href || "");
                oldElem[0].setAttributeNS("http://www.w3.org/1999/xlink", 'ML-mark', 'oldElem');
                oldElem[0].setAttribute('ML-href', href || "");
                oldElem[0].setAttribute('ML-mark', 'oldElem');
                oldElem[0].removeAttributeNS("http://www.w3.org/1999/xlink", 'href');
                oldElem[0].removeAttributeNS("http://www.w3.org/1999/xlink", 'xlink:href');
                oldElem[0].removeAttribute('href');
                oldElem[0].removeAttribute('xlink:href');

                newElem.setAttributeNS("http://www.w3.org/1999/xlink", 'ML-href', href || "");
                newElem.setAttributeNS("http://www.w3.org/1999/xlink", 'ML-mark', 'newElem');
                newElem.setAttribute('ML-href', href || "");
                newElem.setAttribute('ML-href-id', `id-${href}`);
                newElem.setAttribute('ML-mark', 'newElem');
                newElem.removeAttributeNS("http://www.w3.org/1999/xlink", 'href');
                newElem.removeAttributeNS("http://www.w3.org/1999/xlink", 'xlink:href');
                newElem.removeAttribute('href');
                newElem.removeAttribute('xlink:href');

                // console.log('************************** fixSVGNameSpace oldElem image', oldElem[0].cloneNode(true), oldElem[0].tagName);
                // console.log('************************** fixSVGNameSpace newElem image', newElem.cloneNode(true), newElem.tagName);
                // call img loader on there
                this.gSC2DataManager.getHtmlTagSrcHook().doHookCallback(href || "", (newHref) => {
                    // console.log('************************** fixSVGNameSpace newElem doHookCallback', href, newHref);
                    newElem.setAttribute("href", newHref);
                    newElem.setAttribute('xlink:href', newHref);
                    newElem.setAttribute('ML-markNew', 'newElem');
                    newElem.setAttributeNS("http://www.w3.org/1999/xlink", "href", newHref);
                    newElem.setAttributeNS("http://www.w3.org/1999/xlink", 'xlink:href', newHref);
                    newElem.setAttributeNS("http://www.w3.org/1999/xlink", 'ML-markNew', 'newElem');
                    // console.log('************************** fixSVGNameSpace oldElem doHookCallback', oldElem[0].cloneNode(true), oldElem[0].tagName);
                    // console.log('************************** fixSVGNameSpace newElem doHookCallback', newElem.cloneNode(true), newElem.tagName);
                }).catch(Err => console.error(Err));
                // newElem.setAttributeNS("http://www.w3.org/1999/xlink", "href", href || "");
            } else {
                newElem.setAttributeNS("http://www.w3.org/1999/xlink", "href", href || "");
            }
        }
    }

    installHook() {
        this.setupHook();
    }

    modifyMacroIcon(Macro: any) {
        console.log('modifyMacroIcon() start');
        // console.log('window.SugarCube', window.SugarCube);
        const icon = Macro.get('icon');
        if (!icon) {
            console.error('modifyMacroIcon() cannot find macro icon');
            this.log.error(`modifyMacroIcon() cannot find macro icon`);
            return;
        }
        const h = icon.OriginHandlerPassageQBalance;
        if (!h && !isFunction(h)) {
            console.error('modifyMacroIcon() cannot find macro icon handle', [icon, h]);
            this.log.error(`modifyMacroIcon() cannot find macro icon handle`);
            return;
        }
        const hCode = h.toString();
        const code = `handler() {
\t\tif (!V.options.images) return;
\t\tconst name = typeof this.args[0] === "string" ? this.args[0] : "error";
\t\tconst iconImg = document.createElement("img");
\t\ticonImg.className = "icon";
\t\ticonImg.src = "img/misc/icon/" + name;
\t\tthis.output.append(iconImg);
\t\t// append a whitespace for compatibility with old icon behavior
\t\tif (!this.args.includes("nowhitespace")) this.output.append(" ");
\t}`;
        if (code !== hCode) {
            console.warn('modifyMacroIcon() macro icon handle changed', [icon, h, hCode, code]);
            this.log.warn(`modifyMacroIcon() macro icon handle changed.`);
        }
        // hCode.replace('this.output.append(iconImg);', `
        // if (typeof window.modSC2DataManager !== 'undefined' &&
        //   typeof window.modSC2DataManager.getHtmlTagSrcHook?.()?.doHook !== 'undefined') {
        //   if (iconImg.tagName.toLowerCase() === 'img' && !iconImg.getAttribute('src')?.startsWith('data:')) {
        //     // need check the src is not "data:" URI
        //     iconImg.setAttribute('ML-src', iconImg.getAttribute('src'));
        //     iconImg.removeAttribute('src');
        //     // call img loader on there
        //     window.modSC2DataManager.getHtmlTagSrcHook().doHook(iconImg).catch(E => console.error(E));
        //   }
        // }
        // this.output.append(iconImg);
        // `)
        // icon.OriginHandlerPassageQBalance = createFunctionFromCode(hCode);
        // console.log('icon', icon);
        Macro.delete('icon');
        Macro.add("icon", {
            handler: function () {
                if (!V.options.images) return;
                const name = typeof this.args[0] === "string" ? this.args[0] : "error";
                const iconImg = document.createElement("img");
                iconImg.className = "icon";
                iconImg.src = "img/misc/icon/" + name;

                if (typeof window.modSC2DataManager !== 'undefined' &&
                    typeof window.modSC2DataManager.getHtmlTagSrcHook?.()?.doHook !== 'undefined') {
                    if (iconImg.tagName.toLowerCase() === 'img' && !iconImg.getAttribute('src')?.startsWith('data:')) {
                        // need check the src is not "data:" URI
                        iconImg.setAttribute('ML-src', iconImg.getAttribute('src')!);
                        iconImg.removeAttribute('src');
                        // call img loader on there
                        window.modSC2DataManager.getHtmlTagSrcHook().doHook(iconImg).catch(E => console.error(E));
                    }
                }

                this.output.append(iconImg);
                // append a whitespace for compatibility with old icon behavior
                if (!this.args.includes("nowhitespace")) this.output.append(" ");
            },
        });
        console.log('modifyMacroIcon() ok');
    }

}

export function createFunctionFromCode(source: string) {

    // 使用新源代码创建新的函数
    // 由于我们要保留函数的参数名称（name），我们需要一些解析逻辑
    let paramsStr = source.substring(source.indexOf('(') + 1, source.indexOf(')'));
    let params = paramsStr.split(',').map(p => p.trim());
    let body = source.substring(source.indexOf('{') + 1, source.lastIndexOf('}'));

    let modifiedFunction = new Function(...params, body);
    return modifiedFunction;
}
