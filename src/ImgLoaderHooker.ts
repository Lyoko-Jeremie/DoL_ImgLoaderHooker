import type {AddonPluginHookPointEx} from "../../../dist-BeforeSC2/AddonPlugin";
import type {LogWrapper} from "../../../dist-BeforeSC2/ModLoadController";
import type {ModImg, ModInfo} from "../../../dist-BeforeSC2/ModLoader";
import type {ModZipReader} from "../../../dist-BeforeSC2/ModZipReader";
import type {SC2DataManager} from "../../../dist-BeforeSC2/SC2DataManager";
import type {ModUtils} from "../../../dist-BeforeSC2/Utils";
import {isFunction} from 'lodash';

/**
 * @return Promise<boolean>      Promise<true> if handle by this hooker, otherwise Promise<false>.
 *
 * hooker can wait until the image loaded, and then call successCallback(src, layer, img) and return Promise<true>
 */
export type ImgLoaderSideHooker = (
    src: string,
    layer: any,
    successCallback: (src: string, layer: any, img: HTMLImageElement) => void,
    errorCallback: (src: string, layer: any, event: any) => void,
) => Promise<boolean>;

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
            async (el: HTMLImageElement | HTMLElement, mlSrc: string) => {
                if (this.imgLookupTable.has(mlSrc)) {
                    const n = this.imgLookupTable.get(mlSrc);
                    if (n) {
                        try {
                            // this may throw error
                            const imgString = await n.imgData.getter.getBase64Image();
                            el.setAttribute('src', imgString);
                            return true;
                        } catch (e: Error | any) {
                            console.error('ImageLoaderHook HtmlTagSrcHook replace error', [mlSrc, e]);
                            this.log.error(`ImageLoaderHook HtmlTagSrcHook replace error: src[${mlSrc}] error[${e?.message ? e.message : e}]`);
                        }
                    }
                }
                return false;
            }
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
                console.warn(`[ImageLoaderHook Mod] registerMod duplicate img path:`, [mod.name, img.path, n.modName]);
                this.log.warn(`[ImageLoaderHook Mod] registerMod duplicate img path: mod[${mod.name}] img[${img.path}] old[${n.modName}]`);
            }
            this.imgLookupTable.set(img.path, {
                modName: mod.name,
                imgData: img,
            });
        }
    }

    sideHooker: ImgLoaderSideHooker[] = [];

    public addSideHooker(hooker: ImgLoaderSideHooker) {
        this.sideHooker.push(hooker);
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
                    console.warn(`[ImageLoaderHook Mod] duplicate img path:`, [modName, img.path]);
                    this.log.warn(`[ImageLoaderHook Mod] duplicate img path: mod[${modName}] img[${img.path}]`);
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
                console.warn(`[ImageLoaderHook Mod] addImages duplicate img path:`, [modName, img.path]);
                this.log.warn(`[ImageLoaderHook Mod] addImages duplicate img path: mod[${modName}] img[${img.path}]`);
            }
            this.imgLookupTable.set(img.path, {
                modName,
                imgData: img,
            });
        }
    }

    public forceLoadModImage(mod: ModInfo, modZip: ModZipReader) {
        if (!mod) {
            console.error('forceLoadModImage() (!mod)');
            this.log.error(`forceLoadModImage() (!mod)`);
            return;
        }
        for (const img of mod.imgs) {
            if (this.imgLookupTable.has(img.path)) {
                console.warn(`[ImageLoaderHook Mod] forceLoadModImage duplicate img path:`, [mod.name, img.path]);
                this.log.warn(`[ImageLoaderHook Mod] forceLoadModImage duplicate img path: mod[${mod.name}] img[${img.path}]`);
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

    private async loadImage(
        src: string,
        layer: any,
        successCallback: (src: string, layer: any, img: HTMLImageElement) => void,
        errorCallback: (src: string, layer: any, event: any) => void,
    ) {
        console.log('ImageLoaderHook loadImage', src);
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
                        console.error('ImageLoaderHook loadImage replace error', [src]);
                        this.log.error(`ImageLoaderHook loadImage replace error: src[${src}]`);
                        errorCallback(src, layer, event);
                    };
                    image.src = imgString;
                    // console.log('ImageLoaderHook loadImage replace', [n.modName, src, image, n.imgData]);
                    return;
                } catch (e) {
                    console.error('ImageLoaderHook loadImage replace error', [src, e]);
                }
            }
        }
        for (const hooker of this.sideHooker) {
            try {
                const r = await hooker(src, layer, successCallback, errorCallback);
                if (r) {
                    return;
                }
            } catch (e: Error | any) {
                console.error('ImageLoaderHook loadImage sideHooker error', [src, e]);
                this.log.error(`ImageLoaderHook loadImage sideHooker error: src[${src}] ${e?.message ? e.message : e}`);
            }
        }
        // this.originLoader!.loadImage(src, layer, successCallback, errorCallback);
        const image = new Image();
        image.onload = () => {
            successCallback(src, layer, image);
        };
        image.onerror = (event) => {
            console.warn('ImageLoaderHook loadImage originLoader error', [src]);
            this.log.warn(`ImageLoaderHook loadImage originLoader error: src[${src}]`);
            errorCallback(src, layer, event);
        };
        image.src = src;

    }

    private setupHook() {
        if (this.hooked) {
            console.error('[ImageLoaderHook Mod] setupHook() (this.hooked)');
            this.log.error(`[ImageLoaderHook Mod] setupHook() (this.hooked)`);
            return;
        }
        this.hooked = true;
        console.log('[ImageLoaderHook Mod] setupHook()');

        this.originLoader = Renderer.ImageLoader;
        Renderer.ImageLoader = {
            loadImage: this.loadImage.bind(this),
        };
    }

    waitInitCounter = 0;
    private waitKDLoadingFinished = () => {
        if (this.waitInitCounter > 1000) {
            // don't wait it
            console.log('[ImageLoaderHook Mod] (waitInitCounter > 1000) dont wait it');
            this.log.log(`[ImageLoaderHook Mod] (waitInitCounter > 1000) dont wait it`);
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
        //     console.log('ImageLoaderHook setupHook passageinit');
        //     this.log.log(`ImageLoaderHook setupHook passageinit`);
        //     this.setupHook();
        // });
    }

    installHook() {
        this.setupHook();
    }

    modifyMacroIcon(Macro: any) {
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
