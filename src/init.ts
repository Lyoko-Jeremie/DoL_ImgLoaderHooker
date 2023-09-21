import {ImgLoaderHooker} from "./ImgLoaderHooker";

(async () => {

    window.modImgLoaderHooker = new ImgLoaderHooker(
        window,
        window.modSC2DataManager,
        window.modUtils,
    );

})();



