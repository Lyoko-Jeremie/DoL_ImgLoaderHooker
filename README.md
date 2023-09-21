
# ModLoaderGui

---

## 用法

![](https://raw.githubusercontent.com/wiki/Lyoko-Jeremie/sugarcube-2-ModLoaderGui/how-to-load-mod.png)


在 `当前已加载的Mod列表` 中会显示当前加载的Mod及其加载顺序  
显示的格式是：`[<Mod来源>] <Mod名字> {v:<Mod版本号>}`  

其中 `Mod版本号` 和 `Mod名字` 是编写在Mod的 `boot.json` 文件中的信息  

`Mod来源` 有以下几种：
1. `Local` 从Html中加载的Mod（内嵌在Html中的Mod）
2. `Remote` 从远程服务器加载的Mod（从远程服务器下载的Mod）
3. `SideLoad IndexDB` 从IndexDB中旁加载的Mod
4. `SideLoad LocalStorage` 从LocalStorage中旁加载的Mod

当前的旁加载Mod的存储使用的是IndexDB ， 由于LocalStorage限制了最大存储空间会导致部分体积大的Mod加载失败，所以暂不使用


## 如何加载mod

1. 点击界面左下角 `Mod管理器` 
2. 选择要添加的旁加载Mod的Zip文件
3. 点击 `添加旁加载Mod` 按钮
4. 此时 `添加旁加载Mod的结果` 会显示Mod是否加载成功
5. 加载成功的Mod会显示在 `当前设定的旁加载Mod列表` 
6. 点击最上方的 `重新载入` 刷新页面来使Mod生效

## 如何移除mod

1. 在 `可移除的旁加载Mod列表` 下拉菜单中选择想要移除的Mod
2. 点击 `移除选定的旁加载Mod` 按钮
3. 移除后的Mod加载状态会显示在 `当前设定的旁加载Mod列表`
4. 点击最上方的 `重新载入` 刷新页面来使Mod生效


---

编译脚本

```shell
yarn run ts:w
yarn webpack:w
```

---

当游戏加载完成后，按 Ctrl+M 打开 ModLoaderGui 界面，再次按下 Ctrl+M 关闭 ModLoaderGui 界面。

1. 可查看当前已经加载的Mod列表
2. 可查看当前旁加载的Mod列表
3. 可添加或移除旁加载Mod
4. 因为Mod的加载是在加载页面前进行的，所有添加或移除的Mod不会立即生效，需要刷新页面后才会生效

