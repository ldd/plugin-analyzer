
Plugin Analyzer
===================


Uses ES6 Proxies to take a peek at the code used by the plugins.

At the moment, this plugin DOES NOT support the NW.js runtime included with RPG Maker MV 1.5.

In other words, **you must export to web to use this plugin**

Usage
-------------

 1) Copy this plugin to your project's folder directory
 
 2) Place this plugin at the top of your plugins. (DO NOT PLACE ANYTHING BEFORE IT)
 
 3) If possible, disable all your plugins
 
 4) Export to web, open using a browser that supports [ES6 Proxies](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Proxy#Browser_compatibility)
 
 5) Start your game

> tip: If your game crashes, you can edit `game.js` in your output folder and comment out everything after `PluginLoader(...)`

API
-------------
`PluginAnalyzer.printLoggers()`

>output all the logged information to console

`PluginAnalyzer.printByPlugin(), printLoggers`

> output formatted logged information

![sampleOutput](https://user-images.githubusercontent.com/1187476/29600195-83502a8a-87a2-11e7-982b-8de957bbe7c9.png)

Usecase
--------------

Take a look at the following output

![sampleTroubleshoot](https://user-images.githubusercontent.com/1187476/29600196-861bae7e-87a2-11e7-9f78-fc9ebf5814ee.png)

In that image, we can clearly see that `LoadSystemImages` was perhaps used incorrectly.

If we take a look at the source, we see that `Scene_Boot.loadSystemImages` is defined in `rpg_scenes`.

The plugin `MadeWithMv` attempts to access  `Scene_boot.prototype.loadSystemImages` instead.

It is possible that the developer intended for this usage, but that seems unlikely: 

*all* other managers set properties in their prototypes. 

Changelog
-------------
v.0.1 initial release
