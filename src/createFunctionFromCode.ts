export function createFunctionFromCode(source: string) {

    // 使用新源代码创建新的函数
    // 由于我们要保留函数的参数名称（name），我们需要一些解析逻辑
    let paramsStr = source.substring(source.indexOf('(') + 1, source.indexOf(')'));
    let params = paramsStr.split(',').map(p => p.trim());
    let body = source.substring(source.indexOf('{') + 1, source.lastIndexOf('}'));

    let modifiedFunction = new Function(...params, body);
    return modifiedFunction;
}
