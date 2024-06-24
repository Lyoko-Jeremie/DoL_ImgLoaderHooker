export interface SimpleDolFunctionHookItem {
    windowFunctionString: string;
    oldFunction: CallableFunction;
    replaceFunction: CallableFunction;
    hookFunction: CallableFunction;
}

export class SimpleDolFunctionHook {
    table: Map<string, SimpleDolFunctionHookItem> = new Map<string, SimpleDolFunctionHookItem>();

    hook(windowFunctionString: string, hookFunction: CallableFunction) {
        if (this.table.has(windowFunctionString)) {
            console.error('[ImageLoaderHook][SimpleDolFunctionHook] hook() duplicate hook', [windowFunctionString]);
            return;
        }
        const oldFunction = (window as any)[windowFunctionString];
        if (!oldFunction) {
            console.error('[ImageLoaderHook][SimpleDolFunctionHook] hook() cannot find windowFunction', [windowFunctionString]);
            return;
        }
        const replaceFunction = (...arg: any) => {
            const r = oldFunction(...arg);
            hookFunction();
            return r;
        };
        (window as any)[windowFunctionString] = replaceFunction;
        const h: SimpleDolFunctionHookItem = {
            windowFunctionString: windowFunctionString,
            oldFunction: oldFunction,
            replaceFunction: replaceFunction,
            hookFunction: hookFunction,
        };
        this.table.set(windowFunctionString, h);
        console.log('[ImageLoaderHook][SimpleDolFunctionHook] hook() ok', [windowFunctionString, h]);
    }

}
