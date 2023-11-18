# YouTube Enhancer Extension 🚀

The YouTube Enhancer Extension is a powerful browser extension designed to enhance your YouTube experience.

[![Get the YouTube Enhancer Extension on Firefox](https://img.shields.io/amo/v/youtube-enhancer-vc?label=Firefox&logo=Firefox-Browser&style=for-the-badge)](https://addons.mozilla.org/en-US/firefox/addon/youtube-enhancer-vc/)
[![GitHub Release](https://img.shields.io/github/v/release/VampireChicken12/youtube-enhancer?label=Latest%20Release&style=for-the-badge&logo=Github)](https://github.com/VampireChicken12/youtube-enhancer/releases/latest)

<br/>

![Downloads](https://img.shields.io/github/downloads/VampireChicken12/youtube-enhancer/total.svg)
![Stars](https://img.shields.io/github/stars/VampireChicken12/youtube-enhancer.svg)

## Table of Contents

- [Introduction](#-introduction)
- [Features](#%EF%B8%8F-features)
- [Building the Extension](#%EF%B8%8F-building-the-extension)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Contributing](#-contributing)
- [Internationalization (i18n)](#-internationalization-i18n)
- [License](#-license)

## 🌟 Introduction

YouTube Enhancer is a browser extension that aims to improve your YouTube experience by providing a set of customizable features and enhancements. Whether you want to fine-tune your video settings, improve navigation, or simplify common tasks, this extension has you covered.

## 🎛️ Features

### 1. Miscellaneous Settings

- **Remember Last Volume:** This option remembers the last volume set for Shorts and the Watch page separately, applying the appropriate volume when you revisit each type of video content.

- **Enable Maximize Player Button:** Adds a button to the player to maximize the video player for a better viewing experience.

- **Enable Video History:** Keeps track of the position of the videos you have watched and asked to resume playback upon loading the video again.

- **Remaining Time:** Keep track of the time remaining on your video with a dynamic display.

- **Enable Loop Button:** Adds a dedicated button to toggle the video player loop.

- **Enable Hide Scrollbar:** Hides the pages scroll bar

### 2. Scroll Wheel Volume Control Settings

- **Enable Scroll Wheel Volume Control:** Control video volume with your mouse's scroll wheel for quick and easy adjustments.

- **OSD Color:** Choose the color of the On-Screen Display (OSD) for volume control.

- **OSD Type:** Define the type of OSD, including text, line, round, or no display.

- **OSD Position:** Set where the OSD should be displayed on the screen (top left, top right, bottom left, bottom right, or center).

- **OSD Opacity:** Adjust the opacity of the OSD for better visibility.

- **Amount to Adjust Volume per Scroll:** Define how much the volume should change with each scroll.

- **Time to Hide OSD:** Set the time delay before the OSD disappears.

- **Padding for OSD:** Define the amount of padding to add to the OSD (applies to corner OSD).

### 3. Automatic Quality Settings

- **Enable Automatically Set Quality:** Automatically sets the video quality to the chosen level.

- **Player Quality:** Choose the desired video quality for playback.

### 4. Playback Speed Settings

- **Enable Forced Playback Speed:** Allows users to force videos to play at a specific speed.

- **Player Speed:** Define the playback speed for videos.

### 5. Volume Boost Settings

- **Enable Volume Boost:** Boosts the volume of the video being watched.

- **Volume Boost Amount (dB):** Specify the amount by which to boost the volume.

### 6. Screenshot Settings

- **Enable Screenshot Button:** Adds a button to the player for taking screenshots of videos.

- **Screenshot Save Type:** Choose whether to save screenshots as files or to the clipboard.

- **Screenshot Format:** Define the format in which screenshots should be saved (PNG, JPEG, or WEBP).

## 🛠️ Building the Extension

To build the YouTube Enhancer extension from scratch, follow these steps. We'll start with installing the necessary dependencies:

### 1. Install Required Software

Before you begin, ensure you have the following software installed on your system:

- **Node.js and npm:** If you don't have Node.js and npm (Node Package Manager) installed, you can download and install them from the official website: [Node.js Downloads](https://nodejs.org/en/download/).

- **Git:** If you don't have Git installed, download and install it from [Git Downloads](https://git-scm.com/downloads).

### 2. Clone the Repository

Next, open your terminal (command prompt or shell) and navigate to the directory where you want to store the YouTube Enhancer extension project. Run the following command to clone the repository:

```bash
git clone https://github.com/VampireChicken12/youtube-enhancer.git
```

### 3. Navigate to the Project Directory

Change your working directory to the project folder:

```bash
cd youtube-enhancer
```

### 4. Install Project Dependencies

Inside the project folder, run the following command to install the required dependencies:

```bash
npm install
```

### 5. Build the Extension

After the installation is complete, build the extension using the following command:

```bash
npm run build
```

This command will bundle the extension's code and assets into a 'dist' directory.

### 6. Load the Extension

Now that you've built the extension, you can load it into your browser for testing:

- **Google Chrome:** Open Chrome and go to `chrome://extensions/`. Enable 'Developer mode', then click 'Load unpacked' and select the 'dist/Chrome' directory.

- **Microsoft Edge:** Open Edge and go to `edge://extensions/`. Enable 'Developer mode', then click 'Load unpacked' and select the 'dist/Chrome' directory.

- **Brave:** Open Brave and go to `brave://extensions/`. Enable 'Developer mode', then click 'Load unpacked' and select the 'dist/Chrome' directory.

- **Mozilla Firefox:** Open Firefox and go to `about:debugging#/runtime/this-firefox`. Click on 'Load Temporary Add-on' and select any file in the 'dist/Firefox" directory.

### 7. Test the Extension

Your extension should now be loaded. Test it on YouTube to ensure it functions as expected.

That's it! You've successfully built the YouTube Enhancer extension from scratch.

## ⚙ Configuration

The extension provides a range of configuration options to tailor your YouTube experience to your liking. Simply access the extension's settings page to customize its behavior.

## 🔧 Usage

Using the YouTube Enhancer Extension is straightforward:

1. Ensure the extension is installed and the icon is visible in your browser's toolbar.

2. Click on the extension icon to access its features and settings.

3. Configure the extension according to your preferences. Adjust settings related to volume control, on-screen displays, video quality, playback speed, volume boost, and more.

4. Save your changes to apply them to your YouTube experience.

5. Enjoy an enhanced YouTube experience with the extension's features working seamlessly in the background.

## 📝 Contributing

Contributions to the YouTube Enhancer Extension are welcome! If you'd like to contribute to the development of this extension or report issues, please refer to the project's GitHub repository.

## 🌐 Internationalization (i18n)

### Crowdin Translation Project

Our YouTube Enhancer extension supports multiple languages to provide a more inclusive experience for users around the world. We use Crowdin for managing translations.

### Contributing Translations

We welcome contributions to improve translations and make the extension accessible to a wider audience. If you'd like to contribute translations or suggest improvements, follow these steps:

1. Visit our [Crowdin project](https://crowdin.com/project/youtube-enhancer).
2. Select your language and start translating.
3. If your language is not listed, feel free to request its addition.

## 📜 License

The YouTube Enhancer Extension is open-source and available under the [MIT License](LICENSE). Feel free to explore, modify, and share it as needed.

## 🌟 Star History

<a href="https://star-history.com/#VampireChicken12/youtube-enhancer&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=VampireChicken12/youtube-enhancer&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=VampireChicken12/youtube-enhancer&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=VampireChicken12/youtube-enhancer&type=Date" />
  </picture>
</a>
