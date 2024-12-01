//
window.modImgLoaderHooker.addListDynamicImageTagReplacePassage([
  "passageName1",
  "passageName2",
  "passageName3",
  "passageName4",
  "passageName5",
  "passageName6",
  "passageName7",
]);
//
window.modImgLoaderHooker.addDynamicImageTagReplacePassage("onlyOnePassageName");


// call `replaceAllImageInHtmlElement` to replace all image tag in the special html element
window.modImgLoaderHooker.replaceAllImageInHtmlElement(document.body).then(r => {}).catch(e => console.error(e));
// or
await window.modImgLoaderHooker.replaceAllImageInHtmlElement(document.body);

