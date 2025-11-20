import type {LogWrapper} from "../../../dist-BeforeSC2/ModLoadController";
import type {ModUtils} from "../../../dist-BeforeSC2/Utils";

// code from: gemini 3
export class NodeMutationObserver {
    protected logger: LogWrapper;
    protected observer: MutationObserver;
    protected originalCreateElement: typeof document.createElement;
    protected originalImage: typeof Image;

    // 新增：全局处理状态记录，防止竞争条件
    protected processingElements = new WeakMap<HTMLElement, Set<string>>();

    constructor(
        public replaceUrlAsync: (url: string) => Promise<string | undefined>,
        public gModUtils: ModUtils,
    ) {
        this.logger = this.gModUtils.getLogger();
        this.observer = new MutationObserver(this.observerCallback);
        // 绑定原始方法，防止丢失
        this.originalCreateElement = document.createElement.bind(document);
        this.originalImage = window.Image;
    }

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

        // 1. 启动 DOM 监听
        this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            // 仅监听目标属性，提升性能
            attributeFilter: this.AttributeFilter,
        });

        // 2. 启动 API 劫持 (针对 createElement 创建的游离节点)
        this.hookCreateElement();
        this.hookImageConstructor(); // 劫持 new Image()

        // 3. 启动时先全量扫描一次
        this.replaceAllOnce();
    }

    public stop() {
        this.observer.disconnect();
        // 还原原生 API
        document.createElement = this.originalCreateElement;
        window.Image = this.originalImage;
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

    /**
     * 获取元素的处理锁
     */
    protected acquireLock(element: HTMLElement, attrName: string): boolean {
        let attrs = this.processingElements.get(element);
        if (!attrs) {
            attrs = new Set();
            this.processingElements.set(element, attrs);
        }

        if (attrs.has(attrName)) {
            // 已经在处理中
            return false;
        }

        attrs.add(attrName);
        return true;
    }

    /**
     * 释放元素的处理锁
     */
    protected releaseLock(element: HTMLElement, attrName: string): void {
        const attrs = this.processingElements.get(element);
        if (attrs) {
            attrs.delete(attrName);
            if (attrs.size === 0) {
                this.processingElements.delete(element);
            }
        }
    }

    public async processNodeTag(node: HTMLElement, attrName: string, noLog?: boolean) {
        // 1. 获取锁，防止并发处理
        if (!this.acquireLock(node, attrName)) {
            // 正在处理中，跳过
            return;
        }

        try {
            // 2. 基础校验：必须是目标标签
            if (!this.TARGET_TAGS.has(node.tagName?.toLowerCase())) {
                return;
            }

            const FLAG_ATTR_NAME = `ml-${attrName}`;
            const replacedUrlAttr = `ml-replaced-${attrName}`;

            // 3. 获取当前值（优先从标记属性获取）
            let originalUrl = node.getAttribute(FLAG_ATTR_NAME) || node.getAttribute(attrName);

            if (!originalUrl || originalUrl.toLowerCase() === 'null') {
                return;
            }

            // 忽略 data协议、空值 或 锚点
            if (originalUrl.startsWith('data:') || originalUrl.startsWith('#')) {
                return;
            }

            // 4. 检查是否已处理过相同的 URL
            const prevOriginal = node.getAttribute(FLAG_ATTR_NAME);
            const prevReplaced = node.getAttribute(replacedUrlAttr);

            if (originalUrl === prevOriginal && node.hasAttribute(replacedUrlAttr)) {
                // 已经处理过这个 URL
                return;
            }

            // 如果当前 src 等于我们之前替换的值，说明是我们自己设置的
            const currentSrc = node.getAttribute(attrName);
            if (currentSrc === prevReplaced) {
                return;
            }

            // 5. 更新原始 URL 标记
            node.setAttribute(FLAG_ATTR_NAME, originalUrl);

            // 6. 移除属性，阻断浏览器请求（只在有实际属性时移除）
            if (node.hasAttribute(attrName)) {
                node.removeAttribute(attrName);
            }

            try {
                // 7. 异步计算新 URL
                const newUrl = await this.replaceUrlAsync(originalUrl);

                // 8. 更新 DOM
                if (newUrl && newUrl !== originalUrl) {
                    // console.log(`[NodeMutationObserver] Replaced `, [originalUrl, newUrl, node]);
                    node.setAttribute(replacedUrlAttr, newUrl);
                    node.setAttribute(attrName, newUrl);
                } else {
                    node.removeAttribute(replacedUrlAttr);
                    node.setAttribute(attrName, originalUrl);
                }
            } catch (err) {
                console.error('[NodeMutationObserver] Replace failed, restoring:', [originalUrl, node, err]);
                !noLog && this.logger.error(`[NodeMutationObserver] Replace failed, restoring. [${originalUrl}]`);
                node.removeAttribute(replacedUrlAttr);
                node.setAttribute(attrName, originalUrl);
            }
        } finally {
            // 9. 释放锁
            this.releaseLock(node, attrName);
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

    /**
     * 核心拦截逻辑：为元素注入属性拦截器
     * 提取为公共方法，供 createElement 和 Image 构造函数共用
     */
    protected injectInterceptors(element: HTMLElement, tagName: string) {
        const lowerTagName = tagName?.toLowerCase();
        if (!this.TARGET_TAGS.has(lowerTagName)) return;

        const targetAttrs = this.TARGET_TAGS.get(lowerTagName)!;

        // 标记：防止重复注入
        const INJECTED_FLAG = '_ml_interceptors_injected';
        if ((element as any)[INJECTED_FLAG]) return;
        (element as any)[INJECTED_FLAG] = true;

        // 备份原始方法
        const originalSetAttribute = element.setAttribute.bind(element);
        const originalGetAttribute = element.getAttribute.bind(element);
        const originalRemoveAttribute = element.removeAttribute.bind(element);

        // --- A. 劫持 setAttribute ---
        element.setAttribute = (name: string, value: string) => {
            const lowerName = name?.toLowerCase();

            // 如果不是目标属性，或者是我们的标记属性，直接透传
            if (!targetAttrs.includes(lowerName) || lowerName.startsWith('ml-')) {
                return originalSetAttribute(name, value);
            }

            // console.log('[NodeMutationObserver] intercept setAttribute', [element, name, value]);

            // 尝试获取锁，如果无法获取说明正在处理中
            if (!this.acquireLock(element, lowerName)) {
                // 正在处理中，直接透传（避免干扰）
                return originalSetAttribute(name, value);
            }

            // 过滤无效值
            if (!value || value.toLowerCase() === 'null' ||
                value.startsWith('data:') || value.startsWith('#')) {
                this.releaseLock(element, lowerName);
                return originalSetAttribute(name, value);
            }

            // 检查是否已经处理过（避免重复处理）
            const FLAG_ATTR_NAME = `ml-${lowerName}`;
            const replacedUrlAttr = `ml-replaced-${lowerName}`;
            const prevOriginal = originalGetAttribute(FLAG_ATTR_NAME);
            const prevReplaced = originalGetAttribute(replacedUrlAttr);

            // 如果值等于我们之前记录的原始值或替换值，说明是重复触发或我们自己设置的
            if (value === prevOriginal || value === prevReplaced) {
                this.releaseLock(element, lowerName);
                return originalSetAttribute(name, value);
            }

            // 记录原始值
            originalSetAttribute(FLAG_ATTR_NAME, value);

            // 异步处理 URL 替换
            this.replaceUrlAsync(value).then((newUrl) => {
                if (newUrl && newUrl !== value) {
                    // console.log(`[NodeMutationObserver] injectInterceptors replaced`, [value, newUrl, element]);
                    originalSetAttribute(replacedUrlAttr, newUrl);
                    originalSetAttribute(name, newUrl);
                } else {
                    originalRemoveAttribute(replacedUrlAttr);
                    originalSetAttribute(name, value);
                }
            }).catch((err) => {
                console.error('[NodeMutationObserver] injectInterceptors failed:', [value, element, err]);
                this.logger.error(`[NodeMutationObserver] injectInterceptors failed: [${value}]`);
                originalRemoveAttribute(replacedUrlAttr);
                originalSetAttribute(name, value);
            }).finally(() => {
                // 处理完成，释放锁
                this.releaseLock(element, lowerName);
            });

            // 立即返回，阻止浏览器立即加载
            return;
        };

        // --- B. 劫持属性 Setter (如 img.src = '...') ---
        targetAttrs.forEach(attr => {
            // 跳过 ml- 前缀的属性
            if (attr.startsWith('ml-')) return;

            // 获取原始属性描述符
            let descriptor = Object.getOwnPropertyDescriptor(element, attr);
            if (!descriptor) {
                // 尝试从原型链获取
                let proto = Object.getPrototypeOf(element);
                while (proto && !descriptor) {
                    descriptor = Object.getOwnPropertyDescriptor(proto, attr);
                    proto = Object.getPrototypeOf(proto);
                }
            }

            // 如果找不到描述符或不可配置，跳过
            if (!descriptor || descriptor.configurable === false) {
                return;
            }

            // 保存原始的 getter（如果存在）
            const originalGetter = descriptor.get;
            const originalSetter = descriptor.set;

            // 定义新的属性拦截器
            Object.defineProperty(element, attr, {
                configurable: true,
                enumerable: descriptor.enumerable !== undefined ? descriptor.enumerable : true,
                get: function(this: HTMLElement) {
                    // 优先返回实际的属性值（通过 getAttribute）
                    const attrValue = originalGetAttribute(attr);
                    if (attrValue !== null) {
                        return attrValue;
                    }
                    // 如果没有属性值，使用原始 getter（如果存在）
                    if (originalGetter) {
                        return originalGetter.call(this);
                    }
                    return '';
                },
                set: function(this: HTMLElement, value: string) {
                    // 通过劫持后的 setAttribute 设置，触发拦截逻辑
                    this.setAttribute(attr, value);
                }
            });
        });
    }

    /**
     * 劫持 document.createElement
     */
    protected hookCreateElement() {
        document.createElement = <K extends keyof HTMLElementTagNameMap>(tagName: K, options?: ElementCreationOptions) => {
            const element = this.originalCreateElement(tagName, options);
            this.injectInterceptors(element, tagName);
            return element;
        };
    }

    /**
     * 新增：劫持 new Image()
     */
    protected hookImageConstructor() {
        // 必须使用 class extends 保持原型链一致，否则某些库检查 instanceOf Image 会失败
        // 这里利用闭包捕获 this 和 originalImage
        const thisPtr = this;
        const OriginalImage = this.originalImage;

        window.Image = class extends OriginalImage {
            constructor(width?: number, height?: number) {
                super(width, height);
                // 在实例创建后立即注入拦截逻辑
                // new Image() 生成的必然是 img 标签
                thisPtr.injectInterceptors(this as any as HTMLElement, 'img');
            }
        } as any;
    }


}
