import type {AddonPluginHookPointEx} from "../../../dist-BeforeSC2/AddonPlugin";
import type {LogWrapper} from "../../../dist-BeforeSC2/ModLoadController";
import type {ModImg, ModInfo} from "../../../dist-BeforeSC2/ModLoader";
import type {ModZipReader} from "../../../dist-BeforeSC2/ModZipReader";
import type {SC2DataManager} from "../../../dist-BeforeSC2/SC2DataManager";
import type {ModUtils} from "../../../dist-BeforeSC2/Utils";

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
            'ImgLoaderAddon',
            this,
        );
    }

    async registerMod(addonName: string, mod: ModInfo, modZip: ModZipReader) {
        if (!mod) {
            console.error('registerMod() (!mod)', [addonName, mod]);
            return;
        }
        for (const img of mod.imgs) {
            if (this.imgLookupTable.has(img.path)) {
                console.warn(`[ImageLoaderHook Mod] registerMod duplicate img path:`, [mod.name, img.path]);
            }
            this.imgLookupTable.set(img.path, {
                modName: mod.name,
                imgData: img.data,
            });
        }
    }

    private imgLookupTable: Map<string, { modName: string, imgData: string }> = new Map();

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
                }
                this.imgLookupTable.set(img.path, {
                    modName,
                    imgData: img.data,
                });
            }
        }
    }

    public addImages(modImg: ModImg[], modName: string) {
        for (const img of modImg) {
            if (this.imgLookupTable.has(img.path)) {
                console.warn(`[ImageLoaderHook Mod] addImages duplicate img path:`, [modName, img.path]);
            }
            this.imgLookupTable.set(img.path, {
                modName,
                imgData: img.data,
            });
        }
    }

    private hooked = false;

    private originLoader?: (typeof Renderer)['ImageLoader'];

    debugGetImg(src: string): HTMLImageElement | undefined {
        if (this.imgLookupTable.has(src)) {
            const n = this.imgLookupTable.get(src);
            if (n) {
                const image = new Image();
                image.src = n.imgData;
                return image;
            }
        }
        return undefined;
    }

    private loadImage(
        src: string,
        layer: any,
        successCallback: (src: string, layer: any, img: HTMLImageElement) => void,
        errorCallback: (src: string, layer: any, event: any) => void,
    ) {
        console.log('ImageLoaderHook loadImage', src);
        if (this.imgLookupTable.has(src)) {
            const n = this.imgLookupTable.get(src);
            if (n) {
                const image = new Image();
                image.onload = () => {
                    successCallback(src, layer, image);
                };
                image.onerror = (event) => {
                    errorCallback(src, layer, event);
                };
                image.src = n.imgData;
                console.log('ImageLoaderHook loadImage replace', [n.modName, src, image, n.imgData]);
                return;
            }
        }
        // this.originLoader!.loadImage(src, layer, successCallback, errorCallback);
        const image = new Image();
        image.onload = () => {
            successCallback(src, layer, image);
        };
        image.onerror = (event) => {
            errorCallback(src, layer, event);
        };
        image.src = src;

    }

    private setupHook() {
        if (this.hooked) {
            console.error('setupHook() (this.hooked)');
            return;
        }
        this.hooked = true;

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
        // this.setupHook();

        $(document).one(":passageinit", () => {
            console.log('ImageLoaderHook setupHook passageinit');
            this.setupHook();
        });
    }

}

