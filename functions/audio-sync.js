document.addEventListener('DOMContentLoaded', () => {
    const data = getProcessedData();
    if (!data || !data.word_data) {
        console.error('No transcription data found:', data);
        showError("No transcription data found");
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    console.log('Received word data:', data.word_data[0]);

    const { audioData } = getStoredAudio();
    if (!audioData) {
        showError("No audio file found");
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    initializeAudioPlayer(audioData);
    setupPlaybackControls();
    setupTranscriptDisplay(data.word_data);
    setupSearchFunctionality();
    setupDisplayOptions();
});

function initializeAudioPlayer(audioData) {
    const audioPlayer = document.getElementById('audio-player');
    if (!audioPlayer) return;

    if (audioPlayer.src) {
        URL.revokeObjectURL(audioPlayer.src);
    }
    audioPlayer.src = audioData;
    audioPlayer.load();

    // Add timeupdate listener for word synchronization
    audioPlayer.addEventListener('timeupdate', () => {
        const container = document.getElementById('sync-transcript');
        if (container) {
            updateActiveWord(audioPlayer.currentTime, container);
        }
    });
}

function setupPlaybackControls() {
    const audioPlayer = document.getElementById('audio-player');
    if (!audioPlayer) return;

    const controls = {
        'slow-btn': 0.75,
        'normal-btn': 1.0,
        'fast-btn': 1.25
    };

    Object.entries(controls).forEach(([id, speed]) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', () => {
                audioPlayer.playbackRate = speed;
                updateActiveSpeedButton(id);
            });
        }
    });

    document.getElementById('backward-btn')?.addEventListener('click', () => {
        audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 5);
    });

    document.getElementById('forward-btn')?.addEventListener('click', () => {
        audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 5);
    });
}

function updateActiveSpeedButton(activeId) {
    ['slow-btn', 'normal-btn', 'fast-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.toggle('active', id === activeId);
        }
    });
}

function setupTranscriptDisplay(wordData) {
    const container = document.getElementById('sync-transcript');
    const audioPlayer = document.getElementById('audio-player');
    if (!container || !audioPlayer || !Array.isArray(wordData)) {
        console.error('Missing elements or invalid word data');
        return;
    }

    let currentSpeaker = null;
    container.innerHTML = '';

    wordData.forEach((word, index) => {
        if (!word || !word.text) return;

        // Handle speaker changes
        if (word.speaker !== currentSpeaker) {
            currentSpeaker = word.speaker;
            const speakerLabel = document.createElement('p');
            speakerLabel.className = 'speaker-label';
            speakerLabel.textContent = `${word.speaker}:`;
            container.appendChild(speakerLabel);
        }

        // Create word span
        const wordSpan = document.createElement('span');
        wordSpan.className = 'word';
        wordSpan.textContent = word.text + ' ';

        // Process timestamps
        const startTime = convertToSeconds(word.start_time || word.start);
        const endTime = convertToSeconds(word.end_time || word.end);

        wordSpan.dataset.startTime = startTime.toString();
        wordSpan.dataset.endTime = endTime.toString();
        wordSpan.dataset.speaker = word.speaker;
        wordSpan.dataset.index = index.toString();

        // Add formatted timestamp
        const formattedTime = formatTime(startTime);
        wordSpan.setAttribute('data-time', formattedTime);

        // Add click handler
        wordSpan.addEventListener('click', function(e) {
            e.stopPropagation();
            const clickTime = parseFloat(this.dataset.startTime);
            
            if (!isNaN(clickTime)) {
                // Remove active class from all words
                container.querySelectorAll('.word').forEach(w => w.classList.remove('active'));
                
                // Add active class to clicked word
                this.classList.add('active');
                
                // Set audio time and play
                audioPlayer.currentTime = clickTime;
                audioPlayer.play().catch(error => {
                    console.error('Playback failed:', error);
                    showError('Failed to play audio');
                });
            }
        });

        container.appendChild(wordSpan);
    });
}

function convertToSeconds(time) {
    if (!time) return 0;
    
    if (typeof time === 'string') {
        return parseFloat(time.replace(',', '.'));
    }
    // If time is in milliseconds (greater than 1000), convert to seconds
    if (typeof time === 'number' && time > 1000) {
        return time / 1000;
    }
    return time;
}

function updateActiveWord(currentTime, container) {
    const words = container.getElementsByClassName('word');
    const autoScroll = document.getElementById('auto-scroll')?.checked;
    let activeWordFound = false;

    Array.from(words).forEach(word => {
        const startTime = parseFloat(word.dataset.startTime);
        const endTime = parseFloat(word.dataset.endTime);
        
        if (currentTime >= startTime && currentTime <= endTime) {
            if (!word.classList.contains('active')) {
                // Remove active class from all words
                Array.from(words).forEach(w => w.classList.remove('active'));
                
                // Add active class to current word
                word.classList.add('active');
                
                if (autoScroll) {
                    ensureWordVisible(word, container);
                }
            }
            activeWordFound = true;
        }
    });

    if (!activeWordFound) {
        Array.from(words).forEach(w => w.classList.remove('active'));
    }
}

function formatTime(timeInSeconds) {
    if (typeof timeInSeconds !== 'number' || isNaN(timeInSeconds)) {
        return "0:00";
    }
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    // Return only minutes and seconds in format "M:SS"
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function setupSearchFunctionality() {
    const searchInput = document.getElementById('search-text');
    const searchButton = document.getElementById('search-btn');
    const transcript = document.getElementById('sync-transcript');

    function clearHighlights() {
        const words = transcript.getElementsByClassName('word');
        Array.from(words).forEach(word => {
            word.classList.remove('highlighted');
        });
    }

    function performSearch() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        clearHighlights();
        
        if (!searchTerm) return;

        const words = transcript.getElementsByClassName('word');
        Array.from(words).forEach(word => {
            if (word.textContent.toLowerCase().includes(searchTerm)) {
                word.classList.add('highlighted');
            }
        });
    }

    // Add event listeners
    searchButton?.addEventListener('click', performSearch);
    searchInput?.addEventListener('input', performSearch);
    searchInput?.addEventListener('change', () => {
        if (!searchInput.value.trim()) {
            clearHighlights();
        }
    });
}

function setupDisplayOptions() {
    const transcript = document.getElementById('sync-transcript');
    
    // Highlight speakers toggle
    document.getElementById('highlight-speakers')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            transcript.classList.add('highlight-speakers');
        } else {
            transcript.classList.remove('highlight-speakers');
        }
    });

    // Show timestamps toggle
    document.getElementById('show-timestamps')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            transcript.classList.add('show-timestamps');
        } else {
            transcript.classList.remove('show-timestamps');
        }
    });

    // Initialize highlight speakers if checked by default
    if (document.getElementById('highlight-speakers')?.checked) {
        transcript.classList.add('highlight-speakers');
    }

    // Initialize show timestamps if checked by default
    if (document.getElementById('show-timestamps')?.checked) {
        transcript.classList.add('show-timestamps');
    }
}

function ensureWordVisible(wordSpan, container) {
    const rect = wordSpan.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
        wordSpan.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

 
document.addEventListener('keydown', (e) => {
    const audioPlayer = document.getElementById('audio-player');
    if (!audioPlayer) return;

    switch(e.code) {
        case 'Space':
            e.preventDefault();
            if (audioPlayer.paused) {
                audioPlayer.play().catch(error => {
                    console.error('Playback failed:', error);
                    showError('Failed to play audio');
                });
            } else {
                audioPlayer.pause();
            }
            break;
        case 'ArrowLeft':
            if (e.ctrlKey) {
                audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 5);
            }
            break;
        case 'ArrowRight':
            if (e.ctrlKey) {
                audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 5);
            }
            break;
    }
});

function showError(message) {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.classList.remove('hidden');
        setTimeout(() => {
            errorContainer.classList.add('hidden');
        }, 3000);
    }
}