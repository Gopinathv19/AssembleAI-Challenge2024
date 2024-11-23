document.addEventListener('DOMContentLoaded', () => {
    const audioUpload = document.getElementById("audio-upload");
    const transcribeBtn = document.getElementById("transcribe-btn");
    const navButtons = document.getElementById("nav-buttons");

    // Reset session storage on page load
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        sessionStorage.clear();
    }

    audioUpload?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                updateStatus(`Selected file: ${file.name}`, 'success');
                
                // Convert audio file to base64 and store it
                const base64Audio = await fileToBase64(file);
                sessionStorage.setItem('audioData', base64Audio);
                
                // Enable transcribe button
                if (transcribeBtn) {
                    transcribeBtn.disabled = false;
                }
            } catch (error) {
                showError('Error processing audio file: ' + error.message);
            }
        }
    });

    transcribeBtn?.addEventListener("click", async () => {
        const file = audioUpload?.files[0];
        if (!file) {
            updateStatus("Please upload an audio file.", "error");
            return;
        }

        try {
            transcribeBtn.disabled = true;
            transcribeBtn.classList.add('loading');
            updateStatus("Processing transcription...", "loading");
            
            const transcriptionData = await processTranscription(file);
            updateStatus("Processing speaker diarization...", "loading");
            
            const diarizationData = await processDiarization(file);
            const mergedData = mergeDiarizationData(transcriptionData, diarizationData);
            
            storeProcessedData(mergedData);
            updateStatus("Processing completed!", "success");
            
            // Show navigation buttons
            navButtons?.classList.remove("hidden");

        } catch (error) {
            updateStatus(error.message, "error");
            console.error("Processing error:", error);
        } finally {
            transcribeBtn.classList.remove('loading');
            transcribeBtn.disabled = false;
        }
    });
});

// Utility function to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

function mergeDiarizationData(transcriptionData, diarizationData) {
    const mergedWordData = transcriptionData.word_data.map(word => {
        const speaker = findSpeakerForTimestamp(
            word.start_time,
            word.end_time,
            diarizationData.speaker_segments
        );
        return { ...word, speaker };
    });

    return {
        ...transcriptionData,
        word_data: mergedWordData,
        speaker_stats: calculateSpeakerStats(mergedWordData)
    };
}