document.addEventListener('DOMContentLoaded', () => {
    const data = getProcessedData();
    if (!data) {
        window.location.href = 'index.html';
        return;
    }

    initializeAudioPlayer();
    setupPlaybackControls();
    setupTranscriptDisplay(data.word_data);
    setupSearchFunctionality();
    setupDisplayOptions();
});

function initializeAudioPlayer() {
    const audioPlayer = document.getElementById('audio-player');
    if (!audioPlayer) return;

    const audioData = sessionStorage.getItem('audioData');
    if (!audioData) {
        showError('Audio file not found');
        return;
    }

    if (audioPlayer.src) {
        URL.revokeObjectURL(audioPlayer.src);
    }
    audioPlayer.src = audioData;
    audioPlayer.load();
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
        document.getElementById(id)?.addEventListener('click', () => {
            audioPlayer.playbackRate = speed;
            updateActiveSpeedButton(id);
        });
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
    if (!container || !audioPlayer) return;

    let currentSpeaker = null;
    container.innerHTML = '';

    wordData.forEach(word => {
        if (word.speaker !== currentSpeaker) {
            currentSpeaker = word.speaker;
            const speakerLabel = document.createElement('p');
            speakerLabel.className = 'speaker-label';
            speakerLabel.textContent = `${word.speaker}:`;
            container.appendChild(speakerLabel);
        }

        const wordSpan = document.createElement('span');
        wordSpan.className = 'word';
        wordSpan.textContent = `${word.text} `;
        // Convert timestamps to seconds if they're in milliseconds
        const startTime = word.start_time / 1000;
        const endTime = word.end_time / 1000;
        wordSpan.dataset.startTime = startTime.toString();
        wordSpan.dataset.endTime = endTime.toString();
        wordSpan.dataset.speaker = word.speaker;

        wordSpan.addEventListener('click', () => {
            const clickTime = parseFloat(wordSpan.dataset.startTime);
            if (!isNaN(clickTime)) {
                audioPlayer.currentTime = clickTime;
                audioPlayer.play().catch(error => {
                    console.error('Playback failed:', error);
                    showError('Failed to play audio');
                });
                // Remove active class from all words and add to clicked word
                const words = container.getElementsByClassName('word');
                Array.from(words).forEach(w => w.classList.remove('active'));
                wordSpan.classList.add('active');
            }
        });

        container.appendChild(wordSpan);
    });

    // Setup audio synchronization
    audioPlayer.addEventListener('timeupdate', () => {
        const currentTime = audioPlayer.currentTime;
        const words = container.getElementsByClassName('word');
        const autoScroll = document.getElementById('auto-scroll')?.checked;

        Array.from(words).forEach(wordSpan => {
            const startTime = parseFloat(wordSpan.dataset.startTime);
            const endTime = parseFloat(wordSpan.dataset.endTime);

            if (currentTime >= startTime && currentTime <= endTime) {
                if (!wordSpan.classList.contains('active')) {
                    wordSpan.classList.add('active');
                    if (autoScroll) {
                        ensureWordVisible(wordSpan, container);
                    }
                }
            } else {
                wordSpan.classList.remove('active');
            }
        });
    });
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

function setupSearchFunctionality() {
    const searchInput = document.getElementById('search-text');
    const searchBtn = document.getElementById('search-btn');

    const performSearch = () => {
        const searchText = searchInput?.value.toLowerCase();
        if (!searchText) return;

        const words = document.querySelectorAll('.word');
        let firstMatch = null;

        words.forEach(word => word.classList.remove('highlighted'));

        words.forEach(word => {
            if (word.textContent.toLowerCase().includes(searchText)) {
                word.classList.add('highlighted');
                if (!firstMatch) firstMatch = word;
            }
        });

        if (firstMatch) {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    searchBtn?.addEventListener('click', performSearch);
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
}

function setupDisplayOptions() {
    const container = document.getElementById('sync-transcript');
    if (!container) return;
    
    // Show timestamps
    document.getElementById('show-timestamps')?.addEventListener('change', (e) => {
        const words = container.getElementsByClassName('word');
        Array.from(words).forEach(word => {
            if (e.target.checked) {
                const startTime = parseFloat(word.dataset.startTime);
                const formattedTime = formatTime(startTime);
                word.setAttribute('data-time', formattedTime);
            } else {
                word.removeAttribute('data-time');
            }
        });
        container.classList.toggle('show-timestamps', e.target.checked);
    });

    // Highlight speakers
    document.getElementById('highlight-speakers')?.addEventListener('change', (e) => {
        container.classList.toggle('highlight-speakers', e.target.checked);
    });

    // Auto-scroll
    document.getElementById('auto-scroll')?.addEventListener('change', (e) => {
        container.classList.toggle('auto-scroll', e.target.checked);
    });
}

function formatTime(timeInSeconds) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

// Keyboard shortcuts
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