// Function to get CSRF token from meta tag or input field
function getCsrfToken() {
    // Look for meta tag first (current method)
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (metaToken) return metaToken;
    
    // Then look for hidden input (quart-wtf method)
    const inputToken = document.querySelector('input[name="csrf_token"]')?.value;
    return inputToken || '';
}

document.getElementById('botJoinBtn').addEventListener('click', async function () {
    const channelId = document.querySelector('[data-channel-id]').dataset.channelId;
    const guildId = document.querySelector('[data-guild-id]').dataset.guildId;

    try {
        const response = await fetch(`/server/${guildId}/bot/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel_id: channelId }),
        });

        if (response.ok) {
            showToast('✅ Bot joined the voice channel.');
        } else {
            showToast('❌ Failed to join the voice channel.');
        }
    } catch (error) {
        console.error('Error joining voice channel:', error);
        showToast('❌ An error occurred.');
    }
});

document.getElementById('botLeaveBtn').addEventListener('click', async function () {
    const guildId = document.querySelector('[data-guild-id]').dataset.guildId;

    try {
        const response = await fetch(`/server/${guildId}/bot/leave`, { method: 'POST' });

        if (response.ok) {
            showToast('✅ Bot left the voice channel and cleared the queue.');
            await refreshQueue(guildId, null); // Clear the queue view
        } else {
            showToast('❌ Failed to leave the voice channel.');
        }
    } catch (error) {
        console.error('Error leaving voice channel:', error);
        showToast('❌ An error occurred.');
    }
});

async function refreshQueue(guildId, channelId) {
    try {
        const response = await fetch(`/server/${guildId}/queue?channel_id=${channelId}`);
        if (response.ok) {
            const queueHtml = await response.text();
            document.getElementById('queue-container').innerHTML = queueHtml;
        } else {
            console.error('Failed to refresh queue:', response.statusText);
        }
    } catch (error) {
        console.error('Error refreshing queue:', error);
    }
}

function initAddTrackButtons() {
    document.querySelectorAll('.add-track-btn').forEach(button => {
        button.addEventListener('click', async function () {
            const btn = this;
            const originalText = btn.innerHTML;

            // Show loading state
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Adding...';
            btn.disabled = true;

            // Prepare form data
            const formData = new FormData();
            formData.append('csrf_token', getCsrfToken());
            formData.append('channel_id', btn.dataset.channelId);
            formData.append('video_id', btn.dataset.videoId);
            formData.append('video_title', btn.dataset.videoTitle);

            try {
                // Send AJAX request
                const response = await fetch(`/server/${btn.dataset.guildId}/queue/add`, {
                    method: 'POST',
                    body: formData,
                });

                if (response.ok) {
                    showToast(`✅ Added "${btn.dataset.videoTitle}" to the queue.`);
                    await refreshQueue(btn.dataset.guildId, btn.dataset.channelId);
                } else {
                    showToast('❌ Failed to add to the queue.');
                }
            } catch (error) {
                console.error('Error adding to queue:', error);
                showToast('❌ An error occurred.');
            } finally {
                // Restore button state
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    });
}

// Function to properly handle playlist selection for WTForms
function initPlaylistSelection() {
    console.log("Initializing playlist selection...");
    const videoCheckboxes = document.querySelectorAll('.video-checkbox');
    if (videoCheckboxes.length === 0) {
        console.log("No video checkboxes found. Exiting initialization.");
        return;
    }
    
    const selectAllBtn = document.getElementById('selectAllBtn');
    const addSelectedBtn = document.getElementById('addSelectedToQueueBtn');
    const selectedVideosContainer = document.getElementById('selectedVideosContainer');
    const addMultipleForm = document.getElementById('addMultipleForm');
    
    let allSelected = false;
    
    // Function to update the selected videos form
    function updateSelectedVideos() {
        if (!selectedVideosContainer) {
            console.error("selectedVideosContainer not found");
            return;
        }
        
        selectedVideosContainer.innerHTML = '';
        
        // Count selected videos
        let selectedCount = 0;
        
        // Add new hidden inputs for each checked video - using WTForms FieldList format
        videoCheckboxes.forEach((checkbox, index) => {
            if (checkbox.checked) {
                selectedCount++;
                
                const videoId = checkbox.getAttribute('data-video-id');
                const videoTitle = checkbox.getAttribute('data-video-title');
                
                // Create hidden input for video ID
                const idInput = document.createElement('input');
                idInput.type = 'hidden';
                idInput.name = `video_ids-${index}`;  // Match WTForms FieldList naming format
                idInput.value = videoId;
                selectedVideosContainer.appendChild(idInput);
                
                // Create hidden input for video title
                const titleInput = document.createElement('input');
                titleInput.type = 'hidden';
                titleInput.name = `video_titles-${index}`;  // Match WTForms FieldList naming format
                titleInput.value = videoTitle;
                selectedVideosContainer.appendChild(titleInput);
            }
        });
        
        // Enable/disable add selected button
        if (addSelectedBtn) {
            addSelectedBtn.disabled = selectedCount === 0;
            
            // Update button text
            if (selectedCount > 0) {
                addSelectedBtn.innerHTML = `<i class="fas fa-plus me-1"></i> Add ${selectedCount} Selected`;
            } else {
                addSelectedBtn.innerHTML = `<i class="fas fa-plus me-1"></i> Add Selected to Queue`;
            }
        }
    }
    
    // Add event listeners to checkboxes
    videoCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateSelectedVideos();
        });
    });
    
    // Select/deselect all videos
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            allSelected = !allSelected;
            
            videoCheckboxes.forEach(checkbox => {
                checkbox.checked = allSelected;
            });
            
            // Update button text
            if (allSelected) {
                selectAllBtn.innerHTML = `<i class="fas fa-square me-1"></i> Deselect All`;
            } else {
                selectAllBtn.innerHTML = `<i class="fas fa-check-square me-1"></i> Select All`;
            }
            
            updateSelectedVideos();
        });
    }
    
    // Add form submission validation
    if (addMultipleForm) {
        addMultipleForm.addEventListener('submit', function(event) {
            // Check if any videos are selected
            const selectedVideos = document.querySelectorAll('input[name^="video_ids-"]');
            if (selectedVideos.length === 0) {
                event.preventDefault();
                alert('Please select at least one video to add to the queue.');
                return false;
            }
            
            // Add CSRF token if not already present
            if (!addMultipleForm.querySelector('input[name="csrf_token"]')) {
                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = 'csrf_token';
                csrfInput.value = getCsrfToken();
                addMultipleForm.appendChild(csrfInput);
            }
            
            // Preserve pagination and search context on submission
            const urlParams = new URLSearchParams(window.location.search);
            const contextParams = ['page', 'page_token', 'prev_page_token', 'query'];
            
            contextParams.forEach(param => {
                if (urlParams.has(param) && !addMultipleForm.querySelector(`input[name="${param}"]`)) {
                    const contextInput = document.createElement('input');
                    contextInput.type = 'hidden';
                    contextInput.name = param;
                    contextInput.value = urlParams.get(param);
                    addMultipleForm.appendChild(contextInput);
                }
            });
            
            // Allow the form to submit
            return true;
        });
    }
    
    // Initialize
    updateSelectedVideos();
}

// Initialize queue drag-and-drop with proper form submission
function initQueueDragDrop() {
    const queueList = document.getElementById('queue-list');
    if (!queueList) return;
    
    let draggedItem = null;
    let dragStartIndex = 0;
    
    const queueItems = queueList.querySelectorAll('.queue-item');
    queueItems.forEach((item, index) => {
        item.addEventListener('dragstart', function(e) {
            draggedItem = item;
            dragStartIndex = index;
            
            setTimeout(() => {
                item.classList.add('dragging');
            }, 0);
            
            e.dataTransfer.setData('text/plain', item.dataset.id);
            e.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragend', function() {
            item.classList.remove('dragging');
            draggedItem = null;
        });
        
        item.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            this.classList.add('dragover');
        });
        
        item.addEventListener('dragleave', function() {
            this.classList.remove('dragover');
        });
        
        item.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            
            const dropIndex = Array.from(queueItems).indexOf(this);
            
            if (draggedItem && dragStartIndex !== dropIndex) {
                if (dropIndex < dragStartIndex) {
                    queueList.insertBefore(draggedItem, this);
                } else {
                    queueList.insertBefore(draggedItem, this.nextSibling);
                }
                
                updateQueueOrder(dragStartIndex, dropIndex);
            }
        });
    });
    
    // Use WTForms structure for the reorder form
    function updateQueueOrder(oldIndex, newIndex) {
        const container = document.querySelector('.container-fluid');
        const guildId = container ? container.dataset.guildId : null;
        const channelId = container ? container.dataset.channelId : null;
        
        if (!guildId || !channelId) return;
        
        // Create a form that matches ReorderQueueForm structure
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/server/${guildId}/queue/reorder`;
        form.style.display = 'none';
        
        // CSRF Token
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = 'csrf_token';
        csrfInput.value = getCsrfToken();
        form.appendChild(csrfInput);
        
        // Channel ID
        const channelInput = document.createElement('input');
        channelInput.type = 'hidden';
        channelInput.name = 'channel_id';
        channelInput.value = channelId;
        form.appendChild(channelInput);
        
        // Old Index
        const oldIndexInput = document.createElement('input');
        oldIndexInput.type = 'hidden';
        oldIndexInput.name = 'old_index';
        oldIndexInput.value = oldIndex;
        form.appendChild(oldIndexInput);
        
        // New Index
        const newIndexInput = document.createElement('input');
        newIndexInput.type = 'hidden';
        newIndexInput.name = 'new_index';
        newIndexInput.value = newIndex;
        form.appendChild(newIndexInput);
        
        // Add form to the document and submit
        document.body.appendChild(form);
        form.submit();
        
        // Remove the form after submission
        setTimeout(() => form.remove(), 100);
    }
}

// Function to initialize channel id on all forms
function initializeChannelId() {
    // Make sure the channel ID is known for searching and queue operations
    const channelIdInputs = document.querySelectorAll('input[name="channel_id"]');
    const container = document.querySelector('.container-fluid');
    
    if (container && container.dataset.channelId) {
        const selectedChannelId = container.dataset.channelId;
        
        if (selectedChannelId) {
            channelIdInputs.forEach(input => {
                input.value = selectedChannelId;
            });
        }
    }
}

// Initialize all dashboard features
document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    initQueueDragDrop();
    initPlaylistSelection();
    initAddTrackButtons();
    initializeChannelId();
    
    // Check for server dashboard page
    if (document.querySelector('.container-fluid[data-guild-id]')) {
        console.log('Server dashboard loaded, initializing all components');
    }
});

// Toast notification system
function showToast(msg) {
    const toast = document.createElement("div");
    toast.textContent = msg;
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.background = "#333";
    toast.style.color = "#fff";
    toast.style.padding = "10px 20px";
    toast.style.borderRadius = "5px";
    toast.style.zIndex = 1000;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// AJAX queue polling for real-time updates
let queueUpdateInterval;

function startQueuePolling(guildId, channelId) {
    if (!guildId || !channelId) return;
    
    // Clear existing interval if any
    if (queueUpdateInterval) clearInterval(queueUpdateInterval);
    
    // Set up polling every 5 seconds
    queueUpdateInterval = setInterval(() => {
        updateQueueDisplay(guildId, channelId);
    }, 5000);
    
    // Initial update
    updateQueueDisplay(guildId, channelId);
}

function stopQueuePolling() {
    if (queueUpdateInterval) {
        clearInterval(queueUpdateInterval);
        queueUpdateInterval = null;
    }
}

async function updateQueueDisplay(guildId, channelId) {
    try {
        const response = await fetch(`/server/${guildId}/queue/ajax?channel_id=${channelId}`);
        if (!response.ok) {
            console.error('Queue update failed:', response.status);
            return;
        }
        
        const data = await response.json();
        
        // Update the queue display
        const queueContainer = document.getElementById('queue-container');
        const currentTrackContainer = document.getElementById('current-track-container');
        
        if (queueContainer) {
            // Update current track
            if (currentTrackContainer) {
                if (data.current_track) {
                    currentTrackContainer.innerHTML = `
                        <div class="current-track mb-3 p-2 bg-dark rounded">
                            <div class="d-flex align-items-center">
                                <div class="me-2">
                                    <i class="fas fa-play-circle text-success"></i>
                                </div>
                                <div>
                                    <h6 class="mb-0">Now Playing:</h6>
                                    <p class="mb-0">${data.current_track.title}</p>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    currentTrackContainer.innerHTML = '';
                }
            }
            
            // Update queue
            const queueList = document.getElementById('queue-list');
            if (queueList) {
                if (data.queue && data.queue.length > 0) {
                    queueList.innerHTML = data.queue.map((item, index) => `
                        <div class="list-group-item bg-dark text-light border-secondary queue-item" 
                             data-id="${item.id}" draggable="true">
                            <div class="d-flex w-100 justify-content-between align-items-start">
                                <div>
                                    <div class="drag-handle me-2 d-inline-block">
                                        <i class="fas fa-grip-vertical text-muted"></i>
                                    </div>
                                    <h6 class="mb-1 d-inline-block">${item.title}</h6>
                                </div>
                                <span class="badge bg-secondary">${index + 1}</span>
                            </div>
                        </div>
                    `).join('');
                    
                    // Reinitialize drag and drop
                    initQueueDragDrop();
                } else {
                    queueList.innerHTML = '<p class="text-muted">The queue is currently empty. Search for music to add to the queue.</p>';
                }
            }
        }
        
        // Update playback controls
        updatePlaybackControls(data.is_playing, data.is_paused);
        
    } catch (error) {
        console.error('Error updating queue:', error);
    }
}

function updatePlaybackControls(isPlaying, isPaused) {
    const playPauseBtn = document.getElementById('play-pause-btn');
    if (!playPauseBtn) return;
    
    if (isPlaying && !isPaused) {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
    } else {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
    }
}

// Initialize queue polling if on the server dashboard
document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('.container-fluid[data-guild-id]');
    if (container) {
        const guildId = container.dataset.guildId;
        const channelId = container.dataset.channelId;
        
        if (guildId && channelId) {
            startQueuePolling(guildId, channelId);
        }
    }
    
    // Stop polling when leaving the page
    window.addEventListener('beforeunload', stopQueuePolling);
});