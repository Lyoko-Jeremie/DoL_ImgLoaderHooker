(async () => {
    console.log('ImageLoaderHook preload start');

    window.modImgLoaderHooker.init();

    // const logger = window.modUtils.getLogger();
    // const scOld = window.modSC2DataManager.getSC2DataInfoAfterPatch();

    // const scNew = scOld.cloneSC2DataInfo();
    // {
    //     const sc = scNew.scriptFileItems.getByNameWithNoPath('renderer.js');
    //     if (!sc) {
    //         console.error('[ImageLoaderHook] cannot find renderer.js');
    //         logger.error('[ImageLoaderHook] cannot find renderer.js');
    //         return;
    //     }
    //     sc.content = sc.content + '\n' + 'window.modImgLoaderHooker.installHook();' + '\n';
    // }

    // game/04-Variables/canvasmodel-patterns-lib.js
    // {
    //     const sc = scNew.scriptFileItems.getByNameWithNoPath('canvasmodel-patterns-lib.js');
    //     if (!sc) {
    //         console.error('[ImageLoaderHook] cannot find canvasmodel-patterns-lib.js');
    //         logger.error('[ImageLoaderHook] cannot find canvasmodel-patterns-lib.js');
    //         return;
    //     }
    //     sc.content = sc.content.replaceAll(`registerImagePattern`, 'window.registerImagePattern');
    // }

    // game/03-JavaScript/base.js
    // {
    //     const sc = scNew.scriptFileItems.getByNameWithNoPath('base.js');
    //     if (!sc) {
    //         console.error('[ImageLoaderHook] cannot find base.js');
    //         logger.error('[ImageLoaderHook] cannot find base.js');
    //         return;
    //     }
    //     sc.content = sc.content.replace(
    //         `newElem.setAttributeNS("http://www.w3.org/1999/xlink", "href", oldElem.attr("href") || oldElem.attr("xlink:href") || "");`,
    //         'window.registerImagePatternSvgImage(oldElem, newElem);',
    //     );
    // }

    // scNew.scriptFileItems.back2Array();

    // window.modUtils.replaceFollowSC2DataInfo(scNew, scOld);

})();

