import type {LogWrapper} from "../../../dist-BeforeSC2/ModLoadController";
import type {ModUtils} from "../../../dist-BeforeSC2/Utils";

// code from: gemini 3
export class NodeMutationObserver {
    protected logger: LogWrapper;

    constructor(
        public replaceUrlAsync: (url: string) => Promise<string | undefined>,
        public gModUtils: ModUtils,
    ) {
        this.logger = this.gModUtils.getLogger();
        this.observer = new MutationObserver(this.observerCallback);
    }

    protected observer: MutationObserver;

    protected TARGET_TAGS = new Map<string, string[]>([
        ['img', ['src', /*'srcset'*/]],
        ['image', ['src', 'href', 'xlink:href']], // SVG 内部图片通常用 href
        ['video', ['src', 'poster']],
        ['audio', ['src']],
        ['source', ['src', /*'srcset'*/]], // picture/audio/video 的 source 标签
        // ['iframe', ['src']], // 有时 iframe 也需要处理
    ]);

    protected AttributeFilter = ['src', 'href', 'xlink:href', /*'srcset',*/ 'poster'];

    /**
     * 启动观察器
     * 必须调用此方法代码才会生效
     */
    public start() {
        this.logger.log('[NodeMutationObserver] Started observing DOM changes.');
        this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            // 仅监听目标属性，提升性能
            attributeFilter: this.AttributeFilter,
        });
        // 启动时先全量扫描一次
        this.replaceAllOnce();
    }

    public stop() {
        this.observer.disconnect();
    }

    /**
     * 处理单个节点
     */
    public async processNode(node: HTMLElement, noLog?: boolean) {
        if (!node.tagName) return;
        const tagName = node.tagName.toLowerCase();

        if (!this.TARGET_TAGS.has(tagName)) {
            return;
        }

        const tags = this.TARGET_TAGS.get(tagName)!;

        // 并发处理该节点的所有目标属性
        await Promise.allSettled(tags.map(attr => this.processNodeTag(node, attr, noLog)));
    }

    public async processNodeTag(node: HTMLElement, attrName: string, noLog?: boolean) {
        // 1. 基础校验：必须是目标标签
        if (!this.TARGET_TAGS.has(node.tagName.toLowerCase()) || !node.hasAttribute(attrName)) {
            return;
        }

        const originalUrl = node.getAttribute(attrName)!;

        // 忽略 data协议、空值 或 锚点
        if (!originalUrl) {
            // 不存在 src 或正在处理中
            return;
        }
        if (originalUrl.startsWith('data:') || originalUrl.startsWith('#')) {
            return;
        }

        const FLAG_ATTR_NAME = `ml-${attrName}`;
        const replacedUrlAttr = `ml-replaced-${attrName}`; // 记录我们替换后的 URL

        // 2. 检查是否已处理
        if (node.hasAttribute(FLAG_ATTR_NAME)) {
            const prevOriginal = node.getAttribute(FLAG_ATTR_NAME);
            const prevReplaced = node.getAttribute(replacedUrlAttr);

            // 关键修复：处理动态修改 src 的情况
            // 如果当前的 url 等于我们之前记录的“原始URL”，说明是重复触发，忽略
            if (originalUrl === prevOriginal) return;
            // 如果当前的 url 等于我们“替换后的URL”，说明是我们代码自己设置的，忽略
            if (originalUrl === prevReplaced) return;

            // 否则，说明网页脚本修改了 src，我们需要重新处理（移除旧标记）
            // console.log('Detected dynamic src change:', originalUrl);
        }

        // 3. 锁定与阻断请求
        // 先打上标记，记录原始 URL
        node.setAttribute(FLAG_ATTR_NAME, originalUrl);
        // 移除原属性，阻断浏览器请求 (如果是 img src)
        node.removeAttribute(attrName);

        try {
            // 4. 异步计算新 URL
            const newUrl = await this.replaceUrlAsync(originalUrl);

            // 5. 更新 DOM
            if (newUrl && newUrl !== originalUrl) {
                // 记录我们即将设置的值，防止下一次回调误判
                node.setAttribute(replacedUrlAttr, newUrl);
                // 恢复属性，触发浏览器加载新资源
                node.setAttribute(attrName, newUrl);
            } else {
                // 如果没有新 URL，恢复原始 URL
                node.removeAttribute(replacedUrlAttr);
                node.setAttribute(attrName, originalUrl);
            }
        } catch (err) {
            console.error('[NodeMutationObserver] Replace failed, restoring:', [originalUrl, node, err]);
            !noLog && this.logger.error(`[NodeMutationObserver] Replace failed, restoring. [${originalUrl}]`);
            // 失败回退：移除标记（可选），恢复原始值
            node.removeAttribute(replacedUrlAttr);
            node.setAttribute(attrName, originalUrl);
        }
    }

    protected observerCallback: MutationCallback = (mutationsList: MutationRecord[], observer: MutationObserver) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                // 处理新增节点
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const el = node as HTMLElement;
                        this.processNode(el);

                        // 深度检查子节点 (性能敏感点)
                        // 优化：只查询在这个 Map 里的标签
                        if (el.querySelectorAll) {
                            const query = [...this.TARGET_TAGS.keys()].join(',');
                            const children = el.querySelectorAll(query);
                            for (let i = 0; i < children.length; i++) {
                                this.processNode(children[i] as HTMLElement);
                            }
                        }
                    }
                });
            } else if (mutation.type === 'attributes') {
                // 处理属性变更
                // mutation.attributeName 必定存在，因为我们在 observe 时过滤了
                if (mutation.target.nodeType === Node.ELEMENT_NODE) {
                    // 这里不需要再过滤 tagName，processNode 内部会校验
                    // 但为了性能，可以判断一下
                    const el = mutation.target as HTMLElement;
                    // 只有当属性是我们关心的属性时才处理（虽然 observe filter 已经做了一层，但 processNode 需要知道处理哪个属性吗？
                    // 原有逻辑是 processNode 会遍历所有 tags。
                    // 优化：只处理变更的那个特定属性，避免重复 check 其他属性
                    const tagName = el.tagName.toLowerCase();
                    if (this.TARGET_TAGS.has(tagName)) {
                        const targetAttrs = this.TARGET_TAGS.get(tagName)!;
                        if (targetAttrs.includes(mutation.attributeName!)) {
                            this.processNodeTag(el, mutation.attributeName!);
                        }
                    }
                }
            }
        }
    };

    public replaceAllOnce() {
        const query = [...this.TARGET_TAGS.keys()].join(',');
        const nodes = document.querySelectorAll(query);
        // 转换为数组使用 for 循环或 forEach
        nodes.forEach(T => this.processNode(T as HTMLElement));
    }

}
