
let baseDeDatos = {};
const modelosInteractivos = [];
let objetoSeleccionadoPrevio = null;

const container = document.getElementById("canvas-container");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  container.clientWidth / container.clientHeight,
  0.1,
  1000,
);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

if ("outputColorSpace" in renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
} else if ("outputEncoding" in renderer) {
  renderer.outputEncoding = THREE.sRGBEncoding;
}

container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;


const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const dirLightFront = new THREE.DirectionalLight(0xffffff, 1.0);
dirLightFront.position.set(5, 10, 7.5);
scene.add(dirLightFront);

const dirLightBack = new THREE.DirectionalLight(0xffffff, 0.6);
dirLightBack.position.set(-5, -5, -7.5);
scene.add(dirLightBack);


const loader = new THREE.GLTFLoader();

fetch("./js/musculos.json")
  .then((response) => response.json())
  .then((data) => {
    baseDeDatos = data;
    console.log("Base de datos cargada:", baseDeDatos);

    Object.keys(baseDeDatos).forEach((idObjeto) => {
      const info = baseDeDatos[idObjeto];
      const tipoObjeto = info.tipo || "musculo";

      if (info.archivo_glb) {
        loader.load(
          info.archivo_glb,
          (gltf) => {
            const modelo = gltf.scene;
            modelo.name = idObjeto;
            modelo.traverse((hijo) => {
              if (hijo.isMesh) {
                
                hijo.geometry.computeVertexNormals();
                if (hijo.geometry.attributes.color) {
                    hijo.geometry.deleteAttribute('color');
                }

                if (tipoObjeto === "hueso") {
                  hijo.userData = { idObjeto: idObjeto, capa: info.capa, tipo: "hueso" };
                  hijo.material = new THREE.MeshStandardMaterial({
                    color: 0xe3dac9, 
                    roughness: 0.7,
                    side: THREE.DoubleSide
                  });
                } else {
                  if (hijo.name.endsWith("_1")) {
                    hijo.userData = { idObjeto: idObjeto, capa: info.capa, tipo: "tendon" };
                    hijo.material = new THREE.MeshStandardMaterial({
                      color: 0xeaeaea, 
                      roughness: 0.8,
                      side: THREE.DoubleSide
                    });
                  } else {
                    hijo.userData = { idObjeto: idObjeto, capa: info.capa, tipo: "musculo" };
                    hijo.material = new THREE.MeshStandardMaterial({
                      color: 0x9e2a2b, 
                      roughness: 0.5,
                      side: THREE.DoubleSide
                    });
                  }
                }
                modelosInteractivos.push(hijo);
              }
            });

            scene.add(modelo);
          },
          undefined,
          (error) => console.error(`Error al cargar ${idObjeto}:`, error)
        );
      }
    });

    generarListaMusculos();
  })
  .catch((error) => console.error("Error al cargar JSON:", error));

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("click", (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;

  mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const objetosVisibles = modelosInteractivos.filter((m) => m.visible);
  const intersects = raycaster.intersectObjects(objetosVisibles);

  if (intersects.length > 0) {
    const objetoSeleccionado = intersects[0].object;
    resaltarObjeto(objetoSeleccionado);
  }
  abrirPanelMovil('derecho');
});

function resaltarObjeto(objeto3D) {
  const idSeleccionado = objeto3D.userData.idObjeto;

  modelosInteractivos.forEach((mesh) => {
    if (mesh.userData.tipo !== "hueso") {
      
      if (mesh.userData.tipo === "tendon") {
        mesh.material.color.setHex(0xeaeaea);
      } else {
        mesh.material.color.setHex(0x9e2a2b);
      }

      if (mesh.userData.idObjeto === idSeleccionado) {

        mesh.material.transparent = false;
        mesh.material.opacity = 1.0;
        mesh.material.depthWrite = true; 
      } else {

        mesh.material.transparent = true;
        mesh.material.opacity = 0.1;
        mesh.material.depthWrite = false; 
      }
    }
  });

  objetoSeleccionadoPrevio = objeto3D;
  mostrarInfoPanel(idSeleccionado);
}

function mostrarInfoPanel(idObjeto) {
  const info = baseDeDatos[idObjeto];
  const panel = document.getElementById("info-panel");
  const tituloMovil = document.querySelector(".titulo-movil"); 

  if (info) {
    if (tituloMovil) tituloMovil.textContent = info.nombre;

    panel.innerHTML = `
      <div class="right-header" style="margin-bottom: 15px;">
         <h2 style="color: #E23D75; font-size: 1.15rem; font-weight: 500; margin: 0;">${info.nombre}</h2>
      </div>

      <div class="info-section" style="background-color: #181C25; border-radius: 12px; padding: 16px; margin-bottom: 15px; border-left: 3px solid #E23D75; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h4 style="color: #E23D75; font-size: 0.75rem; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600;">
          ORIGEN E INSERCIÓN
        </h4>
        <p style="font-size: 0.9rem; color: #8492A6; margin-bottom: 4px; line-height: 1.4;"><b style="color: #F8FAFC;">Origen:</b> ${info.origen || "-"}</p>
        <p style="font-size: 0.9rem; color: #8492A6; line-height: 1.4;"><b style="color: #F8FAFC;">Inserción:</b> ${info.insercion || "-"}</p>
      </div>

      <div class="info-section" style="background-color: #181C25; border-radius: 12px; padding: 16px; margin-bottom: 15px; border-left: 3px solid #E23D75; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h4 style="color: #E23D75; font-size: 0.75rem; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600;">
          POSICIÓN Y FUNCIÓN
        </h4>
        <p style="font-size: 0.9rem; color: #8492A6; margin-bottom: 4px; line-height: 1.4;"><b style="color: #F8FAFC;">Posición:</b> ${info.posicion || "-"}</p>
        <p style="font-size: 0.9rem; color: #8492A6; line-height: 1.4;"><b style="color: #F8FAFC;">Función:</b> ${info.funcion || "-"}</p>
      </div>

      <div class="info-section" style="background-color: #181C25; border-radius: 12px; padding: 16px; margin-bottom: 15px; border-left: 3px solid #E23D75; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h4 style="color: #E23D75; font-size: 0.75rem; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600;">
          VASCULARIZACIÓN E INERVACIÓN
        </h4>
        <p style="font-size: 0.9rem; color: #8492A6; margin-bottom: 4px; line-height: 1.4;"><b style="color: #F8FAFC;">Irrigación:</b> ${info.irrigacion || "-"}</p>
        <p style="font-size: 0.9rem; color: #8492A6; line-height: 1.4;"><b style="color: #F8FAFC;">Inervación:</b> ${info.inervacion || "-"}</p>
      </div>
    `;
  }
}


window.filtrarCapa = function (capaObjetivo, botonClicado) {
  

  if (botonClicado) {

    const botones = document.querySelectorAll('.lista-capas .layer-btn');
    botones.forEach(btn => btn.classList.remove('active-layer'));
    

    botonClicado.classList.add('active-layer');
  }

  modelosInteractivos.forEach((mesh) => {
    const capaMesh = mesh.userData.capa ? mesh.userData.capa.toLowerCase() : "";
    const tipoMesh = mesh.userData.tipo;
    let coincide = false;

    if (capaObjetivo === "todos") coincide = true;
    else if (capaObjetivo === "superficial" && capaMesh.includes("superficial")) coincide = true;
    else if (capaObjetivo === "intermedio" && capaMesh.includes("intermedi")) coincide = true;
    else if (capaObjetivo === "intrinseco" && (capaMesh.includes("intrinsec") || capaMesh.includes("intrínsec") || capaMesh.includes("profund"))) coincide = true;

    if (tipoMesh === "hueso" || coincide) {
      mesh.visible = true;
      if (tipoMesh !== "hueso") {
        mesh.material.transparent = false;
        mesh.material.opacity = 1.0;
        mesh.material.depthWrite = true; 
        if (tipoMesh === "tendon") mesh.material.color.setHex(0xeaeaea);
        else mesh.material.color.setHex(0x9e2a2b);
      }
    } else {
      mesh.visible = false;
    }
  });
  objetoSeleccionadoPrevio = null;
};


function animar() {
  requestAnimationFrame(animar);
  controls.update();
  renderer.render(scene, camera);
}
animar();

window.addEventListener("resize", () => {
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});


const searchInput = document.getElementById("search-input");
if (searchInput) {
  searchInput.addEventListener("input", (evento) => {
    const textoBuscado = evento.target.value.toLowerCase();

    generarListaMusculos(textoBuscado);


    modelosInteractivos.forEach((mesh) => {
      const tipoMesh = mesh.userData.tipo;
      const idObjeto = mesh.userData.idObjeto;
      const info = baseDeDatos[idObjeto];
      const nombreMusculo = info && info.nombre ? info.nombre.toLowerCase() : "";

      if (tipoMesh !== "hueso") {
        mesh.visible = true; 
        
        if (textoBuscado === "" || nombreMusculo.includes(textoBuscado)) {
          mesh.material.transparent = false;
          mesh.material.opacity = 1.0;
        } else {
          mesh.material.transparent = true;
          mesh.material.opacity = 0.15;
        }

        if (tipoMesh === "tendon") mesh.material.color.setHex(0xeaeaea);
        else mesh.material.color.setHex(0x9e2a2b);
      }
    });

    objetoSeleccionadoPrevio = null;
  });
}


function generarListaMusculos(filtro = "") {
  const contenedorLista = document.getElementById("lista-musculos");
  if (!contenedorLista) return;
  
  contenedorLista.innerHTML = ""; 

  if (filtro.trim() === "") return; 

  Object.keys(baseDeDatos).forEach((idObjeto) => {
    const info = baseDeDatos[idObjeto];
    
    if (info.tipo !== "hueso") {
      const nombreMusculo = info.nombre.toLowerCase();
      
      if (nombreMusculo.includes(filtro.toLowerCase())) {
        const itemLista = document.createElement("button");
        
        itemLista.style.cssText = "display: block; width: 100%; text-align: left; background: #1F2430; color: #F8FAFC; border: 1px solid #2A303C; border-left: 3px solid transparent; padding: 12px 15px; margin-bottom: 4px; cursor: pointer; font-size: 0.85rem; transition: 0.2s; outline: none;";
        itemLista.onmouseover = () => { itemLista.style.background = "#2A303C"; itemLista.style.borderLeftColor = "#E23D75"; };
        itemLista.onmouseout = () => { itemLista.style.background = "#1F2430"; itemLista.style.borderLeftColor = "transparent"; };
        
        itemLista.innerHTML = `<span>${info.nombre}</span>`;
        
        itemLista.addEventListener("click", () => {
          const objeto3D = modelosInteractivos.find(m => m.userData.idObjeto === idObjeto && m.userData.tipo !== "hueso");
          if (objeto3D) {
            resaltarObjeto(objeto3D);
          }
  
          document.getElementById("search-input").value = "";
          contenedorLista.innerHTML = "";
        });

        contenedorLista.appendChild(itemLista);
      }
    }
  });
}


function abrirPanelMovil(panel) {

  if (window.innerWidth > 768) return;

  const panelIzquierdo = document.querySelector('.panel-izquierdo');
  const panelDerecho = document.querySelector('.panel-derecho');
  const btnCapas = document.getElementById('nav-btn-capas');
  const btnInfo = document.getElementById('nav-btn-info');

  if (panel === 'izquierdo') {
    panelIzquierdo.classList.add('panel-activo');
    panelDerecho.classList.remove('panel-activo');
    btnCapas.classList.add('nav-activo');
    btnInfo.classList.remove('nav-activo');
  } else if (panel === 'derecho') {
    panelDerecho.classList.add('panel-activo');
    panelIzquierdo.classList.remove('panel-activo');
    btnInfo.classList.add('nav-activo');
    btnCapas.classList.remove('nav-activo');
  }
}
