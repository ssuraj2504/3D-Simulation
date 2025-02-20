const imageAnnotations = {};
let currentWallId = '';
let currentAnnotationCoords = {};

// Handle file uploads and display previews
document.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const wallId = event.target.id; // e.g., 'left-wall-input'
            const imgPreview = document.createElement('div');
            imgPreview.classList.add('image-preview');
            imgPreview.innerHTML = `
                <h3>${wallId.replace('-input', '').replace('-', ' ').toUpperCase()}</h3>
                <img src="${reader.result}" alt="${wallId}" id="${wallId}-preview" class="preview-image">
            `;
            document.getElementById('image-previews').appendChild(imgPreview);

            // Initialize empty annotations for this wall
            imageAnnotations[wallId] = { image: reader.result, annotations: [] };

            // Enable annotation on click
            const img = document.getElementById(`${wallId}-preview`);
            img.addEventListener('click', (e) => {
                const rect = img.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width).toFixed(4);
                const y = ((e.clientY - rect.top) / rect.height).toFixed(4);

                currentWallId = wallId;
                currentAnnotationCoords = { x, y };

                // Show the annotation modal
                document.getElementById('annotation-modal').style.display = 'flex';
            });
        };
        reader.readAsDataURL(file);
    });
});

// Save annotation from the modal
document.getElementById('save-annotation').addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default form submission behavior

    const title = document.getElementById('annotation-title').value;
    const description = document.getElementById('annotation-description').value;

    if (title) {
        imageAnnotations[currentWallId].annotations.push({ 
            ...currentAnnotationCoords, 
            title, 
            description 
        });

        const imgPreview = document.querySelector(`#${currentWallId}-preview`).parentElement;
        const marker = document.createElement('div');
        marker.classList.add('marker');
        marker.style.left = `${currentAnnotationCoords.x * 100}%`;
        marker.style.top = `${currentAnnotationCoords.y * 100}%`;
        imgPreview.appendChild(marker);

        // Hide the annotation modal and clear inputs
        document.getElementById('annotation-modal').style.display = 'none';
        document.getElementById('annotation-title').value = '';
        document.getElementById('annotation-description').value = '';
    } else {
        alert('Title is required!');
    }
});


// Close the annotation modal without saving
document.getElementById('close-modal').addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default form submission behavior
    document.getElementById('annotation-modal').style.display = 'none';
    document.getElementById('annotation-text').value = '';
});

// Save data and navigate to the viewer
document.getElementById('generate-view').addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default form submission behavior
    sessionStorage.setItem('roomImagesWithAnnotations', JSON.stringify(imageAnnotations));
    window.location.href = 'viewer.html';
});
