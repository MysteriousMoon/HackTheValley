class TeacherModeApp {
    constructor() {
        // Left side: Teaching content 左侧：教学内容
        this.topicInput = document.getElementById('topicInput');
        this.startTeachingBtn = document.getElementById('startTeachingBtn');
        this.teachingContent = document.getElementById('teachingContent');
        this.teachingStatus = document.getElementById('teachingStatus');
        
        // Image upload 图片上传
        this.uploadImageBtn = document.getElementById('uploadImageBtn');
        this.imageInput = document.getElementById('imageInput');
        this.imagePreviewSection = document.getElementById('imagePreviewSection');
        this.previewImg = document.getElementById('previewImg');
        this.removeImageBtn = document.getElementById('removeImageBtn');
        this.uploadedImage = null;
        
        // Right side: Q&A 右侧：问答
        this.qaContent = document.getElementById('qaContent');
        this.qaStatus = document.getElementById('qaStatus');
        this.questionInput = document.getElementById('questionInput');
        this.askQuestionBtn = document.getElementById('askQuestionBtn');
        this.clearQABtn = document.getElementById('clearQABtn');
        
        // Mode switch 模式切换
        this.modeSwitchBtn = document.getElementById('modeSwitchBtn');
        
        // Settings related 设置相关
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeModal = document.getElementById('closeModal');
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.saveSettingsBtn = document.getElementById('saveSettings');
        this.clearApiKeyBtn = document.getElementById('clearApiKey');
        this.toggleVisibilityBtn = document.getElementById('toggleApiKeyVisibility');
        this.customApiKey = this.loadApiKey();
        
        // Current lesson state 当前课程状态
        this.currentTopic = '';
        this.currentLesson = '';
        this.conversationHistory = [];  // Q&A history 问答历史
        
        // Welcome message flags 欢迎消息标志
        this.teachingWelcomeHidden = false;
        this.qaWelcomeHidden = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.bindSettingsEvents();
        this.showWelcomeMessages();
        this.updateApiKeyDisplay();
        this.initializeMarkdown();
    }

    // Initialize Markdown renderer 初始化Markdown渲染器
    initializeMarkdown() {
        if (typeof marked !== 'undefined') {
            // Configure marked options 配置marked选项
            marked.setOptions({
                breaks: true,  // Support GFM line breaks 支持GFM换行
                gfm: true,     // Enable GitHub Flavored Markdown 启用GitHub风格Markdown
                headerIds: false,  // Disable header IDs 禁用标题ID
                mangle: false      // Don't mangle email addresses 不混淆邮箱地址
            });
        }
    }

    // Render Markdown to HTML 渲染Markdown为HTML
    renderMarkdown(text) {
        if (typeof marked !== 'undefined') {
            try {
                return marked.parse(text);
            } catch (error) {
                console.error('Markdown rendering error:', error);
                return this.escapeHtml(text);
            }
        }
        // Fallback: if marked not loaded, escape HTML 兜底：如果marked未加载，转义HTML
        return this.escapeHtml(text);
    }

    // ==================== Event Binding 事件绑定 ====================
    
    bindEvents() {
        this.startTeachingBtn.addEventListener('click', () => this.handleStartTeaching());
        this.askQuestionBtn.addEventListener('click', () => this.handleAskQuestion());
        this.clearQABtn.addEventListener('click', () => this.handleClearQA());
        this.modeSwitchBtn.addEventListener('click', () => this.switchMode());
        
        // Image upload events 图片上传事件
        this.uploadImageBtn.addEventListener('click', () => this.imageInput.click());
        this.imageInput.addEventListener('change', (e) => this.handleImageSelect(e));
        this.removeImageBtn.addEventListener('click', () => this.removeImage());
        
        // Drag and drop events 拖拽上传事件
        this.initDragAndDrop();
        
        // Support Enter to start teaching 支持回车开始教学
        this.topicInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleStartTeaching();
            }
        });
        
        // Support Ctrl+Enter to ask question 支持Ctrl+Enter提问
        this.questionInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.handleAskQuestion();
            }
        });
    }
    
    initDragAndDrop() {
        // 获取整个左侧教学区域作为拖拽目标
        const teachingSection = document.querySelector('.teaching-section');
        const overlay = document.getElementById('dragDropOverlay');
        
        if (!teachingSection || !overlay) {
            console.error('❌ Drag and drop elements not found');
            return;
        }
        
        console.log('✅ Drag and drop initialized');
        
        let isDragging = false;
        let isOverTarget = false;
        let dragCounter = 0;
        
        // 防止默认行为（全局）
        ['dragenter', 'dragover', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });
        
        // 全局dragenter - 检测是否有文件拖入
        document.addEventListener('dragenter', (e) => {
            if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
                isDragging = true;
            }
        }, false);
        
        // teaching-section的dragenter - 进入左侧区域
        teachingSection.addEventListener('dragenter', (e) => {
            if (isDragging) {
                dragCounter++;
                if (!isOverTarget) {
                    isOverTarget = true;
                    overlay.classList.add('active');
                }
            }
        }, false);
        
        // teaching-section的dragleave - 离开左侧区域
        teachingSection.addEventListener('dragleave', (e) => {
            if (isDragging) {
                dragCounter--;
                if (dragCounter === 0) {
                    isOverTarget = false;
                    overlay.classList.remove('active');
                }
            }
        }, false);
        
        // teaching-section的dragover - 保持显示
        teachingSection.addEventListener('dragover', (e) => {
            if (isDragging && !isOverTarget) {
                isOverTarget = true;
                overlay.classList.add('active');
            }
        }, false);
        
        // teaching-section的drop - 处理文件
        teachingSection.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            isDragging = false;
            isOverTarget = false;
            dragCounter = 0;
            overlay.classList.remove('active');
            
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                const file = files[0];
                
                if (file.type.startsWith('image/')) {
                    this.handleImageFile(file);
                } else {
                    this.showNotification('Please drop an image file', 'warning');
                }
            }
        }, false);
        
        // 全局dragend - 拖拽结束
        document.addEventListener('dragend', () => {
            isDragging = false;
            isOverTarget = false;
            dragCounter = 0;
            overlay.classList.remove('active');
        }, false);
        
        // 全局dragleave - 离开窗口时清理
        document.addEventListener('dragleave', (e) => {
            // 检查是否真的离开了窗口
            if (e.clientX <= 0 || e.clientY <= 0 || 
                e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
                isDragging = false;
                isOverTarget = false;
                dragCounter = 0;
                overlay.classList.remove('active');
            }
        }, false);
        
        // 全局drop - 在其他地方松手
        document.addEventListener('drop', (e) => {
            if (isDragging) {
                isDragging = false;
                isOverTarget = false;
                dragCounter = 0;
                overlay.classList.remove('active');
            }
        }, false);
    }
    
    async handleImageFile(file) {
        // 模拟文件输入事件
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        this.imageInput.files = dataTransfer.files;
        
        // 触发相同的处理逻辑
        await this.handleImageSelect({ target: { files: [file] } });
    }

    bindSettingsEvents() {
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeModal.addEventListener('click', () => this.closeSettings());
        
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
        });

        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.clearApiKeyBtn.addEventListener('click', () => this.clearApiKey());
        this.toggleVisibilityBtn.addEventListener('click', () => this.toggleApiKeyVisibility());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.settingsModal.style.display === 'flex') {
                this.closeSettings();
            }
        });
    }

    // ==================== Mode Switching 模式切换 ====================
    
    switchMode() {
        window.location.href = 'index.html';
    }

    // ==================== Settings Functions 设置功能 ====================
    
    openSettings() {
        this.settingsModal.style.display = 'flex';
        this.apiKeyInput.value = this.customApiKey || '';
    }

    closeSettings() {
        this.settingsModal.style.display = 'none';
    }

    saveSettings() {
        const apiKey = this.apiKeyInput.value.trim();
        this.customApiKey = apiKey;
        this.saveApiKey(apiKey);
        this.showNotification('Settings saved! 设置已保存！', 'success');
        this.closeSettings();
        this.updateApiKeyDisplay();
    }

    clearApiKey() {
        this.customApiKey = '';
        this.apiKeyInput.value = '';
        localStorage.removeItem('gemini_api_key');
        this.showNotification('Custom API key cleared! 已清除自定义API密钥！', 'success');
        this.updateApiKeyDisplay();
    }

    toggleApiKeyVisibility() {
        const type = this.apiKeyInput.type === 'password' ? 'text' : 'password';
        this.apiKeyInput.type = type;
        this.toggleVisibilityBtn.textContent = type === 'password' ? '👁️' : '🙈';
    }

    saveApiKey(apiKey) {
        if (apiKey) {
            localStorage.setItem('gemini_api_key', apiKey);
        } else {
            localStorage.removeItem('gemini_api_key');
        }
    }

    loadApiKey() {
        return localStorage.getItem('gemini_api_key') || '';
    }

    updateApiKeyDisplay() {
        if (this.customApiKey) {
            this.settingsBtn.classList.add('active');
            this.settingsBtn.setAttribute('title', 'Using custom API key');
        } else {
            this.settingsBtn.classList.remove('active');
            this.settingsBtn.setAttribute('title', 'Settings');
        }
    }

    // ==================== UI Functions UI功能 ====================
    
    showWelcomeMessages() {
        const teachingWelcome = this.teachingContent.querySelector('.welcome-message-teacher');
        if (teachingWelcome) {
            teachingWelcome.style.display = 'block';
        }
        
        const qaWelcome = this.qaContent.querySelector('.qa-welcome-message');
        if (qaWelcome) {
            qaWelcome.style.display = 'block';
        }
    }

    hideTeachingWelcome() {
        const welcomeMsg = this.teachingContent.querySelector('.welcome-message-teacher');
        if (welcomeMsg && !this.teachingWelcomeHidden) {
            welcomeMsg.style.display = 'none';
            this.teachingWelcomeHidden = true;
        }
    }
    
    hideQAWelcome() {
        const welcomeMsg = this.qaContent.querySelector('.qa-welcome-message');
        if (welcomeMsg && !this.qaWelcomeHidden) {
            welcomeMsg.style.display = 'none';
            this.qaWelcomeHidden = true;
        }
    }

    setTeachingLoading(isLoading) {
        this.startTeachingBtn.disabled = isLoading;
        this.topicInput.disabled = isLoading;
        
        if (isLoading) {
            this.teachingStatus.textContent = 'Preparing lesson...';
            this.teachingStatus.className = 'teaching-status teaching';
        } else {
            this.teachingStatus.textContent = 'Ready to teach...';
            this.teachingStatus.className = 'teaching-status';
        }
    }
    
    setQALoading(isLoading) {
        this.askQuestionBtn.disabled = isLoading;
        this.questionInput.disabled = isLoading;
        
        if (isLoading) {
            this.qaStatus.textContent = 'Thinking...';
            this.qaStatus.className = 'qa-status answering';
            this.askQuestionBtn.textContent = 'Thinking...';
        } else {
            const count = this.conversationHistory.length;
            this.qaStatus.textContent = count > 0 ? `${count} Q&A` : 'Ready for questions...';
            this.qaStatus.className = 'qa-status';
            this.askQuestionBtn.textContent = '✨ Ask Question';
        }
    }

    enableQuestionInput() {
        this.questionInput.disabled = false;
        this.askQuestionBtn.disabled = false;
        this.questionInput.placeholder = 'Type your question about this lesson...';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    // ==================== Image Handling 图片处理 ====================
    
    async handleImageSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select an image file', 'warning');
            return;
        }
        
        // 检查文件大小（4MB限制）
        if (file.size > 4 * 1024 * 1024) {
            this.showNotification('Image too large (max 4MB). Please compress it first.', 'warning');
            return;
        }
        
        try {
            this.uploadImageBtn.disabled = true;
            this.uploadImageBtn.textContent = '⏳ Processing...';
            
            // 压缩图片
            const compressedFile = await this.compressImage(file);
            
            // 转换为base64
            const base64 = await this.fileToBase64(compressedFile);
            
            // 保存图片数据
            this.uploadedImage = {
                data: base64,
                mimeType: file.type,
                name: file.name,
                size: compressedFile.size
            };
            
            // 显示预览
            this.showImagePreview(base64);
            
            // 更新提示
            if (!this.topicInput.value.trim()) {
                this.topicInput.placeholder = 'Topic (optional, AI will analyze the image)';
            }
            
            this.showNotification('Image uploaded successfully!', 'success');
            
        } catch (error) {
            console.error('Image processing error:', error);
            this.showNotification('Failed to process image. Please try again.', 'error');
        } finally {
            this.uploadImageBtn.disabled = false;
            this.uploadImageBtn.textContent = '📷 Upload';
        }
    }
    
    async compressImage(file, maxWidth = 1024, quality = 0.85) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // 计算缩放比例
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // 转换为Blob
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                // 添加文件名
                                blob.name = file.name;
                                resolve(blob);
                            } else {
                                reject(new Error('Canvas to Blob conversion failed'));
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };
                
                img.onerror = () => reject(new Error('Image load failed'));
                img.src = e.target.result;
            };
            
            reader.onerror = () => reject(new Error('File read failed'));
            reader.readAsDataURL(file);
        });
    }
    
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                // 移除 data:image/...;base64, 前缀
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            
            reader.onerror = () => reject(new Error('File read failed'));
            reader.readAsDataURL(file);
        });
    }
    
    showImagePreview(base64) {
        this.previewImg.src = `data:image/jpeg;base64,${base64}`;
        this.imagePreviewSection.style.display = 'block';
    }
    
    removeImage() {
        this.uploadedImage = null;
        this.imagePreviewSection.style.display = 'none';
        this.imageInput.value = '';
        this.topicInput.placeholder = 'Enter a topic to learn... e.g., \'Photosynthesis\', \'Blockchain\'...';
        this.showNotification('Image removed', 'success');
    }

    // ==================== Teaching Functions 教学功能 ====================
    
    async handleStartTeaching() {
        const topic = this.topicInput.value.trim();
        const hasImage = this.uploadedImage !== null;
        
        if (!topic && !hasImage) {
            this.showNotification('Please enter a topic or upload an image', 'warning');
            return;
        }
        
        this.setTeachingLoading(true);
        
        try {
            const requestData = {
                apiKey: this.customApiKey
            };
            
            // 如果有图片
            if (hasImage) {
                requestData.image = this.uploadedImage;
                requestData.topic = topic || 'Please explain this image in detail';
            } else {
                requestData.topic = topic;
            }
            
            const response = await this.requestTeaching(requestData);
            
            this.currentTopic = topic || 'Image Analysis';
            this.currentLesson = response.content;
            this.conversationHistory = [];  // Reset conversation history 重置对话历史
            
            this.displayLesson(response.content, this.currentTopic, hasImage);
            this.enableQuestionInput();
            
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Failed to start lesson, please try again', 'error');
        } finally {
            this.setTeachingLoading(false);
        }
    }

    async requestTeaching(data) {
        const endpoint = data.image ? '/api/teach-with-image' : '/api/teach';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Network response was not ok');
        }

        return await response.json();
    }

    displayLesson(content, topic, hasImage = false) {
        this.hideTeachingWelcome();
        
        // Clear previous content 清除之前的内容
        this.teachingContent.innerHTML = '';
        
        // Create lesson card 创建课程卡片
        const lessonCard = document.createElement('div');
        lessonCard.className = 'lesson-card';
        
        let titleIcon = hasImage ? '📷' : '📚';
        
        lessonCard.innerHTML = `
            <strong class="lesson-title">${titleIcon} ${this.escapeHtml(topic)}</strong>
            <div class="markdown-content lesson-body">${this.renderMarkdown(content)}</div>
        `;
        
        this.teachingContent.appendChild(lessonCard);
        
        // Scroll to top 滚动到顶部
        this.teachingContent.scrollTop = 0;
    }

    // ==================== Q&A Functions 问答功能 ====================
    
    async handleAskQuestion() {
        const question = this.questionInput.value.trim();
        
        if (!question) {
            this.showNotification('Please enter a question', 'warning');
            return;
        }
        
        if (!this.currentTopic) {
            this.showNotification('Please start a lesson first', 'warning');
            return;
        }
        
        this.setQALoading(true);
        
        try {
            // Display student's question 显示学生的问题
            this.displayStudentQuestion(question);
            
            // Get AI's answer 获取AI的回答
            const answerData = await this.requestAnswer(question);
            
            // Display answer 显示回答
            this.displayTeacherAnswer(answerData);
            
            // Add to conversation history 添加到对话历史
            this.conversationHistory.push({
                question: question,
                answer: answerData.answer
            });
            
            // Clear input 清空输入
            this.questionInput.value = '';
            
        } catch (error) {
            console.error('Error asking question:', error);
            this.showNotification('Failed to get answer, please try again', 'error');
        } finally {
            this.setQALoading(false);
        }
    }

    async requestAnswer(question) {
        const response = await fetch('/api/answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                topic: this.currentTopic,
                question: question,
                teachingContext: this.currentLesson,
                conversationHistory: this.conversationHistory,
                apiKey: this.customApiKey
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return await response.json();
    }

    displayStudentQuestion(question) {
        this.hideQAWelcome();
        
        const questionCard = document.createElement('div');
        questionCard.className = 'student-question-card';
        questionCard.innerHTML = `
            <strong>🙋 Your Question:</strong>
            <p>${this.escapeHtml(question)}</p>
        `;
        
        this.qaContent.appendChild(questionCard);
        
        // Scroll to bottom 滚动到底部
        setTimeout(() => {
            this.qaContent.scrollTop = this.qaContent.scrollHeight;
        }, 100);
    }

    displayTeacherAnswer(answerData) {
        const answerCard = document.createElement('div');
        answerCard.className = 'teacher-answer-card';
        
        let answerHTML = `
            <strong>👨‍🏫 Teacher's Answer:</strong>
            <div class="markdown-content">${this.renderMarkdown(answerData.answer)}</div>
        `;
        
        // Add additional context if available 如果有额外信息则添加
        if (answerData.additionalContext && answerData.additionalContext.trim()) {
            answerHTML += `
                <div class="additional-info">
                    <strong>💡 Additional Information:</strong><br>
                    <div class="markdown-content">${this.renderMarkdown(answerData.additionalContext)}</div>
                </div>
            `;
        }
        
        // Add encouragement 添加鼓励语
        if (answerData.encouragement && answerData.encouragement.trim()) {
            answerHTML += `
                <div class="encouragement markdown-content">
                    ${this.renderMarkdown(answerData.encouragement)}
                </div>
            `;
        }
        
        answerCard.innerHTML = answerHTML;
        
        this.qaContent.appendChild(answerCard);
        
        // Scroll to bottom 滚动到底部
        setTimeout(() => {
            this.qaContent.scrollTop = this.qaContent.scrollHeight;
        }, 100);
    }

    handleClearQA() {
        this.qaContent.innerHTML = `
            <div class="qa-welcome-message" style="display: block;">
                <p>🙋 Ask questions here!</p>
                <p>Once the lesson starts, you can ask anything you're curious about.</p>
            </div>
        `;
        this.qaWelcomeHidden = false;
        this.conversationHistory = [];
        this.questionInput.value = '';
        this.qaStatus.textContent = 'No questions yet...';
        this.qaStatus.className = 'qa-status';
    }

    // ==================== Utility Functions 工具函数 ====================
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Start application 启动应用
document.addEventListener('DOMContentLoaded', () => {
    new TeacherModeApp();
});
