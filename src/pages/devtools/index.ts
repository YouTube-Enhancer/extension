import browser from "webextension-polyfill";
void browser.devtools.panels.create("YouTube Enhancer", "icons/icon_16.png", "src/pages/devtools/panel.html");
