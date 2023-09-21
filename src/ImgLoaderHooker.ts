import {ModInfo} from "../../../dist-BeforeSC2/ModLoader";
import {SC2DataManager} from "../../../dist-BeforeSC2/SC2DataManager";
import {ModUtils} from "../../../dist-BeforeSC2/Utils";

export class ImgLoaderHooker {
    constructor(
        public thisWindow: Window,
        public gSC2DataManager: SC2DataManager,
        public gModUtils: ModUtils,
    ) {
    }

    private imgLookupTable: Map<string, string> = new Map();

    private initLookupTable() {
        const modListName = this.gModUtils.getModListName();
        for (const modName of modListName) {
            const mod: ModInfo | undefined = this.gModUtils.getMod(modName);
            if (!mod) {
                continue;
            }
            for (const img of mod.imgs) {
                this.imgLookupTable.set(img.path, img.data);
            }
        }
    }

    private hooked = false;

    private originLoader?: (typeof Renderer)['ImageLoader'];

    private loadImage(
        src: string,
        layer: any,
        successCallback: (src: string, layer: any, img: HTMLImageElement) => void,
        errorCallback: (src: string, layer: any, event: any) => void,
    ) {
        if (true) {
            console.log('ImageLoaderHook loadImage', src);
            const image = new Image();
            image.onload = () => {
                successCallback(src, layer, image);
            };
            image.onerror = (event) => {
                errorCallback(src, layer, event);
            };
            image.src = src;
        } else {
            this.originLoader!.loadImage(src, layer, successCallback, errorCallback);
        }
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
        this.initLookupTable();
        this.waitKDLoadingFinished();
    }

}

