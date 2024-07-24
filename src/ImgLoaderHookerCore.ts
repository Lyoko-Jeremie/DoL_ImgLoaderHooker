import type {AddonPluginHookPointEx} from "../../../dist-BeforeSC2/AddonPlugin";
import type {LogWrapper} from "../../../dist-BeforeSC2/ModLoadController";
import type {ModImg, ModInfo} from "../../../dist-BeforeSC2/ModLoader";
import type {ModZipReader} from "../../../dist-BeforeSC2/ModZipReader";
import type {SC2DataManager} from "../../../dist-BeforeSC2/SC2DataManager";
import type {ModUtils} from "../../../dist-BeforeSC2/Utils";
import {isFunction, isString} from 'lodash';
import {CssReplacer} from "./CssReplacer";

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

export class ImgLoaderHookerCore implements AddonPluginHookPointEx {
    protected logger: LogWrapper;

    constructor(
        public thisWindow: Window,
        public gSC2DataManager: SC2DataManager,
        public gModUtils: ModUtils,
    ) {
        this.logger = this.gModUtils.getLogger();
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
        this.cssReplacer = new CssReplacer(thisWindow, gSC2DataManager, gModUtils);
    }

    cssReplacer: CssReplacer;

    public async replaceStyleSheets() {
        await this.cssReplacer.replaceStyleSheets();
    }

    async whenSC2StoryReady(): Promise<void> {
        await this.replaceStyleSheets();
    }

    protected async replaceImageInImgTags(img: HTMLImageElement) {
        if (img.hasAttribute('ml-src') || img.hasAttribute('ML-src')) {
            // this is processed or processing
            return;
        }
        const src = img.getAttribute('src');
        if (src?.startsWith('data:')) {
            // ignore it
            return;
        }
        if (!src) {
            // seems like it state wrong ?
            console.warn('[ImageLoaderHook] replaceImageInImgTags() img.src is empty', [img]);
            return;
        }
        // ===============
        img.setAttribute('ml-src', src);
        img.removeAttribute('src');
        console.log(this);
        const m = await this.getImage(src);
        // console.log('[ImageLoaderHook] replaceImageInImgTags() get img', [src, m]);
        if (m) {
            img.setAttribute('src', m);
        } else {
            img.setAttribute('src', src);
            console.warn('[ImageLoaderHook] replaceImageInImgTags() cannot find img', [img, src]);
            this.logger.warn(`[ImageLoaderHook] replaceImageInImgTags() cannot find img. [${src}]`);
        }
    }

    async registerMod(addonName: string, mod: ModInfo, modZip: ModZipReader) {
        if (!mod) {
            console.error('registerMod() (!mod)', [addonName, mod]);
            this.logger.error(`registerMod() (!mod): addon[${addonName}] mod[${mod}]`);
            return;
        }
        for (const img of mod.imgs) {
            const n = this.imgLookupTable.get(img.path);
            if (n) {
                console.warn(`[ImageLoaderHook] registerMod duplicate img path:`, [mod.name, img.path, n.modName]);
                this.logger.warn(`[ImageLoaderHook] registerMod duplicate img path: mod[${mod.name}] img[${img.path}] old[${n.modName}]`);
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
            this.logger.error(`[ImageLoaderHook] addSideHooker() hooker is function, the ImageLoaderHook API is changed since 2.7.0 .`);
            return;
        }
        if (isFunction(hooker.imageLoader) && isFunction(hooker.imageGetter) && isString(hooker.hookName)) {
            console.log('[ImageLoaderHook] addSideHooker() ok', [hooker]);
            this.logger.log(`[ImageLoaderHook] addSideHooker() ok: hookName[${hooker.hookName}]`);
            this.sideHooker.push(hooker);
            return;
        }
        console.error('[ImageLoaderHook] addSideHooker() failed. invalid hook.', [hooker]);
        this.logger.error(`[ImageLoaderHook] addSideHooker() failed. invalid hook. hookName[${hooker.hookName}]`);
    }

    protected imgLookupTable: Map<string, { modName: string, imgData: ModImg }> = new Map();

    protected initLookupTable() {
        const modListName = this.gModUtils.getModListName();
        for (const modName of modListName) {
            const mod: ModInfo | undefined = this.gModUtils.getMod(modName);
            if (!mod) {
                continue;
            }
            for (const img of mod.imgs) {
                if (this.imgLookupTable.has(img.path)) {
                    console.warn(`[ImageLoaderHook] duplicate img path:`, [modName, img.path]);
                    this.logger.warn(`[ImageLoaderHook] duplicate img path: mod[${modName}] img[${img.path}]`);
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
                this.logger.warn(`[ImageLoaderHook] addImages duplicate img path: mod[${modName}] img[${img.path}]`);
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
            this.logger.error(`[ImageLoaderHook] forceLoadModImage() (!mod)`);
            return;
        }
        for (const img of mod.imgs) {
            if (this.imgLookupTable.has(img.path)) {
                console.warn(`[ImageLoaderHook] forceLoadModImage duplicate img path:`, [mod.name, img.path]);
                this.logger.warn(`[ImageLoaderHook] forceLoadModImage duplicate img path: mod[${mod.name}] img[${img.path}]`);
            }
            this.imgLookupTable.set(img.path, {
                modName: mod.name,
                imgData: img,
            });
        }
    }

    protected originLoader?: (typeof Renderer)['ImageLoader'];

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

    protected async getImage(src: string) {
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
                this.logger.error(`[ImageLoaderHook] getImage sideHooker error: src[${src}] hook[${hooker.hookName}] ${e?.message ? e.message : e}`);
            }
        }
        // console.log('[ImageLoaderHook] getImage not in sideHooker', src);
        return undefined;
    }

    protected async loadImage(
        src: string | HTMLCanvasElement,
        layer: any,
        successCallback: (src: string | HTMLCanvasElement, layer: any, img: HTMLImageElement | HTMLCanvasElement) => void,
        errorCallback: (src: string, layer: any, event: any) => void,
    ) {
        if (src instanceof HTMLCanvasElement) {
            successCallback(src, layer, src);
            return;
        }
        if (typeof src !== 'string') {
            successCallback(src, layer, src);
            return;
        }
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
                        this.logger.error(`[ImageLoaderHook] loadImage replace error: src[${src}]`);
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
                this.logger.error(`[ImageLoaderHook] loadImage sideHooker error: src[${src}] hook[${hooker.hookName}] ${e?.message ? e.message : e}`);
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
            this.logger.warn(`[ImageLoaderHook] loadImage originLoader error: src[${src}]`);
            errorCallback(src, layer, event);
        };
        image.src = src;
    }


}
