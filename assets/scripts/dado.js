let scene, camera, renderer;
let cubeDice, icoDice;
let currentDice;
let isRolling = false;
const rotationSpeed = 0.1;
let targetRotation = { x: 0, y: 0, z: 0 };
let audio_roll = new Audio('../../assets/sounds/diceroll.mp3');
let currentDiceType = 'd6';
let numbersGroup;

// Configuraciones para el d6
const d6FaceConfigs = {
    1: { rotation: { x: 0, y: 0, z: 0 } },             // Frente
    6: { rotation: { x: Math.PI, y: 0, z: 0 } },       // Atrás
    2: { rotation: { x: Math.PI/2, y: 0, z: 0 } },     // Arriba
    5: { rotation: { x: -Math.PI/2, y: 0, z: 0 } },    // Abajo
    3: { rotation: { x: 0, y: -Math.PI/2, z: 0 } },    // Derecha
    4: { rotation: { x: 0, y: Math.PI/2, z: 0 } }      // Izquierda
};

// Para el d20, usaremos posiciones estables para cada número
const d20FaceConfigs = [];
// Inicializamos con rotaciones aleatorias para cada número
// Estas rotaciones serán reemplazadas por rotaciones precisas durante la creación del dado
for (let i = 1; i <= 20; i++) {
    d20FaceConfigs.push({
        rotation: { x: 0, y: 0, z: 0 },
        position: null  // Se llenará durante la creación del dado
    });
}

function init() {
    // Configurar escena
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(400, 400);
    renderer.setClearColor(0x1a1a1a);
    document.getElementById('diceContainer').appendChild(renderer.domElement);

    createCubeDice();
    createIcosahedronDice();
    
    // Inicialmente mostramos el d6
    updateDiceVisibility();

    camera.position.z = 5;

    // Añadir luz ambiental
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Añadir luz direccional para mejor visualización de las caras
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 2);
    scene.add(directionalLight);

    animate();
    
    // Evento para cambiar entre dados
    document.querySelectorAll('input[name="diceType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            currentDiceType = this.value;
            updateDiceVisibility();
        });
    });
}

function updateDiceVisibility() {
    if (currentDiceType === 'd6') {
        cubeDice.visible = true;
        icoDice.visible = false;
        if (numbersGroup) numbersGroup.visible = false;
        currentDice = cubeDice;
    } else {
        cubeDice.visible = false;
        icoDice.visible = true;
        if (numbersGroup) numbersGroup.visible = true;
        currentDice = icoDice;
    }
}

function createCubeDice() {
    // Crear geometría del dado cúbico (d6)
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const materials = [];

    // Crear texturas para cada cara
    // El orden de las caras en BoxGeometry es: right, left, top, bottom, front, back
    // Reordenamos las texturas para que coincidan con la geometría
    const faceOrder = [3, 4, 2, 5, 1, 6]; // Orden correcto para las caras
    
    for (let i = 0; i < 6; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const context = canvas.getContext('2d');

        // Fondo blanco
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, 128, 128);

        // Dibujar puntos
        context.fillStyle = '#000000';
        drawDiceFace(context, faceOrder[i]);

        const texture = new THREE.CanvasTexture(canvas);
        materials.push(new THREE.MeshStandardMaterial({ 
            map: texture,
            roughness: 0.2,
            metalness: 0.1
        }));
    }

    cubeDice = new THREE.Mesh(geometry, materials);
    scene.add(cubeDice);
}

function createIcosahedronDice() {
    // Crear geometría de icosaedro (d20)
    const radius = 1.5;
    const geometry = new THREE.IcosahedronGeometry(radius);
    
    // Material para el d20 con un color base
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x2196F3,
        roughness: 0.2,
        metalness: 0.3
    });
    
    icoDice = new THREE.Mesh(geometry, material);
    scene.add(icoDice);
    
    // Añadir los números al d20
    createNumbersOnFaces(icoDice, radius);
}

function createNumbersOnFaces(icosahedron, radius) {
    // Crear un grupo para contener todos los números
    numbersGroup = new THREE.Group();
    scene.add(numbersGroup);
    
    // Obtener los centros y normales de las caras del icosahedro
    const positions = icosahedron.geometry.attributes.position;
    const faces = [];
    
    // Crear las caras del icosahedro
    for (let i = 0; i < positions.count; i += 3) {
        const face = [];
        for (let j = 0; j < 3; j++) {
            const vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(positions, i + j);
            face.push(vertex);
        }
        faces.push(face);
    }
    
    // Calcular los centros de las caras
    const faceCenters = [];
    for (const face of faces) {
        const center = new THREE.Vector3();
        for (const vertex of face) {
            center.add(vertex);
        }
        center.divideScalar(3);
        center.normalize().multiplyScalar(radius); // Poner en la superficie
        
        // Verificar si este centro ya está en nuestra lista
        let isUnique = true;
        for (const existingCenter of faceCenters) {
            if (existingCenter.distanceTo(center) < 0.1) {
                isUnique = false;
                break;
            }
        }
        
        if (isUnique && faceCenters.length < 20) {
            faceCenters.push(center);
        }
    }
    
    // Si no tenemos 20 caras, generar posiciones adicionales uniformemente
    while (faceCenters.length < 20) {
        const phi = Math.acos(-1 + 2 * Math.random());
        const theta = 2 * Math.PI * Math.random();
        
        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.sin(phi) * Math.sin(theta);
        const z = Math.cos(phi);
        
        const pos = new THREE.Vector3(x, y, z).multiplyScalar(radius);
        
        let isUnique = true;
        for (const existingPos of faceCenters) {
            if (existingPos.distanceTo(pos) < 0.1) {
                isUnique = false;
                break;
            }
        }
        
        if (isUnique) {
            faceCenters.push(pos);
        }
    }
    
    // Array para almacenar los decals y sus valores
    const decals = [];
    
    // Crear decals (calcomanías) para los números en las caras
    for (let i = 0; i < 20; i++) {
        const faceCenter = faceCenters[i];
        
        // Crear un canvas para el número
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        // Dibujar el número
        context.fillStyle = 'white';
        context.font = 'bold 40px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText((i + 1).toString(), 32, 32);
        
        // Crear textura y material para el decal
        const texture = new THREE.CanvasTexture(canvas);
        const decalMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthTest: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4
        });
        
        // Crear un plano pequeño para el número
        const decalGeometry = new THREE.PlaneGeometry(0.5, 0.5);
        const decal = new THREE.Mesh(decalGeometry, decalMaterial);
        
        // Colocar el decal en el centro de la cara
        decal.position.copy(faceCenter);
        
        // Orientar el decal para que mire hacia afuera desde el centro del dado
        decal.lookAt(faceCenter.clone().multiplyScalar(2));
        
        // Acercar ligeramente el decal a la superficie para evitar z-fighting
        decal.position.copy(
            faceCenter.clone().normalize().multiplyScalar(radius * 1.01)
        );
        
        // Almacenar el valor del número para determinar el resultado
        decal.userData = { value: i + 1 };
        
        // Añadir al grupo de números
        numbersGroup.add(decal);
        
        // Guardar decal para referencia
        decals.push({
            decal: decal,
            value: i + 1,
            position: faceCenter.clone()
        });
    }
    
    // Calcular rotaciones para cada resultado del d20
    for (let i = 0; i < 20; i++) {
        const result = i + 1;
        const decalData = decals.find(d => d.value === result);
        
        if (decalData) {
            // Vector de la cámara a la cara (negativo porque queremos que la cara mire a la cámara)
            const facing = new THREE.Vector3(0, 0, 1);
            const targetPosition = decalData.position.clone().negate().normalize();
            
            // Calcular la rotación que orienta la cara hacia la cámara
            const quaternion = new THREE.Quaternion().setFromUnitVectors(targetPosition, facing);
            const euler = new THREE.Euler().setFromQuaternion(quaternion);
            
            // Guardar la rotación precisa para mostrar esta cara
            d20FaceConfigs[result - 1].rotation = {
                x: euler.x,
                y: euler.y,
                z: euler.z
            };
            d20FaceConfigs[result - 1].position = decalData.position.clone();
        }
    }
    
    // Inicialmente oculto dependiendo del tipo de dado seleccionado
    numbersGroup.visible = (currentDiceType === 'd20');
}

function drawDiceFace(context, number) {
    const dotPositions = {
        1: [[64, 64]],
        2: [[32, 32], [96, 96]],
        3: [[32, 32], [64, 64], [96, 96]],
        4: [[32, 32], [32, 96], [96, 32], [96, 96]],
        5: [[32, 32], [32, 96], [64, 64], [96, 32], [96, 96]],
        6: [[32, 32], [32, 64], [32, 96], [96, 32], [96, 64], [96, 96]]
    };

    context.beginPath();
    dotPositions[number].forEach(pos => {
        context.moveTo(pos[0], pos[1]);
        context.arc(pos[0], pos[1], 10, 0, Math.PI * 2);
    });
    context.fill();
}

function animate() {
    requestAnimationFrame(animate);

    if (isRolling) {
        // Rotar dados durante el lanzamiento
        cubeDice.rotation.x += rotationSpeed;
        cubeDice.rotation.y += rotationSpeed;
        cubeDice.rotation.z += rotationSpeed;
        
        icoDice.rotation.x += rotationSpeed;
        icoDice.rotation.y += rotationSpeed;
        icoDice.rotation.z += rotationSpeed;
        
        // Rotar también el grupo de números
        if (numbersGroup) {
            numbersGroup.rotation.copy(icoDice.rotation);
        }
    } else {
        // Suavizar la rotación hacia el objetivo
        cubeDice.rotation.x += (targetRotation.x - cubeDice.rotation.x) * 0.1;
        cubeDice.rotation.y += (targetRotation.y - cubeDice.rotation.y) * 0.1;
        cubeDice.rotation.z += (targetRotation.z - cubeDice.rotation.z) * 0.1;
        
        icoDice.rotation.x += (targetRotation.x - icoDice.rotation.x) * 0.1;
        icoDice.rotation.y += (targetRotation.y - icoDice.rotation.y) * 0.1;
        icoDice.rotation.z += (targetRotation.z - icoDice.rotation.z) * 0.1;
        
        // Aplicar la misma rotación al grupo de números
        if (numbersGroup) {
            numbersGroup.rotation.copy(icoDice.rotation);
        }
    }

    renderer.render(scene, camera);
}

function rollDice() {
    if (isRolling) return;

    isRolling = true;
    let result;
    
    // El resultado depende del tipo de dado
    if (currentDiceType === 'd6') {
        result = Math.floor(Math.random() * 6) + 1;
    } else {
        result = Math.floor(Math.random() * 20) + 1;
    }
    
    // Limpiar el resultado anterior
    document.getElementById('resultDisplay').textContent = '';
    
    const rollDuration = 700; // 0.7 segundo

    try {
        audio_roll.play().catch(e => console.log('Error al reproducir sonido:', e));
    } catch (e) {
        console.log('Error al reproducir sonido:', e);
    }

    setTimeout(() => {
        isRolling = false;
        
        // Configurar la rotación objetivo según el tipo de dado
        if (currentDiceType === 'd6') {
            targetRotation = d6FaceConfigs[result].rotation;
        } else {
            // Obtener la rotación precisa para el resultado del d20
            targetRotation = d20FaceConfigs[result - 1].rotation;
        }
        
        // Mostrar resultado
        document.getElementById('resultDisplay').textContent = `Resultado: ${result}`;
        M.toast({html: `¡Resultado: ${result}!`, classes: 'rounded'});
    }, rollDuration);
}

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    init();
    document.getElementById('rollButton').addEventListener('click', rollDice);
    
    // Inicializar Materialize
    M.AutoInit();
});