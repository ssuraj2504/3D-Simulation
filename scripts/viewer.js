// Load room images and annotations from session storage
const roomData = JSON.parse(sessionStorage.getItem('roomImagesWithAnnotations'));
if (!roomData) {
    alert('No images found! Redirecting to upload page.');
    window.location.href = 'index.html';
}

// Three.js scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('scene-container').appendChild(renderer.domElement);

const loader = new THREE.TextureLoader();
const roomWidth = 10, roomHeight = 5, roomDepth = 10;

// Camera setup
const cameraHeight = 1.6;
camera.position.set(0, cameraHeight, 5);

// Annotation labels
const annotationLabels = [];

// Process walls and markers
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const markers = [];

Object.entries(roomData).forEach(([wallId, { image, annotations }]) => {
    const texture = loader.load(image);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    let wallMesh;

    switch (wallId) {
        case 'left-wall-input':
            wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(roomDepth, roomHeight), material);
            wallMesh.position.set(-roomWidth / 2, roomHeight / 2, 0);
            wallMesh.rotation.y = Math.PI / 2;
            break;
        case 'right-wall-input':
            wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(roomDepth, roomHeight), material);
            wallMesh.position.set(roomWidth / 2, roomHeight / 2, 0);
            wallMesh.rotation.y = -Math.PI / 2;
            break;
        case 'front-wall-input':
            wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), material);
            wallMesh.position.set(0, roomHeight / 2, roomDepth / 2);
            wallMesh.rotation.y = Math.PI;
            break;
        case 'back-wall-input':
            wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), material);
            wallMesh.position.set(0, roomHeight / 2, -roomDepth / 2);
            break;
        case 'ceiling-input':
            wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomDepth), material);
            wallMesh.position.set(0, roomHeight, 0);
            wallMesh.rotation.x = Math.PI / 2;
            break;
        case 'floor-input':
            wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomDepth), material);
            wallMesh.rotation.x = -Math.PI / 2;
            break;
    }

    scene.add(wallMesh);

    // Add markers for annotations
    annotations.forEach(({ x, y, title, description }) => {
        const markerPosition = new THREE.Vector3();
        if (['ceiling-input', 'floor-input'].includes(wallId)) {
            markerPosition.x = wallMesh.position.x + (x - 0.5) * roomWidth;
            markerPosition.z = wallMesh.position.z + (y - 0.5) * roomDepth;
            markerPosition.y = wallMesh.position.y;
        } else {
            markerPosition.x = wallMesh.position.x + (x - 0.5) * roomDepth;
            markerPosition.y = wallMesh.position.y + (0.5 - y) * roomHeight;
            markerPosition.z = wallMesh.position.z;
        }

        const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        marker.position.copy(markerPosition);
        scene.add(marker);
        markers.push({ marker, title, description, wallId });

        // Title label
        const label = document.createElement('div');
        label.className = 'annotation-label';
        label.textContent = title;
        label.style.display = 'none';
        document.body.appendChild(label);

        annotationLabels.push({ label, position: markerPosition });
    });
});

// Show title on hover
document.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(markers.map(({ marker }) => marker));

    annotationLabels.forEach(({ label }) => (label.style.display = 'none'));
    if (intersects.length > 0) {
        const { marker, title } = markers.find(({ marker }) => marker === intersects[0].object);
        const label = annotationLabels.find(({ position }) =>
            position.equals(marker.position)
        )?.label;
        if (label) {
            label.style.display = 'block';
            label.style.left = `${event.clientX + 10}px`;
            label.style.top = `${event.clientY + 10}px`;
        }
    }
});

// Animate camera on marker click to focus on the wall containing the annotation
document.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(markers.map(({ marker }) => marker));

    if (intersects.length > 0) {
        const { marker, title, description, wallId } = markers.find(
            ({ marker }) => marker === intersects[0].object
        );

        // Define the camera's position as the center of the room
        const targetPosition = new THREE.Vector3(0, cameraHeight, 0);

        // Calculate the lookAt position for the specific wall
        let lookAtPosition = new THREE.Vector3();

        switch (wallId) {
            case 'left-wall-input':
                lookAtPosition.set(-roomWidth / 2, cameraHeight, 0); // Center of the left wall
                break;
            case 'right-wall-input':
                lookAtPosition.set(roomWidth / 2, cameraHeight, 0); // Center of the right wall
                break;
            case 'front-wall-input':
                lookAtPosition.set(0, cameraHeight, roomDepth / 2); // Center of the front wall
                break;
            case 'back-wall-input':
                lookAtPosition.set(0, cameraHeight, -roomDepth / 2); // Center of the back wall
                break;
            case 'ceiling-input':
                lookAtPosition.set(0, roomHeight / 2, 0); // Center of the ceiling
                break;
            case 'floor-input':
                lookAtPosition.set(0, -roomHeight / 2, 0); // Center of the floor
                break;
        }

        // Smooth animation for the camera
        const step = 0.02;
        let progress = 0;

        const animateCamera = () => {
            progress += step;
            if (progress >= 1) progress = 1;

            camera.position.lerp(targetPosition, progress);
            camera.lookAt(lookAtPosition);

            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            }
        };

        animateCamera();

        // Display annotation
        const overlay = document.getElementById('annotation-overlay');
        overlay.querySelector('h1').textContent = title;
        overlay.querySelector('p').textContent = description;
        overlay.style.display = 'block';
    }
});

// Annotation label positioning
function updateAnnotationLabels() {
    annotationLabels.forEach(({ label, position }) => {
        const vector = position.clone().project(camera);
        if (vector.z < -1 || vector.z > 1 || vector.x < -1 || vector.x > 1 || vector.y < -1 || vector.y > 1) {
            label.style.display = 'none';
        } else {
            label.style.display = 'block';
            label.style.left = `${(vector.x + 1) * (window.innerWidth / 2)}px`;
            label.style.top = `${(-vector.y + 1) * (window.innerHeight / 2)}px`;
        }
    });
}

// Camera controls setup
let dragging = false;
let moveForward = false;
let forwardDistanceMoved = 0;
const maxForwardDistance = 5.0;
const speed = 0.1;
const targetDirection = new THREE.Vector3();

document.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
        dragging = false;
        moveForward = true;
        forwardDistanceMoved = 0;

        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        targetDirection.copy(raycaster.ray.direction).normalize();
    }
});

document.addEventListener('mouseup', () => {
    moveForward = false;
    dragging = false;
});

document.addEventListener('mousemove', (event) => {
    if (event.buttons === 1) {
        dragging = true;
        moveForward = false;

        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        camera.rotation.y += movementX * 0.002;
        camera.rotation.x += movementY * 0.002;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    }

    // Update arrow position
    const arrow = document.getElementById('arrow');
    arrow.style.left = `${event.clientX}px`;
    arrow.style.top = `${event.clientY}px`;
});

// Forward movement logic
function moveCamera() {
    if (moveForward && forwardDistanceMoved < maxForwardDistance) {
        camera.position.addScaledVector(targetDirection, speed);
        forwardDistanceMoved += speed;
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    moveCamera();
    updateAnnotationLabels();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
