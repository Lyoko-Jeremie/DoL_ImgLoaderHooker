import type {SC2DataManager} from "../../../dist-BeforeSC2/SC2DataManager";
import type {ModUtils} from "../../../dist-BeforeSC2/Utils";
import type jQuery from "jquery/misc";

declare global {

    var Renderer: {
        ImageLoader: {
            loadImage(
                src: string,
                layer: any,
                successCallback: (src: string, layer: any, img: HTMLImageElement) => void,
                errorCallback: (src: string, layer: any, event: any) => void,
            ): void;
        },
    };

    var SugarCube: {
        Macro: {
            get: (name: string) => any;
        }
    };
    var Macro: {
        get: (name: string) => any;
    };
    var V: any;

    interface Window {
        modUtils: ModUtils;
        modSC2DataManager: SC2DataManager;

        modImgLoaderHooker: ImgLoaderHooker;

        jQuery: jQuery;

        SugarCube: {
            Macro: {
                get: (name: string) => any;
            }
        };
    }
}
