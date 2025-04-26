import type {AddonPluginHookPointEx} from "../../../dist-BeforeSC2/AddonPlugin";
import type {LogWrapper} from "../../../dist-BeforeSC2/ModLoadController";
import type {ModImg, ModInfo} from "../../../dist-BeforeSC2/ModLoader";
import type {ModZipReader} from "../../../dist-BeforeSC2/ModZipReader";
import type {SC2DataManager} from "../../../dist-BeforeSC2/SC2DataManager";
import type {ModUtils} from "../../../dist-BeforeSC2/Utils";
import type {Passage} from "../../../src/BeforeSC2/SugarCube2";
import {isFunction, isString} from 'lodash';
import {SimpleDolFunctionHook} from "./SimpleDolFunctionHook";
import {sleep} from "./utils";
import {ImgLoaderHookerCore} from "./ImgLoaderHookerCore";

export class ImgLoaderHooker extends ImgLoaderHookerCore {
    constructor(
        public thisWindow: Window,
        public gSC2DataManager: SC2DataManager,
        public gModUtils: ModUtils,
    ) {
        super(
            thisWindow,
            gSC2DataManager,
            gModUtils,
        );
        this.addListDynamicImageTagReplacePassage([
            'Adult Shop Menu',
            'PillCollection',
            'Sextoys Inventory',
            'FeatsUI',
            'PillCollection',
        ]);
    }

    protected hooked = false;

    protected setupHook() {
        if (this.hooked) {
            // console.error('[ImageLoaderHook] setupHook() (this.hooked)');
            // this.logger.error(`[ImageLoaderHook] setupHook() (this.hooked)`);
            return;
        }
        this.hooked = true;
        console.log('[ImageLoaderHook] setupHook()');

        // this.originLoader = Renderer.ImageLoader;
        // Renderer.ImageLoader = {
        //     loadImage: this.loadImage.bind(this),
        // };
    }

    waitInitCounter = 0;
    protected waitKDLoadingFinished = () => {
        if (this.waitInitCounter > 1000) {
            // don't wait it
            console.log('[ImageLoaderHook] (waitInitCounter > 1000) dont wait it');
            this.logger.log(`[ImageLoaderHook] (waitInitCounter > 1000) dont wait it`);
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

    // protected async loadImage(
    //     src: string | HTMLCanvasElement,
    //     layer: any,
    //     successCallback: (src: string | HTMLCanvasElement, layer: any, img: HTMLImageElement | HTMLCanvasElement) => void,
    //     errorCallback: (src: string, layer: any, event: any) => void,
    // ) {
    //     const rescaleImageToCanvasHeight = (image: HTMLImageElement | HTMLCanvasElement, targetHeight: number) => {
    //         // code from origin game
    //         const createCanvas = (w: number, h: number, fill?: string | CanvasGradient | CanvasPattern | undefined) => {
    //             let c = document.createElement("canvas");
    //             c.width = w;
    //             c.height = h;
    //             let c2d = c.getContext('2d');
    //             if (!c2d) {
    //                 throw new Error('Cannot get 2d context');
    //             }
    //             if (fill) {
    //                 c2d.fillStyle = fill;
    //                 c2d.fillRect(0, 0, w, h);
    //             }
    //             return c2d;
    //         };
    //
    //         const aspectRatio = image.width / image.height;
    //         const scaledWidth = targetHeight * aspectRatio;
    //         const i2 = createCanvas(scaledWidth, targetHeight);
    //         i2.imageSmoothingEnabled = false;
    //         i2.drawImage(image, 0, 0, scaledWidth, targetHeight);
    //         return i2.canvas;
    //     };
    //
    //     const setSuccessCallback = (src: string | HTMLCanvasElement, layer: any, img: HTMLImageElement | HTMLCanvasElement) => {
    //         if (src instanceof HTMLCanvasElement) {
    //             successCallback(src, layer, src);
    //             return;
    //         }
    //         // fix the image size ... this code from origin game
    //
    //         // Rescale the image to the canvas height, if layer.scale is true
    //         const rescaledImage = layer.scale ? rescaleImageToCanvasHeight(img, layer.model.height) : img;
    //
    //         successCallback(src, layer, rescaledImage);
    //     }
    //
    //
    //     if (src instanceof HTMLCanvasElement) {
    //         successCallback(src, layer, src);
    //         return;
    //     }
    //     // console.log('[ImageLoaderHook] loadImage', src);
    //     if (this.imgLookupTable.has(src)) {
    //         const n = this.imgLookupTable.get(src);
    //         if (n) {
    //             try {
    //                 // this may throw error
    //                 const imgString = await n.imgData.getter.getBase64Image();
    //
    //                 const image = new Image();
    //                 image.onload = () => {
    //                     setSuccessCallback(src, layer, image);
    //                 };
    //                 image.onerror = (event) => {
    //                     console.error('[ImageLoaderHook] loadImage replace error', [src]);
    //                     this.logger.error(`[ImageLoaderHook] loadImage replace error: src[${src}]`);
    //                     errorCallback(src, layer, event);
    //                 };
    //                 image.src = imgString;
    //                 // console.log('[ImageLoaderHook] loadImage replace', [n.modName, src, image, n.imgData]);
    //                 return;
    //             } catch (e) {
    //                 console.error('[ImageLoaderHook] loadImage replace error', [src, e]);
    //             }
    //         }
    //     }
    //     // console.log('[ImageLoaderHook] loadImage not in imgLookupTable', src);
    //     for (const hooker of this.sideHooker) {
    //         try {
    //             const r = await hooker.imageLoader(src, layer, setSuccessCallback, errorCallback);
    //             if (r) {
    //                 return;
    //             }
    //         } catch (e: Error | any) {
    //             console.error('[ImageLoaderHook] loadImage sideHooker error', [src, hooker, e,]);
    //             this.logger.error(`[ImageLoaderHook] loadImage sideHooker error: src[${src}] hook[${hooker.hookName}] ${e?.message ? e.message : e}`);
    //         }
    //     }
    //     // console.log('[ImageLoaderHook] loadImage not in sideHooker', src);
    //     // this.originLoader!.loadImage(src, layer, successCallback, errorCallback);
    //     const image = new Image();
    //     image.onload = () => {
    //         setSuccessCallback(src, layer, image);
    //     };
    //     image.onerror = (event) => {
    //         console.warn('[ImageLoaderHook] loadImage originLoader error', [src]);
    //         this.logger.warn(`[ImageLoaderHook] loadImage originLoader error: src[${src}]`);
    //         errorCallback(src, layer, event);
    //     };
    //     image.src = src;
    // }

    init() {
        // this.initLookupTable();
        // this.waitKDLoadingFinished();

        // $(document).one(":passageinit", () => {
        //     console.log('[ImageLoaderHook] setupHook passageinit');
        //     this.logger.log(`[ImageLoaderHook] setupHook passageinit`);
        //     this.setupHook();
        // });

        // game/04-Variables/canvasmodel-patterns-lib.js
        // game/04-Variables/canvasmodel-patterns-api.js
        // @ts-ignore
        // window.registerImagePattern = (name: string, src: string) => {
        //     const image = new Image();
        //     image.onload = function () {
        //         // @ts-ignore
        //         Renderer.Patterns[name] = Renderer.globalC2D.createPattern(image, "repeat");
        //     };
        //     image.src = src;
        // }

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
            console.error('modifyMacroIcon() cannot find macro [icon]');
            this.logger.error(`modifyMacroIcon() cannot find macro [icon]`);
            return;
        }
        const h = icon.OriginHandlerPassageQBalance;
        if (!h && !isFunction(h)) {
            console.error('modifyMacroIcon() cannot find macro [icon] handle', [icon, h]);
            this.logger.error(`modifyMacroIcon() cannot find macro [icon] handle`);
            return;
        }
        const hCode = h.toString();
        const code = `handler() {
\t\tif (!V.options.images) return;
\t\tconst name = typeof this.args[0] === "string" ? this.args[0] : "error";
\t\tconst iconImg = document.createElement("img");
\t\ticonImg.className = "icon" + (this.args.includes("infront") ? " infront" : "") + (this.args.includes("flip") ? " flip" : "");
\t\ticonImg.src = "img/misc/icon/" + name;
\t\tthis.output.append(iconImg);
\t\t// append a whitespace for compatibility with old icon behavior
\t\tif (!this.args.includes("nowhitespace")) this.output.append(" ");
\t}`;
        if (code !== hCode) {
            console.warn('modifyMacroIcon() macro [icon] handle changed', [icon, h, hCode, code]);
            this.logger.warn(`modifyMacroIcon() macro [icon] handle changed.`);
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
            handler() {
                if (!V.options.images) return;
                const name = typeof this.args[0] === "string" ? this.args[0] : "error";
                const iconImg = document.createElement("img");
                iconImg.className = "icon" + (this.args.includes("infront") ? " infront" : "");
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
        console.log('modifyMacroIcon() [icon] ok');
    }

    modifyMacroWeatherIcon(Macro: any) {
        console.log('modifyMacroWeatherIcon() start');
        // console.log('window.SugarCube', window.SugarCube);
        const weatherIcon = Macro.get('weatherIcon');
        if (!weatherIcon) {
            console.error('modifyMacroWeatherIcon() cannot find macro [weatherIcon]');
            this.logger.error(`modifyMacroWeatherIcon() cannot find macro [weatherIcon]`);
            return;
        }
        const h = weatherIcon.OriginHandlerPassageQBalance;
        if (!h && !isFunction(h)) {
            console.error('modifyMacroWeatherIcon() cannot find macro [weatherIcon]', [weatherIcon, h]);
            this.logger.error(`modifyMacroWeatherIcon() cannot find macro [weatherIcon]`);
            return;
        }
        const hCode = h.toString();
        const code = `handler() {
\t\tconst iconDiv = $("<div />", { id: "weatherIcon" });
\t\tconst iconImg = $("<img />");

\t\tconst dayState = Weather.bloodMoon ? "blood" : Weather.dayState === "night" ? "night" : "day";
\t\tconst weatherState = resolveValue(Weather.type.iconType, "clear");
\t\tconst path = \`img/misc/icon/weather/$\{dayState}_$\{weatherState}.png\`;

\t\ticonImg.attr("src", path);
\t\tWeather.Tooltips.skybox(iconImg);
\t\ticonDiv.append(iconImg);
\t\ticonDiv.appendTo(this.output);
\t}`;
        if (code !== hCode) {
            console.warn('modifyMacroWeatherIcon() macro [weatherIcon] handle changed', [weatherIcon, h, hCode, code]);
            this.logger.warn(`modifyMacroWeatherIcon() macro [weatherIcon] handle changed.`);
        }
        Macro.delete('weatherIcon');
        Macro.add("weatherIcon", {
            handler() {
                const iconDiv = $("<div />", {id: "weatherIcon"});
                const iconImg/*: JQuery<HTMLImageElement>*/ = $("<img />");

                const dayState = Weather.bloodMoon ? "blood" : Weather.dayState === "night" ? "night" : "day";
                const weatherState = resolveValue(window.Weather.type.iconType, "clear");
                const path = `img/misc/icon/weather/${dayState}_${weatherState}.png`;

                iconImg.attr("src", path);
                Weather.Tooltips.skybox(iconImg);

                // get the HTMLImageElement ref from JQuery Object
                const iconImgNodeRef: HTMLImageElement = iconImg[0];

                if (typeof window.modSC2DataManager !== 'undefined' &&
                    typeof window.modSC2DataManager.getHtmlTagSrcHook?.()?.doHook !== 'undefined') {
                    if (iconImgNodeRef.tagName.toLowerCase() === 'img' && !iconImgNodeRef.getAttribute('src')?.startsWith('data:')) {
                        // need check the src is not "data:" URI
                        iconImgNodeRef.setAttribute('ML-src', iconImgNodeRef.getAttribute('src')!);
                        iconImgNodeRef.removeAttribute('src');
                        // call img loader on there
                        window.modSC2DataManager.getHtmlTagSrcHook().doHook(iconImgNodeRef).catch(E => console.error(E));
                    }
                }

                iconDiv.append(iconImg);
                iconDiv.appendTo(this.output);
            },
        });
        console.log('modifyMacroWeatherIcon() [weatherIcon] ok');
    }

    simpleDolFunctionHook: SimpleDolFunctionHook = new SimpleDolFunctionHook();

    hook_dol_DolFunctionHook() {

        this.simpleDolFunctionHook.hook('sexShopOnItemClick', () => {
            console.log('[ImageLoaderHook] do_hook_dol_sexShopOnItemClick()');
            const imgList: HTMLImageElement[] = Array.from(this.gModUtils.thisWin.document.querySelectorAll('#ssm_desc_img > img'));
            if (imgList.length === 0) {
                console.warn('[ImageLoaderHook] do_hook_dol_sexShopOnItemClick() cannot find img.');
                this.logger.warn(`[ImageLoaderHook] do_hook_dol_sexShopOnItemClick() cannot find img.`);
                return;
            }
            return Promise.all(imgList.map(async (img) => this.replaceImageInImgTags(img)));
        });

        this.simpleDolFunctionHook.hook('sexToysInventoryOnItemClick', () => {
            console.log('[ImageLoaderHook] do_hook_dol_sexToysInventoryOnItemClick()');
            const imgList: HTMLImageElement[] = Array.from(this.gModUtils.thisWin.document.querySelectorAll('#sti_desc_img > img'));
            if (imgList.length === 0) {
                console.warn('[ImageLoaderHook] do_hook_dol_sexToysInventoryOnItemClick() cannot find img.');
                this.logger.warn(`[ImageLoaderHook] do_hook_dol_sexToysInventoryOnItemClick() cannot find img.`);
                return;
            }
            return Promise.all(imgList.map(async (img) => this.replaceImageInImgTags(img)));
        });

        this.simpleDolFunctionHook.hook('onHomePillItemClick', () => {
            console.log('[ImageLoaderHook] do_hook_dol_onHomePillItemClick()');
            const imgList: HTMLImageElement[] = Array.from(this.gModUtils.thisWin.document.querySelectorAll('#hpi_desc_img > img'));
            if (imgList.length === 0) {
                console.warn('[ImageLoaderHook] do_hook_dol_onHomePillItemClick() cannot find img.');
                this.logger.warn(`[ImageLoaderHook] do_hook_dol_onHomePillItemClick() cannot find img.`);
                return;
            }
            return Promise.all(imgList.map(async (img) => this.replaceImageInImgTags(img)));
        });

    }

    old_gainSchoolStar?: (variable: string) => DocumentFragment;
    new_gainSchoolStar?: (variable: string) => DocumentFragment;

    hook_dol_gainSchoolStar() {
        if (this.old_gainSchoolStar) {
            console.error('[ImageLoaderHook] hook_dol_gainSchoolStar() is patched', [this.old_gainSchoolStar]);
            this.logger.error(`[ImageLoaderHook] hook_dol_gainSchoolStar() is patched.`);
            return;
        }
        // console.log('[ImageLoaderHook] hook_dol_gainSchoolStar() gainSchoolStar',
        //     [window.gainSchoolStar, [window.gainSchoolStar.toString()], gainSchoolStar, [gainSchoolStar.toString()]]);
        this.old_gainSchoolStar = (window as any)['gainSchoolStar'] || gainSchoolStar;
        this.new_gainSchoolStar = (variable: string) => {
            // console.log('[ImageLoaderHook] hook_dol_gainSchoolStar() new_gainSchoolStar gainSchoolStar',
            //     [window.gainSchoolStar, [window.gainSchoolStar.toString()], gainSchoolStar, [gainSchoolStar.toString()]]);
            const fragment = this.old_gainSchoolStar!(variable) as DocumentFragment;
            const cL = Array.from(fragment.childNodes);
            // console.log('[ImageLoaderHook] hook_dol_gainSchoolStar() ret', [fragment, cL]);
            for (const node of cL) {
                if (node instanceof HTMLImageElement) {
                    if (node.tagName.toLowerCase() === 'img' && !node.getAttribute('src')?.startsWith('data:')) {
                        // need check the src is not "data:" URI
                        node.setAttribute('ML-src', node.getAttribute('src')!);
                        node.removeAttribute('src');
                        this.gSC2DataManager.getHtmlTagSrcHook().doHook(node).catch(E => console.error(E));
                    }
                }
            }
            return fragment;
        };
        (window as any)['gainSchoolStar'] = this.new_gainSchoolStar;
        console.log('[ImageLoaderHook] hook_dol_gainSchoolStar() ok',
            // [window.gainSchoolStar, [window.gainSchoolStar.toString()],
            //     gainSchoolStar, [gainSchoolStar.toString()],
            //     this.old_gainSchoolStar, [this.old_gainSchoolStar?.toString()],
            //     this.new_gainSchoolStar, [this.new_gainSchoolStar?.toString()],
            // ],
        );
        return `gainSchoolStar = window.modImgLoaderHooker.new_gainSchoolStar;`;
    }

}
