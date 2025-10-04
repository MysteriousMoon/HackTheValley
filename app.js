class FeynmanApp {
    constructor() {
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.aiComments = document.getElementById('aiComments');
        this.aiStatus = document.getElementById('aiStatus');
        
        // 智能发送相关状态
        this.autoSendEnabled = true;
        this.lastSentLength = 0;
        this.sentSegments = [];
        this.typingTimer = null;
        this.isProcessing = false;
        
        // 响应式状态
        this.isMobile = window.innerWidth <= 767;
        this.isTablet = window.innerWidth <= 1023 && window.innerWidth > 767;
        
        // 欢迎消息隐藏标志，避免重复操作
        this.welcomeHidden = false;
        
        // 定时器和观察者引用，用于清理
        this.zoomCheckInterval = null;
        this.resizeObserver = null;
        
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
        // 显示欢迎消息
        const welcomeMsg = this.aiComments.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.style.display = 'block';
        }
    }

    hideWelcomeMessage() {
        // 隐藏欢迎消息
        const welcomeMsg = this.aiComments.querySelector('.welcome-message');
        if (welcomeMsg && !this.welcomeHidden) {
            welcomeMsg.style.display = 'none';
            this.welcomeHidden = true;
        }
    }

    setupResponsiveHandlers() {
        // 监听屏幕尺寸变化
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // 监听设备方向变化
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
        
        // 监听缩放变化
        this.setupZoomDetection();
        
        // 监听键盘弹出/收起 (移动端)
        if (this.isMobile) {
            this.setupMobileKeyboardHandlers();
        }
        
        // 监听容器尺寸变化 (如果支持 ResizeObserver)
        if (window.ResizeObserver) {
            this.setupContainerObserver();
        }
    }

    setupZoomDetection() {
        // 检测缩放级别变化
        let lastZoom = window.devicePixelRatio;
        
        const checkZoom = () => {
            const currentZoom = window.devicePixelRatio;
            if (Math.abs(currentZoom - lastZoom) > 0.1) {
                lastZoom = currentZoom;
                this.handleZoomChange(currentZoom);
            }
        };
        
        // 定期检查缩放变化，保存引用以便清理
        this.zoomCheckInterval = setInterval(checkZoom, 500);
        
        // 监听视觉视口变化 (现代浏览器)
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
        // 当缩放级别改变时，调整布局
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
        // 处理视觉视口变化 (缩放、键盘等)
        const visualViewport = window.visualViewport;
        const layoutViewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        
        // 计算缩放比例
        const scale = layoutViewport.width / visualViewport.width;
        
        if (scale !== 1) {
            this.handleZoomChange(scale);
        }
    }

    handleContainerResize(width) {
        // 基于容器实际宽度调整布局
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
            
            // 调整AI批注区域高度
            if (this.aiComments) {
                this.aiComments.style.maxHeight = '300px';
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
                this.userInput.style.height = '350px';
            }
            
            if (this.aiComments) {
                this.aiComments.style.maxHeight = '450px';
            }
        }
    }

    handleResize() {
        const wasMobile = this.isMobile;
        const wasTablet = this.isTablet;
        
        this.isMobile = window.innerWidth <= 767;
        this.isTablet = window.innerWidth <= 1023 && window.innerWidth > 767;
        
        // 如果设备类型发生变化，重新优化
        if (wasMobile !== this.isMobile || wasTablet !== this.isTablet) {
            this.optimizeForDevice();
        }
        
        // 调整文本区域高度
        this.adjustTextareaHeight();
    }

    handleOrientationChange() {
        // 横屏时调整布局
        if (window.orientation === 90 || window.orientation === -90) {
            // 横屏模式
            if (this.isMobile) {
                this.userInput.style.height = '120px';
                this.aiComments.style.maxHeight = '150px';
            }
        } else {
            // 竖屏模式
            this.optimizeForDevice();
        }
    }

    setupMobileKeyboardHandlers() {
        let initialViewportHeight = window.innerHeight;
        
        // 检测虚拟键盘
        const detectKeyboard = () => {
            const currentHeight = window.innerHeight;
            const heightDiff = initialViewportHeight - currentHeight;
            
            if (heightDiff > 150) {
                // 键盘弹出
                document.body.classList.add('keyboard-visible');
                this.adjustForKeyboard(true);
            } else {
                // 键盘收起
                document.body.classList.remove('keyboard-visible');
                this.adjustForKeyboard(false);
            }
        };
        
        window.addEventListener('resize', detectKeyboard);
        
        // 输入框获得焦点时
        this.userInput.addEventListener('focus', () => {
            if (this.isMobile) {
                setTimeout(detectKeyboard, 300);
            }
        });
    }

    adjustForKeyboard(keyboardVisible) {
        if (keyboardVisible) {
            // 键盘弹出时的优化
            this.userInput.style.height = '100px';
            this.aiComments.style.maxHeight = '120px';
            
            // 滚动到输入框
            setTimeout(() => {
                this.userInput.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 300);
        } else {
            // 键盘收起时恢复
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
        
        // 显示调试信息 (开发模式)
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
        // 移动端特定优化
        this.userInput.style.height = '180px';
        this.aiComments.style.maxHeight = '220px';
        
        // 防止iOS缩放
        this.userInput.style.fontSize = '16px';
        
        // 优化触摸体验
        this.addTouchOptimizations();
    }

    optimizeForTablet() {
        // 平板端优化
        this.userInput.style.height = '280px';
        this.aiComments.style.maxHeight = '320px';
        this.userInput.style.fontSize = '16px';
    }

    optimizeForDesktop() {
        // 桌面端优化
        this.userInput.style.height = '350px';
        this.aiComments.style.maxHeight = '450px';
        this.userInput.style.fontSize = '16px';
    }

    addTouchOptimizations() {
        // 添加触摸反馈
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
        // 动态调整文本区域高度
        const container = document.querySelector('.container');
        const containerHeight = container.clientHeight;
        const availableHeight = window.innerHeight - 200; // 减去header和padding
        
        if (this.isMobile && containerHeight > availableHeight) {
            this.userInput.style.height = Math.max(120, availableHeight * 0.3) + 'px';
            this.aiComments.style.maxHeight = Math.max(150, availableHeight * 0.4) + 'px';
        }
    }

    createAutoSendControls() {
        // 在输入区域添加智能发送控制
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
                <span class="toggle-label">🤖 Smart Follow-up</span>
            </label>
            <div class="auto-send-status" id="autoSendStatus">
                Ready
            </div>
        `;
        
        controlsDiv.insertBefore(autoSendToggle, controlsDiv.firstChild);
        
        // 绑定开关事件
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
        
        // 智能输入监听
        this.userInput.addEventListener('input', () => this.handleInputChange());
        this.userInput.addEventListener('paste', () => {
            setTimeout(() => this.handleInputChange(), 100);
        });
        
        // 支持Ctrl+Enter发送
        this.userInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.handleManualSend();
            }
        });
    }

    handleInputChange() {
        if (!this.autoSendEnabled || this.isProcessing) return;
        
        // 清除之前的定时器
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
        }
        
        // 设置新的定时器，用户停止输入1秒后检查
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
            this.handleAutoSend(currentContent); // 发送全部内容
        }
    }

    shouldTriggerAutoSend(newContent, fullContent) {
        // 触发条件：50个字以上且以句号（中文或英文）结尾
        const contentLength = this.getContentLength(newContent);
        const endsWithPeriod = /[。\.]$/.test(newContent.trim());
        
        return contentLength >= 50 && endsWithPeriod;
    }

    getContentLength(text) {
        // 智能计算内容长度（中文字符 + 英文单词）
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
        return chineseChars + englishWords;
    }

    async handleAutoSend(fullContent) {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.updateAutoSendStatus('Analyzing...');
        
        try {
            // 使用统一的分析接口，传入isSegment标识
            const response = await this.sendToAI(fullContent, true);
            
            // 显示AI的实时反馈
            this.displaySegmentComments(response.comments, fullContent);
            
            // 更新已发送长度
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
                isSegment,  // 是否为分段分析
                isFinal     // 是否为最终分析
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return await response.json();
    }

    displaySegmentComments(comments, segmentContent) {
        // 首次出现分析结果时隐藏欢迎提示
        this.hideWelcomeMessage();
        // 添加分段标识
        const segmentDiv = document.createElement('div');
        segmentDiv.className = 'segment-divider';
        segmentDiv.innerHTML = `
            <div class="segment-info">
                <span class="segment-icon">📝</span>
                <span class="segment-text">Real-time Analysis - ${new Date().toLocaleTimeString()}</span>
            </div>
        `;
        this.aiComments.appendChild(segmentDiv);
        
        // 显示评论
        comments.forEach((comment, index) => {
            setTimeout(() => {
                const commentDiv = document.createElement('div');
                commentDiv.className = `ai-comment ${comment.type} segment-comment`;
                commentDiv.innerHTML = `
                    <strong>${this.getCommentIcon(comment.type)} ${comment.title}</strong>
                    <p>${comment.content}</p>
                `;
                
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
        // 确保最终综合分析前也隐藏欢迎信息（兜底）
        this.hideWelcomeMessage();
        // 添加最终分析标识
        const finalDiv = document.createElement('div');
        finalDiv.className = 'final-analysis-divider';
        finalDiv.innerHTML = `
            <div class="final-info">
                <span class="final-icon">🎯</span>
                <span class="final-text">Comprehensive Analysis</span>
            </div>
        `;
        this.aiComments.appendChild(finalDiv);
        
        // 显示最终评论
        comments.forEach((comment, index) => {
            setTimeout(() => {
                const commentDiv = document.createElement('div');
                commentDiv.className = `ai-comment ${comment.type} final-comment`;
                commentDiv.innerHTML = `
                    <strong>${this.getCommentIcon(comment.type)} ${comment.title}</strong>
                    <p>${comment.content}</p>
                `;
                
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
        this.welcomeHidden = false; // 重置欢迎消息标志
        this.resetAutoSendState();
    }

    displayAIComments(comments) {
        this.aiComments.innerHTML = '';
        
        comments.forEach((comment, index) => {
            setTimeout(() => {
                const commentDiv = document.createElement('div');
                commentDiv.className = `ai-comment ${comment.type}`;
                commentDiv.innerHTML = `
                    <strong>${this.getCommentIcon(comment.type)} ${comment.title}</strong>
                    <p>${comment.content}</p>
                `;
                
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
            // 禁用控件
            this.setResponseLoading(responseDiv, true);
            
            // 发送回答到AI
            const aiReply = await this.sendResponse(commentId, response);
            
            // 显示AI的后续反馈
            this.displayResponseFeedback(responseDiv, aiReply);
            
        } catch (error) {
            console.error('Error handling response:', error);
            this.showNotification('Answer processing failed, please try again', 'error');
        } finally {
            this.setResponseLoading(responseDiv, false);
        }
    }

    async sendResponse(commentId, response) {
        const apiResponse = await fetch('/api/respond', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                commentId,
                response 
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
                <span class="feedback-icon">🤖</span>
                <span class="feedback-title">AI Student Reply:</span>
            </div>
            <p class="feedback-content">${feedback.content}</p>
        `;
        
        // 替换控件区域
        const controlsDiv = responseDiv.querySelector('.response-controls');
        responseDiv.replaceChild(feedbackDiv, controlsDiv);
        
        // 滚动到反馈位置
        setTimeout(() => {
            feedbackDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
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

    // 清理资源方法，防止内存泄漏
    destroy() {
        // 清理定时器
        if (this.zoomCheckInterval) {
            clearInterval(this.zoomCheckInterval);
            this.zoomCheckInterval = null;
        }
        
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
            this.typingTimer = null;
        }
        
        // 清理观察者
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => notification.classList.add('show'), 100);
        
        // 自动移除
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

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    new FeynmanApp();
});