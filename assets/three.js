// THREE.JS IMPLEMENTATION

      // 1. Initial Setup
      const scene = new THREE.Scene();
      const buildings = [];
      const colliders = [];
      let cameraShakeTimer = 0.0;
      // Beautiful warm daylight skybox color
      scene.background = new THREE.Color(0xa7d8f7);
      // Day fog fading into atmosphere haze at the horizon
      scene.fog = new THREE.Fog(0xc2e2f9, 150, 1600);

      const camera = new THREE.PerspectiveCamera(
        65,
        window.innerWidth / window.innerHeight,
        0.1,
        8000,
      );
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      document.body.appendChild(renderer.domElement);

      // 2. Day Lights
      const ambientLight = new THREE.AmbientLight(0xd4eaff, 0.7); // Sky fill light
      scene.add(ambientLight);

      const sunLight = new THREE.DirectionalLight(0xfff3e3, 1.7); // Sunlight
      sunLight.position.set(400, 600, 300);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 1500;

      const d = 400; // Shadow camera coverage area
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0004;
      scene.add(sunLight);

      // 3. Ground / Turf Base
      const grassMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d7044, // Soft grass green
        roughness: 0.95,
        metalness: 0.05,
      });
      const turfGround = new THREE.Mesh(
        new THREE.PlaneGeometry(8000, 8000),
        grassMaterial,
      );
      turfGround.rotation.x = -Math.PI / 2;
      turfGround.receiveShadow = true;
      scene.add(turfGround);

      // 4. Procedural Textures Helper
      function createSkyscraperTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");

        // Shiny cyan-blue glass facade
        ctx.fillStyle = "#2d5070";
        ctx.fillRect(0, 0, 256, 512);

        // Glass panel grids
        ctx.strokeStyle = "#152535";
        ctx.lineWidth = 3;
        const cols = 12;
        const rows = 28;
        const wWidth = 256 / cols;
        const wHeight = 512 / rows;

        for (let r = 0; r < rows; r++) {
          ctx.beginPath();
          ctx.moveTo(0, r * wHeight);
          ctx.lineTo(256, r * wHeight);
          ctx.stroke();

          for (let c = 0; c < cols; c++) {
            if (r === 0) {
              ctx.beginPath();
              ctx.moveTo(c * wWidth, 0);
              ctx.lineTo(c * wWidth, 512);
              ctx.stroke();
            }
            // Some blinds/curtains
            if (Math.random() > 0.75) {
              ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
              ctx.fillRect(
                c * wWidth + 2,
                r * wHeight + 2,
                wWidth - 4,
                wHeight * 0.4,
              );
            }
          }
        }

        // Reflection glaze
        ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(150, 0);
        ctx.lineTo(0, 300);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(80, 0);
        ctx.lineTo(256, 0);
        ctx.lineTo(0, 512);
        ctx.lineTo(0, 380);
        ctx.closePath();
        ctx.fill();

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
      }

      function createBrickTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");

        // Brick red
        ctx.fillStyle = "#8f4f3b";
        ctx.fillRect(0, 0, 128, 128);

        ctx.strokeStyle = "#4a2f24";
        ctx.lineWidth = 1;
        const rows = 16;
        const cols = 8;
        const xGap = 128 / cols;
        const yGap = 128 / rows;

        for (let r = 0; r < rows; r++) {
          ctx.beginPath();
          ctx.moveTo(0, r * yGap);
          ctx.lineTo(128, r * yGap);
          ctx.stroke();

          const offset = (r % 2) * (xGap / 2);
          for (let c = 0; c <= cols; c++) {
            ctx.beginPath();
            ctx.moveTo(c * xGap - offset, r * yGap);
            ctx.lineTo(c * xGap - offset, (r + 1) * yGap);
            ctx.stroke();
          }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
      }

      function createRoadTexture(isVertical) {
        const canvas = document.createElement("canvas");
        canvas.width = isVertical ? 64 : 512;
        canvas.height = isVertical ? 512 : 64;
        const ctx = canvas.getContext("2d");

        // Pavement asphalt
        ctx.fillStyle = "#22252b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 2;

        if (isVertical) {
          // Yellow double line (center)
          ctx.strokeStyle = "#e5a93c";
          ctx.beginPath();
          ctx.moveTo(30, 0);
          ctx.lineTo(30, 512);
          ctx.moveTo(34, 0);
          ctx.lineTo(34, 512);
          ctx.stroke();

          // White shoulder boundaries
          ctx.strokeStyle = "#fff";
          ctx.beginPath();
          ctx.moveTo(4, 0);
          ctx.lineTo(4, 512);
          ctx.moveTo(60, 0);
          ctx.lineTo(60, 512);
          ctx.stroke();

          // Dashed lane separators
          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.setLineDash([15, 20]);
          ctx.beginPath();
          ctx.moveTo(17, 0);
          ctx.lineTo(17, 512);
          ctx.moveTo(47, 0);
          ctx.lineTo(47, 512);
          ctx.stroke();
        } else {
          // Yellow double line
          ctx.strokeStyle = "#e5a93c";
          ctx.beginPath();
          ctx.moveTo(0, 30);
          ctx.lineTo(512, 30);
          ctx.moveTo(0, 34);
          ctx.lineTo(512, 34);
          ctx.stroke();

          // White shoulder boundaries
          ctx.strokeStyle = "#fff";
          ctx.beginPath();
          ctx.moveTo(0, 4);
          ctx.lineTo(512, 4);
          ctx.moveTo(0, 60);
          ctx.lineTo(512, 60);
          ctx.stroke();

          // Dashed lane separators
          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.setLineDash([15, 20]);
          ctx.beginPath();
          ctx.moveTo(0, 17);
          ctx.lineTo(512, 17);
          ctx.moveTo(0, 47);
          ctx.lineTo(512, 47);
          ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        if (isVertical) {
          texture.repeat.set(1, 6);
        } else {
          texture.repeat.set(6, 1);
        }
        return texture;
      }

      function createCrosswalkTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#22252b";
        ctx.fillRect(0, 0, 128, 32);

        // Zebra stripes
        ctx.fillStyle = "#ffffff";
        for (let i = 8; i < 128; i += 24) {
          ctx.fillRect(i, 0, 10, 32);
        }
        return new THREE.CanvasTexture(canvas);
      }

      function createHelipadTexture() {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");
        // Metal roof sheet
        ctx.fillStyle = "#2e3037";
        ctx.fillRect(0, 0, 128, 128);
        // Yellow border ring
        ctx.strokeStyle = "#ffaa00";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(64, 64, 45, 0, Math.PI * 2);
        ctx.stroke();
        // Technical Letter H
        ctx.fillStyle = "#ffaa00";
        ctx.font = "900 50px Orbitron";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("H", 64, 64);
        return new THREE.CanvasTexture(canvas);
      }

      function createBillboardTexture(text, colorStr) {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#0c0c0f";
        ctx.fillRect(0, 0, 256, 64);
        ctx.strokeStyle = colorStr || "#ff5500";
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, 248, 56);

        ctx.shadowBlur = 10;
        ctx.shadowColor = colorStr || "#ff5500";
        ctx.fillStyle = colorStr || "#ff5500";
        ctx.font = "bold 26px Orbitron";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 128, 32);
        return new THREE.CanvasTexture(canvas);
      }

      const skyTex = createSkyscraperTexture();
      const brickTex = createBrickTexture();
      const crosswalkTex = createCrosswalkTexture();
      const helipadTex = createHelipadTexture();

      // 5. City Grid Setup
      const blocksList = [];
      const streetlights = [];
      const trafficLights = [];

      // Intersections are at x, z = -1200, -900, -600, -300, 0, 300, 600, 900, 1200
      // Block Centers: -1050, -750, -450, -150, 150, 450, 750, 1050
      // Roads: 60 width, Sidewalk blocks: 240 width

      const blockIndices = [-4, -3, -2, -1, 0, 1, 2, 3];

      function createTree(x, z) {
        const treeGroup = new THREE.Group();
        treeGroup.position.set(x, 0, z);

        // Trunk
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.5, 6, 8),
          new THREE.MeshStandardMaterial({ color: 0x543926, roughness: 0.9 }),
        );
        trunk.position.y = 3;
        trunk.castShadow = true;
        treeGroup.add(trunk);

        // Foliage low-poly tiers (stacked cones)
        const greenMat = new THREE.MeshStandardMaterial({
          color: 0x225c34,
          roughness: 0.8,
        });

        const f1 = new THREE.Mesh(
          new THREE.ConeGeometry(2.4, 4.0, 6),
          greenMat,
        );
        f1.position.y = 5.5;
        f1.castShadow = true;
        treeGroup.add(f1);

        const f2 = new THREE.Mesh(
          new THREE.ConeGeometry(1.8, 3.2, 6),
          greenMat,
        );
        f2.position.y = 7.5;
        f2.castShadow = true;
        treeGroup.add(f2);

        const f3 = new THREE.Mesh(
          new THREE.ConeGeometry(1.2, 2.4, 6),
          greenMat,
        );
        f3.position.y = 9.0;
        f3.castShadow = true;
        treeGroup.add(f3);

        scene.add(treeGroup);
      }

      function createStreetLight(x, z, angleY) {
        const lightGroup = new THREE.Group();
        lightGroup.position.set(x, 0, z);
        lightGroup.rotation.y = angleY;

        const poleMat = new THREE.MeshStandardMaterial({
          color: 0x475569,
          metalness: 0.8,
          roughness: 0.2,
        });

        // Main vertical post
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.22, 16, 8),
          poleMat,
        );
        post.position.y = 8;
        post.castShadow = true;
        lightGroup.add(post);

        // Arm extension
        const arm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 4.5, 8),
          poleMat,
        );
        arm.rotation.x = Math.PI / 2;
        arm.position.set(0, 15.8, 2.0);
        arm.castShadow = true;
        lightGroup.add(arm);

        // Light bulb shell
        const shell = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.4, 1.2),
          poleMat,
        );
        shell.position.set(0, 15.8, 4.25);
        lightGroup.add(shell);

        // Bulb glow
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xfff9e0 }), // Soft daytime off-yellow
        );
        bulb.position.set(0, 15.6, 4.25);
        lightGroup.add(bulb);

        scene.add(lightGroup);
      }

      // Traffic Light System
      const TL_PHASES = {
        NS_GREEN: 0, // NS: Green, EW: Red
        NS_YELLOW: 1, // NS: Yellow, EW: Red
        EW_GREEN: 2, // NS: Red, EW: Green
        EW_YELLOW: 3, // NS: Red, EW: Yellow
      };
      let currentTLPhase = TL_PHASES.NS_GREEN;
      let tlTimer = 0.0;

      function createTrafficLight(x, z, facesDirection) {
        const tlGroup = new THREE.Group();
        tlGroup.position.set(x, 0, z);
        tlGroup.rotation.y = facesDirection === "NS" ? 0 : Math.PI / 2;

        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.8,
          roughness: 0.2,
        });

        // Vertical post
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.25, 17, 8),
          bodyMat,
        );
        pole.position.y = 8.5;
        pole.castShadow = true;
        tlGroup.add(pole);

        // Arm
        const arm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, 6, 8),
          bodyMat,
        );
        arm.rotation.z = Math.PI / 2;
        arm.position.set(2.8, 16.5, 0);
        arm.castShadow = true;
        tlGroup.add(arm);

        // Light box
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 2.4, 0.8),
          bodyMat,
        );
        box.position.set(5.5, 16.5, 0);
        box.castShadow = true;
        tlGroup.add(box);

        // Bulbs (Red, Yellow, Green)
        const redGlow = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0x4a0000 }),
        );
        redGlow.position.set(5.5, 17.2, 0.45);
        tlGroup.add(redGlow);

        const yellowGlow = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0x4a3a00 }),
        );
        yellowGlow.position.set(5.5, 16.5, 0.45);
        tlGroup.add(yellowGlow);

        const greenGlow = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0x004a00 }),
        );
        greenGlow.position.set(5.5, 15.8, 0.45);
        tlGroup.add(greenGlow);

        scene.add(tlGroup);

        const tlObj = {
          group: tlGroup,
          direction: facesDirection,
          x: x,
          z: z,
          red: redGlow,
          yellow: yellowGlow,
          green: greenGlow,
        };
        trafficLights.push(tlObj);
      }

      // Build the grid environment
      const roadMaterialV = new THREE.MeshStandardMaterial({
        map: createRoadTexture(true),
        roughness: 0.85,
      });
      const roadMaterialH = new THREE.MeshStandardMaterial({
        map: createRoadTexture(false),
        roughness: 0.85,
      });
      const sidewalkMaterial = new THREE.MeshStandardMaterial({
        color: 0xa1a1aa,
        roughness: 0.8,
        metalness: 0.1,
      });
      const windowGlassMaterial = new THREE.MeshStandardMaterial({
        map: skyTex,
        metalness: 0.95,
        roughness: 0.08,
      });
      const brickBuildingMaterial = new THREE.MeshStandardMaterial({
        map: brickTex,
        roughness: 0.9,
        metalness: 0.1,
      });

      // Roads lines: -1200, -900, -600, -300, 0, 300, 600, 900, 1200
      const roadCoords = [-1200, -900, -600, -300, 0, 300, 600, 900, 1200];

      // Spawn roads
      roadCoords.forEach((coord) => {
        // Vertical roads
        const roadV = new THREE.Mesh(
          new THREE.BoxGeometry(60, 0.2, 2600),
          roadMaterialV,
        );
        roadV.position.set(coord, 0.1, 0);
        roadV.receiveShadow = true;
        scene.add(roadV);

        // Horizontal roads
        const roadH = new THREE.Mesh(
          new THREE.BoxGeometry(2600, 0.2, 60),
          roadMaterialH,
        );
        roadH.position.set(0, 0.1, coord);
        roadH.receiveShadow = true;
        scene.add(roadH);

        // Spawn intersections details: Crosswalks
        roadCoords.forEach((intersectCoord) => {
          // Crosswalks around intersection (coord, intersectCoord)
          // North crosswalk
          const cwN = new THREE.Mesh(
            new THREE.PlaneGeometry(38, 8),
            new THREE.MeshStandardMaterial({
              map: crosswalkTex,
              roughness: 0.8,
            }),
          );
          cwN.rotation.x = -Math.PI / 2;
          cwN.rotation.z = Math.PI / 2;
          cwN.position.set(coord, 0.22, intersectCoord - 34);
          scene.add(cwN);

          // South crosswalk
          const cwS = new THREE.Mesh(
            new THREE.PlaneGeometry(38, 8),
            new THREE.MeshStandardMaterial({
              map: crosswalkTex,
              roughness: 0.8,
            }),
          );
          cwS.rotation.x = -Math.PI / 2;
          cwS.rotation.z = Math.PI / 2;
          cwS.position.set(coord, 0.22, intersectCoord + 34);
          scene.add(cwS);

          // West crosswalk
          const cwW = new THREE.Mesh(
            new THREE.PlaneGeometry(38, 8),
            new THREE.MeshStandardMaterial({
              map: crosswalkTex,
              roughness: 0.8,
            }),
          );
          cwW.rotation.x = -Math.PI / 2;
          cwW.position.set(coord - 34, 0.22, intersectCoord);
          scene.add(cwW);

          // East crosswalk
          const cwE = new THREE.Mesh(
            new THREE.PlaneGeometry(38, 8),
            new THREE.MeshStandardMaterial({
              map: crosswalkTex,
              roughness: 0.8,
            }),
          );
          cwE.rotation.x = -Math.PI / 2;
          cwE.position.set(coord + 34, 0.22, intersectCoord);
          scene.add(cwE);

          // Spawn Traffic Lights at intersections
          // Diagonal corner placements
          createTrafficLight(coord - 34, intersectCoord - 34, "NS");
          createTrafficLight(coord + 34, intersectCoord + 34, "EW");
        });
      });

      // Spawn blocks
      blockIndices.forEach((bx) => {
        blockIndices.forEach((bz) => {
          const blockX = bx * 300 + 150;
          const blockZ = bz * 300 + 150;

          // Sidewalk Platform
          const sideWalk = new THREE.Mesh(
            new THREE.BoxGeometry(240, 0.4, 240),
            sidewalkMaterial,
          );
          sideWalk.position.set(blockX, 0.2, blockZ);
          sideWalk.receiveShadow = true;
          scene.add(sideWalk);

          const blockInfo = {
            bx: bx,
            bz: bz,
            x: blockX,
            z: blockZ,
          };
          blocksList.push(blockInfo);

          // Block (0, 0) is Central Park
          if (bx === 0 && bz === 0) {
            // Park Turf Overlay
            const parkLawn = new THREE.Mesh(
              new THREE.BoxGeometry(220, 0.2, 220),
              grassMaterial,
            );
            parkLawn.position.set(blockX, 0.42, blockZ);
            parkLawn.receiveShadow = true;
            scene.add(parkLawn);

            // Water Fountain Basin
            const fountainGroup = new THREE.Group();
            fountainGroup.position.set(blockX, 0.5, blockZ);

            const wall = new THREE.Mesh(
              new THREE.CylinderGeometry(16, 16, 2.5, 24),
              new THREE.MeshStandardMaterial({
                color: 0x94a3b8,
                roughness: 0.6,
              }),
            );
            wall.castShadow = true;
            wall.receiveShadow = true;
            fountainGroup.add(wall);

            const water = new THREE.Mesh(
              new THREE.CylinderGeometry(15.2, 15.2, 2.0, 24),
              new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                roughness: 0.2,
                metalness: 0.6,
              }),
            );
            water.position.y = 0.2;
            fountainGroup.add(water);

            const centerPipe = new THREE.Mesh(
              new THREE.CylinderGeometry(1.2, 1.6, 6, 8),
              new THREE.MeshStandardMaterial({
                color: 0x64748b,
                metalness: 0.8,
                roughness: 0.3,
              }),
            );
            centerPipe.position.y = 2.5;
            centerPipe.castShadow = true;
            fountainGroup.add(centerPipe);

            scene.add(fountainGroup);
            blockInfo.fountain = fountainGroup;
            blockInfo.fountainWaterParticles = [];

            // Spawn fountain particles
            const particleCount = 40;
            const pMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
            for (let p = 0; p < particleCount; p++) {
              const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.18, 4, 4),
                pMat,
              );
              mesh.position.set(blockX, 3.5, blockZ);
              scene.add(mesh);

              mesh.userData = {
                velX: (Math.random() - 0.5) * 0.4,
                velY: 0.4 + Math.random() * 0.4,
                velZ: (Math.random() - 0.5) * 0.4,
              };
              blockInfo.fountainWaterParticles.push(mesh);
            }

            // Register fountain circle collider
            colliders.push({ type: "circle", x: blockX, z: blockZ, r: 16.5 });

            // Scatter trees inside the park
            for (let t = 0; t < 12; t++) {
              const tAngle = Math.random() * Math.PI * 2;
              const tDist = 30 + Math.random() * 65;
              createTree(
                blockX + Math.sin(tAngle) * tDist,
                blockZ + Math.cos(tAngle) * tDist,
              );
            }
          } else if (bx === 1 && bz === -1) {
            // SHOPPING MALL BLOCK
            const plaza = new THREE.Mesh(
              new THREE.BoxGeometry(220, 0.2, 220),
              new THREE.MeshStandardMaterial({
                color: 0x334155,
                roughness: 0.8,
              }),
            );
            plaza.position.set(blockX, 0.42, blockZ);
            plaza.receiveShadow = true;
            scene.add(plaza);

            // Main Mall structure
            const mallBody = new THREE.Mesh(
              new THREE.BoxGeometry(180, 24, 140),
              windowGlassMaterial,
            );
            mallBody.position.set(blockX, 12.42, blockZ);
            mallBody.castShadow = true;
            mallBody.receiveShadow = true;
            scene.add(mallBody);
            colliders.push({
              type: "box",
              minX: blockX - 90,
              maxX: blockX + 90,
              minZ: blockZ - 70,
              maxZ: blockZ + 70,
            });

            // Entrance dome
            const canopy = new THREE.Mesh(
              new THREE.CylinderGeometry(20, 20, 32, 12),
              windowGlassMaterial,
            );
            canopy.position.set(blockX, 16.42, blockZ + 70);
            canopy.castShadow = true;
            canopy.receiveShadow = true;
            scene.add(canopy);
            colliders.push({
              type: "circle",
              x: blockX,
              z: blockZ + 70,
              r: 20,
            });

            // Shopping Mall Billboard
            const signTex = createBillboardTexture("SHOPPING MALL", "#00ffff");
            const sign = new THREE.Mesh(
              new THREE.PlaneGeometry(45, 10),
              new THREE.MeshBasicMaterial({
                map: signTex,
                side: THREE.DoubleSide,
              }),
            );
            sign.position.set(blockX, 24, blockZ + 90.2);
            scene.add(sign);

            // Flags
            for (let f = 0; f < 3; f++) {
              const flagPole = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.15, 15, 6),
                new THREE.MeshStandardMaterial({
                  color: 0x94a3b8,
                  metalness: 0.8,
                }),
              );
              flagPole.position.set(blockX - 30 + f * 30, 7.92, blockZ + 100);
              flagPole.castShadow = true;
              scene.add(flagPole);

              const flag = new THREE.Mesh(
                new THREE.BoxGeometry(4, 2.5, 0.05),
                new THREE.MeshStandardMaterial({
                  color: f === 0 ? 0xff0055 : f === 1 ? 0x00ffaa : 0x00aaff,
                }),
              );
              flag.position.set(blockX - 28 + f * 30, 14.17, blockZ + 100);
              scene.add(flag);
            }
          } else if (bx === -1 && bz === 1) {
            // PAGODA TEMPLE BLOCK
            const stonePlaza = new THREE.Mesh(
              new THREE.BoxGeometry(220, 0.2, 220),
              new THREE.MeshStandardMaterial({
                color: 0x94a3b8,
                roughness: 0.9,
              }),
            );
            stonePlaza.position.set(blockX, 0.42, blockZ);
            stonePlaza.receiveShadow = true;
            scene.add(stonePlaza);

            const pagodaGroup = new THREE.Group();
            pagodaGroup.position.set(blockX, 0.52, blockZ);

            const redMat = new THREE.MeshStandardMaterial({
              color: 0xb91c1c,
              roughness: 0.7,
            });
            const goldRoofMat = new THREE.MeshStandardMaterial({
              color: 0xd97706,
              metalness: 0.8,
              roughness: 0.2,
            });

            // Tier 1
            const t1 = new THREE.Mesh(
              new THREE.BoxGeometry(45, 15, 45),
              redMat,
            );
            t1.position.y = 7.5;
            t1.castShadow = true;
            t1.receiveShadow = true;
            pagodaGroup.add(t1);

            const roof1 = new THREE.Mesh(
              new THREE.BoxGeometry(56, 2.5, 56),
              goldRoofMat,
            );
            roof1.position.y = 15;
            roof1.castShadow = true;
            pagodaGroup.add(roof1);

            // Tier 2
            const t2 = new THREE.Mesh(
              new THREE.BoxGeometry(32, 12, 32),
              redMat,
            );
            t2.position.y = 21;
            t2.castShadow = true;
            t2.receiveShadow = true;
            pagodaGroup.add(t2);

            const roof2 = new THREE.Mesh(
              new THREE.BoxGeometry(40, 2.2, 40),
              goldRoofMat,
            );
            roof2.position.y = 27;
            roof2.castShadow = true;
            pagodaGroup.add(roof2);

            // Tier 3
            const t3 = new THREE.Mesh(
              new THREE.BoxGeometry(20, 10, 20),
              redMat,
            );
            t3.position.y = 32;
            t3.castShadow = true;
            t3.receiveShadow = true;
            pagodaGroup.add(t3);

            const roof3 = new THREE.Mesh(
              new THREE.BoxGeometry(26, 2.0, 26),
              goldRoofMat,
            );
            roof3.position.y = 37;
            roof3.castShadow = true;
            pagodaGroup.add(roof3);

            // Spire
            const spire = new THREE.Mesh(
              new THREE.CylinderGeometry(0.1, 0.8, 14, 8),
              goldRoofMat,
            );
            spire.position.y = 44;
            spire.castShadow = true;
            pagodaGroup.add(spire);

            scene.add(pagodaGroup);
            colliders.push({
              type: "box",
              minX: blockX - 25,
              maxX: blockX + 25,
              minZ: blockZ - 25,
              maxZ: blockZ + 25,
            });

            // Torii Gate in front
            const gateGroup = new THREE.Group();
            gateGroup.position.set(blockX, 0.52, blockZ + 90);

            const postL = new THREE.Mesh(
              new THREE.CylinderGeometry(0.6, 0.6, 12, 8),
              redMat,
            );
            postL.position.set(-8, 6, 0);
            postL.castShadow = true;
            gateGroup.add(postL);

            const postR = postL.clone();
            postR.position.x = 8;
            gateGroup.add(postR);

            const topBeam = new THREE.Mesh(
              new THREE.BoxGeometry(22, 1.2, 1.8),
              redMat,
            );
            topBeam.position.set(0, 12, 0);
            topBeam.castShadow = true;
            gateGroup.add(topBeam);

            const topRoof = new THREE.Mesh(
              new THREE.BoxGeometry(24, 0.8, 2.4),
              goldRoofMat,
            );
            topRoof.position.set(0, 12.8, 0);
            topRoof.castShadow = true;
            gateGroup.add(topRoof);

            scene.add(gateGroup);
            colliders.push({
              type: "box",
              minX: blockX - 10,
              maxX: blockX + 10,
              minZ: blockZ + 88,
              maxZ: blockZ + 92,
            });

            // Decorative lanterns and cherry trees (pink spherical trees)
            for (let i = 0; i < 4; i++) {
              const lx = blockX + (i % 2 === 0 ? -18 : 18);
              const lz = blockZ + (i < 2 ? -60 : 60);

              const lat = new THREE.Mesh(
                new THREE.CylinderGeometry(0.4, 0.4, 4, 8),
                new THREE.MeshStandardMaterial({ color: 0x475569 }),
              );
              lat.position.set(lx, 2.52, lz);
              lat.castShadow = true;
              scene.add(lat);

              const latGlow = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0xffeab3 }),
              );
              latGlow.position.set(lx, 4.52, lz);
              scene.add(latGlow);

              const cherryGroup = new THREE.Group();
              cherryGroup.position.set(
                blockX + (i % 2 === 0 ? -70 : 70),
                0.52,
                blockZ + (i < 2 ? -70 : 70),
              );

              const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.45, 5, 8),
                new THREE.MeshStandardMaterial({ color: 0x4c2b11 }),
              );
              trunk.position.y = 2.5;
              trunk.castShadow = true;
              cherryGroup.add(trunk);

              const pinkMat = new THREE.MeshStandardMaterial({
                color: 0xfda4af,
                roughness: 0.8,
              });
              for (let s = 0; s < 3; s++) {
                const cherrySph = new THREE.Mesh(
                  new THREE.SphereGeometry(3.5 - s * 0.8, 12, 12),
                  pinkMat,
                );
                cherrySph.position.y = 5.0 + s * 2.0;
                cherrySph.castShadow = true;
                cherryGroup.add(cherrySph);
              }
              scene.add(cherryGroup);
            }
          } else if (bx === 2 && bz === -2) {
            // NIGHTCLUB & BAR BLOCK
            const darkPlaza = new THREE.Mesh(
              new THREE.BoxGeometry(220, 0.2, 220),
              new THREE.MeshStandardMaterial({
                color: 0x111827,
                roughness: 0.85,
              }),
            );
            darkPlaza.position.set(blockX, 0.42, blockZ);
            darkPlaza.receiveShadow = true;
            scene.add(darkPlaza);

            const darkCarbon = new THREE.MeshStandardMaterial({
              color: 0x18181c,
              metalness: 0.8,
              roughness: 0.4,
            });

            // Main Lounge
            const clubBody = new THREE.Mesh(
              new THREE.BoxGeometry(130, 26, 120),
              darkCarbon,
            );
            clubBody.position.set(blockX, 13.42, blockZ);
            clubBody.castShadow = true;
            clubBody.receiveShadow = true;
            scene.add(clubBody);
            colliders.push({
              type: "box",
              minX: blockX - 65,
              maxX: blockX + 65,
              minZ: blockZ - 60,
              maxZ: blockZ + 60,
            });

            // Neon frame and columns
            const trimMat = new THREE.MeshStandardMaterial({
              color: 0xc084fc,
              metalness: 0.9,
              roughness: 0.1,
            });
            for (let c = 0; c < 4; c++) {
              const cx = blockX + (c % 2 === 0 ? -66 : 66);
              const cz = blockZ + (c < 2 ? -61 : 61);
              const column = new THREE.Mesh(
                new THREE.CylinderGeometry(0.7, 0.7, 26, 8),
                trimMat,
              );
              column.position.set(cx, 13.42, cz);
              column.castShadow = true;
              scene.add(column);
            }

            // Neon sign
            const signTex = createBillboardTexture("BAR & CLUB VIP", "#c084fc");
            const sign = new THREE.Mesh(
              new THREE.PlaneGeometry(35, 8),
              new THREE.MeshBasicMaterial({
                map: signTex,
                side: THREE.DoubleSide,
              }),
            );
            sign.position.set(blockX, 22, blockZ + 60.2);
            scene.add(sign);

            // Spotlights
            const spotlight = new THREE.SpotLight(
              0xc084fc,
              8,
              120,
              Math.PI / 4,
              0.5,
              1,
            );
            spotlight.position.set(blockX, 26.42, blockZ + 50);
            scene.add(spotlight);

            const spotTarget = new THREE.Object3D();
            spotTarget.position.set(blockX, 0.52, blockZ + 80);
            scene.add(spotTarget);
            spotlight.target = spotTarget;
          } else if (bx === 0 || bz === 0) {
            // DOWNTOWN HIGH-RISE DISTRICT
            const count = Math.random() > 0.4 ? 2 : 1;
            for (let s = 0; s < count; s++) {
              const sHeight = 160 + Math.random() * 200;
              const sWidth = 60 + Math.random() * 30;
              const sDepth = 60 + Math.random() * 30;

              let sx = blockX;
              let sz = blockZ;
              if (count === 2) {
                sx = s === 0 ? blockX - 45 : blockX + 45;
                sz = s === 0 ? blockZ - 45 : blockZ + 45;
              }

              const tower = new THREE.Mesh(
                new THREE.BoxGeometry(sWidth, sHeight, sDepth),
                windowGlassMaterial,
              );
              tower.position.set(sx, sHeight / 2 + 0.3, sz);
              tower.castShadow = true;
              tower.receiveShadow = true;
              scene.add(tower);
              colliders.push({
                type: "box",
                minX: sx - sWidth / 2,
                maxX: sx + sWidth / 2,
                minZ: sz - sDepth / 2,
                maxZ: sz + sDepth / 2,
              });

              const pad = new THREE.Mesh(
                new THREE.BoxGeometry(sWidth - 10, 1.2, sDepth - 10),
                new THREE.MeshStandardMaterial({ map: helipadTex }),
              );
              pad.position.set(sx, sHeight + 0.9, sz);
              pad.receiveShadow = true;
              scene.add(pad);

              const antenna = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1, 0.4, 25, 6),
                new THREE.MeshStandardMaterial({
                  color: 0x475569,
                  metalness: 0.9,
                }),
              );
              antenna.position.set(sx, sHeight + 13, sz);
              antenna.castShadow = true;
              scene.add(antenna);

              const bulb = new THREE.Mesh(
                new THREE.SphereGeometry(0.6, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0xef4444 }),
              );
              bulb.position.set(sx, sHeight + 25.5, sz);
              scene.add(bulb);

              bulb.userData = { isBlinkingRed: true, timer: Math.random() };
              blockInfo.blinkingAviationLight = bulb;
            }

            createTree(blockX - 105, blockZ - 60);
            createTree(blockX - 105, blockZ + 60);
            createTree(blockX + 105, blockZ - 60);
            createTree(blockX + 105, blockZ + 60);
          } else if (Math.abs(bx) <= 2 && Math.abs(bz) <= 2) {
            // COMMERCIAL & CORPORATE DISTRICT
            const configs = [
              { ox: -50, oz: -50 },
              { ox: 50, oz: -50 },
              { ox: -50, oz: 50 },
              { ox: 50, oz: 50 },
            ];

            configs.forEach((cfg, idx) => {
              const bHeight = 80 + Math.random() * 80;
              const bWidth = 65;
              const bDepth = 65;
              const sx = blockX + cfg.ox;
              const sz = blockZ + cfg.oz;

              const building = new THREE.Mesh(
                new THREE.BoxGeometry(bWidth, bHeight, bDepth),
                windowGlassMaterial,
              );
              building.position.set(sx, bHeight / 2 + 0.3, sz);
              building.castShadow = true;
              building.receiveShadow = true;
              scene.add(building);
              colliders.push({
                type: "box",
                minX: sx - bWidth / 2,
                maxX: sx + bWidth / 2,
                minZ: sz - bDepth / 2,
                maxZ: sz + bDepth / 2,
              });

              const texts = ["LAMBO", "CAFE", "HOTEL", "SPA", "STORE"];
              const colors = [
                "#ff5500",
                "#3b82f6",
                "#22c55e",
                "#ec4899",
                "#eab308",
              ];
              const randomSel = idx % texts.length;

              const signTex = createBillboardTexture(
                texts[randomSel],
                colors[randomSel],
              );
              const sign = new THREE.Mesh(
                new THREE.PlaneGeometry(16, 5),
                new THREE.MeshBasicMaterial({
                  map: signTex,
                  side: THREE.DoubleSide,
                }),
              );
              if (cfg.ox < 0 && cfg.oz < 0) {
                sign.position.set(sx - 32.7, 7, sz);
                sign.rotation.y = -Math.PI / 2;
              } else if (cfg.ox > 0 && cfg.oz < 0) {
                sign.position.set(sx, 7, sz - 32.7);
                sign.rotation.y = 0;
              } else if (cfg.ox < 0 && cfg.oz > 0) {
                sign.position.set(sx, 7, sz + 32.7);
                sign.rotation.y = Math.PI;
              } else {
                sign.position.set(sx + 32.7, 7, sz);
                sign.rotation.y = Math.PI / 2;
              }
              scene.add(sign);
            });

            createStreetLight(blockX - 105, blockZ, -Math.PI / 2);
            createStreetLight(blockX + 105, blockZ, Math.PI / 2);
            createStreetLight(blockX, blockZ - 105, 0);
            createStreetLight(blockX, blockZ + 105, Math.PI);
          } else if (bx === 3 && bz === 1) {
            // ===== MIET MEERUT COLLEGE BLOCK =====
            const collegePlaza = new THREE.Mesh(
              new THREE.BoxGeometry(220, 0.3, 220),
              new THREE.MeshStandardMaterial({
                color: 0xdde8f0, // Light stone plaza
                roughness: 0.85,
              }),
            );
            collegePlaza.position.set(blockX, 0.42, blockZ);
            collegePlaza.receiveShadow = true;
            scene.add(collegePlaza);

            // College materials
            const collegeWallMat = new THREE.MeshStandardMaterial({
              color: 0xffffff, // Pure white walls
              roughness: 0.55,
              metalness: 0.05,
            });
            const collegeRoofMat = new THREE.MeshStandardMaterial({
              color: 0xcc0000, // Deep red roof
              roughness: 0.65,
              metalness: 0.1,
            });
            const collegeTrimMat = new THREE.MeshStandardMaterial({
              color: 0xf0f0f0, // Off-white trim
              roughness: 0.5,
            });
            const collegeWindowMat = new THREE.MeshStandardMaterial({
              color: 0x5ea8c8,
              transparent: true,
              opacity: 0.75,
              roughness: 0.1,
              metalness: 0.8,
            });

            const collegeGroup = new THREE.Group();
            collegeGroup.position.set(blockX, 0.52, blockZ);

            // ─── Main Central Block ───
            const mainBlock = new THREE.Mesh(
              new THREE.BoxGeometry(150, 40, 70),
              collegeWallMat,
            );
            mainBlock.position.set(0, 20, 0);
            mainBlock.castShadow = true;
            mainBlock.receiveShadow = true;
            collegeGroup.add(mainBlock);

            // Central block red flat roof
            const mainRoof = new THREE.Mesh(
              new THREE.BoxGeometry(154, 3.5, 74),
              collegeRoofMat,
            );
            mainRoof.position.set(0, 41.7, 0);
            mainRoof.castShadow = true;
            collegeGroup.add(mainRoof);

            // ─── Left Wing ───
            const leftWing = new THREE.Mesh(
              new THREE.BoxGeometry(55, 30, 55),
              collegeWallMat,
            );
            leftWing.position.set(-102, 15, 10);
            leftWing.castShadow = true;
            leftWing.receiveShadow = true;
            collegeGroup.add(leftWing);

            const leftWingRoof = new THREE.Mesh(
              new THREE.BoxGeometry(58, 3, 58),
              collegeRoofMat,
            );
            leftWingRoof.position.set(-102, 31.5, 10);
            leftWingRoof.castShadow = true;
            collegeGroup.add(leftWingRoof);

            // ─── Right Wing ───
            const rightWing = new THREE.Mesh(
              new THREE.BoxGeometry(55, 30, 55),
              collegeWallMat,
            );
            rightWing.position.set(102, 15, 10);
            rightWing.castShadow = true;
            rightWing.receiveShadow = true;
            collegeGroup.add(rightWing);

            const rightWingRoof = new THREE.Mesh(
              new THREE.BoxGeometry(58, 3, 58),
              collegeRoofMat,
            );
            rightWingRoof.position.set(102, 31.5, 10);
            rightWingRoof.castShadow = true;
            collegeGroup.add(rightWingRoof);

            // ─── Central Entrance Portico / Pillared Facade ───
            const portico = new THREE.Mesh(
              new THREE.BoxGeometry(60, 44, 14),
              collegeWallMat,
            );
            portico.position.set(0, 22, 42);
            portico.castShadow = true;
            portico.receiveShadow = true;
            collegeGroup.add(portico);

            const porticoRoof = new THREE.Mesh(
              new THREE.BoxGeometry(64, 4, 16),
              collegeRoofMat,
            );
            porticoRoof.position.set(0, 45, 42);
            porticoRoof.castShadow = true;
            collegeGroup.add(porticoRoof);

            // Portico triangular pediment (gable)
            const pediment = new THREE.Mesh(
              new THREE.ConeGeometry(36, 14, 4),
              collegeRoofMat,
            );
            pediment.rotation.y = Math.PI / 4;
            pediment.position.set(0, 54, 42);
            pediment.castShadow = true;
            collegeGroup.add(pediment);

            // ─── Windows on main block (front face) ───
            const winRows = 3;
            const winCols = 8;
            for (let wr = 0; wr < winRows; wr++) {
              for (let wc = 0; wc < winCols; wc++) {
                const win = new THREE.Mesh(
                  new THREE.BoxGeometry(8, 6, 0.3),
                  collegeWindowMat,
                );
                win.position.set(-52 + wc * 15, 8 + wr * 11, 35.2);
                collegeGroup.add(win);

                // White window frame
                const frame = new THREE.Mesh(
                  new THREE.BoxGeometry(9, 7, 0.15),
                  collegeTrimMat,
                );
                frame.position.set(-52 + wc * 15, 8 + wr * 11, 35.0);
                collegeGroup.add(frame);
              }
            }

            // Windows on left wing front face
            for (let wr = 0; wr < 2; wr++) {
              for (let wc = 0; wc < 3; wc++) {
                const win = new THREE.Mesh(
                  new THREE.BoxGeometry(8, 6, 0.3),
                  collegeWindowMat,
                );
                win.position.set(-120 + wc * 15, 8 + wr * 11, 38.2);
                collegeGroup.add(win);
              }
            }

            // Windows on right wing front face
            for (let wr = 0; wr < 2; wr++) {
              for (let wc = 0; wc < 3; wc++) {
                const win = new THREE.Mesh(
                  new THREE.BoxGeometry(8, 6, 0.3),
                  collegeWindowMat,
                );
                win.position.set(84 + wc * 15, 8 + wr * 11, 38.2);
                collegeGroup.add(win);
              }
            }

            // ─── Gate / Entrance Arch ───
            const gatePostL = new THREE.Mesh(
              new THREE.BoxGeometry(5, 22, 5),
              collegeWallMat,
            );
            gatePostL.position.set(-22, 11, 88);
            gatePostL.castShadow = true;
            collegeGroup.add(gatePostL);

            const gatePostR = new THREE.Mesh(
              new THREE.BoxGeometry(5, 22, 5),
              collegeWallMat,
            );
            gatePostR.position.set(22, 11, 88);
            gatePostR.castShadow = true;
            collegeGroup.add(gatePostR);

            const gateLintel = new THREE.Mesh(
              new THREE.BoxGeometry(50, 4, 5),
              collegeRoofMat,
            );
            gateLintel.position.set(0, 24, 88);
            gateLintel.castShadow = true;
            collegeGroup.add(gateLintel);

            // Gate arch curve decoration
            const gateArch = new THREE.Mesh(
              new THREE.TorusGeometry(11, 1.5, 8, 16, Math.PI),
              collegeRoofMat,
            );
            gateArch.rotation.x = Math.PI / 2;
            gateArch.position.set(0, 22, 88);
            gateArch.castShadow = true;
            collegeGroup.add(gateArch);

            // Gate top red dome ornament
            const gateDome = new THREE.Mesh(
              new THREE.SphereGeometry(
                4,
                12,
                12,
                0,
                Math.PI * 2,
                0,
                Math.PI / 2,
              ),
              collegeRoofMat,
            );
            gateDome.position.set(0, 28, 88);
            collegeGroup.add(gateDome);

            // ─── Compound boundary walls ───
            const boundWallMat = new THREE.MeshStandardMaterial({
              color: 0xffffff,
              roughness: 0.6,
            });
            // Front left wall segment
            const wallFL = new THREE.Mesh(
              new THREE.BoxGeometry(68, 8, 2.5),
              boundWallMat,
            );
            wallFL.position.set(-56, 4, 88);
            wallFL.castShadow = true;
            collegeGroup.add(wallFL);

            // Front right wall segment
            const wallFR = new THREE.Mesh(
              new THREE.BoxGeometry(68, 8, 2.5),
              boundWallMat,
            );
            wallFR.position.set(56, 4, 88);
            wallFR.castShadow = true;
            collegeGroup.add(wallFR);

            // Left boundary wall
            const wallLeft = new THREE.Mesh(
              new THREE.BoxGeometry(2.5, 8, 170),
              boundWallMat,
            );
            wallLeft.position.set(-106, 4, 5);
            wallLeft.castShadow = true;
            collegeGroup.add(wallLeft);

            // Right boundary wall
            const wallRight = new THREE.Mesh(
              new THREE.BoxGeometry(2.5, 8, 170),
              boundWallMat,
            );
            wallRight.position.set(106, 4, 5);
            wallRight.castShadow = true;
            collegeGroup.add(wallRight);

            // Wall coping (red top strip on boundary)
            [wallFL, wallFR, wallLeft, wallRight].forEach((w) => {
              const copingGeo = w.geometry.clone();
              const coping = new THREE.Mesh(copingGeo, collegeRoofMat);
              coping.scale.set(1.02, 0.15, 1.02);
              coping.position.copy(w.position);
              coping.position.y = w.position.y + 4.2;
              collegeGroup.add(coping);
            });

            // ─── Driveway / courtyard path ───
            const driveway = new THREE.Mesh(
              new THREE.BoxGeometry(38, 0.2, 42),
              new THREE.MeshStandardMaterial({
                color: 0xbec8cc,
                roughness: 0.9,
              }),
            );
            driveway.position.set(0, 0.2, 66);
            collegeGroup.add(driveway);

            // ─── Flag poles (Indian flag colors) ───
            const fpMat = new THREE.MeshStandardMaterial({
              color: 0xd0d0d0,
              metalness: 0.7,
            });
            [-15, 0, 15].forEach((fpx, fi) => {
              const fp = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.25, 20, 8),
                fpMat,
              );
              fp.position.set(fpx, 10, 78);
              fp.castShadow = true;
              collegeGroup.add(fp);

              // Saffron stripe
              const f1 = new THREE.Mesh(
                new THREE.BoxGeometry(5, 1.0, 0.05),
                new THREE.MeshStandardMaterial({ color: 0xff9933 }),
              );
              f1.position.set(fpx + 2.7, 20.5, 78);
              collegeGroup.add(f1);
              // White stripe
              const f2 = new THREE.Mesh(
                new THREE.BoxGeometry(5, 1.0, 0.05),
                new THREE.MeshStandardMaterial({ color: 0xffffff }),
              );
              f2.position.set(fpx + 2.7, 19.5, 78);
              collegeGroup.add(f2);
              // Green stripe
              const f3 = new THREE.Mesh(
                new THREE.BoxGeometry(5, 1.0, 0.05),
                new THREE.MeshStandardMaterial({ color: 0x138808 }),
              );
              f3.position.set(fpx + 2.7, 18.5, 78);
              collegeGroup.add(f3);
            });

            // ─── Trees in courtyard ───
            createTree(blockX - 70, blockZ + 65);
            createTree(blockX + 70, blockZ + 65);
            createTree(blockX - 85, blockZ - 70);
            createTree(blockX + 85, blockZ - 70);
            createTree(blockX - 85, blockZ + 10);
            createTree(blockX + 85, blockZ + 10);

            scene.add(collegeGroup);

            // ─── MIET Meerut Name Sign ───
            const mietSignTex = createBillboardTexture(
              "MIET MEERUT",
              "#ffffff",
            );
            const mietSign = new THREE.Mesh(
              new THREE.PlaneGeometry(42, 9),
              new THREE.MeshBasicMaterial({
                map: mietSignTex,
                side: THREE.DoubleSide,
              }),
            );
            mietSign.position.set(blockX, 30, blockZ + 49.6);
            scene.add(mietSign);

            // Sub-title sign
            const subSignTex = createBillboardTexture(
              "COLLEGE OF ENGG",
              "#ffcc00",
            );
            const subSign = new THREE.Mesh(
              new THREE.PlaneGeometry(36, 7),
              new THREE.MeshBasicMaterial({
                map: subSignTex,
                side: THREE.DoubleSide,
              }),
            );
            subSign.position.set(blockX, 21, blockZ + 49.7);
            scene.add(subSign);

            // ── Precise Colliders matching actual building geometry ──

            // 1. Main central building block (150 wide x 70 deep, centered at 0,0 in group)
            colliders.push({
              type: "box",
              minX: blockX - 75,
              maxX: blockX + 75,
              minZ: blockZ - 35,
              maxZ: blockZ + 35,
            });

            // 2. Left wing (55 wide x 55 deep, group offset -102, 10)
            colliders.push({
              type: "box",
              minX: blockX - 130,
              maxX: blockX - 75,
              minZ: blockZ - 18,
              maxZ: blockZ + 38,
            });

            // 3. Right wing (55 wide x 55 deep, group offset +102, 10)
            colliders.push({
              type: "box",
              minX: blockX + 75,
              maxX: blockX + 130,
              minZ: blockZ - 18,
              maxZ: blockZ + 38,
            });

            // 4. Portico / entrance block (60 wide x 14 deep, group offset 0, 42)
            colliders.push({
              type: "box",
              minX: blockX - 30,
              maxX: blockX + 30,
              minZ: blockZ + 35,
              maxZ: blockZ + 49,
            });

            // 5. Left boundary wall (2.5 wide x 170 deep, group offset -106, 5)
            colliders.push({
              type: "box",
              minX: blockX - 108,
              maxX: blockX - 104,
              minZ: blockZ - 80,
              maxZ: blockZ + 92,
            });

            // 6. Right boundary wall (2.5 wide x 170 deep, group offset +106, 5)
            colliders.push({
              type: "box",
              minX: blockX + 104,
              maxX: blockX + 108,
              minZ: blockZ - 80,
              maxZ: blockZ + 92,
            });

            // 7. Front-left wall segment (68 wide x 2.5 deep, group offset -56, 88)
            colliders.push({
              type: "box",
              minX: blockX - 92,
              maxX: blockX - 22,
              minZ: blockZ + 86,
              maxZ: blockZ + 91,
            });

            // 8. Front-right wall segment (68 wide x 2.5 deep, group offset +56, 88)
            colliders.push({
              type: "box",
              minX: blockX + 22,
              maxX: blockX + 92,
              minZ: blockZ + 86,
              maxZ: blockZ + 91,
            });

            // 9. Gate post LEFT (5x5, group offset -22, 88)
            colliders.push({
              type: "box",
              minX: blockX - 25,
              maxX: blockX - 19,
              minZ: blockZ + 85,
              maxZ: blockZ + 91,
            });

            // 10. Gate post RIGHT (5x5, group offset +22, 88)
            colliders.push({
              type: "box",
              minX: blockX + 19,
              maxX: blockX + 25,
              minZ: blockZ + 85,
              maxZ: blockZ + 91,
            });
          } else {
            // RESIDENTIAL BRICK SUBURB DISTRICT
            const spacingX = [-65, 0, 65];
            const spacingZ = [-65, 0, 65];

            spacingX.forEach((ox) => {
              spacingZ.forEach((oz) => {
                if (ox === 0 && oz === 0) {
                  createTree(blockX, blockZ);
                  return;
                }

                const houseHeight = 25 + Math.random() * 25;
                const houseWidth = 42;
                const houseDepth = 42;
                const hx = blockX + ox;
                const hz = blockZ + oz;

                const house = new THREE.Mesh(
                  new THREE.BoxGeometry(houseWidth, houseHeight, houseDepth),
                  brickBuildingMaterial,
                );
                house.position.set(hx, houseHeight / 2 + 0.3, hz);
                house.castShadow = true;
                house.receiveShadow = true;
                scene.add(house);
                colliders.push({
                  type: "box",
                  minX: hx - houseWidth / 2,
                  maxX: hx + houseWidth / 2,
                  minZ: hz - houseDepth / 2,
                  maxZ: hz + houseDepth / 2,
                });

                const roofGeom = new THREE.ConeGeometry(32, 12, 4);
                const roofMat = new THREE.MeshStandardMaterial({
                  color: 0x334155,
                  roughness: 0.85,
                });
                const roofMesh = new THREE.Mesh(roofGeom, roofMat);
                roofMesh.rotation.y = Math.PI / 4;
                roofMesh.position.set(hx, houseHeight + 6.0, hz);
                roofMesh.castShadow = true;
                scene.add(roofMesh);
              });
            });

            createTree(blockX - 105, blockZ - 80);
            createTree(blockX + 105, blockZ + 80);
          }
        });
      });

      // City boundaries concrete barriers
      const barrierMat = new THREE.MeshStandardMaterial({
        color: 0x3f3f46,
        roughness: 0.8,
      });
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xeab308 }); // Hazard yellow

      function createBoundaryWall(x, z, width, depth) {
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(width, 10, depth),
          barrierMat,
        );
        wall.position.set(x, 5.1, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);

        const stripes = new THREE.Mesh(
          new THREE.BoxGeometry(width + 0.2, 1.2, depth + 0.2),
          stripeMat,
        );
        stripes.position.set(x, 6.0, z);
        scene.add(stripes);

        colliders.push({
          type: "box",
          minX: x - width / 2,
          maxX: x + width / 2,
          minZ: z - depth / 2,
          maxZ: z + depth / 2,
        });
      }

      createBoundaryWall(0, -1220, 2480, 4);
      createBoundaryWall(0, 1220, 2480, 4);
      createBoundaryWall(-1220, 0, 4, 2480);
      createBoundaryWall(1220, 0, 4, 2480);

      // 6. Create Lamborghini Player Car Function
      function createLamborghini() {
        const group = new THREE.Group();

        // Materials
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0xff5500, // Orange
          metalness: 0.9,
          roughness: 0.15,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
        });

        const carbonMat = new THREE.MeshStandardMaterial({
          color: 0x18181c, // Carbon black
          metalness: 0.8,
          roughness: 0.4,
        });

        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x0a0f1d,
          transparent: true,
          opacity: 0.75,
          roughness: 0.1,
          metalness: 0.9,
        });

        const lightMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
        });

        const brakeMat = new THREE.MeshStandardMaterial({
          color: 0xff4500, // orange calipers
          roughness: 0.2,
        });

        // Lower chassis
        const chassis = new THREE.Mesh(
          new THREE.BoxGeometry(4.8, 0.4, 9.4),
          carbonMat,
        );
        chassis.position.y = 0.4;
        chassis.castShadow = true;
        chassis.receiveShadow = true;
        group.add(chassis);

        // Main lower body
        const mainBody = new THREE.Mesh(
          new THREE.BoxGeometry(4.8, 0.8, 5.0),
          bodyMat,
        );
        mainBody.position.set(0, 0.8, -0.5);
        mainBody.castShadow = true;
        mainBody.receiveShadow = true;
        group.add(mainBody);

        // Tilted hood / front nose
        const hood = new THREE.Mesh(
          new THREE.BoxGeometry(4.7, 0.6, 3.8),
          bodyMat,
        );
        hood.position.set(0, 0.7, 3.2);
        hood.rotation.x = 0.12;
        hood.castShadow = true;
        hood.receiveShadow = true;
        group.add(hood);

        // Front Splitter
        const splitter = new THREE.Mesh(
          new THREE.BoxGeometry(4.9, 0.15, 1.2),
          carbonMat,
        );
        splitter.position.set(0, 0.2, 4.8);
        splitter.castShadow = true;
        group.add(splitter);

        // Windshield
        const windshield = new THREE.Mesh(
          new THREE.BoxGeometry(4.2, 0.1, 2.8),
          glassMat,
        );
        windshield.position.set(0, 1.35, 1.2);
        windshield.rotation.x = -0.45;
        windshield.castShadow = true;
        group.add(windshield);

        // Roof
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(3.8, 0.1, 3.0),
          carbonMat,
        );
        roof.position.set(0, 1.8, -0.8);
        roof.castShadow = true;
        group.add(roof);

        // Engine cover
        const engineCover = new THREE.Mesh(
          new THREE.BoxGeometry(4.0, 0.1, 3.5),
          bodyMat,
        );
        engineCover.position.set(0, 1.35, -3.2);
        engineCover.rotation.x = 0.22;
        engineCover.castShadow = true;
        group.add(engineCover);

        // Louvers
        for (let i = 0; i < 3; i++) {
          const louver = new THREE.Mesh(
            new THREE.BoxGeometry(3.2, 0.05, 0.4),
            carbonMat,
          );
          louver.position.set(0, 1.48 - i * 0.12, -2.4 - i * 0.7);
          louver.rotation.x = 0.22;
          group.add(louver);
        }

        // Rear side windows
        const windowL = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.6, 2.4),
          glassMat,
        );
        windowL.position.set(-2.0, 1.35, -1.0);
        windowL.rotation.y = 0.05;
        group.add(windowL);

        const windowR = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.6, 2.4),
          glassMat,
        );
        windowR.position.set(2.0, 1.35, -1.0);
        windowR.rotation.y = -0.05;
        group.add(windowR);

        // Side intakes
        const intakeL = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.9, 2.0),
          carbonMat,
        );
        intakeL.position.set(-2.3, 0.8, -2.4);
        intakeL.rotation.y = 0.22;
        intakeL.castShadow = true;
        group.add(intakeL);

        const fenderL = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.8, 1.8),
          bodyMat,
        );
        fenderL.position.set(-2.5, 0.8, -2.5);
        group.add(fenderL);

        const intakeR = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.9, 2.0),
          carbonMat,
        );
        intakeR.position.set(2.3, 0.8, -2.4);
        intakeR.rotation.y = -0.22;
        intakeR.castShadow = true;
        group.add(intakeR);

        const fenderR = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.8, 1.8),
          bodyMat,
        );
        fenderR.position.set(2.5, 0.8, -2.5);
        group.add(fenderR);

        // Headlights (Y-shapes)
        const hlL_stem = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.08, 0.08),
          lightMat,
        );
        hlL_stem.position.set(-1.8, 0.6, 4.6);
        hlL_stem.rotation.y = -0.2;
        group.add(hlL_stem);
        const hlL_branch1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.08, 0.08),
          lightMat,
        );
        hlL_branch1.position.set(-1.6, 0.65, 4.7);
        hlL_branch1.rotation.y = 0.3;
        group.add(hlL_branch1);
        const hlL_branch2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.08, 0.08),
          lightMat,
        );
        hlL_branch2.position.set(-1.6, 0.55, 4.7);
        hlL_branch2.rotation.y = -0.6;
        group.add(hlL_branch2);

        const hlR_stem = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.08, 0.08),
          lightMat,
        );
        hlR_stem.position.set(1.8, 0.6, 4.6);
        hlR_stem.rotation.y = 0.2;
        group.add(hlR_stem);
        const hlR_branch1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.08, 0.08),
          lightMat,
        );
        hlR_branch1.position.set(1.6, 0.65, 4.7);
        hlR_branch1.rotation.y = -0.3;
        group.add(hlR_branch1);
        const hlR_branch2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.08, 0.08),
          lightMat,
        );
        hlR_branch2.position.set(1.6, 0.55, 4.7);
        hlR_branch2.rotation.y = 0.6;
        group.add(hlR_branch2);

        // Rear Spoiler
        const wingStrutL = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.7, 0.4),
          carbonMat,
        );
        wingStrutL.position.set(-1.5, 1.6, -4.4);
        wingStrutL.rotation.x = -0.25;
        group.add(wingStrutL);

        const wingStrutR = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.7, 0.4),
          carbonMat,
        );
        wingStrutR.position.set(1.5, 1.6, -4.4);
        wingStrutR.rotation.x = -0.25;
        group.add(wingStrutR);

        const wingBlade = new THREE.Mesh(
          new THREE.BoxGeometry(4.8, 0.08, 1.1),
          carbonMat,
        );
        wingBlade.position.set(0, 1.95, -4.6);
        wingBlade.rotation.x = 0.06;
        wingBlade.castShadow = true;
        group.add(wingBlade);

        // Tail lights
        const tailLightL = new THREE.Mesh(
          new THREE.BoxGeometry(1.0, 0.1, 0.05),
          new THREE.MeshBasicMaterial({ color: 0xff0000 }),
        );
        tailLightL.position.set(-1.6, 0.7, -4.72);
        group.add(tailLightL);

        const tailLightR = new THREE.Mesh(
          new THREE.BoxGeometry(1.0, 0.1, 0.05),
          new THREE.MeshBasicMaterial({ color: 0xff0000 }),
        );
        tailLightR.position.set(1.6, 0.7, -4.72);
        group.add(tailLightR);

        // Quad Exhausts
        const exhaustMat = new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          metalness: 0.9,
          roughness: 0.1,
        });
        for (let i = 0; i < 2; i++) {
          const pipeL = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 0.6, 12),
            exhaustMat,
          );
          pipeL.rotation.x = Math.PI / 2;
          pipeL.position.set(-0.4 - i * 0.3, 0.45, -4.7);
          group.add(pipeL);

          const pipeR = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 0.6, 12),
            exhaustMat,
          );
          pipeR.rotation.x = Math.PI / 2;
          pipeR.position.set(0.4 + i * 0.3, 0.45, -4.7);
          group.add(pipeR);
        }

        // Wheels
        group.userData.wheels = [];

        function addWheel(wx, wz) {
          const wheelGroup = new THREE.Group();
          wheelGroup.position.set(wx, 0.75, wz);

          const tire = new THREE.Mesh(
            new THREE.CylinderGeometry(1.25, 1.25, 0.95, 32),
            new THREE.MeshStandardMaterial({
              color: 0x111115,
              roughness: 0.85,
            }),
          );
          tire.rotation.z = Math.PI / 2;
          tire.castShadow = true;
          wheelGroup.add(tire);

          const rims = new THREE.Group();

          const cap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.35, 1.0, 12),
            new THREE.MeshStandardMaterial({
              color: 0xc29b38,
              metalness: 0.8,
              roughness: 0.2,
            }),
          );
          cap.rotation.z = Math.PI / 2;
          rims.add(cap);

          const lip = new THREE.Mesh(
            new THREE.CylinderGeometry(1.05, 1.05, 0.96, 24, 1, true),
            new THREE.MeshStandardMaterial({
              color: 0x999999,
              metalness: 0.8,
              roughness: 0.2,
            }),
          );
          lip.rotation.z = Math.PI / 2;
          rims.add(lip);

          const spokeMat = new THREE.MeshStandardMaterial({
            color: 0x222225,
            metalness: 0.8,
            roughness: 0.3,
          });
          for (let s = 0; s < 5; s++) {
            const spoke = new THREE.Mesh(
              new THREE.BoxGeometry(0.12, 1.9, 0.12),
              spokeMat,
            );
            spoke.rotation.x = (s * 72 * Math.PI) / 180;
            rims.add(spoke);
          }

          wheelGroup.add(rims);
          group.add(wheelGroup);
          group.userData.wheels.push(rims); // store rims to spin

          // Brake caliper
          const caliper = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.6, 0.3),
            brakeMat,
          );
          caliper.position.set(wx > 0 ? wx - 0.2 : wx + 0.2, 1.05, wz + 0.3);
          group.add(caliper);
        }

        addWheel(-2.3, 2.7); // FL
        addWheel(2.3, 2.7); // FR
        addWheel(-2.3, -2.7); // RL
        addWheel(2.3, -2.7); // RR

        // Active Nitro Boost Flames
        const flameGroup = new THREE.Group();
        flameGroup.position.set(0, 0.45, -4.8);
        group.add(flameGroup);
        group.userData.flameGroup = flameGroup;

        const flameMat = new THREE.MeshBasicMaterial({
          color: 0x00aaff,
          transparent: true,
          opacity: 0.85,
        });

        const fL = new THREE.Mesh(
          new THREE.ConeGeometry(0.2, 1.2, 6),
          flameMat,
        );
        fL.rotation.x = -Math.PI / 2;
        fL.position.set(-0.5, 0, 0);
        flameGroup.add(fL);

        const fR = new THREE.Mesh(
          new THREE.ConeGeometry(0.2, 1.2, 6),
          flameMat,
        );
        fR.rotation.x = -Math.PI / 2;
        fR.position.set(0.5, 0, 0);
        flameGroup.add(fR);

        flameGroup.scale.set(0, 0, 0); // Hidden by default

        return group;
      }

      const carGroup = createLamborghini();
      // Spawn right in front of MIET Meerut College gate (block bx=3,bz=1 => X=1050,Z=450)
      carGroup.position.set(1050, 0.5, 560);
      carGroup.rotation.y = Math.PI; // Face toward the college entrance
      scene.add(carGroup);

      // Underglow
      const underglowLight = new THREE.PointLight(0xff5500, 0, 28);
      underglowLight.position.set(0, 0.1, 0);
      carGroup.add(underglowLight);

      // Headlight spots
      const spotLightL = new THREE.SpotLight(
        0xfffbe0,
        0,
        150,
        Math.PI / 6,
        0.4,
        0.8,
      );
      spotLightL.position.set(-1.8, 0.6, 4.6);
      carGroup.add(spotLightL);
      const targetL = new THREE.Object3D();
      targetL.position.set(-1.8, 0.6, 25);
      carGroup.add(targetL);
      spotLightL.target = targetL;

      const spotLightR = new THREE.SpotLight(
        0xfffbe0,
        0,
        150,
        Math.PI / 6,
        0.4,
        0.8,
      );
      spotLightR.position.set(1.8, 0.6, 4.6);
      carGroup.add(spotLightR);
      const targetR = new THREE.Object3D();
      targetR.position.set(1.8, 0.6, 25);
      carGroup.add(targetR);
      spotLightR.target = targetR;

      function getUnderglowColor(mode) {
        if (mode === "STRADA") return 0x3b82f6;
        if (mode === "SPORT") return 0xf97316;
        if (mode === "CORSA") return 0xef4444;
        return 0xff5500;
      }

      let headlightsActive = true;
      spotLightL.intensity = 2.5;
      spotLightR.intensity = 2.5;

      let underglowActive = true;
      function toggleUnderglow() {
        const btn = document.getElementById("btn-underglow");
        if (underglowActive) {
          underglowActive = false;
          underglowLight.intensity = 0;
          btn.classList.remove("active");
        } else {
          underglowActive = true;
          underglowLight.color.setHex(getUnderglowColor(driveMode));
          underglowLight.intensity = 4.5;
          btn.classList.add("active");
        }
      }
      toggleUnderglow();

      // 7. Pedestrians AI
      const npcs = [];
      const npcSpeeches = [
        "HEY!",
        "WATCH OUT!",
        "LAMBO!",
        "🏎️💨",
        "Wow! Aventador!",
        "Look at that!",
        "STRADA mode?",
        "😱",
        "Drive safe!",
        "Sleek!",
      ];

      function createPedestrian(x, z, assignedBlock) {
        const npcGroup = new THREE.Group();
        npcGroup.position.set(x, 2.1, z);

        const pantsColor = new THREE.Color().setHSL(Math.random(), 0.8, 0.35);
        const shirtColor = new THREE.Color().setHSL(Math.random(), 0.7, 0.5);
        const skinColor = new THREE.Color(0xffe4e6);

        const clothesMat = new THREE.MeshStandardMaterial({
          color: shirtColor,
          roughness: 0.8,
        });
        const pantsMat = new THREE.MeshStandardMaterial({
          color: pantsColor,
          roughness: 0.8,
        });
        const skinMat = new THREE.MeshStandardMaterial({
          color: skinColor,
          roughness: 0.8,
        });

        const torso = new THREE.Mesh(
          new THREE.BoxGeometry(1.0, 1.8, 0.6),
          clothesMat,
        );
        torso.position.y = 0;
        torso.castShadow = true;
        npcGroup.add(torso);

        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.42, 12, 12),
          skinMat,
        );
        head.position.y = 1.3;
        head.castShadow = true;
        npcGroup.add(head);

        const hairMat = new THREE.MeshStandardMaterial({
          color: Math.random() > 0.5 ? 0x221105 : 0x0a0a0c,
          roughness: 0.9,
        });
        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 0.3, 0.95),
          hairMat,
        );
        cap.position.set(0, 1.6, 0.05);
        npcGroup.add(cap);

        const leftArm = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, 1.4, 0.26),
          skinMat,
        );
        leftArm.position.set(-0.65, 0.1, 0);
        leftArm.castShadow = true;
        npcGroup.add(leftArm);

        const rightArm = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, 1.4, 0.26),
          skinMat,
        );
        rightArm.position.set(0.65, 0.1, 0);
        rightArm.castShadow = true;
        npcGroup.add(rightArm);

        const leftLeg = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 1.6, 0.35),
          pantsMat,
        );
        leftLeg.position.set(-0.32, -1.5, 0);
        leftLeg.castShadow = true;
        npcGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 1.6, 0.35),
          pantsMat,
        );
        rightLeg.position.set(0.32, -1.5, 0);
        rightLeg.castShadow = true;
        npcGroup.add(rightLeg);

        scene.add(npcGroup);

        const block = assignedBlock;
        const bX = block.x;
        const bZ = block.z;

        const corners = [
          { x: bX - 110, z: bZ - 110 },
          { x: bX + 110, z: bZ - 110 },
          { x: bX + 110, z: bZ + 110 },
          { x: bX - 110, z: bZ + 110 },
        ];

        const npcObj = {
          group: npcGroup,
          leftArm: leftArm,
          rightArm: rightArm,
          leftLeg: leftLeg,
          rightLeg: rightLeg,
          corners: corners,
          currentCornerIdx: Math.floor(Math.random() * 4),
          speed: 0.6 + Math.random() * 0.4,
          walkCycleTime: Math.random() * 100,
          state: "WALK",
          fleeTimer: 0,
          fleeVelocityX: 0,
          fleeVelocityZ: 0,
          bubbleText: null,
          bubbleTime: 0,
          bubbleEl: null,
        };
        npcs.push(npcObj);
      }

      blocksList.forEach((block) => {
        const pCount = block.bx === 0 && block.bz === 0 ? 6 : 3;
        for (let p = 0; p < pCount; p++) {
          const cornerIdx = p % 4;
          const corner = {
            x: block.x + (cornerIdx === 0 || cornerIdx === 3 ? -110 : 110),
            z: block.z + (cornerIdx === 0 || cornerIdx === 1 ? -110 : 110),
          };
          createPedestrian(corner.x, corner.z, block);
        }
      });

      // 8. Spawning Traffic Cars
      const trafficCars = [];
      const trafficColors = [
        0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xec4899, 0x6366f1, 0x14b8a6,
        0xd4d4d8,
      ];

      function spawnTrafficCar(startX, startZ, direction) {
        const trGroup = new THREE.Group();
        trGroup.position.set(startX, 0.1, startZ);

        const color =
          trafficColors[Math.floor(Math.random() * trafficColors.length)];
        const bodyMat = new THREE.MeshStandardMaterial({
          color: color,
          metalness: 0.5,
          roughness: 0.3,
        });
        const carbonMat = new THREE.MeshStandardMaterial({
          color: 0x18181b,
          roughness: 0.6,
        });

        const main = new THREE.Mesh(
          new THREE.BoxGeometry(4.4, 1.3, 8.5),
          bodyMat,
        );
        main.position.y = 0.85;
        main.castShadow = true;
        trGroup.add(main);

        const cabin = new THREE.Mesh(
          new THREE.BoxGeometry(3.8, 0.9, 4.0),
          new THREE.MeshStandardMaterial({
            color: 0x050508,
            transparent: true,
            opacity: 0.85,
          }),
        );
        cabin.position.set(0, 1.8, -0.6);
        cabin.castShadow = true;
        trGroup.add(cabin);

        function createTrafficWheel(wx, wz) {
          const wh = new THREE.Mesh(
            new THREE.CylinderGeometry(1.0, 1.0, 0.8, 16),
            new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.8 }),
          );
          wh.rotation.z = Math.PI / 2;
          wh.position.set(wx, 0.9, wz);
          trGroup.add(wh);
        }
        createTrafficWheel(-2.2, 2.4);
        createTrafficWheel(2.2, 2.4);
        createTrafficWheel(-2.2, -2.4);
        createTrafficWheel(2.2, -2.4);

        const hl = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.2, 0.1),
          new THREE.MeshBasicMaterial({ color: 0xfffbe0 }),
        );
        hl.position.set(-1.6, 0.85, 4.26);
        trGroup.add(hl);
        const hr = hl.clone();
        hr.position.x = 1.6;
        trGroup.add(hr);

        const tl = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.2, 0.1),
          new THREE.MeshBasicMaterial({ color: 0xff0000 }),
        );
        tl.position.set(-1.6, 0.85, -4.26);
        trGroup.add(tl);
        const tr = tl.clone();
        tr.position.x = 1.6;
        trGroup.add(tr);

        scene.add(trGroup);

        const trObj = {
          group: trGroup,
          direction: direction,
          speed: 1.5 + Math.random() * 0.8,
          cruiseSpeed: 1.5 + Math.random() * 0.8,
          currentSpeed: 1.5 + Math.random() * 0.8,
          originalX: startX,
          originalZ: startZ,
        };
        trafficCars.push(trObj);
      }

      roadCoords.forEach((xCoord) => {
        spawnTrafficCar(xCoord + 12, (Math.random() - 0.5) * 2400, "N");
        spawnTrafficCar(xCoord - 12, (Math.random() - 0.5) * 2400, "S");
      });

      roadCoords.forEach((zCoord) => {
        spawnTrafficCar((Math.random() - 0.5) * 2400, zCoord + 12, "E");
        spawnTrafficCar((Math.random() - 0.5) * 2400, zCoord - 12, "W");
      });

      // 9. Input & UI Controls
      const keys = {};
      window.addEventListener("keydown", (e) => {
        keys[e.key.toLowerCase()] = true;
      });
      window.addEventListener("keyup", (e) => {
        keys[e.key.toLowerCase()] = false;
      });

      let cameraMode = 0;
      function cycleCamera() {
        cameraMode = (cameraMode + 1) % 3;
        const btn = document.getElementById("btn-camera");
        if (cameraMode === 0) {
          btn.innerText = "FOLLOW";
          btn.classList.remove("active");
        }
        if (cameraMode === 1) {
          btn.innerText = "BONNET";
          btn.classList.add("active");
        }
        if (cameraMode === 2) {
          btn.innerText = "HELI";
          btn.classList.add("active");
        }
      }
      window.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "c") {
          cycleCamera();
        }
      });

      function toggleEngineCover() {
        const cover = document.getElementById("start-cover");
        cover.classList.toggle("open");
      }

      let isEngineOn = false;
      function toggleEngine() {
        const cover = document.getElementById("start-cover");
        if (!cover.classList.contains("open")) {
          cover.classList.add("open");
          return;
        }

        const btn = document.getElementById("btn-engine");
        const engineInd = document.getElementById("ind-engine");

        if (isEngineOn) {
          isEngineOn = false;
          btn.style.boxShadow = "none";
          btn.style.background =
            "radial-gradient(circle, #ff0055 0%, #990022 100%)";
          engineInd.classList.add("active");
          audio.stopEngineSound();
          targetRPM = 0;
          rpm = 0;
        } else {
          audio.startEngineSound();
          btn.style.boxShadow =
            "0 0 20px #00ff66, inset 0 0 10px rgba(255,255,255,0.5)";
          btn.style.background =
            "radial-gradient(circle, #00ff66 0%, #008833 100%)";

          const indList = document.querySelectorAll(".indicator");
          indList.forEach((ind) => ind.classList.add("active"));

          setTimeout(() => {
            if (isEngineOn) {
              indList.forEach((ind) => {
                if (ind.id !== "ind-headlight") ind.classList.remove("active");
              });
              if (handbrakeActive)
                document
                  .getElementById("ind-handbrake")
                  .classList.add("active");
            }
          }, 600);

          isEngineOn = true;
          targetRPM = 2500;
        }
      }

      let driveMode = "STRADA";
      function setDriveMode(mode) {
        driveMode = mode;

        document
          .querySelectorAll(".mode-btn")
          .forEach((btn) => btn.classList.remove("active"));
        if (mode === "STRADA")
          document.getElementById("mode-strada").classList.add("active");
        if (mode === "SPORT")
          document.getElementById("mode-sport").classList.add("active");
        if (mode === "CORSA")
          document.getElementById("mode-corsa").classList.add("active");

        let themeColor = "#3b82f6";
        if (mode === "SPORT") themeColor = "#f97316";
        if (mode === "CORSA") themeColor = "#ef4444";

        document.getElementById("panel-left").style.borderColor = themeColor;
        document.getElementById("panel-center").style.borderColor = themeColor;
        document.getElementById("panel-right").style.borderColor = themeColor;
        document.getElementById("gear-val").style.fill = themeColor;

        if (underglowActive) {
          underglowLight.color.setHex(getUnderglowColor(mode));
        }
      }

      // 10. Car Physics Variables
      let speed = 0;
      let carAngle = 0;
      let targetRPM = 0;
      let rpm = 0;
      let currentGear = "P";
      let handbrakeActive = true;
      let isAccelerating = false;
      let isDrifting = false;

      const driftParticles = [];
      const smokeMat = new THREE.MeshBasicMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.6,
      });
      const smokeGeom = new THREE.SphereGeometry(0.4, 8, 8);

      function spawnDriftSmoke(rearWheelPos) {
        const smoke = new THREE.Mesh(smokeGeom, smokeMat.clone());
        smoke.position.copy(rearWheelPos);
        smoke.position.y += 0.2;
        scene.add(smoke);

        smoke.userData = {
          opacity: 0.6,
          scale: 1.0,
          velY: 0.05 + Math.random() * 0.05,
        };
        driftParticles.push(smoke);
      }

      const tireMarks = [];
      const tireMarkMat = new THREE.MeshBasicMaterial({
        color: 0x111115,
        side: THREE.DoubleSide,
      });
      const tireMarkGeom = new THREE.PlaneGeometry(1.0, 1.4);

      function spawnTireMark(pos, carYaw) {
        const mark = new THREE.Mesh(tireMarkGeom, tireMarkMat);
        mark.rotation.x = -Math.PI / 2;
        mark.rotation.z = carYaw;
        mark.position.copy(pos);
        mark.position.y = 0.23;
        scene.add(mark);
        tireMarks.push(mark);

        if (tireMarks.length > 200) {
          const old = tireMarks.shift();
          scene.remove(old);
        }
      }

      function moveAndResolveCar(moveX, moveZ) {
        const stepLength = Math.sqrt(moveX * moveX + moveZ * moveZ);
        const numSteps = Math.max(1, Math.ceil(stepLength / 2.0));
        const stepX = moveX / numSteps;
        const stepZ = moveZ / numSteps;

        let collidedThisFrame = false;

        for (let step = 0; step < numSteps; step++) {
          carGroup.position.x += stepX;
          carGroup.position.z += stepZ;

          const cosYaw = Math.cos(carAngle);
          const sinYaw = Math.sin(carAngle);
          const carR = 2.3;
          const offsets = [3.2, -3.2];

          offsets.forEach((offset) => {
            const cx = carGroup.position.x + sinYaw * offset;
            const cz = carGroup.position.z + cosYaw * offset;

            colliders.forEach((col) => {
              let pushX = 0;
              let pushZ = 0;

              if (col.type === "box") {
                const closestX = Math.max(col.minX, Math.min(cx, col.maxX));
                const closestZ = Math.max(col.minZ, Math.min(cz, col.maxZ));
                const diffX = cx - closestX;
                const diffZ = cz - closestZ;
                const distSq = diffX * diffX + diffZ * diffZ;

                if (distSq < carR * carR) {
                  const dist = Math.sqrt(distSq);
                  const overlap = carR - dist;
                  if (dist > 0.001) {
                    pushX = (diffX / dist) * overlap;
                    pushZ = (diffZ / dist) * overlap;
                  } else {
                    const dl = cx - col.minX;
                    const dr = col.maxX - cx;
                    const dt_top = cz - col.minZ;
                    const db = col.maxZ - cz;
                    const minDist = Math.min(dl, dr, dt_top, db);
                    if (minDist === dl) {
                      pushX = -dl - carR;
                    } else if (minDist === dr) {
                      pushX = dr + carR;
                    } else if (minDist === dt_top) {
                      pushZ = -dt_top - carR;
                    } else {
                      pushZ = db + carR;
                    }
                  }
                }
              } else if (col.type === "circle") {
                const diffX = cx - col.x;
                const diffZ = cz - col.z;
                const distSq = diffX * diffX + diffZ * diffZ;
                const minDist = carR + col.r;

                if (distSq < minDist * minDist) {
                  const dist = Math.sqrt(distSq);
                  const overlap = minDist - dist;
                  if (dist > 0.001) {
                    pushX = (diffX / dist) * overlap;
                    pushZ = (diffZ / dist) * overlap;
                  } else {
                    pushX = minDist;
                  }
                }
              }

              if (pushX !== 0 || pushZ !== 0) {
                carGroup.position.x += pushX;
                carGroup.position.z += pushZ;
                collidedThisFrame = true;
              }
            });
          });
        }

        // Hard bound limit clamp (e.g. ±1215)
        const boundLimit = 1215;
        if (carGroup.position.x > boundLimit) {
          carGroup.position.x = boundLimit;
          collidedThisFrame = true;
        }
        if (carGroup.position.x < -boundLimit) {
          carGroup.position.x = -boundLimit;
          collidedThisFrame = true;
        }
        if (carGroup.position.z > boundLimit) {
          carGroup.position.z = boundLimit;
          collidedThisFrame = true;
        }
        if (carGroup.position.z < -boundLimit) {
          carGroup.position.z = -boundLimit;
          collidedThisFrame = true;
        }

        // Reset if somehow glitched past ±1220
        const resetLimit = 1220;
        if (
          Math.abs(carGroup.position.x) > resetLimit ||
          Math.abs(carGroup.position.z) > resetLimit
        ) {
          carGroup.position.set(0, 0.5, 0);
          speed = 0;
          carAngle = 0;
        }

        carGroup.rotation.y = carAngle;

        if (collidedThisFrame && Math.abs(speed) > 2) {
          audio.triggerCollisionSound();
          speed = -speed * 0.35;
          cameraShakeTimer = 0.35;
        }
      }

      const gearThresholds = [0.15, 0.32, 0.48, 0.64, 0.78, 0.9];

      function updateDashboard(dt) {
        if (!isEngineOn) {
          document.getElementById("speedo-val").innerText = "0";
          document.getElementById("gear-val").innerText = "P";
          document
            .getElementById("rpm-bar")
            .setAttribute("stroke-dashoffset", "880");
          document
            .getElementById("speedo-val")
            .classList.remove("rev-limit-flash");
          return;
        }

        const maxModeSpeed =
          driveMode === "STRADA" ? 42 : driveMode === "SPORT" ? 68 : 95;
        const absSpeed = Math.abs(speed);
        let gearNum = 1;
        let speedPct = absSpeed / maxModeSpeed;

        if (speed < -0.1) {
          currentGear = "R";
        } else if (absSpeed < 0.1) {
          currentGear = handbrakeActive ? "P" : "N";
        } else {
          for (let g = 0; g < gearThresholds.length; g++) {
            if (speedPct > gearThresholds[g]) {
              gearNum = g + 2;
            }
          }
          const nextGearStr = "D" + gearNum;
          if (currentGear !== nextGearStr && currentGear.startsWith("D")) {
            audio.triggerShiftPop();
            rpm = 3000;
          }
          currentGear = nextGearStr;
        }

        document.getElementById("gear-val").innerText = currentGear;

        if (currentGear === "P" || currentGear === "N") {
          const throttleVal = keys["w"] || keys["arrowup"] ? 4500 : 900;
          targetRPM = throttleVal + Math.sin(Date.now() * 0.05) * 100;
        } else if (currentGear === "R") {
          targetRPM = 1000 + (absSpeed / 15) * 4500;
        } else {
          const gearIdx = gearNum - 1;
          const minSpeedPct = gearIdx === 0 ? 0 : gearThresholds[gearIdx - 1];
          const maxSpeedPct =
            gearIdx === gearThresholds.length ? 1.0 : gearThresholds[gearIdx];

          const gearMinSpeed = minSpeedPct * maxModeSpeed;
          const gearMaxSpeed = maxSpeedPct * maxModeSpeed;

          const gearPct =
            (absSpeed - gearMinSpeed) / (gearMaxSpeed - gearMinSpeed);
          targetRPM = 3200 + Math.max(0, Math.min(1.0, gearPct)) * 5200;

          if (targetRPM > 8000) {
            document
              .getElementById("speedo-val")
              .classList.add("rev-limit-flash");
          } else {
            document
              .getElementById("speedo-val")
              .classList.remove("rev-limit-flash");
          }
        }

        rpm += (targetRPM - rpm) * 0.15;
        if (rpm < 0) rpm = 0;

        const rpmPercent = Math.max(0, Math.min(1.0, rpm / 10000));
        const offset = 880 - rpmPercent * 880;
        document
          .getElementById("rpm-bar")
          .setAttribute("stroke-dashoffset", offset);

        const displaySpeed = Math.floor(absSpeed * 2.8);
        document.getElementById("speedo-val").innerText = displaySpeed;

        const tcsInd = document.getElementById("ind-tcs");
        if (isDrifting) tcsInd.classList.add("active");
        else tcsInd.classList.remove("active");

        const handbrakeInd = document.getElementById("ind-handbrake");
        if (handbrakeActive) handbrakeInd.classList.add("active");
        else handbrakeInd.classList.remove("active");
      }

      function updateSpeechBubbles() {
        const tempV = new THREE.Vector3();
        npcs.forEach((npc) => {
          if (npc.bubbleText && npc.bubbleTime > 0) {
            npc.bubbleTime -= 0.016;
            if (npc.bubbleTime <= 0) {
              npc.bubbleText = null;
              if (npc.bubbleEl) {
                npc.bubbleEl.remove();
                npc.bubbleEl = null;
              }
            } else {
              tempV.setFromMatrixPosition(npc.group.matrixWorld);
              tempV.y += 3.5;
              tempV.project(camera);

              const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
              const y = (tempV.y * -0.5 + 0.5) * window.innerHeight;

              if (tempV.z > 1) {
                if (npc.bubbleEl) npc.bubbleEl.style.display = "none";
              } else {
                if (!npc.bubbleEl) {
                  const el = document.createElement("div");
                  el.className = "speech-bubble";
                  document.getElementById("speech-container").appendChild(el);
                  npc.bubbleEl = el;
                }
                npc.bubbleEl.style.display = "block";
                npc.bubbleEl.style.left = `${x}px`;
                npc.bubbleEl.style.top = `${y}px`;
                npc.bubbleEl.innerText = npc.bubbleText;
              }
            }
          } else {
            if (npc.bubbleEl) {
              npc.bubbleEl.remove();
              npc.bubbleEl = null;
            }
          }
        });
      }

      // 11. Main Loop
      const clock = new THREE.Clock();
      let steerAngleVisual = 0;

      function animate() {
        requestAnimationFrame(animate);

        const dt = Math.min(0.03, clock.getDelta());
        const time = Date.now() * 0.001;

        // Blinking aviation lights on skyscrapers
        blocksList.forEach((block) => {
          if (block.blinkingAviationLight) {
            const light = block.blinkingAviationLight;
            light.userData.timer += dt;
            if (light.userData.timer > 0.8) {
              light.material.color.setHex(
                light.material.color.getHex() === 0xef4444
                  ? 0x110000
                  : 0xef4444,
              );
              light.userData.timer = 0;
            }
          }

          // Fountain
          if (block.fountainWaterParticles) {
            block.fountainWaterParticles.forEach((p) => {
              p.position.x += p.userData.velX;
              p.position.y += p.userData.velY;
              p.position.z += p.userData.velZ;
              p.userData.velY -= 0.025;

              if (p.position.y < 1.4) {
                p.position.set(block.x, 3.5, block.z);
                const angle = Math.random() * Math.PI * 2;
                const rVel = 0.08 + Math.random() * 0.22;
                p.userData.velX = Math.sin(angle) * rVel;
                p.userData.velY = 0.35 + Math.random() * 0.35;
                p.userData.velZ = Math.cos(angle) * rVel;
              }
            });
          }
        });

        // Traffic Lights Timer
        tlTimer += dt;
        if (currentTLPhase === TL_PHASES.NS_GREEN && tlTimer > 7.0) {
          currentTLPhase = TL_PHASES.NS_YELLOW;
          tlTimer = 0;
        } else if (currentTLPhase === TL_PHASES.NS_YELLOW && tlTimer > 2.0) {
          currentTLPhase = TL_PHASES.EW_GREEN;
          tlTimer = 0;
        } else if (currentTLPhase === TL_PHASES.EW_GREEN && tlTimer > 7.0) {
          currentTLPhase = TL_PHASES.EW_YELLOW;
          tlTimer = 0;
        } else if (currentTLPhase === TL_PHASES.EW_YELLOW && tlTimer > 2.0) {
          currentTLPhase = TL_PHASES.NS_GREEN;
          tlTimer = 0;
        }

        trafficLights.forEach((tl) => {
          tl.red.material.color.setHex(0x3f0505);
          tl.yellow.material.color.setHex(0x3f3505);
          tl.green.material.color.setHex(0x053f05);

          if (tl.direction === "NS") {
            if (currentTLPhase === TL_PHASES.NS_GREEN)
              tl.green.material.color.setHex(0x22c55e);
            else if (currentTLPhase === TL_PHASES.NS_YELLOW)
              tl.yellow.material.color.setHex(0xeab308);
            else tl.red.material.color.setHex(0xef4444);
          } else {
            if (currentTLPhase === TL_PHASES.EW_GREEN)
              tl.green.material.color.setHex(0x22c55e);
            else if (currentTLPhase === TL_PHASES.EW_YELLOW)
              tl.yellow.material.color.setHex(0xeab308);
            else tl.red.material.color.setHex(0xef4444);
          }
        });

        // Car movement
        if (isEngineOn) {
          let maxSpeed = 42;
          let accel = 0.5;
          let steerSpeed = 0.022;

          if (driveMode === "SPORT") {
            maxSpeed = 68;
            accel = 0.8;
            steerSpeed = 0.026;
          } else if (driveMode === "CORSA") {
            maxSpeed = 95;
            accel = 1.25;
            steerSpeed = 0.03;
          }

          if (keys["shift"]) {
            maxSpeed *= 1.25;
            accel *= 1.6;
            carGroup.userData.flameGroup.scale.set(
              1.0,
              1.0,
              1.8 + Math.sin(Date.now() * 0.1) * 0.4,
            );
          } else {
            carGroup.userData.flameGroup.scale.set(0, 0, 0);
          }

          isAccelerating = keys["w"] || keys["arrowup"];
          const isReversing = keys["s"] || keys["arrowdown"];

          if (keys[" "]) {
            handbrakeActive = true;
          } else {
            handbrakeActive = false;
          }

          if (handbrakeActive) {
            speed *= 0.91;
          } else if (isAccelerating) {
            speed += accel;
          } else if (isReversing) {
            speed -= accel * 0.5; // Reduced reverse acceleration
          } else {
            speed *= 0.985;
          }

          const finalMax = maxSpeed;
          speed = Math.max(-8, Math.min(finalMax, speed)); // Max reverse speed capped at -8

          const steerInput =
            (keys["a"] || keys["arrowleft"] ? 1 : 0) -
            (keys["d"] || keys["arrowright"] ? 1 : 0);

          const speedFactor =
            Math.min(1.0, Math.abs(speed) / 10) * (speed < 0 ? -1 : 1);
          carAngle += steerInput * steerSpeed * speedFactor * (dt * 60);

          steerAngleVisual += (steerInput * 90 - steerAngleVisual) * 0.15;
          document.getElementById("steering-wheel").style.transform =
            `rotate(${-steerAngleVisual}deg)`;

          moveAndResolveCar(
            Math.sin(carAngle) * speed * dt * 30,
            Math.cos(carAngle) * speed * dt * 30,
          );

          carGroup.position.y = 0.02 + Math.sin(Date.now() * 0.08) * 0.015;

          const lateralSpeed = Math.abs(steerInput * speed);
          const isHardTurnDrift =
            driveMode !== "STRADA" && lateralSpeed > 28 && Math.random() > 0.3;
          isDrifting =
            isEngineOn &&
            (isHardTurnDrift || (handbrakeActive && Math.abs(speed) > 15));

          if (isDrifting) {
            carGroup.rotation.y +=
              Math.sin(Date.now() * 0.1) * 0.04 * steerInput;

            const offsetL = new THREE.Vector3(-2.3, 0.1, -2.7)
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), carAngle)
              .add(carGroup.position);
            const offsetR = new THREE.Vector3(2.3, 0.1, -2.7)
              .applyAxisAngle(new THREE.Vector3(0, 1, 0), carAngle)
              .add(carGroup.position);

            spawnTireMark(offsetL, carAngle);
            spawnTireMark(offsetR, carAngle);

            if (Math.random() > 0.5) {
              spawnDriftSmoke(offsetL);
              spawnDriftSmoke(offsetR);
            }
          }

          if (carGroup.userData.wheels) {
            carGroup.userData.wheels.forEach((rim) => {
              rim.rotation.x += speed * dt * 0.8;
            });
          }

          audio.updateSound(rpm, isAccelerating, isDrifting, driveMode);
        } else {
          speed *= 0.94;
          moveAndResolveCar(
            Math.sin(carAngle) * speed * dt * 30,
            Math.cos(carAngle) * speed * dt * 30,
          );
          carGroup.userData.flameGroup.scale.set(0, 0, 0);

          if (carGroup.userData.wheels) {
            carGroup.userData.wheels.forEach((rim) => {
              rim.rotation.x += speed * dt * 0.8;
            });
          }
          audio.updateSound(0, false, false, driveMode);
        }

        if (driveMode === "CORSA" && speed > 70) {
          const shake = (speed - 70) * 0.003;
          renderer.domElement.style.transform = `translate(${(Math.random() - 0.5) * shake * 100}px, ${(Math.random() - 0.5) * shake * 100}px)`;
        } else {
          renderer.domElement.style.transform = "translate(0, 0)";
        }

        const trafficWrapBound = 1230;

        // Smoke
        for (let p = driftParticles.length - 1; p >= 0; p--) {
          const particle = driftParticles[p];
          particle.userData.opacity -= 0.025;
          particle.userData.scale += 0.06;
          particle.position.y += particle.userData.velY;

          particle.scale.setScalar(particle.userData.scale);
          particle.material.opacity = particle.userData.opacity;

          if (particle.userData.opacity <= 0) {
            scene.remove(particle);
            driftParticles.splice(p, 1);
          }
        }

        // Traffic
        trafficCars.forEach((tc) => {
          let cruiseSpeed = tc.cruiseSpeed;
          let stoppedByLight = false;

          const intCoord = Math.round(tc.group.position.x / 300) * 300;
          const intCoordZ = Math.round(tc.group.position.z / 300) * 300;

          trafficLights.forEach((tl) => {
            const distSq = tc.group.position.distanceToSquared(
              tl.group.position,
            );
            if (distSq < 1500) {
              const isRed =
                (tl.direction === "NS" &&
                  currentTLPhase !== TL_PHASES.NS_GREEN) ||
                (tl.direction === "EW" &&
                  currentTLPhase !== TL_PHASES.EW_GREEN);

              if (isRed) {
                if (
                  tc.direction === "N" &&
                  tc.group.position.z < tl.z &&
                  tc.group.position.z > tl.z - 45
                )
                  stoppedByLight = true;
                else if (
                  tc.direction === "S" &&
                  tc.group.position.z > tl.z &&
                  tc.group.position.z < tl.z + 45
                )
                  stoppedByLight = true;
                else if (
                  tc.direction === "E" &&
                  tc.group.position.x < tl.x &&
                  tc.group.position.x > tl.x - 45
                )
                  stoppedByLight = true;
                else if (
                  tc.direction === "W" &&
                  tc.group.position.x > tl.x &&
                  tc.group.position.x < tl.x + 45
                )
                  stoppedByLight = true;
              }
            }
          });

          if (stoppedByLight) {
            tc.currentSpeed += (0 - tc.currentSpeed) * 0.12;
          } else {
            tc.currentSpeed += (cruiseSpeed - tc.currentSpeed) * 0.05;
          }

          if (tc.direction === "N") {
            tc.group.position.z += tc.currentSpeed * dt * 30;
            tc.group.rotation.y = 0;
          } else if (tc.direction === "S") {
            tc.group.position.z -= tc.currentSpeed * dt * 30;
            tc.group.rotation.y = Math.PI;
          } else if (tc.direction === "E") {
            tc.group.position.x += tc.currentSpeed * dt * 30;
            tc.group.rotation.y = Math.PI / 2;
          } else if (tc.direction === "W") {
            tc.group.position.x -= tc.currentSpeed * dt * 30;
            tc.group.rotation.y = -Math.PI / 2;
          }

          if (tc.group.position.z > trafficWrapBound)
            tc.group.position.z = -trafficWrapBound;
          if (tc.group.position.z < -trafficWrapBound)
            tc.group.position.z = trafficWrapBound;
          if (tc.group.position.x > trafficWrapBound)
            tc.group.position.x = -trafficWrapBound;
          if (tc.group.position.x < -trafficWrapBound)
            tc.group.position.x = trafficWrapBound;
        });

        // Pedestrians
        npcs.forEach((npc) => {
          npc.walkCycleTime += dt * npc.speed * 8;

          const distToPlayer = npc.group.position.distanceTo(carGroup.position);
          if (distToPlayer < 24.0 && speed > 2.0 && npc.state !== "FLEE") {
            npc.state = "FLEE";
            npc.fleeTimer = 2.5;

            const diffX = npc.group.position.x - carGroup.position.x;
            const diffZ = npc.group.position.z - carGroup.position.z;
            const mag = Math.sqrt(diffX * diffX + diffZ * diffZ) || 1;
            npc.fleeVelocityX = (diffX / mag) * 2.8;
            npc.fleeVelocityZ = (diffZ / mag) * 2.8;

            npc.bubbleText =
              npcSpeeches[Math.floor(Math.random() * npcSpeeches.length)];
            npc.bubbleTime = 1.8;
          }

          if (npc.state === "FLEE") {
            npc.group.position.x += npc.fleeVelocityX * dt * 30;
            npc.group.position.z += npc.fleeVelocityZ * dt * 30;

            npc.leftLeg.rotation.x = Math.sin(npc.walkCycleTime * 2.8) * 0.9;
            npc.rightLeg.rotation.x = -Math.sin(npc.walkCycleTime * 2.8) * 0.9;
            npc.leftArm.rotation.x = -Math.sin(npc.walkCycleTime * 2.8) * 0.9;
            npc.rightArm.rotation.x = Math.sin(npc.walkCycleTime * 2.8) * 0.9;

            npc.group.rotation.y = Math.atan2(
              npc.fleeVelocityX,
              npc.fleeVelocityZ,
            );

            npc.fleeTimer -= dt;
            if (npc.fleeTimer <= 0) {
              npc.state = "WALK";
            }
          } else {
            const targetCorner = npc.corners[npc.currentCornerIdx];
            const dx = targetCorner.x - npc.group.position.x;
            const dz = targetCorner.z - npc.group.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 4.0) {
              npc.currentCornerIdx = (npc.currentCornerIdx + 1) % 4;
            } else {
              npc.group.position.x += (dx / dist) * npc.speed * dt * 30;
              npc.group.position.z += (dz / dist) * npc.speed * dt * 30;

              npc.leftLeg.rotation.x = Math.sin(npc.walkCycleTime) * 0.55;
              npc.rightLeg.rotation.x = -Math.sin(npc.walkCycleTime) * 0.55;
              npc.leftArm.rotation.x = -Math.sin(npc.walkCycleTime) * 0.55;
              npc.rightArm.rotation.x = Math.sin(npc.walkCycleTime) * 0.55;

              npc.group.rotation.y = Math.atan2(dx, dz);
            }
          }
        });

        updateSpeechBubbles();

        // Camera views
        let targetCamPos = new THREE.Vector3();
        let lookAtTarget = new THREE.Vector3();

        if (cameraMode === 0) {
          const backOffset = new THREE.Vector3(0, 7.5, -24).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            carAngle,
          );
          targetCamPos.copy(carGroup.position).add(backOffset);

          const lookOffset = new THREE.Vector3(0, 1.5, 4.0).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            carAngle,
          );
          lookAtTarget.copy(carGroup.position).add(lookOffset);

          camera.position.lerp(targetCamPos, 0.12);
        } else if (cameraMode === 1) {
          const hoodOffset = new THREE.Vector3(0, 1.75, 1.25).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            carAngle,
          );
          targetCamPos.copy(carGroup.position).add(hoodOffset);
          camera.position.copy(targetCamPos);

          const lookOffset = new THREE.Vector3(0, 1.5, 30.0).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            carAngle,
          );
          lookAtTarget.copy(carGroup.position).add(lookOffset);
        } else {
          targetCamPos.copy(carGroup.position);
          targetCamPos.y = 85.0;
          targetCamPos.z += 0.1;
          camera.position.lerp(targetCamPos, 0.15);
          lookAtTarget.copy(carGroup.position);
        }

        // Apply Camera Shake
        if (cameraShakeTimer > 0) {
          cameraShakeTimer -= dt;
          if (cameraShakeTimer < 0) cameraShakeTimer = 0;
          const shakeIntensity = cameraShakeTimer * 2.5;
          camera.position.x += (Math.random() - 0.5) * shakeIntensity;
          camera.position.y += (Math.random() - 0.5) * shakeIntensity;
          camera.position.z += (Math.random() - 0.5) * shakeIntensity;
        }

        camera.lookAt(lookAtTarget);

        updateDashboard(dt);
        drawMiniMap();

        renderer.render(scene, camera);
      }

      // 12. Minimap GPS
      const mapCanvas = document.getElementById("mini-map");
      const mapCtx = mapCanvas.getContext("2d");
      const mapScale = 0.045;

      function drawMiniMap() {
        mapCtx.clearRect(0, 0, 110, 110);
        mapCtx.fillStyle = "#060608";
        mapCtx.fillRect(0, 0, 110, 110);

        mapCtx.save();
        mapCtx.translate(55, 55);
        mapCtx.rotate(-carAngle);

        const carX = carGroup.position.x;
        const carZ = carGroup.position.z;

        mapCtx.fillStyle = "#1e293b";
        roadCoords.forEach((coord) => {
          const rx = (coord - carX) * mapScale;
          mapCtx.fillRect(rx - 5, -100, 10, 200);

          const rz = (coord - carZ) * mapScale;
          mapCtx.fillRect(-100, rz - 5, 200, 10);
        });

        mapCtx.fillStyle = "#0f172a";
        blocksList.forEach((block) => {
          const bx = (block.x - carX) * mapScale;
          const bz = (block.z - carZ) * mapScale;
          mapCtx.fillRect(bx - 10, bz - 10, 20, 20);
        });

        mapCtx.fillStyle = "#eab308";
        trafficCars.forEach((tc) => {
          const tx = (tc.group.position.x - carX) * mapScale;
          const tz = (tc.group.position.z - carZ) * mapScale;
          mapCtx.beginPath();
          mapCtx.arc(tx, tz, 2.0, 0, Math.PI * 2);
          mapCtx.fill();
        });

        mapCtx.fillStyle = "#22c55e";
        npcs.forEach((npc) => {
          const nx = (npc.group.position.x - carX) * mapScale;
          const nz = (npc.group.position.z - carZ) * mapScale;
          mapCtx.beginPath();
          mapCtx.arc(nx, nz, 1.2, 0, Math.PI * 2);
          mapCtx.fill();
        });

        mapCtx.restore();

        mapCtx.fillStyle = "#ff5500";
        mapCtx.shadowBlur = 6;
        mapCtx.shadowColor = "#ff5500";
        mapCtx.beginPath();
        mapCtx.moveTo(55, 48);
        mapCtx.lineTo(50, 60);
        mapCtx.lineTo(60, 60);
        mapCtx.closePath();
        mapCtx.fill();
        mapCtx.shadowBlur = 0;
      }

      animate();

      window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });