// imports & includes
import * as BABYLON from "@babylonjs/core";
import { TimerState } from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";

import {movements} from './moves';
import { Atlas, preloadMeshes } from "./MeshLoader";

// board details object
type SceneDefinition = {
  rows: number;
  columns: number;
  tiles: Array<{ r: number; c: number; d: number; tid: number }>;
};

// delay for speed settings
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// sceneloader class
export class SceneLoader {
  // general variables
  scene: BABYLON.Scene; // global scene var
  light: BABYLON.HemisphericLight; // global light var
  camera: BABYLON.ArcRotateCamera; // global camera var
  assetsManager: BABYLON.AssetsManager; // global assetmanager
  detailLevel: number; // level of detail variable
  glbDef: SceneDefinition; // global scene definition
  treeArray = []; // tree grid of board
  houseArray = []; // array of possible NFO positions
  NFOs = ["House", "Tower1", "Tower2", "Tower3"]; // array of nfo names
  spaceNFOs = ["SpaceRockBig1", "SpaceShip"]; // array of space nfo names
  theme: number; // theme options (0 - default, 1 - space)

  // clara variables
  playerAnimator: BABYLON.AnimationGroup; // clara animation
  clara: BABYLON.AbstractMesh; // clara herself

  // movement variables
  directionFacing: number; // direction clara is facing (0 - north, 1 - east, 2 - south, 3 - west)
  startPosition: BABYLON.Vector3; // clara's start position
  currentPosition: BABYLON.Vector3; // clara's current position
  movementGrid = []; // board grid
  claraXCoord: number; // xcoord in grid
  claraYCoord: number; // ycoord in grid
  justMoved = false; // movement check
  leavesCollected: number; // leaf count
  leafCount: number;
  alive = true; // alive check

  // speed settings and variables (CHANGED)
  // 0 = half speed
  // 1 = normal speed
  // 2 = double speed
  // 3 = triple speed
  deathSpeed = [1600, 800, 400, 100];
  turnSpeed = [600, 300, 150, 50];
  framesSpeed = [30, 60, 120, 480];
  moveWaitSpeed = [2300, 1200, 650, 350];
  leafAnimationSpeed = [200, 800, 1800, 3200];
  currentDeathSpeed: number;
  currentTurnSpeed: number;
  currentFrameSpeed: number;
  currentMoveWaitSpeed: number;
  currentLeafAnimationSpeed: number;

  leafAnimatorArray: BABYLON.AnimationGroup[][] = [];
  leafs: BABYLON.AbstractMesh[][] = [];
  mushrooms: BABYLON.AbstractMesh[][] = [];

  // canvas initiation
  async initCanvas(canvas: HTMLCanvasElement) {
    let engine = new BABYLON.Engine(canvas, true);

    // create scene function
    var createScene = (passedDL: number, passedTheme: number) => {
      // assign detail level
      globalThis.detailLevel = passedDL;

      // assign theme
      globalThis.theme = passedTheme;

      // initalise leaves array
      this.leafs = [];

      // create scene
      let scene = new BABYLON.Scene(engine);

      // assign scene to global
      this.scene = scene;

      // set background colour based on theme
      if (passedTheme == 0) {
        scene.clearColor = BABYLON.Color3.White() as unknown as BABYLON.Color4;
      } else if (globalThis.theme == 1) {
        scene.clearColor = BABYLON.Color3.Black() as unknown as BABYLON.Color4;
      }

      // set defaults
      this.leavesCollected = 0;
      this.leafCount = 0;
      this.currentDeathSpeed = this.deathSpeed[1];
      this.currentTurnSpeed = this.turnSpeed[1];
      this.currentFrameSpeed = this.framesSpeed[1];
      this.currentMoveWaitSpeed = this.moveWaitSpeed[1];
      this.currentLeafAnimationSpeed = this.leafAnimationSpeed[1];

      // create camera
      let camera = new BABYLON.ArcRotateCamera(
        "camera",
        0,
        BABYLON.Tools.ToRadians(25),
        30,
        BABYLON.Vector3.Zero(),
        scene
      );

      // set default camera angle (cam3 - restricted free cam)
      camera.lowerBetaLimit = 0;
      camera.upperBetaLimit = Math.PI / 2;
      camera.lowerRadiusLimit = 30;
      camera.upperRadiusLimit = 50;

      // set camera sensitivity
      camera.angularSensibilityX = 5000;
      camera.angularSensibilityY = 5000;

      camera.checkCollisions = true;
      camera.attachControl("canvas", true);
      this.camera = camera;

      /* BELOW IS FOR MINIMAP CODE, NOT SURE ABT IT YET 
      var camera2 = new BABYLON.ArcRotateCamera("Camera", -Math.PI/2, 0.001, 60, new BABYLON.Vector3(11, -2, 13.5), scene);
      scene.activeCameras = [];
      // scene.activeCameras.push(camera2);
      scene.activeCameras.push(camera);
      camera.attachControl(canvas, true);
      camera2.attachControl(canvas, true);

	    camera2.layerMask = 2;
      
	    var epsilon = .9999999;  // threshold

      var rt2 = new BABYLON.RenderTargetTexture("depth", 1024, scene, true, true);
      scene.customRenderTargets.push(rt2);
	    rt2.activeCamera = camera2;
      rt2.renderList = scene.meshes;

      var mon2 = BABYLON.Mesh.CreatePlane("plane", 4, scene);
      mon2.position = new BABYLON.Vector3(canvas.width/130, canvas.height/150, 20)
	    // mon2.showBoundingBox = true;
      var mon2mat = new BABYLON.StandardMaterial("texturePlane", scene);
      mon2mat.diffuseColor = new BABYLON.Color3(1,1,1);
      mon2mat.diffuseTexture = rt2;
      mon2mat.specularColor = BABYLON.Color3.Black();

      mon2mat.diffuseTexture.scale(1);
      // mon2mat.diffuseTexture.scale = 1; // zoom
      // mon2mat.diffuseTexture.vScale = 1;

      mon2mat.diffuseTexture.level = 1.2; // intensity

      mon2mat.emissiveColor = new BABYLON.Color3(1,1,1); // backlight
	    mon2.material = mon2mat;
	    mon2.parent = camera;
	    // mon2.parent = camera;
	    mon2.layerMask = 1;

	    mon2.enableEdgesRendering(epsilon);	
	    mon2.edgesWidth = 5.0;
	    mon2.edgesColor = new BABYLON.Color4(1, 1, 1, 1);

      */

      // create gui
      var claraGUI = GUI.AdvancedDynamicTexture.CreateFullscreenUI(
        "UI",
        true,
        this.scene
      );

      // create and setup camera button stack
      var cameraPanel = new GUI.StackPanel();
      cameraPanel.isVertical = false;
      cameraPanel.height = "100px";
      cameraPanel.width = "185px";
      cameraPanel.paddingRight = "10px";
      cameraPanel.paddingTop = "10px";
      cameraPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
      cameraPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

      // create and setup detail options stack
      var optionsPanel = new GUI.StackPanel();
      optionsPanel.isVertical = false;
      optionsPanel.width = "265px";
      optionsPanel.height = "70px";
      optionsPanel.paddingLeft = "10px";
      optionsPanel.paddingTop = "10px";
      optionsPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
      optionsPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

      // create and setup speed settings stack
      var speedPanel = new GUI.StackPanel();
      speedPanel.isVertical = false;
      speedPanel.width = "200px";
      speedPanel.height = "30px";
      speedPanel.background = "Black";
      speedPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
      speedPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;

       //panel for reading input from text file
       var inputPanel = new GUI.StackPanel();
       inputPanel.isVertical = false;
       inputPanel.height = "100px";
       inputPanel.width = "185px";
       inputPanel.paddingRight = "10px"
       inputPanel.paddingTop = "10px"
       inputPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
       inputPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
 

      // add stacks to gui
      claraGUI.addControl(cameraPanel);
      claraGUI.addControl(optionsPanel);
      claraGUI.addControl(speedPanel);
      claraGUI.addControl(inputPanel);

      // creates text above detail options
      let detailHeading = new GUI.TextBlock();
      detailHeading.text = "Detail";
      detailHeading.height = "30px";
      detailHeading.width = "130px";
      if (globalThis.theme == 0) {
        detailHeading.color = "black";
      } else if (globalThis.theme == 1) {
        detailHeading.color = "white";
      }
      detailHeading.fontSize = "20";
      detailHeading.fontWeight = "bold";
      detailHeading.paddingLeft = "20px";
      detailHeading.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
      detailHeading.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

      // creates text above camera buttons
      let cameraHeading = new GUI.TextBlock();
      cameraHeading.text = "Camera Options";
      cameraHeading.height = "30px";
      cameraHeading.width = "180px";
      if (globalThis.theme == 0) {
        cameraHeading.color = "black";
      } else if (globalThis.theme == 1) {
        cameraHeading.color = "white";
      }
      cameraHeading.fontSize = "20";
      cameraHeading.fontWeight = "bold";
      cameraHeading.paddingRight = "20px";
      cameraHeading.horizontalAlignment =
        GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
      cameraHeading.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

      // adds headings to gui
      claraGUI.addControl(detailHeading);
      claraGUI.addControl(cameraHeading);

      // create camera angle buttons
      //    - cam1 = angle 1 (higher)
      //    - cam2 = angle 2 (lower)
      //    - cam3 = angle 3 (limited-free range)

      // create and setup cam1 button
      var cam1 = GUI.Button.CreateImageOnlyButton("cam1", "/top-down.png");
      cam1.width = "60px";
      cam1.height = "50px";
      cam1.color = "transparent";
      cam1.paddingRight = "10px";
      cam1.onPointerClickObservable.add(function () {
        camera.lowerBetaLimit = BABYLON.Tools.ToRadians(25);
        camera.upperBetaLimit = BABYLON.Tools.ToRadians(25);
        camera.lowerRadiusLimit = 30;
        camera.upperRadiusLimit = 30;
      });

      // create and setup cam2 button
      var cam2 = GUI.Button.CreateImageOnlyButton("cam2", "/side-view.png");
      cam2.width = "60px";
      cam2.height = "50px";
      cam2.color = "transparent";
      cam2.paddingRight = "10px";
      cam2.onPointerClickObservable.add(function () {
        camera.lowerBetaLimit = Math.PI / 2;
        camera.upperBetaLimit = Math.PI / 3;
        camera.lowerRadiusLimit = 30;
        camera.upperRadiusLimit = 30;
      });

      // create and setup cam3 button
      var cam3 = GUI.Button.CreateImageOnlyButton("cam3", "/free-view.png");
      cam3.width = "60px";
      cam3.height = "50px";
      cam3.color = "transparent";
      cam3.paddingRight = "10px";
      cam3.onPointerClickObservable.add(function () {
        camera.lowerBetaLimit = 0;
        camera.upperBetaLimit = Math.PI / 2;
        camera.lowerRadiusLimit = 30;
        camera.upperRadiusLimit = 50;
      });

      // add buttons to camera stack
      cameraPanel.addControl(cam1);
      cameraPanel.addControl(cam2);
      cameraPanel.addControl(cam3);

      // create detail text
      let detail = new GUI.TextBlock();
      if (globalThis.detailLevel == 1) {
        detail.text = "Low";
      } else if (globalThis.detailLevel == 2) {
        detail.text = "Medium";
      } else {
        detail.text = "High";
      }
      detail.height = "20px";
      detail.width = "80px";
      if (globalThis.theme == 0) {
        detail.color = "black";
      } else if (globalThis.theme == 1) {
        detail.color = "white";
      }

      // create and setup decrease detail button
      let lowerDetailBtnIcon = "";
      if (globalThis.theme == 0) {
        lowerDetailBtnIcon = "/lower.png";
      } else if (globalThis.theme == 1) {
        lowerDetailBtnIcon = "/lower-white.png";
      }
      let lowerDetailBtn = GUI.Button.CreateImageOnlyButton(
        "lower",
        lowerDetailBtnIcon
      );
      lowerDetailBtn.height = "25px";
      lowerDetailBtn.width = "25px";
      lowerDetailBtn.color = "transparent";
      lowerDetailBtn.onPointerClickObservable.add(function () {
        if (globalThis.detailLevel == 2) {
          globalThis.detailLevel = 1;
          detail.text = "Low";
        } else {
          globalThis.detailLevel = 2;
          detail.text = "Medium";
        }
      });

      // create and setup increase detail button
      let higherDetailBtnIcon = "";
      if (globalThis.theme == 0) {
        higherDetailBtnIcon = "/higher.png";
      } else if (globalThis.theme == 1) {
        higherDetailBtnIcon = "/higher-white.png";
      }
      let higherDetailBtn = GUI.Button.CreateImageOnlyButton(
        "higher",
        higherDetailBtnIcon
      );
      higherDetailBtn.height = "25px";
      higherDetailBtn.width = "25px";
      higherDetailBtn.color = "transparent";
      higherDetailBtn.onPointerClickObservable.add(function () {
        if (globalThis.detailLevel == 1) {
          globalThis.detailLevel = 2;
          detail.text = "Medium";
        } else if (globalThis.detailLevel == 2) {
          globalThis.detailLevel = 3;
          detail.text = "High";
        }
      });

      // create and setup reload button
      let reloadBtnIcon = "";
      if (globalThis.theme == 0) {
        reloadBtnIcon = "/reload.png";
      } else if (globalThis.theme == 1) {
        reloadBtnIcon = "/reload-white.png";
      }
      let reloadBtn = GUI.Button.CreateImageOnlyButton("reload", reloadBtnIcon);
      reloadBtn.height = "25px";
      reloadBtn.width = "35px";
      reloadBtn.paddingLeft = "10px";
      reloadBtn.color = "transparent";
      reloadBtn.onPointerClickObservable.add(async () => {
        console.log("Scene is now reloading...");

        this.scene.dispose();
        this.treeArray = [];
        this.houseArray = [];
        let newScene = createScene(globalThis.detailLevel, globalThis.theme);
        this.assetsManager = new BABYLON.AssetsManager(newScene);
        await preloadMeshes(this.assetsManager);
        engine.runRenderLoop(function () {
          newScene.render();
        });
        this.loadScene(this.glbDef);

        console.log("Scene has reloaded!");
      });

      // create and setup theme button
      let themeIcon = "";
      if (globalThis.theme == 0) {
        themeIcon = "/SpaceIcon.png";
      } else if (globalThis.theme == 1) {
        themeIcon = "/GrassIcon.png";
      }
      let themeBtn = GUI.Button.CreateImageOnlyButton("themeBtn", themeIcon);
      themeBtn.height = "25px";
      themeBtn.width = "35px";
      themeBtn.paddingLeft = "10px";
      themeBtn.color = "transparent";
      themeBtn.onPointerClickObservable.add(async () => {
        if (globalThis.theme == 0) {
          globalThis.theme = 1;
        } else if (globalThis.theme == 1) {
          globalThis.theme = 0;
        }

        console.log("Reloading with new theme!");

        this.scene.dispose();
        this.treeArray = [];
        this.houseArray = [];
        let newScene = createScene(globalThis.detailLevel, globalThis.theme);
        this.assetsManager = new BABYLON.AssetsManager(newScene);
        await preloadMeshes(this.assetsManager);
        engine.runRenderLoop(function () {
          newScene.render();
        });
        this.loadScene(this.glbDef);

        console.log("Scene loaded!");
      });

      // add options to panel
      optionsPanel.addControl(lowerDetailBtn);
      optionsPanel.addControl(detail);
      optionsPanel.addControl(higherDetailBtn);
      optionsPanel.addControl(reloadBtn);
      optionsPanel.addControl(themeBtn);

      // create and setup half speed button
      let halfSpeedBtn = GUI.Button.CreateImageOnlyButton(
        "half",
        "/halfSpeed.png"
      );
      halfSpeedBtn.width = "50px";
      halfSpeedBtn.height = "30px";
      halfSpeedBtn.onPointerClickObservable.add(async () => {
        this.currentDeathSpeed = this.deathSpeed[0];
        this.currentTurnSpeed = this.turnSpeed[0];
        this.currentFrameSpeed = this.framesSpeed[0];
        this.currentMoveWaitSpeed = this.moveWaitSpeed[0];
      });

      // create and setup normal speed button
      let defaultSpeedBtn = GUI.Button.CreateImageOnlyButton(
        "default",
        "/defaultSpeed.png"
      );
      defaultSpeedBtn.width = "50px";
      defaultSpeedBtn.height = "30px";
      // defaultSpeedBtn.paddingTop = "20px";
      defaultSpeedBtn.onPointerClickObservable.add(async () => {
        this.currentDeathSpeed = this.deathSpeed[1];
        this.currentTurnSpeed = this.turnSpeed[1];
        this.currentFrameSpeed = this.framesSpeed[1];
        this.currentMoveWaitSpeed = this.moveWaitSpeed[1];
      });

      // create and setup double speed button
      let doubleSpeedBtn = GUI.Button.CreateImageOnlyButton(
        "double",
        "/doubleSpeed.png"
      );
      doubleSpeedBtn.width = "50px";
      doubleSpeedBtn.height = "30px";
      // doubleSpeedBtn.paddingTop = "20px";
      doubleSpeedBtn.onPointerClickObservable.add(async () => {
        this.currentDeathSpeed = this.deathSpeed[2];
        this.currentTurnSpeed = this.turnSpeed[2];
        this.currentFrameSpeed = this.framesSpeed[2];
        this.currentMoveWaitSpeed = this.moveWaitSpeed[2];
      });

      // create and setup fast speed button
      let fastSpeedBtn = GUI.Button.CreateImageOnlyButton(
        "triple",
        "/fastSpeed.png"
      );
      fastSpeedBtn.width = "50px";
      fastSpeedBtn.height = "30px";
      // fastSpeedBtn.paddingTop = "20px";
      fastSpeedBtn.onPointerClickObservable.add(async () => {
        this.currentDeathSpeed = this.deathSpeed[3];
        this.currentTurnSpeed = this.turnSpeed[3];
        this.currentFrameSpeed = this.framesSpeed[3];
        this.currentMoveWaitSpeed = this.moveWaitSpeed[3];
      });

      // add speed option buttons to speed panel
      speedPanel.addControl(halfSpeedBtn);
      speedPanel.addControl(defaultSpeedBtn);
      speedPanel.addControl(doubleSpeedBtn);
      speedPanel.addControl(fastSpeedBtn);

      // create light
      let light = new BABYLON.HemisphericLight(
        "light",
        new BABYLON.Vector3(1, 1, 0),
        scene
      );
      this.light = light;

      // setup keyboard input handling
      var inputMap = {};
      scene.actionManager = new BABYLON.ActionManager(scene);
      scene.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
          BABYLON.ActionManager.OnKeyDownTrigger,
          function (evt) {
            inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
          }
        )
      );
      scene.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
          BABYLON.ActionManager.OnKeyUpTrigger,
          function (evt) {
            inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
          }
        )
      );

      var animating = true;

      scene.onBeforeRenderObservable.add(() => {
        var keydown = false;

        //Manage the movements of the character (e.g. position, direction)
        if (inputMap["w"] || inputMap["W"]) {
          this.claraMoveForwardFunction();

          keydown = true;
        }
        if (inputMap["s"]) {
          //if clara wants to move backwards

          keydown = true;
        }
        if (inputMap["a"]) {
          keydown = true;
        }
        if (inputMap["d"]) {
          if (this.alive) {
            this.claraTurnRightFunction();
          }

          keydown = true;
        }
        if (inputMap["b"]) {
          keydown = true;
        }

        //Manage animations to be played
        if (keydown) {
          if (!animating) {
            animating = true;
            if (
              inputMap["w"] ||
              inputMap["a"] ||
              inputMap["s"] ||
              inputMap["d"]
            ) {
              //Walk backwards
              this.playerAnimator.start(true, 1, 60, 160);
            }
          }
        }
      });

      var inputButton = GUI.Button.CreateSimpleButton("textInput", "textInput");
      inputButton.width = 0.2;
      inputButton.height = "40px";
      inputButton.color = "white";
      inputButton.background = "green";
      inputButton.width = "150px";
      inputButton.onPointerClickObservable.add(async ()=> {
        console.log("textInput button has been pressed");

        this.playerAnimator.start(true, 1, 60, 160);
        let numbMove = movements.numberOfMoves;
        const inputDelay = async (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms));
        for(let i = 0; i<numbMove;i++ ){
          var moveMade = movements.movesToBeMade[i];
          if(moveMade == 1){
            console.log("tried moving forward");
            this.claraMoveForwardFunction(); 
            await inputDelay(this.currentMoveWaitSpeed);
  
          }
          if(moveMade == 2){
            console.log("tried to turn right");
            this.claraTurnRightFunction();
            await inputDelay(this.currentTurnSpeed);
          }
        }
        console.log("All Moves from file have been read and performed");

      });

      inputPanel.addControl(inputButton);
      // USED FOR MINIMAP, CURRENTLY WIP
      // scene.registerBeforeRender(function () {
      //   camera2.alpha = camera.alpha;
      // });

      // enable depth renderering and return scene
      scene.enableDepthRenderer();
      return scene;
    };

    // screen resizing
    window.addEventListener("resize", function () {
      engine.resize();
    });

    // assign default detail level
    globalThis.detailLevel = 3;

    // set theme to default
    globalThis.theme = 0;

    // create scene
    var scene = createScene(globalThis.detailLevel, globalThis.theme);

    // assign asset manager
    this.assetsManager = new BABYLON.AssetsManager(scene);

    // load meshes
    console.log("Preloading ...");
    await preloadMeshes(this.assetsManager);
    console.log("Loaded");

    // render scene
    engine.runRenderLoop(function () {
      scene.render();
    });
  }

  // load scene function
  loadScene(definition: SceneDefinition) {
    // assign rows n cols
    let { rows, columns } = definition;

    // assign global definition
    this.glbDef = definition;

    // this.camera.target = new BABYLON.Vector3(11, -2, 13.5);

    //this.camera.target.x = 11;

    // this.camera.target.x = rows;
    // this.camera.target.y = (rows - columns);
    // this.camera.target.z = columns;

    this.camera.target.x = rows;
    this.camera.target.y = rows - columns;
    this.camera.target.z = columns;

    this.camera.position.x = rows;
    this.camera.position.y = columns * 2.1;
    this.camera.position.z = columns;

    // this.camera.target.x = rows + (rows/2.1);
    // this.camera.target.y = columns - (columns/2.1);
    // this.camera.target.z = columns;

    // create board loop
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      // initializing movementGrid
      this.movementGrid[rowIndex] = [];
      this.treeArray[rowIndex] = [];
      this.mushrooms[rowIndex] = [];
      for (let columnIndex = 0; columnIndex < columns; columnIndex++) {
        // filling movementGrid
        this.movementGrid[rowIndex][columnIndex] = 0;
        // filling treeArray
        this.treeArray[rowIndex][columnIndex] = 0;

        // find current tile
        let existingTile = definition.tiles.find(
          (t) => t.c === columnIndex && t.r === rowIndex
        );

        // if current tile exists check specifications
        // else place light grass
        if (existingTile) {
          // tid == 1, place dark grass + tree
          if (existingTile.tid == 1) {
            // assign movementGrid element to 1
            this.movementGrid[rowIndex][columnIndex] = 1;
            // assign treeArray element to 1
            this.treeArray[rowIndex][columnIndex] = 1;
            let top;
            if (globalThis.theme == 0) {
              top = Atlas.topTiles.get("GrassTop1.glb").createInstance("top");
            } else if (globalThis.theme == 1) {
              top = Atlas.topTiles.get("SpaceTop1.glb").createInstance("top");
            }
            top.position = new BABYLON.Vector3(
              rowIndex * 2.1,
              0,
              columnIndex * 2.1
            );
          }
          // tid == 2, place water
          else if (existingTile.tid == 2) {
            let top = Atlas.topTiles.get("WaterTop.glb").createInstance("top");
            top.position = new BABYLON.Vector3(
              rowIndex * 2.1,
              0.9,
              columnIndex * 2.1
            );
            top.scaling = new BABYLON.Vector3(1.2, 1, 1.2);
            let gap = 2.1;

            if (globalThis.detailLevel != 1) {
              let waterParticles = new BABYLON.ParticleSystem(
                "particles",
                1000,
                this.scene
              );
              waterParticles.particleTexture = new BABYLON.Texture("spray.png");
              waterParticles.emitter = new BABYLON.Vector3(
                rowIndex * 2.1,
                0,
                columnIndex * 2.1
              );

              waterParticles.emitRate = 1;
              waterParticles.minSize = 0;
              waterParticles.maxSize = 0.5;
              waterParticles.start();
            }

            /*
               if tile on edge, put waterfall
            */
            if (rowIndex == 0) {
              let top = Atlas.topTiles
                .get("WaterTop.glb")
                .createInstance("top");
              top.position = new BABYLON.Vector3(
                rowIndex * 2.1 - 1.15,
                -0.1,
                columnIndex * 2.1
              );
              top.scaling = new BABYLON.Vector3(1.2, 1, 1.2);
              top.rotation = new BABYLON.Vector3(0, 0, Math.PI / 2);
              let gap = 2.1;
              var particleSys = new BABYLON.ParticleSystem(
                "particles",
                1000,
                this.scene
              ); //creates the particle system

              particleSys.particleTexture = new BABYLON.Texture("spray.png"); //texture of each particle

              particleSys.emitter = new BABYLON.Vector3(
                rowIndex * 2.1 - 1.15,
                -0.1,
                columnIndex * 2.1
              );
              particleSys.start();
              for (let i = 0; i < 5; i++) {
                let top = Atlas.topTiles
                  .get("WaterTop.glb")
                  .createInstance("top");
                top.position = new BABYLON.Vector3(
                  rowIndex * 2.1 - 1.15,
                  -0.1 - gap,
                  columnIndex * 2.1
                );
                top.scaling = new BABYLON.Vector3(1.2, 1, 1.2);
                top.rotation = new BABYLON.Vector3(0, 0, Math.PI / 2);
                var particleSys = new BABYLON.ParticleSystem(
                  "particles",
                  1000,
                  this.scene
                ); //creates the particle system

                particleSys.particleTexture = new BABYLON.Texture("spray.png"); //texture of each particle

                particleSys.emitter = new BABYLON.Vector3(
                  rowIndex * 2.1 - 1.15,
                  -0.1 - gap,
                  columnIndex * 2.1
                );
                particleSys.start();
                gap += 2.1;
              }
            }

            if (rowIndex == rows - 1) {
              let top = Atlas.topTiles
                .get("WaterTop.glb")
                .createInstance("top");
              top.position = new BABYLON.Vector3(
                rowIndex * 2.1 + 1.15,
                -0.1,
                columnIndex * 2.1
              );
              top.scaling = new BABYLON.Vector3(1.2, 1, 1.2);
              top.rotation = new BABYLON.Vector3(0, Math.PI, Math.PI / 2);

              gap = 2.1;

              var particleSys = new BABYLON.ParticleSystem(
                "particles",
                1000,
                this.scene
              ); //creates the particle system
              particleSys.particleTexture = new BABYLON.Texture("spray.png"); //texture of each particle
              particleSys.emitter = new BABYLON.Vector3(
                rowIndex * 2.1 + 1.15,
                -0.1,
                columnIndex * 2.1
              );
              particleSys.start();

              for (let i = 0; i < 5; i++) {
                let top = Atlas.topTiles
                  .get("WaterTop.glb")
                  .createInstance("top");
                top.position = new BABYLON.Vector3(
                  rowIndex * 2.1 + 1.15,
                  -0.1 - gap,
                  columnIndex * 2.1
                );
                top.scaling = new BABYLON.Vector3(1.2, 1, 1.2);
                top.rotation = new BABYLON.Vector3(0, Math.PI, Math.PI / 2);

                var particleSys = new BABYLON.ParticleSystem(
                  "particles",
                  1000,
                  this.scene
                ); //creates the particle system
                particleSys.particleTexture = new BABYLON.Texture("spray.png"); //texture of each particle
                particleSys.emitter = new BABYLON.Vector3(
                  rowIndex * 2.1 + 1.15,
                  -0.1 - gap,
                  columnIndex * 2.1
                );
                particleSys.start();

                gap += 2.1;
              }
            }

            if (columnIndex == 0) {
              let top = Atlas.topTiles
                .get("WaterTop.glb")
                .createInstance("top");
              top.position = new BABYLON.Vector3(
                rowIndex * 2.1,
                -0.1,
                columnIndex * 2.1 - 1.15
              );
              top.scaling = new BABYLON.Vector3(1.2, 1, 1.2);
              top.rotation = new BABYLON.Vector3(Math.PI / 2, Math.PI, 0);
              gap = 2.1;

              var particleSys = new BABYLON.ParticleSystem(
                "particles",
                1000,
                this.scene
              ); //creates the particle system
              particleSys.particleTexture = new BABYLON.Texture("spray.png"); //texture of each particle
              particleSys.emitter = new BABYLON.Vector3(
                rowIndex * 2.1,
                -0.1,
                columnIndex * 2.1 - 1.15
              );
              particleSys.start();

              for (let i = 0; i < 5; i++) {
                let top = Atlas.topTiles
                  .get("WaterTop.glb")
                  .createInstance("top");
                top.position = new BABYLON.Vector3(
                  rowIndex * 2.1,
                  -0.1 - gap,
                  columnIndex * 2.1 - 1.15
                );
                top.scaling = new BABYLON.Vector3(1.2, 1, 1.2);
                top.rotation = new BABYLON.Vector3(Math.PI / 2, Math.PI, 0);

                var particleSys = new BABYLON.ParticleSystem(
                  "particles",
                  1000,
                  this.scene
                ); //creates the particle system
                particleSys.particleTexture = new BABYLON.Texture("spray.png"); //texture of each particle
                particleSys.emitter = new BABYLON.Vector3(
                  rowIndex * 2.1,
                  -0.1 - gap,
                  columnIndex * 2.1 - 1.15
                );
                particleSys.start();
                gap += 2.1;
              }
            }

            if (columnIndex == columns - 1) {
              let top = Atlas.topTiles
                .get("WaterTop.glb")
                .createInstance("top");
              top.position = new BABYLON.Vector3(
                rowIndex * 2.1,
                -0.1,
                columnIndex * 2.1 + 1.15
              );
              top.scaling = new BABYLON.Vector3(1.2, 1, 1.2);
              top.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);

              var particleSys = new BABYLON.ParticleSystem(
                "particles",
                1000,
                this.scene
              ); //creates the particle system
              particleSys.particleTexture = new BABYLON.Texture("spray.png"); //texture of each particle
              particleSys.emitter = new BABYLON.Vector3(
                rowIndex * 2.1,
                -0.1,
                columnIndex * 2.1 + 1.15
              );
              particleSys.start();

              gap = 2.1;

              for (let i = 0; i < 5; i++) {
                let top = Atlas.topTiles
                  .get("WaterTop.glb")
                  .createInstance("top");
                top.position = new BABYLON.Vector3(
                  rowIndex * 2.1,
                  -0.1 - gap,
                  columnIndex * 2.1 + 1.15
                );
                top.scaling = new BABYLON.Vector3(1.2, 1, 1.2);
                top.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);

                var particleSys = new BABYLON.ParticleSystem(
                  "particles",
                  1000,
                  this.scene
                ); //creates the particle system
                particleSys.particleTexture = new BABYLON.Texture("spray.png"); //texture of each particle
                particleSys.emitter = new BABYLON.Vector3(
                  rowIndex * 2.1,
                  -0.1 - gap,
                  columnIndex * 2.1 + 1.15
                );
                particleSys.start();

                gap += 2.1;
              }
            }

            this.movementGrid[rowIndex][columnIndex] = 2;
          }
          // existing tile is game object (clara, leaf, ghost), place lighter grass
          else if (
            [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].indexOf(
              existingTile.tid
            ) > -1
          ) {
            let top;
            if (globalThis.theme == 0) {
              top = Atlas.topTiles.get("GrassTop2.glb").createInstance("top");
            } else if (globalThis.theme == 1) {
              top = Atlas.topTiles.get("SpaceTop2.glb").createInstance("top");
            }
            top.position = new BABYLON.Vector3(
              rowIndex * 2.1,
              0,
              columnIndex * 2.1
            );
            switch (existingTile.tid) {
              case 4: {
                BABYLON.SceneLoader.ImportMesh(
                  "",
                  "/",
                  "Clara.glb",
                  this.scene,
                  (meshes, unused1, unused2, ags) => {
                    meshes.forEach((mesh) => {
                      if (mesh.material) {
                        mesh.material.needDepthPrePass = true;
                      }
                    });
                    let clara = meshes[0];
                    clara.position = new BABYLON.Vector3(
                      rowIndex * 2.1,
                      1,
                      columnIndex * 2.1
                    );
                    this.clara = meshes[0];
                    this.initialiseClara();

                    this.playerAnimator = ags[0];
                    this.playerAnimator.stop();
                    this.playerAnimator.start(true, 1, 0, 60);
                  }
                );
                this.startPosition = new BABYLON.Vector3(
                  rowIndex * 2.1,
                  1,
                  columnIndex * 2.1
                ); // assign clara's starting positioning for resets
                this.directionFacing = existingTile.d; // assign clara's current direction
                this.movementGrid[rowIndex][columnIndex] = 4; // assign clara in movement grid
                this.claraXCoord = rowIndex; // log clara's current x coord in grid
                this.claraYCoord = columnIndex; // log clara's current y coord in grid
                break;
              }
              case 5: {
                // leaf
                let model, scaleX, scaleY, scaleZ, frameEnd;
                if (globalThis.theme == 0) {
                  model = "Leaf.glb";
                  scaleX = 0.1; 
                  scaleY = 0.1; 
                  scaleZ = 0.1;
                  frameEnd = 145;
                }
                else if (globalThis.theme == 1) {
                  model = "Star.glb";
                  scaleX = 0.5; 
                  scaleY = 0.5; 
                  scaleZ = 0.5;
                  frameEnd = 360;
                }
                this.movementGrid[rowIndex][columnIndex] = 5;
                BABYLON.SceneLoader.ImportMesh(
                  "",
                  "/",
                  model,
                  this.scene,
                  (meshes, ps, skeletons, ags) => {
                    meshes.forEach((mesh) => {
                      if (mesh.material) {
                        mesh.material.needDepthPrePass = true;
                      }
                    });
                    let leaf1 = meshes[0];
                    leaf1.name = "leaf";
                    leaf1.position = new BABYLON.Vector3(
                      rowIndex * 2.1,
                      1.5,
                      columnIndex * 2.1
                    );
                    leaf1.scaling = new BABYLON.Vector3(scaleX, scaleY, scaleZ);
                    // remember where we instantiated the leaf
                    if (this.leafs[rowIndex] == null) {
                      this.leafs[rowIndex] = [];
                    }
                    this.leafs[rowIndex][columnIndex] = leaf1;
                    if (this.leafAnimatorArray[rowIndex] == null) {
                      this.leafAnimatorArray[rowIndex] = [];
                    }
                    this.leafAnimatorArray[rowIndex][columnIndex] = ags[0];
                    this.leafAnimatorArray[rowIndex][columnIndex].stop();
                    this.leafAnimatorArray[rowIndex][columnIndex].start(
                      true,
                      1,
                      0,
                      frameEnd
                    );
                  }
                );
                break;
              }
              case 6: {
                // mushroom

                this.movementGrid[rowIndex][columnIndex] = 6;
                let item = "Mushrooms1";
                let top = Atlas.mushrooms.get(item + ".glb").createInstance("");
                top.position = new BABYLON.Vector3(
                  rowIndex * 2.1,
                  1.5,
                  columnIndex * 2.1
                );
                top.scaling = new BABYLON.Vector3(4, 4, 4);
                this.movementGrid[rowIndex][columnIndex] = 6;
                if (this.mushrooms[rowIndex] == null) {
                  this.mushrooms[rowIndex] = [];
                }
                this.mushrooms[rowIndex][columnIndex] = top;
                break;
              }
              case 7: {
                // ghost
                this.movementGrid[rowIndex][columnIndex] = 7;
                break;
              }
              case 8: {
                // ghostWall
                this.movementGrid[rowIndex][columnIndex] = 8;
                break;
              }
              case 9: {
                // ghostHealer
                this.movementGrid[rowIndex][columnIndex] = 9;
                break;
              }
              case 10: {
                // home
                this.movementGrid[rowIndex][columnIndex] = 10;
                break;
              }
              case 11: {
                // dot
                this.movementGrid[rowIndex][columnIndex] = 11;
                break;
              }
              case 12: {
                // earth
                this.movementGrid[rowIndex][columnIndex] = 12;
                break;
              }
              case 13: {
                // gold
                this.movementGrid[rowIndex][columnIndex] = 13;
                break;
              }
              case 14: {
                // brokenGold
                this.movementGrid[rowIndex][columnIndex] = 14;
                break;
              }
              case 15: {
                // pheromone
                this.movementGrid[rowIndex][columnIndex] = 15;
                break;
              }
              default: {
                break;
              }
            }
          }
        }
        // undefined tile == place light grass (path)
        else {
          let top;
          if (globalThis.theme == 0) {
            top = Atlas.topTiles.get("GrassTop2.glb").createInstance("top");
          } else if (globalThis.theme == 1) {
            top = Atlas.topTiles.get("SpaceTop2.glb").createInstance("top");
          }
          top.position = new BABYLON.Vector3(
            rowIndex * 2.1,
            0,
            columnIndex * 2.1
          );
        }

        // detail placement algorithm
        // firstly, checks if the tile is defined
        if (existingTile != null) {
          // then runs a switch statement off the existing tiles id (tid)
          // where,
          //    1 = tree
          //    2 = water
          switch (existingTile.tid) {
            case 1: {
              if (globalThis.theme == 0) {
              } else if (globalThis.theme == 1) {
              }
              break;
            }
            case 2: {
              if (globalThis.theme == 0) {
              } else if (globalThis.theme == 1) {
              }
              break;
            }
            default: {
              break;
            }
          }
        }
        // if the tile isn't defined, calls object placement function (WaterTile = false)
        else {
        }
        // WRITE NEW OBJECT PLACEMENT FUNCTION (replacing chooseItem())
        // ALSO NEED TO UPDATE MESHLOADER, ADDING NEW MODELS AND CHANGING GROUPINGS

        if (existingTile != null && existingTile.tid == 2) {
          if (globalThis.detailLevel == 3) {
            this.chooseItem(rowIndex * 2.1, 1, columnIndex * 2.1, true);
          } else if (globalThis.detailLevel == 2) {
            if (Math.floor(Math.random() * 10) + 1 < 5) {
              this.chooseItem(rowIndex * 2.1, 1, columnIndex * 2.1, true);
            }
          }
        } else {
          if (globalThis.detailLevel == 3) {
            this.chooseItem(rowIndex * 2.1, 1, columnIndex * 2.1, false);
          } else if (globalThis.detailLevel == 2) {
            if (Math.floor(Math.random() * 10) + 1 < 5) {
              this.chooseItem(rowIndex * 2.1, 1, columnIndex * 2.1, false);
            }
          }
        }
      }
    }

    // place island bottom and scale
    let width = (rows * 2.1 - 2.1) / 2;
    let length = (columns * 2.1 - 2.1) / 2;
    if (globalThis.theme == 0) {
      this.importMesh(
        "Island",
        width,
        1.5,
        length,
        0,
        true,
        rows / 4.5,
        1.8,
        columns / 4.5
      );
    } else if (globalThis.theme == 1) {
      this.importMesh(
        "SpaceIsland",
        width,
        1.5,
        length,
        0,
        true,
        rows / 4.5,
        1.8,
        columns / 4.5
      );
    }

    this.placeIslands(rows, columns);
    this.placeClouds(rows, columns);
    this.createFog(rows, columns);
    if (this.checkNFOAvailability()) {
      for (let i = 0; i < this.houseArray.length; i++) {
        this.placeNFOs(i);
      }
    }
    this.placeTrees();

    
  }

  // function to place 4 static clouds around the island on all angles
  placeClouds(rows: number, cols: number) {
    if (globalThis.theme == 0) {
      var rCentre = (rows * 2.1 - 2.1) / 2;
      var cCentre = (cols * 2.1 - 2.1) / 2;
      let x,
        y = -15,
        z;
      for (let i = 0; i < 4; i++) {
        switch (i) {
          // bottom cloud
          case 0: {
            x = (rCentre + rows) * 2.1 + 10;
            z = cCentre;
            break;
          }
          // top cloud
          case 1: {
            x = (rCentre - rows * 2.1) * 2.1;
            z = cCentre;
            break;
          }
          // right cloud
          case 2: {
            x = rCentre;
            z = (cCentre + cols) * 2.1;
            break;
          }
          // left cloud
          case 3: {
            x = rCentre;
            z = (cCentre - cols * 2.1) * 2.1 - 10;
            break;
          }
          default: {
            break;
          }
        }
        this.importMesh("Cloud", x, y, z, Math.random() * 180, true, 7, 7, 7);
      }
    }
  }

  // dynamic import mesh function that takes describing parameters
  //    meshName = name of mesh
  //    x = xPosition
  //    y = yPosition
  //    z = zPosition
  //    z = rotation
  //    scale = whether to scale or not
  //    scaleX = xValue to scale to
  //    scaleY = yValue to scale to
  //    scaleZ = zValue to scale to
  importMesh(
    meshName: String,
    x: number,
    y: number,
    z: number,
    r: number,
    scale: boolean,
    scaleX: number,
    scaleY: number,
    scaleZ: number
  ) {
    BABYLON.SceneLoader.ImportMesh(
      "",
      "/",
      meshName + ".glb",
      this.scene,
      (meshes) => {
        meshes.forEach((mesh) => {
          if (mesh.material) {
            mesh.material.needDepthPrePass = true;
          }
        });
        let root = meshes[0];
        root.position = new BABYLON.Vector3(x, y, z);
        if (scale) {
          root.scaling = new BABYLON.Vector3(scaleX, scaleY, scaleZ);
        }
        if (r != 0) {
          root.rotation = new BABYLON.Vector3(0, r, 0);
        }
      }
    );
  }

  checkNFOAvailability() {
    for (let rowIndex = 1; rowIndex < this.glbDef.rows - 2; rowIndex++) {
      for (let colIndex = 1; colIndex < this.glbDef.columns - 2; colIndex++) {
        if (
          this.checkSurroundingTiles(rowIndex, colIndex) &&
          this.checkSurroundingTiles(rowIndex + 1, colIndex) &&
          this.checkSurroundingTiles(rowIndex + 1, colIndex + 1) &&
          this.checkSurroundingTiles(rowIndex, colIndex + 1)
        ) {
          this.treeArray[rowIndex][colIndex] = 0;
          this.treeArray[rowIndex][colIndex + 1] = 0;
          this.treeArray[rowIndex + 1][colIndex] = 0;
          this.treeArray[rowIndex + 1][colIndex + 1] = 0;
          this.houseArray.push([rowIndex, colIndex]);
        }
      }
    }
    if (this.houseArray.length != 0) {
      return true;
    } else {
      return false;
    }
  }

  checkSurroundingTiles(rowCoord: number, colCoord: number) {
    return (
      this.treeArray[rowCoord - 1][colCoord - 1] == 1 &&
      this.treeArray[rowCoord - 1][colCoord] == 1 &&
      this.treeArray[rowCoord - 1][colCoord + 1] == 1 &&
      this.treeArray[rowCoord][colCoord - 1] == 1 &&
      this.treeArray[rowCoord][colCoord] == 1 &&
      this.treeArray[rowCoord][colCoord + 1] == 1 &&
      this.treeArray[rowCoord + 1][colCoord - 1] == 1 &&
      this.treeArray[rowCoord + 1][colCoord] == 1 &&
      this.treeArray[rowCoord + 1][colCoord + 1] == 1
    );
  }

  placeNFOs(iterator: number) {
    let selectedNFO;
    let scaleX, scaleY, scaleZ, posY;
    if (globalThis.theme == 0) {
      selectedNFO = this.NFOs[Math.floor(Math.random() * 4)];
      if (
        selectedNFO == "Tower1" ||
        selectedNFO == "Tower2" ||
        selectedNFO == "Tower3"
      ) {
        scaleY = 1.5;
        posY = 1;
      } else {
        scaleY = 2.1;
        posY = 2.1;
      }
      this.importMesh(
        selectedNFO,
        this.houseArray[iterator][0] * 2.1 + 1.05,
        posY,
        this.houseArray[iterator][1] * 2.1 + 1.05,
        Math.round(Math.random() * 4) * 300,
        true,
        2.1,
        scaleY,
        2.1
      );
    } else if (globalThis.theme == 1) {
      selectedNFO = this.spaceNFOs[Math.floor(Math.random() * 2)];
      if (selectedNFO == "SpaceRockBig1") {
        scaleX = 0.13;
        scaleY = 0.15;
        scaleZ = 0.08;
        posY = 1;
      }
      else {
        scaleX = 0.7;
        scaleY = 0.7;
        scaleZ = 0.7;
        posY = 2.5;
      }
      this.importMesh(
        selectedNFO,
        this.houseArray[iterator][0] * 2.1 + 1.05,
        posY,
        this.houseArray[iterator][1] * 2.1 + 1.05,
        Math.round(Math.random() * 4) * 90,
        true,
        scaleX,
        scaleY,
        scaleZ
      );
    }
  }

  placeTrees() {
    for (let rIndex = 0; rIndex < this.glbDef.rows; rIndex++) {
      for (let cIndex = 0; cIndex < this.glbDef.columns; cIndex++) {
        if (this.treeArray[rIndex][cIndex] == 1) {
          this.getTreeOrRock(rIndex * 2.1, 1.8, cIndex * 2.1);
        }
      }
    }
  }

  // function to generate random tree
  // tree preferences:
  //    - Group 1: Tree1 - Tree7 (<50KB)
  //    - Group 2: Tree1 - Tree12 (<80KB)
  //    - Group 3: Tree1 - Tree15 (<200KB)
  // spaceRock preferences:
  //    - Group 1: SpaceRock1 - SpaceRock2 (<40KB)
  //    - Group 2: SpaceRock1 - SpaceRock5 (<50KB)
  //    - Group 3: SpaceRock1 - SpaceRock9 (<100KB)
  getTreeOrRock(xcoord: number, ycoord: number, zcoord: number) {
    let item = "";
    let mesh;
    let ycoordALT = ycoord;
    if (globalThis.theme == 0) {
      item = "Tree";
      if (globalThis.detailLevel == 1) {
        item += Math.floor(Math.random() * 7) + 1;
      } else if (globalThis.detailLevel == 2) {
        item += Math.floor(Math.random() * 12) + 1;
      } else if (globalThis.detailLevel == 3) {
        item += Math.floor(Math.random() * 15) + 1;
      }
      mesh = Atlas.trees.get(item + ".glb").createInstance("");
    } else if (globalThis.theme == 1) {
      item = "SpaceRock";
      let itemNo = 0;
      if (globalThis.detailLevel == 1) {
        itemNo = Math.floor(Math.random() * 2) + 1;
      } else if (globalThis.detailLevel == 2) {
        itemNo = Math.floor(Math.random() * 5) + 1;
      } else if (globalThis.detailLevel == 3) {
        itemNo = Math.floor(Math.random() * 8) + 1;
      }
      let scale = { scaleX: 0, scaleY: 0, scaleZ: 0 };
      this.getSpaceRockScaling(scale, itemNo);
      item += itemNo;
      mesh = Atlas.spaceRocks.get(item + ".glb").createInstance("");
      mesh.scaling = new BABYLON.Vector3(
        scale.scaleX,
        scale.scaleY,
        scale.scaleZ
      );
      ycoordALT -= 0.8;
    }
    mesh.position = new BABYLON.Vector3(xcoord, ycoordALT, zcoord);
    mesh.rotation = new BABYLON.Vector3(0, Math.random() * 180, 0);
  }

  // scaling chart for spacerocks
  //              leng  hght  wdth
  // spaceRock1 = 0.03, 0.05, 0.04
  // spaceRock2 = 0.11, 0.15, 0.13
  // spaceRock3 = 0.13, 0.15, 0.09
  // spaceRock4 = 0.07, 0.04, 0.07
  // spaceRock5 = 0.04, 0.15, 0.06
  // spaceRock6 = 0.05, 0.07, 0.05
  // spaceRock7 = 0.025 0.05, 0.02
  // spaceRock8 = 0.025 0.08, 0.02
  getSpaceRockScaling(scalingObj, itemNo: number) {
    switch (itemNo) {
      case 1: {
        scalingObj.scaleX = 0.03;
        scalingObj.scaleY = 0.05;
        scalingObj.scaleZ = 0.04;
        break;
      }
      case 2: {
        scalingObj.scaleX = 0.11;
        scalingObj.scaleY = 0.15;
        scalingObj.scaleZ = 0.13;
        break;
      }
      case 3: {
        scalingObj.scaleX = 0.13;
        scalingObj.scaleY = 0.15;
        scalingObj.scaleZ = 0.09;
        break;
      }
      case 4: {
        scalingObj.scaleX = 0.07;
        scalingObj.scaleY = 0.04;
        scalingObj.scaleZ = 0.07;
        break;
      }
      case 5: {
        scalingObj.scaleX = 0.04;
        scalingObj.scaleY = 0.15;
        scalingObj.scaleZ = 0.06;
        break;
      }
      case 6: {
        scalingObj.scaleX = 0.05;
        scalingObj.scaleY = 0.07;
        scalingObj.scaleZ = 0.05;
        break;
      }
      case 7: {
        scalingObj.scaleX = 0.025;
        scalingObj.scaleY = 0.05;
        scalingObj.scaleZ = 0.02;
        break;
      }
      case 8: {
        scalingObj.scaleX = 0.025;
        scalingObj.scaleY = 0.08;
        scalingObj.scaleZ = 0.02;
        break;
      }
      default: {
        break;
      }
    }
  }

  placeDecoration(xcoord: number, ycoord: number, zcoord: number, waterTile: boolean) {
    let item = "";
    let choice;
    if (globalThis.theme == 0) {

    }
    else if (globalThis.theme == 1) {

    }
  }

  // function to get decorative item
  // tall grasses:
  //    - Group 1: TallGrass1 (<=36KB)
  //    - Group 2: TallGrass1 - TallGrass4 (<=37KB)
  //    - Group 3: TallGrass1 - TallGrass5 (<=38KB)
  //
  // grass sets:
  //    - Group 1: GrassSet1 (<90KB)
  //    - Group 2: GrassSet1 - GrassSet3 (<130KB)
  //    - Group 3: GrassSet1 - GrassSet5 (<150KB)
  //
  // mushrooms:
  //    - Group 1: Mushrooms1 - Mushrooms2 (<40KB)
  //    - Group 2: Mushrooms1 - Mushrooms3 (<50KB)
  //    - Group 3: Mushrooms1 - Mushrooms4 (<60KB)
  chooseItem(
    xcoord: number,
    ycoord: number,
    zcoord: number,
    waterTile: boolean
  ) {
    let item = "";

    let choice;
    if (waterTile) {
      choice = 3;
    } else {
      choice = Math.floor(Math.random() * 3);
    }

    xcoord += Math.random() * 1;
    zcoord += Math.random() * 1;

    // switch to pick item
    switch (choice) {
      // case 0 = GrassSet
      case 0: {
        item = "GrassSet";
        if (globalThis.detailLevel == 1) {
          item += Math.floor(Math.random() * 1) + 1;
          let mesh = Atlas.grass.get(item + ".glb").createInstance("");
          mesh.position = new BABYLON.Vector3(xcoord, ycoord, zcoord);
          mesh.rotation = new BABYLON.Vector3(0, Math.random() * 180, 0);
        } else if (globalThis.detailLevel == 2) {
          item += Math.floor(Math.random() * 4) + 1;
          let mesh = Atlas.grass.get(item + ".glb").createInstance("");
          mesh.position = new BABYLON.Vector3(xcoord, ycoord, zcoord);
          mesh.rotation = new BABYLON.Vector3(0, Math.random() * 180, 0);
        } else if (globalThis.detailLevel == 3) {
          item += Math.floor(Math.random() * 5) + 1;
          let mesh = Atlas.grass.get(item + ".glb").createInstance("");
          mesh.position = new BABYLON.Vector3(xcoord, ycoord, zcoord);
          mesh.rotation = new BABYLON.Vector3(0, Math.random() * 180, 0);
        }
        break;
      }
      // case 1 = TallGrass
      case 1: {
        item = "TallGrass";
        if (globalThis.detailLevel == 1) {
          item += Math.floor(Math.random() * 1) + 1;
          let mesh = Atlas.tallGrass.get(item + ".glb").createInstance("");
          mesh.position = new BABYLON.Vector3(xcoord, ycoord, zcoord);
          mesh.rotation = new BABYLON.Vector3(0, Math.random() * 180, 0);
        } else if (globalThis.detailLevel == 2) {
          item += Math.floor(Math.random() * 3) + 1;
          let mesh = Atlas.tallGrass.get(item + ".glb").createInstance("");
          mesh.position = new BABYLON.Vector3(xcoord, ycoord, zcoord);
          mesh.rotation = new BABYLON.Vector3(0, Math.random() * 180, 0);
        } else if (globalThis.detailLevel == 3) {
          item += Math.floor(Math.random() * 5) + 1;
          let mesh = Atlas.tallGrass.get(item + ".glb").createInstance("");
          mesh.position = new BABYLON.Vector3(xcoord, ycoord, zcoord);
          mesh.rotation = new BABYLON.Vector3(0, Math.random() * 180, 0);
        }
        break;
      }
      // case 2 = Stones
      case 2: {
        item = "Stones" + (Math.floor(Math.random() * 2) + 1);
        let mesh = Atlas.stones.get(item + ".glb").createInstance("");
        mesh.position = new BABYLON.Vector3(xcoord, ycoord, zcoord);
        mesh.rotation = new BABYLON.Vector3(0, Math.random() * 180, 0);
        break;
      }
      // case 3 = Mushrooms
      case 3: {
        /*
          NOT SURE IF WE SHOULD INCLUDE MUSHROOMS IF CLIENT WANTS TO USE THESE FOR MUSHROOM ITEMS
        */
        // item = "Mushrooms";
        // if (globalThis.detailLevel == 1) {
        //   item += Math.floor(Math.random() * 2) + 1;
        //   let mesh = Atlas.mushrooms.get(item + ".glb").createInstance("");
        //   mesh.position = new BABYLON.Vector3(xcoord, 1.3, zcoord);
        //   mesh.rotation = new BABYLON.Vector3(0, Math.random() * 180, 0);
        // }
        // else if (globalThis.detailLevel == 2) {
        //   item += Math.floor(Math.random() * 3) + 1;
        //   let mesh = Atlas.mushrooms.get(item + ".glb").createInstance("");
        //   mesh.position = new BABYLON.Vector3(xcoord, 1.5, zcoord);
        //   mesh.rotation = new BABYLON.Vector3(0, Math.random() * 180, 0);
        // }
        // else if (globalThis.detailLevel == 3) {
        //   item += Math.floor(Math.random() * 4) + 1;
        //   let mesh = Atlas.mushrooms.get(item + ".glb").createInstance("");
        //   mesh.position = new BABYLON.Vector3(xcoord, 1.5, zcoord);
        //   mesh.rotation = new BABYLON.Vector3(0, Math.random() * 180, 0);
        // }
        break;
      }
      default: {
        break;
      }
    }
  }

  checkMove() {
    switch (this.directionFacing) {
      //checking 1/2 is checking for water or trees
      case 0: {
        if (
          this.movementGrid[this.claraXCoord - 1][this.claraYCoord] == 1 ||
          this.movementGrid[this.claraXCoord - 1][this.claraYCoord] == 2
        ) {
          this.playClaraDeathAnimation();
          this.alive = false;
          return false;
        }
        //check 5 for leaf
        if (this.movementGrid[this.claraXCoord - 1][this.claraYCoord] == 5) {
          this.movementGrid[this.claraXCoord][this.claraYCoord] = 0;
          this.movementGrid[this.claraXCoord - 1][this.claraYCoord] = 4;
          this.leavesCollected += 1;
          this.claraXCoord -= 1;
          this.newLeafAnimation(-1, 0);
          //this.castRayLeaf();
          return true;
        }
        //check 6 is for mushroom
        if (this.movementGrid[this.claraXCoord - 1][this.claraYCoord] == 6) {
          if (this.checkMushroomMove()) {
            this.movementGrid[this.claraXCoord][this.claraYCoord] = 0;
            this.movementGrid[this.claraXCoord - 1][this.claraYCoord] = 4;
            this.claraXCoord -= 1;
            this.newMushroomAnimation(-1, 0);
            // this.castRayMushroom(-1, 0);
            return true;
          } else {
            return false;
          }
        }
        this.movementGrid[this.claraXCoord][this.claraYCoord] = 0;
        this.movementGrid[this.claraXCoord - 1][this.claraYCoord] = 4;
        this.claraXCoord -= 1;
        return true;
      }
      case 1: {
        if (
          this.movementGrid[this.claraXCoord][this.claraYCoord + 1] == 1 ||
          this.movementGrid[this.claraXCoord][this.claraYCoord + 1] == 2
        ) {
          this.playClaraDeathAnimation();
          this.alive = false;
          return false;
        }
        //check 5 for leaf
        if (this.movementGrid[this.claraXCoord][this.claraYCoord + 1] == 5) {
          this.movementGrid[this.claraXCoord][this.claraYCoord] = 0;
          this.movementGrid[this.claraXCoord][this.claraYCoord + 1] = 4;
          this.leavesCollected += 1;
          this.claraYCoord += 1;
          this.newLeafAnimation(0, 1);
          //this.castRayLeaf();
          return true;
        }
        //check 6 is for mushroom
        if (this.movementGrid[this.claraXCoord][this.claraYCoord + 1] == 6) {
          if (this.checkMushroomMove()) {
            this.movementGrid[this.claraXCoord][this.claraYCoord] = 0;
            this.movementGrid[this.claraXCoord][this.claraYCoord + 1] = 4;
            this.claraYCoord += 1;
            this.newMushroomAnimation(0, 1);
            //this.castRayMushroom(0, 1);
            return true;
          } else {
            return false;
          }
        }
        this.movementGrid[this.claraXCoord][this.claraYCoord] = 0;
        this.movementGrid[this.claraXCoord][this.claraYCoord + 1] = 4;
        this.claraYCoord += 1;
        return true;
      }
      case 2: {
        if (
          this.movementGrid[this.claraXCoord + 1][this.claraYCoord] == 1 ||
          this.movementGrid[this.claraXCoord + 1][this.claraYCoord] == 2
        ) {
          this.playClaraDeathAnimation();
          this.alive = false;
          return false;
        }
        //check 5 for leaf
        if (this.movementGrid[this.claraXCoord + 1][this.claraYCoord] == 5) {
          //this.castRayLeaf();
          this.movementGrid[this.claraXCoord][this.claraYCoord] = 0;
          this.movementGrid[this.claraXCoord + 1][this.claraYCoord] = 4;
          this.leavesCollected += 1;
          this.claraXCoord += 1;
          this.newLeafAnimation(1, 0);
          return true;
        }
        //check 6 is for mushroom
        if (this.movementGrid[this.claraXCoord + 1][this.claraYCoord] == 6) {
          if (this.checkMushroomMove()) {
            this.movementGrid[this.claraXCoord][this.claraYCoord] = 0;
            this.movementGrid[this.claraXCoord + 1][this.claraYCoord] = 4;
            this.claraXCoord += 1;
            // this.castRayMushroom(1, 0);
            this.newMushroomAnimation(1, 0);
            return true;
          } else {
            return false;
          }
        }
        this.movementGrid[this.claraXCoord][this.claraYCoord] = 0;
        this.movementGrid[this.claraXCoord + 1][this.claraYCoord] = 4;
        this.claraXCoord += 1;
        return true;
      }
      case 3: {
        if (
          this.movementGrid[this.claraXCoord][this.claraYCoord - 1] == 1 ||
          this.movementGrid[this.claraXCoord][this.claraYCoord - 1] == 2
        ) {
          this.playClaraDeathAnimation();
          this.alive = false;
          return false;
        }
        //check 5 for leaf
        if (this.movementGrid[this.claraXCoord][this.claraYCoord - 1] == 5) {
          // this.castRayLeaf();
          this.movementGrid[this.claraXCoord][this.claraYCoord] = 0;
          this.movementGrid[this.claraXCoord][this.claraYCoord - 1] = 4;
          this.leavesCollected += 1;
          this.claraYCoord -= 1;
          this.newLeafAnimation(0, -1);
          return true;
        }
        //check 6 is for mushroom
        if (this.movementGrid[this.claraXCoord][this.claraYCoord - 1] == 6) {
          if (this.checkMushroomMove()) {
            this.movementGrid[this.claraXCoord][this.claraYCoord] = 0;
            this.movementGrid[this.claraXCoord][this.claraYCoord - 1] = 4;
            this.claraYCoord -= 1;
            // this.castRayMushroom(0, -1);
            this.newMushroomAnimation(0, -1);
            return true;
          } else {
            return false;
          }
        }
        this.movementGrid[this.claraXCoord][this.claraYCoord] = 0;
        this.movementGrid[this.claraXCoord][this.claraYCoord - 1] = 4;
        this.claraYCoord -= 1;
        return true;
      }
      default: {
        break;
      }
    }
  }

  checkMushroomMove() {
    switch (this.directionFacing) {
      case 0: {
        //check if ahead of mushroom is a tree or water
        if (
          this.movementGrid[this.claraXCoord - 2][this.claraYCoord] == 1 ||
          this.movementGrid[this.claraXCoord - 2][this.claraYCoord] == 2 ||
          this.movementGrid[this.claraXCoord - 2][this.claraYCoord] == 5 ||
          this.movementGrid[this.claraXCoord - 2][this.claraYCoord] == 6
        ) {
          return false;
        }
        //if true, update grid position of the mushroom and clara, then update clara x/y position
        //  this.movementGrid[this.claraXCoord][this.claraYCoord] = 0;
        //  this.movementGrid[this.claraXCoord-1][this.claraYCoord] = 4;
        this.movementGrid[this.claraXCoord - 2][this.claraYCoord] = 6;
        //this.claraXCoord -= 1;
        //this.claraXCoord -= 1;
        return true;
      }
      case 1: {
        if (
          this.movementGrid[this.claraXCoord][this.claraYCoord + 2] == 1 ||
          this.movementGrid[this.claraXCoord][this.claraYCoord + 2] == 2 ||
          this.movementGrid[this.claraXCoord][this.claraYCoord + 2] == 5 ||
          this.movementGrid[this.claraXCoord][this.claraYCoord + 2] == 6
        ) {
          return false;
        }
        //this.movementGrid[this.claraXCoord][this.claraYCoord] = 0;
        //this.movementGrid[this.claraXCoord][this.claraYCoord+1] = 4;
        this.movementGrid[this.claraXCoord][this.claraYCoord + 2] = 6;
        //this.claraYCoord += 1;
        //this.claraYCoord += 1;
        return true;
      }
      case 2: {
        if (
          this.movementGrid[this.claraXCoord + 2][this.claraYCoord] == 1 ||
          this.movementGrid[this.claraXCoord + 2][this.claraYCoord] == 2 ||
          this.movementGrid[this.claraXCoord + 2][this.claraYCoord] == 5 ||
          this.movementGrid[this.claraXCoord + 2][this.claraYCoord] == 6
        ) {
          return false;
        }
        //this.movementGrid[this.claraXCoord][this.claraYCoord] = 0;
        //this.movementGrid[this.claraXCoord+1][this.claraYCoord] = 4;
        this.movementGrid[this.claraXCoord + 2][this.claraYCoord] = 6;
        //this.claraXCoord += 1;
        //this.claraXCoord += 1;
        return true;
      }
      case 3: {
        if (
          this.movementGrid[this.claraXCoord][this.claraYCoord - 2] == 1 ||
          this.movementGrid[this.claraXCoord][this.claraYCoord - 2] == 2 ||
          this.movementGrid[this.claraXCoord][this.claraYCoord - 2] == 5 ||
          this.movementGrid[this.claraXCoord][this.claraYCoord - 2] == 6
        ) {
          return false;
        }
        //this.movementGrid[this.claraXCoord][this.claraYCoord] = 0;
        //this.movementGrid[this.claraXCoord][this.claraYCoord-1] = 4;
        this.movementGrid[this.claraXCoord][this.claraYCoord - 2] = 6;
        //this.claraYCoord -= 1;
        //this.claraYCoord -= 1;
        return true;
      }
      default: {
        break;
      }
    }
  }

  initialiseClara() {
    if (this.directionFacing == 0) {
      this.clara.rotate(BABYLON.Vector3.Up(), -1.5708); //turn clara left
    } else if (this.directionFacing == 2) {
      this.clara.rotate(BABYLON.Vector3.Up(), 1.5708); //turn clara right
    } else if (this.directionFacing == 3) {
      this.clara.rotate(BABYLON.Vector3.Up(), 3.1416); //turn clara around
    }
  }

  async newLeafAnimation(x: number, z: number) {
    var mesh = this.leafs[this.claraXCoord][this.claraYCoord];

    this.leafs[this.claraXCoord][this.claraYCoord] = null;

    var mesh1 = this.leafAnimatorArray[this.claraXCoord][this.claraYCoord];

    mesh1.stop();
    if (globalThis.theme == 0) {
      mesh1.start(true, 1, 150, 300);
    }
    else if (globalThis.theme == 1) {
      mesh1.start(true, 1, 385, 600);
    }
     //idle
    await delay(this.currentLeafAnimationSpeed);
    mesh.dispose();
  }

  async customAnimationFunctionClara(nextPosition) {
    setTimeout(async () => {
      var anim = BABYLON.Animation.CreateAndStartAnimation(
        "anim",
        this.clara,
        "position",
        this.currentFrameSpeed,
        60,
        this.currentPosition,
        nextPosition,
        //new BABYLON.Vector3(this.currentPosition._x-2.1, this.currentPosition._y, this.currentPosition._z),
        BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE
      );

      //this.playerAnimator.stop();
      //this.playerAnimator.start(true, 1, 60, 160); //walk
      this.playClaraWalkAnimation();
      // this.playClaraTurnRightAnimation();
      await anim.waitAsync();
      this.playClaraIdleAnimation();
      //this.playerAnimator.stop();
      //this.playerAnimator.start(true, 1, 0, 58); //idle
    });
  }

  claraTurnRightFunction() {
    if (!this.justMoved && this.alive) {
      this.justMoved = true;
      setTimeout(() => (this.justMoved = false), this.currentTurnSpeed);

      // setTimeout(async () => {

      //   var anim = this.scene.beginAnimation(this.clara, 120, 156, true);

      //   this.playClaraWalkAnimation();

      //   await anim.waitAsync();

      //   this.playClaraIdleAnimation();

      // });

      this.clara.rotate(BABYLON.Vector3.Up(), 1.5708);

      this.playClaraIdleAnimation();

      if (this.directionFacing != 3) {
        this.directionFacing++;
      } else {
        this.directionFacing = 0;
      }
    }
  }

  claraMoveForwardFunction() {
    if (!this.justMoved && this.alive) {
      if (this.checkMove()) {
        //this.currentPosition = this.clara.position;
        this.justMoved = true;
        this.currentPosition = this.clara.position;
        setTimeout(() => (this.justMoved = false), this.currentMoveWaitSpeed); //after 1 second, becomes, false, allows the code to continue, prevents button/keys being spammed

        var nextPosition;
        switch (this.directionFacing) {
          case 0: {
            nextPosition = new BABYLON.Vector3(
              this.currentPosition._x - 2.1,
              this.currentPosition._y,
              this.currentPosition._z
            );

            //this.clara.movePOV(0,0,-2.1);
            //this.clara.movePOV(0,0,2.1);
            break;
          }
          case 1: {
            nextPosition = new BABYLON.Vector3(
              this.currentPosition._x,
              this.currentPosition._y,
              this.currentPosition._z + 2.1
            );
            //this.clara.movePOV(2.1,0,0);
            //this.clara.movePOV(0,0,2.1);
            break;
          }
          case 2: {
            nextPosition = new BABYLON.Vector3(
              this.currentPosition._x + 2.1,
              this.currentPosition._y,
              this.currentPosition._z
            );
            //this.clara.movePOV(0,0,2.1);
            break;
          }
          case 3: {
            nextPosition = new BABYLON.Vector3(
              this.currentPosition._x,
              this.currentPosition._y,
              this.currentPosition._z - 2.1
            );
            // this.clara.movePOV(0,0,-2.1);
            //this.clara.movePOV(0,0,2.1);
            break;
          }
          default: {
            break;
          }
        }
        var anim = this.customAnimationFunctionClara(nextPosition);
      }
    }
  }

  playClaraIdleAnimation() {
    this.playerAnimator.stop();
    this.playerAnimator.start(true, 1, 0, 60); //idle
  }

  playClaraWalkAnimation() {
    this.playerAnimator.stop();
    this.playerAnimator.start(true, 1, 60, 156); //walk
  }

  playClaraDeathAnimation = async () => {
    this.playerAnimator.stop();
    this.playerAnimator.start(true, 1, 320, 366); //death
    await delay(this.currentDeathSpeed);

    //attempting to make her stop at the upside-down position
    this.playerAnimator.stop();
    this.playerAnimator.start(true, 1, 360, 366); //death
    this.playerDied();
  };

  animateRandomMesh(randoMesh: BABYLON.AbstractMesh, x: number, z: number) {
    var anim = BABYLON.Animation.CreateAndStartAnimation(
      "anim",
      randoMesh,
      "position",
      this.currentFrameSpeed,
      60,
      randoMesh.position,
      //nextPosition,
      new BABYLON.Vector3(
        randoMesh.position._x + x,
        randoMesh.position._y,
        randoMesh.position._z + z
      ),
      BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE
    );
  }

  newMushroomAnimation(x: number, z: number) {
    var newx = x * 2.1;
    var newz = z * 2.1;

    var shroom = this.mushrooms[this.claraXCoord][this.claraYCoord];
    this.mushrooms[this.claraXCoord][this.claraYCoord] = null;
    this.mushrooms[this.claraXCoord + x][this.claraYCoord + z] = shroom;

    var anim = BABYLON.Animation.CreateAndStartAnimation(
      "anim",
      shroom,
      "position",
      this.currentFrameSpeed,
      60,
      shroom.position,
      //nextPosition,
      new BABYLON.Vector3(
        shroom.position._x + newx,
        shroom.position._y,
        shroom.position._z + newz
      ),
      BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE
    );
  }

  playClaraTurnRightAnimation() {
    this.playerAnimator.stop();
    //const animWheel = new BABYLON.Animation("anim", "rotation.y", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
    //this.scene.beginAnimation(this.clara, 120, 156, true);
    this.playerAnimator.start(true, 1, 240, 312); //turn right
  }

  playClaraTurnLeftAnimation() {
    this.playerAnimator.stop();
    this.playerAnimator.start(true, 1, 160, 232); //turn left
  }

  castRayMushroom(x: number, z: number) {
    x = x * 2.1;
    z = z * 2.1;
    //below works, but when want to move the origin of the ray, moves clara herself
    //var origin = this.clara.position;
    //below breaks movement
    //var origin = new BABYLON.Vector3(this.clara.position.x, this.clara.position.y+0.1, this.clara.position.z);
    var origin = this.clara.position;
    origin.y += 0.1;

    var forward = new BABYLON.Vector3(0, 0, 1);
    forward = this.vecToLocal(forward, this.clara);

    var direction = forward.subtract(origin);
    direction = BABYLON.Vector3.Normalize(direction);

    var length = 100;

    var ray = new BABYLON.Ray(origin, direction, length);

    //below just generates a line to show where the ray is casting
    // let rayHelper = new BABYLON.RayHelper(ray);
    // rayHelper.show(this.scene);

    var hit = this.scene.pickWithRay(ray);
    origin.y -= 0.1;

    if (hit.pickedMesh) {
      //hit.pickedMesh.scaling.y += 0.5;
      this.animateRandomMesh(hit.pickedMesh, x, z);

      // hit.pickedMesh.scaling.y += 0.5;
    }
  }

  castRayLeaf() {
    var origin = this.clara.position;
    origin.y += 0.1;

    var forward = new BABYLON.Vector3(0, 0, 1);
    forward = this.vecToLocal(forward, this.clara);

    var direction = forward.subtract(origin);
    direction = BABYLON.Vector3.Normalize(direction);

    var length = 100;

    var ray = new BABYLON.Ray(origin, direction, length);

    //below just generates a line to show where the ray is casting
    // let rayHelper = new BABYLON.RayHelper(ray);
    // rayHelper.show(this.scene);

    var hit = this.scene.pickWithRay(ray);
    origin.y -= 0.1;

    if (hit.pickedMesh) {
      setTimeout(async () => {
        var anim = this.animateLeaf(hit.pickedMesh);
        await anim;
        //hit.pickedMesh.dispose();
      });

      //hit.pickedMesh.scaling.y += 0.5;
      //now use the animation loaded into the mesh
    }
  }

  animateLeaf(randoMesh) {
    var anim = BABYLON.Animation.CreateAndStartAnimation(
      "anim",
      randoMesh,
      "position",
      this.currentFrameSpeed,
      60,
      randoMesh.position,
      //nextPosition,
      new BABYLON.Vector3(
        randoMesh.position._x,
        randoMesh.position._y + 5,
        randoMesh.position._z
      ),
      BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE
    );
  }

  vecToLocal(vector, mesh) {
    var m = mesh.getWorldMatrix();
    var v = BABYLON.Vector3.TransformCoordinates(vector, m);
    return v;
  }

  placeIslands(rows: number, columns: number) {
    // chooses how many islands to create based on detail level
    // if detail level is high create 10
    if (globalThis.detailLevel == 3) {
      for (let i = 0; i < 10; i++) {
        // get random x value (pos or neg multiple of rows)
        let x = rows * (Math.random() * 10 + 6);
        x *= Math.round(Math.random()) ? 1 : -1;

        // get random y value (between -10 to 10)
        let y = Math.floor(Math.random() * 10) + 1;
        y *= Math.round(Math.random()) ? 1 : -1;

        // get random z value (pos or neg multiple of columns)
        let z = columns * (Math.random() * 10 + 6);
        z *= Math.round(Math.random()) ? 1 : -1;

        // call create island func
        this.createDistantIsland(x, y, z);
      }
    }
    // else if detail level is medium create 5
    else if (globalThis.detailLevel == 2) {
      for (let i = 0; i < 5; i++) {
        // get random x value (pos or neg multiple of rows)
        let x = rows * (Math.random() * 10 + 6);
        x *= Math.round(Math.random()) ? 1 : -1;

        // get random y value (between -10 to 10)
        let y = Math.floor(Math.random() * 10) + 1;
        y *= Math.round(Math.random()) ? 1 : -1;

        // get random z value (pos or neg multiple of columns)
        let z = columns * (Math.random() * 10 + 6);
        z *= Math.round(Math.random()) ? 1 : -1;

        // call create island func
        this.createDistantIsland(x, y, z);
      }
    }
  }

  // function to create a distant island
  createDistantIsland(x: number, y: number, z: number) {
    // iRows = rows of the island (min 2, max 6)
    // iCols = columns of the island (min 2, max 6)
    let iRows = Math.floor(Math.random() * (6 - 2)) + 2;
    let iCols = Math.floor(Math.random() * (6 - 2)) + 2;

    // island generation loop
    for (let iRowsIndex = 0; iRowsIndex < iRows; iRowsIndex++) {
      for (let iColsIndex = 0; iColsIndex < iCols; iColsIndex++) {
        // determines tile type (1 = dark grass, 2 = light grass, 3 = water)
        let tileType = Math.floor(Math.random() * 2) + 1;
        // if tile is water, place water
        if (tileType == 3) {
          let tile = Atlas.topTiles.get("WaterTop.glb").createInstance("top");
          tile.position = new BABYLON.Vector3(
            iRowsIndex * 2.1 + x,
            0.9 + y,
            iColsIndex * 2.1 + z
          );
          tile.scaling = new BABYLON.Vector3(1.2, 1, 1.2);
        }
        // else place either dark or light grass
        else {
          let tile;
          if (globalThis.theme == 0) {
            tile = Atlas.topTiles
              .get("GrassTop" + tileType + ".glb")
              .createInstance("top");
          } else if (globalThis.theme == 1) {
            tile = Atlas.topTiles
              .get("SpaceTop" + tileType + ".glb")
              .createInstance("top");
          }
          tile.position = new BABYLON.Vector3(
            iRowsIndex * 2.1 + x,
            y,
            iColsIndex * 2.1 + z
          );
        }
        // if dark grass, place tree
        if (tileType == 1) {
          this.getTreeOrRock(
            iRowsIndex * 2.1 + x,
            1.6 + y,
            iColsIndex * 2.1 + z
          );
        }

        // if water tile, place water item
        if (tileType == 3) {
          if (globalThis.detailLevel == 3) {
            this.chooseItem(
              iRowsIndex * 2.1 + x,
              1 + y,
              iColsIndex * 2.1 + z,
              true
            );
          } else if (globalThis.detailLevel == 2) {
            if (Math.floor(Math.random() * 10) + 1 < 5) {
              this.chooseItem(
                iRowsIndex * 2.1 + x,
                1 + y,
                iColsIndex * 2.1 + z,
                true
              );
            }
          }
        }
        // if grass, place regular item
        else {
          if (globalThis.detailLevel == 3) {
            this.chooseItem(
              iRowsIndex * 2.1 + x,
              1 + y,
              iColsIndex * 2.1 + z,
              false
            );
          } else if (globalThis.detailLevel == 2) {
            if (Math.floor(Math.random() * 10) + 1 < 5) {
              this.chooseItem(
                iRowsIndex * 2.1 + x,
                1 + y,
                iColsIndex * 2.1 + z,
                false
              );
            }
          }
        }
      }
    }

    // place island bottom and scale
    let width = (iRows * 2.1 - 2.1) / 2 + x;
    let length = (iCols * 2.1 - 2.1) / 2 + z;
    if (globalThis.theme == 0) {
      this.importMesh(
        "Island",
        width,
        1.5 + y,
        length,
        0,
        true,
        iRows / 4.5,
        1.8,
        iCols / 4.5
      );
    } else if (globalThis.theme == 1) {
      this.importMesh(
        "SpaceIsland",
        width,
        1.5 + y,
        length,
        0,
        true,
        iRows / 4.5,
        1.8,
        iCols / 4.5
      );
    }
  }

  createFog(r: number, c: number) {
    this.scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    this.scene.fogStart = r * 10;
    this.scene.fogEnd = c * 10;
    this.scene.fogColor = new BABYLON.Color3(0.8, 0.8, 0.8);
  }

  playerDied() {
    document.getElementById("yo").style.display = "block";
    document.getElementById("yo").style.color = "red";
  }
}