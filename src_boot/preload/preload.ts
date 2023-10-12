(async () => {
    console.log('ImageLoaderHook preload start');

    window.modImgLoaderHooker.init();

    const logger = window.modUtils.getLogger();
    const scOld = window.modSC2DataManager.getSC2DataInfoAfterPatch();

    const scNew = scOld.cloneSC2DataInfo();
    const sc = scNew.scriptFileItems.map.get('renderer.js');
    if (!sc) {
        console.error('[ImageLoaderHook] cannot find renderer.js');
        logger.error('[ImageLoaderHook] cannot find renderer.js');
        return;
    }
    sc.content = sc.content + '\n' + 'window.modImgLoaderHooker.installHook();' + '\n';

    scNew.scriptFileItems.back2Array();

    window.modUtils.replaceFollowSC2DataInfo(scNew, scOld);

})();

