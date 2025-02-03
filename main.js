let scene, camera, renderer, cube;
let rotationSpeed = 0.002; // 旋转速度系数，可在此修改
let currentFace = 0;
let autoRotate = true;
let controls, stats, lastFrameTime = 0;
let targetFPS = 60;
let frameInterval = 1000 / targetFPS;
const faceTexts = ['前', '后', '右', '左', '上', '下'];

let textSettings = {
    font: 'Arial',
    fontSize: 100,
    bgColor: '#ffffff',
    bgOpacity: 0.3
};

let backgroundSettings = {
    color: '#ffffff',
    image: 'bg.jpg',
    blendMode: 'normal'
};

init();
animate();

function init() {
    // 场景初始化
    scene = new THREE.Scene();
    
    // 相机
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    
    // 渲染器
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.querySelector('#canvas'),
        alpha: true,
        antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // 解决黑色背景问题

    // 创建固定光源系统
    createFixedLighting();

    // 创建立方体
    createCube();
    
    // 窗口调整
    window.addEventListener('resize', onWindowResize);

    // 初始化性能监控
    stats = new Stats();
    stats.showPanel(0);
    
    // 控制器配置
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;  // 降低阻尼值
    controls.rotateSpeed = 0.8;     // 提升旋转灵敏度
    controls.enablePan = false;     // 禁用平移

    // 自动旋转控制
    controls.addEventListener('start', () => autoRotate = false);
    controls.addEventListener('end', () => autoRotate = true);
    
    // 创建CSS控制面板
    createCSSControls();
}

// 创建自定义控制面板
function createCSSControls() {
    const panel = document.getElementById('controlPanel');
    
    // 控制面板HTML结构
    panel.innerHTML = `
        <div class="control-group">
            <h3>背景设置</h3>

            <label>背景图片</label>
            <input type="file" id="bgImage" accept="image/*">

            <!-- 模糊控制 -->
            <div class="control-group">
                <label>模糊强度 <span id="blurValue">10</span>px</label>
                <input type="range" id="blurAmount" min="0" max="20" value="10">
            </div>
        </div>

        <div class="control-group">
            <h3>显示控制</h3>
            <label>帧率限制 (30-144)</label>
            <input type="range" id="fpsLimit" min="30" max="144" value="${targetFPS}">
            <span id="fpsValue">${targetFPS}</span>
            
            <label>自动旋转</label>
            <label class="switch">
                <input type="checkbox" id="autoRotate" checked>
                <span class="slider"></span>
            </label>
        </div>

        <div class="control-group">
            <h3>材质控制</h3>
            <label>玻璃颜色</label>
            <input type="color" id="glassColor" value="#ffffff">
            
            <label>粗糙度 <span id="roughnessValue">0.4</span></label>
            <input type="range" id="roughness" min="0" max="1" step="0.05" value="0.4">
            
            <label>透光度 <span id="transmissionValue">0.9</span></label>
            <input type="range" id="transmission" min="0.5" max="1" step="0.05" value="0.65">
            
            <label>材质厚度 <span id="thicknessValue">1.2</span></label>
            <input type="range" id="thickness" min="0.1" max="3" step="0.1" value="1.2">

            <label>金属质感 <span id="metalnessValue">0.2</span></label>
                <input type="range" id="metalness" min="0" max="1" step="0.05" value="0.2">
        </div>

        <div class="control-group">
            <h3>文字设置</h3>
            <label>字体选择</label>
            <select id="fontSelect">
                <option>Arial</option>
                <option>Helvetica</option>
                <option>Times New Roman</option>
                <option>Courier New</option>
            </select>
            
            <label>背景颜色</label>
            <input type="color" id="bgColor" value="#ffffff">
            
            <label>背景透明度 <span id="bgOpacityValue">0.3</span></label>
            <input type="range" id="bgOpacity" min="0" max="1" step="0.1" value="0.3">

            <label>字号 <span id="fontSizeValue">60</span>px</label>
                <input type="range" id="fontSize" min="20" max="100" value="60">
        </div>
       <div class="control-group">
                <h4>贴图上传</h4>
                <div class="texture-grid">
                    ${[0,1,2,3,4,5].map(i => `
                        <div class="texture-item">
                            <span>面 ${i+1}</span>
                            <input type="file" class="textureUpload" data-face="${i}" accept="image/*">
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // 事件绑定
    document.getElementById('blurAmount').addEventListener('input', function(e) {
        const value = e.target.value;
        document.getElementById('blurValue').textContent = value;
        document.querySelector('.control-panel').style.backdropFilter = `blur(${value}px)`;
    });
    
    document.getElementById('fontSize').addEventListener('input', function(e) {
        const value = e.target.value;
        document.getElementById('fontSizeValue').textContent = value;
        textSettings.fontSize = value;
        updateTextures();
    });
    
    document.getElementById('metalness').addEventListener('input', function(e) {
        const value = parseFloat(e.target.value);
        document.getElementById('metalnessValue').textContent = value.toFixed(2);
        cube.material.forEach(mat => mat.metalness = value);
    });
    
    // 面板切换逻辑
    let isPanelVisible = true;
    document.getElementById('togglePanel').addEventListener('click', () => {
        isPanelVisible = !isPanelVisible;
        document.querySelector('.control-panel').classList.toggle('hidden', !isPanelVisible);
    });

   // 帧率控制
   const fpsLimit = document.getElementById('fpsLimit');
   fpsLimit.value = targetFPS; // 初始化显示当前值
   document.getElementById('fpsValue').textContent = targetFPS;

   fpsLimit.addEventListener('input', function(e) {
       let value = parseInt(e.target.value);
       if (isNaN(value)) value = 60; // 异常值处理
       
       // 强制数值在合法范围
       value = Math.max(30, Math.min(144, value));
       
       // 更新全局变量
       targetFPS = value;
       frameInterval = 1000 / targetFPS;
       
       // 更新显示
       e.target.value = value;
       document.getElementById('fpsValue').textContent = value;
   });

    // 自动旋转开关
    document.getElementById('autoRotate').addEventListener('change', function(e) {
        autoRotate = e.target.checked;
    });

    // 材质控制
    document.getElementById('glassColor').addEventListener('input', function(e) {
        cube.material.forEach(mat => mat.color.set(e.target.value));
    });

    document.getElementById('roughness').addEventListener('input', function(e) {
        const value = parseFloat(e.target.value);
        document.getElementById('roughnessValue').textContent = value.toFixed(2);
        cube.material.forEach(mat => mat.roughness = value);
    });

    document.getElementById('transmission').addEventListener('input', function(e) {
        const value = parseFloat(e.target.value);
        document.getElementById('transmissionValue').textContent = value.toFixed(2);
        cube.material.forEach(mat => mat.transmission = value);
    });

    document.getElementById('thickness').addEventListener('input', function(e) {
        const value = parseFloat(e.target.value);
        document.getElementById('thicknessValue').textContent = value.toFixed(1);
        cube.material.forEach(mat => mat.thickness = value);
    });

    // 文字设置
    document.getElementById('fontSelect').addEventListener('change', function(e) {
        textSettings.font = e.target.value;
        updateTextures();
    });

    document.getElementById('bgColor').addEventListener('input', function(e) {
        textSettings.bgColor = e.target.value;
        updateTextures();
    });

    document.getElementById('bgOpacity').addEventListener('input', function(e) {
        const value = parseFloat(e.target.value);
        document.getElementById('bgOpacityValue').textContent = value.toFixed(1);
        textSettings.bgOpacity = value;
        updateTextures();
    });

    // 纹理上传逻辑
    document.querySelectorAll('.textureUpload').forEach(input => {
        input.addEventListener('change', function(e) {
            const faceIndex = parseInt(this.dataset.face);
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    new THREE.TextureLoader().load(event.target.result, texture => {
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        texture.encoding = THREE.sRGBEncoding;
                        texture.minFilter = THREE.LinearMipMapLinearFilter;
                        texture.generateMipmaps = true;
                        cube.material[faceIndex].map = texture;
                        cube.material[faceIndex].needsUpdate = true;
                        console.log(`面 ${faceIndex+1} 贴图已更新`);
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    });

    // 背景图片上传
    document.getElementById('bgImage').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                backgroundSettings.image = `url(${event.target.result})`;
                updateBackground();
            };
            reader.readAsDataURL(file);
        }
    });
    
}

// 背景更新函数
function updateBackground() {
    document.body.style.background = backgroundSettings.image;
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundRepeat = 'no-repeat';
}

function createFixedLighting() {
    scene.add(new THREE.HemisphereLight(0xffffff, 0xffffff, 2));
    
    // 固定方向光源（类似太阳）
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(10, 10, 10).normalize();
    scene.add(directionalLight);

    // 添加环境贴图增强反射
    const envTexture = new THREE.TextureLoader().load('bg.jpg');
    envTexture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = envTexture;
}

function createCube() {
    const materials = [];
    for(let i = 0; i < 6; i++) {
        const texture = createTextTexture(faceTexts[i]);
        materials.push(new THREE.MeshPhysicalMaterial({
            map: texture,
            color: 0xffffff, // 初始颜色
            transmission: 0.9,
            metalness: 0.1,
            roughness: 0.2,
            thickness: 0.5,
            transparent: true,
            opacity: 0.6,
            envMapIntensity: 2.0,
            premultipliedAlpha: true
        }));
    }

    const geometry = new THREE.BoxGeometry(2, 2, 2);
    cube = new THREE.Mesh(geometry, materials);
    scene.add(cube);
}

function createTextTexture(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 512;
    
    ctx.fillStyle = textSettings.bgColor;
    ctx.globalAlpha = textSettings.bgOpacity;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.font = `${textSettings.fontSize}px ${textSettings.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width/2, canvas.height/2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function updateTextures() {
    cube.material.forEach((mat, index) => {
        mat.map.dispose();
        mat.map = createTextTexture(faceTexts[index]);
        mat.needsUpdate = true;
    });
    console.log('文字设置已更新');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    stats.begin();
    
    const now = performance.now();
    const deltaTime = now - lastFrameTime;
    
    if (deltaTime > frameInterval) {
        // 使用最新计算的frameInterval
        lastFrameTime = now - (deltaTime % frameInterval);

        controls.update();
        renderer.render(scene, camera);
        
        // 更新FPS显示
        const currentFPS = Math.round(1000 / deltaTime);
        document.getElementById('fps').textContent = 
            `${currentFPS} (限制: ${targetFPS})`;
    }
    
    stats.end();
    requestAnimationFrame(animate);
    
    // 自动旋转逻辑
    if(autoRotate) {
        cube.rotation.x += rotationSpeed;
        cube.rotation.y += rotationSpeed;
    }
}