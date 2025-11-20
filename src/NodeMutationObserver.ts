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
        ['img', ['src', 'xlink:href',]],
        ['image', ['src', 'xlink:href',]],
        ['picture', ['src', 'xlink:href',]],
        ['icon', ['src', 'xlink:href',]],
        ['video', ['src',]],
        ['audio', ['src',]],
        ['svg', ['src', 'href',]],
    ]);

    /**
     * 处理单个节点
     */
    public async processNode(node: HTMLElement, noLog?: boolean) {
        if (!this.TARGET_TAGS.has(node?.tagName?.toLowerCase())) {
            return;
        }
        const tags = this.TARGET_TAGS.get(node.tagName.toUpperCase())!;
        await Promise.allSettled(tags.map(tag => this.processNodeTag(node, tag, noLog)));
    }

    public async processNodeTag(node: HTMLElement, tag: string, noLog?: boolean) {
        // 1. 基础校验：必须是目标标签
        if (!this.TARGET_TAGS.has(node.tagName.toLowerCase()) || !node.hasAttribute(tag)) {
            return;
        }

        const originalUrl = node.getAttribute(tag)!;

        if (originalUrl.startsWith('data:')) {
            return;
        }

        const FLAG_ATTR_NAME = `ml-${tag}`;

        // 只要 FLAG_ATTR_NAME 存在，就视为该节点已处理，不再重复处理
        // 这有效阻断了 removeAttribute 和 setAttribute 触发的二次回调
        if (node.hasAttribute(FLAG_ATTR_NAME)) {
            return;
        }

        // 这一步至关重要：先标记，再操作 src
        node.setAttribute(FLAG_ATTR_NAME, originalUrl);

        // 4. 阻断请求
        // 移除 src 触发 Observer -> 进入回调 -> 发现有 ml-src -> return
        node.removeAttribute(tag);

        // // 同样处理 srcset
        // if (node.hasAttribute('srcset')) {
        //     node.setAttribute('ml-srcset', node.getAttribute('srcset'));
        //     node.removeAttribute('srcset');
        // }

        try {
            // 5. 异步计算
            const newUrl = await this.replaceUrlAsync(originalUrl);

            // 6. 更新 DOM
            // 赋值 src 触发 Observer -> 进入回调 -> 发现有 ml-src -> return
            if (newUrl) {
                node.setAttribute(tag, newUrl);
                // console.log(`[NodeMutationObserver] Success`, [originalUrl, newUrl]);
            }
        } catch (err) {
            console.error('[NodeMutationObserver] Replace failed, restoring:', [originalUrl, node, err]);
            !noLog && this.logger.error(`[NodeMutationObserver] Replace failed, restoring. [${originalUrl}]`);
            // 失败回退
            node.setAttribute(tag, originalUrl);
        }
    }

    protected observerCallback: MutationCallback = (mutationsList: MutationRecord[], observer: MutationObserver) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node: Node | HTMLElement) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const el = node as HTMLElement;
                        this.processNode(el);
                        if (el.querySelectorAll) {
                            const query = [...this.TARGET_TAGS.keys()].join(',');
                            el.querySelectorAll(query).forEach(T => this.processNode(T as HTMLElement));
                        }
                    }
                });
            } else if (mutation.type === 'attributes') {
                this.processNode(mutation.target as HTMLElement);
            }
        }
    };

    public replaceAllOnce() {
        const query = [...this.TARGET_TAGS.keys()].join(',');
        document.querySelectorAll(query).forEach(T => this.processNode(T as HTMLElement));
    }

}
