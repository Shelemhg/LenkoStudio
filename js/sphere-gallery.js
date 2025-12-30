/**
 * Sphere 3D Gallery
 * Handles the interactive 3D sphere modal for portfolio sessions
 */

window.SphereGallery = (() => {
  // DOM Elements
  let modal, container, sphere;
  let activePortfolioItem = null;
  
  // State
  let isDragging = false;
  let hasDragged = false; // Track if a drag occurred
  let startX, startY;
  let animationFrame;
  let sphereItems = []; // Store item positions
  let currentRadius = 300; // Store current radius for depth calculations
  let closeTimeout = null; // Track close timeout to prevent race conditions
  let activeClone = null; // Track active clone to prevent overlap
  
  // Rotation Matrix (Identity initially)
  let currentMatrix = [
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  ];
  
  // Momentum
  let velocityX = 0;
  let velocityY = 0;

  // Configuration
  const SPHERE_RADIUS = 300; // px
  const ITEM_COUNT = 14; // Number of images in the sphere
  const MAX_POOL_SIZE = 30; // Max items to reuse
  let itemPool = []; // Pool of sphere items
  let currentPreparedFolder = null; // Track currently prepared folder
  
  // Cache for preloaded images
  const preloadedFolders = new Set();
  // Keep references to prevent Garbage Collection of preloading images
  const imageCache = [];

  function preloadImages(folder, count) {
    if (preloadedFolders.has(folder)) return;
    preloadedFolders.add(folder);
    
    // Preload all images in the folder
    for (let i = 1; i <= count; i++) {
        const img = new Image();
        img.src = `${folder}/${i}.jpg`;
        // Push to global cache to ensure browser completes the download
        imageCache.push(img);
    }
  }

  function init() {
    // Create Modal HTML if it doesn't exist
    if (!document.getElementById('sphere-modal')) {
      const modalHTML = `
        <div id="sphere-modal" class="sphere-modal" aria-hidden="true">
          <div class="sphere-close-btn">&times;</div>
          <div class="sphere-scene">
            <div class="sphere" id="gallery-sphere"></div>
          </div>
          <div class="sphere-instruction">Drag to rotate • Click image to set as cover</div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    modal = document.getElementById('sphere-modal');
    sphere = document.getElementById('gallery-sphere');
    const closeBtn = modal.querySelector('.sphere-close-btn');

    // Create Pool of Sphere Items
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < MAX_POOL_SIZE; i++) {
        const item = document.createElement('div');
        item.className = 'sphere-item';
        // OPTIMIZATION: Use visibility instead of display to keep layout stable
        // This prevents layout thrashing when showing/hiding items
        item.style.visibility = 'hidden'; 
        item.style.display = 'block';
        item.innerHTML = `
            <img src="" alt="" decoding="async" loading="eager" draggable="false">
            <div class="sphere-item__overlay"></div>
        `;
        
        // Store references
        itemPool.push({
            element: item,
            img: item.querySelector('img'),
            overlay: item.querySelector('.sphere-item__overlay')
        });
        
        // Add click listener once
        item.addEventListener('click', (e) => {
             e.stopPropagation();
             if (!isDragging && !hasDragged) {
                 // Get current src from the img element
                 const currentSrc = item.querySelector('img').src;
                 if (currentSrc) selectImage(currentSrc, item);
             }
        });
        
        fragment.appendChild(item);
    }
    sphere.appendChild(fragment);

    // Event Listeners
    closeBtn.addEventListener('click', () => close());
    
    // Aggressive Preload: Start loading gallery images in the background
    // specifically targeting the heavy "Valkiria" folder first
    setTimeout(() => {
        const heavyItems = Array.from(document.querySelectorAll('.portfolio-item[data-folder]'))
            .sort((a, b) => parseInt(b.dataset.count) - parseInt(a.dataset.count)); // Load largest first
            
        heavyItems.forEach(item => {
            const folder = item.dataset.folder;
            const count = parseInt(item.dataset.count, 10);
            if (folder && count) preloadImages(folder, count);
        });
    }, 200);
    
    // Drag Rotation Logic
    modal.addEventListener('mousedown', handleDragStart);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    
    // Touch support
    modal.addEventListener('touchstart', handleDragStart, { passive: false });
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);

    // Attach click listeners to portfolio items
    document.querySelectorAll('.portfolio-item').forEach(item => {
      // Preload and Prepare on hover
      item.addEventListener('mouseenter', () => {
        const folder = item.dataset.folder;
        const count = parseInt(item.dataset.count, 10);
        
        // 1. Network Preload
        if (folder && count) {
            preloadImages(folder, count);
        }
        
        // 2. DOM Preparation (Hot Pool)
        // Generate image list same as open()
        let images = [];
        if (folder && count) {
            for (let i = 1; i <= count; i++) {
                images.push(`${folder}/${i}.jpg`);
            }
            
            // Speculatively populate the sphere
            // Use a unique key for "prepared" state (folder)
            prepareSphereContent(images, folder);
        }
      });

      item.addEventListener('click', (e) => {
        // Don't trigger if clicking links or buttons inside
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
        open(item);
      });
    });

    // Animation loop is started in open()
  }

  function prepareSphereContent(images, key) {
      // If already prepared for this content, skip
      if (currentPreparedFolder === key) return;
      currentPreparedFolder = key;

      sphereItems = []; // Reset active items array
      
      // Calculate radius based on viewport (responsive)
      const viewportMin = Math.min(window.innerWidth, window.innerHeight);
      
      // Default settings (Mobile)
      let radiusMultiplier = 0.4;
      let maxRadius = 300;

      // Tablets and Desktop (> 768px): Increase radius by 25%
      if (window.innerWidth > 768) {
          radiusMultiplier = 0.5; // 0.4 * 1.25
          maxRadius = 375;        // 300 * 1.25
      }

      currentRadius = Math.min(viewportMin * radiusMultiplier, maxRadius); 

      images.forEach((src, i) => {
        if (i >= MAX_POOL_SIZE) return; // Safety check
        
        const poolItem = itemPool[i];
        const { element, img, overlay } = poolItem;
        
        // Update content if changed
        if (!img.src.endsWith(src)) {
            img.src = src;
            img.alt = `Session image ${i+1}`;
        }
        
        // Show item using visibility
        element.style.visibility = 'visible';
        
        // Fibonacci Sphere Algorithm
        const phi = Math.acos(-1 + (2 * i) / images.length); 
        const theta = Math.sqrt(images.length * Math.PI) * phi;
        
        const y = currentRadius * Math.cos(phi);
        const radiusAtY = currentRadius * Math.sin(phi);
        const x = radiusAtY * Math.cos(theta);
        const z = radiusAtY * Math.sin(theta);
        
        sphereItems.push({ 
          element: element, 
          overlay: overlay,
          x, y, z 
        });
        
        // Calculate normalized Z for depth effects (0 = back, 1 = front)
        const normalizedZ = (z + currentRadius) / (2 * currentRadius);
        const clampedZ = Math.max(0, Math.min(1, normalizedZ));
        
        // Calculate Scale
        // Base scale 0.5 (Supersampling). 
        // Add up to 50% extra scale (0.25) for front items on ALL devices
        let scale = 0.5 + (clampedZ * 0.25);

        // Initial transform
        element.style.transform = `translate3d(${x}px, ${y}px, ${z}px) scale(${scale.toFixed(3)})`;
        
        // Calculate initial opacity for shadow overlay based on Z depth
        if (overlay) {
            // Invert so 1 (front) -> 0 opacity, 0 (back) -> 0.6 opacity
            const opacity = (1 - clampedZ) * 0.6;
            overlay.style.opacity = opacity.toFixed(2);
        }
      });
      
      // Hide unused pool items
      for (let i = images.length; i < MAX_POOL_SIZE; i++) {
          itemPool[i].element.style.visibility = 'hidden';
      }
  }

  function open(portfolioItem) {
    // Cleanup any pending close operations or clones
    if (closeTimeout) {
        clearTimeout(closeTimeout);
        closeTimeout = null;
    }
    if (activeClone) {
        activeClone.remove();
        activeClone = null;
    }

    activePortfolioItem = portfolioItem;
    
    // Get folder and count from data attributes
    const folder = portfolioItem.dataset.folder;
    const count = parseInt(portfolioItem.dataset.count, 10);
    
    if (!folder || !count) return; // Safety check
    
    let images = [];
    
    // Generate image paths from the folder
    for (let i = 1; i <= count; i++) {
      images.push(`${folder}/${i}.jpg`);
    }
    
    // Check if we are re-opening the same content
    // If so, we want to preserve the rotation state
    const isSameContent = currentPreparedFolder === folder;
    
    // Ensure sphere is prepared (in case hover didn't happen or was interrupted)
    prepareSphereContent(images, folder);

    // Reset rotation ONLY if content changed
    if (!isSameContent) {
        currentMatrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    }
    
    velocityX = 0;
    velocityY = 0;
    sphere.style.transform = `none`;

    // OPTIMIZATION: Removed forced reflow (void sphere.offsetWidth)
    // It was causing a synchronous layout flush which delayed the open animation

    // Start animation loop if not running
    if (!animationFrame) {
        animate();
    }

    // Show modal
    requestAnimationFrame(() => {
        modal.classList.add('is-visible');
        modal.setAttribute('aria-hidden', 'false');
        
        // Handle scrollbar shift
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
        document.body.style.overflow = 'hidden';
    });
  }

  function close(immediate = false) {
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    
    // Stop animation loop to save resources
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    
    if (immediate) {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        activePortfolioItem = null;
    } else {
        // Wait for transition
        closeTimeout = setTimeout(() => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            activePortfolioItem = null;
            closeTimeout = null;
        }, 400);
    }
  }

  function selectImage(src, sphereItemElement) {
    if (!activePortfolioItem) return;

    // 1. Capture start state
    const startRect = sphereItemElement.getBoundingClientRect();
    const itemToUpdate = activePortfolioItem; // Save reference
    const targetImg = itemToUpdate.querySelector('.portfolio-item__image');
    
    // 2. Create Clone
    const clone = document.createElement('div');
    activeClone = clone; // Store reference
    clone.style.position = 'fixed';
    clone.style.left = `${startRect.left}px`;
    clone.style.top = `${startRect.top}px`;
    clone.style.width = `${startRect.width}px`;
    clone.style.height = `${startRect.height}px`;
    clone.style.backgroundImage = `url(${src})`;
    clone.style.backgroundSize = 'cover';
    clone.style.backgroundPosition = 'center'; // Ensure center alignment
    clone.style.borderRadius = '4px';
    clone.style.zIndex = '9999';
    clone.style.transition = 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';
    clone.style.transformOrigin = 'center';
    clone.style.boxShadow = '0 20px 50px rgba(0,0,0,0.5)';
    
    document.body.appendChild(clone);
    
    // 3. Close Modal (starts fade out)
    // We pass false to delay overflow reset, keeping layout stable during animation
    close(false);
    
    // 4. Animate to Target
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // Calculate target position
            // Since we haven't reset overflow yet, the page layout is stable (no scrollbar)
            // But the target might be off-screen?
            // We can try to scroll it into view now?
            // If we scroll, we change positions.
            // Let's assume it's visible enough or just animate to where it is.
            
            const targetRect = targetImg.getBoundingClientRect();
            
            clone.style.left = `${targetRect.left}px`;
            clone.style.top = `${targetRect.top}px`;
            clone.style.width = `${targetRect.width}px`;
            clone.style.height = `${targetRect.height}px`;
            clone.style.borderRadius = '0px';
            clone.style.boxShadow = 'none';
            
            // 5. Update Source
            // Preload to ensure no flicker
            const imgLoader = new Image();
            imgLoader.src = src;
            imgLoader.onload = () => {
                targetImg.src = src;
                if (targetImg.hasAttribute('srcset')) {
                    targetImg.removeAttribute('srcset');
                }
            };
            
            // 6. Cleanup
            setTimeout(() => {
                clone.style.opacity = '0';
                
                // Scroll into view centered (now that animation is done)
                // This might cause a shift if it wasn't centered, but it's the requested behavior
                itemToUpdate.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                setTimeout(() => {
                    if (clone === activeClone) activeClone = null;
                    clone.remove();
                }, 300);
            }, 600);
        });
    });
  }

  // --- Interaction Logic ---
  
  let isTouchInteraction = false;
  let isFirstMove = false;

  function handleDragStart(e) {
    // Don't start drag if clicking close button
    if (e.target.closest('.sphere-close-btn')) return;
    
    // Handle Touch/Mouse conflict
    if (e.type.includes('touch')) {
        isTouchInteraction = true;
    } else if (isTouchInteraction) {
        // Ignore mouse events if we are in a touch interaction
        return;
    }

    isDragging = true;
    hasDragged = false; // Reset drag flag
    isFirstMove = true; // Flag to sync coordinates on first move
    
    // We still capture startX/Y here for fallback, but isFirstMove will override it
    startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    // Stop any inertia
    modal.style.cursor = 'grabbing';
    
    // Reset velocity to prevent "slipping" or jumps if catching a moving sphere
    velocityX = 0;
    velocityY = 0;
  }

  function handleDragMove(e) {
    if (!isDragging) return;
    
    // Handle Touch/Mouse conflict
    if (e.type.includes('touch')) {
        isTouchInteraction = true;
    } else if (isTouchInteraction) {
        return;
    }

    e.preventDefault(); // Prevent scrolling on touch

    const x = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const y = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

    // Sync coordinates on first move to prevent jumps
    if (isFirstMove) {
        isFirstMove = false;
        startX = x;
        startY = y;
        return;
    }

    const deltaX = x - startX;
    const deltaY = y - startY;
    
    // Check if moved enough to consider it a drag (threshold of 3px)
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasDragged = true;
    }

    // Safety: Clamp delta to prevent massive jumps (e.g. if browser hiccups or focus changes)
    // Increased to 300px to allow fast swipes, but prevent "teleportation"
    if (Math.abs(deltaX) > 300 || Math.abs(deltaY) > 300) {
        startX = x;
        startY = y;
        return;
    }

    // Update velocity based on drag
    // Calculate sensitivity to match 1:1 movement (Arc Length formula: s = r * theta)
    // theta (rad) = s / r  ->  theta (deg) = (s / r) * (180 / PI)
    // Safety: Ensure currentRadius is valid
    const safeRadius = currentRadius || 500;
    let sensitivity = (180 / (Math.PI * safeRadius));
    
    // Removed reduction factors to make drag feel 1:1 and responsive
    
    // Calculate rotation for this specific move event
    const dRotY = deltaX * sensitivity;
    const dRotX = -deltaY * sensitivity;
    
    // Apply rotation immediately to matrix (Direct Manipulation)
    // This prevents "jumps" caused by frame-rate mismatches in the animation loop
    applyRotation(dRotX, dRotY);
    
    // Store velocity for inertia (when drag ends)
    velocityX = deltaX * sensitivity;
    velocityY = -deltaY * sensitivity;

    startX = x;
    startY = y;
  }

  function handleDragEnd(e) {
    isDragging = false;
    modal.style.cursor = 'grab';
    
    // Clear touch flag after a delay to prevent ghost clicks/mouse events
    if (e.type.includes('touch')) {
        setTimeout(() => {
            isTouchInteraction = false;
        }, 500);
    }
  }
  
  // Helper to apply rotation to the current matrix
  function applyRotation(rotX, rotY) {
    // Rotation around Y axis (horizontal drag)
    const radY = rotY * Math.PI / 180; 
    const sinY = Math.sin(radY);
    const cosY = Math.cos(radY);
    
    // Rotation around X axis (vertical drag)
    const radX = rotX * Math.PI / 180; 
    const sinX = Math.sin(radX);
    const cosX = Math.cos(radX);

    // Apply rotations to current matrix
    // We apply Y rotation then X rotation relative to screen space
    
    // 1. Apply Y rotation
    let m = currentMatrix;
    let m2 = [0,0,0, 0,0,0, 0,0,0];
    
    // Row 0
    m2[0] = cosY * m[0] + sinY * m[6];
    m2[1] = cosY * m[1] + sinY * m[7];
    m2[2] = cosY * m[2] + sinY * m[8];
    // Row 1 (unchanged by Y rot)
    m2[3] = m[3];
    m2[4] = m[4];
    m2[5] = m[5];
    // Row 2
    m2[6] = -sinY * m[0] + cosY * m[6];
    m2[7] = -sinY * m[1] + cosY * m[7];
    m2[8] = -sinY * m[2] + cosY * m[8];
    
    m = m2;
    m2 = [0,0,0, 0,0,0, 0,0,0];

    // 2. Apply X rotation
    // Row 0 (unchanged by X rot)
    m2[0] = m[0];
    m2[1] = m[1];
    m2[2] = m[2];
    // Row 1
    m2[3] = cosX * m[3] - sinX * m[6];
    m2[4] = cosX * m[4] - sinX * m[7];
    m2[5] = cosX * m[5] - sinX * m[8];
    // Row 2
    m2[6] = sinX * m[3] + cosX * m[6];
    m2[7] = sinX * m[4] + cosX * m[7];
    m2[8] = sinX * m[5] + cosX * m[8];
    
    currentMatrix = m2;
  }

  function animate() {
    // Apply friction to velocity
    if (!isDragging) {
      velocityX *= 0.95;
      velocityY *= 0.95;
      
      // Apply inertia rotation
      // Note: velocityX/Y are already in "degrees per frame" units from handleDragMove
      // But we need to be careful about signs.
      // In handleDragMove: dRotY = -deltaX * sensitivity
      // velocityX = -deltaX * sensitivity
      // So we pass velocityX directly as rotY
      
      // In handleDragMove: dRotX = -deltaY * sensitivity
      // velocityY = -deltaY * sensitivity
      // So we pass velocityY directly as rotX
      
      // Only apply if significant
      if (Math.abs(velocityX) > 0.01 || Math.abs(velocityY) > 0.01) {
          applyRotation(velocityY, velocityX);
      }
    }

    // Stop if velocity is negligible AND not dragging
    if (!isDragging && Math.abs(velocityX) < 0.01 && Math.abs(velocityY) < 0.01) {
        animationFrame = requestAnimationFrame(animate);
        return;
    }

    // Update each item's position
    if (sphereItems.length > 0) {
      sphereItems.forEach(item => {
        // Transform original point by current matrix
        // v_new = M * v_orig
        const x = item.x;
        const y = item.y;
        const z = item.z;
        
        const x2 = currentMatrix[0] * x + currentMatrix[1] * y + currentMatrix[2] * z;
        const y2 = currentMatrix[3] * x + currentMatrix[4] * y + currentMatrix[5] * z;
        const z2 = currentMatrix[6] * x + currentMatrix[7] * y + currentMatrix[8] * z;

        // Calculate normalized Z for depth effects (0 = back, 1 = front)
        const normalizedZ = (z2 + currentRadius) / (2 * currentRadius);
        const clampedZ = Math.max(0, Math.min(1, normalizedZ));

        // Calculate Scale
        // Base scale 0.5 (Supersampling). 
        // Add up to 50% extra scale (0.25) for front items on ALL devices
        // This creates a nice "focus" effect and fixes mobile sizing issues
        let scale = 0.5 + (clampedZ * 0.25);

        // Apply translation and scale
        item.element.style.transform = `translate3d(${x2.toFixed(2)}px, ${y2.toFixed(2)}px, ${z2.toFixed(2)}px) scale(${scale.toFixed(3)})`;
        
        // Calculate opacity for shadow overlay based on Z depth
        if (item.overlay) {
            // Invert so 1 (front) -> 0 opacity, 0 (back) -> 0.6 opacity
            const opacity = (1 - clampedZ) * 0.6;
            item.overlay.style.opacity = opacity.toFixed(2);
        }
      });
    }
    
    animationFrame = requestAnimationFrame(animate);
  }

  // Public API
  return {
    init
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', SphereGallery.init);
