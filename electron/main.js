const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let isQuitting = false; // 标记是否是通过托盘菜单点击了“退出”

function createWindow() {
  // 检查图标是否存在，防止报错
  const iconPath = path.join(__dirname, 'icon.png');
  const hasIcon = fs.existsSync(iconPath);

  // 1. 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    // 仅当图标存在时才设置，否则使用默认图标
    icon: hasIcon ? iconPath : undefined, 
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
  });

  // 加载打包后的页面
  // 注意：npm run build 会生成 dist 文件夹，所以这里指向 ../dist/index.html
  const indexPath = path.join(__dirname, '../dist/index.html');
  
  // 开发环境下（如果是 electron . 直接运行且没有 build），可以考虑加载 localhost
  // 但为了简化逻辑，这里默认加载文件。如果文件不存在，说明没 build。
  mainWindow.loadFile(indexPath).catch(e => {
    console.error("Failed to load index.html. Did you run 'npm run build'?", e);
  });

  // 3. 拦截关闭事件 (核心逻辑 - 最小化到托盘)
  mainWindow.on('close', (event) => {
    // 如果不是用户主动点击托盘的“退出”，则仅仅隐藏窗口
    if (!isQuitting) {
      event.preventDefault(); // 阻止默认的销毁窗口行为
      mainWindow.hide();      // 隐藏窗口（这会自动从底部任务栏移除）
      return false;
    }
    // 如果 isQuitting 为 true，则允许窗口正常关闭
  });

  // 4. 右键菜单支持 (Context Menu)
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
  const iconPath = path.join(__dirname, 'icon.png');
  const hasIcon = fs.existsSync(iconPath);
  
  // 如果没有图标，托盘功能可能无法正常创建，或者显示为空白
  // 建议在 electron 目录下放一个 icon.png
  if (!hasIcon) {
    console.log("No icon.png found in electron folder. Tray might look generic.");
  }

  // 创建系统托盘
  // 注意：如果没有图标文件，Tray 初始化可能会失败，这里加个简单的容错
  try {
    tray = new Tray(hasIcon ? iconPath : ''); // 如果没图标，传空路径可能会导致某些系统不显示
    
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
  } catch (e) {
    console.warn("Failed to create Tray icon. Please ensure 'electron/icon.png' exists.", e);
  }
}

app.whenReady().then(() => {
  createMenu(); // 初始化菜单
  createWindow();
  createTray();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    // app.quit(); // 保持后台运行
  }
});