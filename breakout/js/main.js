/**
 * 游戏主体控制类
 * @param {String} containerElemId 游戏的容器元素
 * @param {Object} opt_config 可选的配置参数
 * @constructor
 */
function Breakout(containerElemId, opt_config) {
  // 整个游戏的容器元素
  this.gameContinerElem = document.querySelector(containerElemId);
  // canvas 的容器元素
  this.canvasContainerElem = null;
  this.config = opt_config || Breakout.config;  // 游戏的配置参数
  this.dimensions = Breakout.dimensions;        // 游戏的默认尺寸

  // this.msPerFrame = 1000 / FPS;                 // 每帧的时间
  this.activited = false;                       // 游戏是否激活
  this.playingIntro = false;                    // 是否正在执行开场动画
  this.playing = false;                         // 游戏是否开始
  this.droped = false;                          // 小球是否落到地面
  this.paused = false;                          // 游戏是否暂停

  this.keys = [];                               // 存储按下的键

  // 挡板
  this.paddle = null;

  // 小球
  this.ball = null;

  // 面板
  this.panel = null;

  // 加载图片资源并初始化游戏
  this.loadImage();

  // 开始监听键盘事件
  this.startListener();
};

// 挂载到 window 对象上
window['Breakout'] = Breakout;

// 游戏的帧率
var FPS = 60;

// 游戏的配置参数
Breakout.config = {
  PADDLE_BOTTOM_MARGIN: 20,   // 挡板距底部的距离
};

// 游戏的默认尺寸
Breakout.dimensions = {
  WIDTH: 600,
  HEIGHT: 400,
};

// 雪碧图信息
Breakout.spriteDefinition = {
  PADDLE: { x: 124, y: 2 },           // 挡板
  BALL: { x: 124, y: 28 },            // 球
  BRICK: { x: 2, y: 2 },              // 砖块
  RESTART: { x: 156, y: 28 },         // 重新开始按钮
  GAMEOVER_TEXT: { x: 124, y: 60 },   // Game Over 文字
};

// 游戏中用到的 CSS 类名
Breakout.classes = {
  CANVAS_CONTINER: 'canvas-container',  // 画布容器
  CANVAS: 'breakout-canvas',            // 游戏画布
  ARCADE_MODE: 'arcade-mode',           // 街机模式
};

// 游戏用到的键盘码
Breakout.keyCodes = {
  LEFT: { '37': 1, '65': 1 },
  RIGHT: { '39': 1, '68': 1 },
  START: { '32': 1 },
};

// 游戏用到的事件
Breakout.events = {
  LOAD: 'load',
  KEYDOWN: 'keydown',
  KEYUP: 'keyup',
  TRANSITION_END: 'webkitTransitionEnd',
  FOCUS: 'focus',
  BLUR: 'blur',
};

Breakout.prototype = {
  init: function () {
    this.canvasContainerElem = document.createElement('div');
    this.canvasContainerElem.className = Breakout.classes.CANVAS_CONTINER;

    this.canvas = createCanvas(this.canvasContainerElem, this.dimensions);

    this.canvasCtx = this.canvas.getContext('2d');
    this.canvasCtx.fillStyle = '#f7f7f7';
    this.canvasCtx.fill();

    // 初始化挡板
    this.paddle = new Paddle(this.canvas, this.spriteDef.PADDLE);

    // 初始化小球
    this.ball = new Ball(this.canvas, this.spriteDef.BALL);

    // 初始化面板
    this.panel = new Panel(this.canvas,
      this.spriteDef.RESTART, this.spriteDef.GAMEOVER_TEXT);

    // 将游戏输出到页面中
    this.gameContinerElem.appendChild(this.canvasContainerElem);

    this.showStartButton();
    this.update();
  },
  // 加载雪碧图资源
  loadImage: function () {
    // 获取雪碧图的坐标信息
    this.spriteDef = Breakout.spriteDefinition;
    Breakout.imageSprite = document.getElementById('breakout-sprite-img');

    // 雪碧图加载完成
    if (Breakout.imageSprite.complete) {
      this.init();
    } else {
      Breakout.imageSprite.addEventListener(Breakout.events.LOAD,
        this.init.bind(this));
    }
  },
  // 显示开始按钮
  showStartButton: function () {
    // 不绘制 Game Over 文字
    this.panel.draw(false);
  },
  // 更新游戏画布
  update: function () {
    if (this.playing) {
      this.clearCanvas();

      // 最后一次按下的键盘码
      var currentKeyCode = this.keys[0];
      var isLeftMove = Breakout.keyCodes.LEFT[currentKeyCode];
      var isRightMove = Breakout.keyCodes.RIGHT[currentKeyCode];
      var isMove = isLeftMove || isRightMove;

      // 小球是否落到地面
      var isDroped = this.ball.update();

      if (isDroped) {
        this.gameOver();
      }

      // 更新挡板
      this.paddle.update(isMove, isLeftMove);

      // 是否碰撞 第三个参数传入 canvas 进行 debug
      var collision = checkCollision(this.ball, this.paddle);
      // var collision = checkCollision(this.ball, this.paddle, this.canvas);

      // 小球的垂直中心
      var ballCenter = this.ball.yPos + this.ball.dimensions.HEIGHT / 2;
      // 挡板的垂直中心
      var paddleCenter = this.paddle.yPos + this.paddle.dimensions.HEIGHT / 2;

      if (collision == 'top') { // 小球撞到挡板顶部
        // 小球向着障碍物运动
        if ((ballCenter - paddleCenter) >
          (ballCenter - this.ball.speedY - paddleCenter)) {
          this.ball.speedY *= -1;
        } else {
          this.ball.speedY *= 1;
        }
      } else if (collision == 'side') { // 小球撞到挡板两侧
        if ((ballCenter - paddleCenter) >
          (ballCenter - this.ball.speedY - paddleCenter)) {
          this.ball.speedX *= -1;
          this.ball.speedY *= -1;
        } else {
          this.ball.speedX *= 1;
          this.ball.speedY *= 1;
        }
      }

      // 小球没有掉落
      if (!this.droped) {
        // 进行下一次更新
        this.reqAFId = requestAnimationFrame(this.update.bind(this));
      }
    }
  },
  // 监听事件
  startListener: function () {
    document.addEventListener(Breakout.events.KEYDOWN, this);
    document.addEventListener(Breakout.events.KEYUP, this);
  },
  stopListener: function () {
    document.removeEventListener(Breakout.events.KEYDOWN, this);
    document.removeEventListener(Breakout.events.KEYUP, this);
  },
  // 处理事件
  handleEvent: function (e) {
    return (function (eType, events) {
      switch(eType) {
        case events.KEYDOWN:
          this.onKeyDown(e);
          break;
        case events.KEYUP:
          this.onKeyUp(e);
          break;
        default: break;
      }
    }.bind(this))(e.type, Breakout.events);
  },
  onKeyDown: function (e) {
    // 游戏没有暂停，并且小球没有落到地面上
    if (!this.droped && !this.paused) {
      // 按下空格，开始游戏
      if (Breakout.keyCodes.START[e.keyCode] &&
        !this.playing && !this.playingIntro) {
        this.playIntro(); // 执行开场动画
      }

      // 只存储新的键盘码
      if (this.playing && e.keyCode != this.keys[0]) {
        this.keys.unshift(e.keyCode);
      }
    }
  },
  onKeyUp: function (e) {
    // 松开了当前挡板移动方向对应的按键
    if (e.keyCode == this.keys[0]) {
      this.keys.length = 0;
    }

    if (this.droped && Breakout.keyCodes.START[e.keyCode]) {
      this.restart();
    }
  },
  // 执行开场动画
  playIntro: function () {
    if (!this.activited && !this.droped) {
      this.activited = true;
      this.playingIntro = true;
      this.startArcadeMode();
    }
  },
  // 进入街机模式（全屏游戏）
  startArcadeMode: function () {
    var fullScale = 1; // 扩大后的尺寸占屏幕的比例
    var winHeight = window.innerHeight * fullScale;
    var winWidth = window.innerWidth * fullScale;
    var scaleHeight = winHeight / this.dimensions.HEIGHT;
    var scaleWidth = winWidth / this.dimensions.WIDTH;

    // 获取宽和高中缩放比例较小的那一个，最小为 1
    var scale = Math.max(1, Math.min(scaleWidth, scaleHeight));
    
    document.body.classList.add(Breakout.classes.ARCADE_MODE);

    // 扩大画布
    this.canvasContainerElem.style.transform = 'scale(' + scale + ')';

    // 监听 CSS transition 事件是否结束
    this.canvasContainerElem.addEventListener(Breakout.events.TRANSITION_END,
      this.startGame.bind(this));
  },
  // 开始游戏
  startGame: function () {
    this.playingIntro = false; // 开场动画结束
    this.playing = true;       // 游戏开始

    this.update();

    window.addEventListener(Breakout.events.FOCUS,
      this.onFocusChange.bind(this));

    window.addEventListener(Breakout.events.BLUR,
      this.onFocusChange.bind(this));
  },
  // 当窗口失去焦点，暂停游戏
  onFocusChange: function (e) {
    if (e.type == 'blur') {
      this.stop();
    } else {
      this.play();
    }
  },
  // 进行游戏
  play: function () {
    if (!this.droped) {
      this.playing = true;
      this.paused = false;
      this.update();
    }
  },
  // 暂停游戏
  stop: function () {
    this.playing = false;
    this.paused = true;
    cancelAnimationFrame(this.reqAFId);
    this.reqAFId = 0;
  },
  // 游戏结束
  gameOver: function () {
    this.stop();
    this.droped = true;

    // 绘制 Game Over 面板
    if (!this.panel) {
      this.panel = new Panel(this.canvas, Breakout.spriteDef.RESTART,
        Breakout.spriteDef.GAMEOVER_TEXT);
    } else {
      this.panel.draw(true);
    }
  },
  // 重新开始游戏
  restart: function () {
    this.playing = true;
    this.playingIntro = false;
    this.droped = false;
    this.paused = false;
    this.ball.reset();
    this.update();
  },
  // 清空画布
  clearCanvas: function () {
    this.canvasCtx.clearRect(0, 0, this.dimensions.WIDTH,
      this.dimensions.HEIGHT);
  },
};