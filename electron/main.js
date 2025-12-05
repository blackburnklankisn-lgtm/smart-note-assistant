const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'icon.png'), // 如果你有图标的话
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // 允许加载本地资源，解决部分跨域或本地文件加载问题
    },
  });

  // 隐藏菜单栏（可选，让界面更像原生应用）
  mainWindow.setMenuBarVisibility(false);

  // 加载打包后的 index.html
  // 注意：这要求你必须先运行 npm run build 生成 dist 目录
  // 使用 loadFile 加载本地文件
  const indexPath = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(indexPath);

  // 🛠️ 关键修改：默认打开开发者调试工具 (F12)
  // 如果屏幕依然白屏，请看右侧控制台(Console)里的红色报错信息
  mainWindow.webContents.openDevTools();
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});