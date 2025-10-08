import {} from 'lodash';
import type {SC2DataManager} from "../../../dist-BeforeSC2/SC2DataManager";
import type {ModUtils} from "../../../dist-BeforeSC2/Utils";
import type {LogWrapper} from "../../../dist-BeforeSC2/ModLoadController";


export class CssReplacer {
    logger: LogWrapper;

    constructor(
        public thisWindow: Window,
        public gSC2DataManager: SC2DataManager,
        public gModUtils: ModUtils,
    ) {
        this.logger = this.gModUtils.getLogger();
    }

    needReplaceKeyList = [
        'backgroundImage',
        'maskImage',
    ] as const;

    async replaceStyleSheets() {
        console.log(`[ImageLoaderHook][CssReplacer] replaceStyleSheets() start.`);
        let countOk = 0;
        let countError = 0;
        let countFind = 0;
        let countReplaced = 0;
        const styleSheets = this.thisWindow.document.styleSheets;
        for (let i = 0; i < styleSheets.length; i++) {
            const styleSheet = styleSheets[i];
            try {
                // 获取样式表中的所有规则
                const cssRules: CSSRuleList = styleSheet.cssRules || styleSheet.rules;

                for (let j = 0; j < cssRules.length; j++) {
                    const rule: CSSRule = cssRules[j];

                    // 仅处理 CSSStyleRule
                    if (rule instanceof CSSStyleRule && rule.style) {
                        const st = rule.style;
                        for (const key of this.needReplaceKeyList) {
                            if (st[key]) {
                                const v = st[key];
                                if (v && v.includes("url(")) {
                                    // 检查是否包含无效的图片路径
                                    if (this.checkIsNeedReplace(v)) {
                                        ++countFind;
                                        const r = await this.getCorrectUrl(v);
                                        if (r !== v) {
                                            console.log(`[ImageLoaderHook][CssReplacer] replaceStyleSheets() replace`, [v, r]);
                                            st[key] = r;
                                            ++countReplaced;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                // console.log(`[ImageLoaderHook][CssReplacer] replaceStyleSheets() ok`, [styleSheet.href, styleSheet]);
                ++countOk;
            } catch (e) {
                ++countError;
                if (e instanceof DOMException &&
                    (
                        e.message.includes('Not allowed to access cross-origin stylesheet') ||
                        e.message.includes('Cannot access rules')
                    )
                ) {
                    console.log(`[ImageLoaderHook][CssReplacer] This is a cross-origin stylesheet. Cannot access. ignore.`, [styleSheet.href]);
                } else {
                    console.warn(`[ImageLoaderHook][CssReplacer] Could not access rules for stylesheet: ${styleSheet.href}`);
                    console.warn(e);
                }
            }
        }
        console.log(`[ImageLoaderHook][CssReplacer] replaceStyleSheets() done. `
            + `countOk[${countOk}] countError[${countError}] countFind[${countFind}] countReplaced[${countReplaced}]`,
            [countOk, countError, countFind, countReplaced]);
        this.logger.log(`[ImageLoaderHook][CssReplacer] replaceStyleSheets() done. `
            + `countOk[${countOk}] countError[${countError}] countFind[${countFind}] countReplaced[${countReplaced}]`);
    }

    checkIsNeedReplace(cssUrl: string) {
        // 这里可以实现更加复杂的逻辑来判断URL是否有效
        // check ` url("data:image/ `
        return cssUrl.match(/url\(["']data:image\//i) === null;
    }

    async getCorrectUrl(cssUrl: string) {
        // 这里可以实现更加复杂的逻辑来判断URL是否有效
        // check ` url("data:image/ `
        const imageUrl = cssUrl.match(/url\(["']([^"']+)["']\)/i)?.[1];
        if (!imageUrl) {
            // never go there
            console.error(`[ImageLoaderHook][CssReplacer] getCorrectUrl() cannot match imageUrl, never go there.`, [cssUrl]);
            this.logger.error(`[ImageLoaderHook][CssReplacer] getCorrectUrl() cannot match imageUrl, never go there. [${cssUrl}]`);
            return cssUrl;
        }
        const p = await this.gSC2DataManager.getHtmlTagSrcHook().requestImageBySrc(imageUrl);
        if (!p) {
            // cannot find
            return cssUrl;
        }
        return `url("${p}")`
    }
}



