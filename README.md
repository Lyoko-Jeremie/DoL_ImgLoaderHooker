# ModLoader DoL ImageLoaderHook

```json lines
{
  "imgFileList": [
    // place your image file here
    "img/xxx/aaa/bbb/ccc.png",
    "img/xxx/111/222/333.png"
  ],
  "addonPlugin": [
    // simple write this :
    {
      "modName": "ModLoader DoL ImageLoaderHook",
      "addonName": "ImageLoaderAddon",
      "modVersion": "^2.3.0",
      "params": [
      ]
    }
  ],
  "dependenceInfo": [
    // dont forgot this :
    {
      "modName": "ModLoader DoL ImageLoaderHook",
      "version": "^2.3.0"
    }
  ]
}
```

# TroubleShooting

如果遇到图片没有按预期加载，可以在游戏中看到形如下图形式的错误：

If images are not loading as expected and you see an error resembling the image below in the game:
![ErrorImg](doc/clickError.jpg)
可以按照以下步骤定位问题：
1. 检查 `boot.json`，是否 `imgFileList` 中包含了那个文件。
2. 检查 `boot.json`，是否 `addonPlugin` 中包含了 `ImageLoaderAddon` 的内容（参考上面的json）。
3. 检查 `boot.json`，是否 `dependenceInfo` 中包含了 `ModLoader DoL ImageLoaderHook` 的部分（参考上面的json）。
4. 检查 Mod 的 zip 文件，里面是否包含了对应的 png，且在与图中错误的相同路径上。

Follow these steps to troubleshoot the issue:
1. Check `boot.json` to see if `imgFileList` contains the file in question.
2. Check `boot.json` to see if `addonPlugin` includes the content of `ImageLoaderAddon` (refer to the above json for reference).
3. Check `boot.json` to see if `dependenceInfo` contains the `ModLoader DoL ImageLoaderHook` section (refer to the above json for reference).
4. Examine the zip file of the Mod to see if it contains the corresponding png and whether it is located on the same path as the error image.
