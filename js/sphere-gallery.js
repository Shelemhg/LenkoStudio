/**
 * Sphere 3D Gallery
 * Handles the interactive 3D sphere modal for portfolio sessions
 */

window.SphereGallery = (() => {
  // DOM Elements
  let modal, sphere;
  let activePortfolioItem = null;
  let lastFocusedElement = null;
  let initialized = false;

  // Listener refs for cleanup under PJAX.
  let onDocMouseMove = null;
  let onDocMouseUp = null;
  let onDocTouchMove = null;
  let onDocTouchEnd = null;
  let onDocKeyDown = null;
  
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
  let lastOpenedFolder = null; // Track last opened folder to handle rotation resets correctly
  
  // Cache for preloaded images
  const preloadedFolders = new Set();
  // Keep references to prevent Garbage Collection of preloading images
  const imageCache = [];

  // Persist selected cover images across refreshes.
  const COVER_STORAGE_KEY = 'portfolioCoverSelections';

  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  function readCoverSelections() {
    try {
      const raw = storageGet(COVER_STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return {};
      }
      return parsed;
    } catch {
      return {};
    }
  }

  function writeCoverSelections(map) {
    try {
      storageSet(COVER_STORAGE_KEY, JSON.stringify(map || {}));
    } catch {
      // ignore
    }
  }

  function normalizeCoverSrc(folder, src) {
    if (!src || !folder) {
      return src;
    }

    // Prefer storing a stable, relative path (e.g. media/portfolio/Fashion/3.jpg)
    try {
      const url = new URL(src, window.location.href);
      const path = String(url.pathname || '').replace(/^\/+/, '');
      const token = `${folder}/`;
      const idx = path.indexOf(token);
      if (idx >= 0) {
        return path.slice(idx);
      }
      return path;
    } catch {
      const token = `${folder}/`;
      const idx = String(src).indexOf(token);
      if (idx >= 0) {
        return String(src).slice(idx);
      }
      return src;
    }
  }

  function setCoverSelection(folder, src) {
    const map = readCoverSelections();
    map[folder] = normalizeCoverSrc(folder, src);
    writeCoverSelections(map);
  }

  function applyStoredCovers(root = document) {
    const map = readCoverSelections();
    root.querySelectorAll('.portfolio-item[data-folder]').forEach((item) => {
      const folder = item.dataset.folder;
      if (!folder) {
        return;
      }

      const stored = map[folder];
      if (!stored) {
        return;
      }

      const img = item.querySelector('.portfolio-item__image');
      if (!img) {
        return;
      }

      img.src = stored;
      if (img.hasAttribute('srcset')) {
        img.removeAttribute('srcset');
      }
    });
  }

  function resetCovers(root = document) {
    storageRemove(COVER_STORAGE_KEY);

    root.querySelectorAll('.portfolio-item[data-folder]').forEach((item) => {
      const folder = item.dataset.folder;
      if (!folder) {
        return;
      }

      const img = item.querySelector('.portfolio-item__image');
      if (!img) {
        return;
      }

      img.src = `${folder}/1.jpg`;
      if (img.hasAttribute('srcset')) {
        img.removeAttribute('srcset');
      }
    });
  }

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
    // Idempotency: this module can be called multiple times under PJAX.
    if (initialized) {
      refresh();
      return;
    }
    initialized = true;

    // Create Modal HTML if it doesn't exist
    if (!document.getElementById('sphere-modal')) {
      const modalHTML = `
        <div
          id="sphere-modal"
          class="sphere-modal"
          role="dialog"
          aria-modal="true"
          aria-hidden="true"
          aria-labelledby="sphere-title"
        >
          <h2 id="sphere-title" class="sr-only">Portfolio gallery</h2>
          <button class="sphere-close-btn" type="button" aria-label="Close gallery">&times;</button>
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
      item.setAttribute('tabindex', '-1');
      item.setAttribute('role', 'button');
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
        
        // Add click/keyboard listeners once
        item.addEventListener('click', (e) => {
             e.stopPropagation();
             if (!isDragging && !hasDragged) {
                 // Get current src from the img element
                 const currentSrc = item.querySelector('img').src;
                 if (currentSrc) selectImage(currentSrc, item);
             }
        });

        item.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') {
            return;
          }

          e.preventDefault();
          e.stopPropagation();

          if (!isDragging && !hasDragged) {
            const currentSrc = item.querySelector('img').src;
            if (currentSrc) selectImage(currentSrc, item);
          }
        });
        
        fragment.appendChild(item);
    }
    sphere.appendChild(fragment);

    // Event Listeners
    closeBtn.addEventListener('click', () => close());
    
    // Drag Rotation Logic
    modal.addEventListener('mousedown', handleDragStart);
    onDocMouseMove = handleDragMove;
    onDocMouseUp = handleDragEnd;
    document.addEventListener('mousemove', onDocMouseMove);
    document.addEventListener('mouseup', onDocMouseUp);
    
    // Touch support
    modal.addEventListener('touchstart', handleDragStart, { passive: false });
    onDocTouchMove = handleDragMove;
    onDocTouchEnd = handleDragEnd;
    document.addEventListener('touchmove', onDocTouchMove, { passive: false });
    document.addEventListener('touchend', onDocTouchEnd);

    // Keyboard support for the modal dialog.
    // - Escape closes
    // - Tab is trapped inside
    onDocKeyDown = (event) => {
      if (!modal || !modal.classList.contains('is-visible')) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      // Focus trap: cycle focus within the modal.
      const focusables = Array.from(
        modal.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"]), input, select, textarea')
      ).filter((el) => {
        const disabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
        return !disabled && el.offsetParent !== null;
      });

      if (focusables.length === 0) {
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !modal.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onDocKeyDown);

    // Bind (or re-bind) portfolio items now and on every PJAX swap.
    refresh();

    // Animation loop is started in open()
  }

  /**
   * Refresh bindings against the current DOM.
   * This is required after PJAX replaces `#main`.
   */
  function refresh() {
    // Restore any persisted cover selections.
    applyStoredCovers(document);

    // Bind reset button once (portfolio page only).
    const resetBtn = document.getElementById('resetPictures');
    if (resetBtn && resetBtn.dataset.bound !== 'true') {
      resetBtn.dataset.bound = 'true';
      resetBtn.addEventListener('click', () => {
        resetCovers(document);
      });
    }

    // Portfolio items exist on the portfolio page only.
    document.querySelectorAll('.portfolio-item[data-folder]').forEach((item) => {
      if (item.dataset.sphereBound === 'true') {
        return;
      }

      item.dataset.sphereBound = 'true';

      // Preload a small subset on hover/focus for snappy open without saturating bandwidth.
      const warmup = () => {
        const folder = item.dataset.folder;
        const count = parseInt(item.dataset.count, 10);

        if (!folder || !count) {
          return;
        }

        // Only warm up the first few assets; full set loads on demand.
        const warmCount = Math.min(count, 6);
        preloadImages(folder, warmCount);

        // Speculatively prepare the sphere content using the warm subset.
        const images = [];
        for (let i = 1; i <= warmCount; i++) {
          images.push(`${folder}/${i}.jpg`);
        }
        prepareSphereContent(images, folder);
      };

      item.addEventListener('mouseenter', warmup);
      item.addEventListener('focusin', warmup);

      item.addEventListener('click', (e) => {
        if (e.target && (e.target.tagName === 'A' || e.target.tagName === 'BUTTON')) {
          return;
        }

        open(item);
      });

      item.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') {
          return;
        }

        e.preventDefault();
        open(item);
      });
    });
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
            
            // Reset classes
            element.classList.remove('sphere-item--landscape');
            
            // Check orientation when loaded
            img.onload = () => {
                if (img.naturalWidth > img.naturalHeight) {
                    element.classList.add('sphere-item--landscape');
                }
            };
        } else {
            // If src didn't change, we still need to ensure class is correct
            // (e.g. if it was reused from a different orientation)
            if (img.naturalWidth > img.naturalHeight) {
                element.classList.add('sphere-item--landscape');
            } else {
                element.classList.remove('sphere-item--landscape');
            }
        }
        
        // Show item using visibility
        element.style.visibility = 'visible';
        element.setAttribute('tabindex', '0');
        
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
        // Mobile/Desktop adaptive: smaller back for depth, compensate for higher res on mobile
        // Desktop: 0.125 to 0.3 range | Mobile: 0.0835 to 0.2 range (maintains visual size at 2x resolution)
        const isMobile = window.innerWidth <= 768;
        const baseScale = isMobile ? 0.0835 : 0.125;
        const scaleRange = isMobile ? 0.1165 : 0.175;
        let scale = baseScale + (clampedZ * scaleRange);

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
          itemPool[i].element.setAttribute('tabindex', '-1');
      }
  }

  function open(portfolioItem) {
    lastFocusedElement = document.activeElement;

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
    // We check against lastOpenedFolder, NOT currentPreparedFolder
    // because currentPreparedFolder might have been updated by a hover/touch event just before click
    const isSameContent = lastOpenedFolder === folder;
    lastOpenedFolder = folder;
    
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

        // Accessibility: move focus into the dialog.
        const closeBtn = modal.querySelector('.sphere-close-btn');
        if (closeBtn && typeof closeBtn.focus === 'function') {
          closeBtn.focus();
        }
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

      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      }
      lastFocusedElement = null;
    } else {
        // Wait for transition
        closeTimeout = setTimeout(() => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            activePortfolioItem = null;
            closeTimeout = null;

            if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
              lastFocusedElement.focus();
            }
            lastFocusedElement = null;
        }, 400);
    }
  }

  function selectImage(src, sphereItemElement) {
    if (!activePortfolioItem) return;

    // Persist the selected cover so refresh keeps the same image.
    try {
      const folder = activePortfolioItem.dataset.folder;
      if (folder) {
        setCoverSelection(folder, src);
      }
    } catch {
      // ignore
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Capture start state
    const startRect = sphereItemElement.getBoundingClientRect();
    const itemToUpdate = activePortfolioItem; // Save reference
    const targetImg = itemToUpdate.querySelector('.portfolio-item__image');
    
    // Reduced motion: do not animate. Just apply and close.
    if (prefersReducedMotion) {
      const targetImg = activePortfolioItem.querySelector('.portfolio-item__image');
      if (targetImg) {
        targetImg.src = src;
        if (targetImg.hasAttribute('srcset')) {
          targetImg.removeAttribute('srcset');
        }
      }

      close(true);
      activePortfolioItem.scrollIntoView({ behavior: 'auto', block: 'center' });
      return;
    }

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
    // BUT we override this immediately below to force scroll.
    close(false);

    // 3b. FORCE IMMEDIATE SCROLL
    // We must unlock the body to allow scrolling.
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    // Calculate the center position.
    // We want the portfolio item to be centered in the viewport.
    const itemRect = itemToUpdate.getBoundingClientRect(); // This is relative to viewport currently (before scroll)
    const absoluteTop = itemRect.top + window.scrollY;
    const viewportHeight = window.innerHeight;
    
    // Center the item:
    const centeredScrollY = absoluteTop - (viewportHeight / 2) + (itemRect.height / 2);
    
    window.scrollTo({
        top: centeredScrollY,
        behavior: 'auto' // Instant
    });

    // FORCE PARALLAX UPDATE
    // The scroll changed the position, so the parallax transform needs to update 
    // to match the new "centered" state. Otherwise the image rect we measure 
    // next will be based on the OLD transform (from before the scroll).
    if (window.PortfolioParallax && typeof window.PortfolioParallax.refresh === 'function') {
        window.PortfolioParallax.refresh();
    }
    
    // 4. Animate to Target
    // We use double RAF to ensure the scroll has painted and any scroll-triggered 
    // parallax updates (if any) have had a chance to run.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // Now that scroll is settled, measure target position.
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
    // Keep the animation loop alive while the modal is open so direct-manipulation
    // rotations (dragging) always render immediately.
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
        // Mobile/Desktop adaptive: smaller back for depth, compensate for higher res on mobile
        // Desktop: 0.125 to 0.3 range | Mobile: 0.0835 to 0.2 range (maintains visual size at 2x resolution)
        // This creates a nice "focus" effect and fixes mobile sizing issues
        const isMobile = window.innerWidth <= 768;
        const baseScale = isMobile ? 0.0835 : 0.125;
        const scaleRange = isMobile ? 0.1165 : 0.175;
        let scale = baseScale + (clampedZ * scaleRange);

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
  function destroy() {
    try {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    } catch {
      // ignore
    }

    try {
      if (onDocMouseMove) document.removeEventListener('mousemove', onDocMouseMove);
      if (onDocMouseUp) document.removeEventListener('mouseup', onDocMouseUp);
      if (onDocTouchMove) document.removeEventListener('touchmove', onDocTouchMove);
      if (onDocTouchEnd) document.removeEventListener('touchend', onDocTouchEnd);
      if (onDocKeyDown) document.removeEventListener('keydown', onDocKeyDown);
    } catch {
      // ignore
    }

    onDocMouseMove = null;
    onDocMouseUp = null;
    onDocTouchMove = null;
    onDocTouchEnd = null;
    onDocKeyDown = null;

    activePortfolioItem = null;
    lastFocusedElement = null;

    // Allow re-init if the script is re-injected.
    initialized = false;
  }

  return {
    init,
    refresh,
    destroy
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', SphereGallery.init);
