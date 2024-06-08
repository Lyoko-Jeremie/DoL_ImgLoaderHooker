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

        sexShopOnItemClick: () => void;
        sexToysInventoryOnItemClick: (index, category) => void;
    }

    interface Window {
        Weather: { [key in string]: any };
    }

    var Weather: { [key in string]: any };

    /**
     * Resolves the provided value by checking if it is a function or a direct value.
     * If the value is a function, the function is invoked and its result is returned.
     * If it is not a function, the value itself is returned.
     * If the value is undefined, a specified default value is returned instead.
     *
     * @param {Function|any} value The value to resolve, which can be a function or any value
     * @param {number} defaultValue The default value to use if the provided value is undefined
     * @returns {number} The resolved value, either from the function call or directly
     */
    function resolveValue(value: Function | any, defaultValue?: any = undefined): number;

    interface Window {
        resolveValue: typeof resolveValue;
    }

}
