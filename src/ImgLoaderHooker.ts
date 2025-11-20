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
            'Start',
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

    init() {
    }

    installHook() {
        this.setupHook();
    }

}
