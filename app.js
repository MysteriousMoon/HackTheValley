class FeynmanApp {
    constructor() {
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.aiComments = document.getElementById('aiComments');
        this.aiStatus = document.getElementById('aiStatus');
        
        // Smart send related states 智能发送相关状态
        this.autoSendEnabled = true;
        this.lastSentLength = 0;
        this.sentSegments = [];
        this.typingTimer = null;
        this.isProcessing = false;
        
        // Responsive states 响应式状态
        this.isMobile = window.innerWidth <= 767;
        this.isTablet = window.innerWidth <= 1023 && window.innerWidth > 767;
        
        // Welcome message hidden flag, avoid duplicate operations 欢迎消息隐藏标志，避免重复操作
        this.welcomeHidden = false;
        
        // Timer and observer references, for cleanup 定时器和观察者引用，用于清理
        this.zoomCheckInterval = null;
        this.resizeObserver = null;
        
        // Conversation history tracking 对话历史跟踪
        // Key: commentId, Value: array of {question, answer} exchanges commentId为键，值为{question, answer}交换数组
        this.conversationHistories = {};
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.createAutoSendControls();
        this.setupResponsiveHandlers();
        this.optimizeForDevice();
        this.showWelcomeMessage();
    }

    showWelcomeMessage() {
        // Display welcome message 显示欢迎消息
        const welcomeMsg = this.aiComments.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.style.display = 'block';
        }
    }

    hideWelcomeMessage() {
        // Hide welcome message 隐藏欢迎消息
        const welcomeMsg = this.aiComments.querySelector('.welcome-message');
        if (welcomeMsg && !this.welcomeHidden) {
            welcomeMsg.style.display = 'none';
            this.welcomeHidden = true;
        }
    }

    setupResponsiveHandlers() {
        // Listen for screen size changes 监听屏幕尺寸变化
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Listen for device orientation changes 监听设备方向变化
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
        
        // Listen for zoom changes 监听缩放变化
        this.setupZoomDetection();
        
        // Listen for keyboard show/hide (mobile) 监听键盘弹出/收起 (移动端)
        if (this.isMobile) {
            this.setupMobileKeyboardHandlers();
        }
        
        // Listen for container size changes (if ResizeObserver supported) 监听容器尺寸变化 (如果支持 ResizeObserver)
        if (window.ResizeObserver) {
            this.setupContainerObserver();
        }
    }

    setupZoomDetection() {
        // Detect zoom level changes 检测缩放级别变化
        let lastZoom = window.devicePixelRatio;
        
        const checkZoom = () => {
            const currentZoom = window.devicePixelRatio;
            if (Math.abs(currentZoom - lastZoom) > 0.1) {
                lastZoom = currentZoom;
                this.handleZoomChange(currentZoom);
            }
        };
        
        // Periodically check zoom changes, save reference for cleanup 定期检查缩放变化，保存引用以便清理
        this.zoomCheckInterval = setInterval(checkZoom, 500);
        
        // Listen for visual viewport changes (modern browsers) 监听视觉视口变化 (现代浏览器)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                this.handleVisualViewportChange();
            });
        }
    }

    setupContainerObserver() {
        const container = document.querySelector('.container');
        
        if (!container) {
            console.warn('Container not found for ResizeObserver');
            return;
        }
        
        this.resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width } = entry.contentRect;
                this.handleContainerResize(width);
            }
        });
        
        this.resizeObserver.observe(container);
    }

    handleZoomChange(zoomLevel) {
        // Adjust layout when zoom level changes 当缩放级别改变时，调整布局
        const container = document.querySelector('.container');
        
        if (!container) {
            return;
        }
        
        const effectiveWidth = window.innerWidth / zoomLevel;
        
        if (effectiveWidth < 900) {
            container.style.flexDirection = 'column';
            this.optimizeForMobile();
        } else {
            container.style.flexDirection = 'row';
            this.optimizeForDesktop();
        }
        
        console.log(`Zoom level: ${zoomLevel.toFixed(2)}, Effective width: ${effectiveWidth.toFixed(0)}px`);
    }

    handleVisualViewportChange() {
        // Handle visual viewport changes (zoom, keyboard, etc) 处理视觉视口变化 (缩放、键盘等)
        const visualViewport = window.visualViewport;
        const layoutViewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        
        // Calculate zoom ratio 计算缩放比例
        const scale = layoutViewport.width / visualViewport.width;
        
        if (scale !== 1) {
            this.handleZoomChange(scale);
        }
    }

    handleContainerResize(width) {
        // Adjust layout based on actual container width 基于容器实际宽度调整布局
        if (width < 800) {
            this.setCompactLayout(true);
        } else {
            this.setCompactLayout(false);
        }
    }

    setCompactLayout(isCompact) {
        const container = document.querySelector('.container');
        const inputSection = document.querySelector('.input-section');
        const aiSection = document.querySelector('.ai-section');
        
        if (isCompact) {
            container.style.flexDirection = 'column';
            container.style.gap = '16px';
            
            if (inputSection) {
                inputSection.style.padding = '20px';
            }
            if (aiSection) {
                aiSection.style.padding = '20px';
            }
            
            // 调整输入框高度
            if (this.userInput) {
                this.userInput.style.height = '200px';
            }
        } else {
            container.style.flexDirection = 'row';
            container.style.gap = '24px';
            
            if (inputSection) {
                inputSection.style.padding = '28px';
            }
            if (aiSection) {
                aiSection.style.padding = '28px';
            }
            
            // 恢复默认高度
            if (this.userInput) {
                this.userInput.style.height = '';
            }
        }
    }

    handleResize() {
        const wasMobile = this.isMobile;
        const wasTablet = this.isTablet;
        
        this.isMobile = window.innerWidth <= 767;
        this.isTablet = window.innerWidth <= 1023 && window.innerWidth > 767;
        
        // If device type changed, re-optimize 如果设备类型发生变化，重新优化
        if (wasMobile !== this.isMobile || wasTablet !== this.isTablet) {
            this.optimizeForDevice();
        }
        
        // Adjust textarea height 调整文本区域高度
        this.adjustTextareaHeight();
    }

    handleOrientationChange() {
        // Adjust layout for landscape 横屏时调整布局
        if (window.orientation === 90 || window.orientation === -90) {
            // Landscape mode 横屏模式
            if (this.isMobile) {
                this.userInput.style.height = '120px';
            }
        } else {
            // Portrait mode 竖屏模式
            this.optimizeForDevice();
        }
    }

    setupMobileKeyboardHandlers() {
        let initialViewportHeight = window.innerHeight;
        
        // Detect virtual keyboard 检测虚拟键盘
        const detectKeyboard = () => {
            const currentHeight = window.innerHeight;
            const heightDiff = initialViewportHeight - currentHeight;
            
            if (heightDiff > 150) {
                // Keyboard shown 键盘弹出
                document.body.classList.add('keyboard-visible');
                this.adjustForKeyboard(true);
            } else {
                // Keyboard hidden 键盘收起
                document.body.classList.remove('keyboard-visible');
                this.adjustForKeyboard(false);
            }
        };
        
        window.addEventListener('resize', detectKeyboard);
        
        // When input field gains focus 输入框获得焦点时
        this.userInput.addEventListener('focus', () => {
            if (this.isMobile) {
                setTimeout(detectKeyboard, 300);
            }
        });
    }

    adjustForKeyboard(keyboardVisible) {
        if (keyboardVisible) {
            // Optimization when keyboard shown 键盘弹出时的优化
            this.userInput.style.height = '100px';
            
            // Scroll to input field 滚动到输入框
            setTimeout(() => {
                this.userInput.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 300);
        } else {
            // Restore when keyboard hidden 键盘收起时恢复
            this.optimizeForDevice();
        }
    }

    optimizeForDevice() {
        if (this.isMobile) {
            this.optimizeForMobile();
        } else if (this.isTablet) {
            this.optimizeForTablet();
        } else {
            this.optimizeForDesktop();
        }
        
        // Show debug info (development mode) 显示调试信息 (开发模式)
        if (window.location.search.includes('debug=true')) {
            this.showResponsiveDebugInfo();
        }
    }

    showResponsiveDebugInfo() {
        let debugInfo = document.getElementById('responsive-debug');
        
        if (!debugInfo) {
            debugInfo = document.createElement('div');
            debugInfo.id = 'responsive-debug';
            debugInfo.style.cssText = `
                position: fixed;
                top: 10px;
                left: 10px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 10px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 12px;
                z-index: 9999;
                max-width: 300px;
            `;
            document.body.appendChild(debugInfo);
        }
        
        const container = document.querySelector('.container');
        const containerRect = container.getBoundingClientRect();
        
        debugInfo.innerHTML = `
            <strong>Responsive Debug Info:</strong><br>
            Viewport: ${window.innerWidth} × ${window.innerHeight}<br>
            Container: ${containerRect.width.toFixed(0)} × ${containerRect.height.toFixed(0)}<br>
            Zoom: ${window.devicePixelRatio.toFixed(2)}<br>
            Layout: ${container.style.flexDirection || 'row'}<br>
            Device: ${this.isMobile ? 'Mobile' : this.isTablet ? 'Tablet' : 'Desktop'}<br>
            Touch: ${('ontouchstart' in window) ? 'Yes' : 'No'}
        `;
    }

    optimizeForMobile() {
        // Mobile-specific optimizations 移动端特定优化
        this.userInput.style.height = '180px';
        
        // Prevent iOS zooming 防止iOS缩放
        this.userInput.style.fontSize = '16px';
        
        // Optimize touch experience 优化触摸体验
        this.addTouchOptimizations();
    }

    optimizeForTablet() {
        // Tablet optimizations 平板端优化
        this.userInput.style.height = '280px';
        this.userInput.style.fontSize = '16px';
    }

    optimizeForDesktop() {
        // Desktop optimizations - let CSS control height 桌面端优化 - 让CSS控制高度
        this.userInput.style.height = '';
        this.userInput.style.fontSize = '16px';
    }

    addTouchOptimizations() {
        // Add touch feedback 添加触摸反馈
        const buttons = document.querySelectorAll('.send-btn, .clear-btn, .response-btn, .skip-btn');
        
        buttons.forEach(button => {
            button.addEventListener('touchstart', (e) => {
                button.style.transform = 'scale(0.95)';
            });
            
            button.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    button.style.transform = '';
                }, 150);
            });
        });
    }

    adjustTextareaHeight() {
        // Dynamically adjust textarea height 动态调整文本区域高度
        const container = document.querySelector('.container');
        const containerHeight = container.clientHeight;
        const availableHeight = window.innerHeight - 200; // Subtract header and padding 减去header和padding
        
        if (this.isMobile && containerHeight > availableHeight) {
            this.userInput.style.height = Math.max(120, availableHeight * 0.3) + 'px';
        }
    }

    createAutoSendControls() {
        // Add smart send controls to input area 在输入区域添加智能发送控制
        const controlsDiv = document.querySelector('.input-controls');
        
        if (!controlsDiv) {
            console.warn('Input controls div not found');
            return;
        }
        
        const autoSendToggle = document.createElement('div');
        autoSendToggle.className = 'auto-send-controls';
        autoSendToggle.innerHTML = `
            <label class="auto-send-toggle">
                <input type="checkbox" id="autoSendCheckbox" ${this.autoSendEnabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
                <span class="toggle-label">Auto Send</span>
            </label>
            <div class="auto-send-status" id="autoSendStatus">
                Ready
            </div>
        `;
        
        controlsDiv.insertBefore(autoSendToggle, controlsDiv.firstChild);
        
        // Bind switch event 绑定开关事件
        const checkbox = document.getElementById('autoSendCheckbox');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                this.autoSendEnabled = e.target.checked;
                this.updateAutoSendStatus();
            });
        }
    }

    bindEvents() {
        this.sendBtn.addEventListener('click', () => this.handleManualSend());
        this.clearBtn.addEventListener('click', () => this.handleClear());
        
        // Smart input listening 智能输入监听
        this.userInput.addEventListener('input', () => this.handleInputChange());
        this.userInput.addEventListener('paste', () => {
            setTimeout(() => this.handleInputChange(), 100);
        });
        
        // Support Ctrl+Enter to send 支持Ctrl+Enter发送
        this.userInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.handleManualSend();
            }
        });
    }

    handleInputChange() {
        if (!this.autoSendEnabled || this.isProcessing) return;
        
        // Clear previous timer 清除之前的定时器
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
        }
        
        // Set new timer, check after user stops typing for 1 second 设置新的定时器，用户停止输入1秒后检查
        this.typingTimer = setTimeout(() => {
            this.checkAutoSend();
        }, 1000);
        
        this.updateAutoSendStatus();
    }

    checkAutoSend() {
        const currentContent = this.userInput.value.trim();
        const newContent = currentContent.substring(this.lastSentLength);
        
        if (!newContent) return;
        
        const shouldSend = this.shouldTriggerAutoSend(newContent, currentContent);
        
        if (shouldSend) {
            this.handleAutoSend(currentContent); // Send all content 发送全部内容
        }
    }

    shouldTriggerAutoSend(newContent, fullContent) {
        // Trigger condition: more than 100 characters and ends with period (Chinese or English) 触发条件：100个字以上且以句号（中文或英文）结尾
        const contentLength = this.getContentLength(newContent);
        const endsWithPeriod = /[。\.]$/.test(newContent.trim());
        
        return contentLength >= 100 && endsWithPeriod;
    }

    getContentLength(text) {
        // Intelligently calculate content length (Chinese characters + English words) 智能计算内容长度（中文字符 + 英文单词）
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
        return chineseChars + englishWords;
    }

    async handleAutoSend(fullContent) {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.updateAutoSendStatus('Analyzing...');
        
        try {
            // Use unified analysis interface, pass isSegment identifier 使用统一的分析接口，传入isSegment标识
            const response = await this.sendToAI(fullContent, true);
            
            // Display AI's real-time feedback 显示AI的实时反馈
            this.displaySegmentComments(response.comments, fullContent);
            
            // Update sent length 更新已发送长度
            this.lastSentLength = this.userInput.value.trim().length;
            this.sentSegments.push({
                content: fullContent,
                timestamp: Date.now(),
                comments: response.comments
            });
            
        } catch (error) {
            console.error('Auto send error:', error);
            this.updateAutoSendStatus('Analysis failed');
        } finally {
            this.isProcessing = false;
            setTimeout(() => this.updateAutoSendStatus(), 2000);
        }
    }

    async handleManualSend() {
        const content = this.userInput.value.trim();
        if (!content) {
            this.showNotification('Please enter content to explain', 'warning');
            return;
        }
        
        this.setLoading(true);
        
        try {
            // 使用统一的分析接口，传入isFinal标识
            const response = await this.sendToAI(content, false, true);
            
            this.displayFinalComments(response.comments);
            this.resetAutoSendState();
        } catch (error) {
            console.error('Error:', error);
            this.displayError('AI annotation failed, please try again');
        } finally {
            this.setLoading(false);
        }
    }

    async sendToAI(content, isSegment = false, isFinal = false) {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                content,
                isSegment,  // Whether it's segmented analysis 是否为分段分析
                isFinal     // Whether it's final analysis 是否为最终分析
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return await response.json();
    }

    displaySegmentComments(comments, segmentContent) {
        // Hide welcome prompt when analysis results first appear 首次出现分析结果时隐藏欢迎提示
        this.hideWelcomeMessage();
        // Add segment identifier 添加分段标识
        const segmentDiv = document.createElement('div');
        segmentDiv.className = 'segment-divider';
        segmentDiv.innerHTML = `
            <div class="segment-info">
                <span class="segment-icon">📝</span>
                <span class="segment-text">Real-time Analysis - ${new Date().toLocaleTimeString()}</span>
            </div>
        `;
        this.aiComments.appendChild(segmentDiv);
        
        // Display comments 显示评论
        comments.forEach((comment, index) => {
            setTimeout(() => {
                const commentDiv = document.createElement('div');
                commentDiv.className = `ai-comment ${comment.type} segment-comment`;
                
                // Create content container 创建内容容器
                const contentDiv = document.createElement('div');
                contentDiv.className = 'comment-content';
                contentDiv.innerHTML = `
                    <strong>${this.getCommentIcon(comment.type)} ${comment.title}</strong>
                    <p>${comment.content}</p>
                `;
                commentDiv.appendChild(contentDiv);
                
                if (comment.needsResponse) {
                    const responseSection = this.createResponseSection(comment.id || `seg_${Date.now()}_${index}`);
                    commentDiv.appendChild(responseSection);
                }
                
                this.aiComments.appendChild(commentDiv);
                this.aiComments.scrollTop = this.aiComments.scrollHeight;
            }, index * 300);
        });
    }

    displayFinalComments(comments) {
        // Ensure welcome message is hidden before final comprehensive analysis (fallback) 确保最终综合分析前也隐藏欢迎信息（兜底）
        this.hideWelcomeMessage();
        // Add final analysis identifier 添加最终分析标识
        const finalDiv = document.createElement('div');
        finalDiv.className = 'final-analysis-divider';
        finalDiv.innerHTML = `
            <div class="final-info">
                <span class="final-icon">🎯</span>
                <span class="final-text">Comprehensive Analysis</span>
            </div>
        `;
        this.aiComments.appendChild(finalDiv);
        
        // Display final comments 显示最终评论
        comments.forEach((comment, index) => {
            setTimeout(() => {
                const commentDiv = document.createElement('div');
                commentDiv.className = `ai-comment ${comment.type} final-comment`;
                
                // Create content container 创建内容容器
                const contentDiv = document.createElement('div');
                contentDiv.className = 'comment-content';
                contentDiv.innerHTML = `
                    <strong>${this.getCommentIcon(comment.type)} ${comment.title}</strong>
                    <p>${comment.content}</p>
                `;
                commentDiv.appendChild(contentDiv);
                
                if (comment.needsResponse) {
                    const responseSection = this.createResponseSection(comment.id || `final_${Date.now()}_${index}`);
                    commentDiv.appendChild(responseSection);
                }
                
                this.aiComments.appendChild(commentDiv);
                this.aiComments.scrollTop = this.aiComments.scrollHeight;
            }, index * 300);
        });
    }

    updateAutoSendStatus(status = null) {
        const statusElement = document.getElementById('autoSendStatus');
        if (!statusElement) return;
        
        if (status) {
            statusElement.textContent = status;
            return;
        }
        
        if (!this.autoSendEnabled) {
            statusElement.textContent = 'Disabled';
            statusElement.className = 'auto-send-status disabled';
            return;
        }
        
        const currentContent = this.userInput.value.trim();
        const newContent = currentContent.substring(this.lastSentLength);
        const length = this.getContentLength(newContent);
        
        if (length === 0) {
            statusElement.textContent = 'Ready';
            statusElement.className = 'auto-send-status ready';
        } else if (length < 50) {
            statusElement.textContent = `Typing (${length}/50)`;
            statusElement.className = 'auto-send-status typing';
        } else {
            statusElement.textContent = `Sufficient length (${length}/50) - Analysis on period`;
            statusElement.className = 'auto-send-status pending';
        }
    }

    resetAutoSendState() {
        this.lastSentLength = 0;
        this.sentSegments = [];
        this.isProcessing = false;
        this.conversationHistories = {};  // Clear all conversation histories 清除所有对话历史
        this.updateAutoSendStatus();
    }

    handleClear() {
        this.userInput.value = '';
        this.aiComments.innerHTML = `
            <div class="welcome-message" style="display: block;">
                <p>👋 Hello! I'm your AI student.</p>
                <p>Please start explaining the topic, I will listen carefully and ask questions!</p>
            </div>
        `;
        this.welcomeHidden = false; // Reset welcome message flag 重置欢迎消息标志
        this.resetAutoSendState();
    }

    displayAIComments(comments) {
        this.aiComments.innerHTML = '';
        
        comments.forEach((comment, index) => {
            setTimeout(() => {
                const commentDiv = document.createElement('div');
                commentDiv.className = `ai-comment ${comment.type}`;
                
                // 创建内容容器
                const contentDiv = document.createElement('div');
                contentDiv.className = 'comment-content';
                contentDiv.innerHTML = `
                    <strong>${this.getCommentIcon(comment.type)} ${comment.title}</strong>
                    <p>${comment.content}</p>
                `;
                commentDiv.appendChild(contentDiv);
                
                // 如果AI需要用户回应，添加回复输入框
                if (comment.needsResponse) {
                    const responseSection = this.createResponseSection(comment.id || index);
                    commentDiv.appendChild(responseSection);
                }
                
                this.aiComments.appendChild(commentDiv);
                this.aiComments.scrollTop = this.aiComments.scrollHeight;
            }, index * 500); // 延迟显示每个评论
        });
    }

    createResponseSection(commentId) {
        const responseDiv = document.createElement('div');
        responseDiv.className = 'response-section';
        responseDiv.innerHTML = `
            <div class="response-prompt">
                <span class="response-icon">💬</span>
                <span class="response-text">Please continue explaining this question:</span>
            </div>
            <textarea 
                class="response-input" 
                placeholder="Answer the AI student's question here..."
                rows="3"
                data-comment-id="${commentId}"
            ></textarea>
            <div class="response-controls">
                <button class="response-btn" data-comment-id="${commentId}">
                    ✨ Answer Question
                </button>
                <button class="skip-btn" data-comment-id="${commentId}">
                    ⏭️ Skip
                </button>
            </div>
        `;
        
        // 绑定事件
        this.bindResponseEvents(responseDiv);
        
        return responseDiv;
    }

    bindResponseEvents(responseDiv) {
        const responseBtn = responseDiv.querySelector('.response-btn');
        const skipBtn = responseDiv.querySelector('.skip-btn');
        const responseInput = responseDiv.querySelector('.response-input');
        
        responseBtn.addEventListener('click', async (e) => {
            const commentId = e.target.dataset.commentId;
            const response = responseInput.value.trim();
            
            if (!response) {
                this.showNotification('Please enter an answer', 'warning');
                return;
            }
            
            await this.handleResponse(commentId, response, responseDiv);
        });
        
        skipBtn.addEventListener('click', (e) => {
            const commentId = e.target.dataset.commentId;
            this.skipResponse(commentId, responseDiv);
        });
        
        // 支持 Ctrl+Enter 快速回答
        responseInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                responseBtn.click();
            }
        });
    }

    async handleResponse(commentId, response, responseDiv) {
        try {
            // Disable controls 禁用控件
            this.setResponseLoading(responseDiv, true);
            
            // Get original question content (find from parent element) 获取原始问题内容（从父元素中找到）
            const commentDiv = responseDiv.closest('.ai-comment');
            const originalQuestion = commentDiv ? commentDiv.querySelector('p').textContent : '';
            
            // Extract base comment ID (remove _followup_* suffix) 提取基础评论ID（移除_followup_*后缀）
            const baseCommentId = commentId.split('_followup_')[0];
            
            // Get conversation history for this comment thread 获取此评论线程的对话历史
            const conversationHistory = this.conversationHistories[baseCommentId] || [];
            
            // Send answer to AI with conversation history 发送回答到AI，包含对话历史
            const aiReply = await this.sendResponse(commentId, response, originalQuestion, conversationHistory);
            
            // Add current exchange to conversation history 将当前交换添加到对话历史
            if (!this.conversationHistories[baseCommentId]) {
                this.conversationHistories[baseCommentId] = [];
            }
            this.conversationHistories[baseCommentId].push({
                question: originalQuestion,
                answer: response
            });
            
            // Display different feedback based on AI's understanding status 根据AI的理解状态显示不同的反馈
            if (aiReply.understood) {
                // AI fully understood, show satisfied feedback, no more follow-up AI完全理解了，显示满意的反馈，不再追问
                this.displayFinalFeedback(responseDiv, aiReply.feedback);
                // Clear conversation history for this thread when understood 理解后清除此线程的对话历史
                delete this.conversationHistories[baseCommentId];
            } else {
                // AI still has confusion, show feedback and continue follow-up (pass commentDiv to create follow-up outside) AI还有困惑，显示反馈并继续追问（传入commentDiv以便在外面创建追问）
                this.displayFollowUpFeedback(responseDiv, commentDiv, aiReply.feedback, aiReply.followUpQuestion, commentId);
            }
            
        } catch (error) {
            console.error('Error handling response:', error);
            this.showNotification('Answer processing failed, please try again', 'error');
        } finally {
            this.setResponseLoading(responseDiv, false);
        }
    }

    async sendResponse(commentId, response, originalQuestion = '', conversationHistory = []) {
        const apiResponse = await fetch('/api/respond', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                commentId,
                response,
                originalQuestion,
                conversationHistory  // Include conversation history 包含对话历史
            })
        });

        if (!apiResponse.ok) {
            throw new Error('Network response was not ok');
        }

        return await apiResponse.json();
    }

    displayResponseFeedback(responseDiv, feedback) {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'response-feedback';
        feedbackDiv.innerHTML = `
            <div class="feedback-header">
                <span class="feedback-title">AI Student Reply:</span>
            </div>
            <p class="feedback-content">${feedback.content}</p>
        `;
        
        // Replace controls area 替换控件区域
        const controlsDiv = responseDiv.querySelector('.response-controls');
        responseDiv.replaceChild(feedbackDiv, controlsDiv);
        
        // Scroll to feedback position 滚动到反馈位置
        setTimeout(() => {
            feedbackDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }

    displayFinalFeedback(responseDiv, feedbackText) {
        // AI fully understood, show satisfied feedback AI完全理解了，显示满意的反馈
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'response-feedback understood';
        feedbackDiv.innerHTML = `
            <div class="feedback-header">
                <span class="feedback-icon">✅</span>
                <span class="feedback-title">AI Student's Understanding:</span>
            </div>
            <p class="feedback-content">${feedbackText}</p>
            <div class="understood-badge">
                <span class="badge-icon">🎉</span>
                <span class="badge-text">Fully understood! This question is resolved.</span>
            </div>
        `;
        
        // Replace input area and controls 替换输入区域和控件
        const inputArea = responseDiv.querySelector('.response-input');
        const controlsDiv = responseDiv.querySelector('.response-controls');
        
        if (inputArea) inputArea.style.display = 'none';
        if (controlsDiv) {
            responseDiv.replaceChild(feedbackDiv, controlsDiv);
        } else {
            responseDiv.appendChild(feedbackDiv);
        }
        
        // Scroll to feedback position 滚动到反馈位置
        setTimeout(() => {
            feedbackDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }

    displayFollowUpFeedback(responseDiv, currentCommentDiv, feedbackText, followUpQuestion, commentId) {
        // AI still has confusion, first show feedback at current position AI还有困惑，先在当前位置显示反馈
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'response-feedback follow-up';
        feedbackDiv.innerHTML = `
            <div class="feedback-header">
                <span class="feedback-icon">🤔</span>
                <span class="feedback-title">AI Student's Feedback:</span>
            </div>
            <p class="feedback-content">${feedbackText}</p>
            <div class="understood-badge partial">
                <span class="badge-icon">💭</span>
                <span class="badge-text">Partially understood, but still have questions</span>
            </div>
        `;
        
        // Replace original input area and controls 替换原来的输入区域和控件
        const inputArea = responseDiv.querySelector('.response-input');
        const controlsDiv = responseDiv.querySelector('.response-controls');
        
        if (inputArea) inputArea.style.display = 'none';
        if (controlsDiv) {
            responseDiv.replaceChild(feedbackDiv, controlsDiv);
        } else {
            responseDiv.appendChild(feedbackDiv);
        }
        
        // Create follow-up section (to be appended to end of original question comment, parallel with other follow-ups) 创建追问部分（要追加到原始问题评论的末尾，与其他追问平行）
        const followUpSection = document.createElement('div');
        followUpSection.className = 'follow-up-nested-section';
        
        // Directly create divider 直接创建分隔线
        const divider = document.createElement('div');
        divider.className = 'follow-up-divider';
        followUpSection.appendChild(divider);
        
        // Create follow-up question box 创建追问问题框
        const questionBox = document.createElement('div');
        questionBox.className = 'follow-up-question-box';
        questionBox.innerHTML = `
            <div class="follow-up-header">
                <span class="follow-up-icon">❓</span>
                <span class="follow-up-title">AI Student's Follow-up Question:</span>
            </div>
            <p class="follow-up-question">${followUpQuestion}</p>
        `;
        followUpSection.appendChild(questionBox);
        
        // Create new response area 创建新的回应区域
        const newCommentId = `${commentId}_followup_${Date.now()}`;
        const newResponseSection = this.createResponseSection(newCommentId);
        followUpSection.appendChild(newResponseSection);
        
        // Find top-level comment div (original question), append new follow-up to its end 找到最顶层的评论div（原始问题），将新追问追加到它的末尾
        // This way all follow-ups are direct children of original question, keeping them parallel 这样所有追问都是原始问题的直接子元素，保持平行
        if (currentCommentDiv) {
            currentCommentDiv.appendChild(followUpSection);
        } else {
            // Fallback: if parent comment not found, append to current responseDiv 兜底：如果找不到父评论，就追加到当前responseDiv
            responseDiv.appendChild(followUpSection);
        }
        
        // Don't auto-scroll, let user stay at current position to view feedback 不自动滚动，让用户保持在当前位置查看反馈
    }

    skipResponse(commentId, responseDiv) {
        const skipDiv = document.createElement('div');
        skipDiv.className = 'response-skipped';
        skipDiv.innerHTML = `
            <span class="skip-icon">⏭️</span>
            <span class="skip-text">Question skipped</span>
        `;
        
        const controlsDiv = responseDiv.querySelector('.response-controls');
        responseDiv.replaceChild(skipDiv, controlsDiv);
    }

    setResponseLoading(responseDiv, isLoading) {
        const responseBtn = responseDiv.querySelector('.response-btn');
        const responseInput = responseDiv.querySelector('.response-input');
        
        if (responseBtn) {
            responseBtn.disabled = isLoading;
            responseBtn.textContent = isLoading ? 'Thinking...' : '✨ Answer Question';
        }
        
        if (responseInput) {
            responseInput.disabled = isLoading;
        }
    }

    // Cleanup resources method, prevent memory leaks 清理资源方法，防止内存泄漏
    destroy() {
        // Cleanup timers 清理定时器
        if (this.zoomCheckInterval) {
            clearInterval(this.zoomCheckInterval);
            this.zoomCheckInterval = null;
        }
        
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
            this.typingTimer = null;
        }
        
        // Cleanup observers 清理观察者
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page 添加到页面
        document.body.appendChild(notification);
        
        // Show animation 显示动画
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto remove 自动移除
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    getCommentIcon(type) {
        const icons = {
            'question': '❓',
            'concern': '⚠️',
            'clarification': '🤔',
            'praise': '👏'
        };
        return icons[type] || '💭';
    }

    displayError(message) {
        this.aiComments.innerHTML = `
            <div class="ai-comment concern">
                <strong>⚠️ Error</strong>
                <p>${message}</p>
            </div>
        `;
    }

    setLoading(isLoading) {
        this.sendBtn.disabled = isLoading;
        
        if (isLoading) {
            this.aiStatus.textContent = 'Thinking...';
            this.aiStatus.className = 'ai-status thinking';
        } else {
            this.aiStatus.textContent = 'Waiting...';
            this.aiStatus.className = 'ai-status';
        }
    }
}

// Start application 启动应用
document.addEventListener('DOMContentLoaded', () => {
    new FeynmanApp();
});