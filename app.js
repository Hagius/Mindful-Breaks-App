/**
 * Hagius Active Journey App
 * Optimized JavaScript with improved performance, error handling, and organization
 */

// Immediately-invoked function expression (IIFE) to encapsulate our code
(function() {
  // CONSTANTS
  const AUDIO_SOURCES = {
    timer: 'sounds/timer-tick.mp3',
    complete: 'sounds/exercise-complete.mp3',
    transition: 'sounds/transition.mp3'
  };
  
  // HAPTIC PATTERNS (milliseconds)
  const HAPTIC_PATTERNS = {
    timerComplete: [100, 50, 100],
    exerciseStart: [50],
    exerciseComplete: [200],
    sessionComplete: [100, 100, 100, 100, 300]
  };
  
  // Default config values
  const DEFAULTS = {
    WORK_DURATION: 45 * 60, // 45 minutes in seconds
    EXERCISE_DURATION: 60,   // 1 minute per exercise
    MAX_EXERCISES: 5         // Maximum exercises per session
  };
  
  // For testing, uncomment these lines to use shorter durations:
  // const DEFAULTS = {
  //   WORK_DURATION: 15, // 15 seconds for testing
  //   EXERCISE_DURATION: 10,   // 10 seconds per exercise for testing
  //   MAX_EXERCISES: 2         // Fewer exercises for testing
  // };
  
  // APP STATE
  const state = {
    // Timer state
    timerRemaining: DEFAULTS.WORK_DURATION,
    timerInterval: null,
    timerIsPaused: false,
    
    // Exercise state
    currentExerciseIndex: 0,
    exerciseSegments: [],
    exerciseRemaining: 0,
    exerciseInterval: null,
    completedExercises: [],
    isPaused: false,
    
    // UI state
    currentPage: 'landingPage',
    isAudioReady: false,
    isVibrationSupported: 'vibrate' in navigator,
    hapticEnabled: true,
    isVisible: true,
    elements: {},
    loadedResources: {
      audio: false,
      dom: false,
      images: false
    },
    hasInteracted: false
  };
  
  // Exercise pool (8 total)
  const exercisesPool = [
    {
      name: "Single-Leg Balance w/ Toe Taps",
      description: "Improve balance & ankle stability",
      unilateral: true,
      image: "https://furthermore-cdn.equinox.com/2016/10/long-weekend-workout-warmup/warmup01.gif",
      probability: 1
    },
    {
      name: "Standing Hip Circles",
      description: "Loosen tight hips & improve joint mobility",
      unilateral: false,
      image: "https://furthermore-cdn.equinox.com/2016/10/long-weekend-workout-warmup/warmup01.gif",
      probability: 1
    },
    {
      name: "Neck Tilts & Rotations",
      description: "Release neck tension from prolonged sitting",
      unilateral: false,
      image: "https://furthermore-cdn.equinox.com/2016/10/long-weekend-workout-warmup/warmup01.gif",
      probability: 1
    },
    {
      name: "Shoulder Rolls",
      description: "Reduce shoulder stiffness & enhance posture",
      unilateral: false,
      image: "https://furthermore-cdn.equinox.com/2016/10/long-weekend-workout-warmup/warmup01.gif",
      probability: 1
    },
    {
      name: "Standing Figure-4 Stretch",
      description: "Open up hips & glutes to counter desk posture",
      unilateral: true,
      image: "https://furthermore-cdn.equinox.com/2016/10/long-weekend-workout-warmup/warmup01.gif",
      probability: 1
    },
    {
      name: "Wall Angels",
      description: "Promote better shoulder alignment & mobility",
      unilateral: false,
      image: "https://furthermore-cdn.equinox.com/2016/10/long-weekend-workout-warmup/warmup01.gif",
      probability: 1
    },
    {
      name: "Thoracic Extension",
      description: "Relieve mid-back tightness & improve upright posture",
      unilateral: false,
      image: "https://furthermore-cdn.equinox.com/2016/10/long-weekend-workout-warmup/warmup01.gif",
      probability: 1
    },
    {
      name: "Standing Lateral Leg Raises",
      description: "Strengthen hip abductors & improve balance",
      unilateral: true,
      image: "https://furthermore-cdn.equinox.com/2016/10/long-weekend-workout-warmup/warmup01.gif",
      probability: 1
    }
  ];
  
  // UTILITY FUNCTIONS
  const utils = {
    /**
     * Shows a toast notification
     * @param {string} message - Message to display
     * @param {number} duration - How long to show in ms
     */
    showToast: (message, duration = 3000) => {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      
      state.elements.toastContainer.appendChild(toast);
      
      // Force reflow to enable transition
      void toast.offsetWidth;
      toast.classList.add('visible');
      
      setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => {
          toast.remove();
        }, 300); // Match transition duration
      }, duration);
    },
    
    /**
     * Format seconds into MM:SS display
     * @param {number} seconds - Seconds to format
     * @return {string} Formatted time string
     */
    formatTime: (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
    },
    
    /**
     * Helper to safely toggle aria attributes
     * @param {HTMLElement} element - The element to modify
     * @param {string} attribute - The aria attribute to toggle
     * @param {boolean} value - The value to set
     */
    setAriaState: (element, attribute, value) => {
      if (element) {
        element.setAttribute(attribute, value.toString());
      }
    },
    
    /**
     * Shuffle array in place using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle
     * @return {Array} The shuffled array
     */
    shuffle: (array) => {
      const newArray = [...array]; // Create a copy to avoid modifying original
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    },
    
    /**
     * Show a specific page and hide others
     * @param {string} pageId - ID of the page to show
     */
    showPage: (pageId) => {
      // Update state
      state.currentPage = pageId;
      
      // Hide all pages
      document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
      });
      
      // Show target page
      const targetPage = document.getElementById(pageId);
      if (targetPage) {
        targetPage.classList.add('active');
      }
      
      // Add landing-active class to body when on landing page, remove otherwise
      if (pageId === 'landingPage') {
        document.body.classList.add('landing-active');
      } else {
        document.body.classList.remove('landing-active');
      }

		// Add exercise-active class to body when on exercise page, remove otherwise
      if (pageId === 'exerciseSection') {
        document.body.classList.add('exercise-active');
      } else {
        document.body.classList.remove('exercise-active');
      }
		
      // Update button visibility based on current page
      updateButtonVisibility(pageId);
    },
    
    /**
     * Trigger haptic feedback if supported
     * @param {Array|number} pattern - Vibration pattern
     */
    triggerHaptic: (pattern) => {
      if (!state.isVibrationSupported || !state.hapticEnabled) return;
      
      try {
        if (pattern && (typeof pattern === 'number' || pattern.length > 0)) {
          const result = navigator.vibrate(pattern);
          if (result === false) {
            state.hapticEnabled = false;
            console.warn('Vibration failed - disabled');
          }
        }
      } catch (e) {
        console.warn('Haptic feedback error:', e);
        state.hapticEnabled = false;
      }
    },
    
    /**
     * Play audio with error handling
     * @param {string} audioType - Type of audio to play
     */
    playAudio: (audioType) => {
      if (!state.isAudioReady || !state.hasInteracted) return;
      
      try {
        let audioElement = null;
        
        switch(audioType) {
          case 'timer':
            audioElement = state.elements.audioTimer;
            break;
          case 'complete':
            audioElement = state.elements.audioComplete;
            break;
          case 'transition':
            audioElement = state.elements.audioTransition;
            break;
        }
        
        if (audioElement) {
          audioElement.currentTime = 0;
          
          const playPromise = audioElement.play();
          
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.warn('Audio playback prevented:', error);
            });
          }
        }
      } catch (e) {
        console.error('Audio play error:', e);
      }
    }
  };
  
  // Function to update button visibility based on the current page
  function updateButtonVisibility(pageId) {
    // Hide all buttons first
    const landingButtons = document.querySelectorAll('.landing-button');
    const timerButtons = document.querySelectorAll('.timer-button');
    const exerciseButtons = document.querySelectorAll('.exercise-button');
    const finishButtons = document.querySelectorAll('.finish-button');
    
    landingButtons.forEach(btn => btn.style.display = 'none');
    timerButtons.forEach(btn => btn.style.display = 'none');
    exerciseButtons.forEach(btn => btn.style.display = 'none');
    finishButtons.forEach(btn => btn.style.display = 'none');
    
    // Hide progress containers
    state.elements.timerProgressContainer.style.display = 'none';
    state.elements.exerciseProgressContainer.style.display = 'none';
    
    // Show relevant buttons based on current page
    switch(pageId) {
      case 'landingPage':
        landingButtons.forEach(btn => btn.style.display = 'block');
        break;
      case 'timerSection':
        timerButtons.forEach(btn => btn.style.display = 'block');
        state.elements.timerProgressContainer.style.display = 'block';
        break;
      case 'exerciseSection':
        exerciseButtons.forEach(btn => btn.style.display = 'block');
        state.elements.exerciseProgressContainer.style.display = 'block';
        break;
      case 'finishSection':
        finishButtons.forEach(btn => btn.style.display = 'block');
        break;
    }
  }
  
  // EVENT HANDLERS
  const handlers = {
    startApp: () => {
      utils.showPage('timerSection');
      startTimer();
      utils.showToast('Timer started. Get focused!');
    },
    
    openLearnMore: () => {
      handlers.showKnowledgeSection();
    },
    
    pauseTimer: () => {
      if (state.timerIsPaused) {
        // Resume the timer
        state.timerIsPaused = false;
        state.elements.pauseTimerButton.textContent = 'Pause';
        
        // Start new interval
        state.timerInterval = setInterval(() => {
          state.timerRemaining--;
          updateTimerDisplay();
          
          // Update progress bar
          const percentRemaining = (state.timerRemaining / DEFAULTS.WORK_DURATION) * 100;
          state.elements.timerProgress.style.width = percentRemaining + "%";
          
          // Play a tick sound every minute (or when 1 minute remains)
          if (state.timerRemaining > 0 && 
              (state.timerRemaining % 60 === 0 || state.timerRemaining === 60)) {
            utils.playAudio('timer');
          }
          
          if (state.timerRemaining <= 0) {
            clearInterval(state.timerInterval);
            utils.playAudio('complete');
            utils.triggerHaptic(HAPTIC_PATTERNS.timerComplete);
            goToExercises();
          }
        }, 1000);
        
        utils.showToast('Timer resumed');
      } else {
        // Pause the timer
        clearInterval(state.timerInterval);
        state.timerIsPaused = true;
        state.elements.pauseTimerButton.textContent = 'Resume';
        utils.showToast('Timer paused');
      }
    },
    
    startTimer: () => {
      // Single purpose - always acts as skip button
      clearInterval(state.timerInterval);
      goToExercises();
      utils.showToast('Starting exercises now');
    },
    
    pauseExercise: () => {
      if (state.isPaused) {
        // Resume the exercise
        state.isPaused = false;
        state.elements.pauseExerciseButton.textContent = 'Pause';
        
        // Start new interval
        state.exerciseInterval = setInterval(() => {
          state.exerciseRemaining--;
          updateExerciseTimer();
          
          // Update progress bar
          const percentRemaining = (state.exerciseRemaining / DEFAULTS.EXERCISE_DURATION) * 100;
          state.elements.exerciseProgress.style.width = percentRemaining + "%";
          
          if (state.exerciseRemaining <= 0) {
            clearInterval(state.exerciseInterval);
            
            // Play completion sound
            utils.playAudio('complete');
            utils.triggerHaptic(HAPTIC_PATTERNS.exerciseComplete);
            
            // Mark as done + add to completed
            const current = state.exerciseSegments[state.currentExerciseIndex];
            current.status = "done";
            state.completedExercises.push({
              name: current.name,
              side: current.side,
              description: current.description,
              tag: "nothing"
            });
            
            // Move to next exercise
            state.currentExerciseIndex++;
            startExerciseSegment();
          }
        }, 1000);
        
        utils.showToast('Exercise resumed');
      } else {
        // Pause the exercise
        clearInterval(state.exerciseInterval);
        state.isPaused = true;
        state.elements.pauseExerciseButton.textContent = 'Resume';
        utils.showToast('Exercise paused');
      }
    },
    
    skipExercise: () => {
      clearInterval(state.exerciseInterval);
      state.isPaused = false;
      
      const current = state.exerciseSegments[state.currentExerciseIndex];
      current.status = "done";
      state.completedExercises.push({
        name: current.name,
        side: current.side,
        description: current.description,
        tag: "nothing"
      });
      
      state.currentExerciseIndex++;
      startExerciseSegment();
    },
    
    finishAndRestart: () => {
      utils.showPage('timerSection');
      startTimer();
      utils.showToast('Great job! Starting next work session');
    },
    
    cycleTag: (li) => {
      const idx = parseInt(li.getAttribute('data-index'));
      const currentTag = li.getAttribute('data-tag');
      let nextTag;
      
      // Cycle through: "nothing" -> "more" -> "less" -> "nothing"
      if (currentTag === "nothing") {
        nextTag = "more";
      } else if (currentTag === "more") {
        nextTag = "less";
      } else {
        nextTag = "nothing";
      }
      
      // Update element
      li.setAttribute('data-tag', nextTag);
      
      // Update UI
      const baseText = state.completedExercises[idx].name +
        (state.completedExercises[idx].side ? ` (${state.completedExercises[idx].side})` : "");
      
      li.textContent = (nextTag !== "nothing")
        ? `${baseText} [${nextTag.toUpperCase()}]`
        : baseText;
        
      // Update probability in the pool
      const poolItem = exercisesPool.find(e => e.name === state.completedExercises[idx].name);
      if (poolItem) {
        if (nextTag === "more") {
          poolItem.probability = 2;
          utils.showToast(`You'll see more of ${poolItem.name}`);
        } else if (nextTag === "less") {
          poolItem.probability = 0.5;
          utils.showToast(`You'll see less of ${poolItem.name}`);
        } else {
          poolItem.probability = 1;
          utils.showToast(`Default frequency for ${poolItem.name}`);
        }
      }
      
      // Also update the stored tag
      state.completedExercises[idx].tag = nextTag;
    },
    
    showKnowledgeSection: () => {
      state.elements.knowledgeSection.style.display = 'block';
      state.elements.knowledgeSection.setAttribute('aria-hidden', 'false');
    },
    
    hideKnowledgeSection: () => {
      state.elements.knowledgeSection.style.display = 'none';
      state.elements.knowledgeSection.setAttribute('aria-hidden', 'true');
    },
    
    selectTechniqueInfo: (btn) => {
      // Remove active class from all buttons
      state.elements.techniqueBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      
      // Add active class to clicked button
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      
      // Hide all technique info divs
      document.querySelectorAll('.technique-info').forEach(div => {
        div.classList.remove('active');
      });
      
      // Show the selected technique info
      const techniqueId = btn.getAttribute('data-technique');
      const targetInfo = document.getElementById(`${techniqueId}-info`);
      if (targetInfo) {
        targetInfo.classList.add('active');
      }
    },
    
    handleVisibilityChange: () => {
      state.isVisible = document.visibilityState !== 'hidden';
      
      // When becoming visible again, ensure timers are accurate
      if (state.isVisible) {
        // Could implement more sophisticated time tracking here
      }
    },
    
    handleUserInteraction: () => {
      if (!state.hasInteracted) {
        state.hasInteracted = true;
        
        // Try to play all audio elements to satisfy user gesture requirement
        const audioElements = [
          state.elements.audioTimer,
          state.elements.audioComplete,
          state.elements.audioTransition
        ];
        
        audioElements.forEach(audio => {
          if (audio) {
            const promise = audio.play();
            if (promise !== undefined) {
              promise.then(() => {
                audio.pause();
                audio.currentTime = 0;
              }).catch(e => {
                // Still not allowed, will try again later
                console.log('Audio play blocked by browser policy:', e);
              });
            }
          }
        });
      }
    }
  };
  
  // CORE FUNCTIONS
  function cacheElements() {
    // Cache DOM elements for performance
    state.elements = {
      appContainer: document.getElementById('appContainer'),
      loadingContainer: document.getElementById('loadingContainer'),
      loadingBar: document.getElementById('loadingBar'),
      
      // Pages
      landingPage: document.getElementById('landingPage'),
      timerSection: document.getElementById('timerSection'),
      exerciseSection: document.getElementById('exerciseSection'),
      finishSection: document.getElementById('finishSection'),
      knowledgeSection: document.getElementById('knowledgeSection'),
      
      // Buttons
      startButton: document.getElementById('startButton'),
      learnMoreButton: document.getElementById('learnMoreButton'),
      pauseTimerButton: document.getElementById('pauseTimerButton'),
      startTimerButton: document.getElementById('startTimerButton'),
      pauseExerciseButton: document.getElementById('pauseExerciseButton'),
      skipExerciseButton: document.getElementById('skipExerciseButton'),
      restartButton: document.getElementById('restartButton'),
      backButton: document.getElementById('backButton'),
      
      // Timer elements
      timerProgressContainer: document.getElementById('timerProgressContainer'),
      timerProgress: document.getElementById('timerProgress'),
      timerRemaining: document.getElementById('timerRemaining'),
      
      // Exercise elements
      exerciseImage: document.getElementById('exerciseImage'),
      exerciseTitle: document.getElementById('exerciseTitle'),
      exerciseSubtitle: document.getElementById('exerciseSubtitle'),
      exerciseProgressContainer: document.getElementById('exerciseProgressContainer'),
      exerciseProgress: document.getElementById('exerciseProgress'),
      exerciseRemaining: document.getElementById('exerciseRemaining'),
      
      // Finish elements
      doneList: document.getElementById('doneList'),
      
      // Learn more
      techniqueBtns: document.querySelectorAll('.technique-btn'),
      
      // Audio
      audioTimer: document.getElementById('audioTimer'),
      audioComplete: document.getElementById('audioComplete'),
      audioTransition: document.getElementById('audioTransition'),
      
      // Notifications
      toastContainer: document.getElementById('toastContainer')
    };
    
    state.loadedResources.dom = true;
    checkAllResourcesLoaded();
  }
  
  function initializeAudio() {
    // Set audio sources
    const audioElements = [
      { element: state.elements.audioTimer, src: AUDIO_SOURCES.timer },
      { element: state.elements.audioComplete, src: AUDIO_SOURCES.complete },
      { element: state.elements.audioTransition, src: AUDIO_SOURCES.transition }
    ];
    
    // Calculate total loading steps
    const totalSteps = audioElements.length;
    let completedSteps = 0;
    
    // Update loading progress
    function updateLoadingProgress() {
      if (state.elements.loadingBar) {
        const progress = (completedSteps / totalSteps) * 100;
        state.elements.loadingBar.style.width = `${progress}%`;
      }
    }
    
    // Create a promise for each audio element
    const audioPromises = audioElements.map(({element, src}) => {
      return new Promise((resolve) => {
        if (!element) {
          completedSteps++;
          updateLoadingProgress();
          resolve();
          return;
        }
        
        // For debugging/development, use default audio if source doesn't exist
        element.src = src || 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAASAAAeMwAUFBQUFBQUFBQUFBQ+Pj4+Pj4+Pj4+Pj5SUlJSUlJSUlJSUlJSmZmZmZmZmZmZmZmZmc3Nzc3Nzc3Nzc3Nzc3N/////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7UGQAAADsAEhaKAAAAAgAILQAAAD0gnQlpRgAgAAA/QAAABEvU88tuVIEJlC5hglOmQIECBAgQZREZ/fn/nDweDi'+
          'eDmELkAgMWFjAhYIOh4Ph4Pf+fP/5w8Hw+GQ8Z/MEGCxYsMGFgUK0uHP/+cPB4Oh8Mh65QQGLCxgwsCBeHg9/5w//nDwfD4ZDxneUEBiwsYMLAg14eD3/nD/+cPB8PhkPGd5QQGLCxgwsCDXh4Pf+cP/5w8Hw+GQ8Z3lBAYsLGDCwINeHg9/5w//nDwfD4ZDxneUEBiwsYMLAg14eD3/nD/+cPB8PhkPGd5A==';
        
        // Handle successful loading
        element.addEventListener('canplaythrough', () => {
          completedSteps++;
          updateLoadingProgress();
          resolve();
        }, { once: true });
        
        // Handle errors but continue
        element.addEventListener('error', (e) => {
          console.warn(`Failed to load audio: ${src}`, e);
          completedSteps++;
          updateLoadingProgress();
          resolve(); // Resolve anyway to not block the app
        });
        
        // Handle timeout - don't wait forever
        setTimeout(() => {
          if (element.readyState < 4) {
            console.warn(`Audio load timeout: ${src}`);
            completedSteps++;
            updateLoadingProgress();
            resolve();
          }
        }, 5000);
      });
    });
    
    // Wait for all audio to load or timeout
    Promise.all(audioPromises)
      .then(() => {
        state.isAudioReady = true;
        state.loadedResources.audio = true;
        checkAllResourcesLoaded();
      })
      .catch(error => {
        console.error("Audio loading error:", error);
        // Continue anyway with potentially limited audio
        state.isAudioReady = false;
        state.loadedResources.audio = true; // Mark as "complete" even if failed
        checkAllResourcesLoaded();
      });
  }
  
  function preloadImages() {
    // Preload exercise images
    const images = exercisesPool.map(exercise => exercise.image);
    const uniqueImages = [...new Set(images)]; // Remove duplicates
    
    const totalImages = uniqueImages.length;
    let loadedImages = 0;
    
    function updateLoadingProgress() {
      if (state.elements.loadingBar) {
        // Combine with audio progress (assume 50% for images, 50% for audio)
        const progress = ((loadedImages / totalImages) * 50) + 
                       (state.loadedResources.audio ? 50 : 0);
        state.elements.loadingBar.style.width = `${progress}%`;
      }
    }
    
    const imagePromises = uniqueImages.map(src => {
      return new Promise((resolve) => {
        const img = new Image();
        
        img.onload = () => {
          loadedImages++;
          updateLoadingProgress();
          resolve();
        };
        
        img.onerror = () => {
          console.warn(`Failed to load image: ${src}`);
          loadedImages++;
          updateLoadingProgress();
          resolve(); // Resolve anyway to not block the app
        };
        
        // Handle timeout
        setTimeout(() => {
          if (!img.complete) {
            console.warn(`Image load timeout: ${src}`);
            loadedImages++;
            updateLoadingProgress();
            resolve();
          }
        }, 5000);
        
        img.src = src;
      });
    });
    
    // If no images to load, resolve immediately
    if (imagePromises.length === 0) {
      state.loadedResources.images = true;
      checkAllResourcesLoaded();
      return;
    }
    
    Promise.all(imagePromises)
      .then(() => {
        state.loadedResources.images = true;
        checkAllResourcesLoaded();
      })
      .catch(error => {
        console.error("Image loading error:", error);
        state.loadedResources.images = true; // Mark as complete anyway
        checkAllResourcesLoaded();
      });
  }
  
  function checkAllResourcesLoaded() {
    // Check if all resources are loaded
    if (state.loadedResources.dom && 
        state.loadedResources.audio && 
        state.loadedResources.images) {
      // Small delay to ensure UI is ready
      setTimeout(() => {
        // Fade out loading screen
        state.elements.loadingContainer.style.opacity = '0';
        setTimeout(() => {
          state.elements.loadingContainer.style.display = 'none';
        }, 500);
        
        // Show app content with fade in
        state.elements.appContainer.style.opacity = '1';
        
        // Add landing-active class to body initially
        document.body.classList.add('landing-active');
      }, 500);
    }
  }
  
  function attachEventListeners() {
    // First interaction for audio playback
    document.addEventListener('click', handlers.handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handlers.handleUserInteraction, { once: true });
    
    // Main navigation buttons
    state.elements.startButton.addEventListener('click', handlers.startApp);
    state.elements.learnMoreButton.addEventListener('click', handlers.openLearnMore);
    state.elements.pauseTimerButton.addEventListener('click', handlers.pauseTimer);
    state.elements.startTimerButton.addEventListener('click', handlers.startTimer);
    state.elements.pauseExerciseButton.addEventListener('click', handlers.pauseExercise);
    state.elements.skipExerciseButton.addEventListener('click', handlers.skipExercise);
    state.elements.restartButton.addEventListener('click', handlers.finishAndRestart);
    
    // Back button in knowledge section
    state.elements.backButton.addEventListener('click', handlers.hideKnowledgeSection);
    
    // Knowledge Section Navigation
    state.elements.techniqueBtns.forEach(btn => {
      btn.addEventListener('click', () => handlers.selectTechniqueInfo(btn));
    });
    
    // Tab visibility changes
    document.addEventListener('visibilitychange', handlers.handleVisibilityChange);
    
    // Escape key closes panels
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (state.elements.knowledgeSection.style.display === 'block') {
          handlers.hideKnowledgeSection();
        }
      }
    });
  }
  
  // TIMER FUNCTIONS
  function startTimer() {
    // Reset timer state
    state.timerRemaining = DEFAULTS.WORK_DURATION;
    updateTimerDisplay();
    
    // Reset and show progress bar
    const progressBar = state.elements.timerProgress;
    progressBar.style.width = "100%";
    
    // Clear any existing interval
    clearInterval(state.timerInterval);
    
    // Reset pause state
    state.timerIsPaused = false;
    if (state.elements.pauseTimerButton) {
      state.elements.pauseTimerButton.textContent = 'Pause';
    }
    
    // Start new interval
    state.timerInterval = setInterval(() => {
      state.timerRemaining--;
      updateTimerDisplay();
      
      // Update progress bar
      const percentRemaining = (state.timerRemaining / DEFAULTS.WORK_DURATION) * 100;
      progressBar.style.width = percentRemaining + "%";
      
      // Play a tick sound every minute (or when 1 minute remains)
      if (state.timerRemaining > 0 && 
          (state.timerRemaining % 60 === 0 || state.timerRemaining === 60)) {
        utils.playAudio('timer');
      }
      
      if (state.timerRemaining <= 0) {
        clearInterval(state.timerInterval);
        utils.playAudio('complete');
        utils.triggerHaptic(HAPTIC_PATTERNS.timerComplete);
        goToExercises();
      }
    }, 1000);
  }
  
  function updateTimerDisplay() {
    const formattedTime = utils.formatTime(state.timerRemaining);
    state.elements.timerRemaining.textContent = formattedTime;
  }
  
  // EXERCISE FUNCTIONS
  function goToExercises() {
    // Switch to exercise page
    utils.showPage('exerciseSection');
    
    // Generate new exercise segments
    generateExerciseSegments();
    
    // Reset state
    state.currentExerciseIndex = 0;
    state.completedExercises = [];
    state.isPaused = false;
    
    // Start the first exercise
    startExerciseSegment();
    
    // Play transition sound
    utils.playAudio('transition');
  }
  
  function generateExerciseSegments() {
    state.exerciseSegments = [];
    
    // Shuffle and create a weighted distribution based on probability
    let shuffled = [];
    exercisesPool.forEach(exercise => {
      // Add multiple entries based on probability
      const entries = exercise.probability > 1 ? 
                    Math.floor(exercise.probability) : 
                    (exercise.probability < 1 ? 0.5 : 1);
      
      for (let i = 0; i < entries * 2; i++) {
        shuffled.push(exercise);
      }
    });
    
    // Shuffle the weighted array
    shuffled = utils.shuffle(shuffled);
    
    // Select unique exercises (up to MAX_EXERCISES)
    const selectedExercises = [];
    let totalSegments = 0;
    
    for (let ex of shuffled) {
      // Skip if already selected
      if (selectedExercises.find(e => e.name === ex.name)) continue;
      
      const needed = ex.unilateral ? 2 : 1;
      if (totalSegments + needed <= DEFAULTS.MAX_EXERCISES) {
        selectedExercises.push(ex);
        if (ex.unilateral) {
          state.exerciseSegments.push({ ...ex, side: "Left", status: "upcoming" });
          state.exerciseSegments.push({ ...ex, side: "Right", status: "upcoming" });
        } else {
          state.exerciseSegments.push({ ...ex, side: "", status: "upcoming" });
        }
        totalSegments += needed;
      }
      
      if (totalSegments >= DEFAULTS.MAX_EXERCISES) break;
    }
  }
  
  function startExerciseSegment() {
    // Reset pause state
    state.isPaused = false;
    
    // Update pause button text
    if (state.elements.pauseExerciseButton) {
      state.elements.pauseExerciseButton.textContent = 'Pause';
    }
    
    // Check if we've completed all exercises
    if (state.currentExerciseIndex >= state.exerciseSegments.length) {
      finishExercises();
      return;
    }
    
    // Mark current as ongoing
    state.exerciseSegments.forEach((seg, i) => {
      if (i === state.currentExerciseIndex) {
        seg.status = "ongoing";
      } else if (seg.status !== "done") {
        seg.status = "upcoming";
      }
    });
    
    // Get current exercise
    const current = state.exerciseSegments[state.currentExerciseIndex];
    
    // Update UI
    const fullName = current.name + (current.side ? ` (${current.side})` : "");
    state.elements.exerciseImage.src = current.image;
    state.elements.exerciseImage.alt = fullName;
    state.elements.exerciseTitle.textContent = fullName;
    state.elements.exerciseSubtitle.textContent = current.description;
    
    // Set up timer
    state.exerciseRemaining = DEFAULTS.EXERCISE_DURATION;
    updateExerciseTimer();
    
    // Set up progress bar
    const progressBar = state.elements.exerciseProgress;
    progressBar.style.width = "100%";
    
    // Clear any existing interval
    clearInterval(state.exerciseInterval);
    
    // Play start sound and vibration
    utils.playAudio('transition');
    utils.triggerHaptic(HAPTIC_PATTERNS.exerciseStart);
    
    // Start new interval
    state.exerciseInterval = setInterval(() => {
      state.exerciseRemaining--;
      updateExerciseTimer();
      
      // Update progress bar
      const percentRemaining = (state.exerciseRemaining / DEFAULTS.EXERCISE_DURATION) * 100;
      progressBar.style.width = percentRemaining + "%";
      
      if (state.exerciseRemaining <= 0) {
        clearInterval(state.exerciseInterval);
        
        // Play completion sound
        utils.playAudio('complete');
        utils.triggerHaptic(HAPTIC_PATTERNS.exerciseComplete);
        
        // Mark as done + add to completed
        state.exerciseSegments[state.currentExerciseIndex].status = "done";
        state.completedExercises.push({
          name: current.name,
          side: current.side,
          description: current.description,
          tag: "nothing"
        });
        
        // Move to next exercise
        state.currentExerciseIndex++;
        startExerciseSegment();
      }
    }, 1000);
  }
  
  function updateExerciseTimer() {
    const formattedTime = utils.formatTime(state.exerciseRemaining);
    // Only update the time in the progress bar now
    state.elements.exerciseRemaining.textContent = formattedTime;
  }
  
  function finishExercises() {
    // Clear any intervals
    clearInterval(state.exerciseInterval);
    
    // Show completion vibration
    utils.triggerHaptic(HAPTIC_PATTERNS.sessionComplete);
    
    // Switch to finish page
    utils.showPage('finishSection');
    
    // Render the completed exercises list
    renderCompletedExercises();
    
    // Play completion sound
    utils.playAudio('complete');
  }
  
  function renderCompletedExercises() {
    const doneList = state.elements.doneList;
    doneList.innerHTML = "";
    
    state.completedExercises.forEach((ex, idx) => {
      const li = document.createElement("li");
      const fullName = ex.name + (ex.side ? ` (${ex.side})` : "");
      li.textContent = fullName;
      li.setAttribute("data-index", idx);
      li.setAttribute("data-tag", ex.tag); // current tag state
      li.addEventListener("click", () => handlers.cycleTag(li));
      doneList.appendChild(li);
    });
  }
  
  // INITIALIZATION
  function init() {
    cacheElements();
    initializeAudio();
    preloadImages();
    attachEventListeners();
    
    // Set initial ARIA states
    utils.setAriaState(state.elements.backButton, 'aria-expanded', false);
  }
  
  // Initialize the app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();