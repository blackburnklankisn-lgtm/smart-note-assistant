const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let isQuitting = false; // 标记是否是通过托盘菜单点击了“退出”

function createWindow() {
  // 1. 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    // 确保 electron 目录下有 icon.png，否则托盘图标可能不显示或报错
    icon: path.join(__dirname, 'icon.png'), 
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
  });

  // 虽然我们隐藏了默认菜单栏，但为了让 Ctrl+C/V 等快捷键生效，
  // 我们必须设置一个 Application Menu（即使不可见或者被隐藏）
  // mainWindow.setMenuBarVisibility(false); // 这行代码通常只隐藏视觉，但有时会禁用快捷键

  // 加载打包后的页面
  const indexPath = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(indexPath);

  // 2. 注释掉开发者工具 (按您的要求)
  // mainWindow.webContents.openDevTools();

  // 3. 拦截关闭事件 (核心逻辑)
  mainWindow.on('close', (event) => {
    // 如果不是用户主动点击托盘的“退出”，则仅仅隐藏窗口
    if (!isQuitting) {
      event.preventDefault(); // 阻止默认的销毁窗口行为
      mainWindow.hide();      // 隐藏窗口（这会自动从底部任务栏移除）
      return false;
    }
    // 如果 isQuitting 为 true，则允许窗口正常关闭
  });

  // 4. [新增] 右键菜单支持 (Context Menu)
  // Electron 默认没有右键菜单，需要手动实现
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menuTemplate = [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { type: 'separator' },
      { role: 'selectAll' }
    ];

    // 仅在用户点击了可编辑区域，或者选中了文本时，才弹出菜单
    if (params.isEditable || params.selectionText.length > 0) {
      const menu = Menu.buildFromTemplate(menuTemplate);
      menu.popup({ window: mainWindow });
    }
  });
}

function createMenu() {
  // 创建标准的应用程序菜单，确保快捷键可用
  const template = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createTray() {
  // 图标路径：请确保您的 electron 文件夹里有一个名为 icon.png 的文件
  const iconPath = path.join(__dirname, 'icon.png');
  
  // 创建系统托盘
  tray = new Tray(iconPath);
  
  // 设置鼠标悬停时的提示文字
  tray.setToolTip('Smart Note AI');

  // 创建托盘右键菜单
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: '显示主界面 (Show App)', 
      click: () => mainWindow.show() 
    },
    { 
      label: '退出 (Quit)', 
      click: () => {
        isQuitting = true; // 标记为真退出
        app.quit();        // 执行退出
      } 
    }
  ]);

  tray.setContextMenu(contextMenu);

  // 点击托盘小图标时，也可以显示窗口
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

app.whenReady().then(() => {
  createMenu(); // 初始化菜单
  createWindow();
  createTray();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 因为我们要常驻后台，所以这里不再需要在 window-all-closed 时 quit
// 除非显式调用 app.quit
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    // app.quit(); // 注释掉这一行，保持后台运行
  }
});